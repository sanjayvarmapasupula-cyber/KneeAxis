import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import { jobService } from "./jobService.js";
import { SegmentationJob } from "../models/SegmentationJob.js";
import { WORKSPACE_ROOT, getPatientUploadDir, getPatientSubdir } from "../utils/paths.js";

/**
 * Service to execute 3D Knee Segmentation (TensorFlow / Keras inference)
 */
export const startSegmentationJob = async (patientId, imagePath, options = {}) => {
  const scriptPath =
    process.env.SEGMENTATION_SCRIPT_PATH ||
    path.join(WORKSPACE_ROOT, "ml", "inference", "predict_segmentation.py");
  const weightsPath =
    process.env.SEGMENTATION_WEIGHTS ||
    path.join(WORKSPACE_ROOT, "models", "knee_segmentation", "best.weights.h5");

  const resolvedImagePath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImagePath)) {
    throw new Error(`Input image file not found at: ${resolvedImagePath}`);
  }

  // Target destination for predicted label map
  const patientSegDir = getPatientSubdir(patientId, "segmentation");
  const outputPredictionPath = path.join(patientSegDir, "prediction.nii.gz");

  // Create job tracking entry
  const job = jobService.createJob("segmentation", patientId, {
    sourceImagePath: resolvedImagePath,
    targetPredictionPath: outputPredictionPath,
  });

  // Launch background execution
  (async () => {
    try {
      jobService.startJob(job.jobId);

      const args = [
        "--image", resolvedImagePath,
        "--weights", weightsPath,
        "--output", outputPredictionPath,
      ];

      console.log(`[SegmentationService] Executing segmentation job ${job.jobId} for patient ${patientId}...`);
      await runPythonScript(scriptPath, args, { parseJson: false, timeoutMs: 300000 });

      // Verify output was produced
      if (!fs.existsSync(outputPredictionPath)) {
        throw new Error(`Segmentation script completed but did not produce output at: ${outputPredictionPath}`);
      }

      jobService.completeJob(job.jobId, {
        patientId,
        predictionNiiPath: outputPredictionPath,
      });

      // Persist in MongoDB
      try {
        await SegmentationJob.create({
          jobId: job.jobId,
          patientId,
          sourceImagePath: resolvedImagePath,
          status: "completed",
          predictionNiiPath: outputPredictionPath,
          completedAt: new Date(),
        });
      } catch (dbErr) {
        console.warn(`[SegmentationService] Could not persist job to MongoDB: ${dbErr.message}`);
      }

      console.log(`[SegmentationService] Segmentation job ${job.jobId} completed successfully.`);
    } catch (err) {
      console.error(`[SegmentationService] Segmentation job ${job.jobId} failed: ${err.message}`);
      jobService.failJob(job.jobId, err);

      try {
        await SegmentationJob.create({
          jobId: job.jobId,
          patientId,
          sourceImagePath: resolvedImagePath,
          status: "failed",
          error: err.message,
        });
      } catch (dbErr) {
        // silent fallback
      }
    }
  })();

  return {
    jobId: job.jobId,
    status: job.status,
    patientId,
  };
};

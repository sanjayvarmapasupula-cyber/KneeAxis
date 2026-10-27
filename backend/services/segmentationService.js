import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import { jobService } from "./jobService.js";
import db from "../db/index.js";
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

  // Strict separation: Production application strictly returns "Model Not Trained"
  // unless genuine weights exist or explicitly invoked by isolated test harness
  const hasWeights = fs.existsSync(weightsPath);
  const isTestHarness = process.env.NODE_ENV === "test" || options.allowSimulated === true;

  if (!hasWeights && !isTestHarness) {
    const error = new Error(
      "Model Not Trained: Genuine 3D Attention U-Net segmentation inference is unavailable until verified model weights have been deployed."
    );
    error.statusCode = 503;
    error.isModelNotTrained = true;
    throw error;
  }

  // Target destination for predicted label map
  const patientSegDir = getPatientSubdir(patientId, "segmentation");
  const outputPredictionPath = path.join(patientSegDir, "prediction.nii.gz");

  // Create job tracking entry
  const job = jobService.createJob("segmentation", patientId, {
    sourceImagePath: resolvedImagePath,
    targetPredictionPath: outputPredictionPath,
  });

  // Insert initial job record in PostgreSQL
  try {
    await db.query(
      `INSERT INTO segmentation_jobs (job_id, patient_id, status, progress, input_file, output_mask)
       VALUES ($1, $2, 'pending', 0, $3, $4)
       ON CONFLICT (job_id) DO UPDATE SET status = 'pending'`,
      [job.jobId, patientId, resolvedImagePath, outputPredictionPath]
    );
  } catch {}

  // Launch background execution
  (async () => {
    try {
      jobService.startJob(job.jobId);
      await db.query(
        "UPDATE segmentation_jobs SET status = 'processing', progress = 30, updated_at = CURRENT_TIMESTAMP WHERE job_id = $1",
        [job.jobId]
      ).catch(() => {});

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

      // Persist completed status in PostgreSQL
      try {
        await db.query(
          `UPDATE segmentation_jobs
           SET status = 'completed', progress = 100, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE job_id = $1`,
          [job.jobId]
        );
        await db.query(
          "UPDATE patients SET segmentation_status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1",
          [patientId]
        );
      } catch (dbErr) {
        console.warn(`[SegmentationService] Could not persist job to PostgreSQL: ${dbErr.message}`);
      }

      console.log(`[SegmentationService] Segmentation job ${job.jobId} completed successfully.`);
    } catch (err) {
      console.error(`[SegmentationService] Segmentation job ${job.jobId} failed: ${err.message}`);
      jobService.failJob(job.jobId, err);

      try {
        await db.query(
          `UPDATE segmentation_jobs
           SET status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
           WHERE job_id = $2`,
          [err.message, job.jobId]
        );
      } catch {}
    }
  })();

  return {
    jobId: job.jobId,
    status: job.status,
    patientId,
  };
};

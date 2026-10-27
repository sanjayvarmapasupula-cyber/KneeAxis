import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import { Prediction } from "../models/Prediction.js";
import { WORKSPACE_ROOT } from "../utils/paths.js";

/**
 * Service to execute Kellgren-Lawrence (KL) Osteoarthritis Grade Prediction
 */
export const predictKLGrade = async (patientId, imagePath, imagingStudyId = null) => {
  const scriptPath = process.env.KL_SCRIPT_PATH || path.join(WORKSPACE_ROOT, "ml", "inference", "predict_kl.py");
  const weightsPath = process.env.KL_WEIGHTS || path.join(WORKSPACE_ROOT, "models", "kl_classifier", "best.weights.h5");
  const configPath = process.env.KL_CONFIG || path.join(WORKSPACE_ROOT, "models", "kl_classifier", "model_config.json");

  const resolvedImagePath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImagePath)) {
    throw new Error(`Input image file not found at: ${resolvedImagePath}`);
  }

  const args = [
    "--image", resolvedImagePath,
    "--weights", weightsPath,
    "--config", configPath,
  ];

  console.log(`[PredictionService] Starting KL prediction for patient ${patientId}...`);
  const { data, stdout } = await runPythonScript(scriptPath, args, { parseJson: true });

  if (!data || typeof data.grade === "undefined") {
    throw new Error(`Invalid or empty JSON output from KL prediction script. Output was: ${stdout}`);
  }

  // Persist result in MongoDB
  let savedRecord = null;
  try {
    savedRecord = await Prediction.create({
      patientId,
      imagingStudyId,
      type: "KL_GRADE",
      grade: data.grade,
      label: data.label || `KL ${data.grade}`,
      confidence: data.confidence || 0.0,
      probabilities: data.probabilities || {},
      modelWeightsPath: weightsPath,
      inferenceDetails: data,
    });
  } catch (dbErr) {
    console.warn(`[PredictionService] Could not persist prediction to MongoDB: ${dbErr.message}`);
  }

  return {
    prediction: data,
    recordId: savedRecord ? savedRecord._id : null,
  };
};

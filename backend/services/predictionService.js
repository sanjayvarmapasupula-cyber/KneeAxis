import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import db from "../db/index.js";
import { WORKSPACE_ROOT } from "../utils/paths.js";

/**
 * Service to execute Kellgren-Lawrence (KL) Osteoarthritis Grade Prediction
 */
export const predictKLGrade = async (patientId, imagePath, imagingStudyId = null, options = {}) => {
  const scriptPath = process.env.KL_SCRIPT_PATH || path.join(WORKSPACE_ROOT, "ml", "inference", "predict_kl.py");
  const weightsPath = process.env.KL_WEIGHTS || path.join(WORKSPACE_ROOT, "models", "kl_classifier", "best.weights.h5");
  const configPath = process.env.KL_CONFIG || path.join(WORKSPACE_ROOT, "models", "kl_classifier", "model_config.json");

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
      "Model Not Trained: Genuine ResNet-50 KL classifier inference is unavailable until verified model weights have been deployed."
    );
    error.statusCode = 503;
    error.isModelNotTrained = true;
    throw error;
  }

  const args = [
    "--image", resolvedImagePath,
    "--weights", weightsPath,
    "--config", configPath,
  ];

  console.log(`[PredictionService] ${isTestHarness && !hasWeights ? '[TEST HARNESS SIMULATION] ' : ''}Executing KL prediction for patient ${patientId}...`);
  const { data, stdout } = await runPythonScript(scriptPath, args, { parseJson: true });

  if (!data || typeof data.grade === "undefined") {
    throw new Error(`Invalid or empty JSON output from KL prediction script. Output was: ${stdout}`);
  }

  // Persist result in PostgreSQL
  let recordId = null;
  try {
    const insertRes = await db.query(
      `INSERT INTO predictions (patient_id, model_name, grade, label, confidence, probabilities, image_path)
       VALUES ($1, 'ResNet50-KL-Classifier', $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        patientId,
        data.grade,
        data.label || `KL ${data.grade}`,
        data.confidence || 0.0,
        JSON.stringify(data.probabilities || {}),
        resolvedImagePath,
      ]
    );
    recordId = insertRes.rows[0]?.id;
  } catch (dbErr) {
    console.warn(`[PredictionService] Could not persist prediction to PostgreSQL: ${dbErr.message}`);
  }

  return {
    prediction: data,
    recordId,
  };
};

export default {
  predictKLGrade,
};

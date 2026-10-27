import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import db from "../db/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { getPythonPath } from "../utils/paths.js";
import { modelStatus } from "../services/livePipelineService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../");

/**
 * Return deployment readiness status for AI models
 * Prior to genuine training, explicitly declares Not Trained
 */
export const getModelStatus = async (req, res) => {
  const nn = modelStatus();
  return res.status(200).json({
    success: true,
    data: {
      classification: { status: 'not_trained', available: false },
      segmentation: {
        status: nn.ready ? 'ready' : 'not_trained',
        available: nn.ready,
        architecture: 'nnU-Net v2 / 3D PlainConvUNet',
        trainedEpochs: nn.trainedEpochs,
        checkpoint: nn.checkpoint,
        validation: nn.validation,
        intendedUse: 'Research only — not clinically validated',
      },
    },
    message: 'Model readiness is based on the verified local nnU-Net checkpoint path.',
  });
};

/**
 * List all registered ML and algorithmic models with real-time disk status
 */
export const getAllModels = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM ml_models ORDER BY id ASC"
    );

    const models = result.rows.map((m) => {
      // Check if weights file physically exists on filesystem
      let weightsExist = false;
      if (m.weights_path) {
        const fullWeightsPath = path.resolve(projectRoot, m.weights_path.replace(/^\.\.\//, ""));
        weightsExist = fs.existsSync(fullWeightsPath);
      }

      // Check if config file exists
      let configExist = false;
      let configData = null;
      if (m.config_path) {
        const fullConfigPath = path.resolve(projectRoot, m.config_path.replace(/^\.\.\//, ""));
        configExist = fs.existsSync(fullConfigPath);
        if (configExist) {
          try {
            configData = JSON.parse(fs.readFileSync(fullConfigPath, "utf-8"));
          } catch {}
        }
      }

      return {
        id: m.model_id,
        name: m.name,
        category: m.category,
        architecture: m.architecture,
        version: m.version,
        status: m.status,
        framework: m.framework,
        inputShape: m.input_shape,
        accuracyMetric: m.accuracy_metric,
        accuracyValue: parseFloat(m.accuracy_value),
        latencyMs: m.inference_latency_ms,
        parametersCount: m.parameters_count,
        description: m.description,
        weightsPath: m.weights_path,
        weightsInstalled: weightsExist,
        configPath: m.config_path,
        configInstalled: configExist,
        config: configData,
        lastUpdated: m.updated_at,
      };
    });

    return sendSuccess(res, models, "Model registry retrieved successfully.");
  } catch (err) {
    return sendError(res, "Failed to retrieve model registry.", err, 500);
  }
};

/**
 * Get details for a specific model by ID
 */
export const getModelById = async (req, res) => {
  try {
    const { modelId } = req.params;
    const result = await db.query(
      "SELECT * FROM ml_models WHERE model_id = $1 OR id::text = $1",
      [modelId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Model '${modelId}' not found in registry.`, null, 404);
    }

    const m = result.rows[0];
    const fullWeightsPath = m.weights_path
      ? path.resolve(projectRoot, m.weights_path.replace(/^\.\.\//, ""))
      : null;
    const weightsExist = fullWeightsPath ? fs.existsSync(fullWeightsPath) : false;

    return sendSuccess(res, {
      id: m.model_id,
      name: m.name,
      category: m.category,
      architecture: m.architecture,
      version: m.version,
      status: m.status,
      framework: m.framework,
      inputShape: m.input_shape,
      accuracyMetric: m.accuracy_metric,
      accuracyValue: parseFloat(m.accuracy_value),
      latencyMs: m.inference_latency_ms,
      parametersCount: m.parameters_count,
      description: m.description,
      weightsPath: m.weights_path,
      weightsInstalled: weightsExist,
      configPath: m.config_path,
      lastUpdated: m.updated_at,
    }, "Model details retrieved.");
  } catch (err) {
    return sendError(res, "Failed to fetch model.", err, 500);
  }
};

/**
 * Test run model inference interactively
 */
export const testModelInference = async (req, res) => {
  return sendError(res,
    "Synthetic model-test results are disabled. Use the authenticated live MRI inference workflow.",
    null, 501);
};

/**
 * Upload new trained model weights (.h5, .onnx, .pth)
 */
export const uploadWeights = async (req, res) => {
  const { modelId } = req.params;
  let finalPath = null;
  let registered = false;
  try {
    if (!req.file) return sendError(res, "No weight file uploaded.", null, 400);

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(modelId)) {
      return sendError(res, "Invalid model identifier.", null, 400);
    }

    const extension = path.extname(req.file.originalname).toLowerCase();
    const permitted = new Set([".h5", ".keras", ".onnx", ".pth", ".pt", ".safetensors"]);
    if (!permitted.has(extension)) {
      return sendError(res, "Unsupported checkpoint file extension.", null, 415);
    }

    const found = await db.query("SELECT category FROM ml_models WHERE model_id = $1", [modelId]);
    if (found.rows.length === 0) {
      return sendError(res, "Model is not registered.", null, 404);
    }
    if (!["classification", "segmentation"].includes(found.rows[0].category)) {
      return sendError(res, "Weights may only be uploaded for trainable models.", null, 400);
    }

    const destDir = path.join(projectRoot, "models", modelId.toLowerCase());
    await fs.promises.mkdir(destDir, { recursive: true });
    finalPath = path.join(destDir, `${randomUUID()}${extension}`);
    await fs.promises.rename(req.file.path, finalPath);

    const relativePath = path.relative(projectRoot, finalPath).replace(/\\/g, "/");
    // Uploading a file is not model validation or deployment; never auto-mark Active.
    const update = await db.query(
      `UPDATE ml_models
       SET weights_path = $1, status = 'Pending Validation', updated_at = CURRENT_TIMESTAMP
       WHERE model_id = $2 RETURNING model_id`,
      [relativePath, modelId]
    );
    if (update.rows.length === 0) throw new Error("Model registry update did not complete.");
    registered = true;

    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'MODEL_WEIGHTS_UPDATE', $1, $2, $3, $4)`,
        [req.user.email, req.user.full_name, req.user.role,
         `Checkpoint staged for model ${modelId} (${req.file.size} bytes), pending validation.`]
      );
    } catch (err) {
      console.warn("[ModelUpload] Unable to write audit record:", err.message);
    }

    return sendSuccess(res, {
      modelId,
      filename: req.file.originalname,
      storedFilename: path.basename(finalPath),
      weightsPath: relativePath,
      sizeBytes: req.file.size,
      deploymentStatus: "Pending Validation",
    }, "Model weights stored; validation required before activation.");
  } catch (err) {
    console.error("[ModelUpload] Upload failed:", err.message);
    return sendError(res, "Failed to upload model weights.", null, 500);
  } finally {
    // Multer stages the temporary file before entering this controller.
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    if (finalPath && !registered) await fs.promises.unlink(finalPath).catch(() => {});
  }
};

/**
 * Update model runtime configuration in PostgreSQL
 */
export const updateModelConfig = async (req, res) => {
  try {
    const { modelId } = req.params;
    const { status, accuracyValue, latencyMs, description } = req.body;

    const result = await db.query(
      `UPDATE ml_models
       SET status = COALESCE($1, status),
           accuracy_value = COALESCE($2, accuracy_value),
           inference_latency_ms = COALESCE($3, inference_latency_ms),
           description = COALESCE($4, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE model_id = $5
       RETURNING *`,
      [status, accuracyValue, latencyMs, description, modelId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Model '${modelId}' not found.`, null, 404);
    }

    return sendSuccess(res, result.rows[0], "Model configuration updated.");
  } catch (err) {
    return sendError(res, "Failed to update model configuration.", err, 500);
  }
};

/**
 * Get user training and model integration custom configuration
 */
export const getCustomModelConfig = async (req, res) => {
  try {
    const configPath = path.resolve(projectRoot, "models/model_integration_config.json");
    if (!fs.existsSync(configPath)) {
      return sendError(res, "Custom model configuration file not found.", null, 404);
    }
    const data = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return sendSuccess(res, data, "Custom model configuration retrieved successfully.");
  } catch (err) {
    return sendError(res, "Failed to retrieve custom model configuration.", err, 500);
  }
};

/**
 * Save user training and model integration custom configuration
 */
export const saveCustomModelConfig = async (req, res) => {
  try {
    const configPath = path.resolve(projectRoot, "models/model_integration_config.json");
    const updatedConfig = req.body;

    if (!updatedConfig || typeof updatedConfig !== "object") {
      return sendError(res, "Invalid configuration payload.", null, 400);
    }

    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), "utf-8");

    // Record audit record in PostgreSQL
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'CUSTOM_MODEL_CONFIG_SAVED', $1, $2, $3, $4)`,
        [
          req.user ? req.user.email : "dr.mitchell@clinicalatlas.io",
          req.user ? req.user.full_name : "Lead Orthopedic Surgeon",
          req.user ? req.user.role : "surgeon",
          `Updated custom model training configuration and simulated baseline values. KL use_trained_model=${Boolean(updatedConfig.kl_classifier?.use_trained_model)}, Segmentation use_trained_model=${Boolean(updatedConfig.knee_segmentation?.use_trained_model)}`
        ]
      );
    } catch (auditErr) {
      console.warn("Audit log notice:", auditErr.message);
    }

    return sendSuccess(res, updatedConfig, "Custom model configuration and baseline values saved successfully.");
  } catch (err) {
    return sendError(res, "Failed to save custom model configuration.", err, 500);
  }
};


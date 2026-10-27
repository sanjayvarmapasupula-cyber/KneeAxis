import express from "express";
import multer from "multer";
import {
  getModelStatus,
  getAllModels,
  getModelById,
  testModelInference,
  uploadWeights,
  updateModelConfig,
  getCustomModelConfig,
  saveCustomModelConfig,
} from "../controllers/modelController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { receiveFile } from "../middleware/validateFile.js";
import { getUploadDir } from "../utils/paths.js";

const router = express.Router();

const MODEL_WEIGHT_EXTENSIONS = [".h5", ".keras", ".onnx", ".pth", ".pt", ".safetensors"];
const upload = multer({
  dest: getUploadDir(),
  fileFilter: (req, file, cb) => {
    if (!MODEL_WEIGHT_EXTENSIONS.some((ext) => file.originalname.toLowerCase().endsWith(ext))) {
      const error = new Error("Unsupported checkpoint file extension.");
      error.statusCode = 415;
      return cb(error);
    }
    return cb(null, true);
  },
  limits: { fileSize: 500 * 1024 * 1024, files: 1, fields: 5, parts: 7 },
});

// Existing staff roles include researcher and surgeon. Keep weight management restricted.
const requireModelManager = requireRole(["admin", "researcher"]);

// Deployment Readiness Status
router.get("/status", getModelStatus);

// User Custom Training & Simulated Fake Values Configuration
router.get("/custom-config/get", requireAuth, getCustomModelConfig);
router.put("/custom-config/save", requireAuth, requireModelManager, saveCustomModelConfig);

router.get("/", getAllModels);
router.get("/:modelId", getModelById);
router.post("/:modelId/test", requireAuth, testModelInference);
router.post("/:modelId/weights", requireAuth, requireModelManager, receiveFile(upload, "weights"), uploadWeights);
router.put("/:modelId/config", requireAuth, requireModelManager, updateModelConfig);

export default router;

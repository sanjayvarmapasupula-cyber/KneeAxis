import express from "express";
import multer from "multer";
import path from "path";
import {
  getAllModels,
  getModelById,
  testModelInference,
  uploadWeights,
  updateModelConfig,
  getCustomModelConfig,
  saveCustomModelConfig,
} from "../controllers/modelController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { getUploadDir } from "../utils/paths.js";

const router = express.Router();

const upload = multer({
  dest: getUploadDir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // Up to 500MB weights
});

// User Custom Training & Simulated Fake Values Configuration
router.get("/custom-config/get", getCustomModelConfig);
router.put("/custom-config/save", optionalAuth, saveCustomModelConfig);

router.get("/", getAllModels);
router.get("/:modelId", getModelById);
router.post("/:modelId/test", optionalAuth, testModelInference);
router.post("/:modelId/weights", requireAuth, upload.single("weights"), uploadWeights);
router.put("/:modelId/config", requireAuth, updateModelConfig);

export default router;

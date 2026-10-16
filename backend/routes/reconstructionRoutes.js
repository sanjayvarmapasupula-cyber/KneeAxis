import express from "express";
import {
  handleReconstructMeshes,
  getPatientMeshManifest,
} from "../controllers/reconstructionController.js";

const router = express.Router();

router.post("/:patientId", handleReconstructMeshes);
router.get("/:patientId", getPatientMeshManifest);

export default router;

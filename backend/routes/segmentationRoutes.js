import express from "express";
import { handleStartSegmentation } from "../controllers/segmentationController.js";

const router = express.Router();

router.post("/:patientId", handleStartSegmentation);

export default router;

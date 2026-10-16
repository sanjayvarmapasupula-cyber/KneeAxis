import express from "express";
import { handleKLGradePrediction } from "../controllers/predictionController.js";

const router = express.Router();

router.post("/kl/:patientId", handleKLGradePrediction);

export default router;

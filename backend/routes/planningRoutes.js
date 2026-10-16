import express from "express";
import { handleGeneratePlan, getPatientPlan } from "../controllers/planningController.js";

const router = express.Router({ mergeParams: true });

router.post("/", handleGeneratePlan);
router.get("/", getPatientPlan);

export default router;

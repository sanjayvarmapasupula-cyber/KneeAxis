import express from "express";
import {
  getDashboardSummary,
  getDashboardStats,
  getRecentActivities,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/summary", getDashboardSummary);
router.get("/stats", getDashboardStats);
router.get("/activities", getRecentActivities);

export default router;

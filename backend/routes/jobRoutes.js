import express from "express";
import { jobService } from "../services/jobService.js";
import { sendSuccess, sendError } from "../utils/response.js";

const router = express.Router();

/**
 * GET /api/jobs/:jobId
 * Check the status of long-running segmentation or reconstruction jobs
 */
router.get("/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobService.getJob(jobId);

  if (!job) {
    return sendError(res, `Job with ID '${jobId}' not found.`, null, 404);
  }

  return sendSuccess(res, job, "Job status retrieved.");
});

export default router;

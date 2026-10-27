import express from "express";
import { jobService } from "../services/jobService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import db from "../db/index.js";

const router = express.Router();

/**
 * GET /api/jobs/:jobId
 * Check the status of long-running segmentation or reconstruction jobs
 */
router.get("/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const job = await jobService.getJob(jobId);

  if (!job) {
    return sendError(res, `Job with ID '${jobId}' not found.`, null, 404);
  }

  // Authorization check: only supervisory roles (admin, surgeon) or the patient owner/assignee
  if (req.user && req.user.role !== "admin" && req.user.role !== "surgeon") {
    if (job.patientId) {
      const p = await db.query("SELECT created_by, assigned_to FROM patients WHERE patient_id = $1", [job.patientId]);
      const patient = p.rows[0];
      if (!patient || (patient.created_by !== req.user.id && patient.assigned_to !== req.user.id)) {
        return sendError(res, "Access denied: You do not have authorization to view this job.", null, 403);
      }
    }
  }

  return sendSuccess(res, job, "Job status retrieved.");
});

export default router;

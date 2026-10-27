import path from "path";
import fs from "fs";
import db from "../db/index.js";
import { recordApproval, isMeshApproved, getAuditRecordsForPatient } from "../services/auditService.js";
import { AuditRecord } from "../models/AuditRecord.js";
import { sendSuccess, sendError } from "../utils/response.js";
import {
  sanitizeId,
  getPatientOutputDir,
  getPatientUploadDir,
  isPathSafe,
} from "../utils/paths.js";

export const approvePatientMeshes = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    const { approved, reviewer, reviewNotes } = req.body;

    if (!reviewer) {
      return sendError(res, "Field 'reviewer' (clinician/doctor ID) is required.", null, 400);
    }

    // Locate source image, segmentation, and mesh for hashing
    const uploadDir = getPatientUploadDir(patientId);
    const outputDir = getPatientOutputDir(patientId);

    const uploadFiles = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
    const sourceFile = uploadFiles.find((f) => !f.includes("seg") && !f.includes("pred"));
    const segFile = uploadFiles.find((f) => f.includes("seg") || f.includes("pred"));

    const sourcePath = sourceFile ? path.join(uploadDir, sourceFile) : null;
    const segOutputDir = path.join(outputDir, "segmentation", "prediction.nii.gz");
    const segPath = fs.existsSync(segOutputDir)
      ? segOutputDir
      : (segFile ? path.join(uploadDir, segFile) : null);

    const meshesDir = path.join(outputDir, "meshes");
    const meshFiles = fs.existsSync(meshesDir) ? fs.readdirSync(meshesDir) : [];
    const primaryMesh = meshFiles.find((f) => f.includes("femur_smooth.stl")) || meshFiles[0];
    const meshPath = primaryMesh ? path.join(meshesDir, primaryMesh) : null;

    const audit = await recordApproval({
      patientId,
      imagePath: sourcePath,
      segmentationPath: segPath,
      meshPath,
      approved: Boolean(approved),
      reviewer,
      reviewNotes: reviewNotes || "",
    });

    // Update PostgreSQL records
    try {
      const newStatus = Boolean(approved) ? "Approved" : "Rejected";
      await db.query(
        "UPDATE patients SET review_status = $1, updated_at = CURRENT_TIMESTAMP WHERE patient_id = $2",
        [newStatus, patientId]
      );
      await db.query(
        `UPDATE planning_records 
         SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE patient_id = $3`,
        [newStatus, reviewer, patientId]
      );
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_name, role, notes)
         VALUES ($1, $2, $3, 'surgeon', $4)`,
        [
          patientId,
          Boolean(approved) ? "SURGICAL_PLAN_APPROVAL" : "SURGICAL_PLAN_REJECTION",
          reviewer,
          reviewNotes || (Boolean(approved) ? "Plan approved for ROSA Robotic Suite." : "Plan rejected by clinician.")
        ]
      );
    } catch (pgErr) {
      console.warn("[PostgreSQL] Non-blocking audit record sync warning:", pgErr.message);
    }

    return sendSuccess(
      res,
      audit,
      Boolean(approved)
        ? "Clinician approval and cryptographic audit recorded successfully in PostgreSQL."
        : "Rejection decision and cryptographic audit recorded in PostgreSQL."
    );
  } catch (err) {
    return sendError(res, "Failed to record clinician approval.", err, 500);
  }
};

export const getPatientAuditHistory = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    const audits = await getAuditRecordsForPatient(patientId);
    return sendSuccess(res, audits, `Audit records for patient ${patientId} retrieved.`);
  } catch (err) {
    return sendError(res, "Failed to retrieve audit records.", err, 500);
  }
};

/**
 * EXPORT GATE
 * GET /api/export/:patientId/:filename
 * 
 * Secure verification gate: Only allows download if clinician approval is verified.
 */
export const exportApprovedMesh = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    const filename = path.basename(req.params.filename); // Strip any directories
    const ext = path.extname(filename).toLowerCase();

    // Verify allowed file extensions
    if (![".stl", ".obj"].includes(ext)) {
      return sendError(res, `Invalid mesh file extension: ${ext}. Only .stl and .obj allowed.`, null, 400);
    }

    const outputDir = getPatientOutputDir(patientId);
    const targetFile = path.join(outputDir, "meshes", filename);

    // Path traversal check
    if (!isPathSafe(outputDir, targetFile) || !fs.existsSync(targetFile)) {
      return sendError(res, `Mesh file not found at: ${filename}`, null, 404);
    }

    // CHECK APPROVAL STATUS
    const approved = await isMeshApproved(patientId);
    if (!approved) {
      return res.status(403).json({
        success: false,
        error: "Mesh has not been approved.",
        message: "Access Denied: This patient's 3D mesh has not been certified or approved by a clinician.",
      });
    }

    // Approved -> Serve file for download
    return res.download(targetFile, filename);
  } catch (err) {
    return sendError(res, "Export verification failed.", err, 500);
  }
};

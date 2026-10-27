import express from "express";
import path from "path";
import fs from "fs";
import { exportApprovedMesh } from "../controllers/auditController.js";
import { sendError } from "../utils/response.js";
import { sanitizeId, getPatientOutputDir, isPathSafe } from "../utils/paths.js";

const router = express.Router();

/**
 * GET /api/meshes/:patientId/:filename
 * Safely stream an STL or OBJ mesh to the frontend (Three.js / VTK.js viewer).
 */
router.get("/meshes/:patientId/:filename", (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    const filename = path.basename(req.params.filename); // Strip any directories
    const ext = path.extname(filename).toLowerCase();

    // Whitelist allowed mesh extensions
    if (![".stl", ".obj"].includes(ext)) {
      return sendError(
        res,
        `Invalid mesh extension '${ext}'. Only .stl and .obj files are accessible.`,
        null,
        400
      );
    }

    const outputDir = getPatientOutputDir(patientId);
    const filePath = path.join(outputDir, "meshes", filename);

    // Path traversal check
    if (!isPathSafe(outputDir, filePath) || !fs.existsSync(filePath)) {
      return sendError(res, `Mesh file '${filename}' not found for patient ${patientId}.`, null, 404);
    }

    // Set appropriate content type
    if (ext === ".stl") {
      res.setHeader("Content-Type", "model/stl");
    } else if (ext === ".obj") {
      res.setHeader("Content-Type", "model/obj");
    }

    return res.sendFile(filePath);
  } catch (err) {
    return sendError(res, "Failed to serve mesh file.", err, 500);
  }
});

/**
 * GET /api/export/:patientId/:filename
 * Export gate requiring clinician approval verification
 */
router.get("/export/:patientId/:filename", exportApprovedMesh);

export default router;

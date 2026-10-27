import path from "path";
import fs from "node:fs/promises";
import db from "../db/index.js";
import { calculateFileHash } from "../services/auditService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId } from "../utils/paths.js";

export const uploadImagingStudy = async (req, res) => {
  let fileRegistered = false;
  try {
    const patientId = sanitizeId(req.params.patientId);

    if (!req.file) {
      return sendError(res, "No image file uploaded.", null, 400);
    }

    const { studyType, notes } = req.body;
    const file = req.file;
    const filePath = file.path;
    const ext = path.extname(file.originalname).toLowerCase();

    // Determine study type and modality
    let detectedType = studyType || "Pre-Op Knee Protocol";
    let modality = "CT";
    if ([".png", ".jpg", ".jpeg"].includes(ext)) {
      modality = "X-ray";
      detectedType = "Bilateral Knee Radiograph";
    } else if (file.originalname.toLowerCase().includes("seg")) {
      modality = "Segmentation Mask";
      detectedType = "Anatomical Ground-Truth Mask";
    } else if ([".nii", ".gz"].includes(ext)) {
      modality = "MRI";
      detectedType = "3D Isotropic Volumetric Scan";
    } else if ([".dcm"].includes(ext)) {
      modality = "DICOM";
      detectedType = "High-Resolution CT DICOM Slice";
    }

    // Compute cryptographic SHA-256 hash of the uploaded file
    const fileSha256 = await calculateFileHash(filePath);

    // Uploading an image must not silently invent a clinical patient record.
    const patientCheck = await db.query(
      "SELECT id FROM patients WHERE patient_id = $1",
      [patientId]
    );
    if (patientCheck.rows.length === 0) {
      await fs.unlink(filePath).catch(() => {});
      return sendError(res, "Patient not found. Register the patient before imaging upload.", null, 404);
    }

    const studyId = `STUDY-${patientId}-${Date.now()}`;
    const metadataObj = {
      originalFilename: file.originalname,
      fileSize: file.size,
      sha256: fileSha256,
      mimeType: file.mimetype,
      notes: notes || "",
      uploadedAt: new Date().toISOString(),
    };

    const insertRes = await db.query(
      `INSERT INTO imaging_studies (study_id, patient_id, modality, study_type, file_path, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [studyId, patientId, modality, detectedType, filePath, JSON.stringify(metadataObj)]
    );

    const study = insertRes.rows[0];
    fileRegistered = true;

    // Update patient's imaging status
    await db.query(
      "UPDATE patients SET imaging_status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1",
      [patientId]
    );

    // Record in audit log
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes, metadata)
         VALUES ($1, 'IMAGING_UPLOAD', $2, $3, $4, $5, $6)`,
        [
          patientId,
          req.user ? req.user.email : "system@clinicalatlas.demo",
          req.user ? req.user.full_name : "Imaging Technician",
          req.user ? req.user.role : "radiologist",
          `Uploaded ${modality} study '${file.originalname}' (${file.size} bytes). SHA-256: ${fileSha256}`,
          JSON.stringify({ studyId, modality, filename: file.originalname, sha256: fileSha256 }),
        ]
      );
    } catch {}

    return sendSuccess(
      res,
      {
        id: study.id,
        studyId: study.study_id,
        patientId: study.patient_id,
        modality: study.modality,
        studyType: study.study_type,
        filePath: study.file_path,
        metadata: study.metadata,
        createdAt: study.created_at,
      },
      `Imaging file '${file.originalname}' uploaded and stored in PostgreSQL.`,
      201
    );
  } catch (err) {
    if (!fileRegistered && req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error("[ImagingUpload] Registration failed:", err.message);
    return sendError(res, "Failed to upload and register imaging study.", null, 500);
  }
};

export const getPatientImagingStudies = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);

    const result = await db.query(
      "SELECT * FROM imaging_studies WHERE patient_id = $1 ORDER BY created_at DESC",
      [patientId]
    );

    const studies = result.rows.map((s) => ({
      id: s.id,
      studyId: s.study_id,
      patientId: s.patient_id,
      modality: s.modality,
      studyType: s.study_type,
      sliceCount: s.slice_count,
      pixelSpacing: s.pixel_spacing,
      sliceThickness: s.slice_thickness,
      filePath: s.file_path,
      metadata: s.metadata,
      createdAt: s.created_at,
    }));

    return sendSuccess(res, studies, `Imaging studies for patient ${patientId} retrieved.`);
  } catch (err) {
    return sendError(res, "Failed to retrieve imaging studies.", err, 500);
  }
};

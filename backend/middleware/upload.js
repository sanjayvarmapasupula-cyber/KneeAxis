import multer from "multer";
import path from "path";
import { randomUUID } from "node:crypto";
import { getPatientUploadDir, sanitizeId } from "../utils/paths.js";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".dcm", ".nii", ".nii.gz"]);

const getImageExtension = (name) => {
  const lower = name.toLowerCase();
  return lower.endsWith(".nii.gz") ? ".nii.gz" : path.extname(lower);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // The patient identity comes from the authenticated, patient-scoped route.
      const patientId = req.params.patientId;
      if (!patientId || sanitizeId(patientId) !== patientId) {
        const error = new Error("Valid patient ID is required in the URL.");
        error.statusCode = 400;
        return cb(error);
      }
      return cb(null, getPatientUploadDir(patientId));
    } catch (err) {
      return cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Never trust the client-provided filename as a filesystem path.
    cb(null, `${randomUUID()}${getImageExtension(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = getImageExtension(file.originalname);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    const error = new Error("Unsupported medical image format. Allowed: PNG, JPG, DICOM, NIfTI, NIfTI.GZ.");
    error.statusCode = 415;
    return cb(error);
  }
  return cb(null, true);
};

// Extension filtering is a first gate, NOT verification of actual DICOM/NIfTI content.
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 16 * 1024,
    parts: 12,
  },
});

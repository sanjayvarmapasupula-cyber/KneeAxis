import multer from "multer";
import path from "path";
import fs from "fs";
import { getPatientUploadDir, sanitizeId } from "../utils/paths.js";

// Allowed medical image & file extensions
const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".dcm",
  ".nii",
  ".gz", // for .nii.gz
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const patientId = sanitizeId(req.params.patientId || req.body.patientId || "common");
      const targetDir = getPatientUploadDir(patientId);
      cb(null, targetDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize original filename and append timestamp to prevent overwriting
    const originalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(originalName).toLowerCase();
    
    // Handle .nii.gz composite extension cleanly
    let cleanName = originalName;
    if (originalName.toLowerCase().endsWith(".nii.gz")) {
      cleanName = originalName.slice(0, -7) + `_${Date.now()}.nii.gz`;
    } else {
      const base = path.basename(originalName, ext);
      cleanName = `${base}_${Date.now()}${ext}`;
    }
    cb(null, cleanName);
  },
});

const fileFilter = (req, file, cb) => {
  const original = file.originalname.toLowerCase();
  const ext = path.extname(original);

  const isValid =
    original.endsWith(".nii.gz") ||
    ALLOWED_EXTENSIONS.has(ext);

  if (isValid) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file format: ${ext}. Allowed formats: .png, .jpg, .jpeg, .dcm, .nii, .nii.gz`
      ),
      false
    );
  }
};

// 500 MB limit for medical volume data
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of backend is one level up from utils
export const BACKEND_ROOT = path.resolve(__dirname, "..");
// Workspace root is one level up from backend
export const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, "..");

// Configurable Directories
export const getUploadDir = () => {
  const dir = process.env.UPLOAD_DIR
    ? path.resolve(BACKEND_ROOT, process.env.UPLOAD_DIR)
    : path.resolve(WORKSPACE_ROOT, "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const getOutputDir = () => {
  const dir = process.env.OUTPUT_DIR
    ? path.resolve(BACKEND_ROOT, process.env.OUTPUT_DIR)
    : path.resolve(WORKSPACE_ROOT, "outputs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const getPatientUploadDir = (patientId) => {
  const safeId = sanitizeId(patientId);
  const dir = path.join(getUploadDir(), safeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const getPatientOutputDir = (patientId) => {
  const safeId = sanitizeId(patientId);
  const dir = path.join(getOutputDir(), "patients", safeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Ensure mandatory patient subdirectories exist
  const subdirs = ["predictions", "segmentation", "meshes", "qa", "planning", "audit"];
  for (const sub of subdirs) {
    const subPath = path.join(dir, sub);
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath, { recursive: true });
  }

  return dir;
};

export const getPatientSubdir = (patientId, subfolder) => {
  const patientDir = getPatientOutputDir(patientId);
  const targetSub = path.join(patientDir, subfolder);
  if (!fs.existsSync(targetSub)) fs.mkdirSync(targetSub, { recursive: true });
  return targetSub;
};

/**
 * Sanitize patient IDs and filenames to prevent path traversal
 */
export const sanitizeId = (id) => {
  if (!id) return "unknown";
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
};

/**
 * Security helper: Ensures targetPath strictly resolves within allowedBaseDir.
 * Prevents Directory Traversal attacks (e.g. "../../../etc/passwd").
 */
export const isPathSafe = (allowedBaseDir, targetPath) => {
  const resolvedBase = path.resolve(allowedBaseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase);
};

export const getPythonPath = () => {
  return process.env.PYTHON_PATH || "python";
};


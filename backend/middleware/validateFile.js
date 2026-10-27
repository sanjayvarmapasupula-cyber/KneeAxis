import multer from "multer";
import { sendError } from "../utils/response.js";

/**
 * Validates that a file was successfully received by multer
 */
export const requireFile = (req, res, next) => {
  if (!req.file && (!req.files || req.files.length === 0)) {
    return sendError(res, "No file was uploaded. Please attach a valid medical image.", null, 400);
  }
  next();
};

/** Wrap a single-file Multer handler so expected upload failures never become 500s. */
export const receiveFile = (uploader, fieldName) => (req, res, next) => {
  uploader.single(fieldName)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      return sendError(res, tooLarge ? "Uploaded file exceeds the 500 MB limit." : "Invalid multipart upload.", null, tooLarge ? 413 : 400);
    }
    if (err.statusCode === 415) return sendError(res, err.message, null, 415);
    if (err.statusCode === 400) return sendError(res, err.message, null, 400);
    const malformed = /unexpected end of form|malformed part|multipart/i.test(err.message || "");
    console.error("[Upload] Upload processing failed:", err.message);
    return sendError(res, malformed ? "Malformed multipart upload." : "Upload storage failure.", null, malformed ? 400 : 500);
  });
};

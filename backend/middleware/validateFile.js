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

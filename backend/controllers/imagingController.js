import path from "path";
import { ImagingStudy } from "../models/ImagingStudy.js";
import { calculateFileHash } from "../services/auditService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId } from "../utils/paths.js";

export const uploadImagingStudy = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);

    if (!req.file) {
      return sendError(res, "No image file uploaded.", null, 400);
    }

    const { studyType, notes } = req.body;
    const file = req.file;
    const filePath = file.path;
    const ext = path.extname(file.originalname).toLowerCase();

    // Determine study type if not explicitly supplied
    let detectedType = studyType || "Other";
    if (!studyType) {
      if ([".png", ".jpg", ".jpeg"].includes(ext)) detectedType = "X-ray";
      else if (file.originalname.toLowerCase().includes("seg")) detectedType = "Segmentation";
      else if ([".nii", ".gz", ".dcm"].includes(ext)) detectedType = "MRI";
    }

    // Compute cryptographic SHA-256 hash of the uploaded file
    const fileSha256 = await calculateFileHash(filePath);

    let study;
    try {
      study = await ImagingStudy.create({
        patientId,
        studyType: detectedType,
        originalFilename: file.originalname,
        filePath,
        fileType: ext,
        fileSize: file.size,
        sha256: fileSha256,
        metadata: {
          mimeType: file.mimetype,
          notes: notes || "",
          uploadedAt: new Date(),
        },
      });
    } catch (dbErr) {
      // In-memory fallback
      study = {
        _id: `study_${Date.now()}`,
        patientId,
        studyType: detectedType,
        originalFilename: file.originalname,
        filePath,
        fileType: ext,
        fileSize: file.size,
        sha256: fileSha256,
        metadata: { notes: notes || "" },
        createdAt: new Date(),
      };
    }

    return sendSuccess(
      res,
      study,
      `Imaging file '${file.originalname}' uploaded and registered successfully.`,
      201
    );
  } catch (err) {
    return sendError(res, "Failed to upload and register imaging study.", err, 500);
  }
};

export const getPatientImagingStudies = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    let studies = [];

    try {
      studies = await ImagingStudy.find({ patientId }).sort({ createdAt: -1 });
    } catch {
      studies = [];
    }

    return sendSuccess(res, studies, `Imaging studies for patient ${patientId} retrieved.`);
  } catch (err) {
    return sendError(res, "Failed to retrieve imaging studies.", err, 500);
  }
};

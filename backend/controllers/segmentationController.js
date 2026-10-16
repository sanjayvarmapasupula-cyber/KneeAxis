import path from "path";
import fs from "fs";
import { startSegmentationJob } from "../services/segmentationService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId, getPatientUploadDir } from "../utils/paths.js";

export const handleStartSegmentation = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    let { imagePath } = req.body;

    if (!imagePath) {
      // Look for latest medical 3D volume (.nii, .nii.gz, .dcm) in uploads/{patientId}
      const uploadDir = getPatientUploadDir(patientId);
      const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
      const volumeFile = files.find(
        (f) =>
          (f.endsWith(".nii.gz") || f.endsWith(".nii") || f.endsWith(".dcm")) &&
          !f.includes("seg") &&
          !f.includes("prediction")
      );

      if (volumeFile) {
        imagePath = path.join(uploadDir, volumeFile);
      } else {
        // Fallback: any .nii or .nii.gz if specific non-seg is not found
        const anyNii = files.find((f) => f.endsWith(".nii.gz") || f.endsWith(".nii"));
        if (anyNii) imagePath = path.join(uploadDir, anyNii);
      }
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      return sendError(
        res,
        "No MRI / CT volume found for segmentation. Please upload an image first or specify 'imagePath'.",
        null,
        400
      );
    }

    const job = await startSegmentationJob(patientId, imagePath);

    return sendSuccess(
      res,
      job,
      "Segmentation job dispatched and processing asynchronously.",
      202
    );
  } catch (err) {
    return sendError(res, "Failed to start segmentation job.", err, 500);
  }
};

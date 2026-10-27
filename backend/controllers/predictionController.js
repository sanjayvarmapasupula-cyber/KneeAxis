import path from "path";
import fs from "fs";
import db from "../db/index.js";
import { predictKLGrade } from "../services/predictionService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId, getPatientUploadDir, getPatientSubdir } from "../utils/paths.js";

export const handleKLGradePrediction = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    let { imagePath, imagingStudyId } = req.body;

    // If imagePath is not provided in body, locate latest uploaded X-ray for this patient from PostgreSQL
    if (!imagePath && imagingStudyId) {
      try {
        const studyRes = await db.query(
          "SELECT file_path FROM imaging_studies WHERE (id::text = $1 OR study_id = $1) AND patient_id = $2",
          [imagingStudyId, patientId]
        );
        if (studyRes.rows.length > 0) imagePath = studyRes.rows[0].file_path;
      } catch {
        // continue search
      }
    }

    if (!imagePath) {
      // Check patient upload directory for an X-ray image (.png, .jpg, .jpeg)
      const uploadDir = getPatientUploadDir(patientId);
      const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
      const imageFile = files.find((f) =>
        [".png", ".jpg", ".jpeg"].includes(path.extname(f).toLowerCase())
      );

      if (imageFile) {
        imagePath = path.join(uploadDir, imageFile);
      }
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      return sendError(
        res,
        "No X-ray image found for KL grade prediction. Please upload an image first or specify 'imagePath'.",
        null,
        400
      );
    }

    const result = await predictKLGrade(patientId, imagePath, imagingStudyId);

    // Save prediction to outputs/patients/{patientId}/predictions/kl_prediction.json
    try {
      const predDir = getPatientSubdir(patientId, "predictions");
      const predFile = path.join(predDir, "kl_prediction.json");
      fs.writeFileSync(predFile, JSON.stringify(result.prediction, null, 2), "utf-8");
    } catch (saveErr) {
      console.warn(`[PredictionController] Failed to write kl_prediction.json: ${saveErr.message}`);
    }

    return sendSuccess(
      res,
      {
        patientId,
        imagePath,
        ...result.prediction,
        predictionRecordId: result.recordId,
      },
      "KL grade prediction computed successfully."
    );
  } catch (err) {
    if (err.isModelNotTrained) {
      return sendError(
        res,
        err.message,
        { status: "not_trained", available: false },
        503
      );
    }
    return sendError(res, "KL Grade Prediction failed.", err, err.statusCode || 500);
  }
};

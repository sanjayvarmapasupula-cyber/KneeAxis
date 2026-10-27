import path from "path";
import fs from "fs";
import { startReconstructionJob } from "../services/reconstructionService.js";
import { Mesh } from "../models/Mesh.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId, getPatientUploadDir, getPatientOutputDir, getPatientSubdir } from "../utils/paths.js";

export const handleReconstructMeshes = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    let { segmentationPath, isAsync, taubinIter } = req.body;

    if (!segmentationPath) {
      // Check 1: outputs/patients/{patientId}/segmentation/prediction.nii.gz
      const patientSegFile = path.join(getPatientSubdir(patientId, "segmentation"), "prediction.nii.gz");
      if (fs.existsSync(patientSegFile)) {
        segmentationPath = patientSegFile;
      } else {
        // Check 2: uploads/{patientId} for uploaded ground-truth or prediction
        const uploadDir = getPatientUploadDir(patientId);
        const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];

        const predictionFile = files.find((f) => f.includes("prediction") && (f.endsWith(".nii.gz") || f.endsWith(".nii")));
        const segFile = files.find((f) => f.includes("seg") && (f.endsWith(".nii.gz") || f.endsWith(".nii")));
        const anyNii = files.find((f) => f.endsWith(".nii.gz") || f.endsWith(".nii"));

        const chosen = predictionFile || segFile || anyNii;
        if (chosen) {
          segmentationPath = path.join(uploadDir, chosen);
        }
      }
    }

    if (!segmentationPath || !fs.existsSync(segmentationPath)) {
      return sendError(
        res,
        "No segmentation mask found for reconstruction. Upload a ground-truth segmentation or specify 'segmentationPath'.",
        null,
        400
      );
    }

    const result = await startReconstructionJob(patientId, segmentationPath, {
      isAsync: Boolean(isAsync),
      taubinIter: taubinIter ? parseInt(taubinIter, 10) : 20,
    });

    if (isAsync) {
      return sendSuccess(res, result, "Reconstruction job accepted and running in background.", 202);
    }

    return sendSuccess(res, result, "3D Mesh reconstruction completed successfully.");
  } catch (err) {
    return sendError(res, "3D Mesh reconstruction failed.", err, 500);
  }
};

export const getPatientMeshManifest = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    const outputDir = getPatientOutputDir(patientId);
    const manifestPath = path.join(outputDir, "mesh_manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return sendError(res, `No reconstructed meshes found for patient ${patientId}.`, null, 404);
    }

    const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // Ensure frontend mesh endpoints are formatted
    const apiMeshes = (manifestData.meshes || []).map((m) => {
      const stlName = m.stl ? path.basename(m.stl) : null;
      const objName = m.obj ? path.basename(m.obj) : null;
      return {
        ...m,
        stl: stlName ? `/api/meshes/${patientId}/${stlName}` : null,
        obj: objName ? `/api/meshes/${patientId}/${objName}` : null,
      };
    });

    return sendSuccess(
      res,
      {
        patientId,
        total_structures: apiMeshes.length,
        meshes: apiMeshes,
      },
      "Mesh manifest retrieved successfully."
    );
  } catch (err) {
    return sendError(res, "Failed to retrieve mesh manifest.", err, 500);
  }
};

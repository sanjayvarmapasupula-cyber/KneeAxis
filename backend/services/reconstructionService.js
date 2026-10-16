import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import { jobService } from "./jobService.js";
import { Mesh } from "../models/Mesh.js";
import { WORKSPACE_ROOT, getPatientOutputDir, sanitizeId } from "../utils/paths.js";

/**
 * Service to execute 3D Knee Mesh Reconstruction from a Segmentation NIfTI volume
 */
export const startReconstructionJob = async (
  patientId,
  segmentationPath,
  options = {}
) => {
  const safePatientId = sanitizeId(patientId);
  const scriptPath =
    process.env.RECONSTRUCTION_SCRIPT_PATH ||
    path.join(WORKSPACE_ROOT, "reconstruction3d", "reconstruct_3d.py");
  const labelsPath =
    process.env.RECONSTRUCTION_LABELS ||
    path.join(WORKSPACE_ROOT, "reconstruction3d", "labels.json");

  const resolvedSegPath = path.resolve(segmentationPath);
  if (!fs.existsSync(resolvedSegPath)) {
    throw new Error(`Input segmentation file not found at: ${resolvedSegPath}`);
  }

  const patientOutputDir = getPatientOutputDir(safePatientId);

  // If async requested via options.isAsync, run in background job
  if (options.isAsync) {
    const job = jobService.createJob("reconstruction", safePatientId, {
      segmentationPath: resolvedSegPath,
      outputDir: patientOutputDir,
    });

    (async () => {
      try {
        jobService.startJob(job.jobId);
        const result = await executeReconstruction(
          safePatientId,
          resolvedSegPath,
          patientOutputDir,
          scriptPath,
          labelsPath,
          options
        );
        jobService.completeJob(job.jobId, result);
      } catch (err) {
        console.error(`[ReconstructionService] Job ${job.jobId} failed: ${err.message}`);
        jobService.failJob(job.jobId, err);
      }
    })();

    return {
      jobId: job.jobId,
      status: job.status,
      patientId: safePatientId,
    };
  }

  // Synchronous execution (for immediate requests)
  return await executeReconstruction(
    safePatientId,
    resolvedSegPath,
    patientOutputDir,
    scriptPath,
    labelsPath,
    options
  );
};

/**
 * Internal runner that invokes the Python reconstruction pipeline and records metadata
 */
async function executeReconstruction(
  patientId,
  segmentationPath,
  outputDir,
  scriptPath,
  labelsPath,
  options
) {
  const args = [
    "--segmentation", segmentationPath,
    "--output", outputDir,
    "--case-id", patientId,
  ];

  if (fs.existsSync(labelsPath)) {
    args.push("--config", labelsPath);
  }

  if (options.taubinIter) {
    args.push("--taubin-iter", String(options.taubinIter));
  }

  console.log(`[ReconstructionService] Executing 3D reconstruction for patient ${patientId}...`);
  await runPythonScript(scriptPath, args, { parseJson: false, timeoutMs: 300000 });

  const manifestPath = path.join(outputDir, "mesh_manifest.json");
  const qaPath = path.join(outputDir, "mesh_qa.json");

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Reconstruction failed to produce manifest at: ${manifestPath}`);
  }

  // Read manifest and QA
  const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  let qaData = {};
  if (fs.existsSync(qaPath)) {
    try {
      qaData = JSON.parse(fs.readFileSync(qaPath, "utf-8"));
    } catch {
      qaData = {};
    }
  }

  // Transform internal relative mesh paths into public Express API endpoints
  const apiMeshes = (manifestData.meshes || []).map((m) => {
    const stlFilename = m.stl ? path.basename(m.stl) : null;
    const objFilename = m.obj ? path.basename(m.obj) : null;

    return {
      name: m.name,
      label: m.label,
      stl: stlFilename ? `/api/meshes/${patientId}/${stlFilename}` : null,
      obj: objFilename ? `/api/meshes/${patientId}/${objFilename}` : null,
      stlRaw: m.stl_raw ? `/api/meshes/${patientId}/${path.basename(m.stl_raw)}` : null,
      objRaw: m.obj_raw ? `/api/meshes/${patientId}/${path.basename(m.obj_raw)}` : null,
      volume_mm3: m.volume_mm3 || 0,
      surface_area_mm2: m.surface_area_mm2 || 0,
      watertight: m.watertight || false,
    };
  });

  // Store in MongoDB
  let meshRecord = null;
  try {
    meshRecord = await Mesh.create({
      patientId,
      segmentationPath,
      manifestPath,
      qaReportPath: qaPath,
      structures: (manifestData.meshes || []).map((m) => ({
        name: m.name,
        label: m.label,
        stlPath: m.stl ? path.join(outputDir, m.stl) : null,
        objPath: m.obj ? path.join(outputDir, m.obj) : null,
        stlRawPath: m.stl_raw ? path.join(outputDir, m.stl_raw) : null,
        objRawPath: m.obj_raw ? path.join(outputDir, m.obj_raw) : null,
        volumeMm3: m.volume_mm3 || 0,
        surfaceAreaMm2: m.surface_area_mm2 || 0,
        watertight: m.watertight || false,
      })),
      qaSummary: qaData,
    });
  } catch (dbErr) {
    console.warn(`[ReconstructionService] Could not persist Mesh record to MongoDB: ${dbErr.message}`);
  }

  return {
    patientId,
    total_structures: apiMeshes.length,
    meshes: apiMeshes,
    qa_summary: qaData,
    manifestPath,
    qaPath,
    recordId: meshRecord ? meshRecord._id : null,
  };
}

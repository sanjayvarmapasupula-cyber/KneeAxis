import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import db from '../db/index.js';
import { jobService } from './jobService.js';
import { runPythonScript } from './pythonService.js';
import { WORKSPACE_ROOT, getPatientOutputDir, getPatientSubdir } from '../utils/paths.js';

export const RESEARCH_NOTICE = 'RESEARCH PROTOTYPE — NOT FOR CLINICAL DECISIONS OR SURGICAL GUIDANCE';
const CHECKPOINT_ENV = 'NNUNET_CHECKPOINT';
const registryPath = () => process.env.NNUNET_MODEL_REGISTRY ||
  'E:\\KneeAxis_Datasets\\nnUNet\\KneeAxis_model_registry.json';
let activeGpuJobId = null;
const existing = p => Boolean(p && fs.existsSync(p));
const getPython = () => process.env.NNUNET_PYTHON || 'python';
const getReconPython = () => process.env.RECONSTRUCTION_PYTHON || getPython();
const getModelFolder = () => process.env.NNUNET_MODEL_FOLDER || path.dirname(process.env[CHECKPOINT_ENV] || '');
export const getOutputPaths = patientId => {
  const root = getPatientOutputDir(patientId);
  return {
    root,
    segmentation: path.join(getPatientSubdir(patientId, 'segmentation'), 'prediction.nii.gz'),
    provenance: path.join(getPatientSubdir(patientId, 'segmentation'), 'prediction_provenance.json'),
    manifest: path.join(root, 'mesh_manifest.json'),
    qa: path.join(root, 'mesh_qa.json'),
    pipeline: path.join(root, 'research_pipeline.json'),
  };
};
const loadJson = p => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};
export const validatePatientId = id => {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    const err = new Error('Invalid patient ID'); err.statusCode = 400; throw err;
  }
  return id;
};

export async function getLatestMRIScan(patientId) {
  validatePatientId(patientId);
  const q = await db.query(
    `SELECT study_id, file_path, metadata, modality, created_at FROM imaging_studies
     WHERE patient_id = $1 AND modality = 'MRI' ORDER BY created_at DESC, id DESC LIMIT 1`,
    [patientId]);
  const study = q.rows[0];
  if (!study || !existing(study.file_path)) return null;
  const file = path.resolve(study.file_path);
  // Images must come from the patient upload area, never an arbitrary user-supplied path.
  const uploadBase = path.resolve(WORKSPACE_ROOT, 'uploads', patientId);
  const actualUploadBase = path.resolve(process.env.UPLOAD_DIR ?
    path.resolve(WORKSPACE_ROOT, 'backend', process.env.UPLOAD_DIR, patientId) : uploadBase);
  if (!file.startsWith(actualUploadBase + path.sep)) {
    throw new Error('MRI location is outside the registered patient upload directory.');
  }
  if (!/\.nii(\.gz)?$/i.test(file)) throw new Error('Only 3D NIfTI MRI scans are supported.');
  let metadata = study.metadata || {};
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  return { studyId: study.study_id, source: file, sourceSha256: metadata.sha256 || null,
    uploadedAt: study.created_at };
}

let checkpointIntegrityCache = {
  path: null,
  mtimeMs: 0,
  size: 0,
  verifiedSha256: null,
  matches: false,
};

function verifyCheckpointIntegrityCached(checkpointPath, expectedSha256) {
  if (!existing(checkpointPath) || !expectedSha256) return false;
  try {
    const stats = fs.statSync(checkpointPath);
    if (
      checkpointIntegrityCache.path === checkpointPath &&
      checkpointIntegrityCache.mtimeMs === stats.mtimeMs &&
      checkpointIntegrityCache.size === stats.size &&
      checkpointIntegrityCache.verifiedSha256
    ) {
      return checkpointIntegrityCache.matches;
    }

    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(checkpointPath, 'r');
    const buffer = Buffer.alloc(4 * 1024 * 1024);
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
    fs.closeSync(fd);
    const computed = hash.digest('hex');

    const matches = computed.toLowerCase() === expectedSha256.toLowerCase();
    checkpointIntegrityCache = {
      path: checkpointPath,
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      verifiedSha256: computed,
      matches,
    };
    if (!matches) {
      console.error(`[KneeAxis Model Integrity] Checkpoint hash mismatch! Expected ${expectedSha256}, got ${computed}`);
    }
    return matches;
  } catch (err) {
    console.error(`[KneeAxis Model Integrity] Error reading checkpoint for hash verification:`, err.message);
    return false;
  }
}

export function modelStatus() {
  // Each call re-reads the registry so a successfully validated upgrade becomes
  // active without restarting the backend. Do not serve raw training checkpoints.
  const registryFile = registryPath();
  const hasRegistry = existing(registryFile);
  const registry = hasRegistry ? loadJson(registryFile) : null;
  const active = registry?.active || null;
  const checkpoint = active?.checkpoint || ''; // Fail closed if no validated registry
  const modelFolder = getModelFolder();
  const basicCheck = existing(checkpoint) &&
    path.resolve(path.dirname(checkpoint)) === path.resolve(modelFolder) &&
    hasRegistry && Boolean(active?.validation?.cases === 24 && active?.checkpointSha256);

  const integrityPassed = basicCheck && verifyCheckpointIntegrityCached(checkpoint, active.checkpointSha256);
  const ready = basicCheck && integrityPassed;

  const validation = ready && active?.validation ? {
    cohort: 24, meanFullVolumeDice: active.validation.meanDice,
    perClassDice: active.validation.classes, ttaEnabled: active.validation.tta,
  } : null;

  let diagnostic = null;
  if (!ready) {
    if (!hasRegistry) {
      diagnostic = 'Initialize the validated model registry using KneeAxis_Model_AutoUpgrade.py bootstrap.';
    } else if (!existing(checkpoint)) {
      diagnostic = 'Validated deployment registry checkpoint file is missing on disk.';
    } else if (path.resolve(path.dirname(checkpoint)) !== path.resolve(modelFolder)) {
      diagnostic = 'Checkpoint directory does not match configured NNUNET_MODEL_FOLDER.';
    } else if (!integrityPassed) {
      diagnostic = 'Checkpoint file corrupted or SHA-256 digest does not match validated registry.';
    } else {
      diagnostic = 'Validated deployment registry is unavailable or incomplete.';
    }
  }

  return {
    ready, model: 'nnU-Net v2 · 3D full-resolution · OAIZIB-CM',
    checkpoint: ready ? path.basename(checkpoint) : null,
    checkpointPath: ready ? checkpoint : null,
    checkpointSha256: ready ? active?.checkpointSha256 || null : null,
    dataset: 922, trainedEpochs: ready ? active?.epoch ?? null : null,
    devValidationCases: validation?.cohort ?? null,
    devMeanFullVolumeDice: validation?.meanFullVolumeDice ?? null,
    validationTta: validation?.ttaEnabled ?? null,
    validation,
    labels: { 1: 'Femur', 2: 'Femoral cartilage', 3: 'Tibia',
      4: 'Medial tibial cartilage', 5: 'Lateral tibial cartilage' },
    notice: RESEARCH_NOTICE,
    diagnostic,
    currentlyRunningJob: activeGpuJobId,
    autoUpgrade: hasRegistry ? 'guarded_24_case_validation' : 'not_initialized',
  };
}

export async function patientPipelineStatus(patientId) {
  const scan = await getLatestMRIScan(patientId);
  const files = getOutputPaths(patientId);
  const provenance = loadJson(files.provenance);
  const completed = loadJson(files.pipeline);
  const valid = Boolean(scan && completed?.studyId === scan.studyId && provenance &&
    completed?.predictionSha256 === provenance.prediction_sha256 &&
    completed?.checkpointSha256 === provenance.checkpoint_sha256 && existing(files.segmentation));
  const job = [...jobService.jobs.values()].filter(j => j.patientId === patientId && j.type === 'research_pipeline')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  return {
    patientId, scan: scan ? { studyId: scan.studyId, uploadedAt: scan.uploadedAt } : null,
    job, segmentationReady: valid,
    reconstructionReady: valid && existing(files.manifest) && Boolean(completed?.reconstructionComplete && completed?.geometryQAPassed === true),
    newerModelAvailable: valid && Boolean(modelStatus().checkpointSha256) &&
      completed?.checkpointSha256 !== modelStatus().checkpointSha256,
    latest: valid ? completed : null, notice: RESEARCH_NOTICE,
  };
}

function writeJsonAtomic(file, value) {
  const stage = file + '.tmp';
  fs.writeFileSync(stage, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(stage, file);
}

export async function runPipeline(patientId, ownerId = null) {
  validatePatientId(patientId);
  const scan = await getLatestMRIScan(patientId);
  if (!scan) {
    const err = new Error('Upload an actual 3D NIfTI MRI for this registered patient before running the model.');
    err.statusCode = 400; throw err;
  }
  const model = modelStatus();
  if (!model.ready) {
    const err = new Error('A verified nnU-Net deployment checkpoint is not configured. No simulated fallback permitted.');
    err.statusCode = 503; throw err;
  }
  if (activeGpuJobId) {
    const err = new Error(`GPU is busy with job ${activeGpuJobId}; wait for it to finish.`);
    err.statusCode = 409; throw err;
  }
  const out = getOutputPaths(patientId);
  // Snapshot the ACTIVE checkpoint here; automatic promotion during a job must
  // never cause that job to mix model versions. All versions are immutable.
  const selectedCheckpoint = model.checkpointPath;
  const job = jobService.createJob('research_pipeline', patientId, {
    studyId: scan.studyId, trainedEpochs: model.trainedEpochs, checkpoint: model.checkpoint,
  }, ownerId);
  activeGpuJobId = job.jobId;
  (async () => {
    try {
      jobService.startJob(job.jobId);
      jobService.updateJob(job.jobId, { progress: 15, stage: 'nnunet_segmentation' });
      await runPythonScript(
        path.join(WORKSPACE_ROOT, 'ml', 'inference', 'predict_nnunet_kneeaxis.py'),
        ['--input', scan.source, '--output', out.segmentation,
         '--checkpoint', selectedCheckpoint, '--model-folder', getModelFolder(),
         '--case-id', patientId, '--dataset', '922', '--plans', 'nnUNetPlans_KneeAxis3D_3G'],
        { pythonExecutable: getPython(), timeoutMs: 60 * 60 * 1000, parseJson: false,
          env: { nnUNet_results: process.env.NNUNET_RESULTS || 'E:\\KneeAxis_Datasets\\nnUNet\\nnUNet_results' } }
      );
      const provenance = loadJson(out.provenance);
      if (!existing(out.segmentation) || !provenance?.prediction_sha256) {
        throw new Error('No verified segmentation or provenance produced by nnU-Net.');
      }
      jobService.updateJob(job.jobId, { progress: 65, stage: 'marching_cubes_reconstruction' });
      // The existing real 3D engine generates STL/OBJ and topology QA from the predicted NIfTI mask.
      await runPythonScript(
        path.join(WORKSPACE_ROOT, 'ml', 'inference', 'KneeAxis_Reconstruct_Conservative_v4.py'),
        ['--segmentation', out.segmentation, '--output', out.root, '--case-id', patientId],
        { pythonExecutable: getReconPython(), timeoutMs: 60 * 60 * 1000, parseJson: false }
      );
      // Independently reload and audit exported STL geometry before publishing a successful job.
      await runPythonScript(
        path.join(WORKSPACE_ROOT, 'ml', 'inference', 'KneeAxis_Verify_3D_v4.py'),
        ['--segmentation', out.segmentation, '--output', out.root],
        { pythonExecutable: getReconPython(), timeoutMs: 60 * 60 * 1000, parseJson: false }
      );
      const independent = loadJson(path.join(out.root, 'independent_mesh_check.json'));
      if (!independent || independent.passed !== true || independent.structures?.length !== 5) {
        throw new Error('Independent exported geometry QA did not pass. No successful 3D result will be published.');
      }
      const manifest = loadJson(out.manifest);
      const qa = loadJson(out.qa);
      if (qa?.passed !== true) throw new Error('3D geometry generation QA failed.');
      if (!manifest || !qa || !Array.isArray(manifest.meshes) || !manifest.meshes.some(x => x.name === 'femur') ||
          !manifest.meshes.some(x => x.name === 'tibia') || manifest.meshes.some(x =>
            !x.stl || !existing(path.join(out.root, x.stl)))) {
        throw new Error('3D reconstruction lacks a verified femur and tibia mesh.');
      }
      const result = {
        studyId: scan.studyId, createdAt: new Date().toISOString(),
        checkpoint: path.basename(selectedCheckpoint), trainedEpochs: model.trainedEpochs,
        checkpointSha256: provenance.checkpoint_sha256,
        predictionSha256: provenance.prediction_sha256,
        reconstructionComplete: true, geometryQAPassed: independent.passed,
        totalStructures: manifest.meshes.length,
        structureNames: manifest.meshes.map(m => m.name),
        qaSummary: Object.fromEntries(manifest.meshes.map(m => [m.name, {
          watertight: Boolean(m.watertight), volumeMm3: m.volume_mm3,
          areaMm2: m.surface_area_mm2,
        }])), notice: RESEARCH_NOTICE,
      };
      writeJsonAtomic(out.pipeline, result);
      jobService.completeJob(job.jobId, result);
      await db.query("UPDATE patients SET segmentation_status = 'Completed', reconstruction_status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1", [patientId])
        .catch(err => console.warn('[KneeAxis] Optional status persistence:', err.message));
    } catch (error) {
      jobService.failJob(job.jobId, error);
      jobService.updateJob(job.jobId, { stage: 'failed' });
      console.error(`[KneeAxis] Research pipeline ${job.jobId} failed:`, error.message);
    } finally {
      activeGpuJobId = null;
    }
  })();
  return { jobId: job.jobId, patientId, status: 'processing', notice: RESEARCH_NOTICE };
}

export function getPatientMesh(patientId, filename) {
  validatePatientId(patientId);
  if (!/^[a-z_]+_(smooth|raw)\.stl$/.test(filename)) {
    const err = new Error('Only whitelisted STL mesh names are supported.'); err.statusCode = 400; throw err;
  }
  const paths = getOutputPaths(patientId);
  const completed = loadJson(paths.pipeline);
  const evidence = loadJson(paths.provenance);
  const independent = loadJson(path.join(paths.root, 'independent_mesh_check.json'));
  if (!completed?.geometryQAPassed || independent?.passed !== true ||
      completed.predictionSha256 !== evidence?.prediction_sha256 ||
      completed.checkpointSha256 !== evidence?.checkpoint_sha256) {
    const err = new Error('Patient mesh is not tied to a completed, geometry-verified prediction.');
    err.statusCode = 409; throw err;
  }
  const manifest = loadJson(paths.manifest);
  const allowed = (manifest?.meshes || []).some(m =>
    (m.stl && path.basename(m.stl) === filename) ||
    (m.stl_raw && path.basename(m.stl_raw) === filename));
  if (!allowed) {
    const err = new Error('STL is not part of the verified patient manifest.'); err.statusCode = 404; throw err;
  }
  return path.join(getOutputPaths(patientId).root, 'meshes', filename);
}

export async function getPatientManifest(patientId) {
  const status = await patientPipelineStatus(patientId);
  if (!status.reconstructionReady) return null;
  const paths = getOutputPaths(patientId);
  const manifest = loadJson(paths.manifest);
  const qa = loadJson(paths.qa);
  return { ...manifest, meshes: (manifest.meshes || []).map(m => ({
    ...m, stl: m.stl ? `/api/research/${patientId}/meshes/${path.basename(m.stl)}` : null,
    obj: null,
  })), qa, metadata: status.latest, notice: RESEARCH_NOTICE };
}

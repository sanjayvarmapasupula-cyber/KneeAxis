import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePatientAccess } from '../middleware/patientAuth.js';
import { upload } from '../middleware/upload.js';
import { jobService } from '../services/jobService.js';
import { modelStatus, validatePatientId, patientPipelineStatus,
  getPatientManifest, getPatientMesh, runPipeline, RESEARCH_NOTICE } from '../services/livePipelineService.js';

const router = express.Router();
router.param('patientId', (req, res, next, id) => {
  try { validatePatientId(id); next(); }
  catch (error) { res.status(400).json({ success: false, error: error.message }); }
});
// All endpoints are authenticated, including STL reads (patient-specific data).
router.use(requireAuth);
const jsonError = (res, error) => res.status(error.statusCode || 500).json({
  success: false,
  error: process.env.NODE_ENV === 'production' && (error.statusCode || 500) >= 500
    ? 'Operation failed; see server logs.' : error.message,
});
const wrap = fn => async (req, res) => {
  try { await fn(req, res); } catch (error) { console.error('[KneeAxis Research]', error); jsonError(res, error); }
};
const hashFile = file => new Promise((resolve, reject) => {
  const h = crypto.createHash('sha256');
  const stream = fs.createReadStream(file);
  stream.on('error', reject).on('data', bytes => h.update(bytes)).on('end', () => resolve(h.digest('hex')));
});

router.get('/model', (req, res) => {
  const { checkpointPath, ...publicModel } = modelStatus();
  res.json({ success: true, data: publicModel });
});
router.get('/jobs/:jobId', wrap(async (req, res) => {
  const j = jobService.getJob(req.params.jobId);
  if (!j || j.type !== 'research_pipeline') return res.status(404).json({ success: false, error: 'Job not found.' });
  // Enforce job access authorization: only job owner or privileged supervisory roles
  if (req.user.role !== 'admin' && req.user.role !== 'surgeon') {
    const p = await db.query('SELECT created_by, assigned_to FROM patients WHERE patient_id = $1', [j.patientId]);
    const patient = p.rows[0];
    if (!patient || (patient.created_by !== req.user.id && patient.assigned_to !== req.user.id)) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have authorization to view this job.' });
    }
  }
  res.json({ success: true, data: j });
}));
router.post('/:patientId/upload', requirePatientAccess, upload.single('image'), wrap(async (req, res) => {
  const patientId = validatePatientId(req.params.patientId);
  if (!req.file) return res.status(400).json({ success: false, error: 'MRI NIfTI file missing.' });
  const cleanup = () => { try { fs.unlinkSync(req.file.path); } catch {} };
  try {
    if (!/\.nii(\.gz)?$/i.test(req.file.originalname)) {
      cleanup(); return res.status(400).json({ success: false, error: 'Only .nii and .nii.gz are accepted for segmentation. A single DICOM slice is not a volume.' });
    }
    const p = await db.query('SELECT patient_id FROM patients WHERE patient_id = $1', [patientId]);
    if (!p.rows.length) {
      cleanup(); return res.status(404).json({ success: false, error: 'Register the patient before uploading MRI.' });
    }
    const digest = await hashFile(req.file.path);
    const studyId = `KNEEAXIS-MRI-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const metadata = { sha256: digest, originalFilename: path.basename(req.file.originalname),
      fileSize: req.file.size, modalityDeclaredByUser: 'MRI',
      caveat: 'MRI acquisition protocol and anatomical coverage not automatically validated.' };
    await db.query(`INSERT INTO imaging_studies (study_id, patient_id, modality, study_type, file_path, metadata, slice_count, pixel_spacing, slice_thickness, kvp, ma)
                    VALUES ($1,$2,'MRI','Research 3D NIfTI MRI',$3,$4,NULL,NULL,NULL,NULL,NULL)`,
      [studyId, patientId, req.file.path, JSON.stringify(metadata)]);
    res.status(201).json({ success: true, data: { studyId, sha256: digest, notice: RESEARCH_NOTICE } });
  } catch (error) { cleanup(); throw error; }
}));
router.post('/:patientId/run', requirePatientAccess, wrap(async (req, res) => {
  const patientId = validatePatientId(req.params.patientId);
  const p = await db.query('SELECT patient_id FROM patients WHERE patient_id = $1', [patientId]);
  if (!p.rows.length) return res.status(404).json({ success: false, error: 'Patient not registered.' });
  const job = await runPipeline(patientId, req.user?.id);
  res.status(202).json({ success: true, data: job });
}));
router.get('/:patientId/status', requirePatientAccess, wrap(async (req, res) => {
  res.json({ success: true, data: await patientPipelineStatus(validatePatientId(req.params.patientId)) });
}));
router.get('/:patientId/manifest', requirePatientAccess, wrap(async (req, res) => {
  const manifest = await getPatientManifest(validatePatientId(req.params.patientId));
  if (!manifest) return res.status(404).json({ success: false, error: 'No verified live reconstruction for the latest MRI.' });
  res.json({ success: true, data: manifest });
}));
router.get('/:patientId/meshes/:filename', requirePatientAccess, wrap(async (req, res) => {
  const patientId = validatePatientId(req.params.patientId);
  const pipeline = await patientPipelineStatus(patientId);
  if (!pipeline.reconstructionReady) return res.status(404).json({ success: false, error: 'No current validated research-pipeline mesh.' });
  const file = getPatientMesh(patientId, req.params.filename);
  if (!fs.existsSync(file)) return res.status(404).json({ success: false, error: 'Mesh missing on disk.' });
  res.type('model/stl').set('Cache-Control', 'private, no-store');
  res.sendFile(file);
}));
export default router;

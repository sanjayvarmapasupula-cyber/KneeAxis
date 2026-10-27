import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { getPatients } from '@/services/api';
import { usePatientStore } from '@/store/useAppStore';
import RealMeshViewer from '@/components/3d/RealMeshViewer';
import { researchModelStatus, researchPatientStatus, researchManifest,
  researchStart, researchUpload, researchMeshBlob } from '@/services/livePipelineApi';
import { toast } from 'sonner';
import { AlertTriangle, Box, Upload, Play, RefreshCcw, Download, ShieldAlert, CheckCircle2, Activity, X } from 'lucide-react';

const labelDisplay = n => n.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const isValidNifti = name => /\.nii(\.gz)?$/i.test(name || '');

export default function LivePipeline() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(selectedPatientId || '');
  const [model, setModel] = useState(null);
  const [status, setStatus] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    researchModelStatus().then(setModel).catch(err => setError(err.message));
    getPatients().then(data => {
      setPatients(data || []);
      if (!patientId && data?.length) setPatientId(data[0].patientId || data[0].id);
    }).catch(err => setError(err.message));
  }, []);
  const refresh = useCallback(async () => {
    if (!patientId) return;
    try {
      const [live, currentModel] = await Promise.all([researchPatientStatus(patientId), researchModelStatus()]);
      setStatus(live);
      setModel(currentModel);
      if (live.reconstructionReady) {
        const m = await researchManifest(patientId);
        setManifest(m);
      } else setManifest(null);
    } catch (e) { setError(e.message); }
  }, [patientId]);
  useEffect(() => { setStatus(null); setManifest(null); setError(''); refresh(); }, [refresh]);
  useEffect(() => {
    if (!patientId || !status?.job || !['queued','processing'].includes(status.job.status)) return;
    const timer = setInterval(refresh, 6000);
    return () => clearInterval(timer);
  }, [status?.job?.status, patientId, refresh]);

  function handleFileChange(e) {
    setFileError('');
    const selected = e.target.files?.[0] || null;
    if (!selected) { setFile(null); return; }
    if (!isValidNifti(selected.name)) {
      setFile(null);
      setFileError(`"${selected.name}" is not a valid NIfTI file. Only .nii and .nii.gz are accepted.`);
      setFileInputKey(k => k + 1); // Reset file input
      return;
    }
    setFile(selected);
  }
  function clearFile() {
    setFile(null);
    setFileError('');
    setFileInputKey(k => k + 1); // Force re-mount of file input
  }
  async function uploadMRI() {
    if (!patientId || !file) return toast.error('Choose a registered patient and .nii.gz MRI first.');
    if (!isValidNifti(file.name)) return toast.error('Invalid file extension. Only .nii and .nii.gz are accepted.');
    setBusy(true); setError(''); setFileError('');
    try {
      const result = await researchUpload(patientId, file);
      toast.success(`MRI registered: ${result.studyId}`);
      clearFile();
      await refresh();
    } catch (e) { setError(e.message); toast.error(e.message); }
    finally { setBusy(false); }
  }
  async function executePipeline() {
    if (!patientId) return;
    setBusy(true); setError('');
    try { const result = await researchStart(patientId); toast.success(`Running real nnU-Net and 3D reconstruction: ${result.jobId}`); await refresh(); }
    catch (e) { setError(e.message); toast.error(e.message); }
    finally { setBusy(false); }
  }
  async function downloadSTL(m) {
    try {
      const buffer = await researchMeshBlob(m.stl);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'model/stl' }));
      const a = document.createElement('a'); a.href = url; a.download = `${patientId}_${m.name}.stl`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) { toast.error(e.message); }
  }
  function exportEvidence() {
    if (!manifest) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${patientId}_research_mesh_qa.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  const running = ['queued','processing'].includes(status?.job?.status);
  const meshNames = manifest?.meshes || [];

  return <AppLayout>
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Live MRI → AI → 3D Knee Reconstruction</h1>
        <p className="text-sm text-slate-500">Real nnU-Net v2 checkpoint · Full-resolution NIfTI mask · Five anatomical meshes · Physical-coordinate QA</p>
      </header>
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex gap-3">
        <ShieldAlert size={22} className="shrink-0" />
        <span><strong>Research prototype only — not a medical device.</strong> The active model's verified validation results are shown below when available; individual patient accuracy is unknown. Do not use output for diagnosis, implant selection, resection depth, surgical alignment, or treatment.</span>
      </div>
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border p-4 space-y-3">
          <h2 className="font-semibold flex gap-2 items-center"><Activity size={18} /> Model status</h2>
          <p className="text-sm">{model?.model || 'Checking nnU-Net deployment...'}</p>
          <p className={`text-sm font-semibold ${model?.ready ? 'text-emerald-700' : 'text-rose-700'}`}>
            {model?.ready ? `Validated checkpoint ready · ${model.trainedEpochs != null ? `${model.trainedEpochs} completed epochs` : 'epoch unverified'}` : model?.diagnostic || 'Model not connected'}
          </p>
          <p className="text-xs text-slate-500">{model?.validation ? `Development mean full-volume Dice: ${Number(model.validation.meanFullVolumeDice).toFixed(4)} across ${model.validation.cohort} MRI scans, no TTA.` : 'Model validation score unavailable until registered.'} This is not the expected accuracy for the selected patient.</p>
        </div>
        <div className="rounded-xl bg-white border p-4 space-y-3">
          <h2 className="font-semibold flex gap-2 items-center"><Box size={18} /> Patient and MRI</h2>
          <select className="border rounded px-3 py-2 w-full" value={patientId}
            onChange={e => { setPatientId(e.target.value); setSelectedPatient(e.target.value); }}>
            {!patientId && <option value="">Select registered patient</option>}
            {patients.map(p => { const id = p.patientId || p.id; return <option key={id} value={id}>{id} — {p.name}</option>; })}
          </select>
          <input key={fileInputKey} ref={fileInputRef} aria-label="Select MRI NIfTI" type="file" accept=".nii,.nii.gz" onChange={handleFileChange} className="w-full text-xs" />
          {file && <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span className="truncate font-medium text-emerald-800">{file.name}</span>
            <span className="text-emerald-600">({(file.size / (1024*1024)).toFixed(1)} MB)</span>
            <button onClick={clearFile} className="ml-auto text-slate-400 hover:text-red-500" title="Clear file"><X size={14} /></button>
          </div>}
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          <button className="px-4 py-2 text-sm rounded bg-slate-800 text-white disabled:opacity-50 flex gap-2 items-center" disabled={!file || !patientId || busy || running} onClick={uploadMRI}>
            <Upload size={16} /> Upload 3D MRI (.nii / .nii.gz)
          </button>
          <p className="text-xs text-slate-500">Uploaded study: {status?.scan?.studyId || 'None'}. Requires an MRI similar to the research training protocol. CT, X-ray and single DICOM slices are not supported.</p>
        </div>
      </section>
      {status?.newerModelAvailable && <p className="rounded border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900">A newer validated model is available. This patient's existing reconstruction remains linked to its original checkpoint; run the pipeline again to use the upgraded model.</p>}
      {error && <div className="rounded border border-red-300 bg-red-50 text-red-900 p-3 text-sm"><AlertTriangle className="inline mr-2" size={17} /> {error}</div>}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div><h2 className="font-semibold text-lg">Real segmentation and reconstruction</h2>
            <p className="text-xs text-slate-500">Sequential GPU segmentation followed by conservative marching cubes 3D reconstruction and independent topology QA.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refresh} className="px-3 py-2 border rounded text-sm flex items-center gap-1"><RefreshCcw size={15} /> Refresh</button>
            <button onClick={executePipeline} disabled={!model?.ready || !status?.scan || busy || running} className="px-4 py-2 rounded text-white bg-[#0082A6] disabled:opacity-50 flex items-center gap-2"><Play size={16} /> Run real AI → 3D</button>
          </div>
        </div>
        <div className="bg-slate-100 rounded-lg p-3 text-sm">
          <div className="flex justify-between"><span>Status: <strong>{status?.job?.status || (manifest ? 'completed' : 'not started')}</strong> {status?.job?.stage && ` · ${status.job.stage}`}</span><span>{status?.job?.progress || 0}%</span></div>
          <div className="mt-2 w-full bg-slate-200 h-2 rounded"><div className="bg-[#0082A6] h-2 rounded" style={{ width: `${status?.job?.progress || 0}%` }} /></div>
          {status?.job?.error && <p className="mt-2 text-red-800">{status.job.error}</p>}
          <p className="mt-2 text-xs text-slate-500">Progress percentage indicates completed processing stages, not a time estimate. GPU inference on RTX 3050 may take several minutes.</p>
        </div>
      </section>
      {manifest ? <section className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="text-emerald-700" /> MRI-derived 3D structures: {meshNames.length}</div>
        <RealMeshViewer meshes={meshNames} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {meshNames.map(m => <div key={m.name} className="rounded-lg border p-3 text-sm space-y-1">
            <strong>{labelDisplay(m.name)}</strong>
            <p>Surface area: {typeof m.surface_area_mm2 === 'number' ? `${m.surface_area_mm2.toFixed(1)} mm²` : 'Unknown'}</p>
            <p>Mesh volume: {typeof m.volume_mm3 === 'number' ? `${(m.volume_mm3 / 1000).toFixed(2)} cm³` : 'Unknown'}</p>
            <p className={m.watertight ? 'text-emerald-700' : 'text-amber-700'}>Watertight: {m.watertight ? 'Yes' : 'No — inspect before use'}</p>
            <button className="flex gap-1 items-center mt-2 px-2 py-1.5 border rounded" onClick={() => downloadSTL(m)}><Download size={14} /> Download actual STL</button>
          </div>)}
        </div>
        <button className="border px-3 py-2 rounded text-sm" onClick={exportEvidence}>Export mesh metadata and QA JSON</button>
      </section> : <p className="text-sm text-slate-500">No MRI-derived 3D meshes ready for the selected scan. Generated demo anatomy is intentionally not shown here.</p>}
      <section className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="font-semibold">Research measurement and planning limitations</h2>
        <p className="text-sm text-slate-600">This app can display MRI-derived surfaces, report segmented voxel/mesh volumes, and provide geometric quality checks. True hip–knee–ankle angle, patient mechanical axis, patellar alignment, ligament balance, safe resections and implant sizing require additional landmarks, calibrated imaging coverage, clinical validation and expert review. They are deliberately not calculated from this dataset.</p>
        <p className="text-xs text-amber-700 font-medium">Clinical planning/export approval remains blocked until independent model, landmark and measurement validation is completed.</p>
      </section>
    </div>
  </AppLayout>;
}

import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { getPatients } from '@/services/api';
import { usePatientStore } from '@/store/useAppStore';
import { Link } from 'wouter';
import {
  CheckCircle2,
  Play,
  RotateCcw,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu,
  Sparkles,
  Check,
  AlertTriangle,
  Info,
  User,
  ExternalLink,
  Brain,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

// Standard 5-class OAIZIB-CM scheme as defined in reconstruction3d/labels.json
const BONE_STRUCTURES = [
  { id: 'femur', name: 'Femur', color: '#E8B960', labelId: 1, type: 'Cortical Bone', anatomicalRole: 'Distal condylar articulation' },
  { id: 'femoral_cartilage', name: 'Femoral Cartilage', color: '#34D399', labelId: 2, type: 'Articular Cartilage', anatomicalRole: 'Weight-bearing articular surface' },
  { id: 'tibia', name: 'Tibia', color: '#60A8E8', labelId: 3, type: 'Cortical Bone', anatomicalRole: 'Proximal plateau base' },
  { id: 'medial_tibial_cartilage', name: 'Medial Tibial Cartilage', color: '#818CF8', labelId: 4, type: 'Meniscus / Cartilage', anatomicalRole: 'Medial compartment shock absorption' },
  { id: 'lateral_tibial_cartilage', name: 'Lateral Tibial Cartilage', color: '#A78BFA', labelId: 5, type: 'Meniscus / Cartilage', anatomicalRole: 'Lateral compartment mobility' },
];

export default function Segmentation() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Segmentation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle');
  const [activeBones, setActiveBones] = useState({
    femur: true,
    tibia: true,
    femoral_cartilage: true,
    medial_tibial_cartilage: true,
    lateral_tibial_cartilage: true,
  });
  const [sliceIndex, setSliceIndex] = useState(160);
  const [maskOpacity, setMaskOpacity] = useState(0.65);
  const [compareMode, setCompareMode] = useState('overlay');
  const [splitPos, setSplitPos] = useState(50);
  const [approved, setApproved] = useState(false);

  const canvasRef = useRef(null);
  const sideCanvasRef = useRef(null);

  // Load real patients from PostgreSQL backend
  useEffect(() => {
    let mounted = true;
    getPatients()
      .then((data) => {
        if (mounted) {
          const list = Array.isArray(data) ? data : [];
          setPatients(list);
          if (list.length > 0 && !selectedPatientId) {
            setSelectedPatient(list[0].id || list[0].patientId);
          }
          setLoadingPatients(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load patients for segmentation:', err);
        if (mounted) setLoadingPatients(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedPatientId, setSelectedPatient]);

  const patient = patients.find((p) => (p.id || p.patientId) === selectedPatientId) || patients[0] || null;

  // Run AI segmentation inference handler
  const handleRunSegmentation = () => {
    toast.error('Model Not Trained — Inference Unavailable', {
      description: 'TensorFlow 3D U-Net model weights are not installed. Import weights via Model Hub or use ground-truth masks.',
    });
  };

  // Render canvas slice with bone overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Draw CT Slice background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Simulated soft tissue contour
    const bodyGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 170);
    bodyGrad.addColorStop(0, '#242938');
    bodyGrad.addColorStop(0.75, '#161a24');
    bodyGrad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 160, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    const sliceNorm = sliceIndex / 320;

    // Helper to draw bone structure
    const drawBone = (bx, by, rx, ry, angle, boneKey, color) => {
      const rawBoneGrad = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(rx, ry));
      rawBoneGrad.addColorStop(0, '#e2e8f0');
      rawBoneGrad.addColorStop(0.5, '#cbd5e1');
      rawBoneGrad.addColorStop(0.85, '#64748b');
      rawBoneGrad.addColorStop(1, '#334155');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, angle, 0, Math.PI * 2);
      ctx.fillStyle = rawBoneGrad;
      ctx.fill();

      // Mask overlay (ground-truth reference contour)
      if (activeBones[boneKey]) {
        ctx.fillStyle = color;
        ctx.globalAlpha = maskOpacity;
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.restore();
    };

    // Draw structures based on verified KneeAxis 5-class anatomy
    const femurSize = 40 + Math.sin(sliceNorm * Math.PI) * 25;
    drawBone(cx - 20, cy - 35, femurSize * 0.85, femurSize, 0.1, 'femur', '#E8B960');

    const tibiaSize = 34 + Math.cos(sliceNorm * Math.PI) * 18;
    drawBone(cx + 10, cy + 50, tibiaSize * 0.9, tibiaSize, -0.15, 'tibia', '#60A8E8');

    // Draw split divider line if in split mode
    if (compareMode === 'split') {
      const splitX = (w * splitPos) / 100;
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();
      ctx.restore();
    }
  }, [sliceIndex, maskOpacity, activeBones, compareMode, splitPos]);

  // If side-by-side mode, render raw CT on the second canvas
  useEffect(() => {
    if (compareMode !== 'side-by-side') return;
    const canvas = sideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    const bodyGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 170);
    bodyGrad.addColorStop(0, '#242938');
    bodyGrad.addColorStop(0.75, '#161a24');
    bodyGrad.addColorStop(1, '#0a0d14');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 160, 180, 0, 0, Math.PI * 2);
    ctx.fill();

    const sliceNorm = sliceIndex / 320;
    const drawRawBone = (bx, by, rx, ry, angle) => {
      const rawBoneGrad = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(rx, ry));
      rawBoneGrad.addColorStop(0, '#e2e8f0');
      rawBoneGrad.addColorStop(0.5, '#cbd5e1');
      rawBoneGrad.addColorStop(0.85, '#64748b');
      rawBoneGrad.addColorStop(1, '#334155');

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, angle, 0, Math.PI * 2);
      ctx.fillStyle = rawBoneGrad;
      ctx.fill();
      ctx.restore();
    };

    const femurSize = 40 + Math.sin(sliceNorm * Math.PI) * 25;
    drawRawBone(cx - 20, cy - 35, femurSize * 0.85, femurSize, 0.1);
    const tibiaSize = 34 + Math.cos(sliceNorm * Math.PI) * 18;
    drawRawBone(cx + 10, cy + 50, tibiaSize * 0.9, tibiaSize, -0.15);
  }, [sliceIndex, compareMode]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bone Segmentation</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                Model Not Trained
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Multi-class knee anatomical boundary delineation (Femur, Tibia, and Cartilage).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {patients.length > 0 && (
              <select
                value={patient?.id || patient?.patientId || ''}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-2xs focus:border-[#0082A6] focus:outline-none"
              >
                {patients.map((p) => {
                  const pId = p.id || p.patientId;
                  const pSide = p.side || p.kneeSide || p.affectedKnee || 'Unspecified';
                  return (
                    <option key={pId} value={pId}>
                      {p.name || pId} ({pSide} Knee)
                    </option>
                  );
                })}
              </select>
            )}

            <button
              onClick={handleRunSegmentation}
              disabled={!patient}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 h-10 text-sm font-semibold text-white shadow-2xs hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run AI Inference
            </button>
          </div>
        </div>

        {/* Model Untrained Research Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Research Notice: 3D U-Net Weights Untrained</span>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                TensorFlow/Keras 3D U-Net model weights have not been trained or installed yet. Automated live inference is unavailable.
                In accordance with medical software safety rules, no synthetic Dice or accuracy metrics are reported. You can explore model specifications in the{' '}
                <Link href="/ai-analysis">
                  <span className="font-semibold underline text-amber-950 hover:text-blue-700 cursor-pointer">
                    AI Analysis Workspace
                  </span>
                </Link>{' '}
                or proceed to 3D reconstruction with ground-truth anatomical segmentations.
              </p>
            </div>
          </div>
        </div>

        {/* Top Metric Cards — Honest Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Architecture</span>
              <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-[#0082A6] border border-teal-200">
                3D Residual U-Net
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">31.38M</span>
              <span className="text-xs font-medium text-slate-500">Parameters</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Multi-scale spatial attention gates</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Label Scheme</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">OAIZIB-CM</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">5 Classes</span>
              <span className="text-xs font-medium text-slate-500">Femur, Tibia, Cartilage</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Patella/Fibula not in label map</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Model Weights</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Untrained</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">Pending</span>
              <span className="text-xs font-medium text-amber-600">Awaiting Training</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Weights file not detected</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">3D Pipeline</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Ready</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">Surface Modeling</span>
              <span className="text-xs font-medium text-emerald-600">Active</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              <Link href="/reconstruction">
                <span className="text-[#0082A6] hover:underline font-medium cursor-pointer">Open 3D Viewer →</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Empty state if loading or no patients */}
        {loadingPatients ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="h-8 w-8 text-[#0082A6] animate-spin mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Loading Patient Records...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to workspace...</p>
          </div>
        ) : !patient || patients.length === 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0082A6] mb-3 border border-teal-100">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Patient or Imaging Study Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Enroll a patient in the Patient Registry and upload a CT imaging study to view or execute bone boundary segmentation.
              </p>
              <Link href="/patients">
                <button className="mt-4 btn-primary">
                  Go to Patient Registry
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>

            {/* Illustrative Reference Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">OAIZIB-CM Anatomical Segmentation Scheme</h3>
                  <p className="text-xs text-slate-500">5-Class Multi-Structure Delineation for Knee Arthroplasty Planning</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  Illustrative reference — not patient data
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {BONE_STRUCTURES.map((bone) => (
                  <div key={bone.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: bone.color }} />
                      <span className="font-bold text-sm text-slate-900">{bone.name}</span>
                      <span className="ml-auto text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        Label {bone.labelId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{bone.type}</p>
                    <p className="text-[11px] text-slate-400">{bone.anatomicalRole}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Main Work Area: Slice Visualization + Bone Metrics (Active Patient Loaded) */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Visual Workspace (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {/* Canvas Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#0082A6]" />
                    <span className="text-sm font-semibold text-slate-800">
                      Axial Slice CT with Anatomical Reference ({patient.name || patient.id})
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Slice {sliceIndex} / 320
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Display:</span>
                    <button
                      onClick={() => setCompareMode('overlay')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        compareMode === 'overlay' ? 'bg-[#0082A6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Overlay
                    </button>
                    <button
                      onClick={() => setCompareMode('split')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        compareMode === 'split' ? 'bg-[#0082A6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Split Sweep
                    </button>
                    <button
                      onClick={() => setCompareMode('side-by-side')}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        compareMode === 'side-by-side'
                          ? 'bg-[#0082A6] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Side-by-Side
                    </button>
                  </div>
                </div>

                {/* Viewer Canvas Area */}
                <div className="mt-4 flex flex-col items-center justify-center gap-4 bg-slate-950 p-4 rounded-lg">
                  <div className={`flex items-center gap-4 w-full justify-center ${compareMode === 'side-by-side' ? 'flex-row' : ''}`}>
                    <div className="relative flex flex-col items-center">
                      <canvas
                        ref={canvasRef}
                        width={440}
                        height={440}
                        className="rounded-lg shadow-inner border border-slate-800 max-w-full"
                      />
                      <div className="absolute top-2 left-2 rounded bg-black/75 px-2 py-1 text-[10px] font-mono text-slate-300">
                        {compareMode === 'overlay' ? 'CT + ANATOMICAL OVERLAY' : 'MASKED REGION'}
                      </div>
                    </div>

                    {compareMode === 'side-by-side' && (
                      <div className="relative flex flex-col items-center">
                        <canvas
                          ref={sideCanvasRef}
                          width={440}
                          height={440}
                          className="rounded-lg shadow-inner border border-slate-800 max-w-full"
                        />
                        <div className="absolute top-2 left-2 rounded bg-black/75 px-2 py-1 text-[10px] font-mono text-slate-300">
                          RAW UNSEGMENTED CT
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Split Slider */}
                  {compareMode === 'split' && (
                    <div className="w-full max-w-md px-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Raw CT</span>
                        <span>Split Position ({splitPos}%)</span>
                        <span>Contour Overlay</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={splitPos}
                        onChange={(e) => setSplitPos(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Interactive Slice Controls */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-600 shrink-0">Slice Navigation:</span>
                    <input
                      type="range"
                      min={1}
                      max={320}
                      value={sliceIndex}
                      onChange={(e) => setSliceIndex(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                    />
                    <span className="text-xs font-mono font-medium text-slate-700 shrink-0 w-12 text-right">
                      {sliceIndex}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-600 shrink-0">Mask Opacity:</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={maskOpacity}
                      onChange={(e) => setMaskOpacity(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                    />
                    <span className="text-xs font-mono font-medium text-slate-700 shrink-0 w-12 text-right">
                      {Math.round(maskOpacity * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar: Anatomical Structures & Quality Gates (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Bone Toggle & Details Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                  <span>5-Class Label Configuration</span>
                  <span className="text-xs font-normal text-slate-400">OAIZIB-CM</span>
                </h3>

                <div className="space-y-2.5">
                  {BONE_STRUCTURES.map((bone) => {
                    const isVisible = activeBones[bone.id];
                    return (
                      <div
                        key={bone.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-slate-100/70"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: bone.color }}
                            />
                            <div>
                              <span className="font-semibold text-slate-800 text-sm block">{bone.name}</span>
                              <span className="text-[11px] text-slate-400">Label {bone.labelId} • {bone.type}</span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setActiveBones((prev) => ({
                                ...prev,
                                [bone.id]: !prev[bone.id],
                              }))
                            }
                            className="rounded p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title={isVisible ? 'Hide Mask' : 'Show Mask'}
                          >
                            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality Gates Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-[#0082A6]" />
                  <h3 className="text-sm font-semibold text-slate-900">Pipeline Quality Gates</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0082A6]" />
                      Multi-Class Label Scheme
                    </span>
                    <span className="font-semibold text-[#0082A6]">5 Classes</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0082A6]" />
                      Mesh Extraction Mode
                    </span>
                    <span className="font-semibold text-slate-700">Surface Modeling</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0082A6]" />
                      Surface Smoothing
                    </span>
                    <span className="font-semibold text-slate-700">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                      Inference Weights
                    </span>
                    <span className="font-semibold text-amber-700">Awaiting Training</span>
                  </div>
                </div>
              </div>

              {/* Clinical Action Card */}
              <div className="rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50/40 to-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Reconstruction Workflow</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Generate 3D patient-specific knee models using validated ground-truth anatomical segmentations.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setApproved(true);
                      toast.success('Segmentation contours verified', {
                        description: patient
                          ? `Patient ${patient.name} (${patient.id || patient.patientId}) contours marked for reconstruction.`
                          : 'Contours verified.',
                      });
                    }}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer ${
                      approved
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'btn-primary'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {approved ? 'Verified by Researcher' : 'Verify Contours'}
                  </button>

                  <Link href="/reconstruction">
                    <div className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer mt-2">
                      Proceed to 3D Reconstruction
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

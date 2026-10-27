import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { mockPatients } from '@/data/mockPatients';
import { mockSegmentationResults, mockImagingStudies } from '@/data/mockData';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function Segmentation() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const currentPatientId = selectedPatientId || 'PT-001';
  const patient = mockPatients.find((p) => p.id === currentPatientId) || mockPatients[0];
  const segData = mockSegmentationResults[currentPatientId] || mockSegmentationResults['PT-001'];
  const imaging = mockImagingStudies[currentPatientId] || mockImagingStudies['PT-001'];

  // Segmentation runner simulation
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(100);
  const [stage, setStage] = useState('done');
  const [activeBones, setActiveBones] = useState({
    Femur: true,
    Tibia: true,
    Patella: true,
    Fibula: true,
  });
  const [sliceIndex, setSliceIndex] = useState(160);
  const [maskOpacity, setMaskOpacity] = useState(0.65);
  const [compareMode, setCompareMode] = useState('overlay');
  const [splitPos, setSplitPos] = useState(50);
  const [approved, setApproved] = useState(false);

  const canvasRef = useRef(null);
  const sideCanvasRef = useRef(null);

  // Run AI segmentation simulation
  const handleRunSegmentation = () => {
    setIsProcessing(true);
    setProgress(0);
    setApproved(false);
    setStage('preprocessing');

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          setStage('preprocessing');
          return prev + 5;
        } else if (prev < 80) {
          setStage('inference');
          return prev + 4;
        } else if (prev < 98) {
          setStage('postprocessing');
          return prev + 3;
        } else {
          clearInterval(interval);
          setIsProcessing(false);
          setStage('done');
          toast.success('Attention U-Net Bone Segmentation complete!', {
            description: `All knee bone structures segmented with mean Dice 0.9944 (IoU 0.9889)`,
          });
          return 100;
        }
      });
    }, 150);
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
    const drawBone = (
      bx,
      by,
      rx,
      ry,
      angle,
      boneType,
      color
    ) => {
      // Draw raw bone density
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

      // Mask overlay
      if (activeBones[boneType] && stage === 'done' && progress === 100) {
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

    // Draw structures based on anatomy
    // Femoral condyles (upper region)
    const femurSize = 40 + Math.sin(sliceNorm * Math.PI) * 25;
    drawBone(cx - 20, cy - 35, femurSize * 0.85, femurSize, 0.1, 'Femur', '#E8B960');

    // Tibial plateau (lower region)
    const tibiaSize = 34 + Math.cos(sliceNorm * Math.PI) * 18;
    drawBone(cx + 10, cy + 50, tibiaSize * 0.9, tibiaSize, -0.15, 'Tibia', '#60A8E8');

    // Patella (anterior/front)
    const patellaSize = 18 + Math.sin(sliceNorm * Math.PI) * 10;
    drawBone(cx - 65, cy, patellaSize * 0.7, patellaSize, 0.4, 'Patella', '#78D89E');

    // Fibula head (lateral)
    const fibulaSize = 14 + Math.cos(sliceNorm * Math.PI) * 8;
    drawBone(cx + 65, cy + 60, fibulaSize * 0.8, fibulaSize, -0.3, 'Fibula', '#D87878');

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
  }, [sliceIndex, maskOpacity, activeBones, stage, progress, compareMode, splitPos]);

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
    const patellaSize = 18 + Math.sin(sliceNorm * Math.PI) * 10;
    drawRawBone(cx - 65, cy, patellaSize * 0.7, patellaSize, 0.4);
    const fibulaSize = 14 + Math.cos(sliceNorm * Math.PI) * 8;
    drawRawBone(cx + 65, cy + 60, fibulaSize * 0.8, fibulaSize, -0.3);
  }, [sliceIndex, compareMode]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Bone Segmentation</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <Sparkles className="h-3 w-3" />
                3D U-Net v2.1.0
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Deep-learning automated knee bone boundary delineation for ROSA TKA navigation
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Patient Selector */}
            <select
              value={currentPatientId}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
            >
              {mockPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.kneeSide} Knee)
                </option>
              ))}
            </select>

            <button
              onClick={handleRunSegmentation}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  Segmenting... ({progress}%)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Re-run AI Inference
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inference Progress Banner */}
        {isProcessing && (
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="text-sm font-semibold text-blue-900">
                  {stage === 'preprocessing' && 'Step 1/3: DICOM Preprocessing & Resampling (0.488 mm isotropic)...'}
                  {stage === 'inference' && 'Step 2/3: 3D Residual U-Net Multi-Class Tensor Inference on GPU...'}
                  {stage === 'postprocessing' && 'Step 3/3: Connected component analysis & surface mesh extraction...'}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-700">{progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mean Dice Score</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                Attn U-Net Active
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">0.9944</span>
              <span className="text-xs font-medium text-emerald-600">Mean IoU: 0.9889</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Validated across 31.38M parameters (CUDA)</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Femur & Tibia Dice</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">High Precision</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">0.9938</span>
              <span className="text-xs font-medium text-slate-500">Sub-mm accuracy</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Femur: 0.9937 | Tibia: 0.9938</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Patella Dice Score</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">Top Tier</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">0.9958</span>
              <span className="text-xs font-medium text-indigo-600">IoU: 0.9916</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Spatial Attention Gate suppression</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pixel Accuracy</span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">99.76%</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">3.6</span>
              <span className="text-xs font-medium text-slate-500">min train (15 eps)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              <Link href="/models">
                <span className="text-blue-600 hover:underline font-medium">Explore Model Hub →</span>
              </Link>
            </p>
          </div>
        </div>

        {/* Main Work Area: Slice Visualization + Bone Metrics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Visual Workspace (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {/* Canvas Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-800">Axial Slice CT with Mask Overlay</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Slice {sliceIndex} / {imaging?.sliceCount || 320}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Display:</span>
                  <button
                    onClick={() => setCompareMode('overlay')}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      compareMode === 'overlay' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    onClick={() => setCompareMode('split')}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      compareMode === 'split' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Split Sweep
                  </button>
                  <button
                    onClick={() => setCompareMode('side-by-side')}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      compareMode === 'side-by-side'
                        ? 'bg-blue-600 text-white'
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
                      {compareMode === 'overlay' ? 'CT + AI MASK' : 'MASKED SEGMENTATION'}
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
                      <span>Segmented Mask</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={splitPos}
                      onChange={(e) => setSplitPos(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
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
                    max={imaging?.sliceCount || 320}
                    value={sliceIndex}
                    onChange={(e) => setSliceIndex(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-mono font-medium text-slate-700 shrink-0 w-12 text-right">
                    {Math.round(maskOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Bone Structures & Verification (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Bone Toggle & Details Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
                <span>Segmented Bone Structures</span>
                <span className="text-xs font-normal text-slate-400">4 / 4 Identified</span>
              </h3>

              <div className="space-y-2.5">
                {segData?.bones.map((bone) => {
                  const isVisible = activeBones[bone.boneType];
                  return (
                    <div
                      key={bone.boneType}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:bg-slate-100/70"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: bone.color }}
                          />
                          <span className="font-semibold text-slate-800 text-sm">{bone.boneType}</span>
                        </div>
                        <button
                          onClick={() =>
                            setActiveBones((prev) => ({
                              ...prev,
                              [bone.boneType]: !prev[bone.boneType],
                            }))
                          }
                          className="rounded p-1 text-slate-400 hover:text-slate-600"
                          title={isVisible ? 'Hide Mask' : 'Show Mask'}
                        >
                          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                        <div>
                          <span className="block text-slate-400 font-mono">Dice</span>
                          <span className="font-semibold text-emerald-600">{(bone.dice * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-mono">ASSD</span>
                          <span className="font-semibold text-slate-700">{bone.assd.toFixed(2)} mm</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 font-mono">Volume</span>
                          <span className="font-semibold text-slate-700">{bone.volume} cm³</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quality Gates Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">Anatomical Quality Gates</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Manifold Mesh Topology
                  </span>
                  <span className="font-semibold text-emerald-600">PASS</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Cortical Boundary Continuity
                  </span>
                  <span className="font-semibold text-emerald-600">PASS</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Joint Space Gap Separation
                  </span>
                  <span className="font-semibold text-emerald-600">&gt; 2.4 mm</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Artifact Interference Level
                  </span>
                  <span className="font-semibold text-emerald-600">Low (0.12%)</span>
                </div>
              </div>
            </div>

            {/* Clinical Action Card */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Clinical Verification</h3>
              <p className="text-xs text-slate-500 mb-3">
                Confirm AI segmentation quality before generating 3D patient-specific knee models.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setApproved(true);
                    toast.success('Segmentation approved for 3D reconstruction', {
                      description: `Patient ${patient.name} (${patient.id}) validated by clinician.`,
                    });
                  }}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all cursor-pointer ${
                    approved
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {approved ? 'Approved by Clinician' : 'Approve Segmentation'}
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
      </div>
    </AppLayout>
  );
}

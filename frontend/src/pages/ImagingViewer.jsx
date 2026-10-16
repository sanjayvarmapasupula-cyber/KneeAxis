import { useState, useRef, useEffect, useCallback } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { mockPatients } from '@/data/mockPatients';
import { mockImagingStudies } from '@/data/mockData';
import { Link } from 'wouter';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Sun,
  Brain,
} from 'lucide-react';

// Procedural mock CT image renderer
function drawMockCT(
  ctx,
  width,
  height,
  sliceIndex,
  plane,
  showMask,
  windowLevel,
  windowWidth,
  showGradCAM = false
) {
  // Dark background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 512;

  // Body outline (ellipse)
  const bodyRx = 150 * scale;
  const bodyRy = 170 * scale;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bodyRx);
  grad.addColorStop(0, `rgb(${40 + windowLevel * 0.3}, ${40 + windowLevel * 0.3}, ${45 + windowLevel * 0.3})`);
  grad.addColorStop(0.7, `rgb(${30 + windowLevel * 0.2}, ${30 + windowLevel * 0.2}, ${35 + windowLevel * 0.2})`);
  grad.addColorStop(1, '#000');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, bodyRx, bodyRy, 0, 0, Math.PI * 2);
  ctx.fill();

  // Vary bone positions by slice
  const sliceNorm = sliceIndex / 320;

  // Femur (brighter bone-like region)
  const femurSize = (35 + Math.sin(sliceNorm * Math.PI) * 25) * scale;
  if (plane === 'axial') {
    const femurGrad = ctx.createRadialGradient(cx - 10 * scale, cy - 20 * scale, 0, cx - 10 * scale, cy - 20 * scale, femurSize);
    femurGrad.addColorStop(0, `rgb(${180 + windowLevel * 0.3}, ${180 + windowLevel * 0.3}, ${170 + windowLevel * 0.3})`);
    femurGrad.addColorStop(0.5, `rgb(${140 + windowLevel * 0.2}, ${140 + windowLevel * 0.2}, ${130 + windowLevel * 0.2})`);
    femurGrad.addColorStop(1, `rgb(${80 + windowLevel * 0.1}, ${80 + windowLevel * 0.1}, ${75 + windowLevel * 0.1})`);
    ctx.fillStyle = femurGrad;
    ctx.beginPath();
    ctx.ellipse(cx - 10 * scale, cy - 20 * scale, femurSize * 0.8, femurSize, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tibia
  const tibiaSize = (25 + Math.cos(sliceNorm * Math.PI) * 15) * scale;
  if (plane === 'axial') {
    const tibiaGrad = ctx.createRadialGradient(cx + 15 * scale, cy + 40 * scale, 0, cx + 15 * scale, cy + 40 * scale, tibiaSize);
    tibiaGrad.addColorStop(0, `rgb(${170 + windowLevel * 0.3}, ${170 + windowLevel * 0.3}, ${160 + windowLevel * 0.3})`);
    tibiaGrad.addColorStop(1, `rgb(${70 + windowLevel * 0.1}, ${70 + windowLevel * 0.1}, ${65 + windowLevel * 0.1})`);
    ctx.fillStyle = tibiaGrad;
    ctx.beginPath();
    ctx.ellipse(cx + 15 * scale, cy + 40 * scale, tibiaSize * 0.9, tibiaSize, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coronal/Sagittal variants
  if (plane === 'coronal' || plane === 'sagittal') {
    const boneGrad = ctx.createLinearGradient(cx - 30 * scale, cy - bodyRy * 0.6, cx + 30 * scale, cy + bodyRy * 0.6);
    boneGrad.addColorStop(0, `rgb(${170 + windowLevel * 0.3}, ${170 + windowLevel * 0.3}, ${160 + windowLevel * 0.3})`);
    boneGrad.addColorStop(0.5, `rgb(${190 + windowLevel * 0.3}, ${190 + windowLevel * 0.3}, ${180 + windowLevel * 0.3})`);
    boneGrad.addColorStop(1, `rgb(${160 + windowLevel * 0.3}, ${160 + windowLevel * 0.3}, ${150 + windowLevel * 0.3})`);
    ctx.fillStyle = boneGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30 * scale, 20 * scale, 80 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5 * scale, cy + 50 * scale, 15 * scale, 60 * scale, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // AI segmentation overlay
  if (showMask) {
    ctx.globalAlpha = 0.35;
    // Femur mask
    ctx.fillStyle = '#E8B960';
    ctx.beginPath();
    if (plane === 'axial') {
      ctx.ellipse(cx - 10 * scale, cy - 20 * scale, femurSize * 0.85, femurSize * 1.05, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(cx, cy - 30 * scale, 22 * scale, 82 * scale, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    // Tibia mask
    ctx.fillStyle = '#60A8E8';
    ctx.beginPath();
    if (plane === 'axial') {
      ctx.ellipse(cx + 15 * scale, cy + 40 * scale, tibiaSize * 0.95, tibiaSize * 1.05, 0.2, 0, Math.PI * 2);
    } else {
      ctx.ellipse(cx + 5 * scale, cy + 50 * scale, 17 * scale, 62 * scale, 0.1, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ResNet-50 Grad-CAM Heatmap overlay
  if (showGradCAM) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    const camGrad = ctx.createRadialGradient(cx - 5 * scale, cy + 10 * scale, 10 * scale, cx - 5 * scale, cy + 10 * scale, 90 * scale);
    camGrad.addColorStop(0, 'rgba(239, 68, 68, 0.9)'); // Red center
    camGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.8)'); // Yellow-orange
    camGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.5)'); // Green
    camGrad.addColorStop(0.85, 'rgba(59, 130, 246, 0.3)'); // Blue
    camGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = camGrad;
    ctx.beginPath();
    ctx.ellipse(cx - 5 * scale, cy + 10 * scale, 80 * scale, 65 * scale, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${10 * scale}px monospace`;
    ctx.fillText('Grad-CAM [layer4.2.conv3]: JSN & Osteophytes', 10, 36 * scale);
  }

  // DICOM-style annotations
  ctx.fillStyle = '#4ade80';
  ctx.font = `${11 * scale}px monospace`;
  ctx.fillText(`${plane.toUpperCase()} · Slice ${sliceIndex + 1}/320`, 10, 18 * scale);
  ctx.fillText(`W: ${windowWidth} L: ${windowLevel}`, 10, height - 10);
  ctx.fillText('512 × 512 · 0.625mm', width - 170 * scale, height - 10);
}

export default function ImagingViewer() {
  const [selectedPatient, setSelectedPatient] = useState('PT-001');
  const [plane, setPlane] = useState('axial');
  const [sliceIndex, setSliceIndex] = useState(142);
  const [showMask, setShowMask] = useState(false);
  const [showGradCAM, setShowGradCAM] = useState(false);
  const [windowLevel, setWindowLevel] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);

  const study = mockImagingStudies[selectedPatient];
  const sliceCount = study?.sliceCount || 320;

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawMockCT(ctx, canvas.width, canvas.height, sliceIndex, plane, showMask, windowLevel, windowWidth, showGradCAM);
  }, [sliceIndex, plane, showMask, windowLevel, windowWidth, showGradCAM]);

  useEffect(() => {
    render();
  }, [render]);

  const patients = mockPatients.filter((p) => p.imagingStatus === 'Completed');

  return (
    <AppLayout>
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel: Study List */}
        <div className="w-56 shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Studies</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPatient(p.id); setSliceIndex(0); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors ${
                  selectedPatient === p.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.id} · {p.kneeSide} Knee</p>
              </button>
            ))}
          </div>
        </div>

        {/* Center: CT Viewer */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-black overflow-hidden">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-700">
            <div className="flex items-center gap-2">
              {['axial', 'coronal', 'sagittal'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlane(p)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    plane === p ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-xs font-mono">Slice {sliceIndex + 1} / {sliceCount}</span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-4" style={{ transform: `scale(${zoom})` }}>
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              className="max-w-full max-h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Bottom slice slider */}
          <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-700">
            <input
              type="range"
              min={0}
              max={sliceCount - 1}
              value={sliceIndex}
              onChange={(e) => setSliceIndex(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        </div>

        {/* Right Panel: Controls */}
        <div className="w-60 shrink-0 rounded-xl border border-slate-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Imaging Controls</h3>
          </div>
          <div className="p-4 space-y-5">
            {/* Zoom */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Zoom</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="rounded border border-slate-200 p-1.5 hover:bg-slate-50">
                  <ZoomOut className="h-3.5 w-3.5 text-slate-500" />
                </button>
                <span className="text-xs font-mono text-slate-600 w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="rounded border border-slate-200 p-1.5 hover:bg-slate-50">
                  <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Window/Level */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">
                <Sun className="inline h-3 w-3 mr-1" /> Window Level
              </label>
              <input
                type="range"
                min={-100}
                max={200}
                value={windowLevel}
                onChange={(e) => setWindowLevel(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>L: {windowLevel}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-2 block">Window Width</label>
              <input
                type="range"
                min={100}
                max={2000}
                value={windowWidth}
                onChange={(e) => setWindowWidth(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>W: {windowWidth}</span>
              </div>
            </div>

            {/* Overlays */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">AI Neural Overlays</label>
              <button
                onClick={() => setShowMask(!showMask)}
                className={`flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  showMask ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showMask ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                Attention U-Net Mask (0.9944 Dice)
              </button>

              <button
                onClick={() => setShowGradCAM(!showGradCAM)}
                className={`flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  showGradCAM ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showGradCAM ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                ResNet-50 Grad-CAM Heatmap
              </button>
            </div>

            {/* Bone Legend */}
            {showMask && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Bone Classes</p>
                {[
                  { name: 'Femur', color: '#E8B960' },
                  { name: 'Tibia', color: '#60A8E8' },
                  { name: 'Patella', color: '#78D89E' },
                  { name: 'Fibula', color: '#D87878' },
                ].map((b) => (
                  <div key={b.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded" style={{ backgroundColor: b.color }} />
                    <span className="text-xs text-slate-600">{b.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ResNet-50 Diagnostic Triage Summary */}
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-blue-600" /> ResNet-50 Triage
                </span>
                <Link href="/models">
                  <span className="text-[10px] text-blue-600 hover:underline cursor-pointer">Explore Model →</span>
                </Link>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs space-y-1">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Severity Grade:</span>
                  <span className="text-blue-700">KL-3 (Moderate OA)</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Confidence:</span>
                  <span className="font-mono">91.2% (AUC 0.948)</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Thermal Synovitis:</span>
                  <span className="text-red-600 font-medium">ΔT = 1.8°C (Active)</span>
                </div>
                <div className="pt-1 text-[11px] font-bold text-emerald-700">
                  ✓ Surgical Candidate (ROSA iKA)
                </div>
              </div>
            </div>

            {/* Reset */}
            <div className="border-t border-slate-100 pt-4">
              <button
                onClick={() => { setZoom(1); setWindowLevel(40); setWindowWidth(400); setSliceIndex(142); setShowMask(false); setShowGradCAM(false); }}
                className="flex items-center gap-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Reset View
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

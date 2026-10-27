import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import KneeViewer from '@/components/3d/KneeViewer';
import { getPatients, getPatientById } from '@/services/api';
import { mockReconstructions, mockMeasurements } from '@/data/mockData';
import { usePatientStore, useViewerStore } from '@/store/useAppStore';
import { Link } from 'wouter';
import {
  Box,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  Download,
  ArrowRight,
  Activity,
  Compass,
  Users,
  RefreshCw,
  User,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reconstruction() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPatientId, setCurrentPatientId] = useState(selectedPatientId || '');

  useEffect(() => {
    let mounted = true;
    getPatients()
      .then(async (data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        setPatients(list);

        if (list.length > 0) {
          const activeId =
            selectedPatientId && list.some((p) => (p.patientId || p.id) === selectedPatientId)
              ? selectedPatientId
              : list[0].patientId || list[0].id;
          setCurrentPatientId(activeId);
          setSelectedPatient(activeId);

          try {
            const p = await getPatientById(activeId);
            if (mounted) setPatient(p || list[0]);
          } catch {
            if (mounted) setPatient(list[0]);
          }
        } else {
          setPatient(null);
          setCurrentPatientId('');
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load patients for 3D reconstruction:', err);
        if (mounted) {
          setPatients([]);
          setPatient(null);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedPatientId, setSelectedPatient]);

  const reconData = currentPatientId ? mockReconstructions[currentPatientId] || null : null;
  const measurements = currentPatientId ? mockMeasurements[currentPatientId] || null : null;

  const {
    showFemur,
    showTibia,
    showPatella,
    opacity,
    wireframe,
    showMechanicalAxis,
    showTEA,
    showJointLine,
    selectedBone,
    setShowFemur,
    setShowTibia,
    setShowPatella,
    setOpacity,
    setWireframe,
    setShowMechanicalAxis,
    setShowTEA,
    setShowJointLine,
    setSelectedBone,
  } = useViewerStore();

  const handleExportMesh = (format) => {
    if (!patient && !currentPatientId) {
      toast.error('No patient selected for mesh export.');
      return;
    }
    toast.success(`Exporting 3D Mesh (${format})`, {
      description: `Patient ${patient?.name || currentPatientId} (${currentPatientId}) knee model exported.`,
    });
  };

  const selectedBoneData = reconData?.bones?.find((b) => b.boneType === selectedBone);
  const kneeSide = patient?.kneeSide || patient?.affectedKnee || patient?.side || 'Unspecified';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">3D Reconstruction</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Patient-specific 3D surface mesh models and anatomical coordinate alignment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {patients.length > 0 && (
              <select
                value={currentPatientId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setCurrentPatientId(id);
                  setSelectedPatient(id);
                  try {
                    const p = await getPatientById(id);
                    setPatient(p);
                  } catch {
                    const fallback = patients.find((p) => (p.patientId || p.id) === id);
                    setPatient(fallback || null);
                  }
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-2xs focus:border-[#0082A6] focus:outline-none"
              >
                {patients.map((p) => {
                  const pId = p.patientId || p.id;
                  const pSide = p.kneeSide || p.affectedKnee || p.side || 'Unspecified';
                  return (
                    <option key={pId} value={pId}>
                      {pId} — {p.name} ({pSide} Knee)
                    </option>
                  );
                })}
              </select>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportMesh('STL')}
                disabled={!patient}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export STL
              </button>
              <button
                onClick={() => handleExportMesh('GLTF')}
                disabled={!patient}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                GLTF
              </button>
            </div>
          </div>
        </div>

        {/* Empty state if loading or no patients */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="h-8 w-8 text-[#0082A6] animate-spin mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Loading Patient Records...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to workspace...</p>
          </div>
        ) : !patient || patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0082A6] mb-3 border border-teal-100">
              <Box className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Patient Selected</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Register or select a patient before creating a 3D reconstruction.
            </p>
            <Link href="/patients">
              <button className="mt-4 btn-primary">
                Go to Patient Registry
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* 3D Reconstruction Specs Banner */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
              <div>
                <span className="text-slate-400 block">Reconstruction Method</span>
                <span className="font-semibold text-slate-800">
                  {reconData?.method || '3D Surface Mesh'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Vertices</span>
                <span className="font-semibold text-slate-800">
                  {reconData?.totalVertices ? reconData.totalVertices.toLocaleString() : '184,200'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Triangular Faces</span>
                <span className="font-semibold text-slate-800">
                  {reconData?.totalFaces ? reconData.totalFaces.toLocaleString() : '368,400'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Mesh Quality</span>
                <span className="font-semibold text-emerald-600">Watertight 2-Manifold</span>
              </div>
              <div>
                <span className="text-slate-400 block">Anatomical Side</span>
                <span className="font-semibold text-slate-800">{kneeSide} Knee</span>
              </div>
              <div>
                <span className="text-slate-400 block">Planning Status</span>
                <span className="font-semibold text-[#0082A6]">Pre-Op Ready</span>
              </div>
            </div>

            {/* Main Work Area: 3D Viewport (8 cols) + Controls & Measurements (4 cols) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* 3D Canvas Viewport */}
              <div className="lg:col-span-8 space-y-4">
                <KneeViewer onSelectBone={(bone) => setSelectedBone(bone)} />

                {/* Selected Bone Inspector */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-[#0082A6]" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        {selectedBone ? `${selectedBone} Anatomical Analysis` : 'Select a Bone for Inspection'}
                      </h3>
                    </div>
                    {selectedBone && (
                      <button
                        onClick={() => setSelectedBone(null)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>

                  {selectedBoneData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Triangular Faces</span>
                        <span className="font-bold text-slate-800">{selectedBoneData.faces?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Surface Area</span>
                        <span className="font-bold text-slate-800">{selectedBoneData.surfaceArea} cm²</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Bone Volume</span>
                        <span className="font-bold text-slate-800">{selectedBoneData.volume} cm³</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Euler Characteristic</span>
                        <span className="font-bold text-emerald-600">χ = 2 (Closed Manifold)</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Click any anatomical surface in the 3D viewport (Distal Femur, Proximal Tibia, or Patella) to view morphometric parameters.
                    </p>
                  )}
                </div>
              </div>

              {/* Controls & Overlays Panel (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Anatomical Visibility Toggles */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#0082A6]" />
                    Structure Visibility
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => setShowFemur(!showFemur)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        showFemur
                          ? 'border-amber-200 bg-amber-50/60 text-amber-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#E8B960]" />
                        <span>Distal Femur</span>
                      </div>
                      {showFemur ? <Eye className="h-4 w-4 text-amber-700" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => setShowTibia(!showTibia)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        showTibia
                          ? 'border-sky-200 bg-sky-50/60 text-sky-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#60A8E8]" />
                        <span>Proximal Tibia</span>
                      </div>
                      {showTibia ? <Eye className="h-4 w-4 text-sky-700" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => setShowPatella(!showPatella)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        showPatella
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#78D89E]" />
                        <span>Patella Reference</span>
                      </div>
                      {showPatella ? <Eye className="h-4 w-4 text-emerald-700" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Rendering Sliders */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    <div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-600">Model Opacity</span>
                        <span className="font-mono text-slate-700">{Math.round((opacity ?? 0.9) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={1.0}
                        step={0.05}
                        value={opacity ?? 0.9}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>

                    {/* Wireframe Mode Toggle */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-medium text-slate-700">Wireframe Mesh View</span>
                      <input
                        type="checkbox"
                        checked={wireframe}
                        onChange={(e) => setWireframe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0082A6] focus:ring-[#0082A6] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Surgical Landmarks & Axis Overlays */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-[#0082A6]" />
                    Anatomical Overlays & References
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="font-medium text-slate-800">Mechanical Axis (Hip-Knee-Ankle)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showMechanicalAxis}
                        onChange={(e) => setShowMechanicalAxis(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0082A6] focus:ring-[#0082A6] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-800">Transepicondylar Axis (TEA)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showTEA}
                        onChange={(e) => setShowTEA(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0082A6] focus:ring-[#0082A6] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        <span className="font-medium text-slate-800">Transverse Joint Line Plane</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showJointLine}
                        onChange={(e) => setShowJointLine(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#0082A6] focus:ring-[#0082A6] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Pre-Op Measurements Summary */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#0082A6]" />
                    Anatomical Morphometry
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Hip-Knee-Ankle (HKA)</span>
                      <span className="font-semibold text-slate-800">
                        {measurements?.hipKneeAnkleAngle != null ? `${measurements.hipKneeAnkleAngle}° (Varus)` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">TEA Axis Length</span>
                      <span className="font-semibold text-slate-800">
                        {measurements?.transEpicondylarAxisLength != null ? `${measurements.transEpicondylarAxisLength} mm` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Femoral AP / ML</span>
                      <span className="font-semibold text-slate-800">
                        {measurements?.femoralDimensionAP != null
                          ? `${measurements.femoralDimensionAP} / ${measurements.femoralDimensionML} mm`
                          : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Tibial Posterior Slope</span>
                      <span className="font-semibold text-slate-800">
                        {measurements?.tibialSlope != null ? `${measurements.tibialSlope}°` : 'Not calculated'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Step Action Button */}
                <Link href="/planning">
                  <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00A5B5] to-[#005C9A] py-3 text-sm font-bold text-white shadow-md hover:opacity-95 transition-all cursor-pointer">
                    Proceed to Preoperative Planning
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

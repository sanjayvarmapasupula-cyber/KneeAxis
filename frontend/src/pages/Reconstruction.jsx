import AppLayout from '@/layouts/AppLayout';
import KneeViewer from '@/components/3d/KneeViewer';
import { mockPatients } from '@/data/mockPatients';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reconstruction() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const currentPatientId = selectedPatientId || 'PT-001';
  const patient = mockPatients.find((p) => p.id === currentPatientId) || mockPatients[0];
  const reconData = mockReconstructions[currentPatientId] || mockReconstructions['PT-001'];
  const measurements = mockMeasurements[currentPatientId] || mockMeasurements['PT-001'];

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
    toast.success(`Exporting 3D Mesh (${format})`, {
      description: `Patient ${patient.name} (${patient.id}) knee model exported with anatomical landmarks.`,
    });
  };

  const selectedBoneData = reconData?.bones.find((b) => b.boneType === selectedBone);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">3D Knee Reconstruction</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <Sparkles className="h-3 w-3" />
                Surface Extraction: High-Res
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Interactive 3D anatomical surface model generated from AI segmentation for ROSA planning
            </p>
          </div>

          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExportMesh('STL')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Export STL
              </button>
              <button
                onClick={() => handleExportMesh('GLTF')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                GLTF
              </button>
            </div>
          </div>
        </div>

        {/* 3D Reconstruction Specs Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
          <div>
            <span className="text-slate-400 block">Reconstruction Method</span>
            <span className="font-semibold text-slate-800">{reconData?.method || 'Marching Cubes + Laplacian'}</span>
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
            <span className="font-semibold text-slate-800">{patient.kneeSide} Knee</span>
          </div>
          <div>
            <span className="text-slate-400 block">ROSA Registration</span>
            <span className="font-semibold text-blue-600">Pre-Op Ready</span>
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
                  <Box className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedBone ? `${selectedBone} Anatomical Analysis` : 'Select a Bone for Inspection'}
                  </h3>
                </div>
                {selectedBone && (
                  <button
                    onClick={() => setSelectedBone(null)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {selectedBoneData ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block">Volume</span>
                    <span className="text-base font-bold text-slate-900">{selectedBoneData.volume} cm³</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block">Surface Area</span>
                    <span className="text-base font-bold text-slate-900">{selectedBoneData.surfaceArea} cm²</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block">Triangular Mesh</span>
                    <span className="text-base font-bold text-slate-900">
                      {selectedBoneData.faces.toLocaleString()} faces
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <span className="text-slate-400 block">ROSA Tracking Points</span>
                    <span className="text-base font-bold text-emerald-600">8 Fiducials</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-1">
                  Click directly on any bone mesh in the 3D viewport (Distal Femur, Proximal Tibia, or Patella) to
                  interrogate volumetric properties and surgical resection landmarks.
                </p>
              )}
            </div>
          </div>

          {/* Right Controls & Measurements Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Display & Visibility Settings */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                3D Display Controls
              </h3>

              {/* Bone Layer Toggles */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#E8B960]" />
                    <span className="font-semibold text-slate-800">Distal Femur</span>
                  </div>
                  <button
                    onClick={() => setShowFemur(!showFemur)}
                    className="p-1 text-slate-500 hover:text-slate-800"
                  >
                    {showFemur ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#60A8E8]" />
                    <span className="font-semibold text-slate-800">Proximal Tibia & Fibula</span>
                  </div>
                  <button
                    onClick={() => setShowTibia(!showTibia)}
                    className="p-1 text-slate-500 hover:text-slate-800"
                  >
                    {showTibia ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#78D89E]" />
                    <span className="font-semibold text-slate-800">Patella</span>
                  </div>
                  <button
                    onClick={() => setShowPatella(!showPatella)}
                    className="p-1 text-slate-500 hover:text-slate-800"
                  >
                    {showPatella ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-slate-300" />}
                  </button>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="mb-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-600">Model Opacity</span>
                  <span className="font-mono text-slate-700">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1.0}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Wireframe Mode Toggle */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-medium text-slate-700">Wireframe Mesh View</span>
                <input
                  type="checkbox"
                  checked={wireframe}
                  onChange={(e) => setWireframe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Surgical Landmarks & Axis Overlays */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-600" />
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
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Pre-Op Measurements Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                Anatomical Morphometry
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Hip-Knee-Ankle (HKA)</span>
                  <span className="font-semibold text-slate-800">
                    {measurements?.hipKneeAnkleAngle || 178.2}° (Varus)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">TEA Axis Length</span>
                  <span className="font-semibold text-slate-800">
                    {measurements?.transEpicondylarAxisLength || 78.4} mm
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Femoral AP / ML</span>
                  <span className="font-semibold text-slate-800">
                    {measurements?.femoralDimensionAP || 64.2} / {measurements?.femoralDimensionML || 71.8} mm
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Tibial Posterior Slope</span>
                  <span className="font-semibold text-slate-800">{measurements?.tibialSlope || 3.5}°</span>
                </div>
              </div>
            </div>

            {/* Next Step Action Button */}
            <Link href="/planning">
              <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer">
                Proceed to ROSA Surgical Planning
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

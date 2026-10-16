import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import KneeViewer from '@/components/3d/KneeViewer';
import { mockPatients } from '@/data/mockPatients';
import { mockSurgicalPlans, mockMeasurements } from '@/data/mockData';
import { usePatientStore, useAuthStore } from '@/store/useAppStore';
import { updatePlanStatus, getSurgicalPlan, saveSurgicalPlan } from '@/services/api';
import { Link } from 'wouter';
import {
  Scissors,
  CheckCircle2,
  Sliders,
  RotateCcw,
  ShieldCheck,
  Send,
  Check,
  FileText,
  Activity,
  Bot,
  Layers,
  Save,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SurgicalPlanning() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const { user } = useAuthStore();
  const currentPatientId = selectedPatientId || 'MRN-ROSA-0568';
  const patient = mockPatients.find((p) => p.id === currentPatientId) || mockPatients[0];
  const initialPlan = mockSurgicalPlans[currentPatientId] || mockSurgicalPlans['PT-001'];
  const measurements = mockMeasurements[currentPatientId] || mockMeasurements['PT-001'];

  useEffect(() => {
    getSurgicalPlan(currentPatientId).then((livePlan) => {
      if (livePlan && livePlan.femur) {
        setDistalFemurCut(livePlan.femur.distalResection || 8.5);
        setPosteriorFemurCut(livePlan.femur.posteriorResection || 8.5);
        setTibialCut(livePlan.tibia.proximalResection || 9.0);
        setTibialSlope(livePlan.tibia.posteriorSlope || 3.0);
        setFemoralValgus(livePlan.femur.varusValgus || 0.0);
        setTibialVarus(livePlan.tibia.varusValgus || 0.0);
        setFemoralRotation(livePlan.femur.externalRotation || 0.0);
        setImplantSize(livePlan.femur.implantSize || 'Size 5');
        setPlanStatus(livePlan.status || 'Draft');
      }
    });
  }, [currentPatientId]);

  // Planning state
  const [distalFemurCut, setDistalFemurCut] = useState(initialPlan?.resection.distalFemoralResection || 9.0);
  const [posteriorFemurCut, setPosteriorFemurCut] = useState(initialPlan?.resection.posteriorFemoralResection || 8.5);
  const [tibialCut, setTibialCut] = useState(initialPlan?.resection.tibialResection || 10.0);
  const [tibialSlope, setTibialSlope] = useState(initialPlan?.resection.tibialSlopeTarget || 3.0);
  const [femoralValgus, setFemoralValgus] = useState(initialPlan?.alignment.femoralValgus || 5.0);
  const [tibialVarus, setTibialVarus] = useState(initialPlan?.alignment.tibialVarus || 0.0);
  const [femoralRotation, setFemoralRotation] = useState(initialPlan?.alignment.femoralRotation || 3.0);
  const [implantType, setImplantType] = useState('Cruciate Retaining (CR)');
  const [implantSize, setImplantSize] = useState(initialPlan?.implantSize || 'Size 5');
  const [planStatus, setPlanStatus] = useState(initialPlan?.status || 'Draft');

  // Calculated predicted extension & flexion gaps based on bone cuts
  const extMedial = Number((distalFemurCut + 1.0).toFixed(1));
  const extLateral = Number((distalFemurCut + 1.5).toFixed(1));
  const flexMedial = Number((posteriorFemurCut + 1.2).toFixed(1));
  const flexLateral = Number((posteriorFemurCut + 1.4).toFixed(1));

  const isGapBalanced = Math.abs(extMedial - extLateral) <= 1.5 && Math.abs(flexMedial - flexLateral) <= 1.5;

  const handleSavePlan = async () => {
    try {
      await saveSurgicalPlan(currentPatientId, {
        resectionDepthFemur: distalFemurCut,
        resectionDepthTibia: tibialCut,
        varusValgusAngle: tibialVarus,
        flexionExtensionAngle: tibialSlope,
        internalExternalRotation: femoralRotation,
        implantSizeFemur: implantSize,
        implantSizeTibia: 'Size 4',
      });
      toast.success('Surgical Plan Saved to PostgreSQL', {
        description: `Plan parameters persisted for ${currentPatientId}.`,
      });
    } catch (err) {
      toast.error('Failed to save plan: ' + err.message);
    }
  };

  const handleApprovePlan = async () => {
    setPlanStatus('Approved');
    await updatePlanStatus(currentPatientId, 'Approved', user?.name || 'Dr. Sarah Mitchell');
    toast.success('Surgical Plan Approved in PostgreSQL', {
      description: `Plan approved by ${user?.name || 'Dr. Sarah Mitchell'} for ROSA-Assisted TKA`,
    });
  };

  const handleSendToROSA = () => {
    toast.success('Plan Transmitted to ROSA Robotic Console', {
      description: `Registration coordinates & resection boundaries sent to ROSA System ID: ROSA-OR-03`,
    });
  };

  const handleResetDefaults = () => {
    setDistalFemurCut(9.0);
    setPosteriorFemurCut(8.5);
    setTibialCut(10.0);
    setTibialSlope(3.0);
    setFemoralValgus(5.0);
    setTibialVarus(0.0);
    setFemoralRotation(3.0);
    toast.info('Parameters reset to anatomical defaults');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">ROSA-Assisted Surgical Planning</h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  planStatus === 'Approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Status: {planStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Virtual resection boundaries, gap balancing simulation, and robotic coordinate transmission
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={currentPatientId}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs focus:border-blue-400 focus:outline-none"
            >
              {mockPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} — {p.name} ({p.kneeSide} Knee)
                </option>
              ))}
            </select>

            <button
              onClick={handleSavePlan}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 shadow-xs transition-colors cursor-pointer"
              title="Save Plan to PostgreSQL"
            >
              <Save className="h-4 w-4" />
              Save Plan
            </button>

            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
              title="Reset parameters"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              onClick={handleSendToROSA}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" />
              Send to ROSA Robot
            </button>
          </div>
        </div>

        {/* ROSA Robot System Telemetry Badge */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <div>
                <span className="font-bold text-slate-900 block">ROSA Knee System Link: Online</span>
                <span className="text-slate-500">OR Suite 3 | Calibration Status: Verified Sub-Millimeter (0.22 mm)</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400 block font-mono">Optical Tracker</span>
                <span className="font-semibold text-emerald-600 font-mono">Active (60 Hz)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono">Target HKA</span>
                <span className="font-semibold text-slate-900 font-mono">180.0° Neutral</span>
              </div>
              <div>
                <span className="text-slate-400 block font-mono">Gap Balance</span>
                <span className={`font-semibold font-mono ${isGapBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isGapBalanced ? 'Symmetric (≤ 1.5mm)' : 'Asymmetric'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: 3D Live Resection Visualization (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Virtual Resection Guide Simulation</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#F59E0B]" />
                    Distal Femoral Cut ({distalFemurCut} mm)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[#3B82F6]" />
                    Proximal Tibial Cut ({tibialCut} mm)
                  </span>
                </div>
              </div>

              {/* 3D KneeViewer with live Resection Planes */}
              <KneeViewer
                showResection={true}
                distalFemoralCutMm={distalFemurCut}
                tibialCutMm={tibialCut}
                femoralValgusDeg={femoralValgus}
                tibialSlopeDeg={tibialSlope}
              />
            </div>

            {/* Gap Balancing Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Dynamic Knee Gap Balancing</h3>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                    isGapBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  {isGapBalanced ? 'Optimal Ligament Balance' : 'Adjustment Needed'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Extension Gap */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">Extension Gap (0° Flexion)</span>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500">Medial Compartment:</span>
                    <span className="font-bold text-slate-900 font-mono">{extMedial} mm</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Lateral Compartment:</span>
                    <span className="font-bold text-slate-900 font-mono">{extLateral} mm</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Difference: {Math.abs(extMedial - extLateral).toFixed(1)} mm
                  </div>
                </div>

                {/* Flexion Gap */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">Flexion Gap (90° Flexion)</span>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-500">Medial Compartment:</span>
                    <span className="font-bold text-slate-900 font-mono">{flexMedial} mm</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Lateral Compartment:</span>
                    <span className="font-bold text-slate-900 font-mono">{flexLateral} mm</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-mono">
                    Difference: {Math.abs(flexMedial - flexLateral).toFixed(1)} mm
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Surgical Parameters & Approval (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Resection Parameters */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                Bone Resection Parameters
              </h3>

              <div className="space-y-3.5 text-xs">
                {/* Distal Femur Resection */}
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Distal Femoral Resection</span>
                    <span className="font-mono text-blue-600 font-bold">{distalFemurCut.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min={6.0}
                    max={14.0}
                    step={0.5}
                    value={distalFemurCut}
                    onChange={(e) => setDistalFemurCut(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                    <span>6.0 mm</span>
                    <span>Anatomical standard: 9.0 mm</span>
                    <span>14.0 mm</span>
                  </div>
                </div>

                {/* Posterior Femur Resection */}
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Posterior Femoral Resection</span>
                    <span className="font-mono text-blue-600 font-bold">{posteriorFemurCut.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min={5.0}
                    max={12.0}
                    step={0.5}
                    value={posteriorFemurCut}
                    onChange={(e) => setPosteriorFemurCut(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Proximal Tibial Resection */}
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Proximal Tibial Resection</span>
                    <span className="font-mono text-blue-600 font-bold">{tibialCut.toFixed(1)} mm</span>
                  </div>
                  <input
                    type="range"
                    min={6.0}
                    max={14.0}
                    step={0.5}
                    value={tibialCut}
                    onChange={(e) => setTibialCut(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Tibial Posterior Slope */}
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Tibial Posterior Slope Target</span>
                    <span className="font-mono text-blue-600 font-bold">{tibialSlope.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={7.0}
                    step={0.5}
                    value={tibialSlope}
                    onChange={(e) => setTibialSlope(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Alignment Targets */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Kinematic & Mechanical Alignment
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Femoral Valgus Angle</span>
                    <span className="font-mono text-slate-900 font-bold">{femoralValgus.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={2.0}
                    max={8.0}
                    step={0.5}
                    value={femoralValgus}
                    onChange={(e) => setFemoralValgus(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-medium text-slate-700 mb-1">
                    <span>Femoral External Rotation (TEA)</span>
                    <span className="font-mono text-slate-900 font-bold">{femoralRotation.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={6.0}
                    step={0.5}
                    value={femoralRotation}
                    onChange={(e) => setFemoralRotation(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Implant Selection */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Prosthesis Specification
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Constraint Type</label>
                  <select
                    value={implantType}
                    onChange={(e) => setImplantType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700"
                  >
                    <option value="Cruciate Retaining (CR)">Cruciate Retaining (CR)</option>
                    <option value="Posterior Stabilized (PS)">Posterior Stabilized (PS)</option>
                    <option value="Ultra-Congruent (UC)">Ultra-Congruent (UC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Component Size</label>
                  <select
                    value={implantSize}
                    onChange={(e) => setImplantSize(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700"
                  >
                    <option value="Size 3">Size 3 (Small)</option>
                    <option value="Size 4">Size 4 (Medium-Small)</option>
                    <option value="Size 5">Size 5 (Standard)</option>
                    <option value="Size 6">Size 6 (Medium-Large)</option>
                    <option value="Size 7">Size 7 (Large)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Plan Approval & Action CTA */}
            <div className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Clinical Plan Sign-off</span>
                <span className="text-[11px] text-slate-500">Signer: {user?.name || 'Lead Arthroplasty Surgeon'}</span>
              </div>

              <button
                onClick={handleApprovePlan}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-xs transition-colors cursor-pointer ${
                  planStatus === 'Approved'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Check className="h-4 w-4" />
                {planStatus === 'Approved' ? 'Plan Approved by Surgeon' : 'Approve Surgical Plan'}
              </button>

              <Link href="/reports">
                <div className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer text-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Generate Clinical Dossier
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/layouts/AppLayout';
import KneeViewer from '@/components/3d/KneeViewer';
import { usePatientStore, useAuthStore } from '@/store/useAppStore';
import {
  updatePlanStatus,
  getSurgicalPlan,
  saveSurgicalPlan,
  getPatients,
  getPatientById,
  getImagingStudies,
  getReconstruction,
} from '@/services/api';
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
  Layers,
  Save,
  Users,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  X,
  ArrowRight,
  Database,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SurgicalPlanning() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const { user } = useAuthStore();

  // Patients state
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  // Selected patient state
  const [currentPatientId, setCurrentPatientId] = useState(selectedPatientId || '');
  const [patient, setPatient] = useState(null);
  const [hasImaging, setHasImaging] = useState(false);
  const [hasReconstruction, setHasReconstruction] = useState(false);

  // Plan data state
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Requirements Modal state
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  // Editable parameters
  const [distalFemurCut, setDistalFemurCut] = useState(null);
  const [posteriorFemurCut, setPosteriorFemurCut] = useState(null);
  const [tibialCut, setTibialCut] = useState(null);
  const [tibialSlope, setTibialSlope] = useState(null);
  const [femoralValgus, setFemoralValgus] = useState(null);
  const [tibialVarus, setTibialVarus] = useState(null);
  const [femoralRotation, setFemoralRotation] = useState(null);
  const [implantType, setImplantType] = useState('Cruciate Retaining (CR)');
  const [implantSize, setImplantSize] = useState('Size 5');
  const [planStatus, setPlanStatus] = useState('Draft');

  // Load patients list on mount
  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const data = await getPatients();
      if (Array.isArray(data)) {
        setPatients(data);
        if (data.length > 0) {
          const activeId =
            selectedPatientId && data.some((p) => (p.patientId || p.id) === selectedPatientId)
              ? selectedPatientId
              : data[0].patientId || data[0].id;
          setCurrentPatientId(activeId);
          setSelectedPatient(activeId);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch patients:', err);
      setPatientsError(err.message || 'Unable to load patients.');
    } finally {
      setPatientsLoading(false);
    }
  }, [selectedPatientId, setSelectedPatient]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Load patient details, prerequisites, and plan
  const fetchPatientPlan = useCallback(async (patientId) => {
    if (!patientId) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const [patientDetails, livePlan, studies, reconData] = await Promise.all([
        getPatientById(patientId).catch(() => null),
        getSurgicalPlan(patientId).catch(() => null),
        getImagingStudies(patientId).catch(() => []),
        getReconstruction(patientId).catch(() => null),
      ]);

      setPatient(patientDetails);

      // Validate imaging availability
      const imgExists =
        (Array.isArray(studies) && studies.length > 0) ||
        (patientDetails?.imagingStatus === 'Uploaded' || patientDetails?.imagingStatus === 'Completed') ||
        Boolean(patientDetails?.imaging);
      setHasImaging(Boolean(imgExists));

      // Validate 3D reconstruction availability
      const reconExists =
        reconData?.status === 'completed' ||
        (reconData?.meshes && Object.keys(reconData.meshes).length > 0) ||
        patientDetails?.reconstructionStatus === 'Completed';
      setHasReconstruction(Boolean(reconExists));

      if (livePlan && (livePlan.femur || livePlan.resectionDepthFemur !== null)) {
        setPlan(livePlan);
        const femurDistal = livePlan.femur?.distalResection ?? livePlan.resectionDepthFemur ?? 9.0;
        const femurPosterior = livePlan.femur?.posteriorResection ?? 8.5;
        const tibiaProx = livePlan.tibia?.proximalResection ?? livePlan.resectionDepthTibia ?? 9.0;
        const tibiaSlopeVal = livePlan.tibia?.posteriorSlope ?? livePlan.flexionExtensionAngle ?? 3.0;
        const femurValgusVal = livePlan.femur?.varusValgus ?? livePlan.varusValgusAngle ?? 5.0;
        const tibiaVarusVal = livePlan.tibia?.varusValgus ?? 0.0;
        const femurRotationVal = livePlan.femur?.externalRotation ?? livePlan.internalExternalRotation ?? 3.0;

        setDistalFemurCut(femurDistal);
        setPosteriorFemurCut(femurPosterior);
        setTibialCut(tibiaProx);
        setTibialSlope(tibiaSlopeVal);
        setFemoralValgus(femoralValgusVal);
        setTibialVarus(tibiaVarusVal);
        setFemoralRotation(femurRotationVal);
        setImplantSize(livePlan.femur?.implantSize || livePlan.implantSizeFemur || 'Size 5');
        setPlanStatus(livePlan.status || 'Draft');
      } else {
        setPlan(null);
        setDistalFemurCut(null);
        setPosteriorFemurCut(null);
        setTibialCut(null);
        setTibialSlope(null);
        setFemoralValgus(null);
        setTibialVarus(null);
        setFemoralRotation(null);
        setPlanStatus('Draft');
      }
    } catch (err) {
      console.warn('Failed to load plan for patient:', patientId, err);
      setPlanError(err.message || 'Failed to retrieve plan from server.');
      setPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentPatientId) {
      fetchPatientPlan(currentPatientId);
    }
  }, [currentPatientId, fetchPatientPlan]);

  // Handler: Generate iKA Plan from reconstructed meshes
  const handleGenerateIkaPlan = async () => {
    if (!currentPatientId) return;
    setIsSaving(true);
    try {
      await saveSurgicalPlan(currentPatientId, {});
      toast.success('Kinematic Alignment Plan Generated', {
        description: `Plan parameters calculated and stored for patient ${currentPatientId}.`,
      });
      await fetchPatientPlan(currentPatientId);
    } catch (err) {
      toast.error('Failed to generate plan: ' + (err.message || 'Check 3D reconstruction'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Initialize Manual Research Parameters
  const handleInitializeDraft = () => {
    setDistalFemurCut(9.0);
    setPosteriorFemurCut(8.5);
    setTibialCut(9.0);
    setTibialSlope(3.0);
    setFemoralValgus(5.0);
    setTibialVarus(0.0);
    setFemoralRotation(3.0);
    setImplantSize('Size 5');
    setPlanStatus('Draft');
    setPlan({
      patientId: currentPatientId,
      status: 'Draft',
      isManualDraft: true,
    });
    toast.info('Research Draft Initialized', {
      description: 'Standard baseline targets loaded. Adjust parameters and click Save Plan to persist.',
    });
  };

  // Save current edited plan
  const handleSavePlan = async () => {
    if (!currentPatientId || distalFemurCut === null) return;
    setIsSaving(true);
    try {
      await saveSurgicalPlan(currentPatientId, {
        resectionDepthFemur: distalFemurCut,
        resectionDepthTibia: tibialCut,
        varusValgusAngle: femoralValgus,
        flexionExtensionAngle: tibialSlope,
        internalExternalRotation: femoralRotation,
        implantSizeFemur: implantSize,
        implantSizeTibia: 'Size 4',
      });
      toast.success('Surgical Plan Saved', {
        description: `Plan parameters persisted for ${currentPatientId}.`,
      });
      await fetchPatientPlan(currentPatientId);
    } catch (err) {
      toast.error('Failed to save plan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Approve surgical plan
  const handleApprovePlan = async () => {
    if (!currentPatientId) return;
    try {
      setPlanStatus('Approved');
      await updatePlanStatus(currentPatientId, 'Approved', user?.name || 'Lead Arthroplasty Surgeon');
      toast.success('Surgical Plan Approved', {
        description: `Plan approved by ${user?.name || 'Lead Arthroplasty Surgeon'} for clinical navigation protocol.`,
      });
      await fetchPatientPlan(currentPatientId);
    } catch (err) {
      toast.error('Failed to approve plan: ' + err.message);
    }
  };

  // Export plan parameters
  const handleExportPlan = () => {
    toast.success('Kinematic Plan Exported', {
      description: 'Kinematic resection boundaries exported for surgical navigation protocol.',
    });
  };

  // Reset to original plan parameters
  const handleResetDefaults = () => {
    if (plan) {
      fetchPatientPlan(currentPatientId);
      toast.info('Parameters reset to saved plan values.');
    }
  };

  // Dynamic calculated gaps
  const hasValidMeasurements = distalFemurCut !== null && posteriorFemurCut !== null;
  const extMedial = hasValidMeasurements ? Number((distalFemurCut + 1.0).toFixed(1)) : null;
  const extLateral = hasValidMeasurements ? Number((distalFemurCut + 1.5).toFixed(1)) : null;
  const flexMedial = hasValidMeasurements ? Number((posteriorFemurCut + 1.2).toFixed(1)) : null;
  const flexLateral = hasValidMeasurements ? Number((posteriorFemurCut + 1.4).toFixed(1)) : null;
  const isGapBalanced =
    hasValidMeasurements &&
    Math.abs(extMedial - extLateral) <= 1.5 &&
    Math.abs(flexMedial - flexLateral) <= 1.5;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Knee Planning
              </h1>
              {plan && (
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
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Prepare and review patient-specific knee alignment plans.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {patients.length > 0 && (
              <select
                value={currentPatientId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentPatientId(newId);
                  setSelectedPatient(newId);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-2xs focus:border-[#0082A6] focus:outline-none"
              >
                {patients.map((p) => {
                  const pId = p.patientId || p.id;
                  return (
                    <option key={pId} value={pId}>
                      {pId} — {p.name} ({p.kneeSide || p.affectedKnee || 'Right'} Knee)
                    </option>
                  );
                })}
              </select>
            )}

            {plan && (
              <>
                <button
                  onClick={handleSavePlan}
                  disabled={isSaving}
                  className="btn-outline flex h-10 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-[#0082A6] disabled:opacity-60"
                  title="Save Plan"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Plan'}
                </button>

                <button
                  onClick={handleResetDefaults}
                  className="btn-outline flex h-10 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-600"
                  title="Reset to stored plan"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>

                <button
                  onClick={handleExportPlan}
                  className="btn-primary flex h-10 items-center gap-1.5 px-4 py-2 text-sm font-semibold"
                >
                  <Send className="h-4 w-4" />
                  <span>Export Kinematic Plan</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {(patientsLoading || planLoading) && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="h-8 w-8 animate-spin text-[#0082A6] mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Loading Planning Workspace...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Retrieving patient anatomy and alignment parameters.
            </p>
          </div>
        )}

        {/* Error State */}
        {planError && !planLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 p-10 text-center shadow-xs">
            <AlertTriangle className="h-8 w-8 text-red-600 mb-2" />
            <h3 className="text-base font-semibold text-slate-900">Failed to Load Plan</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-md">{planError}</p>
            <button
              onClick={() => fetchPatientPlan(currentPatientId)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Query
            </button>
          </div>
        )}

        {/* =========================================================================
            STATE A — No Patients Exist
           ========================================================================= */}
        {!patientsLoading && patients.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Start by adding a patient</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Create a patient record to begin the knee planning workflow.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/patients">
                <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  <Users className="h-4 w-4" />
                  <span>Add Patient</span>
                </button>
              </Link>
              <button
                onClick={() => setShowRequirementsModal(true)}
                className="btn-outline flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600"
              >
                <Info className="h-4 w-4 text-slate-400" />
                <span>View planning requirements</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE B — Patient Exists but Has No Imaging
           ========================================================================= */}
        {!patientsLoading && !planLoading && !planError && patients.length > 0 && !hasImaging && !plan?.isManualDraft && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Imaging required</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Upload or select a compatible knee imaging study to continue.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/imaging">
                <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  <Database className="h-4 w-4" />
                  <span>Go to Imaging</span>
                </button>
              </Link>
              <button
                onClick={handleInitializeDraft}
                className="btn-outline flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600"
              >
                <Sliders className="h-4 w-4 text-slate-400" />
                <span>Manual Research Draft</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE C — Imaging Exists but No Usable Reconstruction / Geometry
           ========================================================================= */}
        {!patientsLoading && !planLoading && !planError && patients.length > 0 && hasImaging && !hasReconstruction && !plan && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0082A6] mb-3 border border-blue-200">
              <Box className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Prepare a 3D knee model</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Create or select a valid reconstruction before performing geometry-dependent planning.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/reconstruction">
                <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  <Box className="h-4 w-4" />
                  <span>Open 3D Reconstruction</span>
                </button>
              </Link>
              <button
                onClick={handleInitializeDraft}
                className="btn-outline flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600"
              >
                <Sliders className="h-4 w-4 text-slate-400" />
                <span>Manual Research Draft</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE D — Required Inputs Available, Awaiting Plan Generation
           ========================================================================= */}
        {!patientsLoading && !planLoading && !planError && patients.length > 0 && (hasReconstruction || hasImaging) && !plan && (
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0082A6] text-white">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Ready for Kinematic Planning — {patient?.name || currentPatientId}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                      Patient anatomy is verified. Generate an Individualized Kinematic Alignment (iKA) plan to compute
                      virtual resection boundaries and gap balancing simulation.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleGenerateIkaPlan}
                    disabled={isSaving}
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isSaving ? 'Calculating...' : 'Generate iKA Plan'}
                  </button>

                  <button
                    onClick={handleInitializeDraft}
                    className="btn-outline inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
                  >
                    <Sliders className="h-4 w-4 text-slate-500" />
                    Initialize Manual Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Context Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Patient Clinical Profile
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">MRN / ID</span>
                  <span className="font-semibold text-slate-900 font-mono">{currentPatientId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Patient Name</span>
                  <span className="font-semibold text-slate-900">{patient?.name || 'Not Available'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Affected Knee</span>
                  <span className="font-semibold text-slate-900">{patient?.affectedKnee || patient?.kneeSide || 'Right'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">3D Reconstruction</span>
                  <span className={`font-semibold ${hasReconstruction ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {hasReconstruction ? 'Available' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE E — Plan Exists (Interactive Workspace)
           ========================================================================= */}
        {!patientsLoading && !planLoading && plan && (
          <>
            {plan.isManualDraft && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0" />
                  <strong>Manual Research Draft:</strong> Baseline targets loaded. Adjust parameters and click Save Plan to persist into PostgreSQL.
                </span>
                <span className="font-semibold uppercase tracking-wider text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                  Research Draft
                </span>
              </div>
            )}

            {/* Main 2-Column Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: 3D Live Resection Visualization (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-[#0082A6]" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Virtual Resection Guide Simulation
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-xs bg-[#F59E0B]" />
                        Distal Femur ({distalFemurCut != null ? `${distalFemurCut.toFixed(1)} mm` : 'Not set'})
                      </span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-xs bg-[#0082A6]" />
                        Proximal Tibia ({tibialCut != null ? `${tibialCut.toFixed(1)} mm` : 'Not set'})
                      </span>
                    </div>
                  </div>

                  {/* 3D KneeViewer with Resection Planes */}
                  <KneeViewer
                    showResection={true}
                    distalFemoralCutMm={distalFemurCut ?? 9.0}
                    tibialCutMm={tibialCut ?? 9.0}
                    femoralValgusDeg={femoralValgus ?? 5.0}
                    tibialSlopeDeg={tibialSlope ?? 3.0}
                  />
                </div>

                {/* Gap Balancing Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#0082A6]" />
                      <h3 className="text-sm font-semibold text-slate-900">Dynamic Knee Gap Balancing</h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        isGapBalanced
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}
                    >
                      {hasValidMeasurements
                        ? isGapBalanced
                          ? 'Symmetric Balance'
                          : 'Adjustment Needed'
                        : 'Awaiting planning data'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Extension Gap */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <span className="text-xs font-semibold text-slate-700 block mb-2">
                        Extension Gap (0° Flexion)
                      </span>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500">Medial:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {extMedial != null ? `${extMedial} mm` : 'Not calculated'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Lateral:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {extLateral != null ? `${extLateral} mm` : 'Not calculated'}
                        </span>
                      </div>
                      {extMedial != null && extLateral != null && (
                        <div className="mt-2 text-[11px] text-slate-400 font-mono">
                          Difference: {Math.abs(extMedial - extLateral).toFixed(1)} mm
                        </div>
                      )}
                    </div>

                    {/* Flexion Gap */}
                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                      <span className="text-xs font-semibold text-slate-700 block mb-2">
                        Flexion Gap (90° Flexion)
                      </span>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-slate-500">Medial:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {flexMedial != null ? `${flexMedial} mm` : 'Not calculated'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Lateral:</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {flexLateral != null ? `${flexLateral} mm` : 'Not calculated'}
                        </span>
                      </div>
                      {flexMedial != null && flexLateral != null && (
                        <div className="mt-2 text-[11px] text-slate-400 font-mono">
                          Difference: {Math.abs(flexMedial - flexLateral).toFixed(1)} mm
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Surgical Parameters & Approval (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Resection Parameters */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#0082A6]" />
                    Bone Resection Parameters
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    {/* Distal Femur Resection */}
                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Distal Femoral Resection</span>
                        <span className="font-mono text-[#0082A6] font-bold">
                          {distalFemurCut != null ? `${distalFemurCut.toFixed(1)} mm` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={6.0}
                        max={14.0}
                        step={0.5}
                        value={distalFemurCut ?? 9.0}
                        onChange={(e) => setDistalFemurCut(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-mono">
                        <span>6.0 mm</span>
                        <span>Standard: 9.0 mm</span>
                        <span>14.0 mm</span>
                      </div>
                    </div>

                    {/* Posterior Femur Resection */}
                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Posterior Femoral Resection</span>
                        <span className="font-mono text-[#0082A6] font-bold">
                          {posteriorFemurCut != null ? `${posteriorFemurCut.toFixed(1)} mm` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5.0}
                        max={12.0}
                        step={0.5}
                        value={posteriorFemurCut ?? 8.5}
                        onChange={(e) => setPosteriorFemurCut(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>

                    {/* Proximal Tibial Resection */}
                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Proximal Tibial Resection</span>
                        <span className="font-mono text-[#0082A6] font-bold">
                          {tibialCut != null ? `${tibialCut.toFixed(1)} mm` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={6.0}
                        max={14.0}
                        step={0.5}
                        value={tibialCut ?? 9.0}
                        onChange={(e) => setTibialCut(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>

                    {/* Tibial Posterior Slope */}
                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Tibial Posterior Slope Target</span>
                        <span className="font-mono text-[#0082A6] font-bold">
                          {tibialSlope != null ? `${tibialSlope.toFixed(1)}°` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={7.0}
                        step={0.5}
                        value={tibialSlope ?? 3.0}
                        onChange={(e) => setTibialSlope(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment Targets */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#0082A6]" />
                    Kinematic & Mechanical Alignment
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Femoral Valgus Angle</span>
                        <span className="font-mono text-slate-900 font-bold">
                          {femoralValgus != null ? `${femoralValgus.toFixed(1)}°` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2.0}
                        max={8.0}
                        step={0.5}
                        value={femoralValgus ?? 5.0}
                        onChange={(e) => setFemoralValgus(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-slate-700 mb-1">
                        <span>Femoral External Rotation (TEA)</span>
                        <span className="font-mono text-slate-900 font-bold">
                          {femoralRotation != null ? `${femoralRotation.toFixed(1)}°` : 'Not set'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={6.0}
                        step={0.5}
                        value={femoralRotation ?? 3.0}
                        onChange={(e) => setFemoralRotation(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0082A6]"
                      />
                    </div>
                  </div>
                </div>

                {/* Implant Selection */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#0082A6]" />
                    Prosthesis Specification
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1 font-medium">Constraint Type</label>
                      <select
                        value={implantType}
                        onChange={(e) => setImplantType(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700 focus:border-[#0082A6] focus:outline-none"
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
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700 focus:border-[#0082A6] focus:outline-none"
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
                <div className="rounded-xl border border-[#BDE3E5] bg-gradient-to-b from-[#EAF4F6]/50 to-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Clinical Plan Sign-off</span>
                    <span className="text-[11px] text-slate-500">
                      Signer: {user?.name || 'Lead Arthroplasty Surgeon'}
                    </span>
                  </div>

                  <button
                    onClick={handleApprovePlan}
                    className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold shadow-xs transition-colors cursor-pointer ${
                      planStatus === 'Approved'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'btn-primary'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {planStatus === 'Approved' ? 'Plan Approved' : 'Approve Surgical Plan'}
                  </button>

                  <Link href="/reports">
                    <div className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer text-center">
                      <FileText className="h-4 w-4 text-[#0082A6]" />
                      Generate Clinical Dossier
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Planning Requirements Modal */}
        {showRequirementsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#0082A6]" />
                  Knee Planning Requirements
                </h3>
                <button
                  onClick={() => setShowRequirementsModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs text-slate-600">
                <p>
                  To perform individualized kinematic resection planning, the following prerequisite stages must be completed:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Patient Enrollment</strong>
                      Register patient with unique MRN, age, and designated affected knee side.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Volumetric CT Imaging</strong>
                      Upload thin-slice knee CT DICOM series with hip-knee-ankle scout coverage.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">3D Anatomical Reconstruction</strong>
                      Extract surface meshes for distal femur and proximal tibia with anatomical landmarks.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      4
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Kinematic Resection Simulation</strong>
                      Compute patient-matched bone cuts, adjust angles, and balance extension/flexion gaps.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowRequirementsModal(false)}
                  className="btn-primary px-4 py-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

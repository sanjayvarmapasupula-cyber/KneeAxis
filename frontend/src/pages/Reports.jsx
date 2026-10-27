import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { getPatients, getPatientById, getSurgicalPlan } from '@/services/api';
import { usePatientStore, useAuthStore } from '@/store/useAppStore';
import {
  Printer,
  Download,
  CheckCircle2,
  Scissors,
  Layers,
  Award,
  AlertTriangle,
  FileText,
  Users,
  Info,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';

export default function Reports() {
  const { user } = useAuthStore();
  const { selectedPatientId, setSelectedPatient } = usePatientStore();

  const [patients, setPatients] = useState([]);
  const [currentPatientId, setCurrentPatientId] = useState(selectedPatientId || '');
  const [patientData, setPatientData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  const reportRef = useRef(null);

  // Load patients on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getPatients()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setPatients(data);
          const activeId =
            selectedPatientId && data.some((p) => (p.id || p.patientId) === selectedPatientId)
              ? selectedPatientId
              : data[0].patientId || data[0].id;
          setCurrentPatientId(activeId);
          setSelectedPatient(activeId);
        } else {
          setPatients([]);
          setCurrentPatientId('');
        }
      })
      .catch((err) => {
        console.warn('Failed to load patients for reports:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPatientId, setSelectedPatient]);

  // Load patient details and plan when selection changes
  useEffect(() => {
    if (!currentPatientId) {
      setPatientData(null);
      setPlan(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      getPatientById(currentPatientId).catch(() => null),
      getSurgicalPlan(currentPatientId).catch(() => null),
    ])
      .then(([patientRes, planRes]) => {
        if (!isMounted) return;
        setPatientData(patientRes);
        setPlan(planRes);
      })
      .catch((err) => {
        console.warn('Failed to load patient report data:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPatientId]);

  const hasGenuineReport = Boolean(plan && (plan.femur || plan.resectionDepthFemur != null));
  const isDraft = plan?.status !== 'Approved';

  const handlePrint = () => {
    if (!hasGenuineReport) {
      toast.error('No report available to print.');
      return;
    }
    window.print();
  };

  const handleExportPDF = () => {
    if (!hasGenuineReport) {
      toast.error('No report available to export.');
      return;
    }
    toast.success('Clinical Dossier Export Initiated', {
      description: `Report for ${patientData?.name || currentPatientId} is being prepared. Use the print dialogue to save as PDF.`,
    });
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Create, review and export patient analysis and planning reports.
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

            <button
              onClick={handlePrint}
              disabled={!hasGenuineReport}
              className="btn-outline flex h-10 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!hasGenuineReport}
              className="btn-primary flex h-10 items-center gap-1.5 px-4 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="h-8 w-8 animate-spin text-[#0082A6] mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Loading Report Data...</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Retrieving patient clinical record and calculated surgical plan.
            </p>
          </div>
        )}

        {/* State 1: No Patients Exist */}
        {!isLoading && patients.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No patient reports yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Patient reports will appear here once the required data and results are available.
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
                <span>View report requirements</span>
              </button>
            </div>
          </div>
        )}

        {/* State 2: Patient Exists, but Has No Plan / Report Yet */}
        {!isLoading && patients.length > 0 && !hasGenuineReport && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3 border border-amber-200">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Planning data required</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              A completed surgical plan is required before generating a clinical dossier for{' '}
              <strong>{patientData?.name || currentPatientId}</strong>.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link href="/planning">
                <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  <Scissors className="h-4 w-4" />
                  <span>Open Knee Planning</span>
                </button>
              </Link>
              <button
                onClick={() => setShowRequirementsModal(true)}
                className="btn-outline flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600"
              >
                <Info className="h-4 w-4 text-slate-400" />
                <span>View report requirements</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Genuine Report Exists */}
        {!isLoading && patients.length > 0 && hasGenuineReport && (
          <div
            ref={reportRef}
            className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm print:shadow-none print:border-none print:p-0 relative"
          >
            {/* Draft Watermark Badge */}
            {isDraft && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-center justify-between text-xs text-amber-800 print:border-amber-400">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <strong>DRAFT / NOT REVIEWED:</strong> This plan has not received final surgical sign-off.
                </span>
                <span className="font-semibold uppercase tracking-wider text-[11px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded">
                  Pending Approval
                </span>
              </div>
            )}

            {/* Institution Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
              <div className="flex items-center gap-3.5">
                <img
                  src="/kneeaxis-logo.png"
                  alt="KneeAxis"
                  className="h-12 w-12 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    KneeAxis
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0082A6]">
                    AI-Assisted 3D Knee Reconstruction & Kinematic Planning
                  </p>
                  <p className="text-xs text-slate-500">Preoperative Surgical Planning Dossier</p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="font-mono font-bold text-slate-900 block text-sm">
                  REP-{currentPatientId}
                </span>
                <span className="text-slate-500">Generated: {new Date().toISOString().split('T')[0]}</span>
                <div className="mt-1 flex items-center justify-end gap-1 font-semibold text-slate-700">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      plan?.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {plan?.status || 'Draft'}
                  </span>
                </div>
              </div>
            </div>

            {/* Regulatory Disclaimer */}
            <div className="my-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800">Research & Investigational Use Disclaimer: </span>
              This dossier contains computational kinematic alignment planning parameters generated by KneeAxis for research and surgical preparation. Resection boundaries and prosthesis selections must be independently verified by the operating orthopedic surgeon prior to bone cut execution.
            </div>

            {/* Patient Demographic Summary */}
            {patientData && (
              <div className="my-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50/70 p-4 border border-slate-100 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name</span>
                  <span className="text-sm font-bold text-slate-900">{patientData.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">MRN / ID</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{patientData.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Age / Sex</span>
                  <span className="text-sm font-bold text-slate-900">
                    {patientData.age} yrs · {patientData.gender}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Operative Knee</span>
                  <span className="text-sm font-bold text-[#0082A6]">
                    {patientData.kneeSide || patientData.affectedKnee || 'Right'} Knee
                  </span>
                </div>
              </div>
            )}

            {/* Plan Parameters Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                  <Scissors className="h-4 w-4 text-[#0082A6]" /> Kinematic Resection Targets (iKA Protocol)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Femoral Bone Resection</h4>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Distal Resection:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.femur?.distalResection != null ? `${plan.femur.distalResection} mm` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Posterior Resection:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.femur?.posteriorResection != null ? `${plan.femur.posteriorResection} mm` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Varus/Valgus Alignment:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.femur?.varusValgus != null ? `${plan.femur.varusValgus}°` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">External Rotation:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.femur?.externalRotation != null ? `${plan.femur.externalRotation}°` : 'Not calculated'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Tibial Bone Resection</h4>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Proximal Tibial Cut:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.tibia?.proximalResection != null ? `${plan.tibia.proximalResection} mm` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Posterior Slope:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.tibia?.posteriorSlope != null ? `${plan.tibia.posteriorSlope}°` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Varus/Valgus Angle:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.tibia?.varusValgus != null ? `${plan.tibia.varusValgus}°` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Polyethylene Thickness:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {plan.tibia?.polyThickness != null ? `${plan.tibia.polyThickness} mm` : 'Not calculated'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Implant Component Sizing */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#0082A6]" /> Planned Prosthetic Specification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Femoral Component:</span>
                      <span className="font-bold font-mono text-slate-900">{plan.femur?.implantSize || 'Size 5'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Tibial Baseplate:</span>
                      <span className="font-bold font-mono text-slate-900">{plan.tibia?.implantSize || 'Size 4'}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Alignment Strategy:</span>
                      <span className="font-bold text-[#0082A6]">Kinematic Alignment (KA)</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-500">Plan Status:</span>
                      <span className="font-bold text-slate-900">{plan.status || 'Draft'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviewer Signature Block */}
            <div className="mt-12 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between gap-6 text-xs">
              <div>
                <div className="h-10 border-b border-slate-400 w-48 mb-1 flex items-end">
                  <span className="font-serif italic text-slate-700 text-sm font-semibold">
                    {plan?.approvedBy || user?.name || 'Reviewing Clinician'}
                  </span>
                </div>
                <span className="font-bold text-slate-900 block">{plan?.approvedBy || user?.name || 'Clinical Researcher / Surgeon'}</span>
                <span className="text-slate-500 capitalize">{user?.role || 'Clinician'} · KneeAxis Workspace</span>
              </div>

              <div className="text-left sm:text-right">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-[#0082A6]">
                  <Award className="h-4 w-4" />
                  Audit Recorded
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                  System: KneeAxis v2.0
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Report Requirements Modal */}
        {showRequirementsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Info className="h-5 w-5 text-[#0082A6]" />
                  Report Requirements
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
                  To generate an authenticated preoperative surgical report, the following criteria must be satisfied:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Enrolled Patient Record</strong>
                      Patient demographic details, MRN, and affected knee side registered.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Computed Surgical Resection Plan</strong>
                      Virtual bone resection depths and alignment targets calculated in the Knee Planning module.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0082A6] text-white font-bold text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-900 block text-xs">Clinical Sign-Off (Recommended)</strong>
                      Approval by the operating surgeon removes the DRAFT watermark from printed dossiers.
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

import { useRef } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { mockPatients } from '@/data/mockPatients';
import {
  mockImagingStudies,
  mockSegmentationResults,
  mockMeasurements,
  mockSurgicalPlans,
} from '@/data/mockData';
import { usePatientStore } from '@/store/useAppStore';
import {
  Printer,
  Download,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Scissors,
  Layers,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const { selectedPatientId, setSelectedPatient } = usePatientStore();
  const currentPatientId = selectedPatientId || 'PT-001';
  const patient = mockPatients.find((p) => p.id === currentPatientId) || mockPatients[0];
  const imaging = mockImagingStudies[currentPatientId] || mockImagingStudies['PT-001'];
  const segData = mockSegmentationResults[currentPatientId] || mockSegmentationResults['PT-001'];
  const measurements = mockMeasurements[currentPatientId] || mockMeasurements['PT-001'];
  const plan = mockSurgicalPlans[currentPatientId] || mockSurgicalPlans['PT-001'];

  const reportRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.success('Clinical Dossier Exported', {
      description: `Report for ${patient.name} (${patient.id}) saved as PDF document.`,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clinical Surgical Dossier</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Validated Pre-Op Document
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Complete automated pre-operative plan for robotic-assisted Total Knee Arthroplasty
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

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Printable Report Paper Layout */}
        <div
          ref={reportRef}
          className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-md print:shadow-none print:border-none print:p-0"
        >
          {/* Institution Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl shadow-md">
                CA
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  CLINICAL ATLAS SURGICAL CENTER
                </h2>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Orthopaedic Robotics & AI Imaging Division
                </p>
                <p className="text-xs text-slate-400">ROSA Knee System Certified Facility</p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-mono font-bold text-slate-900 block text-sm">DOC-TKA-2026-089</span>
              <span className="text-slate-500">Report Date: {new Date().toISOString().split('T')[0]}</span>
              <div className="mt-1 flex items-center justify-end gap-1 font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                SURGICALLY CLEARED
              </div>
            </div>
          </div>

          {/* Patient Demographics Box */}
          <div className="mt-6 rounded-xl bg-slate-50 p-5 border border-slate-200/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-semibold text-[10px]">Patient Name</span>
                <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold text-[10px]">Patient ID / MRN</span>
                <span className="font-mono font-bold text-slate-900">{patient.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold text-[10px]">Age / Gender</span>
                <span className="font-medium text-slate-900">
                  {patient.age} yrs / {patient.gender}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-semibold text-[10px]">Operative Site</span>
                <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded inline-block">
                  {patient.kneeSide.toUpperCase()} KNEE TKA
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: CT Scan & AI Segmentation */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Activity className="h-4 w-4 text-blue-600" />
              1. Medical Imaging & AI Bone Segmentation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 block text-[11px]">CT Acquisition</span>
                <span className="font-semibold text-slate-800">Thin-slice Helical Protocol</span>
                <span className="text-slate-500 block mt-1">
                  {imaging?.sliceCount || 320} slices @ {imaging?.sliceThickness || 0.625} mm
                </span>
              </div>

              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 block text-[11px]">AI Model Architecture</span>
                <span className="font-semibold text-slate-800">3D Residual U-Net (v2.1.0)</span>
                <span className="text-emerald-600 font-semibold block mt-1">Mean Dice: 0.974 (97.4%)</span>
              </div>

              <div className="rounded-lg border border-slate-100 p-3 bg-slate-50/50">
                <span className="text-slate-400 block text-[11px]">Boundary Accuracy</span>
                <span className="font-semibold text-slate-800">ASSD: 0.38 mm</span>
                <span className="text-slate-500 block mt-1">HD95: 0.98 mm (Sub-millimeter)</span>
              </div>
            </div>

            {/* Bone Volume Summary Table */}
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden mt-3">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2.5">Structure</th>
                  <th className="p-2.5">Dice Coeff</th>
                  <th className="p-2.5">Surface Dist (ASSD)</th>
                  <th className="p-2.5">Volume (cm³)</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {segData?.bones.map((b) => (
                  <tr key={b.boneType} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-semibold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                      {b.boneType}
                    </td>
                    <td className="p-2.5 font-mono text-emerald-600 font-medium">{(b.dice * 100).toFixed(1)}%</td>
                    <td className="p-2.5 font-mono">{b.assd.toFixed(2)} mm</td>
                    <td className="p-2.5 font-mono">{b.volume} cm³</td>
                    <td className="p-2.5 text-emerald-700 font-semibold">Verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Anatomical Morphometry */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              2. Pre-Operative Anatomical Morphometry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block">Pre-Op HKA Angle</span>
                <span className="text-base font-bold text-slate-900">
                  {measurements?.hipKneeAnkleAngle || 178.2}° Varus
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block">Transepicondylar Axis</span>
                <span className="text-base font-bold text-slate-900">
                  {measurements?.transEpicondylarAxisLength || 78.4} mm
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block">Femoral AP / ML</span>
                <span className="text-base font-bold text-slate-900">
                  {measurements?.femoralDimensionAP || 64.2} / {measurements?.femoralDimensionML || 71.8} mm
                </span>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <span className="text-slate-400 block">Native Tibial Slope</span>
                <span className="text-base font-bold text-slate-900">{measurements?.tibialSlope || 3.5}°</span>
              </div>
            </div>
          </div>

          {/* Section 3: ROSA Surgical Plan */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-1.5">
              <Scissors className="h-4 w-4 text-blue-600" />
              3. ROSA Robotic Resection & Component Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Resection Thickness</h4>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Distal Femoral Cut:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {plan?.resection.distalFemoralResection || 9.0} mm
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Posterior Femoral Cut:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {plan?.resection.posteriorFemoralResection || 8.5} mm
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Proximal Tibial Cut:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {plan?.resection.tibialResection || 10.0} mm
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Target Tibial Slope:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {plan?.resection.tibialSlopeTarget || 3.0}°
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1">Implant & Alignment</h4>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Target Mechanical Axis:</span>
                  <span className="font-bold font-mono text-emerald-600">180.0° (Neutral)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Femoral Valgus Angle:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {plan?.alignment.femoralValgus || 5.0}°
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Prosthesis Type:</span>
                  <span className="font-bold text-slate-900">Cruciate Retaining (CR)</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Prosthesis Size:</span>
                  <span className="font-bold font-mono text-slate-900">{plan?.implantSize || 'Size 5'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature & Approval Block */}
          <div className="mt-12 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row justify-between gap-6">
            <div>
              <div className="h-10 border-b border-slate-400 w-48 mb-1 flex items-end">
                <span className="font-serif italic text-slate-700 text-sm font-semibold">Sarah Mitchell, MD</span>
              </div>
              <span className="text-xs font-bold text-slate-900 block">Dr. Sarah Mitchell, MD, FACS</span>
              <span className="text-[11px] text-slate-400">Chief of Orthopaedic Robotic Surgery</span>
              <span className="text-[10px] text-slate-400 block font-mono">License # MD-849204</span>
            </div>

            <div className="text-right sm:text-right">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                <Award className="h-4 w-4" />
                ROSA Navigation Verified & Locked
              </div>
              <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                Cryptographic Hash: 8f9b2a7...c14e9d
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

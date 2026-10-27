import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import AppLayout from '@/layouts/AppLayout';
import { usePatientStore } from '@/store/useAppStore';
import { getPatientById, getSegmentationResult, getImagingStudy } from '@/services/api';
import {
  User,
  CheckCircle2,
  Circle,
  Loader2,
  ScanLine,
  Brain,
  Box,
  Scissors,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';

function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Processing: 'bg-blue-50 text-blue-700 border-blue-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Reviewed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200',
    'Not Started': 'bg-slate-50 text-slate-500 border-slate-200',
    'Requires Review': 'bg-red-50 text-red-700 border-red-200',
    Failed: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}

const workflowSteps = [
  { key: 'imaging', label: 'Imaging', icon: ScanLine },
  { key: 'segmentation', label: 'Segmentation', icon: Brain },
  { key: 'reconstruction', label: 'Reconstruction', icon: Box },
  { key: 'planning', label: 'Planning', icon: Scissors },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

function getStepStatus(patient, step) {
  const map = {
    imaging: patient.imagingStatus,
    segmentation: patient.segmentationStatus,
    reconstruction: patient.reconstructionStatus,
    planning: patient.reconstructionStatus === 'Completed' ? 'Completed' : 'Pending',
    review: patient.reviewStatus === 'Approved' || patient.reviewStatus === 'Reviewed' ? 'Completed' : patient.reviewStatus === 'Pending Review' || patient.reviewStatus === 'Requires Review' ? 'Processing' : 'Pending',
  };
  const s = map[step];
  if (s === 'Completed' || s === 'Approved' || s === 'Reviewed') return 'completed';
  if (s === 'Processing' || s === 'Pending Review' || s === 'Requires Review') return 'processing';
  return 'pending';
}

export default function PatientDetails() {
  const [, params] = useRoute('/patients/:id');
  const patientId = params?.id || '';
  const { setSelectedPatient } = usePatientStore();
  const [patient, setPatient] = useState(null);
  const [segResult, setSegResult] = useState(null);
  const [imaging, setImaging] = useState(null);

  useEffect(() => {
    if (patientId) {
      setSelectedPatient(patientId);
      getPatientById(patientId).then((p) => setPatient(p || null));
      getSegmentationResult(patientId).then((s) => setSegResult(s || null));
      getImagingStudy(patientId).then((i) => setImaging(i || null));
    }
    return () => setSelectedPatient(null);
  }, [patientId, setSelectedPatient]);

  if (!patient) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-500">{patient.id}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">Age {patient.age}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500">{patient.kneeSide} Knee</span>
                <StatusBadge status={patient.reviewStatus} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/imaging?patient=${patient.id}`}>
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              View Imaging
            </button>
          </Link>
          <Link href={`/reconstruction?patient=${patient.id}`}>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              View 3D Model
            </button>
          </Link>
        </div>
      </div>

      {/* Live Patient Case Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 mb-6 text-xs text-blue-800">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-blue-900">Live Patient Case:</span>
        <span>Pre-Operative CT & Kinematic Alignment Protocol Synchronized in PostgreSQL Database</span>
      </div>

      {/* Workflow Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-6">Workflow Progress</h2>
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, idx) => {
            const status = getStepStatus(patient, step.key);
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    status === 'completed' ? 'bg-emerald-100' :
                    status === 'processing' ? 'bg-blue-100' :
                    'bg-slate-100'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : status === 'processing' ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${
                    status === 'completed' ? 'text-emerald-700' :
                    status === 'processing' ? 'text-blue-700' :
                    'text-slate-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Patient Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Patient Information</h2>
          <div className="space-y-3">
            {[
              { label: 'Patient ID', value: patient.id },
              { label: 'Age', value: `${patient.age} years` },
              { label: 'Sex', value: patient.gender },
              { label: 'Knee Side', value: patient.kneeSide },
              { label: 'Urgency', value: patient.urgency },
              { label: 'Imaging Date', value: patient.imagingDate },
              { label: 'Study ID', value: patient.studyId },
              { label: 'Last Updated', value: patient.lastUpdated },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className="text-sm font-medium text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>
          {patient.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">Notes</p>
              <p className="text-sm text-slate-700 mt-1">{patient.notes}</p>
            </div>
          )}
        </div>

        {/* Imaging Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <ScanLine className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Imaging Study</h2>
          </div>
          {imaging ? (
            <div className="space-y-3">
              {[
                { label: 'Study ID', value: imaging.id },
                { label: 'Modality', value: imaging.modality },
                { label: 'Description', value: imaging.description },
                { label: 'Slices', value: String(imaging.sliceCount) },
                { label: 'Slice Thickness', value: `${imaging.sliceThickness} mm` },
                { label: 'Pixel Spacing', value: `${imaging.pixelSpacing[0]} × ${imaging.pixelSpacing[1]} mm` },
                { label: 'Image Size', value: `${imaging.imageSize[0]} × ${imaging.imageSize[1]}` },
                { label: 'Status', value: imaging.status },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-medium text-slate-900 text-right max-w-[60%]">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No imaging study available.</p>
          )}
        </div>

        {/* Segmentation Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">AI Segmentation Summary</h2>
          </div>
          {segResult ? (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Model</span>
                <span className="font-medium text-slate-900">{segResult.modelName} {segResult.modelVersion}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={segResult.status} />
              </div>
              <div className="border-t border-slate-100 pt-3">
                {segResult.bones.map((bone) => (
                  <div key={bone.boneType} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: bone.color }} />
                      <span className="text-sm font-medium text-slate-700">{bone.boneType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Dice: <span className="font-semibold text-slate-700">{bone.dice.toFixed(3)}</span></span>
                      <span>ASSD: <span className="font-semibold text-slate-700">{bone.assd.toFixed(3)}</span></span>
                      <span>HD95: <span className="font-semibold text-slate-700">{bone.hd95.toFixed(3)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No segmentation results available.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

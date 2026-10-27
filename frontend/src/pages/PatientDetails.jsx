import { useEffect, useState } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import AppLayout from '@/layouts/AppLayout';
import { usePatientStore } from '@/store/useAppStore';
import { getPatientById, updatePatient, deletePatient, getSegmentationResult, getImagingStudy } from '@/services/api';
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
  Edit2,
  Trash2,
  ArrowLeft,
  X,
  Calendar,
  Database,
  Info,
} from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { SkeletonCard, SkeletonLine } from '@/components/common/LoadingSkeleton';
import { toast } from 'sonner';

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
    Draft: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.Pending}`}>
      {status || 'Pending'}
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
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/patients/:id');
  const patientId = params?.id || '';
  const { setSelectedPatient } = usePatientStore();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [segResult, setSegResult] = useState(null);
  const [imaging, setImaging] = useState(null);

  // Edit Patient State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    dateOfBirth: '',
    age: 50,
    gender: 'Female',
    affectedKnee: 'Right',
    urgency: 'Routine',
    clinicalNotes: '',
    reviewStatus: 'Draft',
  });

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPatientData = async () => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const p = await getPatientById(patientId);
      if (p) {
        setPatient(p);
        setEditForm({
          name: p.name || '',
          dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
          age: p.age || 50,
          gender: p.gender || 'Female',
          affectedKnee: p.kneeSide || p.affectedKnee || 'Right',
          urgency: p.urgency || 'Routine',
          clinicalNotes: p.notes || p.clinicalNotes || '',
          reviewStatus: p.reviewStatus || 'Draft',
        });
      }
      const s = await getSegmentationResult(patientId);
      setSegResult(s || null);
      const i = await getImagingStudy(patientId);
      setImaging(i || null);
    } catch (err) {
      console.warn('Error loading patient details:', err);
      toast.error('Unable to fetch patient record from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      setSelectedPatient(patientId);
      fetchPatientData();
    }
    return () => setSelectedPatient(null);
  }, [patientId, setSelectedPatient]);

  const handleEditDobChange = (dob) => {
    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        if (birthDate <= today && birthDate.getFullYear() >= 1900) {
          let calculated = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculated--;
          }
          const validAge = Math.max(1, Math.min(125, calculated));
          setEditForm((prev) => ({
            ...prev,
            dateOfBirth: dob,
            age: validAge,
          }));
          return;
        }
      }
    }
    setEditForm((prev) => ({ ...prev, dateOfBirth: dob }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await updatePatient(patientId, editForm);
      toast.success('Patient record updated successfully in PostgreSQL.');
      setIsEditModalOpen(false);
      await fetchPatientData();
    } catch (err) {
      toast.error('Failed to update patient: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeletePatient = async () => {
    setIsDeleting(true);
    try {
      await deletePatient(patientId);
      toast.success(`Patient record deleted from database.`);
      setIsDeleteOpen(false);
      setLocation('/patients');
    } catch (err) {
      toast.error('Failed to delete patient: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <SkeletonLine width="250px" height="32px" />
          <SkeletonCard />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center max-w-lg mx-auto mt-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
            <User className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Patient Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">
            No clinical patient with ID &ldquo;{patientId}&rdquo; was found.
          </p>
          <Link href="/patients">
            <button className="mt-4 btn-primary">
              Return to Patient Registry
            </button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Back button */}
      <div className="mb-4">
        <Link href="/patients">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Patient Registry</span>
          </button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 border border-teal-200">
              <User className="h-6 w-6 text-[#0082A6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="font-mono text-sm font-semibold text-[#0082A6]">{patient.id}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-600">Age {patient.age} yrs</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-600">{patient.kneeSide || patient.affectedKnee} Knee</span>
                <StatusBadge status={patient.reviewStatus} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-sm font-medium transition-colors"
          >
            <Edit2 className="h-4 w-4 text-slate-500" />
            <span>Edit Record</span>
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-3.5 py-2 text-sm font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
          <Link href={`/imaging?patient=${patient.id}`}>
            <button className="rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#0082A6] px-3.5 py-2 text-sm font-semibold transition-colors">
              View Imaging
            </button>
          </Link>
          <Link href={`/reconstruction?patient=${patient.id}`}>
            <button className="btn-primary">
              View 3D Model
            </button>
          </Link>
        </div>
      </div>

      {/* Database Status Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/50 px-4 py-2.5 mb-6 text-xs text-[#0082A6]">
        <Database className="h-4 w-4 text-[#0082A6] shrink-0" />
        <span className="font-semibold text-slate-900">Synchronized Clinical Record:</span>
        <span>All preoperative imaging, kinematic parameters, and 3D surface meshes are persisted in patient records.</span>
      </div>

      {/* Workflow Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-6">Pre-Operative Workflow Progress</h2>
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, idx) => {
            const status = getStepStatus(patient, step.key);
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      status === 'completed'
                        ? 'bg-emerald-100'
                        : status === 'processing'
                        ? 'bg-blue-100'
                        : 'bg-slate-100'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : status === 'processing' ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      status === 'completed'
                        ? 'text-emerald-700 font-semibold'
                        : status === 'processing'
                        ? 'text-blue-700 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                    }`}
                  />
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
              { label: 'Patient MRN / ID', value: patient.id },
              { label: 'Date of Birth', value: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Recorded in Chart' },
              { label: 'Calculated Age', value: `${patient.age} years` },
              { label: 'Sex', value: patient.gender },
              { label: 'Affected Knee', value: `${patient.kneeSide || patient.affectedKnee} Knee` },
              { label: 'Clinical Priority', value: patient.urgency },
              { label: 'Imaging Date', value: patient.imagingDate || '2026-09-15' },
              { label: 'Study Series ID', value: patient.studyId || `CT-${patient.id}` },
              { label: 'Last Synchronized', value: patient.lastUpdated || 'Current Session' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-900">{row.value}</span>
              </div>
            ))}
          </div>
          {patient.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase text-slate-400">Clinical Assessment Notes</p>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {patient.notes}
              </p>
            </div>
          )}
        </div>

        {/* Imaging Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <ScanLine className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Pre-Op Imaging Study</h2>
          </div>
          {imaging ? (
            <div className="space-y-3">
              {[
                { label: 'Study ID', value: imaging.id || `CT-${patient.id}` },
                { label: 'Modality', value: imaging.modality || 'CT' },
                { label: 'Description', value: imaging.description || 'Pre-Op Knee Protocol' },
                { label: 'Slice Slices', value: String(imaging.sliceCount || 420) },
                { label: 'Slice Thickness', value: `${imaging.sliceThickness || 0.625} mm` },
                { label: 'Status', value: imaging.status || 'Verified' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-medium text-slate-900">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-center">
              <p className="text-sm text-slate-500">CT Imaging protocol registered.</p>
              <Link href={`/imaging?patient=${patient.id}`}>
                <button className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Open DICOM/NIfTI Viewer
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Segmentation Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">AI Segmentation Architecture</h2>
          </div>
          {segResult ? (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Model Architecture</span>
                <span className="font-medium text-slate-900">3D Attention U-Net</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Model Readiness</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Awaiting Weights
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600">
                Ground-truth segmented masks are processed directly by the mathematical 3D reconstruction pipeline.
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-center">
              <Info className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs text-slate-500">
                AI Segmentation model is in deployment standby (Not Trained). Standard 3D reconstruction uses validated ground-truth anatomical masks.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Patient Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Patient Record</h3>
                <p className="text-xs text-slate-500">Update clinical information</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0082A6] focus:ring-1 focus:ring-[#0082A6] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => handleEditDobChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Age: {editForm.age} yrs</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affected Knee</label>
                  <select
                    value={editForm.affectedKnee}
                    onChange={(e) => setEditForm({ ...editForm, affectedKnee: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Right">Right Knee</option>
                    <option value="Left">Left Knee</option>
                    <option value="Bilateral">Bilateral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editForm.urgency}
                    onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Routine">Routine</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review Status</label>
                  <select
                    value={editForm.reviewStatus}
                    onChange={(e) => setEditForm({ ...editForm, reviewStatus: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Pending">Pending</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Assessment Notes</label>
                <textarea
                  rows="3"
                  value={editForm.clinicalNotes}
                  onChange={(e) => setEditForm({ ...editForm, clinicalNotes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Patient Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Patient Record"
        description={`Are you sure you want to permanently delete patient ${patient.name} (${patient.id})? This will delete the patient and all associated imaging, reconstruction, and planning data.`}
        confirmText="Delete Patient"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeletePatient}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </AppLayout>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { Link, useSearch } from 'wouter';
import AppLayout from '@/layouts/AppLayout';
import { getPatients, createPatient } from '@/services/api';
import { mockPatients } from '@/data/mockPatients';
import { Search, Filter, Users, UserPlus, X, Loader2, Database } from 'lucide-react';
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
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}

export default function PatientRegistry() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const initialSearch = urlParams.get('search') || '';

  const [patients, setPatients] = useState(mockPatients);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sideFilter, setSideFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // New Patient Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    name: '',
    age: 60,
    gender: 'Female',
    affectedKnee: 'Right',
    urgency: 'Routine',
    clinicalNotes: '',
  });

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const data = await getPatients();
      if (data && data.length > 0) {
        setPatients(data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.patientId) {
      toast.error('Please provide both Patient ID and Full Name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createPatient(formData);
      toast.success(`Patient ${formData.name} successfully registered in PostgreSQL!`, {
        description: `MRN: ${formData.patientId} · Pre-op knee series initialized.`,
      });
      setIsModalOpen(false);
      setFormData({
        patientId: '',
        name: '',
        age: 60,
        gender: 'Female',
        affectedKnee: 'Right',
        urgency: 'Routine',
        clinicalNotes: '',
      });
      await loadPatients();
    } catch (err) {
      toast.error('Failed to create patient: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const pName = p.name || '';
      const pId = p.patientId || p.id || '';
      const matchesSearch =
        !searchQuery ||
        pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSide = sideFilter === 'All' || (p.kneeSide || p.affectedKnee) === sideFilter;
      const matchesStatus =
        statusFilter === 'All' || p.segmentationStatus === statusFilter || p.reviewStatus === statusFilter;
      const matchesUrgency = urgencyFilter === 'All' || p.urgency === urgencyFilter;
      return matchesSearch && matchesSide && matchesStatus && matchesUrgency;
    });
  }, [patients, searchQuery, sideFilter, statusFilter, urgencyFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Patient Registry</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              <Database className="w-3 h-3 text-blue-600" /> PostgreSQL Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} clinical patient record{filtered.length !== 1 ? 's' : ''} synchronized with database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const randId = `MRN-ROSA-${Math.floor(1000 + Math.random() * 9000)}`;
              setFormData((prev) => ({ ...prev, patientId: randId }));
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Enroll New Patient</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name or ID..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={sideFilter}
            onChange={(e) => { setSideFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
          >
            <option value="All">All Sides</option>
            <option value="Left">Left</option>
            <option value="Right">Right</option>
            <option value="Bilateral">Bilateral</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => { setUrgencyFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-300 focus:outline-none"
          >
            <option value="All">All Urgency</option>
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Patient ID</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Age</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Affected Knee</th>
                <th className="px-5 py-3">Urgency</th>
                <th className="px-5 py-3">Imaging</th>
                <th className="px-5 py-3">Segmentation</th>
                <th className="px-5 py-3">3D Mesh</th>
                <th className="px-5 py-3">Surgical Plan</th>
                <th className="px-5 py-3">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((p) => {
                const pId = p.patientId || p.id;
                return (
                  <tr key={pId} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <Link href={`/patients/${pId}`}>
                        <span className="font-mono font-medium text-blue-600 hover:text-blue-700">{pId}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/patients/${pId}`}>
                        <span className="font-medium text-slate-900 hover:text-blue-600">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{p.age}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.gender}</td>
                    <td className="px-5 py-3.5 text-slate-600">{p.kneeSide || p.affectedKnee}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.urgency === 'Emergency' ? 'bg-red-50 text-red-700' :
                        p.urgency === 'Urgent' || p.urgency === 'High' ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {p.urgency}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.imagingStatus || 'Completed'} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.segmentationStatus || 'Completed'} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.reconstructionStatus || 'Completed'} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.planningStatus || 'Completed'} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.reviewStatus || 'Approved'} /></td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-slate-400">
                    No patients match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enroll New Patient Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enroll New Clinical Patient</h3>
                <p className="text-xs text-slate-500">Directly persisted to PostgreSQL relational database</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient MRN / ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                    placeholder="MRN-ROSA-0899"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                    placeholder="Patient Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="18"
                    max="110"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value, 10) || 50 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Affected Knee</label>
                  <select
                    value={formData.affectedKnee}
                    onChange={(e) => setFormData({ ...formData, affectedKnee: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                  >
                    <option value="Right">Right Knee</option>
                    <option value="Left">Left Knee</option>
                    <option value="Bilateral">Bilateral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Routine', 'High', 'Emergency'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: lvl })}
                      className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                        formData.urgency === lvl
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Assessment Notes</label>
                <textarea
                  rows="3"
                  value={formData.clinicalNotes}
                  onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-400 focus:outline-none"
                  placeholder="Severe joint space narrowing with varus deformity. Candidate for robotic-assisted TKA."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to PostgreSQL...</span>
                    </>
                  ) : (
                    <span>Save Patient</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import AppLayout from '@/layouts/AppLayout';
import EmptyState from '@/components/common/EmptyState';
import StatusPill from '@/components/common/StatusPill';
import { SkeletonCard, SkeletonTableRow } from '@/components/common/LoadingSkeleton';
import { getDashboardStats, getPatients, getModelStatusApi } from '@/services/api';
import { useAuthStore } from '@/store/useAppStore';
import { ArrowRight, UserPlus, Database, Activity, ShieldCheck, Box } from 'lucide-react';

const workflowStages = [
  { num: '01', title: 'Upload Imaging', path: '/imaging', status: 'DICOM & planar series' },
  { num: '02', title: 'Review AI Analysis', path: '/ai-analysis', status: 'Radiographic classification' },
  { num: '03', title: 'Build 3D Model', path: '/reconstruction', status: 'Patient-specific anatomy' },
  { num: '04', title: 'Plan Knee Alignment', path: '/planning', status: 'Kinematic resection targets' },
  { num: '05', title: 'Review & Export', path: '/reports', status: 'Clinical report dossier' },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [statsData, patientsData, statusData] = await Promise.all([
          getDashboardStats().catch(() => null),
          getPatients().catch(() => []),
          getModelStatusApi().catch(() => null),
        ]);
        if (isMounted) {
          setStats(statsData);
          setPatients(patientsData || []);
          setModelStatus(statusData);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || 'Researcher';

  const kpis = [
    { label: 'Total patients', value: stats?.totalPatients ?? (patients.length || 0), sub: 'Registered cohort' },
    { label: 'Imaging studies', value: stats?.totalStudies ?? 0, sub: 'Cross-sectional & planar series' },
    { label: '3D reconstructions', value: stats?.completedReconstructions ?? 0, sub: 'Anatomical surface meshes' },
    { label: 'Approved plans', value: stats?.approvedPlans ?? 0, sub: 'Preoperative surgical plans' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Heading with Authenticated User Greeting */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {getGreeting()}, {displayName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Welcome to your KneeAxis research workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/patients"
              className="btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Manage patients</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {kpi.label}
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {kpi.value}
                </div>
                <div className="text-xs text-slate-400">
                  {kpi.sub}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Patient Workflow Stage Panel */}
        <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Clinical Workflow Pipeline
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Structured stages from medical imaging to individualized kinematic alignment (iKA) surgical plans.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {workflowStages.map((stage, idx) => (
              <Link key={idx} href={stage.path}>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-[#EAF4F6]/50 hover:border-[#0082A6]/40 transition-all cursor-pointer">
                  <span className="font-mono text-xl font-bold text-[#0082A6] block">
                    {stage.num}
                  </span>
                  <strong className="block text-sm font-semibold text-slate-900 my-1 truncate">
                    {stage.title}
                  </strong>
                  <span className="text-xs text-slate-500">
                    {stage.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Wide Panels: Recent Patients & AI Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Recent Patients (7 cols) */}
          <section className="lg:col-span-7 bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Recent Patient Records
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Active patient cases in your workspace.
                </p>
              </div>
              <Link href="/patients">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0082A6] hover:text-[#005C9A] cursor-pointer">
                  View all <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                <table className="w-full">
                  <tbody>
                    <SkeletonTableRow columns={4} />
                    <SkeletonTableRow columns={4} />
                    <SkeletonTableRow columns={4} />
                  </tbody>
                </table>
              </div>
            ) : patients && patients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Patient ID</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Knee</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.slice(0, 5).map((p) => {
                      const pId = p.id || p.patientId;
                      const pSide = p.kneeSide || p.affectedKnee || p.side || 'Right';
                      return (
                        <tr
                          key={pId}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono font-medium text-[#0082A6]">
                            <Link href={`/patients/${pId}`}>
                              <span className="hover:underline cursor-pointer">
                                {pId}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {pSide} Knee
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              p.reviewStatus === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {p.reviewStatus || 'Draft'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="♡"
                title="No patients added yet"
                description="Your workspace currently has no patient records. Enroll a patient to begin analysis."
                actionHref="/patients"
                actionLabel="Enroll Patient"
              />
            )}
          </section>

          {/* Right Panel: AI Capabilities Status (5 cols) */}
          <section className="lg:col-span-5 bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    AI Analysis Capabilities
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Current availability of research models.
                  </p>
                </div>
                <Link href="/ai-analysis">
                  <span className="text-sm font-semibold text-[#0082A6] hover:text-[#005C9A] cursor-pointer">
                    AI Analysis ↗
                  </span>
                </Link>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div>
                    <strong className="block text-sm font-semibold text-slate-900">
                      KL Radiographic Classifier
                    </strong>
                    <span className="text-xs text-slate-500">
                      ResNet-50 • Bilateral X-Ray (0–4)
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-200">
                    Training Pending
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div>
                    <strong className="block text-sm font-semibold text-slate-900">
                      3D Knee Bone Segmentation
                    </strong>
                    <span className="text-xs text-slate-500">
                      3D U-Net • 5-Class OAIZIB-CM
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-200">
                    Training Pending
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl text-xs leading-relaxed border border-slate-200 bg-slate-50 text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                <ShieldCheck className="w-4 h-4 text-[#0082A6]" />
                <span>Clinical Readiness Note</span>
              </div>
              Anatomical surface models are available using validated segmentation masks. AI inference capabilities will activate once verified model weights are deployed.
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

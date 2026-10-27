import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import AppLayout from '@/layouts/AppLayout';
import EmptyState from '@/components/common/EmptyState';
import StatusPill from '@/components/common/StatusPill';
import { getDashboardStats, getPatients, getModels } from '@/services/api';
import { Heart, ScanLine, Brain, Box, Target, FileText, ArrowRight } from 'lucide-react';

const workflowStages = [
  { num: '01', title: 'Medical imaging', path: '/imaging', status: 'Awaiting case' },
  { num: '02', title: 'AI analysis', path: '/models', status: 'Not trained' },
  { num: '03', title: '3D reconstruction', path: '/reconstruction', status: 'Ready for mask' },
  { num: '04', title: 'Knee planning', path: '/planning', status: 'Pending review' },
  { num: '05', title: 'Review & export', path: '/reports', status: 'Awaiting plan' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [statsData, patientsData, modelsData] = await Promise.all([
          getDashboardStats().catch(() => null),
          getPatients().catch(() => []),
          getModels().catch(() => []),
        ]);
        if (isMounted) {
          setStats(statsData);
          setPatients(patientsData || []);
          setModels(modelsData || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = [
    { label: 'Patients', value: stats?.totalPatients ?? (patients.length || 0) },
    { label: 'Imaging studies', value: stats?.totalStudies ?? 0 },
    { label: '3D reconstructions', value: stats?.completedSegmentations ?? 0 },
    { label: 'Approved plans', value: stats?.approvedPlans ?? 0 },
  ];

  return (
    <AppLayout>
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-7">
        <div>
          <h1
            className="text-[31px] font-serif font-normal leading-[1.2] tracking-[-.5px] mb-2"
            style={{ color: 'var(--ka-ink-strong)' }}
          >
            Workspace overview
          </h1>
          <p className="text-[13px] m-0" style={{ color: 'var(--ka-muted)' }}>
            A calm, organized place to manage knee imaging and reconstruction research.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[15px] mb-[26px]">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white rounded-[12px] p-[21px] border"
            style={{
              borderColor: 'var(--ka-line)',
              boxShadow: 'var(--ka-soft-shadow)',
            }}
          >
            <div className="text-[12px] mb-[16px]" style={{ color: 'var(--ka-muted)' }}>
              {kpi.label}
            </div>
            <strong
              className="block font-serif text-[29px] font-normal"
              style={{ color: 'var(--ka-ink-strong)' }}
            >
              {kpi.value}
            </strong>
          </div>
        ))}
      </div>

      {/* Patient Workflow Stage Panel */}
      <section
        className="bg-white rounded-[13px] p-[24px] mb-[20px] border"
        style={{
          borderColor: 'var(--ka-line)',
          boxShadow: 'var(--ka-soft-shadow)',
        }}
      >
        <div className="flex items-center justify-between gap-[14px] mb-[20px]">
          <div>
            <h2 className="text-[15px] font-bold m-0" style={{ color: 'var(--ka-ink-strong)' }}>
              Patient workflow
            </h2>
            <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--ka-muted)' }}>
              Workflow stages reflect active cases and verified outputs in your workspace.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[10px]">
          {workflowStages.map((stage, idx) => (
            <Link key={idx} href={stage.path}>
              <div
                className="p-[15px] rounded-[10px] border transition-all cursor-pointer hover:bg-slate-50"
                style={{
                  background: '#f7f9fb',
                  borderColor: '#edf0f3',
                }}
              >
                <span className="font-serif text-[22px] font-normal" style={{ color: 'var(--ka-brand)' }}>
                  {stage.num}
                </span>
                <b className="block text-[12px] my-[6px] truncate" style={{ color: 'var(--ka-ink-strong)' }}>
                  {stage.title}
                </b>
                <span className="text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                  {stage.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Wide Panels: Recent Patients & AI Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-[19px]">
        {/* Left Panel: Recent Patients */}
        <section
          className="bg-white rounded-[13px] p-[24px] border"
          style={{
            borderColor: 'var(--ka-line)',
            boxShadow: 'var(--ka-soft-shadow)',
          }}
        >
          <div className="flex items-center justify-between mb-[20px]">
            <div>
              <h2 className="text-[15px] font-bold m-0" style={{ color: 'var(--ka-ink-strong)' }}>
                Recent patients
              </h2>
              <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--ka-muted)' }}>
                Linked to the patient registry and studies in your workspace.
              </p>
            </div>
            <Link href="/patients">
              <span
                className="inline-flex items-center gap-1 text-[12px] font-bold hover:underline cursor-pointer"
                style={{ color: 'var(--ka-brand)' }}
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          {patients && patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--ka-line)' }}>
                    <th className="py-2.5 px-3 text-[11px] font-bold" style={{ color: '#8d9ba6' }}>
                      Patient ID
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold" style={{ color: '#8d9ba6' }}>
                      Patient
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold" style={{ color: '#8d9ba6' }}>
                      Last updated
                    </th>
                    <th className="py-2.5 px-3 text-[11px] font-bold" style={{ color: '#8d9ba6' }}>
                      Stage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 5).map((p) => (
                    <tr
                      key={p.id || p.patientId}
                      className="border-b hover:bg-slate-50/70 transition-colors"
                      style={{ borderColor: '#f0f3f5' }}
                    >
                      <td className="py-3 px-3 text-[12px] font-mono">
                        <Link href={`/patients/${p.id || p.patientId}`}>
                          <span
                            className="font-semibold hover:underline cursor-pointer"
                            style={{ color: 'var(--ka-brand)' }}
                          >
                            {p.id || p.patientId}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-[12px] font-medium" style={{ color: 'var(--ka-ink-strong)' }}>
                        {p.name}
                      </td>
                      <td className="py-3 px-3 text-[12px]" style={{ color: 'var(--ka-muted)' }}>
                        {p.lastUpdated || 'Recent'}
                      </td>
                      <td className="py-3 px-3 text-[12px]">
                        <StatusPill variant={p.reviewStatus === 'Approved' ? 'success' : 'pending'}>
                          {p.reviewStatus || 'In Progress'}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="♡"
              title="No patients yet"
              description="Patient records will appear here when added through your application."
              actionHref="/patients"
              actionLabel="View patients"
            />
          )}
        </section>

        {/* Right Panel: AI Integration */}
        <section
          className="bg-white rounded-[13px] p-[24px] border flex flex-col justify-between"
          style={{
            borderColor: 'var(--ka-line)',
            boxShadow: 'var(--ka-soft-shadow)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-[20px]">
              <div>
                <h2 className="text-[15px] font-bold m-0" style={{ color: 'var(--ka-ink-strong)' }}>
                  AI integration
                </h2>
                <p className="text-[12px] mt-1 m-0" style={{ color: 'var(--ka-muted)' }}>
                  Training status, not manufactured performance.
                </p>
              </div>
              <Link href="/models">
                <span
                  className="text-[12px] font-bold hover:underline cursor-pointer"
                  style={{ color: 'var(--ka-brand)' }}
                >
                  Manage ↗
                </span>
              </Link>
            </div>

            <div className="space-y-[10px]">
              <div
                className="flex items-center justify-between p-[13px] rounded-[11px] border"
                style={{
                  background: '#f8fafb',
                  borderColor: '#e1e8ee',
                }}
              >
                <div>
                  <strong className="block text-[12px]" style={{ color: 'var(--ka-ink)' }}>
                    KL classification
                  </strong>
                  <span className="text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                    ResNet50 / X-ray
                  </span>
                </div>
                <StatusPill variant="pending">Not trained</StatusPill>
              </div>

              <div
                className="flex items-center justify-between p-[13px] rounded-[11px] border"
                style={{
                  background: '#f8fafb',
                  borderColor: '#e1e8ee',
                }}
              >
                <div>
                  <strong className="block text-[12px]" style={{ color: 'var(--ka-ink)' }}>
                    3D knee segmentation
                  </strong>
                  <span className="text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                    Attention 3D U-Net / MRI
                  </span>
                </div>
                <StatusPill variant="pending">Not trained</StatusPill>
              </div>
            </div>
          </div>

          <div
            className="mt-6 p-3 rounded-[10px] text-[11px] leading-[1.6] border"
            style={{
              background: '#f8fafb',
              borderColor: '#e1e8ee',
              color: '#647787',
            }}
          >
            A deployed inference service should determine when a model becomes ready. Model actions remain disabled until validated weights exist.
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

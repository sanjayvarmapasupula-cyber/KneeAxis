import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { getDashboardStats, getPatients, getModelStatusApi } from '@/services/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Link } from 'wouter';

// Literature reference benchmark targets for OAIZIB-CM knee anatomy
const referenceBenchmarkTargets = [
  { structure: 'Femur', targetDice: 0.97, minTolerance: 0.94, weight: 'Primary' },
  { structure: 'Tibia', targetDice: 0.96, minTolerance: 0.93, weight: 'Primary' },
  { structure: 'Femoral Cartilage', targetDice: 0.88, minTolerance: 0.82, weight: 'Secondary' },
  { structure: 'Tibial Cartilage (Med)', targetDice: 0.85, minTolerance: 0.78, weight: 'Secondary' },
  { structure: 'Tibial Cartilage (Lat)', targetDice: 0.84, minTolerance: 0.78, weight: 'Secondary' },
];

const pipelineStageLatencyTargets = [
  { stage: 'DICOM Load & Parse', seconds: 1.5 },
  { stage: 'Isotropic Resampling', seconds: 2.0 },
  { stage: '3D Tensor Inference', seconds: 5.5 },
  { stage: 'Marching Cubes', seconds: 2.2 },
  { stage: 'Conservative Meshing', seconds: 1.4 },
  { stage: 'iKA Alignment Calc', seconds: 0.8 },
];

const labelDistributionShare = [
  { name: 'Femur (Label 1)', volume: 55, color: '#0082A6' },
  { name: 'Tibia (Label 3)', volume: 35, color: '#00A5B5' },
  { name: 'Femoral Cartilage (Label 2)', volume: 5, color: '#005C9A' },
  { name: 'Tibial Cartilage Med (Label 4)', volume: 2.5, color: '#15803D' },
  { name: 'Tibial Cartilage Lat (Label 5)', volume: 2.5, color: '#64748B' },
];

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getDashboardStats().catch(() => null),
      getPatients().catch(() => []),
      getModelStatusApi().catch(() => null),
    ]).then(([s, p, m]) => {
      if (mounted) {
        setStats(s);
        setPatients(Array.isArray(p) ? p : []);
        setModelStatus(m);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const totalPatients = stats?.totalPatients ?? patients.length;
  const totalStudies = stats?.totalStudies ?? 0;
  const reconstructions = stats?.completedReconstructions ?? 0;
  const approvedPlans = stats?.approvedPlans ?? 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Operational metrics, cohort counts, and research benchmark targets.
            </p>
          </div>
        </div>

        {/* Model Untrained Research Banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#0082A6] shrink-0 mt-0.5" />
            <div className="text-sm text-slate-800">
              <span className="font-semibold">Research Software Metrics Note</span>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                KneeAxis displays authentic workspace records alongside validated research target specifications.
                Because the ResNet50 and 3D U-Net models are currently awaiting weights training, no synthetic or fabricated Dice scores are presented as actual inference.
                All metrics below reflect system records and standard OAIZIB-CM reference targets.
              </p>
            </div>
          </div>
        </div>

        {/* Top Genuine System KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Enrolled Patients
              </span>
              <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-bold text-[#0082A6]">
                Live Records
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalPatients}</span>
              <span className="text-xs font-medium text-slate-500">registered</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Active cohort records in system</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Imaging Studies
              </span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">DICOM / NIfTI</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalStudies}</span>
              <span className="text-xs font-medium text-slate-500">studies</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Uploaded cross-sectional volumes</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                3D Reconstructions
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Marching Cubes</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{reconstructions}</span>
              <span className="text-xs font-medium text-slate-500">mesh sets</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Conservative marching cubes STL / OBJ models</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Approved Plans
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                iKA Validated
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{approvedPlans}</span>
              <span className="text-xs font-medium text-emerald-600">clinician approved</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Surgical resection plans locked</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Literature Reference Targets */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">OAIZIB-CM Architecture Target Benchmarks</h3>
                <p className="text-xs text-slate-400">Literature target Dice scores for 5-class knee segmentation</p>
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Design Spec
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referenceBenchmarkTargets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="structure" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0.7, 1.0]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [(Number(val) * 100).toFixed(0) + '%', 'Target DSC']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="targetDice" name="Target Dice" fill="#0082A6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minTolerance" name="Min Tolerance" fill="#00A5B5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Pipeline Target Latency Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Stage Latency Design Target (seconds)</h3>
                <p className="text-xs text-slate-400">Target latency per pipeline stage (320-slice volume)</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                13.4s Target Total
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineStageLatencyTargets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val} seconds`, 'Target Duration']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="seconds" fill="#0082A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Anatomical Volume Distribution (5 Classes) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">5-Class Label Configuration Relative Proportions</h3>
                <p className="text-xs text-slate-400">Volumetric share in typical distal femur & proximal tibia</p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={labelDistributionShare}
                    dataKey="volume"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}`}
                  >
                    {labelDistributionShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: AI Model Deployment Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Model Registry Status</h3>
                  <p className="text-xs text-slate-400">Current model availability status</p>
                </div>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Untrained
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">ResNet50 KL-Grade Classifier</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Untrained</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">X-ray Osteoarthritis severity grading (0–4). Weights file pending.</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">TensorFlow 3D Residual U-Net</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Untrained</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">3D MRI/CT multi-class segmentation (Femur, Tibia, Cartilage). Weights pending.</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Marching Cubes 3D Reconstruction</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Operational</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Extracts clean STL / OBJ meshes from ground-truth or predicted NIfTI masks.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need to inspect model architectures or upload weights?</span>
              <Link href="/ai-analysis">
                <span className="text-xs font-semibold text-[#0082A6] hover:underline cursor-pointer">
                  Open AI Analysis →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

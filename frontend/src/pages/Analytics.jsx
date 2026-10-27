import { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
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
} from 'lucide-react';

const diceTrends = [
  { cohort: 'Q1 2025', femur: 0.962, tibia: 0.954, patella: 0.938, fibula: 0.925 },
  { cohort: 'Q2 2025', femur: 0.969, tibia: 0.961, patella: 0.945, fibula: 0.934 },
  { cohort: 'Q3 2025', femur: 0.975, tibia: 0.968, patella: 0.952, fibula: 0.941 },
  { cohort: 'Q4 2025', femur: 0.980, tibia: 0.974, patella: 0.958, fibula: 0.948 },
  { cohort: 'Q1 2026', femur: 0.984, tibia: 0.978, patella: 0.962, fibula: 0.951 },
];

const latencyBreakdown = [
  { stage: 'DICOM Load', seconds: 1.8 },
  { stage: 'Preprocessing', seconds: 2.3 },
  { stage: '3D U-Net GPU', seconds: 6.2 },
  { stage: 'Mesh Extract', seconds: 2.1 },
  { stage: 'Anatomy Match', seconds: 1.1 },
];

const boneVolumeShare = [
  { name: 'Femur', volume: 412.3, color: '#E8B960' },
  { name: 'Tibia', volume: 298.7, color: '#60A8E8' },
  { name: 'Fibula', volume: 45.2, color: '#D87878' },
  { name: 'Patella', volume: 28.4, color: '#78D89E' },
];

const alignmentDeviationData = [
  { deviation: '< 0.5°', count: 42 },
  { deviation: '0.5° - 1.0°', count: 28 },
  { deviation: '1.0° - 1.5°', count: 12 },
  { deviation: '1.5° - 2.0°', count: 4 },
  { deviation: '> 2.0°', count: 1 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('All Time');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI & Clinical Analytics</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                <TrendingUp className="h-3 w-3" />
                Performance Metrics
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Segmentation accuracy, model inference benchmarks, and robotic surgical outcome telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
              <option>All Time</option>
            </select>
          </div>
        </div>

        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mean Global Dice
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                +2.4% YoY
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">97.4%</span>
              <span className="text-xs font-medium text-slate-500">(0.974 DSC)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Across 87 clinical knee CT cohorts</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg Surface Distance
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">Sub-mm</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">0.38 mm</span>
              <span className="text-xs font-medium text-slate-500">ASSD</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Target tolerance &lt; 0.5 mm satisfied</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Pipeline Latency
              </span>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">Fast</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">13.5 s</span>
              <span className="text-xs font-medium text-slate-500">end-to-end</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">From raw DICOM to 3D surface mesh</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ROSA Target Adherence
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                Clinical Grade
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">98.8%</span>
              <span className="text-xs font-medium text-emerald-600">within ±1.5°</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Post-resection mechanical accuracy</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Dice Score Evolution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dice Similarity Coefficient (DSC) Progression</h3>
                <p className="text-xs text-slate-400">Continuous model iteration on 3D Residual U-Net</p>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Target: 0.95
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diceTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0.9, 1.0]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [(Number(val) * 100).toFixed(1) + '%', 'Dice']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="femur" name="Distal Femur" stroke="#E8B960" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="tibia" name="Proximal Tibia" stroke="#60A8E8" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="patella" name="Patella" stroke="#78D89E" strokeWidth={2} />
                  <Line type="monotone" dataKey="fibula" name="Fibula" stroke="#D87878" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Pipeline Processing Time */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pipeline Latency Breakdown (seconds)</h3>
                <p className="text-xs text-slate-400">Average execution duration per stage (320-slice CT)</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                13.5s Total
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val} seconds`, 'Duration']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="seconds" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Anatomical Volume Distribution */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Segmented Bone Volume Distribution</h3>
                <p className="text-xs text-slate-400">Relative volumetric proportions (cm³)</p>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={boneVolumeShare}
                    dataKey="volume"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name} (${entry.volume} cm³)`}
                  >
                    {boneVolumeShare.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Surgical Alignment Deviation */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">ROSA Robotic HKA Alignment Accuracy</h3>
                <p className="text-xs text-slate-400">Deviation from planned mechanical axis (degrees)</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                80% &lt; 1.0°
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alignmentDeviationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="deviation" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val) => [`${val} cases`, 'Patients']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { useAuthStore } from '@/store/useAppStore';
import {
  Settings as SettingsIcon,
  Cpu,
  Scissors,
  User,
  Database,
  Shield,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, login } = useAuthStore();

  // Settings state
  const [selectedRole, setSelectedRole] = useState(user?.role || 'surgeon');
  const [aiModel, setAiModel] = useState('3D Residual U-Net (v2.1.0)');
  const [inferenceDevice, setInferenceDevice] = useState('NVIDIA RTX 6000 Ada (24GB VRAM)');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [surfaceSmoothing, setSurfaceSmoothing] = useState('Laplacian (3 iterations)');
  const [defaultFemoralCut, setDefaultFemoralCut] = useState(9.0);
  const [defaultTibialCut, setDefaultTibialCut] = useState(10.0);
  const [defaultTibialSlope, setDefaultTibialSlope] = useState(3.0);
  const [defaultValgus, setDefaultValgus] = useState(5.0);
  const [pacsAet, setPacsAet] = useState('CLINICAL_ATLAS_ROSA');
  const [pacsHost, setPacsHost] = useState('pacs.hospital.internal:11112');
  const [rosaEndpoint, setRosaEndpoint] = useState('http://rosa-console-03.local:8080/v1');

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    login(user?.email || 'clinician@hospital.org', newRole);
    toast.success(`Active user switched to ${newRole.replace('_', ' ')}`);
  };

  const handleSaveSettings = () => {
    toast.success('System Settings Saved', {
      description: 'Configuration applied to AI segmentation & ROSA planning pipeline.',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">System & Pipeline Settings</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                <SettingsIcon className="h-3 w-3" />
                Configuration
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Manage AI deep-learning engine, ROSA robotic defaults, user profiles, and PACS integration
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>

        {/* Settings Sections Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* User Profile & Role Switcher */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">User Profile & Access Role</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Simulated User Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['surgeon', 'radiologist', 'robotic_technician'].map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`rounded-lg p-2 text-center capitalize font-semibold transition-all cursor-pointer border ${
                        selectedRole === role
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Clinician Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.name || 'Dr. Sarah Mitchell'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Email Address</label>
                <input
                  type="text"
                  disabled
                  value={user?.email || 's.mitchell@ortho-hospital.org'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 font-medium"
                />
              </div>
            </div>
          </div>

          {/* AI Segmentation Pipeline Settings */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Cpu className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">AI Segmentation Engine</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Model Architecture</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 font-medium"
                >
                  <option>3D Residual U-Net (v2.1.0) — Recommended</option>
                  <option>nnU-Net v2.4 (Self-configuring)</option>
                  <option>Swin UNETR v1.2 (Vision Transformer)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Inference Hardware Acceleration</label>
                <select
                  value={inferenceDevice}
                  onChange={(e) => setInferenceDevice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 font-medium"
                >
                  <option>NVIDIA RTX 6000 Ada (24GB VRAM) — Dedicated</option>
                  <option>NVIDIA A100 Tensor Core GPU (Cloud)</option>
                  <option>Local CPU Fallback (Multi-threaded OpenVINO)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Confidence Threshold</span>
                  <span className="font-mono font-bold text-slate-800">{Math.round(confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Mesh Surface Post-Processing</label>
                <select
                  value={surfaceSmoothing}
                  onChange={(e) => setSurfaceSmoothing(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 font-medium"
                >
                  <option>Laplacian (3 iterations) — Anatomical Standard</option>
                  <option>Taubin (Volume-preserving)</option>
                  <option>Raw Marching Cubes (No smoothing)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ROSA Robot Resection Planning Defaults */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Scissors className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Surgical Planning Defaults</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Distal Femoral Cut (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultFemoralCut}
                  onChange={(e) => setDefaultFemoralCut(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Proximal Tibial Cut (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultTibialCut}
                  onChange={(e) => setDefaultTibialCut(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Tibial Posterior Slope (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultTibialSlope}
                  onChange={(e) => setDefaultTibialSlope(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Femoral Valgus Angle (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultValgus}
                  onChange={(e) => setDefaultValgus(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-1 text-xs">ROSA Robotic Arm REST Endpoint</label>
              <input
                type="text"
                value={rosaEndpoint}
                onChange={(e) => setRosaEndpoint(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-700"
              />
            </div>
          </div>

          {/* PACS / DICOM Integration */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Hospital DICOM / PACS Gateway</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">DICOM Application Entity Title (AET)</label>
                <input
                  type="text"
                  value={pacsAet}
                  onChange={(e) => setPacsAet(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">PACS DICOM Store SCP Host:Port</label>
                <input
                  type="text"
                  value={pacsHost}
                  onChange={(e) => setPacsHost(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-800 font-medium"
                />
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-xs flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>PACS C-STORE & C-FIND handshake online with TLS 1.3 encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

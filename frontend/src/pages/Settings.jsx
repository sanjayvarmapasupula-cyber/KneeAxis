import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/AppLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { SkeletonLine } from '@/components/common/LoadingSkeleton';
import { useAuthStore } from '@/store/useAppStore';
import {
  getProfileApi,
  updateProfileApi,
  changePasswordApi,
  getSessionsApi,
  revokeSessionApi,
} from '@/services/api';
import {
  User,
  Shield,
  Laptop,
  CheckCircle,
  AlertTriangle,
  Clock,
  Key,
  Save,
  LogOut,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { user, setUser, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile Form State
  const [fullName, setFullName] = useState(user?.name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'researcher');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Active Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load user profile & sessions
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await getProfileApi();
        if (isMounted && res.success && res.data) {
          const u = res.data;
          setFullName(u.name || '');
          setEmail(u.email || '');
          setDepartment(u.department || '');
          setRole(u.role || 'researcher');
          setCreatedAt(u.createdAt || '');
          setLastLoginAt(u.lastLoginAt || '');
          setUser({
            ...user,
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department,
          });
        }
      } catch {
        // Fallback to local user
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await getSessionsApi();
      if (res.success && Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch {
      toast.error('Unable to retrieve active sessions.');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  // Handle Session Revoke
  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await revokeSessionApi(sessionId);
      if (res.success) {
        toast.success('Session revoked successfully');
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        toast.error(res.message || 'Could not revoke session');
      }
    } catch {
      toast.error('Network error revoking session.');
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const res = await updateProfileApi({
        fullName,
        department,
      });

      if (res.success) {
        setUser({ ...user, name: fullName, department });
        toast.success('Profile updated successfully');
      } else {
        toast.error(res.message || 'Failed to update profile.');
      }
    } catch {
      toast.error('Network error updating profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;
  const confirmMismatchError = confirmPassword && !passwordsMatch ? 'Passwords do not match.' : '';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changePasswordApi(currentPassword, newPassword);
      if (res.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Error updating password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Account & Security Settings
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-semibold text-[#0082A6]">
                <Shield className="w-3.5 h-3.5 text-[#0082A6]" /> Authenticated Session
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Manage your authenticated clinician profile, credentials, and active workspace sessions.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#0082A6] text-[#0082A6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'password'
                ? 'border-[#0082A6] text-[#0082A6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Change password</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 px-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'sessions'
                ? 'border-[#0082A6] text-[#0082A6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Active sessions</span>
          </button>
        </div>

        {/* TAB 1: Profile Details */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">User Identity</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Your account information and credentials.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-50 text-[#0082A6] border border-teal-200">
                {role} account
              </span>
            </div>

            {loadingProfile ? (
              <div className="space-y-4">
                <SkeletonLine height="40px" />
                <SkeletonLine height="40px" />
                <SkeletonLine height="40px" />
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-[#0082A6] focus:ring-1 focus:ring-[#0082A6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email address (Read-only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Organization / Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Orthopedic Surgery & Biomechanics Lab"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-2xs focus:border-[#0082A6] focus:ring-1 focus:ring-[#0082A6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 text-xs text-slate-600 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      Account Created: {createdAt ? new Date(createdAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>
                      Last Sign-in: {lastLoginAt ? new Date(lastLoginAt).toLocaleString() : 'This session'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Saving...' : 'Save changes'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Change Password */}
        {activeTab === 'password' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Update Credentials</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Change your workspace password. Passwords are saved with bcrypt hashing.
              </p>
            </div>

            {passwordError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200 flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              <PasswordInput
                id="current-password"
                name="currentPassword"
                label="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
              />

              <div>
                <PasswordInput
                  id="new-password"
                  name="newPassword"
                  label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 8 characters"
                  required
                />
                <PasswordStrength password={newPassword} />
              </div>

              <div>
                <PasswordInput
                  id="confirm-password"
                  name="confirmPassword"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  error={confirmMismatchError}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword || !passwordsMatch}
                  className="btn-primary"
                >
                  <Key className="w-4 h-4" />
                  <span>{isChangingPassword ? 'Updating...' : 'Update password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: Active Sessions */}
        {activeTab === 'sessions' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Authenticated Sessions</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Active login sessions stored and verifiable for your account.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSessions}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0082A6] hover:text-[#006e8c] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingSessions ? (
              <div className="space-y-3">
                <SkeletonLine height="50px" />
                <SkeletonLine height="50px" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-[#0082A6]">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm text-slate-900 font-semibold truncate max-w-[280px] sm:max-w-md">
                            {sess.userAgent}
                          </strong>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                              Current session
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>IP: {sess.ipAddress}</span>
                          <span>•</span>
                          <span>Last active: {new Date(sess.lastUsedAt || sess.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                No active sessions found.
              </p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

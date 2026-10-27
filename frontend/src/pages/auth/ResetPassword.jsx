import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { resetPasswordApi } from '@/services/api';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const [, setLocation] = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, []);

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const confirmError = confirmPassword && !passwordsMatch ? 'Passwords do not match.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!token) {
      setFormError('Reset token is missing. Please use the link sent to your email.');
      return;
    }

    if (!password || !confirmPassword) {
      setFormError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPasswordApi(token, password);
      if (res.success) {
        setSuccess(true);
        toast.success('Password updated successfully');
        setTimeout(() => {
          setLocation('/login');
        }, 2500);
      } else {
        setFormError(res.message || 'Invalid or expired password reset link.');
      }
    } catch {
      setFormError('Unable to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="w-full max-w-[440px] bg-white rounded-[18px] p-[38px] transition-all font-brand my-6"
        style={{
          border: '1px solid var(--ka-line, #E2E8F0)',
          boxShadow: '0 18px 55px rgba(20,40,54,.045)',
        }}
      >
        <div className="mb-5">
          <Link href="/">
            <img
              src="/kneeaxis-logo.png"
              alt="KneeAxis Medical Alignment"
              className="h-[36px] w-auto object-contain cursor-pointer"
            />
          </Link>
        </div>

        <h1
          className="text-[28px] font-bold tracking-tight mb-[6px]"
          style={{ color: '#0B1E2E' }}
        >
          Create new password
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          Enter a strong new password for your KneeAxis workspace.
        </p>

        {formError && (
          <div
            role="alert"
            className="p-3 mb-4 rounded-[8px] text-[12px] leading-[1.5]"
            style={{
              background: 'var(--ka-error-bg, #FFF5F5)',
              color: 'var(--ka-error, #DC2626)',
              border: '1px solid #FECACA',
            }}
          >
            {formError}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div
              className="p-4 rounded-[10px] text-[13px] leading-[1.6]"
              style={{
                background: 'var(--ka-brand-wash, #F0F9FF)',
                border: '1px solid #BAE6FD',
                color: 'var(--ka-brand-deep, #0369A1)',
              }}
            >
              <strong>Password Updated:</strong> Your credentials have been securely updated. Redirecting to sign in...
            </div>
            <Link
              href="/login"
              className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 cursor-pointer shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
              }}
            >
              Go to sign in now →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-[16px]">
            {!token && (
              <div>
                <label
                  htmlFor="reset-token-input"
                  className="block text-[12px] font-bold mb-[7px]"
                  style={{ color: '#0B1E2E' }}
                >
                  Reset Token
                </label>
                <input
                  id="reset-token-input"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste reset token here"
                  className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none font-mono"
                  style={{
                    borderColor: 'var(--ka-line, #E2E8F0)',
                    background: '#ffffff',
                    color: 'var(--ka-ink, #0B1E2E)',
                  }}
                />
              </div>
            )}

            <div>
              <PasswordInput
                id="new-password"
                name="password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
              />
              <PasswordStrength password={password} />
            </div>

            <div>
              <PasswordInput
                id="confirm-new-password"
                name="confirmPassword"
                label="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
                error={confirmError}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passwordsMatch || !token}
              className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
              }}
            >
              {isSubmitting ? 'Updating password...' : 'Update password →'}
            </button>
          </form>
        )}

        <div className="text-center text-[13px] mt-[22px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          <Link
            href="/login"
            className="font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            ← Return to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

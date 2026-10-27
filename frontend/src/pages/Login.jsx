import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/useAppStore';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login } = useAuthStore();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(email, password, rememberMe);
      if (res.success) {
        toast.success('Signed in successfully');
        setLocation('/dashboard');
      } else {
        setFormError(res.error || 'Invalid email or password.');
      }
    } catch {
      setFormError('An unexpected authentication error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="w-full max-w-[420px] bg-white rounded-[18px] p-[38px] transition-all font-brand"
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
          Welcome back
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          Sign in to access your KneeAxis research workspace.
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

        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <div>
            <label
              htmlFor="login-email"
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line, #E2E8F0)',
                background: '#ffffff',
                color: 'var(--ka-ink, #0B1E2E)',
              }}
            />
          </div>

          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <div className="flex items-center justify-between text-[12px] my-[14px]">
            <label className="flex items-center gap-2 cursor-pointer font-medium" style={{ color: 'var(--ka-muted, #64748B)' }}>
              <input
                type="checkbox"
                name="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded accent-[#0082A6]"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="font-bold hover:underline"
              style={{ color: '#0082A6' }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
            }}
          >
            {isSubmitting ? 'Signing in...' : 'Sign in →'}
          </button>
        </form>

        <div className="text-center text-[13px] mt-[22px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          New to KneeAxis?{' '}
          <Link
            href="/register"
            className="font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            Create an account
          </Link>
        </div>

        <div className="flex justify-center items-center gap-3 mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:underline">Terms of Use</Link>
          <span>•</span>
          <Link href="/medical-disclaimer" className="hover:underline">Medical Disclaimer</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

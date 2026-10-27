import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/useAppStore';
import AuthLayout from '@/layouts/AuthLayout';
import { toast } from 'sonner';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { register } = useAuthStore();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await register({
        fullName,
        email,
        password,
        role: 'researcher',
      });
      if (res.success) {
        toast.success('Account created successfully');
        setLocation('/dashboard');
      } else {
        setFormError(res.error || 'Registration failed. Please verify your details.');
      }
    } catch (err) {
      setFormError('An unexpected registration error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="w-full max-w-[420px] bg-white rounded-[18px] p-[38px] transition-all font-brand"
        style={{
          border: '1px solid var(--ka-line)',
          boxShadow: '0 18px 55px rgba(20,40,54,.045)',
        }}
      >
        <div className="mb-5">
          <img
            src="/kneeaxis-logo.png"
            alt="KneeAxis Medical Alignment"
            className="h-[36px] w-auto object-contain"
          />
        </div>

        <h1
          className="text-[28px] font-bold tracking-tight mb-[6px]"
          style={{ color: '#0B1E2E' }}
        >
          Create an account
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted)' }}>
          Request access to your KneeAxis workspace.
        </p>

        {formError && (
          <div
            className="p-3 mb-4 rounded-[8px] text-[12px] leading-[1.5]"
            style={{
              background: 'var(--ka-error-bg)',
              color: 'var(--ka-error)',
              border: '1px solid #f5c2c7',
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <label className="block">
            <span
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Full name
            </span>
            <input
              type="text"
              required
              name="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="Full name"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line)',
                background: '#ffffff',
                color: 'var(--ka-ink)',
              }}
            />
          </label>

          <label className="block">
            <span
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Email address
            </span>
            <input
              type="email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line)',
                background: '#ffffff',
                color: 'var(--ka-ink)',
              }}
            />
          </label>

          <label className="block">
            <span
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Password
            </span>
            <input
              type="password"
              required
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Create a secure password"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line)',
                background: '#ffffff',
                color: 'var(--ka-ink)',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
            }}
          >
            {isSubmitting ? 'Creating account...' : 'Request access →'}
          </button>
        </form>

        <div className="text-center text-[13px] mt-[22px]" style={{ color: 'var(--ka-muted)' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

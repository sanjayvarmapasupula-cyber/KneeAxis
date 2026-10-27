import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthStore } from '@/store/useAppStore';
import AuthLayout from '@/layouts/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import { toast } from 'sonner';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { register } = useAuthStore();
  const [, setLocation] = useLocation();

  // Real-time confirm password check
  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const confirmPasswordError = confirmPassword && !passwordsMatch ? 'Passwords do not match.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName || !email || !password || !confirmPassword) {
      setFormError('Please fill in all required fields.');
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

    if (!agreeTerms) {
      setFormError('You must agree to the Terms of Use and Privacy Policy to create an account.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        fullName,
        email,
        password,
        department: department || 'Orthopedic Surgery & Research',
        role: 'researcher', // default safe role
      });

      if (res.success) {
        toast.success('Account created successfully');
        setLocation('/dashboard');
      } else {
        setFormError(res.error || 'Registration failed. Please check your details.');
      }
    } catch {
      setFormError('An unexpected registration error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="w-full max-w-[460px] bg-white rounded-[18px] p-[38px] transition-all font-brand my-6"
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
          Create an account
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          Register for access to your KneeAxis research workspace.
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
              htmlFor="register-name"
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="register-name"
              type="text"
              required
              name="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              placeholder="e.g. Dr. Eleanor Vance"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line, #E2E8F0)',
                background: '#ffffff',
                color: 'var(--ka-ink, #0B1E2E)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              id="register-email"
              type="email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@hospital.org"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line, #E2E8F0)',
                background: '#ffffff',
                color: 'var(--ka-ink, #0B1E2E)',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="register-dept"
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Organization / Department
            </label>
            <input
              id="register-dept"
              type="text"
              name="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Orthopedic Surgery & Biomechanics"
              className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
              style={{
                borderColor: 'var(--ka-line, #E2E8F0)',
                background: '#ffffff',
                color: 'var(--ka-ink, #0B1E2E)',
              }}
            />
          </div>

          <div>
            <PasswordInput
              id="register-password"
              name="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              autoComplete="new-password"
              required
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <PasswordInput
              id="register-confirm-password"
              name="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              error={confirmPasswordError}
            />
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-[12px] leading-relaxed" style={{ color: 'var(--ka-muted, #64748B)' }}>
              <input
                type="checkbox"
                required
                name="terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded accent-[#0082A6]"
              />
              <span>
                I agree to the{' '}
                <Link href="/terms" className="font-semibold underline hover:text-[#0082A6]">
                  Terms of Use
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-semibold underline hover:text-[#0082A6]">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !passwordsMatch}
            className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
            }}
          >
            {isSubmitting ? 'Creating account...' : 'Create account →'}
          </button>
        </form>

        <div className="text-center text-[13px] mt-[22px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            Sign in
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

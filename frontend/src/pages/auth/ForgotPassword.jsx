import { useState } from 'react';
import { Link } from 'wouter';
import AuthLayout from '@/layouts/AuthLayout';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
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
          Reset password
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted)' }}>
          Self-service password reset is currently unavailable in this research release.
        </p>

        <div
          className="p-4 rounded-[10px] text-[13px] leading-[1.6] mb-6"
          style={{
            background: 'var(--ka-warning-bg)',
            border: '1px solid #ecd9b3',
            color: 'var(--ka-warning)',
          }}
        >
          <strong>Notice:</strong> Automated email delivery and password reset tokens have not been configured for this deployment. Please contact your system or research administrator directly to reset workspace credentials.
        </div>

        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <label className="block">
            <span
              className="block text-[12px] font-bold mb-[7px]"
              style={{ color: '#0B1E2E' }}
            >
              Registered email address
            </span>
            <input
              type="email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
            className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 cursor-pointer shadow-xs"
            style={{
              background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
            }}
          >
            Submit inquiry →
          </button>
        </form>

        {submitted && (
          <p
            className="text-[12px] leading-[1.5] mt-4 p-3 rounded-[8px]"
            style={{
              background: 'var(--ka-brand-wash)',
              color: 'var(--ka-brand-deep)',
            }}
          >
            Inquiry logged. Since automated SMTP is not connected, please alert your team lead or administrator to process your reset.
          </p>
        )}

        <div className="text-center text-[13px] mt-[22px]" style={{ color: 'var(--ka-muted)' }}>
          <Link
            href="/login"
            className="font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

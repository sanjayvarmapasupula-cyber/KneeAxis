import { useState } from 'react';
import { Link } from 'wouter';
import AuthLayout from '@/layouts/AuthLayout';
import { forgotPasswordApi } from '@/services/api';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await forgotPasswordApi(email);
      if (res.success) {
        setSubmitted(true);
        toast.success('Password reset instructions sent.');
      } else {
        setError(res.message || 'Unable to process request.');
      }
    } catch {
      setError('Unable to connect to the reset service. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div
        className="w-full max-w-[420px] bg-white rounded-[18px] p-[38px] transition-all font-brand my-6"
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
          Reset password
        </h1>
        <p className="text-[13px] mb-[25px]" style={{ color: 'var(--ka-muted, #64748B)' }}>
          Enter your registered email address to receive password recovery instructions.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 mb-4 rounded-[8px] text-[12px] leading-[1.5]"
            style={{
              background: 'var(--ka-error-bg, #FFF5F5)',
              color: 'var(--ka-error, #DC2626)',
              border: '1px solid #FECACA',
            }}
          >
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-4">
            <div
              className="p-4 rounded-[10px] text-[13px] leading-[1.6]"
              style={{
                background: 'var(--ka-brand-wash, #F0F9FF)',
                border: '1px solid #BAE6FD',
                color: 'var(--ka-brand-deep, #0369A1)',
              }}
            >
              <strong>Request Received:</strong> If an account with that email address exists in the KneeAxis system, password reset instructions have been logged. In development mode, check your server console for the direct reset link.
            </div>

            <Link
              href="/login"
              className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 cursor-pointer shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
              }}
            >
              Return to sign in →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-[16px]">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-[12px] font-bold mb-[7px]"
                style={{ color: '#0B1E2E' }}
              >
                Registered email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full min-h-[44px] rounded-[10px] px-[14px] py-[10px] text-[14px] border outline-none transition-colors"
                style={{
                  borderColor: 'var(--ka-line, #E2E8F0)',
                  background: '#ffffff',
                  color: 'var(--ka-ink, #0B1E2E)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center items-center py-[11px] px-[17px] min-h-[42px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:opacity-95 disabled:opacity-60 cursor-pointer shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
              }}
            >
              {isSubmitting ? 'Sending request...' : 'Send reset link →'}
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

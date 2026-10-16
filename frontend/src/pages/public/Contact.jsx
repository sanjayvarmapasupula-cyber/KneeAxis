import { useState } from 'react';
import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      <PageHero
        eyebrow="CONTACT"
        title="Get in touch."
        lead="Use this page for project inquiries, technical questions and collaboration requests. Contact details must be configured by the project owner."
      />
      <section className="py-[78px]">
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[22px]">
            <article
              className="bg-white rounded-[14px] p-[32px]"
              style={{
                border: '1px solid var(--ka-line)',
                boxShadow: 'var(--ka-soft-shadow)',
              }}
            >
              <h3
                className="text-[19px] font-semibold mb-[18px]"
                style={{ color: 'var(--ka-ink-strong)' }}
              >
                Send a message
              </h3>
              <form onSubmit={handleSubmit} className="space-y-[16px]">
                <label className="block">
                  <span
                    className="block text-[12px] font-semibold mb-[7px]"
                    style={{ color: 'var(--ka-ink)' }}
                  >
                    Your name
                  </span>
                  <input
                    required
                    name="name"
                    placeholder="Full name"
                    className="w-full min-h-[44px] rounded-[9px] px-[13px] py-[10px] text-[14px] border outline-none transition-colors"
                    style={{
                      borderColor: 'var(--ka-line)',
                      background: '#ffffff',
                      color: 'var(--ka-ink)',
                    }}
                  />
                </label>

                <label className="block">
                  <span
                    className="block text-[12px] font-semibold mb-[7px]"
                    style={{ color: 'var(--ka-ink)' }}
                  >
                    Email address
                  </span>
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] rounded-[9px] px-[13px] py-[10px] text-[14px] border outline-none transition-colors"
                    style={{
                      borderColor: 'var(--ka-line)',
                      background: '#ffffff',
                      color: 'var(--ka-ink)',
                    }}
                  />
                </label>

                <label className="block">
                  <span
                    className="block text-[12px] font-semibold mb-[7px]"
                    style={{ color: 'var(--ka-ink)' }}
                  >
                    Message
                  </span>
                  <textarea
                    required
                    name="message"
                    placeholder="How can we help?"
                    rows={4}
                    className="w-full rounded-[9px] px-[13px] py-[10px] text-[14px] border outline-none transition-colors resize-y"
                    style={{
                      borderColor: 'var(--ka-line)',
                      background: '#ffffff',
                      color: 'var(--ka-ink)',
                    }}
                  />
                </label>

                <button
                  type="submit"
                  className="inline-flex justify-center items-center py-[11px] px-[20px] rounded-[9px] text-[13px] font-bold text-white transition-all hover:opacity-95"
                  style={{ background: 'var(--ka-brand)' }}
                >
                  Send message
                </button>

                {submitted && (
                  <p
                    className="text-[12px] leading-[1.5] mt-[12px] p-3 rounded-[8px]"
                    style={{
                      background: 'var(--ka-brand-wash)',
                      color: 'var(--ka-brand-deep)',
                    }}
                    aria-live="polite"
                  >
                    Thank you. In production, submissions route to a verified contact endpoint. This research prototype has recorded your inquiry.
                  </p>
                )}
              </form>
            </article>

            <article
              className="bg-white rounded-[14px] p-[32px] flex flex-col justify-between"
              style={{
                border: '1px solid var(--ka-line)',
                boxShadow: 'var(--ka-soft-shadow)',
              }}
            >
              <div>
                <h3
                  className="text-[19px] font-semibold mb-[18px]"
                  style={{ color: 'var(--ka-ink-strong)' }}
                >
                  Project contact
                </h3>
                <p className="text-[14px] leading-[1.8]" style={{ color: 'var(--ka-muted)' }}>
                  <strong style={{ color: 'var(--ka-ink)' }}>Email:</strong>{' '}
                  <span className="font-mono text-[13px]">[Configure your official contact email]</span>
                </p>
                <p className="text-[14px] leading-[1.8] mt-2" style={{ color: 'var(--ka-muted)' }}>
                  <strong style={{ color: 'var(--ka-ink)' }}>Organization:</strong>{' '}
                  <span>[College/team or legal entity]</span>
                </p>
              </div>

              <div
                className="mt-6 p-4 rounded-[10px] text-[12px] leading-[1.6]"
                style={{
                  background: 'var(--ka-surface-alt)',
                  color: 'var(--ka-muted)',
                  border: '1px solid var(--ka-line)',
                }}
              >
                In the integrated application, route submissions to a real contact endpoint with spam protection, validation and privacy-aware retention.
              </div>
            </article>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

export default function TermsOfUse() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="LEGAL"
        title="Terms of use"
        lead="The conditions under which authorized users may access the KneeAxis research platform."
      />
      <section className="py-[50px] pb-[85px]">
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <article
            className="max-w-[800px] mx-auto bg-white rounded-[16px] p-[36px] sm:p-[42px]"
            style={{
              border: '1px solid var(--ka-line)',
              boxShadow: 'var(--ka-soft-shadow)',
            }}
          >
            {/* Legal warning banner */}
            <div
              className="p-[14px] sm:p-[18px] rounded-[10px] text-[12px] leading-[1.6] mb-[24px]"
              style={{
                background: '#fff8ea',
                border: '1px solid #ecd9b3',
                color: '#806631',
              }}
            >
              <strong>Draft legal content — not ready to publish.</strong> Replace bracketed details and review with an appropriate legal/privacy professional before release. Do not claim specific protections, compliance, or services unless actually implemented.
            </div>

            <div className="text-[13px] mb-6" style={{ color: 'var(--ka-muted)' }}>
              <strong>Effective date:</strong> [DATE] · <strong>Operator:</strong> [LEGAL ENTITY]
            </div>

            <div className="space-y-6 text-[14px] leading-[1.85]" style={{ color: '#536578' }}>
              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  1. Scope of the service
                </h2>
                <p>
                  KneeAxis is a research-stage software platform for managing knee imaging, anatomy reconstruction and preoperative planning concepts. The service is not represented as a certified medical device.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  2. Authorized access
                </h2>
                <p>
                  Access may be limited to approved students, researchers and clinicians. Define account eligibility, organizational access, role permissions and account management responsibilities.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  3. Acceptable use
                </h2>
                <p>
                  Users must provide only data they are authorized to use, respect patient confidentiality, avoid uploading malicious files and not attempt unauthorized access to other accounts or records.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  4. Clinical limitations
                </h2>
                <p>
                  Do not use research outputs for diagnosis, treatment decisions or autonomous surgical control. Qualified professional evaluation and relevant approvals would be required for clinical deployment.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  5. Availability and changes
                </h2>
                <p>
                  Explain realistic service availability, maintenance windows, backups and changes to research features. Do not promise uptime guarantees unless provided.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  6. Intellectual property and uploaded content
                </h2>
                <p>
                  Identify who owns the platform code, training models, uploaded data and derived outputs, and describe any applicable dataset licenses or research agreements.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  7. Account suspension and termination
                </h2>
                <p>
                  Document valid reasons and procedures for restricting access, as well as handling and retention of information after termination.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  8. Liability and applicable law
                </h2>
                <p>
                  Have authorized legal counsel draft appropriate provisions based on the actual institution and jurisdiction. Do not invent enforceable guarantees, jurisdictions or waivers.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  9. Contact
                </h2>
                <p>
                  Questions regarding these terms: [CONTACT EMAIL].
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
}

import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

export default function PrivacyPolicy() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="LEGAL"
        title="Privacy policy"
        lead="How personal information and medical imaging data may be collected, processed, stored and protected."
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
              <strong>Effective date:</strong> [DATE] · <strong>Operator:</strong> [LEGAL ENTITY / COLLEGE] · <strong>Contact:</strong> [PRIVACY EMAIL]
            </div>

            <div className="space-y-6 text-[14px] leading-[1.85]" style={{ color: '#536578' }}>
              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  1. Who operates KneeAxis
                </h2>
                <p>
                  KneeAxis is operated by [ORGANIZATION]. This policy describes the service as it is actually deployed. Confirm whether it is used solely for academic research or in any broader setting.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  2. Information we collect
                </h2>
                <p>
                  Depending on the enabled features, information may include account details, authentication records, patient records entered by authorized users, uploaded radiographs, DICOM/NIfTI volumes, derived segmentations and 3D meshes, usage/security logs and communications sent through the contact page.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  3. Why we process information
                </h2>
                <p>
                  Potential purposes include account administration, maintaining study records, running authorized research workflows, generating requested analysis/reconstruction outputs, service reliability, security and responding to inquiries. Document the specific legal bases or permissions relevant to the real deployment.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  4. Medical and sensitive information
                </h2>
                <p>
                  Medical imaging and patient records are sensitive. Identify who may upload data, how authorization is obtained, whether de-identification is required, and how access is controlled. Do not upload identifiable clinical data into a research environment without the necessary approvals.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  5. Storage, security and access
                </h2>
                <p>
                  Describe the actual hosting location, access controls, encryption practices if implemented, backup approach, staff permissions and incident response processes. Do not state that a protection exists unless it has been configured and tested.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  6. Sharing and service providers
                </h2>
                <p>
                  List any infrastructure, storage, analytics, email or processing providers receiving information. Specify whether third-party AI services or external model APIs are used; do not make assumptions.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  7. Retention and deletion
                </h2>
                <p>
                  State real retention periods for account data, uploaded images, outputs, audit records and backups. Explain when and how deletion requests are reviewed and fulfilled, subject to applicable research or legal obligations.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  8. Individual rights and requests
                </h2>
                <p>
                  Describe applicable rights, including access, correction, withdrawal of consent where relevant, and deletion requests where permitted. Include a working contact method and response procedure.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  9. Cookies and tracking
                </h2>
                <p>
                  Disclose essential session cookies and any optional analytics or tracking tools only if actually used. Provide consent controls where required. Do not display a deceptive cookie banner.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  10. International transfers, children and changes
                </h2>
                <p>
                  Clarify whether information is transferred between countries, who may use the service, age restrictions, and how policy changes are communicated.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  11. Contact
                </h2>
                <p>
                  Privacy questions: [PRIVACY CONTACT ADDRESS]. This draft must be completed before real-world publication.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
}

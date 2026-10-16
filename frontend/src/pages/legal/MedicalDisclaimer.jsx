import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

export default function MedicalDisclaimer() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="IMPORTANT INFORMATION"
        title="Medical disclaimer"
        lead="KneeAxis is currently a research and educational software project, not a clinical decision-making tool."
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
            <div className="space-y-6 text-[14px] leading-[1.85]" style={{ color: '#536578' }}>
              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  Research-stage use
                </h2>
                <p>
                  The application is designed to explore knee imaging workflows, segmentation, 3D mesh reconstruction and preoperative planning concepts. It is not presented as approved, clinically validated or suitable for patient care.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  AI models under development
                </h2>
                <p>
                  KL classification and 3D segmentation models have not yet been trained and deployed as part of the current system. Predictions, accuracy claims or clinical performance figures must not be shown until generated and validated.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  3D meshes and planning
                </h2>
                <p>
                  Reconstructed meshes depend on input image quality, segmentation accuracy, spatial metadata and mesh-processing settings. Visual plausibility alone does not establish anatomical or surgical accuracy.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  Human review and oversight
                </h2>
                <p>
                  All future measurement or planning functionality must be independently reviewed and validated by qualified professionals before any clinical use. KneeAxis does not perform or control surgery.
                </p>
              </div>

              <div>
                <h2 className="text-[18px] font-semibold mb-2" style={{ color: 'var(--ka-ink-strong)' }}>
                  Emergency and medical advice
                </h2>
                <p>
                  Do not use this research application to seek emergency care, diagnosis or treatment advice. Contact an appropriate qualified healthcare professional for medical concerns.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </PublicLayout>
  );
}

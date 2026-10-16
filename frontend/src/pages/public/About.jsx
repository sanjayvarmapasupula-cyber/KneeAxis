import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

export default function About() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="ABOUT KNEEAXIS"
        title="Designed around clarity and responsible development."
        lead="KneeAxis is an academic research software project exploring patient-specific knee reconstruction and preoperative planning."
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
                className="text-[19px] font-semibold mb-[12px]"
                style={{ color: 'var(--ka-ink-strong)' }}
              >
                Why KneeAxis?
              </h3>
              <p
                className="text-[14px] leading-[1.8] m-0"
                style={{ color: 'var(--ka-muted)' }}
              >
                KneeAxis refers to the anatomical and mechanical axes central to knee geometry and arthroplasty alignment. The platform aims to make the pathway from imaging to 3D anatomy structured, traceable, and reviewable by clinical and engineering teams alike.
              </p>
            </article>

            <article
              className="bg-white rounded-[14px] p-[32px]"
              style={{
                border: '1px solid var(--ka-line)',
                boxShadow: 'var(--ka-soft-shadow)',
              }}
            >
              <h3
                className="text-[19px] font-semibold mb-[12px]"
                style={{ color: 'var(--ka-ink-strong)' }}
              >
                What the project is not
              </h3>
              <p
                className="text-[14px] leading-[1.8] m-0"
                style={{ color: 'var(--ka-muted)' }}
              >
                It is not an autonomous surgical system, not a medical device approved for clinical deployment, and not a substitute for qualified clinician judgment. AI models are pending training, verification, and ethical approval.
              </p>
            </article>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

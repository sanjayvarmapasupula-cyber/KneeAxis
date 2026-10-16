import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';

const steps = [
  {
    num: '01',
    title: 'Patient registration and study upload',
    description: 'Connect to real saved records and outputs in the existing backend.',
  },
  {
    num: '02',
    title: 'Medical imaging and metadata review',
    description: 'Inspect radiographs, DICOM/NIfTI series, and verified clinical metadata.',
  },
  {
    num: '03',
    title: 'AI classification and segmentation (future model integration)',
    description: 'Not trained. Only enable after validated models are integrated and verified.',
  },
  {
    num: '04',
    title: '3D reconstruction from a real segmentation mask',
    description: 'Can be developed and tested using existing ground-truth NIfTI masks.',
  },
  {
    num: '05',
    title: 'Alignment and iKA research planning',
    description: 'Connect to real saved anatomical landmark records and reviewable outputs.',
  },
  {
    num: '06',
    title: 'Review, audit and export',
    description: 'Verify, record and export auditable surgical planning reports.',
  },
];

export default function Workflow() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="WORKFLOW"
        title="One patient. One connected journey."
        lead="Understand exactly where patient data and processing results belong without hiding unfinished features."
      />
      <section className="py-[78px]">
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="space-y-[14px]">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="bg-white rounded-[14px] p-[26px] flex items-center gap-[21px] transition-all"
                style={{
                  border: '1px solid var(--ka-line)',
                  boxShadow: 'var(--ka-soft-shadow)',
                }}
              >
                <span
                  className="text-[26px] font-serif font-normal shrink-0"
                  style={{ color: 'var(--ka-brand)' }}
                >
                  {s.num}
                </span>
                <div>
                  <h3
                    className="text-[16px] font-semibold m-0"
                    style={{ color: 'var(--ka-ink-strong)' }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-[13px] leading-[1.7] mt-[5px] mb-0"
                    style={{ color: 'var(--ka-muted)' }}
                  >
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

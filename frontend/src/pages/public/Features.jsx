import PublicLayout from '@/layouts/PublicLayout';
import PageHero from '@/components/common/PageHero';
import { Users, FileText, Cpu, Box, Target, BarChart2 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Patient workspace',
    description: 'Patient records, linked imaging and workflow state without fabricated demo cases.',
  },
  {
    icon: FileText,
    title: 'Imaging library',
    description: 'Study uploads, metadata and traceable file organization.',
  },
  {
    icon: Cpu,
    title: 'AI integration',
    description: 'Model status checks, future KL grading, explainability and 3D segmentation.',
  },
  {
    icon: Box,
    title: '3D reconstruction',
    description: 'Segmentation NIfTI to physical-coordinate mesh, surface smoothing and QA.',
  },
  {
    icon: Target,
    title: 'Alignment planning',
    description: 'A dedicated place for landmark and iKA calculations when validated.',
  },
  {
    icon: BarChart2,
    title: 'Audit and reports',
    description: 'Consistent review and export states using real stored artifacts.',
  },
];

export default function Features() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="PLATFORM"
        title="Tools designed to work together."
        lead="KneeAxis combines patient organization, imaging, reconstruction and future AI integration in a consistent clinical research interface."
      />
      <section className="py-[78px]">
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
            {features.map((item, idx) => (
              <article
                key={idx}
                className="bg-white rounded-[15px] p-[27px] transition-all hover:shadow-md"
                style={{
                  border: '1px solid var(--ka-line)',
                  boxShadow: 'var(--ka-soft-shadow)',
                }}
              >
                <div
                  className="w-[39px] height-[39px] h-[39px] rounded-[11px] grid place-items-center mb-[19px]"
                  style={{
                    background: 'var(--ka-brand-wash)',
                    color: 'var(--ka-brand)',
                  }}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <h3
                  className="text-[16px] font-semibold mb-[9px]"
                  style={{ color: 'var(--ka-ink-strong)' }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-[13px] leading-[1.7] m-0"
                  style={{ color: 'var(--ka-muted)' }}
                >
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

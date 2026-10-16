import { Link } from 'wouter';
import PublicLayout from '@/layouts/PublicLayout';

const steps = [
  { num: '01', title: 'Medical imaging', desc: 'Upload and manage source studies.' },
  { num: '02', title: 'AI analysis', desc: 'Enable once validated weights exist.' },
  { num: '03', title: '3D reconstruction', desc: 'Convert verified masks into meshes.' },
  { num: '04', title: 'Knee planning', desc: 'Work with measured anatomy.' },
  { num: '05', title: 'Review & export', desc: 'Verify, record and export results.' },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero section */}
      <section
        className="py-[82px] pb-[92px] border-b"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f7f9fb 100%)',
          borderColor: 'var(--ka-line)',
        }}
      >
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.04fr_.96fr] gap-[45px] lg:gap-[65px] items-center">
            <div>
              <p
                className="text-[11px] font-bold tracking-[.15em] uppercase mb-[13px]"
                style={{ color: 'var(--ka-brand)' }}
              >
                PATIENT-SPECIFIC KNEE ANALYSIS
              </p>
              <h1
                className="text-[40px] sm:text-[51px] font-serif font-normal leading-[1.11] tracking-[-1.65px] mb-[23px]"
                style={{ color: 'var(--ka-ink-strong)' }}
              >
                From medical imaging to{' '}
                <em className="not-italic" style={{ background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  clearer knee planning.
                </em>
              </h1>
              <p
                className="text-[16px] leading-[1.83] max-w-[500px] mb-[28px]"
                style={{ color: '#617387' }}
              >
                A thoughtful workspace for knee imaging, anatomical 3D reconstruction, and preoperative planning — designed to keep every step understandable, organized, and reviewable.
              </p>
              <div className="flex flex-wrap gap-[11px]">
                <Link
                  href="/features"
                  className="inline-flex justify-center items-center gap-[9px] py-[11px] px-[17px] min-h-[41px] rounded-[9px] text-[13px] font-bold text-white transition-all hover:opacity-95 shadow-xs"
                  style={{ background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)' }}
                >
                  Explore the platform ↗
                </Link>
                <Link
                  href="/login"
                  className="inline-flex justify-center items-center gap-[9px] py-[11px] px-[17px] min-h-[41px] rounded-[9px] text-[13px] font-bold border transition-all hover:bg-slate-50"
                  style={{
                    background: '#ffffff',
                    borderColor: '#cbdbe1',
                    color: 'var(--ka-brand-deep)',
                  }}
                >
                  Sign in to workspace
                </Link>
              </div>
              <p className="mt-[28px] text-[12px]" style={{ color: '#7d8d9b' }}>
                Research-stage system. AI classification and segmentation models are not yet trained or deployed.
              </p>
            </div>

            {/* Visual Card with Anatomical Sketch */}
            <div
              className="bg-white rounded-[20px] p-[20px] border transition-all"
              style={{
                borderColor: '#e1e9ed',
                boxShadow: '0 17px 55px rgba(19,52,67,.07)',
              }}
            >
              <div
                className="flex items-center justify-between pb-[14px] border-b"
                style={{ borderColor: 'var(--ka-line)' }}
              >
                <span className="text-[13px] font-bold" style={{ color: 'var(--ka-ink-strong)' }}>
                  Anatomical reconstruction
                </span>
                <span className="flex gap-[5px]" aria-hidden="true">
                  <i className="w-[7px] h-[7px] rounded-full border border-[#ccd6dc] block" />
                  <i className="w-[7px] h-[7px] rounded-full border border-[#ccd6dc] block" />
                  <i className="w-[7px] h-[7px] rounded-full border border-[#ccd6dc] block" />
                </span>
              </div>

              <div
                className="h-[275px] my-[15px] rounded-[13px] relative overflow-hidden grid place-items-center"
                style={{
                  background: 'radial-gradient(circle at 50% 42%, #f1f8f9 0, #f7fbfc 50%, #f2f6f8 100%)',
                }}
              >
                <svg
                  viewBox="0 0 240 300"
                  role="img"
                  aria-label="Abstract knee alignment schematic; not patient-specific medical data"
                  fill="none"
                  className="h-[245px] w-[210px] max-w-[80%]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M94 12c-3 22-4 52-11 81-6 24-20 40-23 65-3 23 15 38 37 39 11 1 19-5 24-13 5 8 15 14 28 13 20-2 37-16 36-38-1-27-15-42-20-65-6-29-8-59-11-82"
                    stroke="#7eaab5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="#d8eaee"
                    fillOpacity=".5"
                  />
                  <path d="M78 199c0 14-6 31-6 50v39m89-89c0 14 7 34 7 50v39" stroke="#79a8b3" strokeWidth="3" strokeLinecap="round" />
                  <path d="M74 202c13 12 29 18 47 17 20 0 35-6 49-17" stroke="#376f84" strokeWidth="4" />
                  <path d="M58 178c18 14 38 21 63 21 28 0 48-7 65-21" stroke="#447f91" strokeWidth="3" strokeDasharray="5 7" />
                  <path d="M121 6v288" stroke="#aacdd5" strokeWidth="1.6" strokeDasharray="5 8" />
                  <path d="M34 191h174" stroke="#aacdd5" strokeWidth="1.5" strokeDasharray="4 6" />
                  <circle cx="121" cy="197" r="5" fill="#256c83" />
                  <circle cx="121" cy="219" r="3.7" fill="#80aeb9" />
                  <path d="M65 184c11-5 26-11 38-7m34 0c15-3 28 2 39 7" stroke="#aacdd5" strokeWidth="2" />
                </svg>
                <small className="absolute bottom-[16px] left-[20px] text-[10px]" style={{ color: '#7a8d96' }}>
                  Illustrative alignment sketch · Not patient data
                </small>
              </div>

              <div className="grid grid-cols-2 gap-[11px]">
                <div
                  className="rounded-[10px] p-[12px] border"
                  style={{ background: '#f7f9fb', borderColor: 'var(--ka-line)' }}
                >
                  <b className="text-[12px] block" style={{ color: 'var(--ka-ink-strong)' }}>
                    Imaging → Segmentation
                  </b>
                  <span className="text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                    Modular analysis workflow
                  </span>
                </div>
                <div
                  className="rounded-[10px] p-[12px] border"
                  style={{ background: '#f7f9fb', borderColor: 'var(--ka-line)' }}
                >
                  <b className="text-[12px] block" style={{ color: 'var(--ka-ink-strong)' }}>
                    Mask → 3D mesh
                  </b>
                  <span className="text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                    Geometry and quality checks
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <section className="py-[78px] bg-white border-b" style={{ borderColor: 'var(--ka-line)' }}>
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="mb-[34px]">
            <p
              className="text-[11px] font-bold tracking-[.15em] uppercase mb-[13px]"
              style={{ color: 'var(--ka-brand)' }}
            >
              THE PLATFORM
            </p>
            <h2
              className="text-[36px] font-serif font-normal leading-[1.2] tracking-[-.7px] mb-[12px]"
              style={{ color: 'var(--ka-ink-strong)' }}
            >
              Purposeful tools, one consistent workflow.
            </h2>
            <p className="text-[15px] max-w-[660px] m-0" style={{ color: 'var(--ka-muted)' }}>
              Designed around the real stages of research-oriented knee analysis, with clear separation between current functionality and future AI features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
            <article
              className="bg-white rounded-[15px] p-[27px] border transition-all"
              style={{ borderColor: 'var(--ka-line)', boxShadow: 'var(--ka-soft-shadow)' }}
            >
              <div
                className="w-[39px] h-[39px] rounded-[11px] grid place-items-center text-[19px] mb-[19px]"
                style={{ background: 'var(--ka-brand-wash)', color: 'var(--ka-brand)' }}
              >
                ▤
              </div>
              <h3 className="text-[16px] font-semibold mb-[9px]" style={{ color: 'var(--ka-ink-strong)' }}>
                Imaging & records
              </h3>
              <p className="text-[13px] leading-[1.7] m-0" style={{ color: 'var(--ka-muted)' }}>
                Organize studies and imaging files by patient, with clear provenance and case history.
              </p>
            </article>

            <article
              className="bg-white rounded-[15px] p-[27px] border transition-all"
              style={{ borderColor: 'var(--ka-line)', boxShadow: 'var(--ka-soft-shadow)' }}
            >
              <div
                className="w-[39px] h-[39px] rounded-[11px] grid place-items-center text-[19px] mb-[19px]"
                style={{ background: 'var(--ka-brand-wash)', color: 'var(--ka-brand)' }}
              >
                ⬡
              </div>
              <h3 className="text-[16px] font-semibold mb-[9px]" style={{ color: 'var(--ka-ink-strong)' }}>
                3D reconstruction
              </h3>
              <p className="text-[13px] leading-[1.7] m-0" style={{ color: 'var(--ka-muted)' }}>
                Build anatomical meshes from existing segmentation masks, with surface processing and quality checks.
              </p>
            </article>

            <article
              className="bg-white rounded-[15px] p-[27px] border transition-all"
              style={{ borderColor: 'var(--ka-line)', boxShadow: 'var(--ka-soft-shadow)' }}
            >
              <div
                className="w-[39px] h-[39px] rounded-[11px] grid place-items-center text-[19px] mb-[19px]"
                style={{ background: 'var(--ka-brand-wash)', color: 'var(--ka-brand)' }}
              >
                ⌖
              </div>
              <h3 className="text-[16px] font-semibold mb-[9px]" style={{ color: 'var(--ka-ink-strong)' }}>
                Planning & review
              </h3>
              <p className="text-[13px] leading-[1.7] m-0" style={{ color: 'var(--ka-muted)' }}>
                Prepare a structured path toward alignment measurements, iKA planning, review and auditable outputs.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-[78px] border-b" style={{ borderColor: 'var(--ka-line)' }}>
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div className="mb-[34px]">
            <p
              className="text-[11px] font-bold tracking-[.15em] uppercase mb-[13px]"
              style={{ color: 'var(--ka-brand)' }}
            >
              HOW IT WORKS
            </p>
            <h2
              className="text-[36px] font-serif font-normal leading-[1.2] tracking-[-.7px] mb-[12px]"
              style={{ color: 'var(--ka-ink-strong)' }}
            >
              A connected workflow, from start to finish.
            </h2>
            <p className="text-[15px] max-w-[660px] m-0" style={{ color: 'var(--ka-muted)' }}>
              Each step has an honest available, pending, or unavailable state.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[12px]">
            {steps.map((st, idx) => (
              <article
                key={idx}
                className="p-[20px] bg-white rounded-[12px] border transition-all"
                style={{ borderColor: 'var(--ka-line)', boxShadow: 'var(--ka-soft-shadow)' }}
              >
                <span className="font-serif text-[23px]" style={{ color: 'var(--ka-brand)' }}>
                  {st.num}
                </span>
                <h3 className="text-[13px] font-semibold mt-[10px] mb-[7px]" style={{ color: 'var(--ka-ink-strong)' }}>
                  {st.title}
                </h3>
                <p className="text-[12px] leading-[1.6] m-0" style={{ color: 'var(--ka-muted)' }}>
                  {st.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Responsibility & Disclaimer Banner */}
      <section className="py-[78px] bg-white">
        <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
          <div
            className="rounded-[16px] p-[24px] sm:p-[27px] flex flex-col md:flex-row items-start md:items-center justify-between gap-[25px] border"
            style={{
              borderColor: '#d3e6e9',
              background: '#edf6f7',
            }}
          >
            <div>
              <h3 className="text-[17px] font-semibold mb-[6px]" style={{ color: 'var(--ka-ink-strong)' }}>
                Built for clarity, not exaggerated claims.
              </h3>
              <p className="text-[13px] m-0" style={{ color: '#536f7c' }}>
                KneeAxis is a research prototype. Model performance and clinical validity must be established before any medical use.
              </p>
            </div>
            <Link
              href="/medical-disclaimer"
              className="inline-flex justify-center items-center py-[10px] px-[16px] rounded-[9px] text-[13px] font-bold border transition-all hover:bg-white shrink-0"
              style={{
                background: '#ffffff',
                borderColor: '#cbdbe1',
                color: 'var(--ka-brand-deep)',
              }}
            >
              Medical disclaimer ↗
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

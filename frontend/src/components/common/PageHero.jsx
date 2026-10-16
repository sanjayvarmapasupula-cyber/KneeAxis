export default function PageHero({ eyebrow, title, lead }) {
  return (
    <section className="border-b bg-white" style={{ borderColor: 'var(--ka-line)', padding: '60px 0 53px' }}>
      <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
        {eyebrow && (
          <p
            className="font-bold text-[11px] uppercase mb-[13px]"
            style={{ letterSpacing: '0.15em', color: 'var(--ka-brand)' }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="m-0 mb-[13px]"
          style={{
            font: 'normal 43px/1.18 var(--ka-serif)',
            letterSpacing: '-1px',
            color: 'var(--ka-ink-strong)',
          }}
        >
          {title}
        </h1>
        {lead && (
          <p className="m-0" style={{ maxWidth: 660, color: 'var(--ka-muted)' }}>
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}

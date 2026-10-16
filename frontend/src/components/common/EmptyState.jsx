import { Link } from 'wouter';

export default function EmptyState({ icon, title, description, actionHref, actionLabel }) {
  return (
    <div
      className="grid place-items-center text-center min-h-[190px] rounded-[12px] p-[25px]"
      style={{
        border: '1px dashed #d8e2e7',
        background: '#fcfdfd',
      }}
    >
      <div>
        {icon && (
          <div
            className="grid place-items-center w-[41px] h-[41px] rounded-[11px] text-[21px] mx-auto mb-[12px]"
            style={{
              border: '1px solid #d8e5e9',
              background: '#f0f7f9',
              color: 'var(--ka-brand)',
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <h3 className="text-[14px] font-semibold m-0 mb-[7px]" style={{ color: 'var(--ka-ink)' }}>
          {title}
        </h3>
        <p className="text-[12px] m-0 mx-auto mb-[15px]" style={{ maxWidth: 365, color: 'var(--ka-muted)' }}>
          {description}
        </p>
        {actionHref && actionLabel && (
          <Link href={actionHref}>
            <span
              className="inline-flex justify-center items-center gap-[9px] px-[12px] py-[8px] rounded-[9px] text-[13px] font-bold cursor-pointer transition-transform hover:-translate-y-px"
              style={{
                background: '#fff',
                border: '1px solid #cbdbe1',
                color: 'var(--ka-brand-deep)',
              }}
            >
              {actionLabel} →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

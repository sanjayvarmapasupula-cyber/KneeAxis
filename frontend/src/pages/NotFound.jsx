import { Link } from 'wouter';
import PublicLayout from '@/layouts/PublicLayout';

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="py-[100px] px-6 text-center">
        <div style={{ width: 'min(600px, 100%)', margin: '0 auto' }}>
          <p
            className="text-[11px] font-bold tracking-[.15em] uppercase mb-[13px]"
            style={{ color: 'var(--ka-brand)' }}
          >
            ERROR 404
          </p>
          <h1
            className="text-[42px] font-serif font-normal leading-tight mb-[16px]"
            style={{ color: 'var(--ka-ink-strong)' }}
          >
            Page not found
          </h1>
          <p
            className="text-[15px] leading-[1.8] mb-[32px]"
            style={{ color: 'var(--ka-muted)' }}
          >
            The requested page does not exist or may have been moved. Return to the homepage or navigate to your workspace.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex justify-center items-center py-[11px] px-[20px] rounded-[9px] text-[13px] font-bold text-white transition-all hover:opacity-95"
              style={{ background: 'var(--ka-brand)' }}
            >
              Return home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex justify-center items-center py-[11px] px-[20px] rounded-[9px] text-[13px] font-bold border transition-all hover:bg-slate-50"
              style={{
                borderColor: '#cbdbe1',
                background: '#ffffff',
                color: 'var(--ka-brand-deep)',
              }}
            >
              Go to workspace ↗
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

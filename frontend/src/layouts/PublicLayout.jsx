import PublicHeader from '@/components/common/PublicHeader';
import PublicFooter from '@/components/common/PublicFooter';

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ka-bg)' }}>
      <PublicHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

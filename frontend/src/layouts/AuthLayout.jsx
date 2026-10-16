import PublicHeader from '@/components/common/PublicHeader';
import PublicFooter from '@/components/common/PublicFooter';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ka-bg)' }}>
      <PublicHeader />
      <main
        id="main-content"
        className="flex-1 grid place-items-center px-5"
        style={{ padding: '65px 20px' }}
      >
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

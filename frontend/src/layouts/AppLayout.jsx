import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useSidebarStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }) {
  const { collapsed } = useSidebarStore();

  return (
    <div
      className="min-h-screen font-brand"
      style={{ background: 'var(--ka-bg, #F7F9FB)', color: 'var(--ka-ink, #0B1E2E)' }}
    >
      <Header />
      <Sidebar />
      <div
        className={cn(
          'flex flex-col min-h-screen pt-[72px] transition-[margin] duration-200 ease-in-out motion-reduce:transition-none',
          collapsed ? 'md:ml-[84px]' : 'md:ml-[260px]',
          'ml-0'
        )}
      >
        <main
          className="flex-1 mx-auto w-full px-4 sm:px-8 py-8"
          style={{ maxWidth: 1440 }}
        >
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}

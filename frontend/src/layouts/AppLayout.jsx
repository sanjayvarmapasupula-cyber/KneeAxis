import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useSidebarStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }) {
  const { collapsed } = useSidebarStore();

  return (
    <div className="min-h-screen" style={{ background: 'var(--ka-bg)', color: 'var(--ka-ink)' }}>
      <Sidebar />
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          collapsed ? 'ml-[68px]' : 'ml-[248px]'
        )}
      >
        <Header />
        <main
          className="flex-1 mx-auto w-full"
          style={{ maxWidth: 1310, padding: '35px 38px 75px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

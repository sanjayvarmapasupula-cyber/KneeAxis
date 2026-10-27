import { useAuthStore, usePatientStore } from '@/store/useAppStore';
import { Search, Bell, Settings, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

const routeTitleMap = {
  '/dashboard': 'Overview',
  '/patients': 'Patients',
  '/imaging': 'Imaging',
  '/models': 'AI Analysis',
  '/segmentation': 'AI Segmentation',
  '/reconstruction': '3D Reconstruction',
  '/planning': 'Knee Planning',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Header() {
  const { user } = useAuthStore();
  const { selectedPatientId } = usePatientStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useLocation();

  // Find current view title from route
  const currentTitle =
    Object.entries(routeTitleMap).find(([path]) =>
      location === path || location.startsWith(path + '/')
    )?.[1] || 'Workspace';

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'KA';

  return (
    <header
      className="sticky top-0 z-30 flex h-[62px] items-center justify-between px-6 sm:px-9 transition-colors font-brand"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--ka-line)',
      }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-3">
        <div className="text-[13px]" style={{ color: '#8a98a5' }}>
          Workspace /{' '}
          <strong className="font-bold tracking-tight" style={{ color: '#0B1E2E' }}>
            {currentTitle}
          </strong>
        </div>

        {selectedPatientId && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-mono border"
            style={{
              background: 'var(--ka-brand-wash)',
              borderColor: '#d7e8ec',
              color: 'var(--ka-brand-deep)',
            }}
          >
            <User className="w-3 h-3" />
            Case: {selectedPatientId}
          </span>
        )}
      </div>

      {/* Right: Search, Notifications, Account */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative hidden sm:block">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: 'var(--ka-muted)' }}
          />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-44 md:w-56 rounded-[8px] pl-8 pr-3 text-[12px] font-medium outline-none transition-colors border"
            style={{
              borderColor: 'var(--ka-line)',
              background: '#f7f9fb',
              color: 'var(--ka-ink)',
            }}
          />
        </form>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => toast.info('System operating normally.')}
          className="rounded-[8px] p-2 transition-colors border hover:bg-slate-50"
          style={{
            borderColor: 'var(--ka-line)',
            color: 'var(--ka-muted)',
            background: '#ffffff',
          }}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Account settings link */}
        <Link
          href="/settings"
          className="hidden md:inline-block text-[12px] font-semibold tracking-tight hover:underline"
          style={{ color: 'var(--ka-muted)' }}
        >
          Account settings
        </Link>

        {/* Avatar */}
        <div
          className="h-[34px] w-[34px] rounded-full grid place-items-center text-[12px] font-bold border transition-all"
          style={{
            borderColor: '#dce7eb',
            background: 'var(--ka-brand-wash)',
            color: '#0082A6',
          }}
          title={user?.name || 'KneeAxis User'}
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
}

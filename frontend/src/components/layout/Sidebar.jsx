import { Link, useLocation } from 'wouter';
import { useAuthStore, useSidebarStore } from '@/store/useAppStore';
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Cpu,
  Brain,
  Box,
  Target,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/imaging', label: 'Imaging', icon: ScanLine },
  { path: '/models', label: 'AI Analysis', icon: Cpu },
  { path: '/segmentation', label: 'Bone Segmentation', icon: Brain },
  { path: '/reconstruction', label: '3D Reconstruction', icon: Box },
  { path: '/planning', label: 'Knee Planning', icon: Target },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'KA';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-white transition-all duration-300 font-brand',
        collapsed ? 'w-[68px]' : 'w-[250px]'
      )}
      style={{
        borderColor: 'var(--ka-line)',
        background: '#ffffff',
      }}
    >
      {/* Brand Header */}
      <Link href="/dashboard">
        <div
          className={cn(
            'flex h-[66px] items-center border-b px-3 cursor-pointer hover:bg-slate-50/80 transition-colors',
            collapsed ? 'justify-center' : 'justify-start gap-2.5 px-4'
          )}
          style={{ borderColor: 'var(--ka-line)' }}
        >
          {collapsed ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
              }}
            >
              <svg viewBox="0 0 32 32" fill="none" width="22" height="22" aria-hidden="true">
                <path
                  d="M7 23.5C10 17 11.8 14.8 16 14.4c4.5-.4 6.4-2.8 9-7.4"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M7 8.5c3.7 5.2 5.7 7.4 9 7.7 3.8.4 5.3 3.4 9 7.3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="16" cy="16" r="3" fill="currentColor" />
              </svg>
            </div>
          ) : (
            <img
              src="/kneeaxis-logo.png"
              alt="KneeAxis Medical Alignment"
              className="h-[38px] w-auto object-contain shrink-0"
            />
          )}
        </div>
      </Link>

      {/* Section label */}
      {!collapsed && (
        <div
          className="text-[10px] font-bold tracking-[.14em] uppercase px-5 mt-4 mb-2"
          style={{ color: '#8d9ca8' }}
        >
          Workspace
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.path === '/dashboard'
              ? location === '/' || location === '/dashboard'
              : location === item.path || location.startsWith(item.path + '/');
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] font-semibold tracking-tight transition-all cursor-pointer',
                  isActive
                    ? 'font-bold'
                    : 'hover:bg-[#f4f8fa]'
                )}
                style={{
                  background: isActive ? 'var(--ka-brand-wash)' : 'transparent',
                  color: isActive ? '#007A99' : '#5c6d80',
                }}
              >
                <item.icon
                  className="h-[18px] w-[18px] shrink-0"
                  style={{ color: isActive ? '#0082A6' : '#8390a0' }}
                />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 pb-2 border-t pt-2" style={{ borderColor: 'var(--ka-line)' }}>
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-[8px] py-1.5 transition-colors text-[11px] font-medium hover:bg-slate-50"
          style={{ color: 'var(--ka-muted)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>

      {/* Public site link */}
      {!collapsed && (
        <div
          className="px-4 py-2.5 text-[11px] border-t font-brand"
          style={{ borderColor: 'var(--ka-line)', color: '#8696a5' }}
        >
          <div className="font-semibold text-[10px] text-slate-400 mb-0.5 tracking-wider uppercase">
            Research Workspace
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-bold hover:underline"
            style={{ color: '#0082A6' }}
          >
            Public website <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* User Profile */}
      <div
        className="border-t p-3 font-brand"
        style={{ borderColor: 'var(--ka-line)', background: '#ffffff' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border"
            style={{
              borderColor: '#dce7eb',
              background: 'var(--ka-brand-wash)',
              color: '#0082A6',
            }}
          >
            {userInitials}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p
                className="truncate text-[12px] font-bold tracking-tight"
                style={{ color: 'var(--ka-ink-strong)' }}
              >
                {user?.name || 'Researcher'}
              </p>
              <p className="truncate text-[11px]" style={{ color: 'var(--ka-muted)' }}>
                {user?.role || 'Clinician'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="shrink-0 rounded-[6px] p-1.5 transition-colors hover:bg-red-50 text-slate-400 hover:text-red-600"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

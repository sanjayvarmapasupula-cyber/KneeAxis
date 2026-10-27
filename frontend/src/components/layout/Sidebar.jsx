import { useEffect } from 'react';
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
  Activity,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', shortLabel: 'Patients', icon: Users },
  { path: '/imaging', label: 'Imaging', shortLabel: 'Imaging', icon: ScanLine },
  { path: '/ai-analysis', label: 'AI Analysis', shortLabel: 'AI Analysis', icon: Cpu },
  { path: '/segmentation', label: 'Bone Segmentation', shortLabel: 'Segmentation', icon: Brain },
  { path: '/reconstruction', label: '3D Reconstruction', shortLabel: '3D Models', icon: Box },
  { path: '/planning', label: 'Knee Planning', shortLabel: 'Planning', icon: Target },
  { path: '/live-pipeline', label: 'Live Pipeline', shortLabel: 'Pipeline', icon: Activity },
  { path: '/reports', label: 'Reports', shortLabel: 'Reports', icon: FileText },
  { path: '/analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuthStore();
  const { collapsed, mobileOpen, closeMobile } = useSidebarStore();

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileOpen) {
        closeMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, closeMobile]);

  const cleanDisplayName = user?.name
    ? user.name.replace(/^dr\.?\s+/i, '')
    : 'Researcher';

  const userInitials = user?.name
    ? user.name
        .replace(/^dr\.?\s+/i, '')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'KA';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          role="presentation"
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      {/* Mobile Slide-Out Drawer (Full Height) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col bg-white border-r border-slate-200 shadow-2xl transition-transform duration-200 ease-in-out md:hidden font-brand select-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile Navigation"
      >
        {/* Mobile Header with Logo + Close Button */}
        <div className="flex h-[72px] shrink-0 items-center justify-between px-5 border-b border-slate-200">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className="flex items-center cursor-pointer"
            title="KneeAxis"
          >
            <img
              src="/kneeaxis-logo.png"
              alt="KneeAxis"
              className="h-[32px] w-auto max-w-[155px] object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location === '/' || location === '/dashboard'
                : item.path === '/ai-analysis'
                  ? location === '/ai-analysis' || location === '/models' || location.startsWith('/ai-analysis/') || location.startsWith('/models/')
                  : location === item.path || location.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={closeMobile}
                className="block outline-none"
              >
                <div
                  className={cn(
                    'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer',
                    isActive
                      ? 'bg-teal-50 text-[#0082A6] font-bold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-[#0082A6]' : 'text-slate-500'
                    )}
                  />
                  <span className="text-[14px]">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Mobile User Footer */}
        <div className="border-t border-slate-200 p-4 shrink-0 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold border border-teal-200 bg-teal-50 text-[#0082A6]">
                {userInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {cleanDisplayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate capitalize">
                  {user?.role || 'Researcher'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                closeMobile();
                logout();
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop YouTube-Style Sidebar (Positioned below the 72px Top Header) */}
      <aside
        className={cn(
          'hidden md:flex fixed top-[72px] bottom-0 left-0 z-30 flex-col border-r border-slate-200 bg-white font-brand select-none transition-[width] duration-200 ease-in-out motion-reduce:transition-none',
          collapsed ? 'w-[84px]' : 'w-[260px]'
        )}
        aria-label="Desktop Navigation"
      >
        {/* Navigation Items */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto py-3 space-y-1',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          {navItems.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location === '/' || location === '/dashboard'
                : item.path === '/ai-analysis'
                  ? location === '/ai-analysis' || location === '/models' || location.startsWith('/ai-analysis/') || location.startsWith('/models/')
                  : location === item.path || location.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                href={item.path}
                title={item.label}
                aria-label={item.label}
                className="block outline-none"
              >
                {collapsed ? (
                  // YouTube Compact Mode: Vertically stacked icon + label
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-colors cursor-pointer text-center group',
                      isActive
                        ? 'bg-teal-50 text-[#0082A6] font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 mb-1 shrink-0 transition-colors',
                        isActive
                          ? 'text-[#0082A6]'
                          : 'text-slate-500 group-hover:text-slate-900'
                      )}
                    />
                    <span className="text-[10px] font-medium leading-tight truncate max-w-[76px] px-0.5">
                      {item.shortLabel}
                    </span>
                  </div>
                ) : (
                  // YouTube Expanded Mode: Horizontal icon + full label
                  <div
                    className={cn(
                      'flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer text-left',
                      isActive
                        ? 'bg-teal-50 text-[#0082A6] font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0 transition-colors',
                        isActive ? 'text-[#0082A6]' : 'text-slate-500'
                      )}
                    />
                    <span className="text-[13px] tracking-tight truncate whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Public Website Link (Expanded only) */}
        {!collapsed && (
          <div className="px-4 py-2.5 text-[11px] border-t border-slate-200 shrink-0 text-slate-500">
            <div className="font-semibold text-[10px] text-slate-400 mb-0.5 tracking-wider uppercase">
              Research Workspace
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-bold text-[#0082A6] hover:underline"
            >
              Public website <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Footer info in expanded mode */}
        {!collapsed && (
          <div className="border-t border-slate-200 p-3 shrink-0 bg-slate-50/50">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border border-teal-200 bg-teal-50 text-[#0082A6]">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-slate-900">
                    {cleanDisplayName}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 capitalize">
                    {user?.role || 'Researcher'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

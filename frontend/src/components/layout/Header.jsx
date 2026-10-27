import { useAuthStore, usePatientStore, useSidebarStore } from '@/store/useAppStore';
import { Search, Bell, Settings, User, LogOut, Shield, Laptop, ChevronDown, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';

const routeTitleMap = {
  '/dashboard': 'Overview',
  '/patients': 'Patients',
  '/imaging': 'Imaging',
  '/models': 'AI Analysis',
  '/ai-analysis': 'AI Analysis',
  '/segmentation': 'Bone Segmentation',
  '/reconstruction': '3D Reconstruction',
  '/planning': 'Knee Planning',
  '/live-pipeline': 'Live Pipeline',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Header() {
  const { user, logout } = useAuthStore();
  const { selectedPatientId } = usePatientStore();
  const { toggleMobile } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await logout();
    toast.success('Signed out successfully');
    setLocation('/login');
  };

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

  const roleBadge = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Researcher';

  const { toggle } = useSidebarStore();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex h-[72px] items-center justify-between px-4 sm:px-6 transition-colors font-brand bg-white border-b border-slate-200 select-none"
    >
      {/* Left: YouTube-Style Hamburger + KneeAxis Logo + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="p-2 -ml-1 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center cursor-pointer shrink-0"
          title="KneeAxis Medical Alignment"
        >
          <img
            src="/kneeaxis-logo.png"
            alt="KneeAxis"
            className="h-[32px] w-auto max-w-[155px] object-contain shrink-0"
          />
        </Link>

        <div className="h-5 w-[1px] bg-slate-200 mx-1.5 hidden sm:block" />

        <div className="text-[13px] text-slate-400 hidden sm:block">
          Workspace /{' '}
          <strong className="font-bold tracking-tight text-slate-900">
            {currentTitle}
          </strong>
        </div>

        {selectedPatientId && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-mono border bg-sky-50 border-sky-100 text-[#0082A6]"
          >
            <User className="w-3 h-3" />
            Case: {selectedPatientId}
          </span>
        )}
      </div>

      {/* Right: Search, Notifications, Account Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative hidden sm:block">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: 'var(--ka-muted, #64748B)' }}
          />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-44 md:w-56 rounded-[8px] pl-8 pr-3 text-[12px] font-medium outline-none transition-colors border"
            style={{
              borderColor: 'var(--ka-line, #E2E8F0)',
              background: '#f7f9fb',
              color: 'var(--ka-ink, #0B1E2E)',
            }}
          />
        </form>

        {/* Notifications Button */}
        <button
          type="button"
          onClick={() => toast.info('System operating normally.')}
          className="rounded-[8px] p-2 transition-colors border hover:bg-slate-50 cursor-pointer"
          style={{
            borderColor: 'var(--ka-line, #E2E8F0)',
            color: 'var(--ka-muted, #64748B)',
            background: '#ffffff',
          }}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Account Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
          >
            <div
              className="h-[34px] w-[34px] rounded-full grid place-items-center text-[12px] font-bold border transition-all"
              style={{
                borderColor: '#dce7eb',
                background: 'var(--ka-brand-wash, #F0F9FF)',
                color: '#0082A6',
              }}
            >
              {userInitials}
            </div>
            <div className="hidden lg:flex flex-col items-start text-left pr-1">
              <span className="text-[12px] font-bold text-slate-800 leading-tight">
                {user?.name || 'KneeAxis User'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                {roleBadge}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-[12px] bg-white border shadow-lg py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
              style={{
                borderColor: 'var(--ka-line, #E2E8F0)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              }}
            >
              {/* User Header Info */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-[13px] font-bold text-slate-900 truncate">
                  {user?.name || 'Authenticated User'}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {user?.email || 'user@kneeaxis.org'}
                </p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-[#0082A6] border border-sky-100">
                  {roleBadge} Account
                </span>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <span>Active Sessions</span>
                </Link>
              </div>

              {/* Sign Out */}
              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="font-semibold">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

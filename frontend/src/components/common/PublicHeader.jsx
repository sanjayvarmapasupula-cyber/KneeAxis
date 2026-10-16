import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/useAppStore';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Platform' },
  { href: '/workflow', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function PublicHeader() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  return (
    <header
      className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b font-brand"
      style={{ borderColor: 'var(--ka-line)' }}
    >
      <div
        className="flex items-center h-[76px] mx-auto gap-[30px]"
        style={{ width: 'min(1160px, calc(100% - 56px))' }}
      >
        {/* Brand Logo with Image & Wordmark */}
        <Link href="/">
          <span
            className="flex items-center gap-3 cursor-pointer group transition-transform hover:opacity-95"
            aria-label="KneeAxis homepage"
          >
            <img
              src="/kneeaxis-logo.png"
              alt="KneeAxis Medical Alignment"
              className="h-[44px] w-auto object-contain drop-shadow-xs"
            />
          </span>
        </Link>

        {/* Desktop Nav with Font Style Matching Logo */}
        <nav
          className="hidden md:flex items-center gap-[28px] ml-auto font-brand"
          aria-label="Main navigation"
        >
          {navLinks.map(({ href, label }) => {
            const isActive = location === href;
            return (
              <Link key={href} href={href}>
                <span
                  className="text-[14px] font-semibold tracking-tight transition-colors cursor-pointer py-1 relative"
                  style={{
                    color: isActive ? '#0082A6' : '#536477',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                  {isActive && (
                    <span
                      className="absolute bottom-[-4px] left-0 right-0 h-[2px] rounded-full"
                      style={{ background: 'linear-gradient(90deg, #00A5B5, #005C9A)' }}
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-[12px] ml-[17px] font-brand">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <span
                className="inline-flex justify-center items-center gap-[9px] px-[18px] py-[10px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:shadow-md cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
                }}
              >
                Open workspace →
              </span>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <span
                  className="text-[13px] font-bold px-[8px] py-[6px] rounded-[8px] cursor-pointer transition-colors hover:bg-slate-50"
                  style={{ color: '#0B1E2E' }}
                >
                  Sign in
                </span>
              </Link>
              <Link href="/register">
                <span
                  className="inline-flex justify-center items-center gap-[9px] px-[18px] py-[10px] rounded-[10px] text-[13px] font-bold text-white transition-all hover:shadow-md cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
                  }}
                >
                  Create account ↗
                </span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden ml-auto p-2 rounded-lg border"
          style={{ borderColor: 'var(--ka-line)', color: 'var(--ka-ink)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden flex flex-col border-t px-[22px] py-[20px] bg-white gap-3 font-brand"
          style={{ borderColor: 'var(--ka-line)' }}
          aria-label="Mobile navigation"
        >
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}>
              <span
                className="text-[14px] font-semibold py-2 block tracking-tight"
                style={{ color: location === href ? '#0082A6' : '#536477' }}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </span>
            </Link>
          ))}
          <div className="pt-2 border-t flex flex-col gap-2" style={{ borderColor: 'var(--ka-line)' }}>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <span
                  className="inline-flex justify-center items-center w-full py-[11px] rounded-[9px] text-[13px] font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  Open workspace →
                </span>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <span
                    className="inline-flex justify-center items-center w-full py-[10px] rounded-[9px] text-[13px] font-bold border"
                    style={{ borderColor: 'var(--ka-line)', color: '#0B1E2E' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign in
                  </span>
                </Link>
                <Link href="/register">
                  <span
                    className="inline-flex justify-center items-center w-full py-[11px] rounded-[9px] text-[13px] font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #00A5B5 0%, #0082A6 60%, #005C9A 100%)',
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    Create account ↗
                  </span>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

import React from 'react';
import { Link } from 'wouter';

export default function Footer({ variant = 'workspace' }) {
  const currentYear = new Date().getFullYear();

  if (variant === 'workspace') {
    return (
      <footer className="w-full border-t border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm py-4 px-6 text-xs text-[var(--muted-foreground)]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--foreground)]">KneeAxis™</span>
            <span>— Clinical Atlas & Surgical Planning System</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="System Operational"></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/medical-disclaimer" className="hover:text-[var(--foreground)] transition-colors">
              Medical Disclaimer
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[var(--foreground)] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[var(--foreground)] transition-colors">
              Terms of Use
            </Link>
            <span>•</span>
            <span>© {currentYear} KneeAxis</span>
          </div>
        </div>
      </footer>
    );
  }

  // Public / marketing footer fallback
  return (
    <footer className="w-full bg-[var(--ka-footer-bg,#0b151f)] text-[#e7eef2] py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/kneeaxis-logo.png" alt="KneeAxis Logo" className="h-8 w-auto object-contain bg-white rounded px-2 py-1" />
          <span className="text-sm font-medium">Patient-Specific 3D Knee Reconstruction & Arthroplasty Planning</span>
        </div>
        <div className="text-xs text-[#adbdc8]">
          © {currentYear} KneeAxis Clinical Atlas. For investigational & research use only.
        </div>
      </div>
    </footer>
  );
}

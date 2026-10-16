import { Link } from 'wouter';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="font-brand"
      style={{ background: 'var(--ka-footer-bg)', color: '#e7eef2', padding: '57px 0 25px' }}
    >
      <div style={{ width: 'min(1160px, calc(100% - 56px))', margin: '0 auto' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[45px]">
          {/* Brand column */}
          <div className="lg:col-span-1 sm:col-span-2">
            <Link href="/">
              <span
                className="inline-flex items-center bg-white px-3 py-1.5 rounded-[10px] cursor-pointer hover:opacity-95 transition-opacity"
                aria-label="KneeAxis homepage"
              >
                <img
                  src="/kneeaxis-logo.png"
                  alt="KneeAxis Medical Alignment"
                  className="h-[34px] w-auto object-contain"
                />
              </span>
            </Link>
            <p className="text-[12px] mt-[17px] leading-[1.9]" style={{ color: '#adbdc8', maxWidth: 280 }}>
              A research-oriented workspace for knee imaging, patient-specific 3D reconstruction and preoperative planning.
            </p>
          </div>

          {/* Platform links */}
          <div>
            <h4
              className="text-[12px] uppercase tracking-[0.08em] font-bold mb-[15px] mt-[4px]"
              style={{ color: '#e3eef2' }}
            >
              Platform
            </h4>
            <div className="flex flex-col gap-[11px]">
              <Link href="/features">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Features
                </span>
              </Link>
              <Link href="/workflow">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Workflow
                </span>
              </Link>
              <Link href="/login">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Sign in
                </span>
              </Link>
            </div>
          </div>

          {/* Company links */}
          <div>
            <h4
              className="text-[12px] uppercase tracking-[0.08em] font-bold mb-[15px] mt-[4px]"
              style={{ color: '#e3eef2' }}
            >
              Company
            </h4>
            <div className="flex flex-col gap-[11px]">
              <Link href="/about">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  About
                </span>
              </Link>
              <Link href="/contact">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Contact
                </span>
              </Link>
              <Link href="/medical-disclaimer">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Medical disclaimer
                </span>
              </Link>
            </div>
          </div>

          {/* Legal links */}
          <div>
            <h4
              className="text-[12px] uppercase tracking-[0.08em] font-bold mb-[15px] mt-[4px]"
              style={{ color: '#e3eef2' }}
            >
              Legal
            </h4>
            <div className="flex flex-col gap-[11px]">
              <Link href="/privacy">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Privacy policy
                </span>
              </Link>
              <Link href="/terms">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Terms of use
                </span>
              </Link>
              <Link href="/medical-disclaimer">
                <span className="text-[12px] cursor-pointer hover:text-white transition-colors" style={{ color: '#adbdc8' }}>
                  Medical disclaimer
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer bottom */}
        <div
          className="border-t mt-[47px] pt-[20px] flex flex-col sm:flex-row justify-between gap-[20px] text-[11px]"
          style={{ borderColor: '#36485a', color: '#9fb0bc' }}
        >
          <span>
            © {currentYear} KneeAxis. Project name and ownership details to be confirmed.
          </span>
          <span>
            Research and educational use · Not for clinical decision-making
          </span>
        </div>
      </div>
    </footer>
  );
}

import './auth.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LifeLedger — Authentication',
  description: 'Sign in or create your LifeLedger account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      {/* Left Panel — Marketing / Brand */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-logo">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="40" height="40" rx="10" fill="url(#logo-grad)" />
              <path d="M12 28V12h4v12h8v4H12z" fill="white" />
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#818cf8" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <span className="auth-logo-text">LifeLedger</span>
          </div>

          <h1 className="auth-brand-heading">
            Your Digital Life,
            <br />
            <span className="auth-brand-accent">Organized & Secure</span>
          </h1>

          <p className="auth-brand-description">
            Store, manage, and protect all your important documents in one secure, AI-powered vault.
            From Aadhaar to insurance — never lose a document again.
          </p>

          <div className="auth-brand-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">🔒</div>
              <div>
                <strong>Bank-grade Security</strong>
                <p>End-to-end encryption for all your documents</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">🤖</div>
              <div>
                <strong>AI-Powered OCR</strong>
                <p>Auto-extract data from uploaded documents</p>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">👨‍👩‍👧‍👦</div>
              <div>
                <strong>Family Vault</strong>
                <p>Share documents securely with family members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-container">{children}</div>
      </div>
    </div>
  );
}

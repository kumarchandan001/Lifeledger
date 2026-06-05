'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 0, label: 'Weak', color: 'weak' };
  if (score <= 2) return { level: 1, label: 'Fair', color: 'fair' };
  if (score <= 3) return { level: 2, label: 'Good', color: 'good' };
  return { level: 3, label: 'Strong', color: 'strong' };
}

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      const message = await register({
        email,
        password,
        fullName,
        phone: phone || undefined,
      });
      setSuccessMessage(message);
    } catch {
      // Error is handled by the store
    }
  };

  if (successMessage) {
    return (
      <div className="auth-card">
        <div className="auth-status">
          <div className="auth-status-icon auth-status-icon-success">✉️</div>
          <h3 className="auth-status-title">Check your email</h3>
          <p className="auth-status-message">{successMessage}</p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link href="/login" className="auth-btn auth-btn-primary" style={{ textDecoration: 'none' }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h2 className="auth-card-title">Create your account</h2>
        <p className="auth-card-subtitle">Start organizing your digital life today</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" style={{ marginBottom: '1.25rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="register-name">Full name</label>
          <input
            id="register-name"
            className="auth-input"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
            autoFocus
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-phone">Phone number (optional)</label>
          <input
            id="register-phone"
            className="auth-input"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="register-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="register-password"
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
              tabIndex={-1}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {password && (
            <>
              <div className="password-strength-bar">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`password-strength-segment ${i <= strength.level ? `active-${strength.color}` : ''}`}
                  />
                ))}
              </div>
              <span className="password-strength-label">
                Password strength: {strength.label}
              </span>
            </>
          )}
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={isLoading || !email || !password || !fullName || password.length < 8}
        >
          {isLoading ? <span className="auth-spinner" /> : 'Create account'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <a
          href={`${API_URL}/auth/google`}
          className="auth-btn auth-btn-google"
          style={{ textDecoration: 'none' }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>
      </form>

      <div className="auth-footer">
        Already have an account?{' '}
        <Link href="/login" className="auth-link">Sign in</Link>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-status">
          <div className="auth-status-icon auth-status-icon-error">❌</div>
          <h3 className="auth-status-title">Invalid reset link</h3>
          <p className="auth-status-message">This password reset link is invalid or has expired.</p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link
              href="/forgot-password"
              className="auth-btn auth-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'Reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-card">
        <div className="auth-status">
          <div className="auth-status-icon auth-status-icon-success">🔑</div>
          <h3 className="auth-status-title">Password reset!</h3>
          <p className="auth-status-message">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link
              href="/login"
              className="auth-btn auth-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h2 className="auth-card-title">Reset your password</h2>
        <p className="auth-card-subtitle">Enter your new password below</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" style={{ marginBottom: '1.25rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-password">
            New password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="reset-password"
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
              <span className="password-strength-label">Password strength: {strength.label}</span>
            </>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reset-confirm">
            Confirm password
          </label>
          <input
            id="reset-confirm"
            className={`auth-input ${confirmPassword && password !== confirmPassword ? 'auth-input-error' : ''}`}
            type="password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirmPassword && password !== confirmPassword && (
            <span className="auth-error-text">Passwords do not match</span>
          )}
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={
            isLoading ||
            !password ||
            !confirmPassword ||
            password !== confirmPassword ||
            password.length < 8
          }
        >
          {isLoading ? <span className="auth-spinner" /> : 'Reset password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card">
          <div className="auth-status">
            <div className="auth-status-icon auth-status-icon-loading">
              <span
                className="auth-spinner"
                style={{
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  borderTopColor: '#6366f1',
                  width: 28,
                  height: 28,
                }}
              />
            </div>
            <h3 className="auth-status-title">Loading...</h3>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

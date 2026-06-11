'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.response?.data?.error?.message || 'Something went wrong',
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-card">
        <div className="auth-status">
          <div className="auth-status-icon auth-status-icon-success">📧</div>
          <h3 className="auth-status-title">Check your email</h3>
          <p className="auth-status-message">
            If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset
            link. The link expires in 15 minutes.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link
              href="/login"
              className="auth-btn auth-btn-primary"
              style={{ textDecoration: 'none' }}
            >
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
        <h2 className="auth-card-title">Forgot password?</h2>
        <p className="auth-card-subtitle">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" style={{ marginBottom: '1.25rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="forgot-email">
            Email address
          </label>
          <input
            id="forgot-email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <button type="submit" className="auth-btn auth-btn-primary" disabled={isLoading || !email}>
          {isLoading ? <span className="auth-spinner" /> : 'Send reset link'}
        </button>
      </form>

      <div className="auth-footer">
        Remember your password?{' '}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </div>
    </div>
  );
}

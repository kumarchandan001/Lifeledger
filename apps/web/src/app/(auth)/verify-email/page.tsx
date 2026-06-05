'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verify = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.data.message);
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          error.response?.data?.error?.message ||
          'Verification failed. The token may be invalid or expired.'
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-card">
      <div className="auth-status">
        {status === 'loading' && (
          <>
            <div className="auth-status-icon auth-status-icon-loading">
              <span className="auth-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', width: 28, height: 28 }} />
            </div>
            <h3 className="auth-status-title">Verifying your email...</h3>
            <p className="auth-status-message">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-status-icon auth-status-icon-success">✅</div>
            <h3 className="auth-status-title">Email verified!</h3>
            <p className="auth-status-message">{message}</p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/login" className="auth-btn auth-btn-primary" style={{ textDecoration: 'none' }}>
                Sign in to your account
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-status-icon auth-status-icon-error">❌</div>
            <h3 className="auth-status-title">Verification failed</h3>
            <p className="auth-status-message">{message}</p>
            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/login" className="auth-btn auth-btn-primary" style={{ textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="auth-card">
        <div className="auth-status">
          <div className="auth-status-icon auth-status-icon-loading">
            <span className="auth-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', width: 28, height: 28 }} />
          </div>
          <h3 className="auth-status-title">Loading...</h3>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

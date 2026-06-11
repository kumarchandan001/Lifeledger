'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      localStorage.setItem('lifeledger_access_token', token);
      checkAuth().then(() => {
        router.push('/');
      });
    } else {
      router.push('/login');
    }
  }, [searchParams, router, checkAuth]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid #e5e7eb',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
        }}
      />
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Completing sign in...</p>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
          }}
        >
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { SessionInfo } from '@lifeledger/shared';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/auth/sessions');
      setSessions(response.data.data);
    } catch {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
    } finally {
      setRevokingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="sessions-page">
      <div className="sessions-header">
        <div>
          <h1 className="sessions-title">Active Sessions</h1>
          <p className="sessions-subtitle">
            Manage your active sessions across devices. Revoke any session you don&apos;t recognize.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="sessions-loading">
          <div className="sessions-spinner" />
          <p>Loading sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="sessions-empty">
          <p>No active sessions found.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-card ${session.isCurrent ? 'session-card-current' : ''}`}
            >
              <div className="session-icon">
                {session.deviceName?.includes('iPhone') || session.deviceName?.includes('Android')
                  ? '📱'
                  : '💻'}
              </div>

              <div className="session-info">
                <div className="session-device">
                  {session.deviceName || 'Unknown Device'}
                  {session.isCurrent && <span className="session-current-badge">This device</span>}
                </div>
                <div className="session-meta">
                  <span>{session.ipAddress}</span>
                  <span className="session-meta-dot">·</span>
                  <span>Active {formatDate(session.lastActiveAt)}</span>
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  className="session-revoke-btn"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                >
                  {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sessions-page {
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .sessions-header {
          margin-bottom: 2rem;
        }

        .sessions-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .sessions-subtitle {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        .sessions-loading {
          text-align: center;
          padding: 3rem 0;
          color: #6b7280;
        }

        .sessions-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .sessions-empty {
          text-align: center;
          padding: 3rem 0;
          color: #9ca3af;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .session-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.125rem 1.25rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .session-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .session-card-current {
          border-color: #c7d2fe;
          background: linear-gradient(135deg, #eef2ff, #faf5ff);
        }

        .session-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .session-info {
          flex: 1;
          min-width: 0;
        }

        .session-device {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1a1a2e;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .session-current-badge {
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 100px;
          background: #6366f1;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .session-meta {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 2px;
        }

        .session-meta-dot {
          margin: 0 0.375rem;
        }

        .session-revoke-btn {
          padding: 0.5rem 1rem;
          border: 1.5px solid #fecaca;
          border-radius: 8px;
          background: white;
          color: #dc2626;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .session-revoke-btn:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #f87171;
        }

        .session-revoke-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

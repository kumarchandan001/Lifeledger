'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPE_COLORS } from '@lifeledger/shared';
import './notifications.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

type FilterTab =
  | 'all'
  | 'UNREAD'
  | 'EXPIRY_WARNING'
  | 'DOCUMENT_EXPIRED'
  | 'SECURITY_ALERT'
  | 'SYSTEM_NOTIFICATION';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'EXPIRY_WARNING', label: 'Expiry Warnings' },
  { key: 'DOCUMENT_EXPIRED', label: 'Expired' },
  { key: 'SECURITY_ALERT', label: 'Security' },
  { key: 'SYSTEM_NOTIFICATION', label: 'System' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const limit = 15;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit,
        sortOrder: 'desc',
      };

      if (activeFilter === 'UNREAD') {
        params.status = 'UNREAD';
      } else if (activeFilter !== 'all') {
        params.type = activeFilter;
      }

      const res = await api.get('/notifications', { params });
      setNotifications(res.data?.notifications ?? []);
      setTotal(res.data?.total ?? 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n,
        ),
      );
    } catch {
      // silently ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'READ', readAt: new Date().toISOString() })),
      );
    } catch {
      // silently ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      // silently ignore
    }
  };

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EXPIRY_WARNING':
        return '⏰';
      case 'DOCUMENT_EXPIRED':
        return '🚨';
      case 'SECURITY_ALERT':
        return '🔒';
      case 'ACCOUNT_ACTIVITY':
        return '👤';
      case 'SYSTEM_NOTIFICATION':
        return '📢';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(total / limit);
  const hasUnread = notifications.some((n) => n.status === 'UNREAD');

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <h2>Notifications</h2>
        {hasUnread && (
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
            onClick={() => handleFilterChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="notifications-loading">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="notifications-empty-icon">🔔</div>
          <h3>No notifications</h3>
          <p>
            {activeFilter === 'all'
              ? "You're all caught up! No notifications to display."
              : `No ${FILTER_TABS.find((t) => t.key === activeFilter)?.label?.toLowerCase() ?? ''} notifications.`}
          </p>
        </div>
      ) : (
        <>
          <div className="notification-list">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-card ${n.status === 'UNREAD' ? 'unread' : ''}`}
              >
                <div
                  className="notif-icon"
                  style={{
                    background: (NOTIFICATION_TYPE_COLORS[n.type] ?? '#6366f1') + '15',
                  }}
                >
                  {getNotificationIcon(n.type)}
                </div>

                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-message">{n.message}</div>
                  <div className="notif-meta">
                    <span className="notif-time">{getTimeAgo(n.createdAt)}</span>
                    <span
                      className="notif-type-badge"
                      style={{
                        background: (NOTIFICATION_TYPE_COLORS[n.type] ?? '#6366f1') + '15',
                        color: NOTIFICATION_TYPE_COLORS[n.type] ?? '#6366f1',
                      }}
                    >
                      {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </div>
                </div>

                <div className="notif-actions">
                  {n.status === 'UNREAD' && (
                    <button
                      className="notif-action-btn read-btn"
                      onClick={() => handleMarkAsRead(n.id)}
                      title="Mark as read"
                    >
                      ✓ Read
                    </button>
                  )}
                  <button
                    className="notif-action-btn delete-btn"
                    onClick={() => handleDelete(n.id)}
                    title="Delete"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

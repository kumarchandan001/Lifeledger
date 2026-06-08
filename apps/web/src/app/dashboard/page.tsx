'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ExpiringDocument, NotificationSummary } from '@lifeledger/shared';

interface ExpiredDocument {
  id: string;
  title: string;
  categoryName: string;
  categoryIcon: string;
  expiryDate: string;
}

export default function DashboardPage() {
  const [expiringSoon, setExpiringSoon] = useState<ExpiringDocument[]>([]);
  const [recentlyExpired, setRecentlyExpired] = useState<ExpiredDocument[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    totalNotifications: 0,
    unreadNotifications: 0,
    expiringThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [expiringRes, expiredRes, summaryRes] = await Promise.all([
          api.get('/expiry/expiring-soon'),
          api.get('/expiry/recently-expired'),
          api.get('/expiry/summary'),
        ]);

        setExpiringSoon(expiringRes.data ?? []);
        setRecentlyExpired(expiredRes.data ?? []);
        setSummary(summaryRes.data ?? {
          totalNotifications: 0,
          unreadNotifications: 0,
          expiringThisMonth: 0,
        });
      } catch {
        // silently ignore dashboard data fetch errors
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getDaysLabel = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const getDaysBadgeClass = (days: number) => {
    if (days <= 7) return 'badge-urgent';
    if (days <= 30) return 'badge-warning';
    return 'badge-notice';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="dashboard-grid">
        <div className="dashboard-widget">
          <div className="widget-header">
            <span className="widget-title">Total Notifications</span>
            <div className="widget-icon" style={{ background: '#eff6ff' }}>🔔</div>
          </div>
          <div className="widget-value">{summary.totalNotifications}</div>
          <div className="widget-subtitle">All time notifications</div>
        </div>

        <div className="dashboard-widget">
          <div className="widget-header">
            <span className="widget-title">Unread</span>
            <div className="widget-icon" style={{ background: '#fef2f2' }}>📬</div>
          </div>
          <div className="widget-value" style={{ color: summary.unreadNotifications > 0 ? '#dc2626' : undefined }}>
            {summary.unreadNotifications}
          </div>
          <div className="widget-subtitle">Pending notifications</div>
        </div>

        <div className="dashboard-widget">
          <div className="widget-header">
            <span className="widget-title">Expiring This Month</span>
            <div className="widget-icon" style={{ background: '#fffbeb' }}>⏰</div>
          </div>
          <div className="widget-value" style={{ color: summary.expiringThisMonth > 0 ? '#d97706' : undefined }}>
            {summary.expiringThisMonth}
          </div>
          <div className="widget-subtitle">Documents expiring soon</div>
        </div>
      </div>

      {/* Detail Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Expiring Soon */}
        <div className="dashboard-widget">
          <div className="widget-header">
            <span className="widget-title">⏰ Expiring Soon</span>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="widget-empty">
              ✅ No documents expiring within 90 days
            </div>
          ) : (
            <div className="widget-table">
              {expiringSoon.map((doc) => (
                <div key={doc.id} className="widget-table-row">
                  <div className="widget-table-icon">{doc.categoryIcon}</div>
                  <div className="widget-table-info">
                    <div className="widget-table-title">{doc.title}</div>
                    <div className="widget-table-subtitle">{doc.categoryName}</div>
                  </div>
                  <span className={`widget-table-badge ${getDaysBadgeClass(doc.daysRemaining)}`}>
                    {getDaysLabel(doc.daysRemaining)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Expired */}
        <div className="dashboard-widget">
          <div className="widget-header">
            <span className="widget-title">🚨 Recently Expired</span>
          </div>
          {recentlyExpired.length === 0 ? (
            <div className="widget-empty">
              ✅ No documents expired recently
            </div>
          ) : (
            <div className="widget-table">
              {recentlyExpired.map((doc) => (
                <div key={doc.id} className="widget-table-row">
                  <div className="widget-table-icon">{doc.categoryIcon}</div>
                  <div className="widget-table-info">
                    <div className="widget-table-title">{doc.title}</div>
                    <div className="widget-table-subtitle">{doc.categoryName}</div>
                  </div>
                  <span className="widget-table-badge badge-expired">
                    {formatDate(doc.expiryDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

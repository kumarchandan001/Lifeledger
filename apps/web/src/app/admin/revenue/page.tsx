'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../../dashboard/billing/billing.css';

interface RevenueAnalytics {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  payingSubscribers: number;
  freeUsers: number;
  trialUsers: number;
  churnRate: number;
  trialConversionRate: number;
  revenueGrowth: number;
  planDistribution: { planName: string; count: number; percentage: number }[];
  statusDistribution: { status: string; count: number }[];
}

interface RecentPayment {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  subscription: {
    user: { id: string; email: string; fullName: string };
    plan: { name: string; displayName: string };
  };
}

const BAR_COLORS = ['bar-blue', 'bar-purple', 'bar-green', 'bar-yellow', 'bar-red', 'bar-gray'];
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bar-green',
  TRIAL: 'bar-yellow',
  PAST_DUE: 'bar-red',
  CANCELLED: 'bar-gray',
  SUSPENDED: 'bar-purple',
  EXPIRED: 'bar-gray',
};

export default function AdminRevenuePage() {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, paymentsRes] = await Promise.all([
        api.get('/billing/admin/analytics'),
        api.get('/billing/admin/payments', { params: { limit: 10 } }),
      ]);
      setAnalytics(analyticsRes.data?.data ?? null);
      setPayments(paymentsRes.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to load analytics. Ensure you have admin access.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="billing-spinner" />
        <p>Loading revenue analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-page">
        <h2 className="billing-section-title">Revenue Dashboard</h2>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#f28b82' }}>
          <span style={{ fontSize: '2.5rem' }}>🔒</span>
          <p style={{ marginTop: '0.75rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const metrics = [
    { label: 'MRR', value: formatCurrency(analytics.mrr), icon: '💰' },
    { label: 'ARR', value: formatCurrency(analytics.arr), icon: '📈' },
    { label: 'Active Subscribers', value: analytics.activeSubscribers.toString(), icon: '👥' },
    { label: 'Paying Users', value: analytics.payingSubscribers.toString(), icon: '💳' },
    { label: 'Free Users', value: analytics.freeUsers.toString(), icon: '🆓' },
    { label: 'Trial Users', value: analytics.trialUsers.toString(), icon: '⏳' },
    {
      label: 'Churn Rate',
      value: `${analytics.churnRate}%`,
      icon: '📉',
      negative: analytics.churnRate > 5,
    },
    {
      label: 'Trial Conversion',
      value: `${analytics.trialConversionRate}%`,
      icon: '🎯',
      positive: analytics.trialConversionRate > 30,
    },
    {
      label: 'Revenue Growth',
      value: `${analytics.revenueGrowth > 0 ? '+' : ''}${analytics.revenueGrowth}%`,
      icon: '🚀',
      positive: analytics.revenueGrowth > 0,
      negative: analytics.revenueGrowth < 0,
    },
  ];

  const maxPlanCount = Math.max(...analytics.planDistribution.map((p) => p.count), 1);
  const totalStatuses = analytics.statusDistribution.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="revenue-page">
      <h2 className="billing-section-title" style={{ fontSize: '1.6rem' }}>
        💰 Revenue Dashboard
      </h2>

      {/* Metric Cards */}
      <div className="revenue-metrics-grid">
        {metrics.map((m) => (
          <div key={m.label} className="revenue-metric-card">
            <div className="metric-label">
              <span style={{ marginRight: '0.3rem' }}>{m.icon}</span>
              {m.label}
            </div>
            <div
              className={`metric-value ${m.positive ? 'positive' : ''} ${m.negative ? 'negative' : ''}`}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Distribution Charts */}
      <div className="distribution-section">
        {/* Plan Distribution */}
        <div className="distribution-card">
          <h3>Plan Distribution</h3>
          <div className="distribution-bars">
            {analytics.planDistribution.map((p, i) => (
              <div key={p.planName} className="distribution-bar-item">
                <div className="distribution-bar-label">
                  <span>{p.planName}</span>
                  <span>{p.count} users ({p.percentage}%)</span>
                </div>
                <div className="distribution-bar-track">
                  <div
                    className={`distribution-bar-fill ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    style={{ width: `${(p.count / maxPlanCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="distribution-card">
          <h3>Status Distribution</h3>
          <div className="distribution-bars">
            {analytics.statusDistribution.map((s) => (
              <div key={s.status} className="distribution-bar-item">
                <div className="distribution-bar-label">
                  <span>{s.status}</span>
                  <span>
                    {s.count} ({((s.count / totalStatuses) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="distribution-bar-track">
                  <div
                    className={`distribution-bar-fill ${STATUS_COLORS[s.status] ?? 'bar-gray'}`}
                    style={{ width: `${(s.count / totalStatuses) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <section className="billing-section">
        <h2 className="billing-section-title">Recent Payments</h2>
        {payments.length === 0 ? (
          <div className="invoices-empty">
            <span style={{ fontSize: '2.5rem' }}>💸</span>
            <p>No payments recorded yet.</p>
          </div>
        ) : (
          <div className="invoices-table-wrapper">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600 }}>
                          {p.subscription?.user?.fullName}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: '#9aa0a6' }}>
                          {p.subscription?.user?.email}
                        </div>
                      </div>
                    </td>
                    <td>{p.subscription?.plan?.displayName ?? '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(Number(p.amount))}</td>
                    <td>{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}</td>
                    <td>
                      <span className={`invoice-status ${p.status === 'COMPLETED' ? 'PAID' : p.status}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

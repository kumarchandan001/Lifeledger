'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../billing.css';

interface UsageSummary {
  storage: { usedBytes: number; usedGb: number; limitGb: number; limitBytes: number; percentage: number };
  documents: { count: number; limit: number; percentage: number };
  ocrCredits: { used: number; limit: number; percentage: number; periodStart: string; periodEnd: string };
  aiCredits: { used: number; limit: number; percentage: number; periodStart: string; periodEnd: string };
  familyMembers: { count: number; limit: number; percentage: number };
  legacyPlans: { count: number; limit: number; percentage: number };
}

interface Entitlements {
  planName: string;
  storageLimitGb: number;
  maxDocuments: number;
  maxFamilyMembers: number;
  maxLegacyPlans: number;
  ocrCreditsMonthly: number;
  aiCreditsMonthly: number;
  features: Record<string, boolean>;
}

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usageRes, entRes] = await Promise.all([
        api.get('/billing/usage'),
        api.get('/billing/entitlements'),
      ]);
      setUsage(usageRes.data?.data ?? null);
      setEntitlements(entRes.data?.data ?? null);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

  const getProgressClass = (pct: number) => {
    if (pct >= 90) return 'progress-danger';
    if (pct >= 70) return 'progress-warning';
    return 'progress-safe';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="billing-spinner" />
        <p>Loading usage data...</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="usage-page">
        <h2 className="billing-section-title">Usage & Limits</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Unable to load usage data.</p>
      </div>
    );
  }

  const usageCards = [
    {
      icon: '💾',
      label: 'Storage',
      current: formatSize(usage.storage.usedBytes),
      limit: usage.storage.limitGb === -1 ? 'Unlimited' : `${usage.storage.limitGb} GB`,
      percentage: usage.storage.percentage,
      unlimited: usage.storage.limitGb === -1,
    },
    {
      icon: '📄',
      label: 'Documents',
      current: usage.documents.count.toString(),
      limit: usage.documents.limit === -1 ? 'Unlimited' : usage.documents.limit.toString(),
      percentage: usage.documents.percentage,
      unlimited: usage.documents.limit === -1,
    },
    {
      icon: '🔍',
      label: 'OCR Credits',
      current: usage.ocrCredits.used.toString(),
      limit: usage.ocrCredits.limit.toString(),
      percentage: usage.ocrCredits.percentage,
      unlimited: false,
    },
    {
      icon: '🤖',
      label: 'AI Credits',
      current: usage.aiCredits.used.toString(),
      limit: usage.aiCredits.limit.toString(),
      percentage: usage.aiCredits.percentage,
      unlimited: false,
    },
    {
      icon: '👨‍👩‍👧‍👦',
      label: 'Family Members',
      current: usage.familyMembers.count.toString(),
      limit: usage.familyMembers.limit.toString(),
      percentage: usage.familyMembers.percentage,
      unlimited: false,
    },
    {
      icon: '🏛️',
      label: 'Legacy Plans',
      current: usage.legacyPlans.count.toString(),
      limit: usage.legacyPlans.limit === -1 ? 'Unlimited' : usage.legacyPlans.limit.toString(),
      percentage: usage.legacyPlans.percentage,
      unlimited: usage.legacyPlans.limit === -1,
    },
  ];

  return (
    <div className="usage-page">
      <h2 className="billing-section-title">Usage & Limits</h2>

      {entitlements && (
        <div className="usage-period-info">
          <span>📋</span>
          <span>
            Current plan: <strong style={{ color: '#8ab4f8' }}>{entitlements.planName.charAt(0).toUpperCase() + entitlements.planName.slice(1)}</strong>
          </span>
          {usage.ocrCredits.periodStart && (
            <>
              <span style={{ margin: '0 0.25rem' }}>•</span>
              <span>
                Billing period: {formatDate(usage.ocrCredits.periodStart)} – {formatDate(usage.ocrCredits.periodEnd)}
              </span>
            </>
          )}
        </div>
      )}

      <div className="usage-cards-grid">
        {usageCards.map((card) => (
          <div key={card.label} className="usage-card">
            <div className="usage-card-header">
              <span className="usage-card-icon">{card.icon}</span>
              <span className="usage-card-label">{card.label}</span>
            </div>

            <div className="usage-card-values">
              <span className="usage-current">{card.current}</span>
              <span className="usage-limit">/ {card.limit}</span>
            </div>

            <div className="usage-progress-container">
              <div
                className={`usage-progress-bar ${card.unlimited ? 'progress-unlimited' : getProgressClass(card.percentage)}`}
                style={{ width: `${card.unlimited ? 10 : Math.max(2, Math.min(100, card.percentage))}%` }}
              />
            </div>

            <div className="usage-percentage">
              {card.unlimited ? '∞' : `${card.percentage}%`}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Entitlements */}
      {entitlements && (
        <section className="billing-section">
          <h2 className="billing-section-title">Feature Entitlements</h2>
          <div className="usage-cards-grid">
            {Object.entries(entitlements.features).map(([feature, enabled]) => (
              <div key={feature} className="usage-card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary, #e8eaed)', fontWeight: 500 }}>
                    {feature
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.7rem',
                      borderRadius: '8px',
                      background: enabled
                        ? 'rgba(52, 168, 83, 0.15)'
                        : 'rgba(154, 160, 166, 0.15)',
                      color: enabled ? '#81c995' : '#9aa0a6',
                      border: `1px solid ${enabled ? 'rgba(52, 168, 83, 0.25)' : 'rgba(154, 160, 166, 0.2)'}`,
                    }}
                  >
                    {enabled ? '✓ Enabled' : '✕ Locked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

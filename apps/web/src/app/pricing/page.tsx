'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import './pricing.css';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  storageLimitGb: number;
  maxDocuments: number;
  maxFamilyMembers: number;
  maxLegacyPlans: number;
  ocrCreditsMonthly: number;
  aiCreditsMonthly: number;
  trialDays: number;
  features: Record<string, boolean>;
}

const FEATURE_LABELS: Record<string, string> = {
  basicOcr: 'Document OCR Scanning',
  basicSearch: 'Smart Search',
  advancedAi: 'Advanced AI Intelligence',
  emergencyAccess: 'Emergency Access System',
  digitalLegacy: 'Digital Legacy Planning',
  prioritySupport: 'Priority Customer Support',
  familyVault: 'Shared Family Vault',
  unlimitedLegacyPlans: 'Unlimited Legacy Plans',
  advancedAnalytics: 'Advanced Analytics',
  sharedVault: 'Shared Document Vault',
  familyCollaboration: 'Family Collaboration Tools',
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/billing/plans')
      .then((res) => setPlans(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="pricing-page">
      {/* Hero */}
      <header className="pricing-hero">
        <Link href="/" className="pricing-logo">
          📒 LifeLedger
        </Link>
        <h1 className="pricing-title">
          Simple, transparent pricing
        </h1>
        <p className="pricing-subtitle">
          Choose the plan that fits your needs. Upgrade or downgrade at any time.
        </p>

        <div className="pricing-cycle-toggle">
          <button
            className={`pricing-cycle-btn ${cycle === 'MONTHLY' ? 'active' : ''}`}
            onClick={() => setCycle('MONTHLY')}
          >
            Monthly
          </button>
          <button
            className={`pricing-cycle-btn ${cycle === 'YEARLY' ? 'active' : ''}`}
            onClick={() => setCycle('YEARLY')}
          >
            Yearly
            <span className="pricing-save-badge">Save 20%</span>
          </button>
        </div>
      </header>

      {/* Plans */}
      {loading ? (
        <div className="pricing-loading">
          <div className="billing-spinner" />
          <p>Loading plans...</p>
        </div>
      ) : (
        <div className="pricing-cards">
          {plans.map((plan) => {
            const price = cycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
            const isPopular = plan.name === 'premium';
            const isFree = plan.priceMonthly === 0;

            return (
              <div
                key={plan.id}
                className={`pricing-card ${isPopular ? 'pricing-card-popular' : ''}`}
              >
                {isPopular && (
                  <div className="pricing-popular-ribbon">✨ Most Popular</div>
                )}

                <div className="pricing-card-header">
                  <h2 className="pricing-plan-name">{plan.displayName}</h2>
                  <p className="pricing-plan-desc">{plan.description}</p>
                </div>

                <div className="pricing-amount-section">
                  <span className="pricing-amount">{formatCurrency(price)}</span>
                  <span className="pricing-period">
                    /{cycle === 'MONTHLY' ? 'month' : 'year'}
                  </span>
                  {plan.trialDays > 0 && (
                    <div className="pricing-trial-label">
                      {plan.trialDays}-day free trial included
                    </div>
                  )}
                </div>

                <div className="pricing-limits">
                  <div className="pricing-limit-row">
                    <span>💾</span>
                    <span>{plan.storageLimitGb} GB Storage</span>
                  </div>
                  <div className="pricing-limit-row">
                    <span>📄</span>
                    <span>
                      {plan.maxDocuments === -1 ? 'Unlimited' : plan.maxDocuments} Documents
                    </span>
                  </div>
                  <div className="pricing-limit-row">
                    <span>🔍</span>
                    <span>{plan.ocrCreditsMonthly} OCR Credits/mo</span>
                  </div>
                  <div className="pricing-limit-row">
                    <span>🤖</span>
                    <span>{plan.aiCreditsMonthly} AI Credits/mo</span>
                  </div>
                  <div className="pricing-limit-row">
                    <span>👨‍👩‍👧‍👦</span>
                    <span>
                      {plan.maxFamilyMembers <= 1
                        ? 'Individual Only'
                        : `Up to ${plan.maxFamilyMembers} Members`}
                    </span>
                  </div>
                  <div className="pricing-limit-row">
                    <span>🏛️</span>
                    <span>
                      {plan.maxLegacyPlans === -1 ? 'Unlimited' : plan.maxLegacyPlans} Legacy Plans
                    </span>
                  </div>
                </div>

                <div className="pricing-features">
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`pricing-feature-row ${enabled ? '' : 'pricing-feature-disabled'}`}
                    >
                      <span className="pricing-feature-check">{enabled ? '✓' : '—'}</span>
                      <span>{FEATURE_LABELS[key] ?? key}</span>
                    </div>
                  ))}
                </div>

                <div className="pricing-cta">
                  <Link
                    href={isFree ? '/register' : '/register'}
                    className={`pricing-cta-btn ${isPopular ? 'pricing-cta-primary' : 'pricing-cta-secondary'}`}
                  >
                    {isFree
                      ? 'Get Started Free'
                      : plan.trialDays > 0
                        ? 'Start Free Trial'
                        : 'Subscribe Now'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      <section className="pricing-faq">
        <h2 className="pricing-faq-title">Frequently Asked Questions</h2>
        <div className="pricing-faq-grid">
          {[
            {
              q: 'Can I switch plans anytime?',
              a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately with pro-rated billing.',
            },
            {
              q: 'What happens when my trial ends?',
              a: "You'll be automatically subscribed to the plan. You can cancel before the trial ends to avoid any charges.",
            },
            {
              q: 'Is my data safe?',
              a: 'All documents are encrypted at rest (AES-256) and in transit (TLS 1.3). We never access your personal documents.',
            },
            {
              q: 'Do you offer refunds?',
              a: "Yes, we offer a 30-day money-back guarantee. Contact support if you're not satisfied.",
            },
          ].map(({ q, a }) => (
            <div key={q} className="pricing-faq-item">
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pricing-footer">
        <p>
          © {new Date().getFullYear()} LifeLedger. All rights reserved.
          <Link href="/login" style={{ color: '#8ab4f8', marginLeft: '1rem' }}>
            Sign In
          </Link>
        </p>
      </footer>
    </div>
  );
}

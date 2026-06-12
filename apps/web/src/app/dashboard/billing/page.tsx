'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import './billing.css';

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

interface Subscription {
  id: string;
  plan: Plan;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

interface Activity {
  id: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, subRes, actRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/subscription'),
        api.get('/billing/activity'),
      ]);
      setPlans(plansRes.data?.data ?? []);
      setSubscription(subRes.data?.data ?? null);
      setActivities(actRes.data?.data?.activities ?? []);
    } catch {
      // If not authenticated, plans may still load
      try {
        const plansRes = await api.get('/billing/plans');
        setPlans(plansRes.data?.data ?? []);
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = async (planId: string) => {
    setActionLoading(planId);
    try {
      await api.post('/billing/subscribe', { planId, billingCycle: selectedCycle });
      showToast('Successfully subscribed!', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to subscribe', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (planId: string) => {
    setActionLoading(planId);
    try {
      await api.post('/billing/change-plan', { planId, billingCycle: selectedCycle });
      showToast('Plan changed successfully!', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to change plan', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    setActionLoading('cancel');
    try {
      await api.post('/billing/cancel', { reason: cancelReason || undefined });
      showToast('Subscription cancelled', 'success');
      setCancelDialogOpen(false);
      setCancelReason('');
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to cancel', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading('reactivate');
    try {
      await api.post('/billing/reactivate');
      showToast('Subscription reactivated!', 'success');
      await fetchData();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Failed to reactivate', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'badge-active',
      TRIAL: 'badge-trial',
      PAST_DUE: 'badge-warning',
      CANCELLED: 'badge-cancelled',
      SUSPENDED: 'badge-warning',
      EXPIRED: 'badge-cancelled',
    };
    return map[status] ?? 'badge-default';
  };

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="billing-spinner" />
        <p>Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="billing-page">
      {toast && (
        <div className={`billing-toast billing-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.message}
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <section className="billing-section">
          <h2 className="billing-section-title">Current Subscription</h2>
          <div className="subscription-card">
            <div className="subscription-header">
              <div className="subscription-plan-info">
                <h3>{subscription.plan.displayName}</h3>
                <span className={`subscription-badge ${statusBadge(subscription.status)}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="subscription-price">
                <span className="price-amount">
                  {formatCurrency(
                    subscription.billingCycle === 'MONTHLY'
                      ? subscription.plan.priceMonthly
                      : subscription.plan.priceYearly,
                  )}
                </span>
                <span className="price-cycle">
                  /{subscription.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                </span>
              </div>
            </div>

            <div className="subscription-details-grid">
              <div className="subscription-detail">
                <span className="detail-label">Billing Cycle</span>
                <span className="detail-value">{subscription.billingCycle}</span>
              </div>
              <div className="subscription-detail">
                <span className="detail-label">Current Period</span>
                <span className="detail-value">
                  {formatDate(subscription.currentPeriodStart)} -{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
              {subscription.trialEndsAt && (
                <div className="subscription-detail">
                  <span className="detail-label">Trial Ends</span>
                  <span className="detail-value">{formatDate(subscription.trialEndsAt)}</span>
                </div>
              )}
              {subscription.cancelledAt && (
                <div className="subscription-detail">
                  <span className="detail-label">Cancelled On</span>
                  <span className="detail-value">{formatDate(subscription.cancelledAt)}</span>
                </div>
              )}
            </div>

            <div className="subscription-actions">
              {subscription.status === 'CANCELLED' ? (
                <button
                  className="btn btn-primary"
                  onClick={handleReactivate}
                  disabled={actionLoading === 'reactivate'}
                >
                  {actionLoading === 'reactivate' ? 'Reactivating...' : '↻ Reactivate'}
                </button>
              ) : (
                <button
                  className="btn btn-danger-outline"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Plans */}
      <section className="billing-section">
        <div className="plans-header">
          <h2 className="billing-section-title">
            {subscription ? 'Change Plan' : 'Choose a Plan'}
          </h2>
          <div className="cycle-toggle">
            <button
              className={`cycle-btn ${selectedCycle === 'MONTHLY' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('MONTHLY')}
            >
              Monthly
            </button>
            <button
              className={`cycle-btn ${selectedCycle === 'YEARLY' ? 'active' : ''}`}
              onClick={() => setSelectedCycle('YEARLY')}
            >
              Yearly
              <span className="save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="plans-grid">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan?.id === plan.id;
            const price =
              selectedCycle === 'MONTHLY' ? plan.priceMonthly : plan.priceYearly;
            const isPopular = plan.name === 'premium';

            return (
              <div
                key={plan.id}
                className={`plan-card ${isCurrent ? 'plan-current' : ''} ${isPopular ? 'plan-popular' : ''}`}
              >
                {isPopular && <div className="plan-popular-badge">Most Popular</div>}
                {isCurrent && <div className="plan-current-badge">Current Plan</div>}

                <div className="plan-card-header">
                  <h3 className="plan-name">{plan.displayName}</h3>
                  <p className="plan-description">{plan.description}</p>
                </div>

                <div className="plan-pricing">
                  <span className="plan-price">{formatCurrency(price)}</span>
                  <span className="plan-cycle">
                    /{selectedCycle === 'MONTHLY' ? 'month' : 'year'}
                  </span>
                  {plan.trialDays > 0 && (
                    <div className="plan-trial-badge">{plan.trialDays}-day free trial</div>
                  )}
                </div>

                <ul className="plan-features">
                  <li>
                    <span className="feature-icon">💾</span>
                    {plan.storageLimitGb} GB Storage
                  </li>
                  <li>
                    <span className="feature-icon">📄</span>
                    {plan.maxDocuments === -1 ? 'Unlimited' : plan.maxDocuments} Documents
                  </li>
                  <li>
                    <span className="feature-icon">🔍</span>
                    {plan.ocrCreditsMonthly} OCR Credits/mo
                  </li>
                  <li>
                    <span className="feature-icon">🤖</span>
                    {plan.aiCreditsMonthly} AI Credits/mo
                  </li>
                  <li>
                    <span className="feature-icon">👨‍👩‍👧‍👦</span>
                    {plan.maxFamilyMembers === 1
                      ? 'Individual Only'
                      : `Up to ${plan.maxFamilyMembers} Family Members`}
                  </li>
                  <li>
                    <span className="feature-icon">🏛️</span>
                    {plan.maxLegacyPlans === -1 ? 'Unlimited' : plan.maxLegacyPlans} Legacy Plans
                  </li>
                  {plan.features.advancedAi && (
                    <li>
                      <span className="feature-icon">✨</span>
                      Advanced AI Intelligence
                    </li>
                  )}
                  {plan.features.emergencyAccess && (
                    <li>
                      <span className="feature-icon">🚨</span>
                      Emergency Access
                    </li>
                  )}
                  {plan.features.prioritySupport && (
                    <li>
                      <span className="feature-icon">⚡</span>
                      Priority Support
                    </li>
                  )}
                  {plan.features.familyVault && (
                    <li>
                      <span className="feature-icon">🔒</span>
                      Shared Family Vault
                    </li>
                  )}
                </ul>

                <div className="plan-cta">
                  {isCurrent ? (
                    <button className="btn btn-current" disabled>
                      Current Plan
                    </button>
                  ) : plan.priceMonthly === 0 ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        subscription
                          ? handleChangePlan(plan.id)
                          : handleSubscribe(plan.id)
                      }
                      disabled={!!actionLoading}
                    >
                      {actionLoading === plan.id ? 'Processing...' : 'Get Started Free'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        subscription
                          ? handleChangePlan(plan.id)
                          : handleSubscribe(plan.id)
                      }
                      disabled={!!actionLoading}
                    >
                      {actionLoading === plan.id
                        ? 'Processing...'
                        : subscription
                          ? `Switch to ${plan.displayName}`
                          : `Start ${plan.trialDays > 0 ? 'Free Trial' : 'Now'}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Activity Log */}
      {activities.length > 0 && (
        <section className="billing-section">
          <h2 className="billing-section-title">Recent Activity</h2>
          <div className="activity-list">
            {activities.map((a) => (
              <div key={a.id} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-info">
                  <p className="activity-action">{a.action}</p>
                  <p className="activity-date">{formatDate(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cancel Dialog */}
      {cancelDialogOpen && (
        <div className="billing-dialog-overlay" onClick={() => setCancelDialogOpen(false)}>
          <div className="billing-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Subscription</h3>
            <p>
              Are you sure you want to cancel? You'll continue to have access until the end of your
              current billing period.
            </p>
            <textarea
              className="cancel-reason-input"
              placeholder="Tell us why you're cancelling (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setCancelDialogOpen(false)}
              >
                Keep Subscription
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

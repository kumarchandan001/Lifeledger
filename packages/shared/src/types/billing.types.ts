// ═══════════════════════════════════════════════════
// Billing & Subscription Types
// ═══════════════════════════════════════════════════

export type SubscriptionStatusType =
  | 'ACTIVE'
  | 'TRIAL'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'EXPIRED';

export type BillingCycleType = 'MONTHLY' | 'YEARLY';

export type PaymentStatusType = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export type InvoiceStatusType = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'REFUNDED';

export type UsageTypeKey =
  | 'OCR_CREDIT'
  | 'AI_CREDIT'
  | 'STORAGE_BYTE'
  | 'DOCUMENT_COUNT'
  | 'FAMILY_MEMBER'
  | 'LEGACY_PLAN'
  | 'EMERGENCY_SESSION';

export type BillingEventTypeKey =
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILURE'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_REACTIVATED'
  | 'TRIAL_STARTED'
  | 'TRIAL_ENDED'
  | 'INVOICE_GENERATED'
  | 'REFUND_ISSUED'
  | 'PLAN_UPGRADED'
  | 'PLAN_DOWNGRADED';

// ─── Plan ───

export interface SubscriptionPlanResponse {
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
  entitlements: PlanEntitlementResponse[];
}

export interface PlanEntitlementResponse {
  feature: string;
  enabled: boolean;
  limitValue: number | null;
}

// ─── Subscription ───

export interface SubscriptionResponse {
  id: string;
  userId: string;
  plan: SubscriptionPlanResponse;
  status: SubscriptionStatusType;
  billingCycle: BillingCycleType;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
}

// ─── Usage ───

export interface UsageSummaryResponse {
  storage: {
    usedBytes: number;
    usedGb: number;
    limitGb: number;
    limitBytes: number;
    percentage: number;
  };
  documents: {
    count: number;
    limit: number;
    percentage: number;
  };
  ocrCredits: {
    used: number;
    limit: number;
    percentage: number;
    periodStart: string;
    periodEnd: string;
  };
  aiCredits: {
    used: number;
    limit: number;
    percentage: number;
    periodStart: string;
    periodEnd: string;
  };
  familyMembers: {
    count: number;
    limit: number;
    percentage: number;
  };
  legacyPlans: {
    count: number;
    limit: number;
    percentage: number;
  };
}

// ─── Invoice ───

export interface InvoiceResponse {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatusType;
  description: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  pdfUrl: string | null;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
}

// ─── Payment Method ───

export interface PaymentMethodResponse {
  id: string;
  type: string;
  provider: string;
  last4: string | null;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

// ─── Revenue Analytics (Admin) ───

export interface RevenueAnalyticsResponse {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  payingSubscribers: number;
  freeUsers: number;
  trialUsers: number;
  churnRate: number;
  trialConversionRate: number;
  revenueGrowth: number;
  planDistribution: {
    planName: string;
    count: number;
    percentage: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
}

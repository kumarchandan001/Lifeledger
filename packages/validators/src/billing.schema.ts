import { z } from 'zod';

// ─── Subscribe / Upgrade / Downgrade ───

export const subscribeSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const changePlanSchema = z.object({
  planId: z.string().uuid(),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
});
export type ChangePlanInput = z.infer<typeof changePlanSchema>;

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(1000).optional(),
});
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// ─── Payment Method ───

export const addPaymentMethodSchema = z.object({
  providerMethodId: z.string().min(1),
  type: z.enum(['CARD', 'UPI', 'NET_BANKING', 'WALLET']).default('CARD'),
  last4: z.string().length(4).optional(),
  brand: z.string().max(50).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).optional(),
  isDefault: z.boolean().optional(),
});
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

// ─── Analytics Query ───

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
});
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

// ─── Usage Query ───

export const usageQuerySchema = z.object({
  type: z
    .enum([
      'OCR_CREDIT',
      'AI_CREDIT',
      'STORAGE_BYTE',
      'DOCUMENT_COUNT',
      'FAMILY_MEMBER',
      'LEGACY_PLAN',
      'EMERGENCY_SESSION',
    ])
    .optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type UsageQueryInput = z.infer<typeof usageQuerySchema>;

// ─── Invoice Query ───

export const invoiceQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED']).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;

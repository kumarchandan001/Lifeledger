import { z } from 'zod';

// ─── Query Notifications ───
export const queryNotificationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['UNREAD', 'READ', 'ARCHIVED']).optional(),
  type: z
    .enum([
      'EXPIRY_WARNING',
      'DOCUMENT_EXPIRED',
      'SECURITY_ALERT',
      'SYSTEM_NOTIFICATION',
      'ACCOUNT_ACTIVITY',
      'EMERGENCY',
      'FAMILY',
      'BILLING',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryNotificationsInput = z.infer<typeof queryNotificationsSchema>;

// ─── Update Notification Preferences ───
export const updateNotificationPreferenceSchema = z.object({
  notify90Days: z.boolean().optional(),
  notify60Days: z.boolean().optional(),
  notify30Days: z.boolean().optional(),
  notify7Days: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

// ─── Notification ID Param ───
export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export type NotificationIdParamInput = z.infer<typeof notificationIdParamSchema>;

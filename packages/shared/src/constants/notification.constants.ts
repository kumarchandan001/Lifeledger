// ═══════════════════════════════════════════════════
// Notification Constants
// ═══════════════════════════════════════════════════

import type { ExpiryMilestone, ExpiryWindow } from '../types/notification.types';

/** Expiry milestones in days before expiry */
export const EXPIRY_MILESTONES: ExpiryMilestone[] = [90, 60, 30, 7, 0];

/** Expiry windows with labels for display */
export const EXPIRY_WINDOWS: ExpiryWindow[] = [
  { milestone: 90, label: 'Expiring in 90 Days' },
  { milestone: 60, label: 'Expiring in 60 Days' },
  { milestone: 30, label: 'Expiring in 30 Days' },
  { milestone: 7, label: 'Expiring in 7 Days' },
  { milestone: 0, label: 'Expires Today' },
];

/** Notification type display labels */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  EXPIRY_WARNING: 'Expiry Warning',
  DOCUMENT_EXPIRED: 'Document Expired',
  SECURITY_ALERT: 'Security Alert',
  SYSTEM_NOTIFICATION: 'System',
  ACCOUNT_ACTIVITY: 'Account Activity',
  EMERGENCY: 'Emergency',
  FAMILY: 'Family',
  BILLING: 'Billing',
};

/** Notification type icon colors */
export const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  EXPIRY_WARNING: '#f59e0b',
  DOCUMENT_EXPIRED: '#ef4444',
  SECURITY_ALERT: '#ef4444',
  SYSTEM_NOTIFICATION: '#6366f1',
  ACCOUNT_ACTIVITY: '#10b981',
  EMERGENCY: '#dc2626',
  FAMILY: '#8b5cf6',
  BILLING: '#0ea5e9',
};

/** Notification status display labels */
export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  UNREAD: 'Unread',
  READ: 'Read',
  ARCHIVED: 'Archived',
};

/** Default notification preferences for new users */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  notify90Days: true,
  notify60Days: true,
  notify30Days: true,
  notify7Days: true,
  emailEnabled: true,
  inAppEnabled: true,
} as const;

/**
 * Maps milestone days to the preference field name.
 * Used by the expiry scanner to check if a milestone is enabled.
 */
export const MILESTONE_PREFERENCE_MAP: Record<number, string> = {
  90: 'notify90Days',
  60: 'notify60Days',
  30: 'notify30Days',
  7: 'notify7Days',
  0: 'notify7Days', // "Expires today" uses the 7-day preference
};

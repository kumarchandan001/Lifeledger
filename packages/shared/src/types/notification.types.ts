// ═══════════════════════════════════════════════════
// Notification Types
// ═══════════════════════════════════════════════════

export type NotificationType =
  | 'EXPIRY_WARNING'
  | 'DOCUMENT_EXPIRED'
  | 'SECURITY_ALERT'
  | 'SYSTEM_NOTIFICATION'
  | 'ACCOUNT_ACTIVITY'
  | 'EMERGENCY'
  | 'FAMILY'
  | 'BILLING';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  status: NotificationStatus;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  notify90Days: boolean;
  notify60Days: boolean;
  notify30Days: boolean;
  notify7Days: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceRequest {
  notify90Days?: boolean;
  notify60Days?: boolean;
  notify30Days?: boolean;
  notify7Days?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: NotificationType;
  sortBy?: 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationUnreadCount {
  count: number;
}

// ═══════════════════════════════════════════════════
// Expiry Tracking Types
// ═══════════════════════════════════════════════════

export type ExpiryMilestone = 90 | 60 | 30 | 7 | 0;

export interface ExpiryWindow {
  milestone: ExpiryMilestone;
  label: string;
}

export interface ExpiringDocument {
  id: string;
  title: string;
  categoryName: string;
  categoryIcon: string;
  expiryDate: string;
  daysRemaining: number;
}

export interface NotificationSummary {
  totalNotifications: number;
  unreadNotifications: number;
  expiringThisMonth: number;
}

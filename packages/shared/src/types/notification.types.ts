// ═══════════════════════════════════════════════════
// Notification Types
// ═══════════════════════════════════════════════════

export type NotificationType =
  | 'EXPIRY_WARNING'
  | 'SECURITY_ALERT'
  | 'ACTIVITY'
  | 'SYSTEM'
  | 'EMERGENCY'
  | 'FAMILY'
  | 'BILLING';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  inApp: boolean;
}

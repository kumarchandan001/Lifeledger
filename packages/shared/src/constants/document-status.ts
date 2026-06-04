// ═══════════════════════════════════════════════════
// Document Status Constants
// ═══════════════════════════════════════════════════

export const DOCUMENT_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired',
  ARCHIVED: 'Archived',
};

export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  EXPIRING_SOON: '#f59e0b',
  EXPIRED: '#ef4444',
  ARCHIVED: '#64748b',
};

export const OCR_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

/** Expiry thresholds in days */
export const EXPIRY_THRESHOLDS = {
  URGENT: 7,
  WARNING: 30,
  NOTICE: 90,
} as const;

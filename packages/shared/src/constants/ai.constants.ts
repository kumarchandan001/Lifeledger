// ═══════════════════════════════════════════════════
// AI Document Intelligence Constants
// ═══════════════════════════════════════════════════

/** Confidence thresholds for AI classification results */
export const AI_CONFIDENCE_THRESHOLDS = {
  /** Auto-apply results at or above this threshold */
  HIGH: 95,
  /** Accept with notice — results are reliable but user should verify */
  MEDIUM: 80,
  /** Require human review before applying */
  LOW: 50,
} as const;

export const AI_CONFIDENCE_LABELS: Record<string, { label: string; color: string; icon: string }> =
  {
    HIGH: { label: 'High Confidence', color: '#10b981', icon: '✅' },
    MEDIUM: { label: 'Medium Confidence', color: '#f59e0b', icon: '⚠️' },
    LOW: { label: 'Low Confidence', color: '#ef4444', icon: '❌' },
  };

export const getConfidenceLevel = (confidence: number): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (confidence >= AI_CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
};

/** MIME types supported for AI processing */
export const AI_SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

export const isAISupportedMimeType = (mimeType: string): boolean => {
  return (AI_SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
};

/** Processing configuration defaults */
export const AI_PROCESSING_DEFAULTS = {
  MAX_RETRIES: 3,
  CONCURRENCY: 2,
  JOB_TIMEOUT_MS: 120_000,
  RETRY_DELAY_MS: 1_000,
  POLL_INTERVAL_MS: 10_000,
} as const;

/** Processing job status labels and colors */
export const PROCESSING_STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const PROCESSING_STATUS_COLORS: Record<string, string> = {
  QUEUED: '#64748b',
  PROCESSING: '#3b82f6',
  COMPLETED: '#10b981',
  FAILED: '#ef4444',
  CANCELLED: '#9ca3af',
};

/** AI analysis status labels and colors */
export const AI_ANALYSIS_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  NEEDS_REVIEW: 'Needs Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
};

export const AI_ANALYSIS_STATUS_COLORS: Record<string, string> = {
  PENDING: '#64748b',
  PROCESSING: '#3b82f6',
  COMPLETED: '#10b981',
  NEEDS_REVIEW: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
  FAILED: '#ef4444',
};

// ═══════════════════════════════════════════════════
// Date Utilities
// ═══════════════════════════════════════════════════

import { EXPIRY_THRESHOLDS } from '../constants/document-status';
import type { DocumentStatus } from '../types/document.types';

/**
 * Calculate days until a date from today.
 * Returns negative values for past dates.
 */
export function daysUntil(date: string | Date): number {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine document status based on expiry date.
 */
export function calculateExpiryStatus(expiryDate: string | Date | null): DocumentStatus {
  if (!expiryDate) return 'ACTIVE';

  const days = daysUntil(expiryDate);

  if (days <= 0) return 'EXPIRED';
  if (days <= EXPIRY_THRESHOLDS.NOTICE) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

/**
 * Format a date to a human-readable string.
 */
export function formatDate(date: string | Date, locale = 'en-IN'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date to ISO date string (YYYY-MM-DD).
 */
export function toISODate(date: string | Date): string {
  return new Date(date).toISOString().split('T')[0]!;
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 months").
 */
export function relativeTime(date: string | Date, locale = 'en'): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMs = new Date(date).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffDays) < 1) return rtf.format(0, 'day');
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), 'month');
  return rtf.format(Math.round(diffDays / 365), 'year');
}

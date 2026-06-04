// ═══════════════════════════════════════════════════
// File Utilities
// ═══════════════════════════════════════════════════

import { FILE_LIMITS } from '../constants/limits';

/**
 * Format bytes to human-readable file size.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Check if a MIME type is allowed for upload.
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return (FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Get file extension from filename.
 */
export function getFileExtension(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf('.'));
  return ext.toLowerCase();
}

/**
 * Check if file size is within allowed limit.
 */
export function isAllowedFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= FILE_LIMITS.MAX_FILE_SIZE_BYTES;
}

/**
 * Get a human-readable file type label from MIME type.
 */
export function getFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPEG',
    'image/png': 'PNG',
    'image/heic': 'HEIC',
    'image/webp': 'WebP',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  };
  return typeMap[mimeType] ?? 'File';
}

/**
 * Check if a MIME type represents an image.
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

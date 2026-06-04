// ═══════════════════════════════════════════════════
// Document Types
// ═══════════════════════════════════════════════════

export type DocumentStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type TagSource = 'MANUAL' | 'AI_GENERATED';

export interface Document {
  id: string;
  userId: string;
  familyId: string | null;
  categoryId: string;
  subCategoryId: string | null;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string | null;
  status: DocumentStatus;
  issueDate: string | null;
  expiryDate: string | null;
  documentNumber: string | null;
  issuer: string | null;
  isFavorite: boolean;
  isSensitive: boolean;
  ocrStatus: OcrStatus;
  ocrText: string | null;
  aiSummary: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  subCategory?: SubCategory;
  tags?: DocumentTag[];
}

export interface DocumentTag {
  id: string;
  documentId: string;
  tag: string;
  source: TagSource;
}

export interface CreateDocumentRequest {
  categoryId: string;
  subCategoryId?: string;
  title: string;
  description?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuer?: string;
  isSensitive?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  subCategoryId?: string;
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuer?: string;
  isSensitive?: boolean;
}

export interface DocumentQueryParams {
  page?: number;
  limit?: number;
  categorySlug?: string;
  status?: DocumentStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'expiryDate';
  sortOrder?: 'asc' | 'desc';
  isFavorite?: boolean;
}

export interface UploadUrlRequest {
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  documentId: string;
  key: string;
}

import type { Category, SubCategory } from './category.types';

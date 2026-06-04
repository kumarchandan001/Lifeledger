import { z } from 'zod';

import { FILE_LIMITS } from '@lifeledger/shared';

// ─── Create Document ───
export const createDocumentSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  subCategoryId: z.string().uuid('Invalid sub-category ID').optional(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  fileName: z.string().min(1),
  mimeType: z
    .string()
    .refine((val) => (FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(val), {
      message: 'File type not supported',
    }),
  fileSize: z
    .number()
    .positive()
    .max(FILE_LIMITS.MAX_FILE_SIZE_BYTES, `File must be under ${FILE_LIMITS.MAX_FILE_SIZE_LABEL}`),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  documentNumber: z.string().max(100).optional(),
  issuer: z.string().max(255).optional(),
  isSensitive: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// ─── Update Document ───
export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().uuid().optional(),
  subCategoryId: z.string().uuid().optional().nullable(),
  issueDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  documentNumber: z.string().max(100).optional().nullable(),
  issuer: z.string().max(255).optional().nullable(),
  isSensitive: z.boolean().optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// ─── Query Documents ───
export const queryDocumentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categorySlug: z.string().optional(),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED']).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'expiryDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isFavorite: z.coerce.boolean().optional(),
});

export type QueryDocumentsInput = z.infer<typeof queryDocumentsSchema>;

// ─── Share Document ───
export const shareDocumentSchema = z.object({
  password: z.string().min(4).max(64).optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72), // max 30 days
  maxViews: z.number().int().min(1).max(100).default(10),
});

export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;

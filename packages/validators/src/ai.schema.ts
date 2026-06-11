import { z } from 'zod';

// ─── Start Processing ───
export const startProcessingSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
});

export type StartProcessingInput = z.infer<typeof startProcessingSchema>;

// ─── Approve AI Suggestion ───
export const approveAISuggestionSchema = z.object({
  applyCategory: z.boolean().default(true),
  applyMetadata: z.boolean().default(true),
  applyTags: z.boolean().default(true),
  overrides: z
    .object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(1000).optional(),
      categoryId: z.string().uuid().optional(),
      subCategoryId: z.string().uuid().optional().nullable(),
      documentNumber: z.string().max(100).optional().nullable(),
      issuer: z.string().max(255).optional().nullable(),
      issueDate: z.string().datetime().optional().nullable(),
      expiryDate: z.string().datetime().optional().nullable(),
      tags: z.array(z.string().max(50)).max(30).optional(),
    })
    .optional(),
  reviewNotes: z.string().max(500).optional(),
});

export type ApproveAISuggestionInput = z.infer<typeof approveAISuggestionSchema>;

// ─── Reject AI Suggestion ───
export const rejectAISuggestionSchema = z.object({
  reviewNotes: z.string().max(500).optional(),
});

export type RejectAISuggestionInput = z.infer<typeof rejectAISuggestionSchema>;

// ─── Query Processing Jobs ───
export const queryProcessingJobsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  type: z
    .enum([
      'OCR_EXTRACTION',
      'AI_CLASSIFICATION',
      'AI_METADATA_EXTRACTION',
      'AI_TAG_GENERATION',
      'FULL_PIPELINE',
    ])
    .optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'completedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryProcessingJobsInput = z.infer<typeof queryProcessingJobsSchema>;

// ═══════════════════════════════════════════════════
// AI Document Intelligence Types
// ═══════════════════════════════════════════════════

export type AIAnalysisStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

export type ProcessingJobType =
  | 'OCR_EXTRACTION'
  | 'AI_CLASSIFICATION'
  | 'AI_METADATA_EXTRACTION'
  | 'AI_TAG_GENERATION'
  | 'FULL_PIPELINE';

export type ProcessingJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// ─── OCR ───

export interface OCRResultResponse {
  id: string;
  documentId: string;
  extractedText: string;
  textBlocks: unknown[];
  tables: unknown[];
  confidence: number;
  pageCount: number;
  language: string;
  processingTime: number;
  createdAt: string;
}

// ─── AI Analysis ───

export interface AIClassificationResult {
  category: string;
  categorySlug: string;
  subcategory: string | null;
  subcategorySlug: string | null;
  confidence: number;
}

export interface AIMetadataExtraction {
  title: string | null;
  description: string | null;
  documentNumber: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  tags: string[];
}

export interface AIAnalysisResponse {
  id: string;
  documentId: string;
  suggestedCategory: string | null;
  suggestedSubCategory: string | null;
  categoryConfidence: number;
  extractedMetadata: AIMetadataExtraction;
  generatedTags: string[];
  aiSummary: string | null;
  status: AIAnalysisStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
  processingTime: number;
  modelVersion: string;
  createdAt: string;
}

// ─── Processing Jobs ───

export interface ProcessingJobResponse {
  id: string;
  documentId: string;
  userId: string;
  type: ProcessingJobType;
  status: ProcessingJobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ProcessingStatusSummary {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  needsReview: number;
  totalProcessed: number;
}

// ─── Requests ───

export interface StartProcessingRequest {
  documentId: string;
}

export interface ApproveAISuggestionRequest {
  applyCategory?: boolean;
  applyMetadata?: boolean;
  applyTags?: boolean;
  overrides?: {
    title?: string;
    description?: string;
    categoryId?: string;
    subCategoryId?: string;
    documentNumber?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    tags?: string[];
  };
  reviewNotes?: string;
}

// ─── Document Intelligence View ───

export interface DocumentIntelligenceResponse {
  document: {
    id: string;
    title: string;
    mimeType: string;
    ocrStatus: string;
    createdAt: string;
  };
  ocrResult: OCRResultResponse | null;
  aiAnalysis: AIAnalysisResponse | null;
  processingJobs: ProcessingJobResponse[];
  processingStatus: ProcessingJobStatus | null;
}

// ─── Review Queue Item ───

export interface ReviewQueueItem {
  documentId: string;
  documentTitle: string;
  categoryName: string;
  categoryIcon: string;
  suggestedCategory: string | null;
  categoryConfidence: number;
  aiStatus: AIAnalysisStatus;
  createdAt: string;
}

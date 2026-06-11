import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { OcrService } from '../ocr/ocr.service';
import { AiService } from '../ai/ai.service';
import { AuditAction, AIAnalysisStatus, ProcessingJobType } from '@lifeledger/database';
import { isAISupportedMimeType, CATEGORIES, SUB_CATEGORIES } from '@lifeledger/shared';
import { ApproveAISuggestionDto, RejectAISuggestionDto } from './dto/document-intelligence.dto';

@Injectable()
export class DocumentIntelligenceService {
  private readonly logger = new Logger(DocumentIntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly ocrService: OcrService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Start AI processing pipeline for a document.
   */
  async startProcessing(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!isAISupportedMimeType(document.mimeType)) {
      throw new BadRequestException(
        `File type ${document.mimeType} is not supported for AI processing. Supported types: PDF, JPG, JPEG, PNG`,
      );
    }

    // Enqueue processing
    const jobId = await this.queueService.enqueueDocumentProcessing(
      documentId,
      userId,
      document.fileUrl,
      document.mimeType,
      ProcessingJobType.FULL_PIPELINE,
    );

    await this.auditService.log({
      userId,
      action: AuditAction.AI_PROCESSING_START,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      details: { title: document.title, jobId },
      ipAddress,
      userAgent,
    });

    return {
      jobId,
      documentId,
      status: 'QUEUED',
      message: 'Document processing has been queued',
    };
  }

  /**
   * Get the current processing status for a document.
   */
  async getProcessingStatus(documentId: string, userId: string): Promise<any> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      select: { id: true, title: true, ocrStatus: true, mimeType: true, createdAt: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get latest processing jobs for this document
    const processingJobs = await this.prisma.processingJob.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const ocrResult = await this.ocrService.getOCRResult(documentId);
    const aiAnalysis = await this.aiService.getAIAnalysis(documentId);

    const latestJob = processingJobs[0];

    return {
      document: {
        id: document.id,
        title: document.title,
        mimeType: document.mimeType,
        ocrStatus: document.ocrStatus,
        createdAt: document.createdAt,
      },
      ocrResult: ocrResult
        ? {
            id: ocrResult.id,
            documentId: ocrResult.documentId,
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            pageCount: ocrResult.pageCount,
            language: ocrResult.language,
            processingTime: ocrResult.processingTime,
            createdAt: ocrResult.createdAt,
          }
        : null,
      aiAnalysis: aiAnalysis
        ? {
            id: aiAnalysis.id,
            documentId: aiAnalysis.documentId,
            suggestedCategory: aiAnalysis.suggestedCategory,
            suggestedSubCategory: aiAnalysis.suggestedSubCategory,
            categoryConfidence: aiAnalysis.categoryConfidence,
            extractedMetadata: aiAnalysis.extractedMetadata,
            generatedTags: aiAnalysis.generatedTags,
            aiSummary: aiAnalysis.aiSummary,
            status: aiAnalysis.status,
            reviewedAt: aiAnalysis.reviewedAt,
            reviewNotes: aiAnalysis.reviewNotes,
            processingTime: aiAnalysis.processingTime,
            modelVersion: aiAnalysis.modelVersion,
            createdAt: aiAnalysis.createdAt,
          }
        : null,
      processingJobs: processingJobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        attempts: j.attempts,
        error: j.error,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
        createdAt: j.createdAt,
      })),
      processingStatus: latestJob?.status || null,
    };
  }

  /**
   * Get OCR results for a document.
   */
  async getOCRResults(documentId: string, userId: string): Promise<any> {
    await this.ensureDocumentOwnership(documentId, userId);

    const result = await this.ocrService.getOCRResult(documentId);
    if (!result) {
      throw new NotFoundException('OCR results not available for this document');
    }
    return result;
  }

  /**
   * Get AI analysis results for a document.
   */
  async getAIAnalysis(documentId: string, userId: string): Promise<any> {
    await this.ensureDocumentOwnership(documentId, userId);

    const analysis = await this.aiService.getAIAnalysis(documentId);
    if (!analysis) {
      throw new NotFoundException('AI analysis not available for this document');
    }
    return analysis;
  }

  /**
   * Approve AI suggestions and apply them to the document.
   */
  async approveAISuggestions(
    documentId: string,
    userId: string,
    dto: ApproveAISuggestionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.ensureDocumentOwnership(documentId, userId);
    const analysis = await this.aiService.getAIAnalysis(documentId);

    if (!analysis) {
      throw new NotFoundException('AI analysis not available');
    }

    if (analysis.status === AIAnalysisStatus.APPROVED) {
      throw new BadRequestException('AI suggestions already approved');
    }

    const updateData: any = {};
    const metadata = analysis.extractedMetadata as any;

    // Apply category if requested
    if (dto.applyCategory && analysis.suggestedCategory) {
      const category = CATEGORIES.find((c) => c.slug === analysis.suggestedCategory);
      if (category) {
        // Look up the category ID from the database
        const dbCategory = await this.prisma.category.findFirst({
          where: { slug: category.slug },
        });
        if (dbCategory) {
          updateData.categoryId = dto.overrides?.categoryId || dbCategory.id;
        }

        // Look up subcategory if available
        if (analysis.suggestedSubCategory) {
          const dbSubCategory = await this.prisma.subCategory.findFirst({
            where: {
              slug: analysis.suggestedSubCategory,
              categoryId: updateData.categoryId || dbCategory?.id,
            },
          });
          if (dbSubCategory) {
            updateData.subCategoryId = dto.overrides?.subCategoryId || dbSubCategory.id;
          }
        }
      }
    }

    // Apply metadata if requested
    if (dto.applyMetadata && metadata) {
      if (dto.overrides?.title || metadata.title) {
        updateData.title = dto.overrides?.title || metadata.title;
      }
      if (dto.overrides?.description || metadata.description) {
        updateData.description = dto.overrides?.description || metadata.description;
      }
      if (dto.overrides?.documentNumber !== undefined || metadata.documentNumber) {
        updateData.documentNumber =
          dto.overrides?.documentNumber ?? metadata.documentNumber ?? null;
      }
      if (dto.overrides?.issuer !== undefined || metadata.issuer) {
        updateData.issuer = dto.overrides?.issuer ?? metadata.issuer ?? null;
      }
      if (dto.overrides?.issueDate !== undefined || metadata.issueDate) {
        const dateVal = dto.overrides?.issueDate ?? metadata.issueDate;
        updateData.issueDate = dateVal ? new Date(dateVal) : null;
      }
      if (dto.overrides?.expiryDate !== undefined || metadata.expiryDate) {
        const dateVal = dto.overrides?.expiryDate ?? metadata.expiryDate;
        updateData.expiryDate = dateVal ? new Date(dateVal) : null;
      }
    }

    // Apply the updates in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update document
      if (Object.keys(updateData).length > 0) {
        await tx.document.update({
          where: { id: documentId },
          data: updateData,
        });
      }

      // Apply tags if requested
      if (dto.applyTags) {
        const tags =
          dto.overrides?.tags ||
          (Array.isArray(analysis.generatedTags) ? (analysis.generatedTags as string[]) : []);

        if (tags.length > 0) {
          const existingTags = await tx.documentTag.findMany({
            where: { documentId },
            select: { tag: true },
          });
          const existingSet = new Set(existingTags.map((t) => t.tag.toLowerCase()));
          const newTags = tags.filter((t) => !existingSet.has(t.toLowerCase()));

          if (newTags.length > 0) {
            await tx.documentTag.createMany({
              data: newTags.map((tag) => ({
                documentId,
                tag,
                createdBy: userId,
                source: 'AI_GENERATED' as const,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      // Update AI analysis status
      await tx.aIAnalysis.update({
        where: { documentId },
        data: {
          status: AIAnalysisStatus.APPROVED,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes || null,
        },
      });

      // Update document metadata with AI extracted fields
      if (dto.applyMetadata && metadata) {
        await tx.documentMetadata.upsert({
          where: { documentId },
          create: {
            documentId,
            extractedFields: metadata,
            confidenceScores: {
              category: analysis.categoryConfidence,
            },
          },
          update: {
            extractedFields: metadata,
            confidenceScores: {
              category: analysis.categoryConfidence,
            },
          },
        });
      }
    });

    await this.auditService.log({
      userId,
      action: AuditAction.AI_SUGGESTION_APPROVED,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      details: {
        title: document.title,
        appliedCategory: dto.applyCategory,
        appliedMetadata: dto.applyMetadata,
        appliedTags: dto.applyTags,
        overrides: dto.overrides ? Object.keys(dto.overrides) : [],
      },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'AI suggestions approved and applied',
      documentId,
    };
  }

  /**
   * Reject AI suggestions.
   */
  async rejectAISuggestions(
    documentId: string,
    userId: string,
    dto: RejectAISuggestionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.ensureDocumentOwnership(documentId, userId);
    const analysis = await this.aiService.getAIAnalysis(documentId);

    if (!analysis) {
      throw new NotFoundException('AI analysis not available');
    }

    await this.prisma.aIAnalysis.update({
      where: { documentId },
      data: {
        status: AIAnalysisStatus.REJECTED,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes || null,
      },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.AI_SUGGESTION_REJECTED,
      resourceType: 'DOCUMENT',
      resourceId: documentId,
      details: { title: document.title, reviewNotes: dto.reviewNotes },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'AI suggestions rejected',
      documentId,
    };
  }

  /**
   * Reprocess a document (re-run the full AI pipeline).
   */
  async reprocessDocument(
    documentId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.startProcessing(documentId, userId, ipAddress, userAgent);
  }

  /**
   * Get processing dashboard summary for the current user.
   */
  async getProcessingSummary(userId: string) {
    return this.queueService.getProcessingSummary(userId);
  }

  /**
   * Get paginated list of processing jobs for the current user.
   */
  async getProcessingJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: any;
      type?: any;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<any> {
    return this.queueService.getUserJobs(userId, options);
  }

  /**
   * Get documents needing human review.
   */
  async getReviewQueue(userId: string, page = 1, limit = 20): Promise<any> {
    return this.queueService.getReviewQueue(userId, page, limit);
  }

  // ─── Private Helpers ───

  private async ensureDocumentOwnership(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }
}

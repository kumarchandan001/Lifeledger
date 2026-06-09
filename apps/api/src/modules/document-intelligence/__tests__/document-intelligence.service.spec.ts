import { Test, TestingModule } from '@nestjs/testing';
import { DocumentIntelligenceService } from '../document-intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '../../queue/queue.service';
import { OcrService } from '../../ocr/ocr.service';
import { AiService } from '../../ai/ai.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AIAnalysisStatus, ProcessingJobType } from '@lifeledger/database';

describe('DocumentIntelligenceService', () => {
  let service: DocumentIntelligenceService;
  let prisma: PrismaService;
  let queueService: QueueService;
  let aiService: AiService;
  let auditService: AuditService;

  const mockDocument = {
    id: 'doc-uuid',
    userId: 'user-uuid',
    title: 'Passport.pdf',
    fileUrl: 'http://mock.com/passport.pdf',
    mimeType: 'application/pdf',
    deletedAt: null,
  };

  const mockPrisma: any = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    subCategory: {
      findFirst: jest.fn(),
    },
    processingJob: {
      findMany: jest.fn(),
    },
    documentTag: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    documentMetadata: {
      upsert: jest.fn(),
    },
    aIAnalysis: {
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockQueueService = {
    enqueueDocumentProcessing: jest.fn(),
    getProcessingSummary: jest.fn(),
    getUserJobs: jest.fn(),
    getReviewQueue: jest.fn(),
  };

  const mockOcrService = {
    getOCRResult: jest.fn(),
  };

  const mockAiService = {
    getAIAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentIntelligenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: OcrService, useValue: mockOcrService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<DocumentIntelligenceService>(DocumentIntelligenceService);
    prisma = module.get<PrismaService>(PrismaService);
    queueService = module.get<QueueService>(QueueService);
    aiService = module.get<AiService>(AiService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startProcessing', () => {
    it('should throw NotFoundException if document not found', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.startProcessing('doc-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unsupported file types', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        ...mockDocument,
        mimeType: 'text/plain',
      });

      await expect(
        service.startProcessing('doc-uuid', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enqueue pipeline and return status', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockQueueService.enqueueDocumentProcessing.mockResolvedValue('job-uuid');

      const result = await service.startProcessing('doc-uuid', 'user-uuid', '127.0.0.1', 'Mozilla');

      expect(queueService.enqueueDocumentProcessing).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
        'http://mock.com/passport.pdf',
        'application/pdf',
        ProcessingJobType.FULL_PIPELINE,
      );
      expect(auditService.log).toHaveBeenCalled();
      expect(result).toEqual({
        jobId: 'job-uuid',
        documentId: 'doc-uuid',
        status: 'QUEUED',
        message: 'Document processing has been queued',
      });
    });
  });

  describe('approveAISuggestions', () => {
    it('should throw NotFoundException if AI analysis not found', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockAiService.getAIAnalysis.mockResolvedValue(null);

      await expect(
        service.approveAISuggestions('doc-uuid', 'user-uuid', {
          applyCategory: true,
          applyMetadata: true,
          applyTags: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if suggestions already approved', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockAiService.getAIAnalysis.mockResolvedValue({
        status: AIAnalysisStatus.APPROVED,
      });

      await expect(
        service.approveAISuggestions('doc-uuid', 'user-uuid', {
          applyCategory: true,
          applyMetadata: true,
          applyTags: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply suggestions successfully', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockAiService.getAIAnalysis.mockResolvedValue({
        status: AIAnalysisStatus.COMPLETED,
        suggestedCategory: 'identity',
        suggestedSubCategory: 'passport',
        categoryConfidence: 95,
        extractedMetadata: {
          title: 'Passport Doc',
          description: 'AI summary',
        },
        generatedTags: ['tag1'],
      });

      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-id' });
      mockPrisma.subCategory.findFirst.mockResolvedValue({ id: 'subcat-id' });
      mockPrisma.documentTag.findMany.mockResolvedValue([]);

      const result = await service.approveAISuggestions('doc-uuid', 'user-uuid', {
        applyCategory: true,
        applyMetadata: true,
        applyTags: true,
      });

      expect(mockPrisma.document.update).toHaveBeenCalled();
      expect(mockPrisma.aIAnalysis.update).toHaveBeenCalledWith({
        where: { documentId: 'doc-uuid' },
        data: {
          status: AIAnalysisStatus.APPROVED,
          reviewedAt: expect.any(Date),
          reviewNotes: null,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rejectAISuggestions', () => {
    it('should reject suggestions', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockAiService.getAIAnalysis.mockResolvedValue({
        status: AIAnalysisStatus.COMPLETED,
      });

      const result = await service.rejectAISuggestions('doc-uuid', 'user-uuid', {
        reviewNotes: 'Not my document',
      });

      expect(mockPrisma.aIAnalysis.update).toHaveBeenCalledWith({
        where: { documentId: 'doc-uuid' },
        data: {
          status: AIAnalysisStatus.REJECTED,
          reviewedAt: expect.any(Date),
          reviewNotes: 'Not my document',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});

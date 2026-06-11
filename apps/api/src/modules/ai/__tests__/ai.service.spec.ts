import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AIAnalysisStatus } from '@lifeledger/database';

// Mock @google/generative-ai
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    }),
  };
});

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrisma: any = {
    aIAnalysis: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    document: {
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'GEMINI_API_KEY') return 'mock-api-key';
      if (key === 'GEMINI_MODEL') return 'gemini-2.0-flash';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.isAvailable()).toBe(true);
  });

  describe('classifyDocument', () => {
    it('should classify document and map category correctly', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              categorySlug: 'identity',
              subcategorySlug: 'passport',
              confidence: 98,
              reasoning: 'Matches passport format',
            }),
        },
      });

      const result = await service.classifyDocument('my passport info');
      expect(result.categorySlug).toBe('identity');
      expect(result.subcategorySlug).toBe('passport');
      expect(result.confidence).toBe(98);
      expect(result.categoryName).toBe('Identity Documents');
    });

    it('should fallback to identity with low confidence if AI returns unknown category', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              categorySlug: 'unknown-category',
              confidence: 90,
            }),
        },
      });

      const result = await service.classifyDocument('weird text');
      expect(result.categorySlug).toBe('identity');
      expect(result.confidence).toBe(20);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata fields', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              title: 'My Title',
              description: 'My description',
              documentNumber: '123456',
              issuer: 'Govt',
              issueDate: '2020-01-01',
              expiryDate: '2030-01-01',
            }),
        },
      });

      const result = await service.extractMetadata('ocr text', 'identity');
      expect(result.title).toBe('My Title');
      expect(result.documentNumber).toBe('123456');
      expect(result.issueDate).toContain('2020-01-01');
    });
  });

  describe('generateTags', () => {
    it('should generate tag list', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              tags: ['tag1', 'tag2', 'tag3'],
              reasoning: 'Keywords found',
            }),
        },
      });

      const result = await service.generateTags('ocr text', 'identity', {});
      expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('analyzeDocument', () => {
    it('should orchestrate classification, metadata, and tags, and upsert analysis result', async () => {
      // Classification response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              categorySlug: 'identity',
              subcategorySlug: 'passport',
              confidence: 96,
              reasoning: 'Reasoning',
            }),
        },
      });

      // Metadata response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              title: 'Passport',
              description: 'User passport',
            }),
        },
      });

      // Tags response
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              tags: ['passport', 'id'],
            }),
        },
      });

      const result = await service.analyzeDocument('doc-uuid', 'ocr text content');

      expect(mockPrisma.aIAnalysis.upsert).toHaveBeenCalledTimes(2); // processing, then final completed
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
        data: { aiSummary: 'User passport' },
      });

      expect(result.classification.categorySlug).toBe('identity');
      expect(result.metadata.title).toBe('Passport');
      expect(result.tags.tags).toEqual(['passport', 'id']);
    });

    it('should set status to FAILED and throw when generation fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Gemini error'));

      await expect(service.analyzeDocument('doc-uuid', 'some text')).rejects.toThrow(
        'AI processing failed: Gemini error',
      );

      expect(mockPrisma.aIAnalysis.upsert).toHaveBeenLastCalledWith({
        where: { documentId: 'doc-uuid' },
        create: { documentId: 'doc-uuid', status: AIAnalysisStatus.FAILED },
        update: { status: AIAnalysisStatus.FAILED },
      });
    });
  });
});

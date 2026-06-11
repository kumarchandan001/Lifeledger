import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from '../ocr.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { OcrStatus } from '@lifeledger/database';

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation((buffer) => {
    if (buffer.toString() === 'empty-pdf') {
      return Promise.resolve({ text: '', numpages: 1 });
    }
    return Promise.resolve({
      text: 'extracted pdf content that is long enough to bypass scanned fallback check',
      numpages: 2,
    });
  });
});

// Mock tesseract.js
const mockRecognize = jest.fn().mockResolvedValue({
  data: {
    text: 'extracted image text',
    confidence: 88,
    paragraphs: [{ text: 'extracted image text', confidence: 88 }],
  },
});
const mockTerminate = jest.fn().mockResolvedValue(undefined);
jest.mock('tesseract.js', () => {
  return {
    createWorker: jest.fn().mockResolvedValue({
      recognize: mockRecognize,
      terminate: mockTerminate,
    }),
  };
});

// Global fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OcrService', () => {
  let service: OcrService;
  let prisma: PrismaService;
  let storageService: StorageService;

  const mockPrisma: any = {
    document: {
      update: jest.fn(),
    },
    oCRResult: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockStorageService = {
    generateDownloadUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    prisma = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractText', () => {
    it('should extract text from a native PDF and save the result', async () => {
      mockStorageService.generateDownloadUrl.mockResolvedValue('http://mockurl.com/doc.pdf');

      const mockBuffer = Buffer.from('hello pdf');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      const result = await service.extractText('doc-uuid', 'lifeledger/doc.pdf', 'application/pdf');

      expect(storageService.generateDownloadUrl).toHaveBeenCalledWith('lifeledger/doc.pdf');
      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
        data: { ocrStatus: OcrStatus.PROCESSING },
      });
      expect(result.extractedText).toBe(
        'extracted pdf content that is long enough to bypass scanned fallback check',
      );
      expect(result.pageCount).toBe(2);
      expect(result.confidence).toBe(95); // native is 95
      expect(mockPrisma.oCRResult.upsert).toHaveBeenCalled();
    });

    it('should fallback to image OCR when PDF has no native text', async () => {
      mockStorageService.generateDownloadUrl.mockResolvedValue('http://mockurl.com/scanned.pdf');

      const mockBuffer = Buffer.from('empty-pdf');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      const result = await service.extractText(
        'doc-uuid',
        'lifeledger/scanned.pdf',
        'application/pdf',
      );

      expect(result.extractedText).toBe('extracted image text');
      expect(result.confidence).toBe(88);
      expect(mockRecognize).toHaveBeenCalled();
      expect(mockTerminate).toHaveBeenCalled();
    });

    it('should extract text from an image using Tesseract', async () => {
      mockStorageService.generateDownloadUrl.mockResolvedValue('http://mockurl.com/image.png');

      const mockBuffer = Buffer.from('image bytes');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      const result = await service.extractText('doc-uuid', 'lifeledger/image.png', 'image/png');

      expect(result.extractedText).toBe('extracted image text');
      expect(result.confidence).toBe(88);
      expect(mockRecognize).toHaveBeenCalled();
    });

    it('should update status to FAILED and throw when fetch or processing fails', async () => {
      mockStorageService.generateDownloadUrl.mockResolvedValue('http://mockurl.com/bad.pdf');
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        service.extractText('doc-uuid', 'lifeledger/bad.pdf', 'application/pdf'),
      ).rejects.toThrow('Failed to download file: Not Found');

      expect(mockPrisma.document.update).toHaveBeenLastCalledWith({
        where: { id: 'doc-uuid' },
        data: { ocrStatus: OcrStatus.FAILED },
      });
    });
  });

  describe('getOCRResult', () => {
    it('should return stored OCR result', async () => {
      const mockResult = { id: 'ocr-uuid', extractedText: 'saved text' };
      mockPrisma.oCRResult.findUnique.mockResolvedValue(mockResult);

      const res = await service.getOCRResult('doc-uuid');
      expect(prisma.oCRResult.findUnique).toHaveBeenCalledWith({
        where: { documentId: 'doc-uuid' },
      });
      expect(res).toEqual(mockResult);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentIntelligenceController } from '../document-intelligence.controller';
import { DocumentIntelligenceService } from '../document-intelligence.service';
import { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';
import { Request } from 'express';

describe('DocumentIntelligenceController', () => {
  let controller: DocumentIntelligenceController;
  let service: DocumentIntelligenceService;

  const mockUser: CurrentUserPayload = {
    userId: 'user-uuid',
    email: 'user@example.com',
    role: 'USER',
  };

  const mockRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla',
    },
  } as unknown as Request;

  const mockService = {
    startProcessing: jest.fn(),
    getProcessingStatus: jest.fn(),
    getOCRResults: jest.fn(),
    getAIAnalysis: jest.fn(),
    approveAISuggestions: jest.fn(),
    rejectAISuggestions: jest.fn(),
    reprocessDocument: jest.fn(),
    getProcessingSummary: jest.fn(),
    getProcessingJobs: jest.fn(),
    getReviewQueue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentIntelligenceController],
      providers: [{ provide: DocumentIntelligenceService, useValue: mockService }],
    }).compile();

    controller = module.get<DocumentIntelligenceController>(DocumentIntelligenceController);
    service = module.get<DocumentIntelligenceService>(DocumentIntelligenceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('startProcessing', () => {
    it('should call service.startProcessing', async () => {
      mockService.startProcessing.mockResolvedValue({ success: true });
      const result = await controller.startProcessing('doc-uuid', mockUser, mockRequest);
      expect(service.startProcessing).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
        '127.0.0.1',
        'Mozilla',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProcessingStatus', () => {
    it('should call service.getProcessingStatus', async () => {
      mockService.getProcessingStatus.mockResolvedValue({ status: 'PROCESSING' });
      const result = await controller.getProcessingStatus('doc-uuid', mockUser);
      expect(service.getProcessingStatus).toHaveBeenCalledWith('doc-uuid', 'user-uuid');
      expect(result).toEqual({ status: 'PROCESSING' });
    });
  });

  describe('getOCRResults', () => {
    it('should call service.getOCRResults', async () => {
      mockService.getOCRResults.mockResolvedValue({ text: 'ocr' });
      const result = await controller.getOCRResults('doc-uuid', mockUser);
      expect(service.getOCRResults).toHaveBeenCalledWith('doc-uuid', 'user-uuid');
      expect(result).toEqual({ text: 'ocr' });
    });
  });

  describe('getAIAnalysis', () => {
    it('should call service.getAIAnalysis', async () => {
      mockService.getAIAnalysis.mockResolvedValue({ analysis: {} });
      const result = await controller.getAIAnalysis('doc-uuid', mockUser);
      expect(service.getAIAnalysis).toHaveBeenCalledWith('doc-uuid', 'user-uuid');
      expect(result).toEqual({ analysis: {} });
    });
  });

  describe('approveAISuggestions', () => {
    it('should call service.approveAISuggestions', async () => {
      mockService.approveAISuggestions.mockResolvedValue({ success: true });
      const dto = { applyCategory: true, applyMetadata: true, applyTags: true };
      const result = await controller.approveAISuggestions('doc-uuid', mockUser, dto, mockRequest);
      expect(service.approveAISuggestions).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
        dto,
        '127.0.0.1',
        'Mozilla',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('rejectAISuggestions', () => {
    it('should call service.rejectAISuggestions', async () => {
      mockService.rejectAISuggestions.mockResolvedValue({ success: true });
      const dto = { reviewNotes: 'bad info' };
      const result = await controller.rejectAISuggestions('doc-uuid', mockUser, dto, mockRequest);
      expect(service.rejectAISuggestions).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
        dto,
        '127.0.0.1',
        'Mozilla',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('reprocessDocument', () => {
    it('should call service.reprocessDocument', async () => {
      mockService.reprocessDocument.mockResolvedValue({ success: true });
      const result = await controller.reprocessDocument('doc-uuid', mockUser, mockRequest);
      expect(service.reprocessDocument).toHaveBeenCalledWith(
        'doc-uuid',
        'user-uuid',
        '127.0.0.1',
        'Mozilla',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProcessingSummary', () => {
    it('should call service.getProcessingSummary', async () => {
      mockService.getProcessingSummary.mockResolvedValue({ queued: 0 });
      const result = await controller.getProcessingSummary(mockUser);
      expect(service.getProcessingSummary).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual({ queued: 0 });
    });
  });

  describe('getProcessingJobs', () => {
    it('should call service.getProcessingJobs', async () => {
      mockService.getProcessingJobs.mockResolvedValue({ jobs: [] });
      const result = await controller.getProcessingJobs(mockUser, { page: 1, limit: 10 });
      expect(service.getProcessingJobs).toHaveBeenCalledWith('user-uuid', { page: 1, limit: 10 });
      expect(result).toEqual({ jobs: [] });
    });
  });

  describe('getReviewQueue', () => {
    it('should call service.getReviewQueue', async () => {
      mockService.getReviewQueue.mockResolvedValue({ items: [] });
      const result = await controller.getReviewQueue(mockUser, 1, 10);
      expect(service.getReviewQueue).toHaveBeenCalledWith('user-uuid', 1, 10);
      expect(result).toEqual({ items: [] });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { ProcessingJobStatus, ProcessingJobType } from '@lifeledger/database';

// Mock BullMQ Queue
const mockAdd = jest.fn();
const mockClose = jest.fn();
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: mockAdd,
        close: mockClose,
      };
    }),
  };
});

describe('QueueService', () => {
  let service: QueueService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    processingJob: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    aIAnalysis: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({
      options: { host: 'localhost', port: 6379 },
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'AI_MAX_RETRIES') return 3;
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    prisma = module.get<PrismaService>(PrismaService);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueDocumentProcessing', () => {
    it('should create processing job in DB and add to queue', async () => {
      const mockJob = { id: 'job-uuid', documentId: 'doc-uuid' };
      mockPrisma.processingJob.create.mockResolvedValue(mockJob);

      const result = await service.enqueueDocumentProcessing(
        'doc-uuid',
        'user-uuid',
        'http://mock.com/doc.pdf',
        'application/pdf',
        ProcessingJobType.FULL_PIPELINE,
      );

      expect(mockPrisma.processingJob.create).toHaveBeenCalled();
      expect(mockAdd).toHaveBeenCalledWith(
        'process-document',
        {
          jobId: 'job-uuid',
          documentId: 'doc-uuid',
          userId: 'user-uuid',
          type: ProcessingJobType.FULL_PIPELINE,
          fileUrl: 'http://mock.com/doc.pdf',
          mimeType: 'application/pdf',
        },
        { jobId: 'job-uuid', priority: 0 },
      );
      expect(result).toBe('job-uuid');
    });
  });

  describe('getJobStatus', () => {
    it('should find unique processing job', async () => {
      const mockJob = { id: 'job-uuid', status: ProcessingJobStatus.QUEUED };
      mockPrisma.processingJob.findUnique.mockResolvedValue(mockJob);

      const result = await service.getJobStatus('job-uuid');
      expect(mockPrisma.processingJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-uuid' },
      });
      expect(result).toEqual(mockJob);
    });
  });

  describe('getUserJobs', () => {
    it('should query user jobs with pagination', async () => {
      mockPrisma.processingJob.findMany.mockResolvedValue([{ id: 'job-1' }]);
      mockPrisma.processingJob.count.mockResolvedValue(1);

      const result = await service.getUserJobs('user-uuid', { page: 1, limit: 10 });
      expect(mockPrisma.processingJob.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        jobs: [{ id: 'job-1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getProcessingSummary', () => {
    it('should return job status counts and review count', async () => {
      mockPrisma.processingJob.count.mockResolvedValueOnce(1); // queued
      mockPrisma.processingJob.count.mockResolvedValueOnce(2); // processing
      mockPrisma.processingJob.count.mockResolvedValueOnce(3); // completed
      mockPrisma.processingJob.count.mockResolvedValueOnce(4); // failed
      mockPrisma.aIAnalysis.count.mockResolvedValueOnce(5); // needs review

      const result = await service.getProcessingSummary('user-uuid');
      expect(result).toEqual({
        queued: 1,
        processing: 2,
        completed: 3,
        failed: 4,
        needsReview: 5,
        totalProcessed: 7, // completed + failed
      });
    });
  });

  describe('getReviewQueue', () => {
    it('should return review items and count', async () => {
      mockPrisma.aIAnalysis.findMany.mockResolvedValue([{ id: 'analysis-1' }]);
      mockPrisma.aIAnalysis.count.mockResolvedValue(1);

      const result = await service.getReviewQueue('user-uuid', 1, 10);
      expect(result).toEqual({
        items: [{ id: 'analysis-1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('retryJob', () => {
    it('should throw error if job not found', async () => {
      mockPrisma.processingJob.findFirst.mockResolvedValue(null);

      await expect(
        service.retryJob('job-uuid', 'user-uuid'),
      ).rejects.toThrow('Processing job not found');
    });

    it('should throw error if job status is not FAILED', async () => {
      mockPrisma.processingJob.findFirst.mockResolvedValue({
        id: 'job-uuid',
        status: ProcessingJobStatus.COMPLETED,
      });

      await expect(
        service.retryJob('job-uuid', 'user-uuid'),
      ).rejects.toThrow('Only failed jobs can be retried');
    });

    it('should enqueue job again if status is FAILED', async () => {
      mockPrisma.processingJob.findFirst.mockResolvedValue({
        id: 'job-uuid',
        status: ProcessingJobStatus.FAILED,
        documentId: 'doc-uuid',
        type: ProcessingJobType.FULL_PIPELINE,
        document: {
          fileUrl: 'http://mock.com/doc.pdf',
          mimeType: 'application/pdf',
        },
      });

      // Mock DB create for new job
      mockPrisma.processingJob.create.mockResolvedValue({ id: 'new-job-uuid' });

      const result = await service.retryJob('job-uuid', 'user-uuid');
      expect(result).toBe('new-job-uuid');
      expect(mockAdd).toHaveBeenCalled();
    });
  });
});

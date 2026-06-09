import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ProcessingJobStatus, ProcessingJobType } from '@lifeledger/database';

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export interface DocumentProcessingJobData {
  jobId: string;
  documentId: string;
  userId: string;
  type: ProcessingJobType;
  fileUrl: string;
  mimeType: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queue!: Queue<DocumentProcessingJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const redisClient = this.redisService.getClient();
      const connection = {
        host: redisClient.options?.host || 'localhost',
        port: redisClient.options?.port || 6379,
        password: redisClient.options?.password || undefined,
      };

      this.queue = new Queue<DocumentProcessingJobData>(DOCUMENT_PROCESSING_QUEUE, {
        connection,
        defaultJobOptions: {
          attempts: Number(this.configService.get('AI_MAX_RETRIES', 3)),
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      });

      this.logger.log('✅ Document Processing Queue initialized');
    } catch (error) {
      this.logger.error('Failed to initialize processing queue', error);
    }
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Processing queue closed');
    }
  }

  /**
   * Enqueue a document for processing.
   */
  async enqueueDocumentProcessing(
    documentId: string,
    userId: string,
    fileUrl: string,
    mimeType: string,
    type: ProcessingJobType = ProcessingJobType.FULL_PIPELINE,
  ): Promise<string> {
    // Create processing job record
    const job = await this.prisma.processingJob.create({
      data: {
        documentId,
        userId,
        type,
        status: ProcessingJobStatus.QUEUED,
        maxAttempts: Number(this.configService.get('AI_MAX_RETRIES', 3)),
      },
    });

    // Add to BullMQ queue
    const jobData: DocumentProcessingJobData = {
      jobId: job.id,
      documentId,
      userId,
      type,
      fileUrl,
      mimeType,
    };

    await this.queue.add('process-document', jobData, {
      jobId: job.id,
      priority: 0,
    });

    this.logger.log(
      `Enqueued ${type} job ${job.id} for document ${documentId}`,
    );

    return job.id;
  }

  /**
   * Get the status of a processing job.
   */
  async getJobStatus(jobId: string) {
    return this.prisma.processingJob.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * Get all processing jobs for a user with pagination.
   */
  async getUserJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: ProcessingJobStatus;
      type?: ProcessingJobType;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const whereClause: any = { userId };
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const [jobs, total] = await Promise.all([
      this.prisma.processingJob.findMany({
        where: whereClause,
        include: {
          document: {
            select: { id: true, title: true, mimeType: true, ocrStatus: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.processingJob.count({ where: whereClause }),
    ]);

    return { jobs, total, page, limit };
  }

  /**
   * Get processing status summary for a user.
   */
  async getProcessingSummary(userId: string) {
    const [queued, processing, completed, failed] = await Promise.all([
      this.prisma.processingJob.count({
        where: { userId, status: ProcessingJobStatus.QUEUED },
      }),
      this.prisma.processingJob.count({
        where: { userId, status: ProcessingJobStatus.PROCESSING },
      }),
      this.prisma.processingJob.count({
        where: { userId, status: ProcessingJobStatus.COMPLETED },
      }),
      this.prisma.processingJob.count({
        where: { userId, status: ProcessingJobStatus.FAILED },
      }),
    ]);

    const needsReview = await this.prisma.aIAnalysis.count({
      where: {
        document: { userId },
        status: 'NEEDS_REVIEW',
      },
    });

    return {
      queued,
      processing,
      completed,
      failed,
      needsReview,
      totalProcessed: completed + failed,
    };
  }

  /**
   * Get documents that need human review.
   */
  async getReviewQueue(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.aIAnalysis.findMany({
        where: {
          document: { userId, deletedAt: null },
          status: 'NEEDS_REVIEW',
        },
        include: {
          document: {
            select: {
              id: true,
              title: true,
              category: { select: { name: true, icon: true } },
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aIAnalysis.count({
        where: {
          document: { userId, deletedAt: null },
          status: 'NEEDS_REVIEW',
        },
      }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Retry a failed processing job.
   */
  async retryJob(jobId: string, userId: string): Promise<string> {
    const job = await this.prisma.processingJob.findFirst({
      where: { id: jobId, userId },
      include: { document: true },
    });

    if (!job) throw new Error('Processing job not found');
    if (job.status !== ProcessingJobStatus.FAILED) {
      throw new Error('Only failed jobs can be retried');
    }

    // Create a new job for the retry
    return this.enqueueDocumentProcessing(
      job.documentId,
      userId,
      job.document.fileUrl,
      job.document.mimeType,
      job.type,
    );
  }
}

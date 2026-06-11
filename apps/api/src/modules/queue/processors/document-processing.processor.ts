import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OcrService } from '../../ocr/ocr.service';
import { AiService } from '../../ai/ai.service';
import { ProcessingJobStatus, ProcessingJobType, OcrStatus } from '@lifeledger/database';
import { isAISupportedMimeType } from '@lifeledger/shared';
import { DOCUMENT_PROCESSING_QUEUE, DocumentProcessingJobData } from '../queue.service';

@Injectable()
export class DocumentProcessingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);
  private worker!: Worker<DocumentProcessingJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly ocrService: OcrService,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    try {
      const redisClient = this.redisService.getClient();
      const connection = {
        host: redisClient.options?.host || 'localhost',
        port: redisClient.options?.port || 6379,
        password: redisClient.options?.password || undefined,
      };

      const concurrency = Number(this.configService.get('AI_PROCESSING_CONCURRENCY', 2));

      this.worker = new Worker<DocumentProcessingJobData>(
        DOCUMENT_PROCESSING_QUEUE,
        async (job: Job<DocumentProcessingJobData>) => this.processJob(job),
        {
          connection,
          concurrency,
          limiter: {
            max: 5,
            duration: 60000, // max 5 jobs per minute
          },
        },
      );

      this.worker.on('completed', (job: Job<DocumentProcessingJobData>) => {
        this.logger.log(`Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job: Job<DocumentProcessingJobData> | undefined, err: Error) => {
        this.logger.error(`Job ${job?.id} failed: ${err?.message || String(err)}`);
      });

      this.logger.log(`✅ Document Processing Worker started (concurrency: ${concurrency})`);
    } catch (error) {
      this.logger.error('Failed to initialize processing worker', error);
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Processing worker closed');
    }
  }

  /**
   * Process a document through the AI pipeline.
   */
  private async processJob(job: Job<DocumentProcessingJobData>): Promise<void> {
    const { jobId, documentId, userId, type, fileUrl, mimeType } = job.data;

    this.logger.log(`Processing job ${jobId}: type=${type}, document=${documentId}`);

    // Update job status to PROCESSING
    await this.prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: ProcessingJobStatus.PROCESSING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      if (!isAISupportedMimeType(mimeType)) {
        throw new Error(`Unsupported MIME type: ${mimeType}`);
      }

      switch (type) {
        case ProcessingJobType.FULL_PIPELINE:
          await this.runFullPipeline(documentId, fileUrl, mimeType);
          break;
        case ProcessingJobType.OCR_EXTRACTION:
          await this.ocrService.extractText(documentId, fileUrl, mimeType);
          break;
        case ProcessingJobType.AI_CLASSIFICATION:
        case ProcessingJobType.AI_METADATA_EXTRACTION:
        case ProcessingJobType.AI_TAG_GENERATION:
          await this.runAIStep(documentId, type);
          break;
        default:
          throw new Error(`Unknown processing type: ${type}`);
      }

      // Mark job as completed
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: ProcessingJobStatus.COMPLETED,
          completedAt: new Date(),
          error: null,
        },
      });
    } catch (error: any) {
      this.logger.error(`Job ${jobId} failed on attempt ${job.attemptsMade + 1}: ${error.message}`);

      // Mark job as failed (BullMQ will retry if attempts remain)
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status:
            job.attemptsMade + 1 >= (job.opts.attempts || 3)
              ? ProcessingJobStatus.FAILED
              : ProcessingJobStatus.QUEUED,
          error: error.message,
        },
      });

      throw error; // Re-throw for BullMQ retry
    }
  }

  /**
   * Run the full processing pipeline: OCR → Classification → Metadata → Tags
   */
  private async runFullPipeline(
    documentId: string,
    fileUrl: string,
    mimeType: string,
  ): Promise<void> {
    // Step 1: OCR Extraction
    this.logger.log(`[Pipeline] Step 1/4: OCR extraction for ${documentId}`);
    const ocrResult = await this.ocrService.extractText(documentId, fileUrl, mimeType);

    if (!ocrResult.extractedText || ocrResult.extractedText.length === 0) {
      this.logger.warn(
        `[Pipeline] No text extracted for document ${documentId}, skipping AI analysis`,
      );
      // Update OCR status to SKIPPED if no text found
      await this.prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: OcrStatus.SKIPPED },
      });
      return;
    }

    // Step 2-4: AI Analysis (classification + metadata + tags)
    if (this.aiService.isAvailable()) {
      this.logger.log(`[Pipeline] Step 2-4: AI analysis for ${documentId}`);
      const analysis = await this.aiService.analyzeDocument(documentId, ocrResult.extractedText);

      // Step 5: Auto-apply high-confidence tags
      if (analysis.tags.tags.length > 0) {
        await this.applyAITags(documentId, analysis.tags.tags);
      }

      this.logger.log(
        `[Pipeline] Complete for ${documentId}: category=${analysis.classification.categorySlug}, confidence=${analysis.classification.confidence}%`,
      );
    } else {
      this.logger.warn('[Pipeline] AI service not available, skipping AI analysis');
    }
  }

  /**
   * Run a specific AI step (requires OCR text to already exist).
   */
  private async runAIStep(documentId: string, type: ProcessingJobType): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document?.ocrText) {
      throw new Error('OCR text not available. Run OCR extraction first.');
    }

    if (!this.aiService.isAvailable()) {
      throw new Error('AI service is not available');
    }

    // For individual steps, just run the full analysis (it's efficient)
    await this.aiService.analyzeDocument(documentId, document.ocrText);
  }

  /**
   * Apply AI-generated tags to the document.
   */
  private async applyAITags(documentId: string, tags: string[]): Promise<void> {
    // Get document to find user
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });

    if (!document) return;

    // Get existing tags to avoid duplicates
    const existingTags = await this.prisma.documentTag.findMany({
      where: { documentId },
      select: { tag: true },
    });
    const existingSet = new Set(existingTags.map((t) => t.tag.toLowerCase()));

    const newTags = tags.filter((t) => !existingSet.has(t.toLowerCase()));
    if (newTags.length === 0) return;

    await this.prisma.documentTag.createMany({
      data: newTags.map((tag) => ({
        documentId,
        tag,
        createdBy: document.userId,
        source: 'AI_GENERATED' as const,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Applied ${newTags.length} AI tags to document ${documentId}`);
  }
}

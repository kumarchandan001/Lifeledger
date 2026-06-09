import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { DocumentProcessingProcessor } from './processors/document-processing.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { OcrModule } from '../ocr/ocr.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    ConfigModule,
    OcrModule,
    AiModule,
    StorageModule,
    AuditModule,
  ],
  providers: [QueueService, DocumentProcessingProcessor],
  exports: [QueueService],
})
export class QueueModule {}

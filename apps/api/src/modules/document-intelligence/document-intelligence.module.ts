import { Module } from '@nestjs/common';
import { DocumentIntelligenceService } from './document-intelligence.service';
import { DocumentIntelligenceController } from './document-intelligence.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../queue/queue.module';
import { OcrModule } from '../ocr/ocr.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AuditModule, QueueModule, OcrModule, AiModule],
  controllers: [DocumentIntelligenceController],
  providers: [DocumentIntelligenceService],
  exports: [DocumentIntelligenceService],
})
export class DocumentIntelligenceModule {}

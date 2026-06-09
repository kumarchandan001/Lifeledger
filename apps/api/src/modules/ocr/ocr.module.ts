import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}

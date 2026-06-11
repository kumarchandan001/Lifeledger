import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OcrStatus } from '@lifeledger/database';

export interface OCRExtractionResult {
  extractedText: string;
  textBlocks: Array<{ text: string; confidence: number; page?: number }>;
  tables: unknown[];
  confidence: number;
  pageCount: number;
  language: string;
  processingTimeMs: number;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Extract text from a document file.
   * Routes to the appropriate extractor based on MIME type.
   */
  async extractText(
    documentId: string,
    fileUrl: string,
    mimeType: string,
  ): Promise<OCRExtractionResult> {
    const startTime = Date.now();

    // Update document OCR status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: OcrStatus.PROCESSING },
    });

    try {
      // Download file from storage
      const downloadUrl = await this.storageService.generateDownloadUrl(fileUrl);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      let result: OCRExtractionResult;

      if (mimeType === 'application/pdf') {
        result = await this.extractFromPdf(buffer, startTime);
      } else if (mimeType.startsWith('image/')) {
        result = await this.extractFromImage(buffer, startTime);
      } else {
        throw new Error(`Unsupported MIME type for OCR: ${mimeType}`);
      }

      // Save OCR result
      await this.saveOCRResult(documentId, result);

      this.logger.log(
        `OCR completed for document ${documentId}: ${result.extractedText.length} chars, confidence: ${result.confidence.toFixed(1)}%`,
      );

      return result;
    } catch (error) {
      this.logger.error(`OCR extraction failed for document ${documentId}`, error);

      // Mark as failed
      await this.prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: OcrStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Extract text from a PDF document.
   * Uses pdf-parse for native text PDFs; falls back to Tesseract for scanned PDFs.
   */
  private async extractFromPdf(buffer: Buffer, startTime: number): Promise<OCRExtractionResult> {
    // Dynamic import to avoid loading at startup
    const pdfParseModule = (await import('pdf-parse')) as any;
    const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;

    const pdfData = await pdfParse(buffer);
    const extractedText = (pdfData.text || '').trim();

    // If PDF has very little native text, it's likely a scanned document
    if (extractedText.length < 50) {
      this.logger.log('PDF appears to be scanned, falling back to Tesseract OCR');
      return this.extractFromImage(buffer, startTime);
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      extractedText,
      textBlocks: [{ text: extractedText, confidence: 95, page: 1 }],
      tables: [],
      confidence: 95, // Native PDF text extraction is high confidence
      pageCount: pdfData.numpages || 1,
      language: 'eng',
      processingTimeMs,
    };
  }

  /**
   * Extract text from an image using Tesseract.js OCR.
   */
  private async extractFromImage(buffer: Buffer, startTime: number): Promise<OCRExtractionResult> {
    const Tesseract = await import('tesseract.js');

    const worker = await Tesseract.createWorker('eng');

    try {
      const { data } = (await worker.recognize(buffer)) as any;

      const textBlocks = data.paragraphs?.map((p: any, idx: number) => ({
        text: p.text?.trim() || '',
        confidence: p.confidence || 0,
        page: 1,
      })) || [{ text: data.text?.trim() || '', confidence: data.confidence || 0, page: 1 }];

      const processingTimeMs = Date.now() - startTime;

      return {
        extractedText: data.text?.trim() || '',
        textBlocks,
        tables: [],
        confidence: data.confidence || 0,
        pageCount: 1,
        language: 'eng',
        processingTimeMs,
      };
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Persist OCR results to the database and update the document record.
   */
  async saveOCRResult(documentId: string, result: OCRExtractionResult): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Upsert OCR result (allows reprocessing)
      await tx.oCRResult.upsert({
        where: { documentId },
        create: {
          documentId,
          extractedText: result.extractedText,
          textBlocks: result.textBlocks as any,
          tables: result.tables as any,
          confidence: result.confidence,
          pageCount: result.pageCount,
          language: result.language,
          processingTime: result.processingTimeMs,
        },
        update: {
          extractedText: result.extractedText,
          textBlocks: result.textBlocks as any,
          tables: result.tables as any,
          confidence: result.confidence,
          pageCount: result.pageCount,
          language: result.language,
          processingTime: result.processingTimeMs,
        },
      });

      // Update document with OCR text and status
      await tx.document.update({
        where: { id: documentId },
        data: {
          ocrText: result.extractedText,
          ocrStatus: result.extractedText.length > 0 ? OcrStatus.COMPLETED : OcrStatus.FAILED,
        },
      });
    });
  }

  /**
   * Get stored OCR result for a document.
   */
  async getOCRResult(documentId: string): Promise<any> {
    return this.prisma.oCRResult.findUnique({
      where: { documentId },
    });
  }
}

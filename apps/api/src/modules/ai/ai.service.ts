import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AIAnalysisStatus } from '@lifeledger/database';
import { CATEGORIES, SUB_CATEGORIES, AI_CONFIDENCE_THRESHOLDS } from '@lifeledger/shared';
import { buildClassificationPrompt } from './prompts/classification.prompt';
import { buildMetadataExtractionPrompt } from './prompts/metadata-extraction.prompt';
import { buildTagGenerationPrompt } from './prompts/tag-generation.prompt';

export interface ClassificationResult {
  categorySlug: string;
  subcategorySlug: string | null;
  categoryName: string;
  subcategoryName: string | null;
  confidence: number;
  reasoning: string;
}

export interface MetadataResult {
  title: string | null;
  description: string | null;
  documentNumber: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
}

export interface TagResult {
  tags: string[];
  reasoning: string;
}

export interface FullAnalysisResult {
  classification: ClassificationResult;
  metadata: MetadataResult;
  tags: TagResult;
  summary: string;
  totalProcessingTimeMs: number;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: any;
  private model: any;
  private modelName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.0-flash');
  }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. AI processing will be unavailable.',
      );
      return;
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
      this.logger.log(`✅ Gemini AI Service initialized (model: ${this.modelName})`);
    } catch (error) {
      this.logger.error('Failed to initialize Gemini AI', error);
    }
  }

  /**
   * Check if AI service is available.
   */
  isAvailable(): boolean {
    return !!this.model;
  }

  /**
   * Classify a document based on its OCR text.
   */
  async classifyDocument(ocrText: string): Promise<ClassificationResult> {
    if (!this.model) throw new Error('AI service is not initialized');
    if (!ocrText || ocrText.trim().length === 0) {
      throw new Error('No text available for classification');
    }

    const prompt = buildClassificationPrompt(ocrText);
    const responseText = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(responseText);

    // Validate category exists
    const category = CATEGORIES.find((c) => c.slug === parsed.categorySlug);
    if (!category) {
      this.logger.warn(`AI returned unknown category slug: ${parsed.categorySlug}`);
      return {
        categorySlug: 'identity',
        subcategorySlug: null,
        categoryName: 'Identity Documents',
        subcategoryName: null,
        confidence: 20,
        reasoning: 'AI returned an unknown category; defaulted to identity.',
      };
    }

    // Validate subcategory exists
    let subcategoryName: string | null = null;
    const subs = SUB_CATEGORIES[category.slug as keyof typeof SUB_CATEGORIES] || [];
    if (parsed.subcategorySlug) {
      const sub = subs.find((s) => s.slug === parsed.subcategorySlug);
      if (sub) {
        subcategoryName = sub.name;
      } else {
        parsed.subcategorySlug = null;
      }
    }

    return {
      categorySlug: category.slug,
      subcategorySlug: parsed.subcategorySlug || null,
      categoryName: category.name,
      subcategoryName,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning || '',
    };
  }

  /**
   * Extract structured metadata from document text.
   */
  async extractMetadata(
    ocrText: string,
    categorySlug: string,
  ): Promise<MetadataResult> {
    if (!this.model) throw new Error('AI service is not initialized');

    const prompt = buildMetadataExtractionPrompt(ocrText, categorySlug);
    const responseText = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(responseText);

    return {
      title: parsed.title || null,
      description: parsed.description || null,
      documentNumber: parsed.documentNumber || null,
      issuer: parsed.issuer || null,
      issueDate: this.sanitizeDate(parsed.issueDate),
      expiryDate: this.sanitizeDate(parsed.expiryDate),
    };
  }

  /**
   * Generate search-optimized tags for a document.
   */
  async generateTags(
    ocrText: string,
    categorySlug: string,
    metadata: Record<string, unknown>,
  ): Promise<TagResult> {
    if (!this.model) throw new Error('AI service is not initialized');

    const prompt = buildTagGenerationPrompt(ocrText, categorySlug, metadata);
    const responseText = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse(responseText);

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
          .filter((t: unknown) => typeof t === 'string')
          .map((t: string) => t.toLowerCase().trim().slice(0, 50))
          .filter((t: string) => t.length > 0)
          .slice(0, 20)
      : [];

    return {
      tags,
      reasoning: parsed.reasoning || '',
    };
  }

  /**
   * Run the full AI analysis pipeline for a document.
   */
  async analyzeDocument(
    documentId: string,
    ocrText: string,
  ): Promise<FullAnalysisResult> {
    const startTime = Date.now();

    // Update AI analysis status to PROCESSING
    await this.prisma.aIAnalysis.upsert({
      where: { documentId },
      create: { documentId, status: AIAnalysisStatus.PROCESSING },
      update: { status: AIAnalysisStatus.PROCESSING },
    });

    try {
      // Step 1: Classification
      const classification = await this.classifyDocument(ocrText);

      // Step 2: Metadata extraction (uses classification result)
      const metadata = await this.extractMetadata(ocrText, classification.categorySlug);

      // Step 3: Tag generation (uses classification + metadata)
      const tags = await this.generateTags(ocrText, classification.categorySlug, metadata as any);

      // Step 4: Generate summary
      const summary = metadata.description ||
        `${classification.categoryName} document${classification.subcategoryName ? ` (${classification.subcategoryName})` : ''}`;

      const totalProcessingTimeMs = Date.now() - startTime;

      // Determine status based on confidence
      const status: AIAnalysisStatus =
        classification.confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH
          ? AIAnalysisStatus.COMPLETED
          : classification.confidence >= AI_CONFIDENCE_THRESHOLDS.MEDIUM
            ? AIAnalysisStatus.COMPLETED
            : AIAnalysisStatus.NEEDS_REVIEW;

      // Persist AI analysis
      await this.prisma.aIAnalysis.upsert({
        where: { documentId },
        create: {
          documentId,
          suggestedCategory: classification.categorySlug,
          suggestedSubCategory: classification.subcategorySlug,
          categoryConfidence: classification.confidence,
          extractedMetadata: metadata as any,
          generatedTags: tags.tags,
          aiSummary: summary,
          status,
          processingTime: totalProcessingTimeMs,
          modelVersion: this.modelName,
        },
        update: {
          suggestedCategory: classification.categorySlug,
          suggestedSubCategory: classification.subcategorySlug,
          categoryConfidence: classification.confidence,
          extractedMetadata: metadata as any,
          generatedTags: tags.tags,
          aiSummary: summary,
          status,
          processingTime: totalProcessingTimeMs,
          modelVersion: this.modelName,
        },
      });

      // Update document AI summary
      await this.prisma.document.update({
        where: { id: documentId },
        data: { aiSummary: summary },
      });

      this.logger.log(
        `AI analysis completed for document ${documentId}: category=${classification.categorySlug}, confidence=${classification.confidence}%, tags=${tags.tags.length}`,
      );

      return {
        classification,
        metadata,
        tags,
        summary,
        totalProcessingTimeMs,
      };
    } catch (error) {
      this.logger.error(`AI analysis failed for document ${documentId}`, error);

      await this.prisma.aIAnalysis.upsert({
        where: { documentId },
        create: { documentId, status: AIAnalysisStatus.FAILED },
        update: { status: AIAnalysisStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Get stored AI analysis for a document.
   */
  async getAIAnalysis(documentId: string) {
    return this.prisma.aIAnalysis.findUnique({
      where: { documentId },
    });
  }

  // ─── Private Helpers ───

  private async callGemini(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error: any) {
      this.logger.error(`Gemini API call failed: ${error.message}`);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  private parseJsonResponse(text: string): any {
    try {
      // Strip markdown code blocks if present
      const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn(`Failed to parse AI JSON response: ${text.slice(0, 200)}`);
      throw new Error('AI returned invalid JSON response');
    }
  }

  private sanitizeDate(value: unknown): string | null {
    if (!value || typeof value !== 'string') return null;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  }
}

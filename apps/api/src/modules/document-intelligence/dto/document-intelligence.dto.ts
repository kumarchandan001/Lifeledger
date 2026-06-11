import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUUID,
  IsArray,
  IsISO8601,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Approve AI Suggestions ───

export class ApproveOverridesDto {
  @ApiPropertyOptional({ example: 'Updated Document Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  subCategoryId?: string | null;

  @ApiPropertyOptional({ example: 'DOC-12345' })
  @IsOptional()
  @IsString()
  documentNumber?: string | null;

  @ApiPropertyOptional({ example: 'Government of India' })
  @IsOptional()
  @IsString()
  issuer?: string | null;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  issueDate?: string | null;

  @ApiPropertyOptional({ example: '2036-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['passport', 'travel'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ApproveAISuggestionDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  applyCategory?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  applyMetadata?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  applyTags?: boolean = true;

  @ApiPropertyOptional({ type: ApproveOverridesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApproveOverridesDto)
  overrides?: ApproveOverridesDto;

  @ApiPropertyOptional({ example: 'Looks correct, approving.' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// ─── Reject AI Suggestion ───

export class RejectAISuggestionDto {
  @ApiPropertyOptional({ example: 'Classification was incorrect.' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// ─── Query Processing Jobs ───

export class QueryProcessingJobsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

  @ApiPropertyOptional({
    enum: ['OCR_EXTRACTION', 'AI_CLASSIFICATION', 'AI_METADATA_EXTRACTION', 'AI_TAG_GENERATION', 'FULL_PIPELINE'],
  })
  @IsOptional()
  @IsEnum(['OCR_EXTRACTION', 'AI_CLASSIFICATION', 'AI_METADATA_EXTRACTION', 'AI_TAG_GENERATION', 'FULL_PIPELINE'])
  type?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'completedAt'], default: 'createdAt' })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'completedAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

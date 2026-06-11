import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  Max,
  IsPositive,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FILE_LIMITS } from '@lifeledger/shared';

export class CreateUploadUrlDto {
  @ApiProperty({ example: 'passport.pdf' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 1024 * 1024 })
  @IsNumber()
  @IsPositive()
  @Max(FILE_LIMITS.MAX_FILE_SIZE_BYTES, {
    message: `File size must be under ${FILE_LIMITS.MAX_FILE_SIZE_LABEL}`,
  })
  fileSize!: number;
}

export class CreateDocumentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  @ApiProperty({ example: 'My Passport' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Scanned copy of passport' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'passport.pdf' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 1048576 })
  @IsNumber()
  @IsPositive()
  fileSize!: number;

  @ApiPropertyOptional({ example: '2026-06-06T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2036-06-06T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Z1234567' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Ministry of External Affairs' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['travel', 'id'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: {} })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'My Updated Passport' })
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
  subCategoryId?: string;

  @ApiPropertyOptional({ example: '2026-06-06T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  issueDate?: string;

  @ApiPropertyOptional({ example: '2036-06-06T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @ApiPropertyOptional({ example: 'Z1234567' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'Ministry of External Affairs' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;
}

export class QueryDocumentsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categorySlug?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED'])
  status?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'title', 'expiryDate'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'title', 'expiryDate'])
  sortBy: 'createdAt' | 'updatedAt' | 'title' | 'expiryDate' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFavorite?: boolean;
}

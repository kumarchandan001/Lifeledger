import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Subscribe ───

export class SubscribeDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ enum: ['MONTHLY', 'YEARLY'], example: 'MONTHLY' })
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle!: 'MONTHLY' | 'YEARLY';
}

// ─── Change Plan (Upgrade / Downgrade) ───

export class ChangePlanDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({ enum: ['MONTHLY', 'YEARLY'] })
  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: 'MONTHLY' | 'YEARLY';
}

// ─── Cancel Subscription ───

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ example: 'Too expensive for my needs' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

// ─── Add Payment Method ───

export class AddPaymentMethodDto {
  @ApiProperty({ example: 'pm_1234567890' })
  @IsString()
  providerMethodId!: string;

  @ApiPropertyOptional({ enum: ['CARD', 'UPI', 'NET_BANKING', 'WALLET'], default: 'CARD' })
  @IsOptional()
  @IsEnum(['CARD', 'UPI', 'NET_BANKING', 'WALLET'])
  type?: 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET';

  @ApiPropertyOptional({ example: '4242' })
  @IsOptional()
  @IsString()
  last4?: string;

  @ApiPropertyOptional({ example: 'visa' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ApiPropertyOptional({ example: 2028 })
  @IsOptional()
  @IsNumber()
  @Min(2024)
  expiryYear?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ─── Query DTOs ───

export class QueryInvoicesDto {
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

  @ApiPropertyOptional({ enum: ['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'ISSUED', 'PAID', 'VOID', 'REFUNDED'])
  status?: string;
}

export class QueryUsageDto {
  @ApiPropertyOptional({
    enum: [
      'OCR_CREDIT',
      'AI_CREDIT',
      'STORAGE_BYTE',
      'DOCUMENT_COUNT',
      'FAMILY_MEMBER',
      'LEGACY_PLAN',
      'EMERGENCY_SESSION',
    ],
  })
  @IsOptional()
  @IsString()
  type?: string;

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
}

export class QueryAdminSubscriptionsDto {
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

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

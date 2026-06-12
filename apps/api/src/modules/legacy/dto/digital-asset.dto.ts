import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';

const ASSET_TYPES = [
  'BANK_ACCOUNT',
  'INSURANCE_POLICY',
  'INVESTMENT',
  'PROPERTY',
  'BUSINESS_ASSET',
  'ONLINE_ACCOUNT',
  'SUBSCRIPTION',
  'EMAIL',
  'SOCIAL_MEDIA',
  'DOMAIN',
  'OTHER',
] as const;

export class RegisterDigitalAssetDto {
  @ApiProperty({ enum: ASSET_TYPES })
  @IsEnum(ASSET_TYPES)
  assetType!: string;

  @ApiProperty({ example: 'State Bank of India' })
  @IsString()
  serviceName!: string;

  @ApiPropertyOptional({ example: 'XXXX-1234' })
  @IsOptional()
  @IsString()
  accountRef?: string;

  @ApiPropertyOptional({ example: 'SBI Main Branch' })
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiPropertyOptional({ example: 'Joint account with spouse' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedBeneficiaryId?: string;
}

export class UpdateDigitalAssetDto {
  @ApiPropertyOptional({ enum: ASSET_TYPES })
  @IsOptional()
  @IsEnum(ASSET_TYPES)
  assetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedBeneficiaryId?: string;
}

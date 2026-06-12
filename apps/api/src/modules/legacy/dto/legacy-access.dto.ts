import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';

export class CreateLegacyAccessRequestDto {
  @ApiProperty()
  @IsUUID()
  beneficiaryId!: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsString()
  ownerEmail!: string;

  @ApiProperty({ example: 'Need access to financial records for estate processing' })
  @IsString()
  reason!: string;
}

export class ResolveLegacyAccessRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: string;

  @ApiPropertyOptional({ example: 'Verified identity via phone call' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ enum: ['DAYS_7', 'DAYS_30', 'DAYS_90'], default: 'DAYS_30' })
  @IsOptional()
  @IsEnum(['DAYS_7', 'DAYS_30', 'DAYS_90'])
  sessionDuration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  accessScope?: {
    planIds?: string[];
    documentIds?: string[];
    instructionIds?: string[];
  };
}

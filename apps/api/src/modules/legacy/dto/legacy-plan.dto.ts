import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateLegacyPlanDto {
  @ApiProperty({ example: 'Family Legacy Plan' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM'] })
  @IsEnum(['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM'])
  type!: string;

  @ApiPropertyOptional({ example: 'Comprehensive plan for family assets' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  accessRules?: Record<string, unknown>;
}

export class UpdateLegacyPlanDto {
  @ApiPropertyOptional({ example: 'Updated Plan Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM'] })
  @IsOptional()
  @IsEnum(['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  accessRules?: Record<string, unknown>;
}

export class AssignPlanBeneficiaryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  beneficiaryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  accessScope?: Record<string, unknown>;
}

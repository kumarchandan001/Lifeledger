import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class CreateLegacyInstructionDto {
  @ApiProperty({ example: 'Financial Account Instructions' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Detailed instructions for accessing financial accounts...' })
  @IsString()
  content!: string;

  @ApiProperty({ enum: ['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL'] })
  @IsEnum(['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL'])
  category!: string;

  @ApiPropertyOptional({ type: [Object], default: [] })
  @IsOptional()
  @IsArray()
  attachments?: Record<string, unknown>[];
}

export class UpdateLegacyInstructionDto {
  @ApiPropertyOptional({ example: 'Updated Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL'] })
  @IsOptional()
  @IsEnum(['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL'])
  category?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: Record<string, unknown>[];
}

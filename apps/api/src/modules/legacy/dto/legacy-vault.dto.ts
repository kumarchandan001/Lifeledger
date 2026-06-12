import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class AddLegacyVaultDocumentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  documentId!: string;

  @ApiProperty({ enum: ['FAMILY', 'INSURANCE', 'PROPERTY', 'MEDICAL', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'NOTES'] })
  @IsEnum(['FAMILY', 'INSURANCE', 'PROPERTY', 'MEDICAL', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'NOTES'])
  category!: string;

  @ApiPropertyOptional({ example: 'Important for life insurance claims' })
  @IsOptional()
  @IsString()
  notes?: string;
}

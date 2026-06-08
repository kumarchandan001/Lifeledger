import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNotificationsDto {
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
    enum: ['UNREAD', 'READ', 'ARCHIVED'],
  })
  @IsOptional()
  @IsEnum(['UNREAD', 'READ', 'ARCHIVED'])
  status?: 'UNREAD' | 'READ' | 'ARCHIVED';

  @ApiPropertyOptional({
    enum: [
      'EXPIRY_WARNING',
      'DOCUMENT_EXPIRED',
      'SECURITY_ALERT',
      'SYSTEM_NOTIFICATION',
      'ACCOUNT_ACTIVITY',
      'EMERGENCY',
      'FAMILY',
      'BILLING',
    ],
  })
  @IsOptional()
  @IsEnum([
    'EXPIRY_WARNING',
    'DOCUMENT_EXPIRED',
    'SECURITY_ALERT',
    'SYSTEM_NOTIFICATION',
    'ACCOUNT_ACTIVITY',
    'EMERGENCY',
    'FAMILY',
    'BILLING',
  ])
  type?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

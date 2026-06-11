import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateAccessRequestDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  ownerEmail!: string;

  @ApiProperty({ example: 'requester@example.com' })
  @IsEmail()
  requesterEmail!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  requesterName!: string;

  @ApiProperty({ example: 'The owner is currently hospitalized due to a cardiac event...' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: 'Hospital admission slip URL or text notes' })
  @IsOptional()
  @IsString()
  supportingInfo?: string;
}

export class ResolveAccessRequestDto {
  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: '72h', enum: ['24h', '72h', '7d'] })
  @IsOptional()
  @IsEnum(['24h', '72h', '7d'])
  sessionDuration?: '24h' | '72h' | '7d';

  @ApiPropertyOptional({
    example: {
      categories: ['medical', 'insurance'],
      documentIds: [],
    },
  })
  @IsOptional()
  @IsObject()
  accessScope?: {
    categories?: string[];
    documentIds?: string[];
  };
}

export class StartSessionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  token!: string;
}
export class EndSessionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  token!: string;
}

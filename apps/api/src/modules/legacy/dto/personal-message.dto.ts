import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreatePersonalMessageDto {
  @ApiProperty({ enum: ['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE'] })
  @IsEnum(['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE'])
  type!: string;

  @ApiProperty({ example: 'A Letter to My Children' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Dear family, I want you to know...' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'My Children' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class UpdatePersonalMessageDto {
  @ApiPropertyOptional({ enum: ['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE'] })
  @IsOptional()
  @IsEnum(['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

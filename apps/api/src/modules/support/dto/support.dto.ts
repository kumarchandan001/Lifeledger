import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Cannot upload file' })
  @IsString()
  subject!: string;

  @ApiProperty({ example: 'I am getting a storage quota exceeded error when trying to upload a 2MB PDF.' })
  @IsString()
  message!: string;

  @ApiProperty({ example: 'BUG_REPORT', enum: ['SUPPORT', 'BUG_REPORT', 'FEEDBACK'] })
  @IsEnum(['SUPPORT', 'BUG_REPORT', 'FEEDBACK'])
  category!: string;
}

export class UpdateSupportTicketDto {
  @ApiProperty({ example: 'RESOLVED', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] })
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED'])
  status!: string;

  @ApiProperty({ example: 'Fixed the user limits override.', required: false })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

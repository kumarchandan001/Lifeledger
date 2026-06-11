import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class CreateTrustedContactDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Spouse', enum: ['Spouse', 'Parent', 'Child', 'Sibling', 'Lawyer', 'Doctor', 'Executor', 'Friend', 'Other'] })
  @IsEnum(['Spouse', 'Parent', 'Child', 'Sibling', 'Lawyer', 'Doctor', 'Executor', 'Friend', 'Other'])
  relationship!: string;
}

export class UpdateTrustedContactDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Spouse', enum: ['Spouse', 'Parent', 'Child', 'Sibling', 'Lawyer', 'Doctor', 'Executor', 'Friend', 'Other'] })
  @IsOptional()
  @IsEnum(['Spouse', 'Parent', 'Child', 'Sibling', 'Lawyer', 'Doctor', 'Executor', 'Friend', 'Other'])
  relationship?: string;
}

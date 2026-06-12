import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';

export class CreateBeneficiaryDto {
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

  @ApiProperty({ enum: ['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'EXECUTOR', 'LAWYER', 'FRIEND', 'OTHER'] })
  @IsEnum(['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'EXECUTOR', 'LAWYER', 'FRIEND', 'OTHER'])
  relationship!: string;

  @ApiPropertyOptional({ example: 'Primary beneficiary for financial legacy' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class UpdateBeneficiaryDto {
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

  @ApiPropertyOptional({ enum: ['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'EXECUTOR', 'LAWYER', 'FRIEND', 'OTHER'] })
  @IsOptional()
  @IsEnum(['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'EXECUTOR', 'LAWYER', 'FRIEND', 'OTHER'])
  relationship?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';

export class UpdateEmergencySettingsDto {
  @ApiProperty({ example: 7, enum: [3, 7, 14, 30] })
  @IsNumber()
  @IsEnum([3, 7, 14, 30])
  emergencyWaitingPeriod!: number;
}

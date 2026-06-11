import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { ExpiryModule } from '../expiry/expiry.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyModule } from '../emergency/emergency.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ExpiryModule,
    NotificationsModule,
    EmergencyModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}

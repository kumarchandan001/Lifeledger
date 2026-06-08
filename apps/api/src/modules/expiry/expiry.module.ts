import { Module } from '@nestjs/common';
import { ExpiryService } from './expiry.service';
import { ExpiryController } from './expiry.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({
  imports: [NotificationsModule, NotificationPreferencesModule],
  controllers: [ExpiryController],
  providers: [ExpiryService],
  exports: [ExpiryService],
})
export class ExpiryModule {}

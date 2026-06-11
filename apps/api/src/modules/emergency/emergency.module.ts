import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';

import { EmergencyController } from './emergency.controller';
import { TrustedContactsService } from './trusted-contacts.service';
import { EmergencyVaultService } from './emergency-vault.service';
import { EmergencyRequestsService } from './emergency-requests.service';
import { EmergencyAccessService } from './emergency-access.service';
import { EmergencyActivityService } from './emergency-activity.service';
import { EscalationService } from './escalation.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    MailModule,
    AiModule,
    StorageModule,
  ],
  controllers: [EmergencyController],
  providers: [
    TrustedContactsService,
    EmergencyVaultService,
    EmergencyRequestsService,
    EmergencyAccessService,
    EmergencyActivityService,
    EscalationService,
  ],
  exports: [
    TrustedContactsService,
    EmergencyVaultService,
    EmergencyRequestsService,
    EmergencyAccessService,
    EmergencyActivityService,
    EscalationService,
  ],
})
export class EmergencyModule {}

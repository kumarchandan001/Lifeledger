import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { AiModule } from '../ai/ai.module';

import { LegacyController } from './legacy.controller';
import { BeneficiaryService } from './beneficiary.service';
import { LegacyPlanService } from './legacy-plan.service';
import { LegacyVaultService } from './legacy-vault.service';
import { LegacyInstructionService } from './legacy-instruction.service';
import { PersonalMessageService } from './personal-message.service';
import { DigitalAssetService } from './digital-asset.service';
import { LegacyAccessService } from './legacy-access.service';
import { LegacyActivityService } from './legacy-activity.service';
import { LegacyAnalyticsService } from './legacy-analytics.service';

@Module({
  imports: [PrismaModule, NotificationsModule, MailModule, AiModule],
  controllers: [LegacyController],
  providers: [
    BeneficiaryService,
    LegacyPlanService,
    LegacyVaultService,
    LegacyInstructionService,
    PersonalMessageService,
    DigitalAssetService,
    LegacyAccessService,
    LegacyActivityService,
    LegacyAnalyticsService,
  ],
  exports: [
    BeneficiaryService,
    LegacyPlanService,
    LegacyVaultService,
    LegacyInstructionService,
    PersonalMessageService,
    DigitalAssetService,
    LegacyAccessService,
    LegacyActivityService,
    LegacyAnalyticsService,
  ],
})
export class LegacyModule {}

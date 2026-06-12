import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './services/billing.service';
import { EntitlementService } from './services/entitlement.service';
import { UsageService } from './services/usage.service';
import { StripeService } from './services/stripe.service';
import { InvoiceService } from './services/invoice.service';
import { AnalyticsService } from './services/analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    EntitlementService,
    UsageService,
    StripeService,
    InvoiceService,
    AnalyticsService,
  ],
  exports: [
    BillingService,
    EntitlementService,
    UsageService,
    StripeService,
    InvoiceService,
  ],
})
export class BillingModule {}

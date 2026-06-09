import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from './modules/storage/storage.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationPreferencesModule } from './modules/notification-preferences/notification-preferences.module';
import { ExpiryModule } from './modules/expiry/expiry.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// Sprint 5: AI Document Intelligence
import { OcrModule } from './modules/ocr/ocr.module';
import { AiModule } from './modules/ai/ai.module';
import { QueueModule } from './modules/queue/queue.module';
import { DocumentIntelligenceModule } from './modules/document-intelligence/document-intelligence.module';

@Module({
  imports: [
    // ─── Global Config ───
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Rate Limiting ───
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),

    // ─── Infrastructure Modules ───
    PrismaModule,
    RedisModule,
    AuditModule,
    MailModule,
    StorageModule,

    // ─── Feature Modules ───
    HealthModule,
    AuthModule,
    CategoriesModule,
    DocumentsModule,
    SearchModule,

    // ─── Sprint 4: Notifications & Expiry ───
    NotificationsModule,
    NotificationPreferencesModule,
    ExpiryModule,
    SchedulerModule,

    // ─── Sprint 5: AI Document Intelligence ───
    OcrModule,
    AiModule,
    QueueModule,
    DocumentIntelligenceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}


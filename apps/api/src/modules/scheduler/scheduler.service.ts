import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExpiryService } from '../expiry/expiry.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EscalationService } from '../emergency/escalation.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly expiryService: ExpiryService,
    private readonly notificationsService: NotificationsService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * Daily Expiry Scanner — runs at midnight UTC every day.
   * Scans all active documents for expiry milestones,
   * generates notifications, and queues emails.
   */
  @Cron('0 0 * * *', { name: 'daily-expiry-scanner' })
  async handleDailyExpiryScan(): Promise<void> {
    this.logger.log('🔍 Daily expiry scanner started');

    try {
      const result = await this.expiryService.scanAllDocumentsForExpiry();

      this.logger.log(
        `✅ Daily expiry scan completed: ${result.scanned} scanned, ${result.notified} notified, ${result.statusUpdated} status updated`,
      );
    } catch (error) {
      this.logger.error('❌ Daily expiry scanner failed', error);
    }
  }

  /**
   * Weekly Notification Cleanup — runs Sunday at 2 AM UTC.
   * Archives old READ notifications and deletes old ARCHIVED ones.
   */
  @Cron('0 2 * * 0', { name: 'weekly-notification-cleanup' })
  async handleWeeklyCleanup(): Promise<void> {
    this.logger.log('🧹 Weekly notification cleanup started');

    try {
      // Archive READ notifications older than 90 days
      const archived = await this.notificationsService.archiveOldNotifications(90);

      // Hard-delete ARCHIVED notifications older than 180 days
      const deleted = await this.notificationsService.deleteArchivedNotifications(180);

      this.logger.log(
        `✅ Weekly cleanup completed: ${archived} archived, ${deleted} deleted`,
      );
    } catch (error) {
      this.logger.error('❌ Weekly notification cleanup failed', error);
    }
  }

  /**
   * Emergency Access Request Escalation and Reminders job.
   * Runs hourly to check for expired waiting periods and send reminders.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: 'emergency-access-workflow-checks' })
  async handleEmergencyWorkflows(): Promise<void> {
    this.logger.log('🚨 Emergency access workflow checks started');

    try {
      await this.escalationService.processEscalationAndReminders();
      this.logger.log('✅ Emergency access workflow checks completed successfully');
    } catch (error) {
      this.logger.error('❌ Emergency access workflow checks failed', error);
    }
  }
}

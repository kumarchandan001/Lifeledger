import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationPreferencesService } from '../notification-preferences/notification-preferences.service';
import { MailService } from '../mail/mail.service';
import { DocumentStatus, NotificationType } from '@lifeledger/database';
import { EXPIRY_MILESTONES, MILESTONE_PREFERENCE_MAP } from '@lifeledger/shared';

@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Main expiry scanner — called by the daily cron job.
   * Scans all active documents with expiry dates and generates notifications.
   */
  async scanAllDocumentsForExpiry(): Promise<{
    scanned: number;
    notified: number;
    statusUpdated: number;
  }> {
    const startTime = Date.now();
    this.logger.log('Starting daily expiry scan...');

    let scanned = 0;
    let notified = 0;
    let statusUpdated = 0;

    // Fetch all active documents with expiry dates, grouped by user
    const documents = await this.prisma.document.findMany({
      where: {
        expiryDate: { not: null },
        deletedAt: null,
        status: { in: [DocumentStatus.ACTIVE, DocumentStatus.EXPIRING_SOON] },
      },
      include: {
        category: true,
        user: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { userId: 'asc' },
    });

    scanned = documents.length;

    // Cache user preferences to avoid repeated DB calls
    const preferencesCache = new Map<string, any>();

    for (const doc of documents) {
      try {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(doc.expiryDate!);
        const milestone = this.findMilestone(daysUntilExpiry);

        // Update document status if needed
        const newStatus = this.determineDocumentStatus(daysUntilExpiry);
        if (newStatus !== doc.status) {
          await this.prisma.document.update({
            where: { id: doc.id },
            data: { status: newStatus },
          });
          statusUpdated++;
        }

        // If no milestone matches (document is still far from expiry), skip
        if (milestone === null) continue;

        // Get or cache user preferences
        if (!preferencesCache.has(doc.userId)) {
          const prefs = await this.preferencesService.getOrCreate(doc.userId);
          preferencesCache.set(doc.userId, prefs);
        }
        const preferences = preferencesCache.get(doc.userId);

        // Check if this milestone is enabled in user preferences
        const prefField = MILESTONE_PREFERENCE_MAP[milestone];
        if (prefField && !preferences[prefField]) {
          continue; // User disabled this milestone
        }

        // Check for duplicate notification
        const notificationType =
          daysUntilExpiry <= 0
            ? NotificationType.DOCUMENT_EXPIRED
            : NotificationType.EXPIRY_WARNING;

        const isDuplicate = await this.notificationsService.isDuplicate(
          doc.userId,
          notificationType,
          doc.id,
          milestone,
        );

        if (isDuplicate) continue;

        // Generate notification title and message
        const { title, message } = this.buildNotificationContent(
          doc.title,
          doc.category?.name ?? 'Document',
          daysUntilExpiry,
          milestone,
        );

        // Create in-app notification if enabled
        if (preferences.inAppEnabled) {
          await this.notificationsService.create({
            userId: doc.userId,
            type: notificationType,
            title,
            message,
            metadata: {
              documentId: doc.id,
              documentTitle: doc.title,
              categoryName: doc.category?.name,
              expiryDate: doc.expiryDate!.toISOString(),
              daysRemaining: daysUntilExpiry,
              milestone,
            },
          });
        }

        // Send email notification if enabled
        if (preferences.emailEnabled) {
          try {
            if (daysUntilExpiry <= 0) {
              await this.mailService.sendDocumentExpiredEmail(
                doc.user.email,
                doc.title,
                doc.expiryDate!.toISOString(),
              );
            } else {
              await this.mailService.sendExpiryWarningEmail(
                doc.user.email,
                doc.title,
                doc.expiryDate!.toISOString(),
                daysUntilExpiry,
              );
            }
          } catch (emailError) {
            this.logger.error(`Failed to send expiry email for document ${doc.id}`, emailError);
          }
        }

        notified++;
      } catch (error) {
        this.logger.error(`Error processing document ${doc.id}`, error);
      }
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `Expiry scan completed in ${elapsed}ms: scanned=${scanned}, notified=${notified}, statusUpdated=${statusUpdated}`,
    );

    return { scanned, notified, statusUpdated };
  }

  /**
   * Get documents expiring within the specified number of days.
   * Used by the dashboard "Expiring Soon" widget.
   */
  async getExpiringDocuments(userId: string, withinDays: number = 90) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        deletedAt: null,
        expiryDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: { expiryDate: 'asc' },
      take: 10,
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      categoryName: doc.category?.name ?? 'Unknown',
      categoryIcon: doc.category?.icon ?? '📄',
      expiryDate: doc.expiryDate!.toISOString(),
      daysRemaining: this.calculateDaysUntilExpiry(doc.expiryDate!),
    }));
  }

  /**
   * Get documents that have recently expired (within last 30 days).
   * Used by the dashboard "Recently Expired" widget.
   */
  async getExpiredDocuments(userId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        deletedAt: null,
        expiryDate: {
          lt: now,
          gte: thirtyDaysAgo,
        },
      },
      include: {
        category: true,
      },
      orderBy: { expiryDate: 'desc' },
      take: 10,
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      categoryName: doc.category?.name ?? 'Unknown',
      categoryIcon: doc.category?.icon ?? '📄',
      expiryDate: doc.expiryDate!.toISOString(),
    }));
  }

  /**
   * Get notification summary stats for the dashboard.
   */
  async getSummary(userId: string) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalNotifications, unreadNotifications, expiringThisMonth] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({
        where: { userId, status: 'UNREAD' },
      }),
      this.prisma.document.count({
        where: {
          userId,
          deletedAt: null,
          expiryDate: {
            gte: now,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    return {
      totalNotifications,
      unreadNotifications,
      expiringThisMonth,
    };
  }

  // ─── Private Helpers ───

  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  private findMilestone(daysUntilExpiry: number): number | null {
    // Already expired
    if (daysUntilExpiry <= 0) return 0;

    // Find the closest milestone that matches
    for (const milestone of EXPIRY_MILESTONES) {
      if (milestone === 0) continue; // handled above
      if (daysUntilExpiry === milestone) return milestone;
    }

    return null;
  }

  private determineDocumentStatus(daysUntilExpiry: number): DocumentStatus {
    if (daysUntilExpiry <= 0) return DocumentStatus.EXPIRED;
    if (daysUntilExpiry <= 90) return DocumentStatus.EXPIRING_SOON;
    return DocumentStatus.ACTIVE;
  }

  private buildNotificationContent(
    documentTitle: string,
    categoryName: string,
    daysUntilExpiry: number,
    milestone: number,
  ): { title: string; message: string } {
    if (daysUntilExpiry <= 0) {
      return {
        title: `${documentTitle} has expired`,
        message: `Your ${categoryName} "${documentTitle}" has expired. Please renew it as soon as possible to avoid any issues.`,
      };
    }

    return {
      title: `${documentTitle} expires in ${daysUntilExpiry} days`,
      message: `Your ${categoryName} "${documentTitle}" will expire in ${daysUntilExpiry} days. Consider renewing it before the expiry date.`,
    };
  }
}

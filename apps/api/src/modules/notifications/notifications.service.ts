import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, NotificationStatus } from '@lifeledger/database';
import { QueryNotificationsDto } from './dto/notifications.dto';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateNotificationParams) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          metadata: (params.metadata as any) ?? {},
          status: NotificationStatus.UNREAD,
        },
      });

      this.logger.log(`Notification created for user ${params.userId}: ${params.type}`);
      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async findAll(userId: string, query: QueryNotificationsDto) {
    const { page, limit, status, type, sortOrder } = query;

    const whereClause: any = { userId };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id } });

    return { success: true, message: 'Notification deleted' };
  }

  /**
   * Check if a duplicate notification already exists for a specific document
   * and milestone to prevent re-notifying for the same event.
   */
  async isDuplicate(
    userId: string,
    type: NotificationType,
    documentId: string,
    milestone: number,
  ): Promise<boolean> {
    const existing = await this.prisma.notification.findFirst({
      where: {
        userId,
        type,
        metadata: {
          path: ['documentId'],
          equals: documentId,
        },
      },
    });

    if (!existing) return false;

    // Check if the same milestone was already notified
    const meta = existing.metadata as Record<string, unknown>;
    return meta.milestone === milestone;
  }

  /**
   * Archive notifications older than the specified number of days.
   * Used by the weekly cleanup cron.
   */
  async archiveOldNotifications(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.notification.updateMany({
      where: {
        status: NotificationStatus.READ,
        createdAt: { lt: cutoffDate },
      },
      data: {
        status: NotificationStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Hard-delete archived notifications older than the specified number of days.
   */
  async deleteArchivedNotifications(olderThanDays: number = 180): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.notification.deleteMany({
      where: {
        status: NotificationStatus.ARCHIVED,
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}

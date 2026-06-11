import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyActivityService } from './emergency-activity.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RequestStatus } from '@lifeledger/database';

@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: EmergencyActivityService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async escalateRequest(requestId: string) {
    const request = await this.prisma.emergencyAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        trustedContact: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!request || request.status !== RequestStatus.PENDING) {
      return;
    }

    const owner = request.trustedContact.user;

    // Escalate status
    await this.prisma.emergencyAccessRequest.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.ESCALATED,
      },
    });

    // Log activity
    await this.activityService.logActivity(owner.id, 'REQUEST_ESCALATED', 'SYSTEM', {
      requestId,
      contactName: request.trustedContact.name,
      contactEmail: request.trustedContact.email,
    });

    // In-app notification to Owner
    await this.notificationsService.create({
      userId: owner.id,
      type: NotificationType.EMERGENCY,
      title: 'Emergency Request Escalated',
      message: `The emergency request by ${request.trustedContact.name} was not resolved during the waiting period. It has been marked as ESCALATED.`,
      metadata: { requestId },
    });

    // Email notifications
    try {
      if (typeof (this.mailService as any).sendEscalationNoticeEmail === 'function') {
        await (this.mailService as any).sendEscalationNoticeEmail(
          owner.email,
          request.trustedContact.name,
          requestId,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send escalation email to owner', err);
    }

    try {
      if (typeof (this.mailService as any).sendEscalationRequesterNoticeEmail === 'function') {
        await (this.mailService as any).sendEscalationRequesterNoticeEmail(
          request.trustedContact.email,
          request.trustedContact.name,
          owner.fullName,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send escalation email to requester', err);
    }
  }

  async processEscalationAndReminders() {
    const now = new Date();

    // 1. Process Pending requests that have expired -> Escalate them
    const expiredRequests = await this.prisma.emergencyAccessRequest.findMany({
      where: {
        status: RequestStatus.PENDING,
        expiresAt: { lt: now },
      },
    });

    for (const req of expiredRequests) {
      await this.escalateRequest(req.id);
    }

    // 2. Process active grants that have expired -> Set request status to EXPIRED
    const expiredGrants = await this.prisma.emergencyAccessGrant.findMany({
      where: {
        expiresAt: { lt: now },
        request: {
          status: RequestStatus.APPROVED,
        },
      },
      include: {
        request: {
          include: {
            trustedContact: true,
          },
        },
      },
    });

    for (const grant of expiredGrants) {
      await this.prisma.emergencyAccessRequest.update({
        where: { id: grant.requestId },
        data: { status: RequestStatus.EXPIRED },
      });

      // Log activity
      await this.activityService.logActivity(
        grant.request.trustedContact.userId,
        'SESSION_EXPIRED',
        grant.request.trustedContactId,
        { grantId: grant.id },
      );

      // In-app notification to Owner
      await this.notificationsService.create({
        userId: grant.request.trustedContact.userId,
        type: NotificationType.EMERGENCY,
        title: 'Emergency Session Expired',
        message: `${grant.request.trustedContact.name}'s emergency access session has expired.`,
        metadata: { grantId: grant.id },
      });
    }

    // 3. Process waiting period reminders
    const pendingRequests = await this.prisma.emergencyAccessRequest.findMany({
      where: { status: RequestStatus.PENDING },
      include: {
        trustedContact: {
          include: {
            user: true,
          },
        },
      },
    });

    for (const req of pendingRequests) {
      const createdAt = new Date(req.createdAt);
      const expiresAt = new Date(req.expiresAt);
      const totalDuration = expiresAt.getTime() - createdAt.getTime();
      const elapsed = now.getTime() - createdAt.getTime();
      const remaining = expiresAt.getTime() - now.getTime();

      const metadata = (req.metadata as Record<string, any>) || {};
      const reminders = metadata.reminders || [];
      const updatedReminders = [...reminders];
      let shouldUpdateMetadata = false;

      // Halfway reminder
      if (!reminders.includes('halfway') && elapsed >= totalDuration / 2) {
        shouldUpdateMetadata = true;
        updatedReminders.push('halfway');

        // Send notification
        await this.notificationsService.create({
          userId: req.trustedContact.userId,
          type: NotificationType.EMERGENCY,
          title: 'Waiting Period Reminder',
          message: `The emergency request by ${req.trustedContact.name} is halfway through its waiting period. It will escalate in ${Math.round(remaining / (1000 * 60 * 60 * 24))} days.`,
          metadata: { requestId: req.id },
        });

        try {
          if (typeof (this.mailService as any).sendWaitingPeriodReminderEmail === 'function') {
            await (this.mailService as any).sendWaitingPeriodReminderEmail(
              req.trustedContact.user.email,
              req.trustedContact.name,
              Math.round(remaining / (1000 * 60 * 60 * 24)),
              req.id,
            );
          }
        } catch (err) {
          this.logger.error('Failed to send reminder email', err);
        }
      }

      // Near end reminder (24 hours remaining, and waiting period is > 1 day)
      if (
        !reminders.includes('near_end') &&
        req.waitingPeriod > 1 &&
        remaining <= 24 * 60 * 60 * 1000 &&
        remaining > 0
      ) {
        shouldUpdateMetadata = true;
        updatedReminders.push('near_end');

        // Send notification
        await this.notificationsService.create({
          userId: req.trustedContact.userId,
          type: NotificationType.EMERGENCY,
          title: 'Critical Waiting Period Reminder',
          message: `The emergency request by ${req.trustedContact.name} will escalate in less than 24 hours. Action required.`,
          metadata: { requestId: req.id },
        });

        try {
          if (typeof (this.mailService as any).sendWaitingPeriodReminderEmail === 'function') {
            await (this.mailService as any).sendWaitingPeriodReminderEmail(
              req.trustedContact.user.email,
              req.trustedContact.name,
              1,
              req.id,
            );
          }
        } catch (err) {
          this.logger.error('Failed to send critical reminder email', err);
        }
      }

      if (shouldUpdateMetadata) {
        await this.prisma.emergencyAccessRequest.update({
          where: { id: req.id },
          data: {
            metadata: {
              ...metadata,
              reminders: updatedReminders,
            },
          },
        });
      }
    }
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccessRequestDto, ResolveAccessRequestDto } from './dto/emergency-request.dto';
import { EmergencyActivityService } from './emergency-activity.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RequestStatus } from '@lifeledger/database';

@Injectable()
export class EmergencyRequestsService {
  private readonly logger = new Logger(EmergencyRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: EmergencyActivityService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAccessRequestDto): Promise<any> {
    // Look up owner
    const owner = await this.prisma.user.findUnique({
      where: { email: dto.ownerEmail },
    });
    if (!owner) {
      throw new ForbiddenException('Invalid emergency access request');
    }

    // Verify requester is a designated trusted contact for the owner
    const contact = await this.prisma.trustedContact.findFirst({
      where: {
        userId: owner.id,
        email: dto.requesterEmail,
      },
    });

    if (!contact) {
      throw new ForbiddenException('Invalid emergency access request');
    }

    // Look up if requester has a registered account (optional)
    const requesterUser = await this.prisma.user.findUnique({
      where: { email: dto.requesterEmail },
    });

    // Calculate waiting period and expiry
    const waitingPeriod = owner.emergencyWaitingPeriod; // default 7
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + waitingPeriod);

    // Create the request
    const request = await this.prisma.emergencyAccessRequest.create({
      data: {
        trustedContactId: contact.id,
        requesterId: requesterUser?.id || null,
        reason: dto.reason,
        status: RequestStatus.PENDING,
        waitingPeriod,
        expiresAt,
      },
      include: {
        trustedContact: true,
      },
    });

    // Log activity
    await this.activityService.logActivity(owner.id, 'REQUEST_SUBMITTED', contact.id, {
      requestId: request.id,
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      waitingPeriod,
    });

    // Send in-app notification to Owner
    await this.notificationsService.create({
      userId: owner.id,
      type: NotificationType.EMERGENCY,
      title: 'Emergency Access Requested',
      message: `${dto.requesterName} has requested emergency access to your vault. The waiting period is ${waitingPeriod} days.`,
      metadata: { requestId: request.id },
    });

    // Send email to Owner
    try {
      if (typeof (this.mailService as any).sendEmergencyRequestEmail === 'function') {
        await (this.mailService as any).sendEmergencyRequestEmail(
          owner.email,
          dto.requesterName,
          waitingPeriod,
          request.id,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send request email to owner', err);
    }

    // Send email to Requester
    try {
      if (typeof (this.mailService as any).sendRequestConfirmationEmail === 'function') {
        await (this.mailService as any).sendRequestConfirmationEmail(
          dto.requesterEmail,
          dto.requesterName,
          owner.fullName,
          waitingPeriod,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send confirmation email to requester', err);
    }

    return request;
  }

  async resolve(id: string, userId: string, dto: ResolveAccessRequestDto): Promise<any> {
    const request = await this.prisma.emergencyAccessRequest.findUnique({
      where: { id },
      include: {
        trustedContact: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.trustedContact.userId !== userId) {
      throw new ForbiddenException('You are not authorized to resolve this request');
    }

    if (request.status !== RequestStatus.PENDING && request.status !== RequestStatus.ESCALATED) {
      throw new BadRequestException('Request is already resolved');
    }

    const updatedRequest = await this.prisma.emergencyAccessRequest.update({
      where: { id },
      data: {
        status: dto.status as any,
      },
    });

    if (dto.status === 'APPROVED') {
      // Calculate expiresAt for the grant
      let hours = 72; // default 72h
      if (dto.sessionDuration === '24h') hours = 24;
      if (dto.sessionDuration === '7d') hours = 168;

      const grantExpiresAt = new Date();
      grantExpiresAt.setHours(grantExpiresAt.getHours() + hours);

      const grant = await this.prisma.emergencyAccessGrant.create({
        data: {
          requestId: request.id,
          expiresAt: grantExpiresAt,
          accessScope: (dto.accessScope as any) || {},
        },
      });

      // Log activity
      await this.activityService.logActivity(userId, 'REQUEST_APPROVED', userId, {
        requestId: request.id,
        grantId: grant.id,
        expiresAt: grantExpiresAt,
      });

      // Send notifications
      // In-app notification to Owner
      await this.notificationsService.create({
        userId,
        type: NotificationType.EMERGENCY,
        title: 'Emergency Access Request Approved',
        message: `You approved the access request from ${request.trustedContact.name}. A secure link has been sent to them.`,
        metadata: { requestId: request.id, grantId: grant.id },
      });

      // Send email to Requester
      try {
        if (typeof (this.mailService as any).sendRequestApprovedEmail === 'function') {
          await (this.mailService as any).sendRequestApprovedEmail(
            request.trustedContact.email,
            request.trustedContact.name,
            request.trustedContact.user.fullName,
            grant.id,
            grantExpiresAt,
          );
        }
      } catch (err) {
        this.logger.error('Failed to send approval email to requester', err);
      }
    } else {
      // Log activity
      await this.activityService.logActivity(userId, 'REQUEST_REJECTED', userId, {
        requestId: request.id,
      });

      // Send notifications
      // In-app notification to Owner
      await this.notificationsService.create({
        userId,
        type: NotificationType.EMERGENCY,
        title: 'Emergency Access Request Rejected',
        message: `You rejected the access request from ${request.trustedContact.name}.`,
        metadata: { requestId: request.id },
      });

      // Send email to Requester
      try {
        if (typeof (this.mailService as any).sendRequestRejectedEmail === 'function') {
          await (this.mailService as any).sendRequestRejectedEmail(
            request.trustedContact.email,
            request.trustedContact.name,
            request.trustedContact.user.fullName,
          );
        }
      } catch (err) {
        this.logger.error('Failed to send rejection email to requester', err);
      }
    }

    return updatedRequest;
  }

  async cancel(id: string, requesterEmail: string): Promise<any> {
    const request = await this.prisma.emergencyAccessRequest.findUnique({
      where: { id },
      include: {
        trustedContact: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.trustedContact.email !== requesterEmail) {
      throw new ForbiddenException('You are not authorized to cancel this request');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updated = await this.prisma.emergencyAccessRequest.update({
      where: { id },
      data: {
        status: RequestStatus.CANCELLED,
      },
    });

    await this.activityService.logActivity(
      request.trustedContact.userId,
      'REQUEST_CANCELLED',
      request.trustedContactId,
      {
        requestId: id,
      },
    );

    return updated;
  }

  async findAllIncoming(userId: string): Promise<any> {
    return this.prisma.emergencyAccessRequest.findMany({
      where: {
        trustedContact: {
          userId,
        },
      },
      include: {
        trustedContact: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequestStatus(id: string): Promise<any> {
    const request = await this.prisma.emergencyAccessRequest.findUnique({
      where: { id },
      include: {
        trustedContact: {
          select: {
            name: true,
            email: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }
}

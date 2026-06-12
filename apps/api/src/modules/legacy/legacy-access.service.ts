import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ResolveLegacyAccessRequestDto } from './dto/legacy-access.dto';

@Injectable()
export class LegacyAccessService {
  private readonly logger = new Logger(LegacyAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(ownerId: string, beneficiaryId: string, reason: string) {
    // Validate beneficiary belongs to the owner
    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });
    if (!beneficiary || beneficiary.userId !== ownerId) {
      throw new NotFoundException('Beneficiary not found');
    }

    // Check for existing pending request
    const existingPending = await this.prisma.legacyAccessRequest.findFirst({
      where: {
        ownerId,
        beneficiaryId,
        status: { in: ['PENDING' as any, 'UNDER_REVIEW' as any] },
      },
    });
    if (existingPending) {
      throw new BadRequestException('A pending access request already exists for this beneficiary');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Requests expire in 30 days

    const request = await this.prisma.legacyAccessRequest.create({
      data: {
        ownerId,
        beneficiaryId,
        reason,
        expiresAt,
      },
      include: { beneficiary: true },
    });

    // Notify the owner
    await this.notificationsService.create({
      userId: ownerId,
      type: 'LEGACY' as any,
      title: 'Legacy Access Request',
      message: `${beneficiary.name} has submitted a legacy access request.`,
      metadata: { requestId: request.id, beneficiaryName: beneficiary.name },
    });

    await this.activityService.logActivity(
      ownerId,
      'ACCESS_REQUESTED',
      'legacy_access_request',
      request.id,
      undefined,
      { beneficiaryName: beneficiary.name, reason },
    );

    return request;
  }

  async findIncomingRequests(ownerId: string) {
    return this.prisma.legacyAccessRequest.findMany({
      where: { ownerId },
      include: {
        beneficiary: {
          select: { id: true, name: true, email: true, relationship: true },
        },
        grant: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(requestId: string, ownerId: string, dto: ResolveLegacyAccessRequestDto) {
    const request = await this.prisma.legacyAccessRequest.findUnique({
      where: { id: requestId },
      include: { beneficiary: true },
    });
    if (!request) {
      throw new NotFoundException('Access request not found');
    }
    if (request.ownerId !== ownerId) {
      throw new ForbiddenException('You are not the owner of this request');
    }
    if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
      throw new BadRequestException('Request has already been resolved');
    }

    const newStatus = dto.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.legacyAccessRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus as any,
        reviewNotes: dto.reviewNotes || null,
        resolvedAt: new Date(),
      },
    });

    if (dto.status === 'APPROVED') {
      const duration = dto.sessionDuration || 'DAYS_30';
      const daysMap: Record<string, number> = {
        DAYS_7: 7,
        DAYS_30: 30,
        DAYS_90: 90,
      };
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (daysMap[duration] || 30));

      await this.prisma.legacyAccessGrant.create({
        data: {
          requestId,
          duration: duration as any,
          accessScope: (dto.accessScope as any) || {},
          expiresAt,
        },
      });

      await this.activityService.logActivity(
        ownerId,
        'ACCESS_APPROVED',
        'legacy_access_request',
        requestId,
        ownerId,
        {
          beneficiaryName: request.beneficiary.name,
          duration,
        },
      );
    } else {
      await this.activityService.logActivity(
        ownerId,
        'ACCESS_REJECTED',
        'legacy_access_request',
        requestId,
        ownerId,
        { beneficiaryName: request.beneficiary.name },
      );
    }

    return updated;
  }

  async getActiveSessions(ownerId: string) {
    return this.prisma.legacyAccessGrant.findMany({
      where: {
        request: { ownerId },
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        request: {
          include: {
            beneficiary: {
              select: { id: true, name: true, email: true, relationship: true },
            },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  async expireOldSessions() {
    const expired = await this.prisma.legacyAccessGrant.updateMany({
      where: {
        isActive: true,
        expiresAt: { lte: new Date() },
      },
      data: { isActive: false },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} legacy access sessions`);
    }

    return expired;
  }
}

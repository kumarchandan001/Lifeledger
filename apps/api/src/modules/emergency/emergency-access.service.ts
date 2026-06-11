import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyActivityService } from './emergency-activity.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, RequestStatus } from '@lifeledger/database';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class EmergencyAccessService {
  private readonly logger = new Logger(EmergencyAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: EmergencyActivityService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
  ) {}

  async startSession(grantId: string) {
    const grant = await this.prisma.emergencyAccessGrant.findUnique({
      where: { id: grantId },
      include: {
        request: {
          include: {
            trustedContact: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid session token');
    }

    if (new Date() > grant.expiresAt) {
      throw new ForbiddenException('Session token has expired');
    }

    if (grant.request.status !== RequestStatus.APPROVED) {
      throw new ForbiddenException('Access request is not approved');
    }

    const ownerId = grant.request.trustedContact.userId;

    // Log activity
    await this.activityService.logActivity(ownerId, 'SESSION_STARTED', grant.request.trustedContactId, {
      grantId: grant.id,
      requestId: grant.requestId,
    });

    // Send notifications
    await this.notificationsService.create({
      userId: ownerId,
      type: NotificationType.EMERGENCY,
      title: 'Emergency Session Started',
      message: `${grant.request.trustedContact.name} has initiated their emergency access session.`,
      metadata: { grantId: grant.id },
    });

    try {
      if (typeof (this.mailService as any).sendSessionStartedEmail === 'function') {
        await (this.mailService as any).sendSessionStartedEmail(
          grant.request.trustedContact.user.email,
          grant.request.trustedContact.name,
        );
      }
    } catch (err) {
      this.logger.error('Failed to send session started email to owner', err);
    }

    return {
      expiresAt: grant.expiresAt,
      ownerName: grant.request.trustedContact.user.fullName,
      requesterName: grant.request.trustedContact.name,
    };
  }

  async endSession(grantId: string) {
    const grant = await this.prisma.emergencyAccessGrant.findUnique({
      where: { id: grantId },
      include: {
        request: {
          include: {
            trustedContact: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid session token');
    }

    const ownerId = grant.request.trustedContact.userId;

    // Transition request status to EXPIRED
    await this.prisma.emergencyAccessRequest.update({
      where: { id: grant.requestId },
      data: { status: RequestStatus.EXPIRED },
    });

    // Log activity
    await this.activityService.logActivity(ownerId, 'SESSION_ENDED', grant.request.trustedContactId, {
      grantId: grant.id,
    });

    // Send notifications
    await this.notificationsService.create({
      userId: ownerId,
      type: NotificationType.EMERGENCY,
      title: 'Emergency Session Ended',
      message: `${grant.request.trustedContact.name}'s emergency access session has ended.`,
      metadata: { grantId: grant.id },
    });

    return { success: true, message: 'Session ended successfully' };
  }

  async viewDocuments(grantId: string) {
    const grant = await this.prisma.emergencyAccessGrant.findUnique({
      where: { id: grantId },
      include: {
        request: {
          include: {
            trustedContact: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid session token');
    }

    if (new Date() > grant.expiresAt) {
      throw new ForbiddenException('Session token has expired');
    }

    if (grant.request.status !== RequestStatus.APPROVED) {
      throw new ForbiddenException('Access request is not approved');
    }

    const ownerId = grant.request.trustedContact.userId;

    // Retrieve vault documents for this user
    const vaultDocs = await this.prisma.emergencyVaultDocument.findMany({
      where: { userId: ownerId },
      include: {
        document: {
          include: {
            category: true,
            subCategory: true,
          },
        },
      },
    });

    // Parse scope
    const scope = (grant.accessScope as any) || {};
    const scopeCategories: string[] = scope.categories || [];
    const scopeDocumentIds: string[] = scope.documentIds || [];

    // Filter documents by scope
    let filteredDocs = vaultDocs.map((vd) => vd.document);

    if (scopeCategories.length > 0) {
      filteredDocs = filteredDocs.filter((doc) => scopeCategories.includes(doc.category.slug));
    }

    if (scopeDocumentIds.length > 0) {
      filteredDocs = filteredDocs.filter((doc) => scopeDocumentIds.includes(doc.id));
    }

    // Generate signed download URLs (read-only access) for the filtered documents
    const resolvedDocs = await Promise.all(
      filteredDocs.map(async (doc) => {
        let downloadUrl = doc.fileUrl;
        try {
          downloadUrl = await this.storageService.generateDownloadUrl(doc.fileUrl);
        } catch (err) {
          this.logger.error(`Failed to generate signed download URL for document ${doc.id}`, err);
        }

        // Return a safe subset of fields (read-only metadata)
        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          fileName: doc.fileName,
          fileSize: doc.fileSize.toString(),
          mimeType: doc.mimeType,
          downloadUrl,
          category: {
            name: doc.category.name,
            slug: doc.category.slug,
            icon: doc.category.icon,
          },
          subCategory: doc.subCategory
            ? {
                name: doc.subCategory.name,
                slug: doc.subCategory.slug,
              }
            : null,
          issueDate: doc.issueDate,
          expiryDate: doc.expiryDate,
          documentNumber: doc.documentNumber,
          issuer: doc.issuer,
          createdAt: doc.createdAt,
        };
      }),
    );

    // Log viewed activity
    await this.activityService.logActivity(ownerId, 'DOCUMENTS_VIEWED', grant.request.trustedContactId, {
      grantId: grant.id,
      documentCount: resolvedDocs.length,
    });

    return resolvedDocs;
  }
}

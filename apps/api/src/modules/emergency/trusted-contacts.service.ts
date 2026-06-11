import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrustedContactDto, UpdateTrustedContactDto } from './dto/trusted-contact.dto';
import { EmergencyActivityService } from './emergency-activity.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@lifeledger/database';

@Injectable()
export class TrustedContactsService {
  private readonly logger = new Logger(TrustedContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: EmergencyActivityService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateTrustedContactDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if contact already exists for this user
    const existing = await this.prisma.trustedContact.findFirst({
      where: { userId, email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A trusted contact with this email already exists');
    }

    // Create the contact
    const contact = await this.prisma.trustedContact.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        relationship: dto.relationship,
      },
    });

    // Log the activity
    await this.activityService.logActivity(userId, 'CONTACT_ADDED', userId, {
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      relationship: contact.relationship,
    });

    // Send notifications
    // 1. In-app notification to Owner
    await this.notificationsService.create({
      userId,
      type: NotificationType.EMERGENCY,
      title: 'Trusted Contact Added',
      message: `You designated ${contact.name} (${contact.relationship}) as a trusted contact.`,
      metadata: { contactId: contact.id },
    });

    // 2. Email to the contact
    try {
      if (typeof (this.mailService as any).sendTrustedContactAdditionEmail === 'function') {
        await (this.mailService as any).sendTrustedContactAdditionEmail(
          contact.email,
          contact.name,
          user.fullName,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send trusted contact email to ${contact.email}`, error);
    }

    return contact;
  }

  async findAll(userId: string) {
    return this.prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const contact = await this.prisma.trustedContact.findUnique({
      where: { id },
    });
    if (!contact) {
      throw new NotFoundException('Trusted contact not found');
    }
    if (contact.userId !== userId) {
      throw new ForbiddenException('You do not have access to this contact');
    }
    return contact;
  }

  async update(id: string, userId: string, dto: UpdateTrustedContactDto) {
    const contact = await this.findOne(id, userId);

    const updated = await this.prisma.trustedContact.update({
      where: { id },
      data: {
        name: dto.name ?? contact.name,
        email: dto.email ?? contact.email,
        phone: dto.phone !== undefined ? dto.phone : contact.phone,
        relationship: dto.relationship ?? contact.relationship,
      },
    });

    await this.activityService.logActivity(userId, 'CONTACT_UPDATED', userId, {
      contactId: updated.id,
      changes: dto,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const contact = await this.findOne(id, userId);

    await this.prisma.trustedContact.delete({
      where: { id },
    });

    await this.activityService.logActivity(userId, 'CONTACT_REMOVED', userId, {
      contactId: id,
      contactName: contact.name,
      contactEmail: contact.email,
    });

    // In-app notification to Owner
    await this.notificationsService.create({
      userId,
      type: NotificationType.EMERGENCY,
      title: 'Trusted Contact Removed',
      message: `You removed ${contact.name} from your trusted contacts list.`,
      metadata: { contactId: id },
    });

    return { success: true, message: 'Trusted contact removed' };
  }
}

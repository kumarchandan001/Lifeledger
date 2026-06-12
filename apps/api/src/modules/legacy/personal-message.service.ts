import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { CreatePersonalMessageDto, UpdatePersonalMessageDto } from './dto/personal-message.dto';

@Injectable()
export class PersonalMessageService {
  private readonly logger = new Logger(PersonalMessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async create(userId: string, dto: CreatePersonalMessageDto): Promise<any> {
    const message = await this.prisma.personalMessage.create({
      data: {
        userId,
        type: dto.type as any,
        title: dto.title,
        content: dto.content,
        recipientName: dto.recipientName || null,
        isPrivate: dto.isPrivate ?? true,
      },
    });

    await this.activityService.logActivity(
      userId,
      'MESSAGE_CREATED',
      'personal_message',
      message.id,
      userId,
      { title: dto.title, type: dto.type },
    );

    return message;
  }

  async findAll(userId: string, type?: string): Promise<any> {
    const where: any = { userId };
    if (type) {
      where.type = type;
    }

    return this.prisma.personalMessage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<any> {
    const message = await this.prisma.personalMessage.findUnique({ where: { id } });
    if (!message || message.userId !== userId) {
      throw new NotFoundException('Message not found');
    }
    return message;
  }

  async update(userId: string, id: string, dto: UpdatePersonalMessageDto): Promise<any> {
    const existing = await this.prisma.personalMessage.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Message not found');
    }

    const updated = await this.prisma.personalMessage.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.recipientName !== undefined && { recipientName: dto.recipientName }),
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
      },
    });

    await this.activityService.logActivity(
      userId,
      'MESSAGE_UPDATED',
      'personal_message',
      id,
      userId,
      { title: updated.title },
    );

    return updated;
  }

  async remove(userId: string, id: string): Promise<any> {
    const existing = await this.prisma.personalMessage.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Message not found');
    }

    await this.prisma.personalMessage.delete({ where: { id } });

    await this.activityService.logActivity(
      userId,
      'MESSAGE_DELETED',
      'personal_message',
      id,
      userId,
      { title: existing.title },
    );

    return { success: true, message: 'Message deleted' };
  }
}

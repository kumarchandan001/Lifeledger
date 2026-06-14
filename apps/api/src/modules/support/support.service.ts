import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string | null, dto: CreateSupportTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        subject: dto.subject,
        message: dto.message,
        category: dto.category,
        status: 'OPEN',
      },
    });
  }

  async findAllAdmin(page: number = 1, limit: number = 10, status?: string, category?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets,
      total,
      page,
      limit,
    };
  }

  async updateAdmin(id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes ?? null,
      },
    });
  }
}

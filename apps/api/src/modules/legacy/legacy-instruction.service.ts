import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { CreateLegacyInstructionDto, UpdateLegacyInstructionDto } from './dto/legacy-instruction.dto';

@Injectable()
export class LegacyInstructionService {
  private readonly logger = new Logger(LegacyInstructionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async create(userId: string, dto: CreateLegacyInstructionDto): Promise<any> {
    const instruction = await this.prisma.legacyInstruction.create({
      data: {
        userId,
        title: dto.title,
        content: dto.content,
        category: dto.category as any,
        attachments: (dto.attachments as any) || [],
      },
    });

    await this.activityService.logActivity(
      userId,
      'INSTRUCTION_CREATED',
      'legacy_instruction',
      instruction.id,
      userId,
      { title: dto.title, category: dto.category },
    );

    return instruction;
  }

  async findAll(userId: string, category?: string): Promise<any> {
    const where: any = { userId, isActive: true };
    if (category) {
      where.category = category;
    }

    return this.prisma.legacyInstruction.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<any> {
    const instruction = await this.prisma.legacyInstruction.findUnique({ where: { id } });
    if (!instruction || instruction.userId !== userId) {
      throw new NotFoundException('Instruction not found');
    }
    return instruction;
  }

  async update(userId: string, id: string, dto: UpdateLegacyInstructionDto): Promise<any> {
    const existing = await this.prisma.legacyInstruction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Instruction not found');
    }

    // Increment version on content change
    const newVersion =
      dto.content !== undefined && dto.content !== existing.content
        ? existing.version + 1
        : existing.version;

    const updated = await this.prisma.legacyInstruction.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.category !== undefined && { category: dto.category as any }),
        ...(dto.attachments !== undefined && { attachments: dto.attachments as any }),
        version: newVersion,
      },
    });

    await this.activityService.logActivity(
      userId,
      'INSTRUCTION_UPDATED',
      'legacy_instruction',
      id,
      userId,
      { title: updated.title, version: newVersion },
    );

    return updated;
  }

  async remove(userId: string, id: string): Promise<any> {
    const existing = await this.prisma.legacyInstruction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Instruction not found');
    }

    await this.prisma.legacyInstruction.update({
      where: { id },
      data: { isActive: false },
    });

    await this.activityService.logActivity(
      userId,
      'INSTRUCTION_DELETED',
      'legacy_instruction',
      id,
      userId,
      { title: existing.title },
    );

    return { success: true, message: 'Instruction deleted' };
  }
}

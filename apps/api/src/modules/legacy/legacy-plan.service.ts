import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { CreateLegacyPlanDto, UpdateLegacyPlanDto, AssignPlanBeneficiaryDto } from './dto/legacy-plan.dto';

@Injectable()
export class LegacyPlanService {
  private readonly logger = new Logger(LegacyPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async create(userId: string, dto: CreateLegacyPlanDto) {
    const plan = await this.prisma.legacyPlan.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type as any,
        description: dto.description || null,
        accessRules: (dto.accessRules as any) || {},
      },
    });

    await this.activityService.logActivity(
      userId,
      'PLAN_CREATED',
      'legacy_plan',
      plan.id,
      userId,
      { planName: dto.name, planType: dto.type },
    );

    return plan;
  }

  async findAll(userId: string) {
    return this.prisma.legacyPlan.findMany({
      where: { userId },
      include: {
        beneficiaries: {
          include: {
            beneficiary: { select: { id: true, name: true, email: true, relationship: true } },
          },
        },
        _count: { select: { beneficiaries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const plan = await this.prisma.legacyPlan.findUnique({
      where: { id },
      include: {
        beneficiaries: {
          include: { beneficiary: true },
        },
      },
    });
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Legacy plan not found');
    }
    return plan;
  }

  async update(userId: string, id: string, dto: UpdateLegacyPlanDto) {
    const existing = await this.prisma.legacyPlan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Legacy plan not found');
    }

    const updated = await this.prisma.legacyPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.accessRules !== undefined && { accessRules: dto.accessRules as any }),
      },
    });

    await this.activityService.logActivity(
      userId,
      'PLAN_UPDATED',
      'legacy_plan',
      id,
      userId,
      { planName: updated.name },
    );

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.legacyPlan.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Legacy plan not found');
    }

    await this.prisma.legacyPlan.delete({ where: { id } });

    await this.activityService.logActivity(
      userId,
      'PLAN_DELETED',
      'legacy_plan',
      id,
      userId,
      { planName: existing.name },
    );

    return { success: true, message: 'Legacy plan deleted' };
  }

  async assignBeneficiary(userId: string, planId: string, dto: AssignPlanBeneficiaryDto) {
    const plan = await this.prisma.legacyPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Legacy plan not found');
    }

    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id: dto.beneficiaryId },
    });
    if (!beneficiary || beneficiary.userId !== userId) {
      throw new NotFoundException('Beneficiary not found');
    }

    const assignment = await this.prisma.legacyPlanBeneficiary.create({
      data: {
        planId,
        beneficiaryId: dto.beneficiaryId,
        accessScope: (dto.accessScope as any) || {},
      },
      include: { beneficiary: true },
    });

    await this.activityService.logActivity(
      userId,
      'PLAN_UPDATED',
      'legacy_plan',
      planId,
      userId,
      { action: 'beneficiary_assigned', beneficiaryName: beneficiary.name },
    );

    return assignment;
  }

  async removeBeneficiary(userId: string, planId: string, beneficiaryId: string) {
    const plan = await this.prisma.legacyPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Legacy plan not found');
    }

    const assignment = await this.prisma.legacyPlanBeneficiary.findUnique({
      where: { planId_beneficiaryId: { planId, beneficiaryId } },
    });
    if (!assignment) {
      throw new NotFoundException('Beneficiary is not assigned to this plan');
    }

    await this.prisma.legacyPlanBeneficiary.delete({
      where: { planId_beneficiaryId: { planId, beneficiaryId } },
    });

    await this.activityService.logActivity(
      userId,
      'PLAN_UPDATED',
      'legacy_plan',
      planId,
      userId,
      { action: 'beneficiary_removed', beneficiaryId },
    );

    return { success: true, message: 'Beneficiary removed from plan' };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';

@Injectable()
export class BeneficiaryService {
  private readonly logger = new Logger(BeneficiaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async create(userId: string, dto: CreateBeneficiaryDto) {
    // Check for duplicate email
    const existing = await this.prisma.beneficiary.findUnique({
      where: { userId_email: { userId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('A beneficiary with this email already exists');
    }

    const beneficiary = await this.prisma.beneficiary.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone || null,
        relationship: dto.relationship as any,
        notes: dto.notes || null,
        priority: dto.priority ?? 1,
      },
    });

    await this.activityService.logActivity(
      userId,
      'BENEFICIARY_ADDED',
      'beneficiary',
      beneficiary.id,
      userId,
      { beneficiaryName: dto.name, relationship: dto.relationship },
    );

    return beneficiary;
  }

  async findAll(userId: string) {
    return this.prisma.beneficiary.findMany({
      where: { userId, status: { not: 'REMOVED' as any } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      include: {
        planBeneficiaries: {
          include: { plan: { select: { id: true, name: true, type: true } } },
        },
        _count: { select: { digitalAssets: true, accessRequests: true } },
      },
    });
  }

  async findOne(userId: string, id: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id },
      include: {
        planBeneficiaries: {
          include: { plan: true },
        },
        digitalAssets: true,
        accessRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!beneficiary || beneficiary.userId !== userId) {
      throw new NotFoundException('Beneficiary not found');
    }
    return beneficiary;
  }

  async update(userId: string, id: string, dto: UpdateBeneficiaryDto) {
    const existing = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Beneficiary not found');
    }

    // If email is changing, check for duplicates
    if (dto.email && dto.email !== existing.email) {
      const duplicate = await this.prisma.beneficiary.findUnique({
        where: { userId_email: { userId, email: dto.email } },
      });
      if (duplicate) {
        throw new ConflictException('A beneficiary with this email already exists');
      }
    }

    const updated = await this.prisma.beneficiary.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.relationship !== undefined && { relationship: dto.relationship as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
      },
    });

    await this.activityService.logActivity(
      userId,
      'BENEFICIARY_UPDATED',
      'beneficiary',
      id,
      userId,
      { beneficiaryName: updated.name },
    );

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Beneficiary not found');
    }

    await this.prisma.beneficiary.update({
      where: { id },
      data: { status: 'REMOVED' as any },
    });

    await this.activityService.logActivity(
      userId,
      'BENEFICIARY_REMOVED',
      'beneficiary',
      id,
      userId,
      { beneficiaryName: existing.name },
    );

    return { success: true, message: 'Beneficiary removed' };
  }

  /**
   * Import family members as beneficiaries
   */
  async importFromFamily(userId: string) {
    const memberships = await this.prisma.familyMembership.findMany({
      where: {
        family: { createdBy: userId },
        status: 'ACTIVE' as any,
        userId: { not: userId },
      },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    const imported: string[] = [];
    for (const m of memberships) {
      const exists = await this.prisma.beneficiary.findUnique({
        where: { userId_email: { userId, email: m.user.email } },
      });
      if (!exists) {
        await this.create(userId, {
          name: m.user.fullName,
          email: m.user.email,
          phone: m.user.phone || undefined,
          relationship: this.mapFamilyRelationship(m.relationship),
          notes: `Imported from family vault`,
        });
        imported.push(m.user.fullName);
      }
    }

    return { imported, count: imported.length };
  }

  /**
   * Import trusted contacts as beneficiaries
   */
  async importFromTrustedContacts(userId: string) {
    const contacts = await this.prisma.trustedContact.findMany({
      where: { userId },
    });

    const imported: string[] = [];
    for (const c of contacts) {
      const exists = await this.prisma.beneficiary.findUnique({
        where: { userId_email: { userId, email: c.email } },
      });
      if (!exists) {
        await this.create(userId, {
          name: c.name,
          email: c.email,
          phone: c.phone || undefined,
          relationship: this.mapTrustedRelationship(c.relationship),
          notes: `Imported from emergency trusted contacts`,
        });
        imported.push(c.name);
      }
    }

    return { imported, count: imported.length };
  }

  private mapFamilyRelationship(rel?: string | null): string {
    const map: Record<string, string> = {
      spouse: 'SPOUSE',
      parent: 'PARENT',
      child: 'CHILD',
      sibling: 'SIBLING',
    };
    return map[rel?.toLowerCase() || ''] || 'OTHER';
  }

  private mapTrustedRelationship(rel: string): string {
    const map: Record<string, string> = {
      Spouse: 'SPOUSE',
      Parent: 'PARENT',
      Child: 'CHILD',
      Sibling: 'SIBLING',
      Lawyer: 'LAWYER',
      Executor: 'EXECUTOR',
      Friend: 'FRIEND',
    };
    return map[rel] || 'OTHER';
  }
}

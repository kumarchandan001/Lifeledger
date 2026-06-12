import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { RegisterDigitalAssetDto, UpdateDigitalAssetDto } from './dto/digital-asset.dto';

@Injectable()
export class DigitalAssetService {
  private readonly logger = new Logger(DigitalAssetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async register(userId: string, dto: RegisterDigitalAssetDto) {
    // Validate beneficiary if assigned
    if (dto.assignedBeneficiaryId) {
      const beneficiary = await this.prisma.beneficiary.findUnique({
        where: { id: dto.assignedBeneficiaryId },
      });
      if (!beneficiary || beneficiary.userId !== userId) {
        throw new NotFoundException('Assigned beneficiary not found');
      }
    }

    const asset = await this.prisma.digitalAsset.create({
      data: {
        userId,
        assetType: dto.assetType as any,
        serviceName: dto.serviceName,
        accountRef: dto.accountRef || null,
        institutionName: dto.institutionName || null,
        notes: dto.notes || null,
        metadata: (dto.metadata as any) || {},
        assignedBeneficiaryId: dto.assignedBeneficiaryId || null,
      },
      include: {
        assignedBeneficiary: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.activityService.logActivity(
      userId,
      'ASSET_REGISTERED',
      'digital_asset',
      asset.id,
      userId,
      { serviceName: dto.serviceName, assetType: dto.assetType },
    );

    return asset;
  }

  async findAll(userId: string, assetType?: string) {
    const where: any = { userId };
    if (assetType) {
      where.assetType = assetType;
    }

    return this.prisma.digitalAsset.findMany({
      where,
      include: {
        assignedBeneficiary: {
          select: { id: true, name: true, email: true, relationship: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const asset = await this.prisma.digitalAsset.findUnique({
      where: { id },
      include: { assignedBeneficiary: true },
    });
    if (!asset || asset.userId !== userId) {
      throw new NotFoundException('Digital asset not found');
    }
    return asset;
  }

  async update(userId: string, id: string, dto: UpdateDigitalAssetDto) {
    const existing = await this.prisma.digitalAsset.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Digital asset not found');
    }

    if (dto.assignedBeneficiaryId) {
      const beneficiary = await this.prisma.beneficiary.findUnique({
        where: { id: dto.assignedBeneficiaryId },
      });
      if (!beneficiary || beneficiary.userId !== userId) {
        throw new NotFoundException('Assigned beneficiary not found');
      }
    }

    const updated = await this.prisma.digitalAsset.update({
      where: { id },
      data: {
        ...(dto.assetType !== undefined && { assetType: dto.assetType as any }),
        ...(dto.serviceName !== undefined && { serviceName: dto.serviceName }),
        ...(dto.accountRef !== undefined && { accountRef: dto.accountRef }),
        ...(dto.institutionName !== undefined && { institutionName: dto.institutionName }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as any }),
        ...(dto.assignedBeneficiaryId !== undefined && {
          assignedBeneficiaryId: dto.assignedBeneficiaryId,
        }),
      },
      include: {
        assignedBeneficiary: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.activityService.logActivity(
      userId,
      'ASSET_UPDATED',
      'digital_asset',
      id,
      userId,
      { serviceName: updated.serviceName },
    );

    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.digitalAsset.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Digital asset not found');
    }

    await this.prisma.digitalAsset.delete({ where: { id } });

    await this.activityService.logActivity(
      userId,
      'ASSET_REMOVED',
      'digital_asset',
      id,
      userId,
      { serviceName: existing.serviceName },
    );

    return { success: true, message: 'Digital asset removed' };
  }
}

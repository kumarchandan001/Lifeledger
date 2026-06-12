import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementService } from './entitlement.service';
import { UsageSummaryResponse } from '@lifeledger/shared';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
  ) {}

  /**
   * Record a usage event (e.g., OCR credit consumed).
   */
  async recordUsage(
    userId: string,
    type: 'OCR_CREDIT' | 'AI_CREDIT' | 'STORAGE_BYTE' | 'DOCUMENT_COUNT' | 'FAMILY_MEMBER' | 'LEGACY_PLAN' | 'EMERGENCY_SESSION',
    quantity: number = 1,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const period = await this.entitlementService.getCurrentBillingPeriod(userId);

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    await this.prisma.usageRecord.create({
      data: {
        userId,
        subscriptionId: sub?.id ?? null,
        type,
        quantity,
        periodStart: period.start,
        periodEnd: period.end,
        metadata: metadata as any,
      },
    });

    this.logger.debug(`Usage recorded: ${type} x${quantity} for user ${userId}`);
  }

  /**
   * Enforce OCR credit limit. Throws if exceeded.
   */
  async enforceOcrCreditLimit(userId: string): Promise<void> {
    const check = await this.entitlementService.checkOcrCreditQuota(userId);
    if (!check.allowed) {
      throw new ForbiddenException(
        `OCR credit limit reached (${check.current}/${check.limit}). ` +
          `Upgrade your plan for more OCR credits.`,
      );
    }
  }

  /**
   * Enforce AI credit limit. Throws if exceeded.
   */
  async enforceAiCreditLimit(userId: string): Promise<void> {
    const check = await this.entitlementService.checkAiCreditQuota(userId);
    if (!check.allowed) {
      throw new ForbiddenException(
        `AI credit limit reached (${check.current}/${check.limit}). ` +
          `Upgrade your plan for more AI credits.`,
      );
    }
  }

  /**
   * Enforce storage limit. Throws if exceeded.
   */
  async enforceStorageLimit(userId: string, additionalBytes: number): Promise<void> {
    const check = await this.entitlementService.checkStorageQuota(userId, additionalBytes);
    if (!check.allowed) {
      const limits = await this.entitlementService.getUserLimits(userId);
      throw new ForbiddenException(
        `Storage quota exceeded. Your plan allows up to ${limits.storageLimitGb} GB of storage. ` +
          `Upgrade your plan for more storage.`,
      );
    }
  }

  /**
   * Enforce document count limit. Throws if exceeded.
   */
  async enforceDocumentLimit(userId: string): Promise<void> {
    const check = await this.entitlementService.checkDocumentQuota(userId);
    if (!check.allowed) {
      throw new ForbiddenException(
        `Document limit reached (${check.current}/${check.limit}). ` +
          `Upgrade your plan to store more documents.`,
      );
    }
  }

  /**
   * Enforce legacy plan count limit. Throws if exceeded.
   */
  async enforceLegacyPlanLimit(userId: string): Promise<void> {
    const check = await this.entitlementService.checkLegacyPlanQuota(userId);
    if (!check.allowed) {
      throw new ForbiddenException(
        `Legacy plan limit reached (${check.current}/${check.limit}). ` +
          `Upgrade your plan for unlimited legacy plans.`,
      );
    }
  }

  /**
   * Get the full usage summary for a user.
   */
  async getUsageSummary(userId: string): Promise<UsageSummaryResponse> {
    const limits = await this.entitlementService.getUserLimits(userId);
    const period = await this.entitlementService.getCurrentBillingPeriod(userId);

    // Storage
    const storageAgg = await this.prisma.document.aggregate({
      where: { userId, deletedAt: null },
      _sum: { fileSize: true },
    });
    const usedBytes = Number(storageAgg._sum.fileSize ?? 0);
    const usedGb = parseFloat((usedBytes / (1024 * 1024 * 1024)).toFixed(2));

    // Documents
    const docCount = await this.prisma.document.count({
      where: { userId, deletedAt: null },
    });

    // OCR Credits
    const ocrAgg = await this.prisma.usageRecord.aggregate({
      where: {
        userId,
        type: 'OCR_CREDIT',
        periodStart: { gte: period.start },
        periodEnd: { lte: period.end },
      },
      _sum: { quantity: true },
    });
    const ocrUsed = ocrAgg._sum.quantity ?? 0;

    // AI Credits
    const aiAgg = await this.prisma.usageRecord.aggregate({
      where: {
        userId,
        type: 'AI_CREDIT',
        periodStart: { gte: period.start },
        periodEnd: { lte: period.end },
      },
      _sum: { quantity: true },
    });
    const aiUsed = aiAgg._sum.quantity ?? 0;

    // Family Members
    const familyCount = await this.prisma.familyMembership.count({
      where: {
        family: { createdBy: userId },
        status: 'ACTIVE',
      },
    });

    // Legacy Plans
    const legacyCount = await this.prisma.legacyPlan.count({
      where: { userId },
    });

    const pct = (current: number, limit: number) =>
      limit === -1 ? 0 : limit === 0 ? 100 : Math.round((current / limit) * 100);

    return {
      storage: {
        usedBytes,
        usedGb,
        limitGb: limits.storageLimitGb,
        limitBytes: limits.storageLimitBytes,
        percentage: pct(usedBytes, limits.storageLimitBytes),
      },
      documents: {
        count: docCount,
        limit: limits.maxDocuments,
        percentage: pct(docCount, limits.maxDocuments),
      },
      ocrCredits: {
        used: ocrUsed,
        limit: limits.ocrCreditsMonthly,
        percentage: pct(ocrUsed, limits.ocrCreditsMonthly),
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      },
      aiCredits: {
        used: aiUsed,
        limit: limits.aiCreditsMonthly,
        percentage: pct(aiUsed, limits.aiCreditsMonthly),
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      },
      familyMembers: {
        count: familyCount,
        limit: limits.maxFamilyMembers,
        percentage: pct(familyCount, limits.maxFamilyMembers),
      },
      legacyPlans: {
        count: legacyCount,
        limit: limits.maxLegacyPlans,
        percentage: pct(legacyCount, limits.maxLegacyPlans),
      },
    };
  }

  /**
   * Get usage history records for a user.
   */
  async getUsageHistory(
    userId: string,
    options: { type?: string; page?: number; limit?: number },
  ) {
    const { type, page = 1, limit = 20 } = options;

    const where: any = { userId };
    if (type) where.type = type;

    const [records, total] = await Promise.all([
      this.prisma.usageRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.usageRecord.count({ where }),
    ]);

    return { records, total, page, limit };
  }
}

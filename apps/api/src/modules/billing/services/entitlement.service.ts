import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_LIMITS, PlanName } from '@lifeledger/shared';

export interface EntitlementCheck {
  allowed: boolean;
  limit: number;
  current: number;
  remaining: number;
  planName: string;
  feature: string;
}

export interface PlanLimits {
  storageLimitGb: number;
  storageLimitBytes: number;
  maxDocuments: number;
  maxFamilyMembers: number;
  maxLegacyPlans: number;
  ocrCreditsMonthly: number;
  aiCreditsMonthly: number;
  maxShareLinks: number;
  features: Record<string, boolean>;
}

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the active plan for a user.
   * Falls back to FREE if no subscription exists.
   */
  async getUserPlanName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user?.subscription) return 'free';

    const { status } = user.subscription;
    if (status === 'ACTIVE' || status === 'TRIAL' || status === 'PAST_DUE') {
      return user.subscription.plan.name;
    }

    return 'free';
  }

  /**
   * Get the full plan limits for a user.
   */
  async getUserLimits(userId: string): Promise<PlanLimits> {
    const planName = await this.getUserPlanName(userId);
    const key = planName.toUpperCase() as PlanName;
    const limits = PLAN_LIMITS[key] ?? PLAN_LIMITS.FREE;

    // Load dynamic features from DB
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: { entitlements: true },
        },
      },
    });

    const features: Record<string, boolean> = {};
    if (sub?.plan?.entitlements) {
      for (const e of sub.plan.entitlements) {
        features[e.feature] = e.enabled;
      }
    }

    return {
      ...limits,
      features,
    };
  }

  /**
   * Check if a specific feature is enabled for the user.
   */
  async hasFeature(userId: string, feature: string): Promise<boolean> {
    const planName = await this.getUserPlanName(userId);

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: {
          include: { entitlements: true },
        },
      },
    });

    if (!sub?.plan?.entitlements) {
      // Free plan — check hardcoded entitlements
      const freeFeatures = ['basic_ocr', 'basic_search'];
      return freeFeatures.includes(feature);
    }

    const entitlement = sub.plan.entitlements.find((e) => e.feature === feature);
    return entitlement?.enabled ?? false;
  }

  /**
   * Check storage quota.
   */
  async checkStorageQuota(userId: string, additionalBytes: number = 0): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);

    const aggregate = await this.prisma.document.aggregate({
      where: { userId, deletedAt: null },
      _sum: { fileSize: true },
    });

    const usedBytes = Number(aggregate._sum.fileSize ?? 0);
    const totalAfter = usedBytes + additionalBytes;

    return {
      allowed: totalAfter <= limits.storageLimitBytes,
      limit: limits.storageLimitBytes,
      current: usedBytes,
      remaining: Math.max(0, limits.storageLimitBytes - usedBytes),
      planName,
      feature: 'storage',
    };
  }

  /**
   * Check document count quota.
   */
  async checkDocumentQuota(userId: string): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);

    if (limits.maxDocuments === -1) {
      return {
        allowed: true,
        limit: -1,
        current: 0,
        remaining: -1,
        planName,
        feature: 'documents',
      };
    }

    const count = await this.prisma.document.count({
      where: { userId, deletedAt: null },
    });

    return {
      allowed: count < limits.maxDocuments,
      limit: limits.maxDocuments,
      current: count,
      remaining: Math.max(0, limits.maxDocuments - count),
      planName,
      feature: 'documents',
    };
  }

  /**
   * Check OCR credit quota for current billing period.
   */
  async checkOcrCreditQuota(userId: string): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);
    const period = await this.getCurrentBillingPeriod(userId);

    const usedCredits = await this.getUsageCount(userId, 'OCR_CREDIT', period.start, period.end);

    return {
      allowed: usedCredits < limits.ocrCreditsMonthly,
      limit: limits.ocrCreditsMonthly,
      current: usedCredits,
      remaining: Math.max(0, limits.ocrCreditsMonthly - usedCredits),
      planName,
      feature: 'ocr_credits',
    };
  }

  /**
   * Check AI credit quota for current billing period.
   */
  async checkAiCreditQuota(userId: string): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);
    const period = await this.getCurrentBillingPeriod(userId);

    const usedCredits = await this.getUsageCount(userId, 'AI_CREDIT', period.start, period.end);

    return {
      allowed: usedCredits < limits.aiCreditsMonthly,
      limit: limits.aiCreditsMonthly,
      current: usedCredits,
      remaining: Math.max(0, limits.aiCreditsMonthly - usedCredits),
      planName,
      feature: 'ai_credits',
    };
  }

  /**
   * Check legacy plan creation quota.
   */
  async checkLegacyPlanQuota(userId: string): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);

    if (limits.maxLegacyPlans === -1) {
      return {
        allowed: true,
        limit: -1,
        current: 0,
        remaining: -1,
        planName,
        feature: 'legacy_plans',
      };
    }

    const count = await this.prisma.legacyPlan.count({
      where: { userId },
    });

    return {
      allowed: count < limits.maxLegacyPlans,
      limit: limits.maxLegacyPlans,
      current: count,
      remaining: Math.max(0, limits.maxLegacyPlans - count),
      planName,
      feature: 'legacy_plans',
    };
  }

  /**
   * Check family member quota.
   */
  async checkFamilyMemberQuota(userId: string): Promise<EntitlementCheck> {
    const limits = await this.getUserLimits(userId);
    const planName = await this.getUserPlanName(userId);

    const count = await this.prisma.familyMembership.count({
      where: {
        family: { createdBy: userId },
        status: 'ACTIVE',
      },
    });

    return {
      allowed: count < limits.maxFamilyMembers,
      limit: limits.maxFamilyMembers,
      current: count,
      remaining: Math.max(0, limits.maxFamilyMembers - count),
      planName,
      feature: 'family_members',
    };
  }

  // ─── Helpers ───

  private async getUsageCount(
    userId: string,
    type: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.prisma.usageRecord.aggregate({
      where: {
        userId,
        type: type as any,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? 0;
  }

  async getCurrentBillingPeriod(userId: string): Promise<{ start: Date; end: Date }> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (sub) {
      return {
        start: sub.currentPeriodStart,
        end: sub.currentPeriodEnd,
      };
    }

    // Free users: use calendar month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
}

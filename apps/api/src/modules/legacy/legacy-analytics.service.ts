import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { LegacyActivityService } from './legacy-activity.service';

@Injectable()
export class LegacyAnalyticsService {
  private readonly logger = new Logger(LegacyAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly activityService: LegacyActivityService,
  ) {}

  async getDashboardStats(userId: string) {
    const [
      beneficiaryCount,
      planCount,
      vaultDocumentCount,
      instructionCount,
      messageCount,
      assetCount,
      pendingRequests,
    ] = await Promise.all([
      this.prisma.beneficiary.count({
        where: { userId, status: { not: 'REMOVED' as any } },
      }),
      this.prisma.legacyPlan.count({ where: { userId } }),
      this.prisma.legacyVaultDocument.count({ where: { userId } }),
      this.prisma.legacyInstruction.count({ where: { userId, isActive: true } }),
      this.prisma.personalMessage.count({ where: { userId } }),
      this.prisma.digitalAsset.count({ where: { userId } }),
      this.prisma.legacyAccessRequest.count({
        where: { ownerId: userId, status: { in: ['PENDING' as any, 'UNDER_REVIEW' as any] } },
      }),
    ]);

    // Calculate simple readiness score
    const readinessScore = this.calculateSimpleReadiness({
      beneficiaryCount,
      planCount,
      vaultDocumentCount,
      instructionCount,
      messageCount,
      assetCount,
    });

    return {
      beneficiaryCount,
      planCount,
      vaultDocumentCount,
      instructionCount,
      messageCount,
      assetCount,
      pendingRequests,
      readinessScore,
    };
  }

  async generateReadinessReport(userId: string) {
    const stats = await this.getDashboardStats(userId);

    // Get detailed data for AI analysis
    const [beneficiaries, plans, vaultDocs, instructions, messages, assets] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where: { userId, status: { not: 'REMOVED' as any } },
        select: { name: true, relationship: true },
      }),
      this.prisma.legacyPlan.findMany({
        where: { userId },
        include: { _count: { select: { beneficiaries: true } } },
      }),
      this.prisma.legacyVaultDocument.findMany({
        where: { userId },
        include: { document: { select: { title: true, fileName: true } } },
      }),
      this.prisma.legacyInstruction.findMany({
        where: { userId, isActive: true },
        select: { title: true, category: true },
      }),
      this.prisma.personalMessage.findMany({
        where: { userId },
        select: { title: true, type: true },
      }),
      this.prisma.digitalAsset.findMany({
        where: { userId },
        select: { assetType: true, serviceName: true },
      }),
    ]);

    // Use AI to generate insights if available
    let aiSuggestions: any[] = [];
    let aiMissingItems: any[] = [];

    if (this.aiService.isAvailable()) {
      try {
        const result = await this.aiService.generateLegacyReadinessScore({
          beneficiaries: beneficiaries.map((b) => ({
            name: b.name,
            relationship: b.relationship,
          })),
          plans: plans.map((p) => ({
            name: p.name,
            type: p.type,
            beneficiaryCount: p._count.beneficiaries,
          })),
          vaultDocuments: vaultDocs.map((d) => ({
            title: d.document.title,
            category: d.category,
          })),
          instructions: instructions.map((i) => ({
            title: i.title,
            category: i.category,
          })),
          messages: messages.map((m) => ({
            title: m.title,
            type: m.type,
          })),
          assets: assets.map((a) => ({
            serviceName: a.serviceName,
            assetType: a.assetType,
          })),
        });
        aiSuggestions = result.suggestions || [];
        aiMissingItems = result.missingItems || [];
      } catch (error) {
        this.logger.error('AI readiness analysis failed, using fallback', error);
      }
    }

    // Fallback suggestions if AI unavailable
    if (aiSuggestions.length === 0) {
      aiSuggestions = this.generateFallbackSuggestions(stats);
    }
    if (aiMissingItems.length === 0) {
      aiMissingItems = this.generateFallbackMissingItems(stats);
    }

    const breakdown = {
      beneficiaries: Math.min(20, stats.beneficiaryCount * 10),
      plans: Math.min(15, stats.planCount * 15),
      vault: Math.min(25, stats.vaultDocumentCount * 5),
      instructions: Math.min(15, stats.instructionCount * 5),
      messages: Math.min(10, stats.messageCount * 5),
      assets: Math.min(15, stats.assetCount * 3),
    };

    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

    // Persist report
    await this.prisma.legacyReadinessReport.create({
      data: {
        userId,
        score: Math.min(100, score),
        maxScore: 100,
        breakdown: breakdown as any,
        suggestions: aiSuggestions as any,
        missingItems: aiMissingItems as any,
      },
    });

    await this.activityService.logActivity(
      userId,
      'READINESS_GENERATED',
      'legacy_readiness_report',
      undefined,
      userId,
      { score },
    );

    return {
      score: Math.min(100, score),
      maxScore: 100,
      breakdown,
      suggestions: aiSuggestions,
      missingItems: aiMissingItems,
      generatedAt: new Date(),
    };
  }

  async getLatestReport(userId: string) {
    return this.prisma.legacyReadinessReport.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  private calculateSimpleReadiness(stats: {
    beneficiaryCount: number;
    planCount: number;
    vaultDocumentCount: number;
    instructionCount: number;
    messageCount: number;
    assetCount: number;
  }): number {
    let score = 0;
    if (stats.beneficiaryCount >= 1) score += 20;
    if (stats.planCount >= 1) score += 15;
    if (stats.vaultDocumentCount >= 3) score += 25;
    else if (stats.vaultDocumentCount >= 1) score += 10;
    if (stats.instructionCount >= 1) score += 15;
    if (stats.messageCount >= 1) score += 10;
    if (stats.assetCount >= 1) score += 15;
    return Math.min(100, score);
  }

  private generateFallbackSuggestions(stats: any) {
    const suggestions: any[] = [];
    if (stats.beneficiaryCount === 0) {
      suggestions.push({
        category: 'beneficiaries',
        title: 'Add Beneficiaries',
        description: 'Designate at least one beneficiary to begin your legacy plan.',
        priority: 'HIGH',
      });
    }
    if (stats.planCount === 0) {
      suggestions.push({
        category: 'plans',
        title: 'Create a Legacy Plan',
        description: 'Create your first legacy plan to organize your digital legacy.',
        priority: 'HIGH',
      });
    }
    if (stats.vaultDocumentCount === 0) {
      suggestions.push({
        category: 'vault',
        title: 'Add Documents to Legacy Vault',
        description: 'Add important documents like insurance, property records, and medical info.',
        priority: 'HIGH',
      });
    }
    if (stats.instructionCount === 0) {
      suggestions.push({
        category: 'instructions',
        title: 'Write Instructions',
        description: 'Create instructions for your beneficiaries about financial, medical, or personal matters.',
        priority: 'MEDIUM',
      });
    }
    if (stats.assetCount === 0) {
      suggestions.push({
        category: 'assets',
        title: 'Register Digital Assets',
        description: 'Register your bank accounts, insurance policies, and other important assets.',
        priority: 'MEDIUM',
      });
    }
    return suggestions;
  }

  private generateFallbackMissingItems(stats: any) {
    const missing: any[] = [];
    if (stats.beneficiaryCount === 0) {
      missing.push({
        category: 'beneficiaries',
        itemType: 'Primary Beneficiary',
        reason: 'A beneficiary is required to receive legacy access.',
      });
    }
    if (stats.vaultDocumentCount < 3) {
      missing.push({
        category: 'vault',
        itemType: 'Essential Documents',
        reason: 'Add medical records, insurance policies, and identity documents to your vault.',
      });
    }
    if (stats.instructionCount === 0) {
      missing.push({
        category: 'instructions',
        itemType: 'Financial Instructions',
        reason: 'Financial instructions help beneficiaries manage your accounts.',
      });
    }
    return missing;
  }
}

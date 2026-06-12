import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { EntitlementService } from './entitlement.service';
import { SubscriptionPlanResponse, SubscriptionResponse } from '@lifeledger/shared';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly entitlement: EntitlementService,
  ) {}

  // ─── Plans ───

  async listPlans(): Promise<SubscriptionPlanResponse[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: { entitlements: true },
      orderBy: { displayOrder: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      priceMonthly: Number(p.priceMonthly),
      priceYearly: Number(p.priceYearly),
      currency: p.currency,
      storageLimitGb: p.storageLimitGb,
      maxDocuments: p.maxDocuments,
      maxFamilyMembers: p.maxFamilyMembers,
      maxLegacyPlans: p.maxLegacyPlans,
      ocrCreditsMonthly: p.ocrCreditsMonthly,
      aiCreditsMonthly: p.aiCreditsMonthly,
      trialDays: p.trialDays,
      features: p.features as Record<string, boolean>,
      entitlements: p.entitlements.map((e) => ({
        feature: e.feature,
        enabled: e.enabled,
        limitValue: e.limitValue,
      })),
    }));
  }

  // ─── Subscribe ───

  async subscribe(
    userId: string,
    planId: string,
    billingCycle: 'MONTHLY' | 'YEARLY',
  ): Promise<SubscriptionResponse> {
    // Check if user already has an active subscription
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (existing && ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(existing.status)) {
      throw new ConflictException(
        'You already have an active subscription. Use the upgrade endpoint to change plans.',
      );
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive) throw new BadRequestException('This plan is no longer available');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Create Stripe customer if needed
    let stripeCustomerId = existing?.stripeCustomerId ?? null;
    if (!stripeCustomerId && Number(plan.priceMonthly) > 0) {
      stripeCustomerId = await this.stripe.createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
        { userId },
      );
    }

    // Create Stripe subscription for paid plans
    let stripeSubscriptionId: string | null = null;
    let status: 'ACTIVE' | 'TRIAL' = 'ACTIVE';

    if (Number(plan.priceMonthly) > 0) {
      const priceId =
        billingCycle === 'MONTHLY' ? plan.stripePriceMonthlyId : plan.stripePriceYearlyId;

      if (priceId) {
        const result = await this.stripe.createSubscription(
          stripeCustomerId!,
          priceId,
          plan.trialDays,
        );
        stripeSubscriptionId = result.subscriptionId;
      }

      if (plan.trialDays > 0) status = 'TRIAL';
    }

    // Calculate billing period
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'MONTHLY') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Upsert subscription
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        planId,
        status,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId,
        stripeSubscriptionId,
        trialStartedAt: status === 'TRIAL' ? now : null,
        trialEndsAt:
          status === 'TRIAL'
            ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
            : null,
        cancelledAt: null,
        cancelReason: null,
      },
      create: {
        userId,
        planId,
        status,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        stripeCustomerId,
        stripeSubscriptionId,
        trialStartedAt: status === 'TRIAL' ? now : null,
        trialEndsAt:
          status === 'TRIAL'
            ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
            : null,
      },
      include: {
        plan: { include: { entitlements: true } },
      },
    });

    // Log billing event
    await this.prisma.billingEvent.create({
      data: {
        subscriptionId: subscription.id,
        type: 'SUBSCRIPTION_CREATED',
        payload: { planId, billingCycle, status } as any,
      },
    });

    // Log billing activity
    await this.prisma.billingActivity.create({
      data: {
        userId,
        action: `Subscribed to ${plan.displayName} (${billingCycle.toLowerCase()})`,
        details: { planId, planName: plan.name, billingCycle } as any,
      },
    });

    this.logger.log(`User ${userId} subscribed to ${plan.name}`);

    return this.formatSubscription(subscription);
  }

  // ─── Change Plan (Upgrade / Downgrade) ───

  async changePlan(
    userId: string,
    newPlanId: string,
    billingCycle?: 'MONTHLY' | 'YEARLY',
  ): Promise<SubscriptionResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException('No active subscription found');
    if (!['ACTIVE', 'TRIAL'].includes(sub.status)) {
      throw new BadRequestException('Can only change plan on an active subscription');
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new NotFoundException('Plan not found');
    if (!newPlan.isActive) throw new BadRequestException('Target plan is not available');
    if (newPlanId === sub.planId) throw new BadRequestException('Already on this plan');

    const isUpgrade = Number(newPlan.priceMonthly) > Number(sub.plan.priceMonthly);
    const cycle = billingCycle ?? sub.billingCycle;

    // Update Stripe subscription if applicable
    if (sub.stripeSubscriptionId) {
      const priceId =
        cycle === 'MONTHLY' ? newPlan.stripePriceMonthlyId : newPlan.stripePriceYearlyId;
      if (priceId) {
        await this.stripe.updateSubscription(sub.stripeSubscriptionId, priceId);
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: newPlanId,
        billingCycle: cycle,
        previousPlanId: sub.planId,
      },
      include: {
        plan: { include: { entitlements: true } },
      },
    });

    // Log event
    await this.prisma.billingEvent.create({
      data: {
        subscriptionId: sub.id,
        type: isUpgrade ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
        payload: {
          previousPlanId: sub.planId,
          newPlanId,
          previousPlan: sub.plan.name,
          newPlan: newPlan.name,
        } as any,
      },
    });

    await this.prisma.billingActivity.create({
      data: {
        userId,
        action: `${isUpgrade ? 'Upgraded' : 'Downgraded'} to ${newPlan.displayName}`,
        details: {
          previousPlan: sub.plan.name,
          newPlan: newPlan.name,
          isUpgrade,
        } as any,
      },
    });

    this.logger.log(
      `User ${userId} ${isUpgrade ? 'upgraded' : 'downgraded'} from ${sub.plan.name} to ${newPlan.name}`,
    );

    return this.formatSubscription(updated);
  }

  // ─── Cancel ───

  async cancelSubscription(userId: string, reason?: string): Promise<SubscriptionResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException('No active subscription found');
    if (sub.status === 'CANCELLED') throw new BadRequestException('Already cancelled');

    // Cancel at period end via Stripe
    if (sub.stripeSubscriptionId) {
      await this.stripe.cancelSubscription(sub.stripeSubscriptionId, true);
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
      },
      include: {
        plan: { include: { entitlements: true } },
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        subscriptionId: sub.id,
        type: 'SUBSCRIPTION_CANCELLED',
        payload: { reason, planName: sub.plan.name } as any,
      },
    });

    await this.prisma.billingActivity.create({
      data: {
        userId,
        action: `Cancelled ${sub.plan.displayName} subscription`,
        details: { reason, planName: sub.plan.name } as any,
      },
    });

    this.logger.log(`User ${userId} cancelled subscription`);
    return this.formatSubscription(updated);
  }

  // ─── Reactivate ───

  async reactivateSubscription(userId: string): Promise<SubscriptionResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!sub) throw new NotFoundException('No subscription found');
    if (sub.status !== 'CANCELLED') {
      throw new BadRequestException('Can only reactivate a cancelled subscription');
    }

    if (sub.stripeSubscriptionId) {
      await this.stripe.reactivateSubscription(sub.stripeSubscriptionId);
    }

    const updated = await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        cancelledAt: null,
        cancelReason: null,
      },
      include: {
        plan: { include: { entitlements: true } },
      },
    });

    await this.prisma.billingEvent.create({
      data: {
        subscriptionId: sub.id,
        type: 'SUBSCRIPTION_REACTIVATED',
        payload: { planName: sub.plan.name } as any,
      },
    });

    await this.prisma.billingActivity.create({
      data: {
        userId,
        action: `Reactivated ${sub.plan.displayName} subscription`,
        details: { planName: sub.plan.name } as any,
      },
    });

    return this.formatSubscription(updated);
  }

  // ─── Get Current Subscription ───

  async getCurrentSubscription(userId: string): Promise<SubscriptionResponse | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: {
        plan: { include: { entitlements: true } },
      },
    });

    if (!sub) return null;
    return this.formatSubscription(sub);
  }

  // ─── Billing Activity ───

  async getBillingActivity(userId: string, page: number = 1, limit: number = 20) {
    const [activities, total] = await Promise.all([
      this.prisma.billingActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.billingActivity.count({ where: { userId } }),
    ]);

    return { activities, total, page, limit };
  }

  // ─── Helpers ───

  private formatSubscription(sub: any): SubscriptionResponse {
    return {
      id: sub.id,
      userId: sub.userId,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        displayName: sub.plan.displayName,
        description: sub.plan.description,
        priceMonthly: Number(sub.plan.priceMonthly),
        priceYearly: Number(sub.plan.priceYearly),
        currency: sub.plan.currency,
        storageLimitGb: sub.plan.storageLimitGb,
        maxDocuments: sub.plan.maxDocuments,
        maxFamilyMembers: sub.plan.maxFamilyMembers,
        maxLegacyPlans: sub.plan.maxLegacyPlans,
        ocrCreditsMonthly: sub.plan.ocrCreditsMonthly,
        aiCreditsMonthly: sub.plan.aiCreditsMonthly,
        trialDays: sub.plan.trialDays,
        features: sub.plan.features ?? {},
        entitlements: (sub.plan.entitlements ?? []).map((e: any) => ({
          feature: e.feature,
          enabled: e.enabled,
          limitValue: e.limitValue,
        })),
      },
      status: sub.status,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      trialStartedAt: sub.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
      cancelledAt: sub.cancelledAt?.toISOString() ?? null,
      cancelReason: sub.cancelReason ?? null,
      createdAt: sub.createdAt.toISOString(),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RevenueAnalyticsResponse } from '@lifeledger/shared';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get revenue analytics overview.
   */
  async getRevenueAnalytics(): Promise<RevenueAnalyticsResponse> {
    // Get all subscriptions with plan info
    const subscriptions = await this.prisma.subscription.findMany({
      include: { plan: true },
    });

    const activeSubscriptions = subscriptions.filter((s) =>
      ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(s.status),
    );

    const payingSubscriptions = activeSubscriptions.filter(
      (s) => s.status === 'ACTIVE' && Number(s.plan.priceMonthly) > 0,
    );

    const trialSubscriptions = activeSubscriptions.filter((s) => s.status === 'TRIAL');

    // MRR: Sum of monthly-equivalent revenue from paying subscribers
    let mrr = 0;
    for (const sub of payingSubscriptions) {
      if (sub.billingCycle === 'MONTHLY') {
        mrr += Number(sub.plan.priceMonthly);
      } else {
        mrr += Number(sub.plan.priceYearly) / 12;
      }
    }
    mrr = parseFloat(mrr.toFixed(2));
    const arr = parseFloat((mrr * 12).toFixed(2));

    // Total users
    const totalUsers = await this.prisma.user.count();
    const freeUsers = totalUsers - activeSubscriptions.length;

    // Churn rate (cancelled in last 30 days vs active at start)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cancelledRecently = await this.prisma.subscription.count({
      where: {
        status: 'CANCELLED',
        cancelledAt: { gte: thirtyDaysAgo },
      },
    });

    const churnRate =
      payingSubscriptions.length > 0
        ? parseFloat(
            ((cancelledRecently / (payingSubscriptions.length + cancelledRecently)) * 100).toFixed(
              1,
            ),
          )
        : 0;

    // Trial conversion rate
    const expiredTrials = await this.prisma.subscription.count({
      where: {
        previousPlanId: { not: null },
        status: 'ACTIVE',
        createdAt: { gte: thirtyDaysAgo },
      },
    });
    const totalTrialsEver = await this.prisma.billingEvent.count({
      where: { type: 'TRIAL_STARTED' },
    });
    const trialConversionRate =
      totalTrialsEver > 0
        ? parseFloat(((expiredTrials / totalTrialsEver) * 100).toFixed(1))
        : 0;

    // Revenue growth (current month vs last month payments)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const thisMonthRevenue = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: thisMonthStart },
      },
      _sum: { amount: true },
    });

    const lastMonthRevenue = await this.prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { amount: true },
    });

    const thisMonthTotal = Number(thisMonthRevenue._sum.amount ?? 0);
    const lastMonthTotal = Number(lastMonthRevenue._sum.amount ?? 0);
    const revenueGrowth =
      lastMonthTotal > 0
        ? parseFloat((((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1))
        : 0;

    // Plan distribution
    const planGroups = new Map<string, number>();
    for (const sub of activeSubscriptions) {
      const name = sub.plan.displayName;
      planGroups.set(name, (planGroups.get(name) ?? 0) + 1);
    }

    const planDistribution = Array.from(planGroups.entries()).map(([planName, count]) => ({
      planName,
      count,
      percentage:
        activeSubscriptions.length > 0
          ? parseFloat(((count / activeSubscriptions.length) * 100).toFixed(1))
          : 0,
    }));

    // Status distribution
    const statusGroups = new Map<string, number>();
    for (const sub of subscriptions) {
      statusGroups.set(sub.status, (statusGroups.get(sub.status) ?? 0) + 1);
    }

    const statusDistribution = Array.from(statusGroups.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      mrr,
      arr,
      activeSubscribers: activeSubscriptions.length,
      payingSubscribers: payingSubscriptions.length,
      freeUsers,
      trialUsers: trialSubscriptions.length,
      churnRate,
      trialConversionRate,
      revenueGrowth,
      planDistribution,
      statusDistribution,
    };
  }

  /**
   * Get recent payment history for admin dashboard.
   */
  async getRecentPayments(limit: number = 20): Promise<any> {
    return this.prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        subscription: {
          include: {
            user: { select: { id: true, email: true, fullName: true } },
            plan: { select: { name: true, displayName: true } },
          },
        },
      },
    });
  }

  /**
   * Get admin subscription listing.
   */
  async listSubscriptions(options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<any> {
    const { page = 1, limit = 20, status, search } = options;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          plan: { select: { id: true, name: true, displayName: true, priceMonthly: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { subscriptions, total, page, limit };
  }
}

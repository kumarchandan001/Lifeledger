import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import * as os from 'os';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and metrics (Admin only)' })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<any> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: { documents: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Calculate storage and aggregate info for each user
    const usersWithMetrics = await Promise.all(
      users.map(async (u) => {
        const aggregate = await this.prisma.document.aggregate({
          where: { userId: u.id, deletedAt: null },
          _sum: { fileSize: true },
        });
        const storageUsedBytes = Number(aggregate._sum.fileSize ?? 0);
        const { passwordHash, mfaSecret, ...safeUser } = u as any;
        return {
          ...safeUser,
          storageUsedBytes,
          documentCount: u._count.documents,
        };
      }),
    );

    return {
      success: true,
      data: {
        users: usersWithMetrics,
        total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user account (Admin only)' })
  async suspendUser(@Param('id') id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    return { success: true, message: 'User account has been suspended.' };
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsuspend user account (Admin only)' })
  async unsuspendUser(@Param('id') id: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return { success: true, message: 'User account has been reactivated.' };
  }

  @Post('users/:id/subscription')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually override user subscription plan (Admin only)' })
  async overrideSubscription(
    @Param('id') id: string,
    @Body() dto: { planId: string; billingCycle?: 'MONTHLY' | 'YEARLY'; trialDays?: number },
  ): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const cycle = dto.billingCycle ?? 'MONTHLY';
    const trialDays = dto.trialDays ?? 0;
    const start = new Date();
    const end = new Date();
    if (cycle === 'YEARLY') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }

    const trialEnds = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;

    // Upsert subscription
    await this.prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        planId: dto.planId,
        status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        billingCycle: cycle,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        trialStartedAt: trialDays > 0 ? start : null,
        trialEndsAt: trialEnds,
      },
      update: {
        planId: dto.planId,
        status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        billingCycle: cycle,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        trialEndsAt: trialEnds,
      },
    });

    return { success: true, message: 'User subscription overridden successfully.' };
  }

  @Get('users/:id/audit-logs')
  @ApiOperation({ summary: 'Review audit logs for a specific user (Admin only)' })
  async getUserAuditLogs(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { userId: id },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { userId: id } }),
    ]);

    return {
      success: true,
      data: {
        logs,
        total,
        page: pageNum,
        limit: limitNum,
      },
    };
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get System Health dashboard metrics (Admin only)' })
  async getSystemHealth(): Promise<any> {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    const [totalUsers, totalDocs, activeSessions, queuedJobs, failedJobs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.userSession.count({ where: { expiresAt: { gt: new Date() } } }),
      this.prisma.processingJob.count({ where: { status: 'QUEUED' } }),
      this.prisma.processingJob.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      success: true,
      data: {
        uptime: Math.floor(uptime),
        cpuLoad: os.loadavg(),
        freeMemGb: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
        totalMemGb: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
        processMemory: {
          heapUsedMb: (memory.heapUsed / 1024 / 1024).toFixed(2),
          rssMb: (memory.rss / 1024 / 1024).toFixed(2),
        },
        database: {
          totalUsers,
          totalDocuments: totalDocs,
          activeSessions,
        },
        queues: {
          queuedJobs,
          failedJobs,
        },
      },
    };
  }

  @Get('system/costs')
  @ApiOperation({ summary: 'Estimate resource consumption costs (Admin only)' })
  async getSystemCosts(): Promise<any> {
    // 1. Calculate Storage Cost (AWS S3 Standard is approx $0.023 per GB)
    const aggregate = await this.prisma.document.aggregate({
      where: { deletedAt: null },
      _sum: { fileSize: true },
    });
    const totalStorageBytes = Number(aggregate._sum.fileSize ?? 0);
    const totalStorageGb = totalStorageBytes / 1024 / 1024 / 1024;
    const storageCostUsd = totalStorageGb * 0.023;

    // 2. Estimate AI Processing Costs (Gemini 2.0 Flash is approx $0.075 / 1M input, $0.30 / 1M output)
    // Assume average 4000 input tokens + 1000 output tokens per analysis
    const totalAIAnalyses = await this.prisma.aIAnalysis.count();
    const averageCostPerDocUsd = (4000 * 0.075 + 1000 * 0.3) / 1000000; // $0.0006
    const aiCostUsd = totalAIAnalyses * averageCostPerDocUsd;

    // 3. Estimate Email SES Costs ($0.10 per 1000 emails, i.e., $0.0001 per email)
    // We count verify tokens and password reset requests
    const [verifyCount, resetCount] = await Promise.all([
      this.prisma.verificationToken.count(),
      this.prisma.passwordResetToken.count(),
    ]);
    const totalEmails = verifyCount + resetCount;
    const emailCostUsd = totalEmails * 0.0001;

    // 4. Base Infrastructure flat costs (VPS + Postgres DB + Redis caches)
    const dbVPSBaseCostUsd = 20.00;
    const appBaseCostUsd = 15.00;
    const baseInfrastructureCostUsd = dbVPSBaseCostUsd + appBaseCostUsd;

    const totalEstimatedCostUsd = storageCostUsd + aiCostUsd + emailCostUsd + baseInfrastructureCostUsd;

    return {
      success: true,
      data: {
        currency: 'USD',
        breakdown: {
          storageCost: storageCostUsd.toFixed(4),
          aiCost: aiCostUsd.toFixed(4),
          emailCost: emailCostUsd.toFixed(4),
          baseInfrastructureCost: baseInfrastructureCostUsd.toFixed(2),
        },
        metrics: {
          totalStorageGb: totalStorageGb.toFixed(4),
          totalAIAnalyses,
          totalEmails,
        },
        totalCost: totalEstimatedCostUsd.toFixed(2),
      },
    };
  }
}

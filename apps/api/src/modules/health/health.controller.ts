import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: { status: string; latencyMs?: number };
    redis: { status: string; latencyMs?: number };
  };
}

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'System health check' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async check(): Promise<HealthStatus> {
    const [dbHealth, redisHealth] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbResult =
      dbHealth.status === 'fulfilled'
        ? dbHealth.value
        : { status: 'unhealthy' as const, latencyMs: undefined };

    const redisResult =
      redisHealth.status === 'fulfilled'
        ? redisHealth.value
        : { status: 'unhealthy' as const, latencyMs: undefined };

    const allHealthy = dbResult.status === 'healthy' && redisResult.status === 'healthy';
    const anyUnhealthy = dbResult.status === 'unhealthy' || redisResult.status === 'unhealthy';

    return {
      status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
      services: {
        database: dbResult,
        redis: redisResult,
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not_ready' };
    }
  }

  private async checkDatabase(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch {
      return { status: 'unhealthy', latencyMs: Date.now() - start };
    }
  }

  private async checkRedis(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      return {
        status: pong ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
      };
    } catch {
      return { status: 'unhealthy', latencyMs: Date.now() - start };
    }
  }
}

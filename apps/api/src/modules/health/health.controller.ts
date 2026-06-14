import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as os from 'os';

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

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async metrics(): Promise<string> {
    const memory = process.memoryUsage();
    const dbStart = Date.now();
    let dbStatus = 1;
    let dbLatency = 0;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch {
      dbStatus = 0;
    }

    const redisStart = Date.now();
    let redisStatus = 1;
    let redisLatency = 0;
    try {
      await this.redis.ping();
      redisLatency = Date.now() - redisStart;
    } catch {
      redisStatus = 0;
    }

    const cpus = os.cpus().length;
    const loadAvg = os.loadavg()[0];

    const lines = [
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds counter',
      `process_uptime_seconds ${process.uptime()}`,
      '',
      '# HELP process_heap_used_bytes Process heap used memory size in bytes',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${memory.heapUsed}`,
      '',
      '# HELP process_heap_total_bytes Process heap total memory size in bytes',
      '# TYPE process_heap_total_bytes gauge',
      `process_heap_total_bytes ${memory.heapTotal}`,
      '',
      '# HELP process_rss_bytes Process RSS memory size in bytes',
      '# TYPE process_rss_bytes gauge',
      `process_rss_bytes ${memory.rss}`,
      '',
      '# HELP system_cpu_count CPU cores count',
      '# TYPE system_cpu_count gauge',
      `system_cpu_count ${cpus}`,
      '',
      '# HELP system_load_average_1m 1 minute system load average',
      '# TYPE system_load_average_1m gauge',
      `system_load_average_1m ${loadAvg}`,
      '',
      '# HELP lifeledger_database_up Database status (1 = up, 0 = down)',
      '# TYPE lifeledger_database_up gauge',
      `lifeledger_database_up ${dbStatus}`,
      '',
      '# HELP lifeledger_database_latency_ms Database latency in milliseconds',
      '# TYPE lifeledger_database_latency_ms gauge',
      `lifeledger_database_latency_ms ${dbLatency}`,
      '',
      '# HELP lifeledger_redis_up Redis status (1 = up, 0 = down)',
      '# TYPE lifeledger_redis_up gauge',
      `lifeledger_redis_up ${redisStatus}`,
      '',
      '# HELP lifeledger_redis_latency_ms Redis latency in milliseconds',
      '# TYPE lifeledger_redis_latency_ms gauge',
      `lifeledger_redis_latency_ms ${redisLatency}`,
    ];

    return lines.join('\n');
  }
}

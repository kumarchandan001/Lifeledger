import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LegacyActivityService {
  private readonly logger = new Logger(LegacyActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    actorId?: string,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      return await this.prisma.legacyActivity.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId: resourceId || null,
          actorId: actorId || userId,
          metadata: metadata as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log legacy activity: ${action}`, error);
    }
  }

  async getActivityFeed(userId: string, limit = 50, offset = 0) {
    const [activities, total] = await Promise.all([
      this.prisma.legacyActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.legacyActivity.count({ where: { userId } }),
    ]);

    return { activities, total };
  }
}

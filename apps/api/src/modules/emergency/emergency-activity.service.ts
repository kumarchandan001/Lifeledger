import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyActivity } from '@lifeledger/database';

@Injectable()
export class EmergencyActivityService {
  private readonly logger = new Logger(EmergencyActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logActivity(
    userId: string,
    action: string,
    actorId?: string | null,
    metadata: Record<string, any> = {},
  ): Promise<EmergencyActivity> {
    try {
      const activity = await this.prisma.emergencyActivity.create({
        data: {
          userId,
          action,
          actorId: actorId ?? 'SYSTEM',
          metadata,
        },
      });
      this.logger.log(`Logged emergency activity: ${action} for user ${userId}`);
      return activity;
    } catch (error) {
      this.logger.error(`Failed to log emergency activity ${action}`, error);
      throw error;
    }
  }

  async getActivityFeed(userId: string): Promise<EmergencyActivity[]> {
    return this.prisma.emergencyActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

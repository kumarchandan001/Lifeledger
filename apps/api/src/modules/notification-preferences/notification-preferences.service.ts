import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferenceDto } from './dto/notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get existing preferences or create with defaults for a user.
   * This ensures every user always has a preferences row.
   */
  async getOrCreate(userId: string) {
    let preference = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await this.prisma.notificationPreference.create({
        data: {
          userId,
          notify90Days: true,
          notify60Days: true,
          notify30Days: true,
          notify7Days: true,
          emailEnabled: true,
          inAppEnabled: true,
        },
      });
      this.logger.log(`Created default notification preferences for user ${userId}`);
    }

    return preference;
  }

  /**
   * Partial update of notification preferences.
   * Creates default preferences first if they don't exist.
   */
  async update(userId: string, dto: UpdateNotificationPreferenceDto) {
    // Ensure preferences row exists
    await this.getOrCreate(userId);

    const updateData: Record<string, boolean> = {};
    if (dto.notify90Days !== undefined) updateData.notify90Days = dto.notify90Days;
    if (dto.notify60Days !== undefined) updateData.notify60Days = dto.notify60Days;
    if (dto.notify30Days !== undefined) updateData.notify30Days = dto.notify30Days;
    if (dto.notify7Days !== undefined) updateData.notify7Days = dto.notify7Days;
    if (dto.emailEnabled !== undefined) updateData.emailEnabled = dto.emailEnabled;
    if (dto.inAppEnabled !== undefined) updateData.inAppEnabled = dto.inAppEnabled;

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: updateData,
    });
  }
}

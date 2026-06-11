import { Controller, Get, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferenceDto } from './dto/notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('notification-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notification-preferences', version: '1' })
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.preferencesService.getOrCreate(user.userId);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.preferencesService.update(user.userId, dto);
  }
}

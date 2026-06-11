import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ExpiryService } from './expiry.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('expiry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'expiry', version: '1' })
export class ExpiryController {
  constructor(private readonly expiryService: ExpiryService) {}

  @Get('expiring-soon')
  @ApiOperation({ summary: 'Get documents expiring within 90 days' })
  @ApiResponse({ status: 200, description: 'Expiring documents retrieved' })
  async getExpiringSoon(@CurrentUser() user: CurrentUserPayload) {
    return this.expiryService.getExpiringDocuments(user.userId, 90);
  }

  @Get('recently-expired')
  @ApiOperation({ summary: 'Get recently expired documents (last 30 days)' })
  @ApiResponse({ status: 200, description: 'Expired documents retrieved' })
  async getRecentlyExpired(@CurrentUser() user: CurrentUserPayload) {
    return this.expiryService.getExpiredDocuments(user.userId);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get notification and expiry summary stats' })
  @ApiResponse({ status: 200, description: 'Summary stats retrieved' })
  async getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.expiryService.getSummary(user.userId);
  }
}

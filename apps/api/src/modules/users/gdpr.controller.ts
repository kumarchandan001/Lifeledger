import { Controller, Get, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('gdpr')
@Controller({ path: 'users/gdpr', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly usersService: UsersService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export all personal data associated with the authenticated user (GDPR Compliance)' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  async exportData(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.usersService.exportUserData(user.userId);
    return { success: true, data };
  }

  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete user account and purge all associated documents, backups, metadata, and records (GDPR Right to be Forgotten)' })
  @ApiResponse({ status: 200, description: 'Account and associated data deleted successfully' })
  async deleteAccount(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.deleteUserData(user.userId);
  }
}

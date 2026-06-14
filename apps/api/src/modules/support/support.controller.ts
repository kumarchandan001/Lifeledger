import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('support')
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new support ticket, feedback, or bug report' })
  @ApiResponse({ status: 201, description: 'Ticket submitted successfully' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.supportService.create(user.userId, dto);
    return { success: true, data: ticket, message: 'Ticket submitted successfully' };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List support tickets (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of tickets retrieved' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const result = await this.supportService.findAllAdmin(
      Number(page) || 1,
      Number(limit) || 10,
      status,
      category,
    );
    return { success: true, data: result };
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update support ticket status or admin notes (Admin only)' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    const ticket = await this.supportService.updateAdmin(id, dto);
    return { success: true, data: ticket, message: 'Ticket updated successfully' };
  }
}

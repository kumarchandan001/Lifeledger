import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TrustedContactsService } from './trusted-contacts.service';
import { EmergencyVaultService } from './emergency-vault.service';
import { EmergencyRequestsService } from './emergency-requests.service';
import { EmergencyAccessService } from './emergency-access.service';
import { EmergencyActivityService } from './emergency-activity.service';
import { PrismaService } from '../prisma/prisma.service';

import { CreateTrustedContactDto, UpdateTrustedContactDto } from './dto/trusted-contact.dto';
import { ToggleVaultDocumentDto } from './dto/emergency-vault.dto';
import {
  CreateAccessRequestDto,
  ResolveAccessRequestDto,
  StartSessionDto,
  EndSessionDto,
} from './dto/emergency-request.dto';
import { UpdateEmergencySettingsDto } from './dto/emergency-settings.dto';

@ApiTags('emergency')
@Controller({ path: 'emergency', version: '1' })
export class EmergencyController {
  constructor(
    private readonly contactsService: TrustedContactsService,
    private readonly vaultService: EmergencyVaultService,
    private readonly requestsService: EmergencyRequestsService,
    private readonly accessService: EmergencyAccessService,
    private readonly activityService: EmergencyActivityService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Trusted Contacts ───
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('contacts')
  @ApiOperation({ summary: 'Add a new trusted contact' })
  async addContact(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTrustedContactDto,
  ): Promise<any> {
    return this.contactsService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('contacts')
  @ApiOperation({ summary: 'List all trusted contacts' })
  async getContacts(@CurrentUser() user: CurrentUserPayload): Promise<any> {
    return this.contactsService.findAll(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('contacts/:id')
  @ApiOperation({ summary: 'Update a trusted contact' })
  async updateContact(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateTrustedContactDto,
  ): Promise<any> {
    return this.contactsService.update(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('contacts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a trusted contact' })
  async removeContact(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<any> {
    return this.contactsService.remove(id, user.userId);
  }

  // ─── Emergency Vault ───
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('vault/documents')
  @ApiOperation({ summary: 'Add a document to the emergency vault' })
  async addVaultDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ToggleVaultDocumentDto,
  ): Promise<any> {
    return this.vaultService.addDocument(user.userId, dto.documentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('vault/documents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a document from the emergency vault' })
  async removeVaultDocument(
    @Param('id') documentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<any> {
    return this.vaultService.removeDocument(user.userId, documentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('vault/documents')
  @ApiOperation({ summary: 'List all emergency vault documents' })
  async getVaultDocuments(@CurrentUser() user: CurrentUserPayload): Promise<any> {
    return this.vaultService.findAll(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('vault/ai-suggestions')
  @ApiOperation({ summary: 'Get AI suggestions for emergency vault documents' })
  async getVaultSuggestions(@CurrentUser() user: CurrentUserPayload): Promise<any> {
    return this.vaultService.getAISuggestions(user.userId);
  }

  // ─── Emergency Requests ───
  @Post('requests')
  @ApiOperation({ summary: 'Submit an emergency access request (Public)' })
  async createRequest(@Body() dto: CreateAccessRequestDto): Promise<any> {
    return this.requestsService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('requests')
  @ApiOperation({ summary: 'List incoming emergency access requests' })
  async getIncomingRequests(@CurrentUser() user: CurrentUserPayload): Promise<any> {
    return this.requestsService.findAllIncoming(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('requests/:id/resolve')
  @ApiOperation({ summary: 'Approve or reject an emergency access request' })
  async resolveRequest(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveAccessRequestDto,
  ): Promise<any> {
    return this.requestsService.resolve(id, user.userId, dto);
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an emergency access request' })
  async cancelRequest(
    @Param('id') id: string,
    @Body('requesterEmail') requesterEmail: string,
  ): Promise<any> {
    return this.requestsService.cancel(id, requesterEmail);
  }

  @Get('requests/:id/status')
  @ApiOperation({ summary: 'Get public request status and details' })
  async getRequestStatus(@Param('id') id: string): Promise<any> {
    return this.requestsService.getRequestStatus(id);
  }

  // ─── Emergency Access Session (Public token-based) ───
  @Post('access/session/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a trusted contact emergency access session' })
  async startSession(@Body() dto: StartSessionDto): Promise<any> {
    return this.accessService.startSession(dto.token);
  }

  @Post('access/session/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an emergency access session early' })
  async endSession(@Body() dto: EndSessionDto): Promise<any> {
    return this.accessService.endSession(dto.token);
  }

  @Get('access/documents')
  @ApiOperation({ summary: 'View read-only emergency documents via session token' })
  async viewEmergencyDocuments(@Query('token') token: string): Promise<any> {
    return this.accessService.viewDocuments(token);
  }

  // ─── Activity Log ───
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  @ApiOperation({ summary: 'Retrieve emergency activity log' })
  async getActivityFeed(@CurrentUser() user: CurrentUserPayload): Promise<any> {
    return this.activityService.getActivityFeed(user.userId);
  }

  // ─── Emergency Settings ───
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  @ApiOperation({ summary: 'Update emergency waiting period setting' })
  async updateSettings(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateEmergencySettingsDto,
  ): Promise<any> {
    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: {
        emergencyWaitingPeriod: dto.emergencyWaitingPeriod,
      },
    });

    await this.activityService.logActivity(user.userId, 'SETTINGS_UPDATED', user.userId, {
      emergencyWaitingPeriod: dto.emergencyWaitingPeriod,
    });

    return {
      emergencyWaitingPeriod: updated.emergencyWaitingPeriod,
    };
  }
}

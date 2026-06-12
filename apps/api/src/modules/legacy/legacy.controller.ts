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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

import { BeneficiaryService } from './beneficiary.service';
import { LegacyPlanService } from './legacy-plan.service';
import { LegacyVaultService } from './legacy-vault.service';
import { LegacyInstructionService } from './legacy-instruction.service';
import { PersonalMessageService } from './personal-message.service';
import { DigitalAssetService } from './digital-asset.service';
import { LegacyAccessService } from './legacy-access.service';
import { LegacyActivityService } from './legacy-activity.service';
import { LegacyAnalyticsService } from './legacy-analytics.service';

import { CreateBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';
import { CreateLegacyPlanDto, UpdateLegacyPlanDto, AssignPlanBeneficiaryDto } from './dto/legacy-plan.dto';
import { AddLegacyVaultDocumentDto } from './dto/legacy-vault.dto';
import { CreateLegacyInstructionDto, UpdateLegacyInstructionDto } from './dto/legacy-instruction.dto';
import { CreatePersonalMessageDto, UpdatePersonalMessageDto } from './dto/personal-message.dto';
import { RegisterDigitalAssetDto, UpdateDigitalAssetDto } from './dto/digital-asset.dto';
import { ResolveLegacyAccessRequestDto } from './dto/legacy-access.dto';

@ApiTags('legacy')
@Controller({ path: 'legacy', version: '1' })
export class LegacyController {
  constructor(
    private readonly beneficiaryService: BeneficiaryService,
    private readonly planService: LegacyPlanService,
    private readonly vaultService: LegacyVaultService,
    private readonly instructionService: LegacyInstructionService,
    private readonly messageService: PersonalMessageService,
    private readonly assetService: DigitalAssetService,
    private readonly accessService: LegacyAccessService,
    private readonly activityService: LegacyActivityService,
    private readonly analyticsService: LegacyAnalyticsService,
  ) {}

  // ═══════════════════════════════════════════════════
  // BENEFICIARIES
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('beneficiaries')
  @ApiOperation({ summary: 'Add a new beneficiary' })
  async addBeneficiary(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiaryService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('beneficiaries')
  @ApiOperation({ summary: 'List all beneficiaries' })
  async getBeneficiaries(@CurrentUser() user: CurrentUserPayload) {
    return this.beneficiaryService.findAll(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('beneficiaries/:id')
  @ApiOperation({ summary: 'Get beneficiary details' })
  async getBeneficiary(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.beneficiaryService.findOne(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('beneficiaries/:id')
  @ApiOperation({ summary: 'Update a beneficiary' })
  async updateBeneficiary(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateBeneficiaryDto,
  ) {
    return this.beneficiaryService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('beneficiaries/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a beneficiary' })
  async removeBeneficiary(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.beneficiaryService.remove(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('beneficiaries/import/family')
  @ApiOperation({ summary: 'Import family members as beneficiaries' })
  async importFromFamily(@CurrentUser() user: CurrentUserPayload) {
    return this.beneficiaryService.importFromFamily(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('beneficiaries/import/contacts')
  @ApiOperation({ summary: 'Import trusted contacts as beneficiaries' })
  async importFromContacts(@CurrentUser() user: CurrentUserPayload) {
    return this.beneficiaryService.importFromTrustedContacts(user.userId);
  }

  // ═══════════════════════════════════════════════════
  // LEGACY PLANS
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('plans')
  @ApiOperation({ summary: 'Create a legacy plan' })
  async createPlan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLegacyPlanDto,
  ) {
    return this.planService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('plans')
  @ApiOperation({ summary: 'List all legacy plans' })
  async getPlans(@CurrentUser() user: CurrentUserPayload) {
    return this.planService.findAll(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan details' })
  async getPlan(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.planService.findOne(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a legacy plan' })
  async updatePlan(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateLegacyPlanDto,
  ) {
    return this.planService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('plans/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a legacy plan' })
  async deletePlan(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.planService.remove(user.userId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('plans/:id/beneficiaries')
  @ApiOperation({ summary: 'Assign beneficiary to a plan' })
  async assignPlanBeneficiary(
    @Param('id') planId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AssignPlanBeneficiaryDto,
  ) {
    return this.planService.assignBeneficiary(user.userId, planId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('plans/:planId/beneficiaries/:beneficiaryId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove beneficiary from a plan' })
  async removePlanBeneficiary(
    @Param('planId') planId: string,
    @Param('beneficiaryId') beneficiaryId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.planService.removeBeneficiary(user.userId, planId, beneficiaryId);
  }

  // ═══════════════════════════════════════════════════
  // LEGACY VAULT
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('vault/documents')
  @ApiOperation({ summary: 'Add document to legacy vault' })
  async addVaultDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddLegacyVaultDocumentDto,
  ) {
    return this.vaultService.addDocument(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('vault/documents')
  @ApiOperation({ summary: 'List legacy vault documents' })
  async getVaultDocuments(@CurrentUser() user: CurrentUserPayload) {
    return this.vaultService.findAll(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('vault/documents/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove document from legacy vault' })
  async removeVaultDocument(
    @Param('id') documentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.vaultService.removeDocument(user.userId, documentId);
  }

  // ═══════════════════════════════════════════════════
  // INSTRUCTIONS
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('instructions')
  @ApiOperation({ summary: 'Create a legacy instruction' })
  async createInstruction(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateLegacyInstructionDto,
  ) {
    return this.instructionService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('instructions')
  @ApiOperation({ summary: 'List all instructions' })
  async getInstructions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('category') category?: string,
  ) {
    return this.instructionService.findAll(user.userId, category);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('instructions/:id')
  @ApiOperation({ summary: 'Update an instruction' })
  async updateInstruction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateLegacyInstructionDto,
  ) {
    return this.instructionService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('instructions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an instruction' })
  async deleteInstruction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.instructionService.remove(user.userId, id);
  }

  // ═══════════════════════════════════════════════════
  // PERSONAL MESSAGES
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('messages')
  @ApiOperation({ summary: 'Create a personal message' })
  async createMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePersonalMessageDto,
  ) {
    return this.messageService.create(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('messages')
  @ApiOperation({ summary: 'List all personal messages' })
  async getMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Query('type') type?: string,
  ) {
    return this.messageService.findAll(user.userId, type);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('messages/:id')
  @ApiOperation({ summary: 'Update a personal message' })
  async updateMessage(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdatePersonalMessageDto,
  ) {
    return this.messageService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('messages/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a personal message' })
  async deleteMessage(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messageService.remove(user.userId, id);
  }

  // ═══════════════════════════════════════════════════
  // DIGITAL ASSETS
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('assets')
  @ApiOperation({ summary: 'Register a digital asset' })
  async registerAsset(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterDigitalAssetDto,
  ) {
    return this.assetService.register(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('assets')
  @ApiOperation({ summary: 'List all digital assets' })
  async getAssets(
    @CurrentUser() user: CurrentUserPayload,
    @Query('assetType') assetType?: string,
  ) {
    return this.assetService.findAll(user.userId, assetType);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('assets/:id')
  @ApiOperation({ summary: 'Update a digital asset' })
  async updateAsset(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDigitalAssetDto,
  ) {
    return this.assetService.update(user.userId, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('assets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a digital asset' })
  async removeAsset(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assetService.remove(user.userId, id);
  }

  // ═══════════════════════════════════════════════════
  // ACCESS WORKFLOW
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('access/request')
  @ApiOperation({ summary: 'Submit a legacy access request' })
  async createAccessRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body('beneficiaryId') beneficiaryId: string,
    @Body('reason') reason: string,
  ) {
    return this.accessService.createRequest(user.userId, beneficiaryId, reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('access/requests')
  @ApiOperation({ summary: 'List incoming legacy access requests' })
  async getIncomingRequests(@CurrentUser() user: CurrentUserPayload) {
    return this.accessService.findIncomingRequests(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('access/requests/:id/resolve')
  @ApiOperation({ summary: 'Approve or reject a legacy access request' })
  async resolveRequest(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ResolveLegacyAccessRequestDto,
  ) {
    return this.accessService.resolve(id, user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('access/sessions')
  @ApiOperation({ summary: 'List active legacy access sessions' })
  async getActiveSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.accessService.getActiveSessions(user.userId);
  }

  // ═══════════════════════════════════════════════════
  // ANALYTICS & ACTIVITY
  // ═══════════════════════════════════════════════════

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get legacy dashboard statistics' })
  async getDashboardStats(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.getDashboardStats(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('readiness')
  @ApiOperation({ summary: 'Generate legacy readiness report' })
  async getReadinessReport(@CurrentUser() user: CurrentUserPayload) {
    return this.analyticsService.generateReadinessReport(user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  @ApiOperation({ summary: 'Get legacy activity log' })
  async getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getActivityFeed(
      user.userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}

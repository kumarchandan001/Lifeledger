import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { DocumentIntelligenceService } from './document-intelligence.service';
import {
  ApproveAISuggestionDto,
  RejectAISuggestionDto,
  QueryProcessingJobsDto,
} from './dto/document-intelligence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('document-intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ version: '1' })
export class DocumentIntelligenceController {
  constructor(
    private readonly intelligenceService: DocumentIntelligenceService,
  ) {}

  // ═══════════════════════════════════════════════════
  // Document-scoped endpoints
  // ═══════════════════════════════════════════════════

  @Post('documents/:id/process')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start AI processing pipeline for a document' })
  @ApiResponse({ status: 202, description: 'Processing queued successfully' })
  @ApiResponse({ status: 400, description: 'Unsupported file type' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async startProcessing(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.intelligenceService.startProcessing(
      id,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('documents/:id/processing-status')
  @ApiOperation({ summary: 'Get full processing status for a document' })
  @ApiResponse({ status: 200, description: 'Processing status retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getProcessingStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<any> {
    return this.intelligenceService.getProcessingStatus(id, user.userId);
  }

  @Get('documents/:id/ocr')
  @ApiOperation({ summary: 'Get OCR extraction results for a document' })
  @ApiResponse({ status: 200, description: 'OCR results retrieved' })
  @ApiResponse({ status: 404, description: 'Document or OCR results not found' })
  async getOCRResults(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<any> {
    return this.intelligenceService.getOCRResults(id, user.userId);
  }

  @Get('documents/:id/ai-analysis')
  @ApiOperation({ summary: 'Get AI analysis results for a document' })
  @ApiResponse({ status: 200, description: 'AI analysis retrieved' })
  @ApiResponse({ status: 404, description: 'Document or AI analysis not found' })
  async getAIAnalysis(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<any> {
    return this.intelligenceService.getAIAnalysis(id, user.userId);
  }

  @Post('documents/:id/ai-analysis/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and apply AI suggestions to a document' })
  @ApiResponse({ status: 200, description: 'AI suggestions approved and applied' })
  @ApiResponse({ status: 404, description: 'Document or AI analysis not found' })
  @ApiResponse({ status: 400, description: 'Suggestions already approved' })
  async approveAISuggestions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ApproveAISuggestionDto,
    @Req() req: Request,
  ) {
    return this.intelligenceService.approveAISuggestions(
      id,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('documents/:id/ai-analysis/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject AI suggestions for a document' })
  @ApiResponse({ status: 200, description: 'AI suggestions rejected' })
  @ApiResponse({ status: 404, description: 'Document or AI analysis not found' })
  async rejectAISuggestions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RejectAISuggestionDto,
    @Req() req: Request,
  ) {
    return this.intelligenceService.rejectAISuggestions(
      id,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('documents/:id/reprocess')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Reprocess a document through the AI pipeline' })
  @ApiResponse({ status: 202, description: 'Reprocessing queued' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async reprocessDocument(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.intelligenceService.reprocessDocument(
      id,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════════
  // Processing dashboard endpoints
  // ═══════════════════════════════════════════════════

  @Get('processing/status')
  @ApiOperation({ summary: 'Get processing dashboard summary for current user' })
  @ApiResponse({ status: 200, description: 'Processing summary retrieved' })
  async getProcessingSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.intelligenceService.getProcessingSummary(user.userId);
  }

  @Get('processing/jobs')
  @ApiOperation({ summary: 'Get paginated list of processing jobs' })
  @ApiResponse({ status: 200, description: 'Processing jobs list retrieved' })
  async getProcessingJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryProcessingJobsDto,
  ): Promise<any> {
    return this.intelligenceService.getProcessingJobs(user.userId, query);
  }

  @Get('processing/review-queue')
  @ApiOperation({ summary: 'Get documents needing human review' })
  @ApiResponse({ status: 200, description: 'Review queue retrieved' })
  async getReviewQueue(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<any> {
    return this.intelligenceService.getReviewQueue(
      user.userId,
      Number(page),
      Number(limit),
    );
  }
}

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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { DocumentsService } from './documents.service';
import { CreateUploadUrlDto, CreateDocumentDto, UpdateDocumentDto, QueryDocumentsDto } from './dto/documents.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a presigned upload URL for a new document' })
  @ApiResponse({ status: 200, description: 'Signed upload URL generated successfully' })
  @ApiResponse({ status: 400, description: 'Unsupported file type or invalid parameters' })
  @ApiResponse({ status: 413, description: 'Storage quota exceeded' })
  async getUploadUrl(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateUploadUrlDto) {
    return this.documentsService.generateUploadUrl(
      user.userId,
      dto.fileName,
      dto.mimeType,
      dto.fileSize,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a successfully uploaded document and its metadata' })
  @ApiResponse({ status: 201, description: 'Document registered successfully' })
  @ApiResponse({ status: 404, description: 'Category or subcategory not found' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDocumentDto,
    @Req() req: Request,
  ) {
    return this.documentsService.create(
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a paginated list of user documents' })
  @ApiResponse({ status: 200, description: 'List of documents retrieved successfully' })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryDocumentsDto) {
    return this.documentsService.findAll(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific document' })
  @ApiResponse({ status: 200, description: 'Document details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.documentsService.findOne(id, user.userId, req.ip, req.headers['user-agent']);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update metadata of an existing document' })
  @ApiResponse({ status: 200, description: 'Document metadata updated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateDocumentDto,
    @Req() req: Request,
  ) {
    return this.documentsService.update(
      id,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.documentsService.softDelete(id, user.userId, req.ip, req.headers['user-agent']);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft deleted document' })
  @ApiResponse({ status: 200, description: 'Document restored successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  @ApiResponse({ status: 400, description: 'Document is not deleted' })
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.documentsService.restore(id, user.userId, req.ip, req.headers['user-agent']);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorite status of a document' })
  @ApiResponse({ status: 200, description: 'Favorite status toggled successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async toggleFavorite(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.documentsService.toggleFavorite(id, user.userId, req.ip, req.headers['user-agent']);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Generate a secure download/access URL for a document' })
  @ApiResponse({ status: 200, description: 'Signed download URL generated successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    return this.documentsService.getDownloadUrl(id, user.userId, req.ip, req.headers['user-agent']);
  }
}

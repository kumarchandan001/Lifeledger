import {
  Injectable,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, Document, DocumentStatus, OcrStatus } from '@lifeledger/database';
import { PLAN_LIMITS, PlanName, FILE_LIMITS } from '@lifeledger/shared';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentsDto } from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  private async checkQuota(userId: string, newFileSize: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const planName = user.subscription?.plan?.name ?? 'free';
    const limits = PLAN_LIMITS[planName.toUpperCase() as PlanName] ?? PLAN_LIMITS.FREE;

    // ─── Check active document count ───
    if (limits.maxDocuments !== -1) {
      const activeCount = await this.prisma.document.count({
        where: {
          userId,
          deletedAt: null,
        },
      });
      if (activeCount >= limits.maxDocuments) {
        throw new BadRequestException(
          `Document count limit exceeded. Your plan allows up to ${limits.maxDocuments} documents.`,
        );
      }
    }

    // ─── Check active storage size ───
    const aggregate = await this.prisma.document.aggregate({
      where: {
        userId,
        deletedAt: null,
      },
      _sum: {
        fileSize: true,
      },
    });

    const totalUsedBytes = Number(aggregate._sum.fileSize ?? 0);
    if (totalUsedBytes + newFileSize > limits.storageLimitBytes) {
      throw new PayloadTooLargeException(
        `Storage quota exceeded. Your plan allows up to ${limits.storageLimitGb} GB of storage.`,
      );
    }
  }

  async generateUploadUrl(userId: string, fileName: string, mimeType: string, fileSize: number) {
    // ─── Validate file type ───
    const isAllowedMimeType = (FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[]).includes(
      mimeType,
    );
    if (!isAllowedMimeType) {
      throw new BadRequestException('File type not supported');
    }

    // ─── Check Quota ───
    await this.checkQuota(userId, fileSize);

    // ─── Generate UUID and upload payload ───
    const documentId = crypto.randomUUID();
    return this.storageService.generateUploadUrl(userId, documentId, mimeType);
  }

  async create(userId: string, dto: CreateDocumentDto, ipAddress?: string, userAgent?: string) {
    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || !category.isActive) {
      throw new NotFoundException('Selected category is invalid or inactive');
    }

    // Validate subcategory if provided
    if (dto.subCategoryId) {
      const subCategory = await this.prisma.subCategory.findUnique({
        where: { id: dto.subCategoryId },
      });
      if (!subCategory || subCategory.categoryId !== dto.categoryId) {
        throw new NotFoundException('Selected subcategory is invalid for this category');
      }
    }

    // Recheck quota one last time before DB write
    await this.checkQuota(userId, dto.fileSize);

    // Save document and version in a transaction
    const document = await this.prisma.$transaction(async (tx) => {
      // 1. Create main document
      const doc = await tx.document.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          subCategoryId: dto.subCategoryId ?? null,
          title: dto.title,
          description: dto.description ?? null,
          fileName: dto.fileName,
          fileUrl: dto.fileName, // Store unique name or path as identifier
          fileSize: BigInt(dto.fileSize),
          mimeType: dto.mimeType,
          status: DocumentStatus.ACTIVE,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          documentNumber: dto.documentNumber ?? null,
          issuer: dto.issuer ?? null,
          isSensitive: dto.isSensitive ?? false,
          ocrStatus: OcrStatus.PENDING,
          version: 1,
        },
      });

      // 2. Create version history
      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize,
          uploadedBy: userId,
          changeNote: 'Initial upload',
        },
      });

      // 3. Create metadata
      await tx.documentMetadata.create({
        data: {
          documentId: doc.id,
          manualFields: dto.metadata ?? {},
          extractedFields: {},
          confidenceScores: {},
        },
      });

      // 4. Create tags if any
      if (dto.tags && dto.tags.length > 0) {
        await tx.documentTag.createMany({
          data: dto.tags.map((tag) => ({
            documentId: doc.id,
            tag,
            createdBy: userId,
            source: 'MANUAL',
          })),
        });
      }

      return doc;
    });

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_UPLOAD,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { title: document.title, fileSize: dto.fileSize },
      ipAddress,
      userAgent,
    });

    return this.serializeDocument(document);
  }

  async findAll(userId: string, query: QueryDocumentsDto) {
    const { page, limit, categorySlug, status, search, sortBy, sortOrder, isFavorite } = query;

    const whereClause: any = {
      userId,
      deletedAt: null,
    };

    if (categorySlug) {
      whereClause.category = { slug: categorySlug };
    }

    if (status) {
      whereClause.status = status;
    }

    if (isFavorite !== undefined) {
      whereClause.isFavorite = isFavorite;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { some: { tag: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        include: {
          category: true,
          subCategory: true,
          tags: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    // Generate temporary access URLs for listed documents
    const serializedDocs = await Promise.all(
      documents.map(async (doc) => {
        const serialized = this.serializeDocument(doc);
        try {
          serialized.fileUrl = await this.storageService.generateDownloadUrl(doc.fileUrl);
        } catch {
          // Graceful fallback to raw value if signing fails
        }
        return serialized;
      }),
    );

    return {
      documents: serializedDocs,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        category: true,
        subCategory: true,
        metadata: true,
        tags: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_VIEW,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { title: document.title },
      ipAddress,
      userAgent,
    });

    const serialized = this.serializeDocument(document);
    try {
      serialized.fileUrl = await this.storageService.generateDownloadUrl(document.fileUrl);
    } catch {
      // Fallback
    }

    return serialized;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateDocumentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Verify document exists
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Validate category update
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || !category.isActive) {
        throw new NotFoundException('Selected category is invalid or inactive');
      }
    }

    // Validate subcategory update
    if (dto.subCategoryId) {
      const catId = dto.categoryId ?? document.categoryId;
      const subCategory = await this.prisma.subCategory.findUnique({
        where: { id: dto.subCategoryId },
      });
      if (!subCategory || subCategory.categoryId !== catId) {
        throw new NotFoundException('Selected subcategory is invalid for this category');
      }
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.categoryId !== undefined) updateData.categoryId = dto.categoryId;
    if (dto.subCategoryId !== undefined) updateData.subCategoryId = dto.subCategoryId;
    if (dto.issueDate !== undefined)
      updateData.issueDate = dto.issueDate ? new Date(dto.issueDate) : null;
    if (dto.expiryDate !== undefined)
      updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    if (dto.documentNumber !== undefined) updateData.documentNumber = dto.documentNumber;
    if (dto.issuer !== undefined) updateData.issuer = dto.issuer;
    if (dto.isSensitive !== undefined) updateData.isSensitive = dto.isSensitive;

    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subCategory: true,
        tags: true,
      },
    });

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_UPDATE,
      resourceType: 'DOCUMENT',
      resourceId: updatedDocument.id,
      details: { title: updatedDocument.title, changes: Object.keys(updateData) },
      ipAddress,
      userAgent,
    });

    return this.serializeDocument(updatedDocument);
  }

  async softDelete(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_DELETE,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { title: document.title, type: 'SOFT_DELETE' },
      ipAddress,
      userAgent,
    });

    return { success: true, message: 'Document successfully deleted' };
  }

  async restore(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.deletedAt) {
      throw new BadRequestException('Document is not deleted');
    }

    // Verify quota before restoring
    await this.checkQuota(userId, Number(document.fileSize));

    const restoredDoc = await this.prisma.document.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_UPDATE,
      resourceType: 'DOCUMENT',
      resourceId: restoredDoc.id,
      details: { title: restoredDoc.title, action: 'RESTORE' },
      ipAddress,
      userAgent,
    });

    return this.serializeDocument(restoredDoc);
  }

  async toggleFavorite(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { isFavorite: !document.isFavorite },
    });

    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_UPDATE,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { title: document.title, isFavorite: updated.isFavorite },
      ipAddress,
      userAgent,
    });

    return this.serializeDocument(updated);
  }

  async getDownloadUrl(id: string, userId: string, ipAddress?: string, userAgent?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const downloadUrl = await this.storageService.generateDownloadUrl(document.fileUrl);

    // Write audit log
    await this.auditService.log({
      userId,
      action: AuditAction.DOCUMENT_DOWNLOAD,
      resourceType: 'DOCUMENT',
      resourceId: document.id,
      details: { title: document.title },
      ipAddress,
      userAgent,
    });

    return { downloadUrl };
  }

  private serializeDocument(doc: Document & Record<string, any>) {
    return {
      ...doc,
      fileSize: Number(doc.fileSize), // Convert BigInt to number for JSON response
    };
  }
}

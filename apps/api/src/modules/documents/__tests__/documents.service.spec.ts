import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from '../documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { AuditService } from '../../audit/audit.service';
import { BadRequestException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { DocumentStatus, OcrStatus } from '@lifeledger/database';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: PrismaService;
  let storageService: StorageService;
  let auditService: AuditService;

  const mockUserFree = {
    id: 'user-free',
    subscription: null,
  };

  const mockCategory = {
    id: 'cat-uuid',
    name: 'Identity Documents',
    slug: 'identity',
    isActive: true,
  };

  const mockSubCategory = {
    id: 'subcat-uuid',
    categoryId: 'cat-uuid',
    name: 'Aadhaar Card',
    slug: 'aadhaar',
  };

  const mockDocument = {
    id: 'doc-uuid',
    userId: 'user-free',
    categoryId: 'cat-uuid',
    subCategoryId: 'subcat-uuid',
    title: 'My Document',
    description: 'A test doc',
    fileName: 'doc.pdf',
    fileUrl: 'lifeledger/documents/user-free/doc-uuid',
    fileSize: BigInt(1024),
    mimeType: 'application/pdf',
    status: DocumentStatus.ACTIVE,
    isFavorite: false,
    isSensitive: false,
    ocrStatus: OcrStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    subCategory: {
      findUnique: jest.fn(),
    },
    document: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    documentVersion: {
      create: jest.fn(),
    },
    documentMetadata: {
      create: jest.fn(),
    },
    documentTag: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
  };

  const mockStorageService = {
    generateUploadUrl: jest.fn(),
    generateDownloadUrl: jest.fn(),
    deleteObject: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prisma = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('should throw BadRequestException for unsupported mime types', async () => {
      await expect(
        service.generateUploadUrl('user-free', 'test.exe', 'application/x-msdownload', 1024),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate signed URL successfully under quota limits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFree);
      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: BigInt(10 * 1024 * 1024) } });
      mockStorageService.generateUploadUrl.mockResolvedValue({
        uploadUrl: 'http://cloudinary/upload',
        documentId: 'doc-uuid',
        key: 'lifeledger/documents/user-free/doc-uuid',
      });

      const result = await service.generateUploadUrl('user-free', 'passport.pdf', 'application/pdf', 1024);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-free' },
        include: { subscription: { include: { plan: true } } },
      });
      expect(result.uploadUrl).toBe('http://cloudinary/upload');
    });

    it('should throw PayloadTooLargeException if user exceeds size quota limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFree);
      mockPrisma.document.count.mockResolvedValue(5);
      // Free limit is 1 GB (1 * 1024 * 1024 * 1024 bytes)
      mockPrisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: BigInt(1024 * 1024 * 1024) } });

      await expect(
        service.generateUploadUrl('user-free', 'large.pdf', 'application/pdf', 1024),
      ).rejects.toThrow(PayloadTooLargeException);
    });

    it('should throw BadRequestException if user exceeds max document count limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFree);
      // Free limit is 50 documents
      mockPrisma.document.count.mockResolvedValue(50);
      mockPrisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: BigInt(0) } });

      await expect(
        service.generateUploadUrl('user-free', 'doc.pdf', 'application/pdf', 1024),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('should create a document record in database and write audit logs', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.subCategory.findUnique.mockResolvedValue(mockSubCategory);
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFree);
      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: BigInt(0) } });

      mockPrisma.document.create.mockResolvedValue(mockDocument);

      const result = await service.create('user-free', {
        categoryId: 'cat-uuid',
        subCategoryId: 'subcat-uuid',
        title: 'My Document',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        tags: ['id', 'personal'],
      });

      expect(mockPrisma.document.create).toHaveBeenCalled();
      expect(mockPrisma.documentVersion.create).toHaveBeenCalled();
      expect(mockPrisma.documentMetadata.create).toHaveBeenCalled();
      expect(mockPrisma.documentTag.createMany).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOCUMENT_UPLOAD' }),
      );
      expect(result.fileSize).toBe(1024);
    });

    it('should throw NotFoundException if category is invalid', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-free', {
          categoryId: 'invalid-uuid',
          title: 'My Document',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if subcategory categoryId does not match categoryId', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.subCategory.findUnique.mockResolvedValue({
        id: 'subcat-uuid',
        categoryId: 'different-cat-uuid',
        name: 'Mismatch',
        slug: 'mismatch',
      });

      await expect(
        service.create('user-free', {
          categoryId: 'cat-uuid',
          subCategoryId: 'subcat-uuid',
          title: 'My Document',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp and write audit logs', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);
      mockPrisma.document.update.mockResolvedValue({
        ...mockDocument,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('doc-uuid', 'user-free');

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOCUMENT_DELETE' }),
      );
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      await expect(
        service.softDelete('invalid-uuid', 'user-free'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore document and write audit logs', async () => {
      mockPrisma.document.findFirst.mockResolvedValue({
        ...mockDocument,
        deletedAt: new Date(),
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFree);
      mockPrisma.document.count.mockResolvedValue(5);
      mockPrisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: BigInt(0) } });
      mockPrisma.document.update.mockResolvedValue(mockDocument);

      const result = await service.restore('doc-uuid', 'user-free');

      expect(mockPrisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-uuid' },
        data: { deletedAt: null },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOCUMENT_UPDATE' }),
      );
      expect(result.deletedAt).toBeNull();
    });

    it('should throw BadRequestException if document is not deleted', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);

      await expect(
        service.restore('doc-uuid', 'user-free'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

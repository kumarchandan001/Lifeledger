import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegacyActivityService } from './legacy-activity.service';
import { AddLegacyVaultDocumentDto } from './dto/legacy-vault.dto';

@Injectable()
export class LegacyVaultService {
  private readonly logger = new Logger(LegacyVaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: LegacyActivityService,
  ) {}

  /**
   * Ensure the user has a legacy vault (auto-create if missing)
   */
  private async ensureVault(userId: string) {
    let vault = await this.prisma.legacyVault.findUnique({ where: { userId } });
    if (!vault) {
      vault = await this.prisma.legacyVault.create({
        data: { userId, isActive: true },
      });
    }
    return vault;
  }

  async addDocument(userId: string, dto: AddLegacyVaultDocumentDto): Promise<any> {
    const vault = await this.ensureVault(userId);

    // Verify document ownership
    const document = await this.prisma.document.findUnique({
      where: { id: dto.documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (document.userId !== userId) {
      throw new ForbiddenException('You do not own this document');
    }

    // Check if already in legacy vault
    const existing = await this.prisma.legacyVaultDocument.findUnique({
      where: {
        legacyVaultId_documentId: {
          legacyVaultId: vault.id,
          documentId: dto.documentId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Document is already in the legacy vault');
    }

    const vaultDoc = await this.prisma.legacyVaultDocument.create({
      data: {
        userId,
        legacyVaultId: vault.id,
        documentId: dto.documentId,
        category: dto.category as any,
        notes: dto.notes || null,
      },
      include: {
        document: {
          select: { id: true, title: true, fileName: true, categoryId: true },
        },
      },
    });

    await this.activityService.logActivity(
      userId,
      'VAULT_DOCUMENT_ADDED',
      'legacy_vault_document',
      vaultDoc.id,
      userId,
      { documentTitle: document.title, category: dto.category },
    );

    return vaultDoc;
  }

  async findAll(userId: string): Promise<any> {
    const vault = await this.ensureVault(userId);
    return this.prisma.legacyVaultDocument.findMany({
      where: { legacyVaultId: vault.id },
      include: {
        document: {
          include: {
            category: true,
            subCategory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDocument(userId: string, documentId: string): Promise<any> {
    const vaultDoc = await this.prisma.legacyVaultDocument.findFirst({
      where: { userId, documentId },
      include: { document: { select: { title: true } } },
    });
    if (!vaultDoc) {
      throw new NotFoundException('Document is not in the legacy vault');
    }

    await this.prisma.legacyVaultDocument.delete({ where: { id: vaultDoc.id } });

    await this.activityService.logActivity(
      userId,
      'VAULT_DOCUMENT_REMOVED',
      'legacy_vault_document',
      vaultDoc.id,
      userId,
      { documentTitle: vaultDoc.document?.title || 'Unknown' },
    );

    return { success: true, message: 'Document removed from legacy vault' };
  }

  async getVaultStats(userId: string): Promise<any> {
    const vault = await this.ensureVault(userId);
    const count = await this.prisma.legacyVaultDocument.count({
      where: { legacyVaultId: vault.id },
    });
    return { vaultId: vault.id, documentCount: count, isActive: vault.isActive };
  }
}

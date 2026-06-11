import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyActivityService } from './emergency-activity.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EmergencyVaultService {
  private readonly logger = new Logger(EmergencyVaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: EmergencyActivityService,
    private readonly aiService: AiService,
  ) {}

  async addDocument(userId: string, documentId: string) {
    // Check if document exists and belongs to user
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (document.userId !== userId) {
      throw new ForbiddenException('You do not own this document');
    }

    // Check if already in vault
    const existing = await this.prisma.emergencyVaultDocument.findUnique({
      where: { documentId },
    });
    if (existing) {
      throw new ConflictException('Document is already in the emergency vault');
    }

    const vaultDoc = await this.prisma.emergencyVaultDocument.create({
      data: {
        userId,
        documentId,
      },
    });

    await this.activityService.logActivity(userId, 'VAULT_DOCUMENT_ADDED', userId, {
      documentId,
      documentTitle: document.title,
    });

    return vaultDoc;
  }

  async removeDocument(userId: string, documentId: string) {
    const existing = await this.prisma.emergencyVaultDocument.findUnique({
      where: { documentId },
    });
    if (!existing) {
      throw new NotFoundException('Document is not in the emergency vault');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not own this vault document');
    }

    await this.prisma.emergencyVaultDocument.delete({
      where: { documentId },
    });

    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    await this.activityService.logActivity(userId, 'VAULT_DOCUMENT_REMOVED', userId, {
      documentId,
      documentTitle: document?.title || 'Unknown Document',
    });

    return { success: true, message: 'Document removed from emergency vault' };
  }

  async findAll(userId: string) {
    return this.prisma.emergencyVaultDocument.findMany({
      where: { userId },
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

  async getAISuggestions(userId: string) {
    // Get all user active documents (not deleted)
    const allDocs = await this.prisma.document.findMany({
      where: { userId, deletedAt: null },
    });

    // Get current vault document IDs
    const vaultDocs = await this.prisma.emergencyVaultDocument.findMany({
      where: { userId },
      select: { documentId: true },
    });
    const vaultDocIds = new Set(vaultDocs.map((vd) => vd.documentId));

    // Filter documents not already in vault
    const candidateDocs = allDocs.filter((d) => !vaultDocIds.has(d.id));

    // Fetch categories and subcategories mapping
    const categories = await this.prisma.category.findMany();
    const subcategories = await this.prisma.subCategory.findMany();
    const catMap = new Map(categories.map((c) => [c.id, c.slug]));
    const subcatMap = new Map(subcategories.map((s) => [s.id, s.slug]));

    const mappedCandidates = candidateDocs.map((d) => ({
      id: d.id,
      title: d.title,
      categorySlug: catMap.get(d.categoryId) || 'other',
      subCategorySlug: d.subCategoryId ? subcatMap.get(d.subCategoryId) : null,
    }));

    const aiSuggestions = await this.aiService.suggestVaultDocuments(mappedCandidates);

    // Resolve details of suggested documents
    const detailedSuggestions = aiSuggestions
      .map((s) => {
        const doc = candidateDocs.find((d) => d.id === s.documentId);
        if (!doc) return null;
        return {
          documentId: s.documentId,
          title: doc.title,
          categoryName: categories.find((c) => c.id === doc.categoryId)?.name || 'Unknown',
          reason: s.reason,
        };
      })
      .filter((s) => s !== null);

    // Find missing documents
    const currentVaultDocs = await this.prisma.emergencyVaultDocument.findMany({
      where: { userId },
      include: {
        document: true,
      },
    });

    const mappedVaultDocs = currentVaultDocs.map((vd) => ({
      title: vd.document.title,
      categorySlug: catMap.get(vd.document.categoryId) || 'other',
      subCategorySlug: vd.document.subCategoryId ? subcatMap.get(vd.document.subCategoryId) : null,
    }));

    const missingDocuments = await this.aiService.identifyMissingDocuments(mappedVaultDocs);

    return {
      suggestions: detailedSuggestions,
      missing: missingDocuments,
    };
  }
}

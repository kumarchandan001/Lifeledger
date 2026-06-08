import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async search(userId: string, query: string, page = 1, limit = 20): Promise<any> {
    if (!query || query.trim() === '') {
      return {
        documents: [],
        total: 0,
        page,
        limit,
      };
    }

    const cleanQuery = query.trim();

    const whereClause = {
      userId,
      deletedAt: null,
      OR: [
        { title: { contains: cleanQuery, mode: 'insensitive' as const } },
        { description: { contains: cleanQuery, mode: 'insensitive' as const } },
        { tags: { some: { tag: { contains: cleanQuery, mode: 'insensitive' as const } } } },
        { documentNumber: { contains: cleanQuery, mode: 'insensitive' as const } },
        { issuer: { contains: cleanQuery, mode: 'insensitive' as const } },
      ],
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: whereClause,
        include: {
          category: true,
          subCategory: true,
          tags: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where: whereClause }),
    ]);

    const serializedDocs = await Promise.all(
      documents.map(async (doc) => {
        const serialized = {
          ...doc,
          fileSize: Number(doc.fileSize),
        };
        try {
          serialized.fileUrl = await this.storageService.generateDownloadUrl(doc.fileUrl);
        } catch {
          // Fallback
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
}

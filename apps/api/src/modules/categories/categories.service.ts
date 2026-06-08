import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        subCategories: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findBySlug(slug: string): Promise<any> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        subCategories: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    return category;
  }

  async findSubCategories(slug: string): Promise<any> {
    const category = await this.findBySlug(slug);
    return category.subCategories;
  }
}

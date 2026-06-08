import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active categories with subcategories' })
  @ApiResponse({ status: 200, description: 'List of categories retrieved successfully' })
  async findAll(): Promise<any> {
    const categories = await this.categoriesService.findAll();
    return categories;
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string): Promise<any> {
    const category = await this.categoriesService.findBySlug(slug);
    return category;
  }

  @Get(':slug/subcategories')
  @ApiOperation({ summary: 'Get subcategories for a category slug' })
  @ApiResponse({ status: 200, description: 'Subcategories retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findSubCategories(@Param('slug') slug: string): Promise<any> {
    const subCategories = await this.categoriesService.findSubCategories(slug);
    return subCategories;
  }
}

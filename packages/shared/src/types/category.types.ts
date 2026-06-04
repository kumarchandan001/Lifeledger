// ═══════════════════════════════════════════════════
// Category Types
// ═══════════════════════════════════════════════════

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
  subCategories?: SubCategory[];
  _count?: { documents: number };
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  metadataSchema: Record<string, unknown> | null;
  displayOrder: number;
}

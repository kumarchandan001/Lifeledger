'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import './categories.css';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  subCategories: SubCategory[];
  _count?: {
    documents: number;
  };
}

interface CategoriesSummary {
  categories: Category[];
  totalDocuments: number;
  totalStorageBytes: number;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [data, setData] = useState<CategoriesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        // Let's also get document stats to fill the header
        const docRes = await api.get('/documents', { params: { limit: 1 } });
        
        // Count total docs per category from the list if _count is returned or construct from response
        const categoriesData = res.data ?? [];
        
        setData({
          categories: categoriesData,
          totalDocuments: docRes.data?.total ?? 0,
          totalStorageBytes: categoriesData.reduce((acc: number, curr: any) => acc + (curr.totalSize ?? 0), 0)
        });
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="categories-page">
      {/* ─── Hero / Summary Section ─── */}
      <div className="categories-hero">
        <div className="categories-hero-content">
          <h1 className="categories-hero-title">Browse by Category</h1>
          <p className="categories-hero-desc">
            Organize, retrieve, and analyze your life documents by category. Click a category to view items or manage subcategories.
          </p>
        </div>
        <div className="categories-hero-stats">
          <div className="categories-stat-item">
            <span className="categories-stat-val" id="cat-total-docs">{data?.totalDocuments ?? 0}</span>
            <span className="categories-stat-lbl">Total Documents</span>
          </div>
          <div className="categories-stat-item" style={{ borderLeft: '1px solid hsl(var(--border))', paddingLeft: 24 }}>
            <span className="categories-stat-val" id="cat-total-storage">{formatStorage(data?.totalStorageBytes ?? 0)}</span>
            <span className="categories-stat-lbl">Storage Used</span>
          </div>
        </div>
      </div>

      {/* ─── Categories Grid ─── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : data?.categories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'hsl(var(--muted-foreground))' }}>
          No categories setup found.
        </div>
      ) : (
        <div className="categories-grid">
          {data?.categories.map((cat) => {
            const docCount = cat._count?.documents ?? 0;
            return (
              <div
                key={cat.id}
                className="category-card"
                style={{
                  '--cat-color': cat.color,
                  '--cat-color-light': `${cat.color}14`,
                  '--cat-header-bg': `${cat.color}0a`
                } as React.CSSProperties}
                onClick={() => router.push(`/dashboard/categories/${cat.slug}`)}
                id={`cat-card-${cat.slug}`}
              >
                <div className="category-card-header">
                  <div className="category-card-icon" style={{ color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="category-card-title-wrap">
                    <h3 className="category-card-title">{cat.name}</h3>
                    <p className="category-card-subtitle">{cat.description || 'Secure personal vault'}</p>
                  </div>
                </div>

                <div className="category-card-body">
                  <div className="category-subcategories-list">
                    {cat.subCategories.length === 0 ? (
                      <span className="category-sub-pill">No subcategories</span>
                    ) : (
                      cat.subCategories.map((sub) => (
                        <span
                          key={sub.id}
                          className="category-sub-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/categories/${cat.slug}?sub=${sub.slug}`);
                          }}
                        >
                          {sub.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="category-card-footer">
                  <span>
                    <strong>{docCount}</strong> {docCount === 1 ? 'document' : 'documents'}
                  </span>
                  <span className="category-arrow">View Files →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

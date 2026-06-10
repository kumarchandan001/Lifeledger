'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import '../categories.css';
import '../../documents/documents.css';

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
}

interface DocItem {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: string;
  isFavorite: boolean;
  isSensitive: boolean;
  issueDate: string | null;
  expiryDate: string | null;
  documentNumber: string | null;
  issuer: string | null;
  description: string | null;
  ocrStatus: string;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string; icon: string; color: string };
  subCategory?: { id: string; name: string; slug: string } | null;
  tags?: { id: string; tag: string; source: string }[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function CategoryDetailPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = use(params);

  // ─── State ───
  const [category, setCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedSubSlug, setSelectedSubSlug] = useState(searchParams.get('sub') || '');
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favFilter, setFavFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Drawer state
  const [drawerDoc, setDrawerDoc] = useState<DocItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Search debounce timer
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch Category Details ───
  useEffect(() => {
    const fetchCategory = async () => {
      setLoadingCategory(true);
      try {
        const res = await api.get('/categories');
        const current = (res.data ?? []).find((c: Category) => c.slug === slug);
        if (current) {
          setCategory(current);
          setSubCategories(current.subCategories ?? []);
        } else {
          toast.error('Category not found');
          router.push('/dashboard/categories');
        }
      } catch (err) {
        toast.error('Failed to load category details');
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategory();
  }, [slug, router]);

  // Sync subcategory URL query parameter
  useEffect(() => {
    const sub = searchParams.get('sub') || '';
    setSelectedSubSlug(sub);
  }, [searchParams]);

  // ─── Fetch Documents ───
  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const params: Record<string, string | number | boolean> = {
        categorySlug: slug,
        limit: 100, // retrieve all for simplicity on details view
      };
      if (selectedSubSlug) {
        // Find subcategory ID to filter precisely
        const sub = subCategories.find(s => s.slug === selectedSubSlug);
        if (sub) {
          params.subCategoryId = sub.id;
        }
      }
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (favFilter) params.isFavorite = true;

      const res = await api.get('/documents', { params });
      setDocs(res.data?.documents ?? []);
    } catch {
      // ignore silently
    } finally {
      setLoadingDocs(false);
    }
  }, [slug, selectedSubSlug, subCategories, search, statusFilter, favFilter]);

  useEffect(() => {
    if (category) {
      fetchDocs();
    }
  }, [category, selectedSubSlug, statusFilter, favFilter]);

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchDocs();
    }, 400);
  };

  // Subcategory toggle
  const handleSubCategorySelect = (subSlug: string) => {
    const nextSlug = selectedSubSlug === subSlug ? '' : subSlug;
    setSelectedSubSlug(nextSlug);
    
    // Update URL query parameter without full reload
    const newParams = new URLSearchParams(window.location.search);
    if (nextSlug) {
      newParams.set('sub', nextSlug);
    } else {
      newParams.delete('sub');
    }
    router.replace(`/dashboard/categories/${slug}?${newParams.toString()}`);
  };

  // Helper formatting
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return '🖼️';
    if (mime === 'application/pdf') return '📕';
    return '📄';
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const toggleFav = async (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.post(`/documents/${docId}/favorite`);
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, isFavorite: !d.isFavorite } : d));
      if (drawerDoc?.id === docId) {
        setDrawerDoc(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted');
      setDrawerDoc(null);
      fetchDocs();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openDrawer = async (doc: DocItem) => {
    setDrawerDoc(doc);
    setDrawerLoading(true);
    try {
      const res = await api.get(`/documents/${doc.id}`);
      setDrawerDoc(res.data);
    } catch {
      // keep existing data
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      const res = await api.get(`/documents/${docId}/download`);
      const url = res.data?.downloadUrl;
      if (url) window.open(url, '_blank');
    } catch {
      toast.error('Failed to generate download URL');
    }
  };

  if (loadingCategory) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="categories-page">
      {/* ─── Detail Header ─── */}
      <div
        className="category-detail-header"
        style={{ '--cat-color': category.color } as React.CSSProperties}
      >
        <div className="category-detail-title-area">
          <button className="category-detail-back" onClick={() => router.push('/dashboard/categories')}>
            ←
          </button>
          <div className="category-detail-icon">
            {category.icon}
          </div>
          <div className="category-detail-info">
            <h1 className="category-detail-title">{category.name}</h1>
            <p className="category-detail-subtitle">{category.description || 'Personal Secure Vault'}</p>
          </div>
        </div>
      </div>

      {/* ─── Subcategory Selectors ─── */}
      {subCategories.length > 0 && (
        <div className="subcategories-bar">
          {subCategories.map(sub => (
            <button
              key={sub.id}
              className={`filter-chip ${selectedSubSlug === sub.slug ? 'active' : ''}`}
              style={{
                '--primary': category.color,
                '--primary-foreground': '#fff'
              } as React.CSSProperties}
              onClick={() => handleSubCategorySelect(sub.slug)}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {/* ─── Filter & Search Toolbar ─── */}
      <div className="docs-toolbar">
        <div className="docs-search">
          <span className="docs-search-icon">🔍</span>
          <input
            type="text"
            placeholder={`Search in ${category.name}...`}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="docs-view-toggle">
          <button
            className={`docs-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >⊞</button>
          <button
            className={`docs-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >☰</button>
        </div>
      </div>

      <div className="docs-filters">
        <button
          className={`filter-chip ${!statusFilter && !favFilter ? 'active' : ''}`}
          onClick={() => { setStatusFilter(''); setFavFilter(false); }}
        >
          All Items
        </button>
        <button
          className={`filter-chip ${favFilter ? 'active' : ''}`}
          onClick={() => { setFavFilter(!favFilter); setStatusFilter(''); }}
        >
          ⭐ Favorites
        </button>
        {['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'ARCHIVED'].map(s => (
          <button
            key={s}
            className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setFavFilter(false); }}
          >
            {s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* ─── Document Content ─── */}
      {loadingDocs ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="docs-empty">
          <div className="docs-empty-icon">📂</div>
          <div className="docs-empty-title">No documents found</div>
          <div className="docs-empty-desc">
            {search || selectedSubSlug || statusFilter || favFilter
              ? 'Try adjusting your search criteria or subcategory filter.'
              : `You haven't uploaded any documents to ${category.name} yet.`}
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="docs-grid">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="doc-card"
                  style={{ '--card-accent': category.color } as React.CSSProperties}
                  onClick={() => openDrawer(doc)}
                  id={`doc-card-${doc.id}`}
                >
                  <div className="doc-card-header">
                    <div className="doc-card-icon" style={{ background: `${category.color}18`, color: category.color }}>
                      {category.icon}
                    </div>
                    <button
                      className={`doc-card-fav ${doc.isFavorite ? 'is-fav' : ''}`}
                      onClick={(e) => toggleFav(doc.id, e)}
                      aria-label="Toggle favorite"
                    >
                      {doc.isFavorite ? '⭐' : '☆'}
                    </button>
                  </div>
                  <div className="doc-card-title">{doc.title}</div>
                  <div className="doc-card-cat">
                    {doc.subCategory ? doc.subCategory.name : category.name}
                  </div>
                  <div className="doc-card-meta">
                    <span>{formatDate(doc.createdAt)}</span>
                    <span className={`doc-card-status doc-status-${doc.status.toLowerCase()}`}>
                      {doc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="docs-list">
              <div className="doc-list-header">
                <span>Name</span>
                <span>Subcategory</span>
                <span>Date</span>
                <span>Status</span>
                <span>Fav</span>
              </div>
              {docs.map(doc => (
                <div key={doc.id} className="doc-list-row" onClick={() => openDrawer(doc)} id={`doc-row-${doc.id}`}>
                  <div className="doc-list-name">
                    <span className="doc-list-name-icon" style={{ color: category.color }}>{category.icon}</span>
                    <div className="doc-list-name-text">
                      <div className="doc-list-name-title">{doc.title}</div>
                      <div className="doc-list-name-sub">{formatFileSize(doc.fileSize)}</div>
                    </div>
                  </div>
                  <div className="doc-list-cell">{doc.subCategory?.name ?? '—'}</div>
                  <div className="doc-list-cell">{formatDate(doc.createdAt)}</div>
                  <div className="doc-list-cell">
                    <span className={`doc-card-status doc-status-${doc.status.toLowerCase()}`}>
                      {doc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="doc-list-cell">
                    <button
                      className={`doc-list-fav ${doc.isFavorite ? 'is-fav' : ''}`}
                      onClick={(e) => toggleFav(doc.id, e)}
                      aria-label="Toggle favorite"
                    >
                      {doc.isFavorite ? '⭐' : '☆'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Drawer Component ─── */}
      {drawerDoc && (
        <>
          <div className="doc-drawer-overlay" onClick={() => setDrawerDoc(null)} />
          <div className="doc-drawer">
            <div className="drawer-header">
              <span className="drawer-title">{drawerDoc.title}</span>
              <button className="drawer-close" onClick={() => setDrawerDoc(null)} aria-label="Close drawer">×</button>
            </div>

            <div className="drawer-body">
              {/* Preview */}
              <div className="drawer-preview">
                {drawerDoc.fileUrl && drawerDoc.mimeType.startsWith('image/') ? (
                  <img src={drawerDoc.fileUrl} alt={drawerDoc.title} />
                ) : drawerDoc.fileUrl && drawerDoc.mimeType === 'application/pdf' ? (
                  <iframe src={drawerDoc.fileUrl} title={drawerDoc.title} />
                ) : (
                  <div className="drawer-preview-placeholder">
                    <div className="drawer-preview-placeholder-icon">{getFileIcon(drawerDoc.mimeType)}</div>
                    <div>Preview not available for this file type</div>
                  </div>
                )}
              </div>

              {/* Info details */}
              <div className="drawer-section">
                <div className="drawer-section-title">Document Details</div>
                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Category</span>
                    <span className="drawer-meta-value">{category.icon} {category.name}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Subcategory</span>
                    <span className="drawer-meta-value">{drawerDoc.subCategory?.name ?? '—'}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Status</span>
                    <span className="drawer-meta-value">
                      <span className={`doc-card-status doc-status-${drawerDoc.status.toLowerCase()}`}>
                        {drawerDoc.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">File Size</span>
                    <span className="drawer-meta-value">{formatFileSize(drawerDoc.fileSize)}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Issue Date</span>
                    <span className="drawer-meta-value">{formatDate(drawerDoc.issueDate)}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Expiry Date</span>
                    <span className="drawer-meta-value">{formatDate(drawerDoc.expiryDate)}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Document #</span>
                    <span className="drawer-meta-value">{drawerDoc.documentNumber ?? '—'}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Issuer</span>
                    <span className="drawer-meta-value">{drawerDoc.issuer ?? '—'}</span>
                  </div>
                </div>
              </div>

              {drawerDoc.description && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Description</div>
                  <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0 }}>
                    {drawerDoc.description}
                  </p>
                </div>
              )}

              {drawerDoc.aiSummary && (
                <div className="drawer-section">
                  <div className="drawer-section-title">AI Summary</div>
                  <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                    {drawerDoc.aiSummary}
                  </p>
                </div>
              )}

              {drawerDoc.tags && drawerDoc.tags.length > 0 && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Tags</div>
                  <div className="drawer-tags">
                    {drawerDoc.tags.map(t => (
                      <span key={t.id} className="drawer-tag">#{t.tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-actions">
              <button className="drawer-action-btn" onClick={() => handleDownload(drawerDoc.id)}>
                ⬇ Download
              </button>
              <button className="drawer-action-btn" onClick={() => toggleFav(drawerDoc.id)}>
                {drawerDoc.isFavorite ? '★ Unfavorite' : '☆ Favorite'}
              </button>
              <button
                className="drawer-action-btn primary"
                onClick={() => router.push(`/dashboard/intelligence/${drawerDoc.id}`)}
              >
                🧠 AI Analyze
              </button>
              <button className="drawer-action-btn danger" onClick={() => handleDelete(drawerDoc.id)}>
                🗑 Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

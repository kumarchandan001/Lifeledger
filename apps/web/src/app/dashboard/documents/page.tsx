'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CATEGORIES, FILE_LIMITS } from '@lifeledger/shared';
import './documents.css';

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

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  subCategories: { id: string; name: string; slug: string }[];
}

type ViewMode = 'grid' | 'list';

export default function DocumentsPage() {
  const router = useRouter();

  // ─── State ───
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [favFilter, setFavFilter] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const limit = 20;

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<'file' | 'meta'>('file');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form fields
  const [uTitle, setUTitle] = useState('');
  const [uCategoryId, setUCategoryId] = useState('');
  const [uSubCategoryId, setUSubCategoryId] = useState('');
  const [uDescription, setUDescription] = useState('');
  const [uIssueDate, setUIssueDate] = useState('');
  const [uExpiryDate, setUExpiryDate] = useState('');
  const [uDocNumber, setUDocNumber] = useState('');
  const [uIssuer, setUIssuer] = useState('');
  const [uTags, setUTags] = useState('');

  // Categories for selectors
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Drawer state
  const [drawerDoc, setDrawerDoc] = useState<DocItem | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Search debounce
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Fetch categories ───
  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.data ?? []);
    }).catch(() => {});
  }, []);

  // ─── Fetch documents ───
  const fetchDocs = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: p,
        limit,
        sortBy,
        sortOrder,
      };
      if (search) params.search = search;
      if (categorySlug) params.categorySlug = categorySlug;
      if (statusFilter) params.status = statusFilter;
      if (favFilter) params.isFavorite = true;

      const res = await api.get('/documents', { params });
      setDocs(res.data?.documents ?? []);
      setTotal(res.data?.total ?? 0);
      setPage(p);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, categorySlug, statusFilter, sortBy, sortOrder, favFilter]);

  useEffect(() => {
    fetchDocs(1);
  }, [categorySlug, statusFilter, sortBy, sortOrder, favFilter]);

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchDocs(1);
    }, 400);
  };

  // ─── File helpers ───
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

  // ─── Upload flow ───
  const onFilePick = (file: File) => {
    const allowed = FILE_LIMITS.ALLOWED_MIME_TYPES as readonly string[];
    if (!allowed.includes(file.type)) {
      toast.error('File type not supported');
      return;
    }
    if (file.size > FILE_LIMITS.MAX_FILE_SIZE_BYTES) {
      toast.error(`File must be under ${FILE_LIMITS.MAX_FILE_SIZE_LABEL}`);
      return;
    }
    setUploadFile(file);
    setUTitle(file.name.replace(/\.[^.]+$/, ''));
    setUploadStep('meta');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFilePick(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const resetUpload = () => {
    setShowUpload(false);
    setUploadFile(null);
    setUploadStep('file');
    setUploadProgress(0);
    setUploading(false);
    setUTitle('');
    setUCategoryId('');
    setUSubCategoryId('');
    setUDescription('');
    setUIssueDate('');
    setUExpiryDate('');
    setUDocNumber('');
    setUIssuer('');
    setUTags('');
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uTitle.trim() || !uCategoryId) {
      toast.error('Please fill in title and category');
      return;
    }

    setUploading(true);
    setUploadProgress(5);

    try {
      // Step 1: Get presigned upload URL
      const urlRes = await api.post('/documents/upload-url', {
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        fileSize: uploadFile.size,
      });

      const { uploadUrl, documentId, fields } = urlRes.data;
      setUploadProgress(20);

      // Step 2: Upload file to Cloudinary
      const formData = new FormData();
      if (fields) {
        Object.entries(fields).forEach(([k, v]) => {
          formData.append(k, v as string);
        });
      }
      formData.append('file', uploadFile);

      await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(70);

      // Step 3: Register document with backend
      const tagsArr = uTags.split(',').map(t => t.trim()).filter(t => t.length > 0);

      await api.post('/documents', {
        categoryId: uCategoryId,
        subCategoryId: uSubCategoryId || undefined,
        title: uTitle.trim(),
        description: uDescription.trim() || undefined,
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        fileSize: uploadFile.size,
        issueDate: uIssueDate ? new Date(uIssueDate).toISOString() : undefined,
        expiryDate: uExpiryDate ? new Date(uExpiryDate).toISOString() : undefined,
        documentNumber: uDocNumber.trim() || undefined,
        issuer: uIssuer.trim() || undefined,
        tags: tagsArr.length > 0 ? tagsArr : undefined,
      });

      setUploadProgress(100);
      toast.success('Document uploaded successfully!');

      setTimeout(() => {
        resetUpload();
        fetchDocs(1);
      }, 500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
      setUploadProgress(0);
      setUploading(false);
    }
  };

  // ─── Toggle favorite ───
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

  // ─── Soft delete ───
  const handleDelete = async (docId: string) => {
    if (!confirm('Move this document to trash?')) return;
    try {
      await api.delete(`/documents/${docId}`);
      toast.success('Document deleted');
      setDrawerDoc(null);
      fetchDocs(page);
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ─── Open drawer ───
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

  // ─── Download ───
  const handleDownload = async (docId: string) => {
    try {
      const res = await api.get(`/documents/${docId}/download`);
      const url = res.data?.downloadUrl;
      if (url) window.open(url, '_blank');
    } catch {
      toast.error('Failed to generate download URL');
    }
  };

  // ─── Derived ───
  const selectedCat = categories.find(c => c.id === uCategoryId);
  const totalPages = Math.ceil(total / limit);

  const isImageMime = (mime: string) => mime.startsWith('image/');
  const isPdfMime = (mime: string) => mime === 'application/pdf';

  return (
    <div className="documents-page">
      {/* ─── Toolbar ─── */}
      <div className="docs-toolbar">
        <div className="docs-search">
          <span className="docs-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            id="docs-search-input"
          />
        </div>

        <select
          className="docs-select"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          id="docs-category-filter"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>
          ))}
        </select>

        <select
          className="docs-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          id="docs-sort-select"
        >
          <option value="createdAt">Date Added</option>
          <option value="updatedAt">Last Modified</option>
          <option value="title">Title</option>
          <option value="expiryDate">Expiry Date</option>
        </select>

        <div className="docs-view-toggle">
          <button
            className={`docs-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            id="docs-view-grid"
          >⊞</button>
          <button
            className={`docs-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
            id="docs-view-list"
          >☰</button>
        </div>

        <button className="docs-upload-btn" onClick={() => setShowUpload(true)} id="docs-upload-btn">
          ＋ Upload
        </button>
      </div>

      {/* ─── Filter Chips ─── */}
      <div className="docs-filters">
        <button
          className={`filter-chip ${!statusFilter && !favFilter ? 'active' : ''}`}
          onClick={() => { setStatusFilter(''); setFavFilter(false); }}
        >
          All
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
            {s === 'ACTIVE' && '✅ '}
            {s === 'EXPIRING_SOON' && '⚠️ '}
            {s === 'EXPIRED' && '🚨 '}
            {s === 'ARCHIVED' && '📦 '}
            {s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : docs.length === 0 ? (
        <div className="docs-empty">
          <div className="docs-empty-icon">📄</div>
          <div className="docs-empty-title">
            {search || categorySlug || statusFilter || favFilter ? 'No documents match your filters' : 'No documents yet'}
          </div>
          <div className="docs-empty-desc">
            {search || categorySlug || statusFilter || favFilter
              ? 'Try adjusting your search or filters.'
              : 'Upload your first document to get started with LifeLedger.'}
          </div>
          {!search && !categorySlug && !statusFilter && !favFilter && (
            <button className="docs-upload-btn" onClick={() => setShowUpload(true)}>
              ＋ Upload Document
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="docs-grid">
              {docs.map(doc => (
                <div
                  key={doc.id}
                  className="doc-card"
                  style={{ '--card-accent': doc.category?.color ?? 'hsl(var(--primary))' } as React.CSSProperties}
                  onClick={() => openDrawer(doc)}
                  id={`doc-card-${doc.id}`}
                >
                  <div className="doc-card-header">
                    <div className="doc-card-icon" style={{ background: `${doc.category?.color ?? '#6366f1'}18` }}>
                      {doc.category?.icon ?? '📄'}
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
                    {doc.category?.name ?? 'Uncategorized'}
                    {doc.subCategory ? ` · ${doc.subCategory.name}` : ''}
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

          {/* List View */}
          {viewMode === 'list' && (
            <div className="docs-list">
              <div className="doc-list-header">
                <span>Name</span>
                <span>Category</span>
                <span>Date</span>
                <span>Status</span>
                <span>Fav</span>
              </div>
              {docs.map(doc => (
                <div key={doc.id} className="doc-list-row" onClick={() => openDrawer(doc)} id={`doc-row-${doc.id}`}>
                  <div className="doc-list-name">
                    <span className="doc-list-name-icon">{doc.category?.icon ?? '📄'}</span>
                    <div className="doc-list-name-text">
                      <div className="doc-list-name-title">{doc.title}</div>
                      <div className="doc-list-name-sub">{formatFileSize(doc.fileSize)}</div>
                    </div>
                  </div>
                  <div className="doc-list-cell">{doc.category?.name ?? '—'}</div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="docs-pagination">
              <button disabled={page <= 1} onClick={() => fetchDocs(page - 1)}>← Prev</button>
              <span className="docs-pagination-info">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => fetchDocs(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ═══ Upload Modal ═══ */}
      {showUpload && (
        <div className="upload-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetUpload(); }}>
          <div className="upload-modal">
            <div className="upload-modal-header">
              <span className="upload-modal-title">
                {uploadStep === 'file' ? '📤 Upload Document' : '📝 Document Details'}
              </span>
              <button className="upload-modal-close" onClick={resetUpload} aria-label="Close">×</button>
            </div>

            <div className="upload-modal-body">
              {uploadStep === 'file' && (
                <>
                  <div
                    className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    id="upload-dropzone"
                  >
                    <div className="upload-dropzone-icon">📁</div>
                    <div className="upload-dropzone-title">Drop your file here</div>
                    <div className="upload-dropzone-desc">
                      or <span className="upload-dropzone-browse">browse</span> to choose a file
                    </div>
                    <div className="upload-dropzone-desc" style={{ marginTop: 8 }}>
                      Supports PDF, images, and documents up to {FILE_LIMITS.MAX_FILE_SIZE_LABEL}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={[...FILE_LIMITS.ALLOWED_MIME_TYPES].join(',')}
                    style={{ display: 'none' }}
                    onChange={(e) => { if (e.target.files?.[0]) onFilePick(e.target.files[0]); }}
                  />
                </>
              )}

              {uploadStep === 'meta' && uploadFile && (
                <>
                  {/* File preview row */}
                  <div className="upload-file-info">
                    <span className="upload-file-icon">{getFileIcon(uploadFile.type)}</span>
                    <div className="upload-file-details">
                      <div className="upload-file-name">{uploadFile.name}</div>
                      <div className="upload-file-size">{formatFileSize(uploadFile.size)}</div>
                    </div>
                    <button className="upload-file-remove" onClick={() => { setUploadFile(null); setUploadStep('file'); }} aria-label="Remove">✕</button>
                  </div>

                  {/* Progress */}
                  {uploading && (
                    <div className="upload-progress">
                      <div className="upload-progress-bar-bg">
                        <div className="upload-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <div className="upload-progress-text">
                        {uploadProgress < 20 ? 'Preparing upload...'
                          : uploadProgress < 70 ? 'Uploading file...'
                          : uploadProgress < 100 ? 'Saving metadata...'
                          : '✅ Complete!'}
                      </div>
                    </div>
                  )}

                  {/* Metadata form */}
                  {!uploading && (
                    <div className="upload-form">
                      <div className="upload-form-field">
                        <label className="upload-form-label">Title *</label>
                        <input className="upload-form-input" value={uTitle} onChange={e => setUTitle(e.target.value)} id="upload-title" />
                      </div>

                      <div className="upload-form-row">
                        <div className="upload-form-field">
                          <label className="upload-form-label">Category *</label>
                          <select
                            className="upload-form-input"
                            value={uCategoryId}
                            onChange={e => { setUCategoryId(e.target.value); setUSubCategoryId(''); }}
                            id="upload-category"
                          >
                            <option value="">Select Category</option>
                            {categories.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="upload-form-field">
                          <label className="upload-form-label">Subcategory</label>
                          <select
                            className="upload-form-input"
                            value={uSubCategoryId}
                            onChange={e => setUSubCategoryId(e.target.value)}
                            disabled={!selectedCat}
                            id="upload-subcategory"
                          >
                            <option value="">Select Subcategory</option>
                            {selectedCat?.subCategories.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="upload-form-field">
                        <label className="upload-form-label">Description</label>
                        <input className="upload-form-input" value={uDescription} onChange={e => setUDescription(e.target.value)} placeholder="Optional description" />
                      </div>

                      <div className="upload-form-row">
                        <div className="upload-form-field">
                          <label className="upload-form-label">Issue Date</label>
                          <input type="date" className="upload-form-input" value={uIssueDate} onChange={e => setUIssueDate(e.target.value)} />
                        </div>
                        <div className="upload-form-field">
                          <label className="upload-form-label">Expiry Date</label>
                          <input type="date" className="upload-form-input" value={uExpiryDate} onChange={e => setUExpiryDate(e.target.value)} />
                        </div>
                      </div>

                      <div className="upload-form-row">
                        <div className="upload-form-field">
                          <label className="upload-form-label">Document Number</label>
                          <input className="upload-form-input" value={uDocNumber} onChange={e => setUDocNumber(e.target.value)} placeholder="e.g. ABCD1234" />
                        </div>
                        <div className="upload-form-field">
                          <label className="upload-form-label">Issuer</label>
                          <input className="upload-form-input" value={uIssuer} onChange={e => setUIssuer(e.target.value)} placeholder="e.g. Govt of India" />
                        </div>
                      </div>

                      <div className="upload-form-field">
                        <label className="upload-form-label">Tags (comma separated)</label>
                        <input className="upload-form-input" value={uTags} onChange={e => setUTags(e.target.value)} placeholder="e.g. passport, travel, id" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {uploadStep === 'meta' && !uploading && (
              <div className="upload-modal-footer">
                <button className="upload-btn-cancel" onClick={resetUpload}>Cancel</button>
                <button
                  className="upload-btn-submit"
                  onClick={handleUploadSubmit}
                  disabled={!uTitle.trim() || !uCategoryId}
                  id="upload-submit-btn"
                >
                  Upload Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Document Drawer ═══ */}
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
                {drawerDoc.fileUrl && isImageMime(drawerDoc.mimeType) ? (
                  <img src={drawerDoc.fileUrl} alt={drawerDoc.title} />
                ) : drawerDoc.fileUrl && isPdfMime(drawerDoc.mimeType) ? (
                  <iframe src={drawerDoc.fileUrl} title={drawerDoc.title} />
                ) : (
                  <div className="drawer-preview-placeholder">
                    <div className="drawer-preview-placeholder-icon">{getFileIcon(drawerDoc.mimeType)}</div>
                    <div>Preview not available for this file type</div>
                  </div>
                )}
              </div>

              {/* Info section */}
              <div className="drawer-section">
                <div className="drawer-section-title">Document Details</div>
                <div className="drawer-meta-grid">
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Category</span>
                    <span className="drawer-meta-value">{drawerDoc.category?.icon} {drawerDoc.category?.name ?? '—'}</span>
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
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">Added</span>
                    <span className="drawer-meta-value">{formatDate(drawerDoc.createdAt)}</span>
                  </div>
                  <div className="drawer-meta-item">
                    <span className="drawer-meta-label">OCR Status</span>
                    <span className="drawer-meta-value">{drawerDoc.ocrStatus}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {drawerDoc.description && (
                <div className="drawer-section">
                  <div className="drawer-section-title">Description</div>
                  <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0 }}>
                    {drawerDoc.description}
                  </p>
                </div>
              )}

              {/* AI Summary */}
              {drawerDoc.aiSummary && (
                <div className="drawer-section">
                  <div className="drawer-section-title">AI Summary</div>
                  <p style={{ fontSize: 13, color: 'hsl(var(--foreground))', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                    {drawerDoc.aiSummary}
                  </p>
                </div>
              )}

              {/* Tags */}
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

            {/* Actions */}
            <div className="drawer-actions">
              <button className="drawer-action-btn" onClick={() => handleDownload(drawerDoc.id)} id="drawer-download">
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
              <button className="drawer-action-btn danger" onClick={() => handleDelete(drawerDoc.id)} id="drawer-delete">
                🗑 Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

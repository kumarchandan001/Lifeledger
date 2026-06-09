'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  CATEGORIES,
  SUB_CATEGORIES,
  AI_CONFIDENCE_THRESHOLDS,
} from '@lifeledger/shared';
import './document-intelligence.css';

interface PageProps {
  params: Promise<{ documentId: string }>;
}

export default function DocumentIntelligenceDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { documentId } = use(params);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API Data
  const [documentData, setDocumentData] = useState<any>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [processingJobs, setProcessingJobs] = useState<any[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  // Form State (for edits / review)
  const [applyCategory, setApplyCategory] = useState(true);
  const [applyMetadata, setApplyMetadata] = useState(true);
  const [applyTags, setApplyTags] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [metadataTitle, setMetadataTitle] = useState('');
  const [metadataDesc, setMetadataDesc] = useState('');
  const [metadataDocNo, setMetadataDocNo] = useState('');
  const [metadataIssuer, setMetadataIssuer] = useState('');
  const [metadataIssueDate, setMetadataIssueDate] = useState('');
  const [metadataExpiryDate, setMetadataExpiryDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  // UI state
  const [showOcrText, setShowOcrText] = useState(false);

  // Format date helper for YYYY-MM-DD input
  const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0] || '';
    } catch {
      return '';
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get(`/documents/${documentId}/processing-status`);
      const data = res.data;
      if (data) {
        setDocumentData(data.document);
        setOcrResult(data.ocrResult);
        setAiAnalysis(data.aiAnalysis);
        setProcessingJobs(data.processingJobs ?? []);
        setProcessingStatus(data.processingStatus);

        // Populate forms if AI suggestions exist and we haven't populated yet
        if (data.aiAnalysis && !selectedCategory) {
          const analysis = data.aiAnalysis;
          setSelectedCategory(analysis.suggestedCategory || '');
          setSelectedSubCategory(analysis.suggestedSubCategory || '');
          
          const meta = analysis.extractedMetadata || {};
          setMetadataTitle(meta.title || data.document.title || '');
          setMetadataDesc(meta.description || '');
          setMetadataDocNo(meta.documentNumber || '');
          setMetadataIssuer(meta.issuer || '');
          setMetadataIssueDate(formatDateForInput(meta.issueDate));
          setMetadataExpiryDate(formatDateForInput(meta.expiryDate));
          
          if (Array.isArray(analysis.generatedTags)) {
            setTagsInput(analysis.generatedTags.join(', '));
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load status', err);
      setError(err?.response?.data?.message || 'Failed to load document status');
    } finally {
      setLoading(false);
    }
  }, [documentId, selectedCategory]);

  useEffect(() => {
    fetchStatus();

    // If job is pending or processing, poll every 5 seconds
    let interval: NodeJS.Timeout | null = null;
    if (processingStatus === 'QUEUED' || processingStatus === 'PROCESSING') {
      interval = setInterval(fetchStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus, processingStatus]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      // Split tags by comma and trim
      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dbCategory = CATEGORIES.find((c) => c.slug === selectedCategory);
      const categoryIdOverride = dbCategory ? dbCategory.slug : undefined; // Backend will look up by slug in DTO or we pass slug. Let's make sure it handles category

      const payload = {
        applyCategory,
        applyMetadata,
        applyTags,
        reviewNotes: reviewNotes.trim() || undefined,
        overrides: {
          title: metadataTitle || undefined,
          description: metadataDesc || undefined,
          documentNumber: metadataDocNo || null,
          issuer: metadataIssuer || null,
          issueDate: metadataIssueDate ? new Date(metadataIssueDate).toISOString() : null,
          expiryDate: metadataExpiryDate ? new Date(metadataExpiryDate).toISOString() : null,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        },
      };

      await api.post(`/documents/${documentId}/ai-analysis/approve`, payload);
      toast.success('AI suggestions approved and document updated successfully!');
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to approve suggestions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject the AI suggestions?')) return;
    setSubmitting(true);
    try {
      await api.post(`/documents/${documentId}/ai-analysis/reject`, {
        reviewNotes: reviewNotes.trim() || undefined,
      });
      toast.success('AI suggestions rejected.');
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject suggestions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprocess = async () => {
    setSubmitting(true);
    try {
      await api.post(`/documents/${documentId}/reprocess`);
      toast.success('Document reprocessing queued!');
      setProcessingStatus('QUEUED');
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to trigger reprocessing');
    } finally {
      setSubmitting(false);
    }
  };

  // Confidence Bar Helpers
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH) return { label: 'High', color: '#10b981', class: 'confidence-high' };
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.MEDIUM) return { label: 'Medium', color: '#f59e0b', class: 'confidence-medium' };
    return { label: 'Low', color: '#ef4444', class: 'confidence-low' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="loading-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !documentData) {
    return (
      <div className="error-container" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ color: 'hsl(var(--destructive))' }}>Error Loading Document</h3>
        <p>{error || 'Document not found'}</p>
        <button className="btn-process btn-outline" style={{ marginTop: '12px' }} onClick={() => router.push('/dashboard/intelligence')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const confidence = aiAnalysis?.categoryConfidence ?? 0;
  const confidenceLevel = getConfidenceLevel(confidence);

  return (
    <div className="doc-intelligence">
      {/* ─── Back Link ─── */}
      <div>
        <button className="back-link" onClick={() => router.push('/dashboard/intelligence')}>
          ← Back to Intelligence Dashboard
        </button>
      </div>

      {/* ─── Document Header ─── */}
      <div className="doc-header">
        <div className="doc-header-info">
          <div className="doc-header-icon">
            {CATEGORIES.find((c) => c.slug === (aiAnalysis?.suggestedCategory || selectedCategory))?.icon || '📄'}
          </div>
          <div>
            <div className="doc-header-title">{documentData.title}</div>
            <div className="doc-header-sub">
              Uploaded on {new Date(documentData.createdAt).toLocaleDateString('en-IN')} • Type: {documentData.mimeType}
            </div>
          </div>
        </div>
        <div className="doc-header-actions">
          <button 
            className="btn-process btn-outline" 
            onClick={() => router.push(`/dashboard/documents/${documentId}`)}
            style={{ padding: '8px 16px', fontSize: 13, borderRadius: 6, cursor: 'pointer', background: 'none', border: '1px solid hsl(var(--border))' }}
          >
            View Original Document
          </button>
          {(processingStatus === 'COMPLETED' || processingStatus === 'FAILED') && (
            <button 
              className="btn-process btn-primary" 
              onClick={handleReprocess} 
              disabled={submitting}
              style={{ padding: '8px 16px', fontSize: 13, color: '#fff', background: '#3b82f6', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              Reprocess Document
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Two Columns ─── */}
      <div className="doc-columns">
        
        {/* Left Column: OCR and Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OCR Result Card */}
          <div className="intel-card">
            <div className="intel-card-header">
              <span className="intel-card-title">🔍 OCR Extracted Text</span>
              <button 
                className="btn-process btn-outline btn-sm" 
                onClick={() => setShowOcrText(!showOcrText)}
                style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
              >
                {showOcrText ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="intel-card-body">
              {ocrResult ? (
                <>
                  <div className="ocr-stats">
                    <div className="ocr-stat">
                      <span className="ocr-stat-label">Confidence</span>
                      <span className="ocr-stat-value">{ocrResult.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="ocr-stat">
                      <span className="ocr-stat-label">Pages</span>
                      <span className="ocr-stat-value">{ocrResult.pageCount}</span>
                    </div>
                    <div className="ocr-stat">
                      <span className="ocr-stat-label">Language</span>
                      <span className="ocr-stat-value">{ocrResult.language.toUpperCase()}</span>
                    </div>
                  </div>
                  {showOcrText ? (
                    <div className="ocr-text-container">
                      {ocrResult.extractedText || 'No text extracted.'}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                      Click Show to view {ocrResult.extractedText?.length || 0} characters of extracted text.
                    </p>
                  )}
                </>
              ) : (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                  {processingStatus === 'QUEUED' || processingStatus === 'PROCESSING' 
                    ? 'OCR processing is in progress...' 
                    : 'No OCR results available for this document.'}
                </div>
              )}
            </div>
          </div>

          {/* Processing Timeline Card */}
          <div className="intel-card">
            <div className="intel-card-header">
              <span className="intel-card-title">⏳ Pipeline Timeline</span>
            </div>
            <div className="intel-card-body">
              <div className="timeline">
                {processingJobs.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>No jobs run yet.</p>
                ) : (
                  processingJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className={`timeline-item ${job.status === 'COMPLETED' ? 'completed' : job.status === 'FAILED' ? 'failed' : 'processing'}`}
                    >
                      <div className="timeline-title">{job.type.replace(/_/g, ' ')}</div>
                      <div className="timeline-meta">
                        Status: <strong style={{ textTransform: 'capitalize' }}>{job.status.toLowerCase()}</strong>
                        {job.completedAt && ` • Done: ${formatDate(job.completedAt)}`}
                        {job.error && (
                          <div style={{ color: 'hsl(var(--destructive))', marginTop: '4px', fontSize: 11 }}>
                            Error: {job.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis & Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI Suggestions Card */}
          <div className="intel-card">
            <div className="intel-card-header">
              <span className="intel-card-title">🧠 AI Suggestions & Classification</span>
              {aiAnalysis && (
                <span className={`tag-pill ${confidenceLevel.class}`} style={{ fontSize: 12 }}>
                  {confidenceLevel.label} ({Math.round(confidence)}%)
                </span>
              )}
            </div>
            <div className="intel-card-body">
              {aiAnalysis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Confidence meter */}
                  <div className="confidence-meter">
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--muted-foreground))', minWidth: '70px' }}>Confidence:</span>
                    <div className="confidence-bar-bg">
                      <div className="confidence-bar-fill" style={{ width: `${confidence}%`, backgroundColor: confidenceLevel.color }} />
                    </div>
                    <span className="confidence-label" style={{ color: confidenceLevel.color }}>{Math.round(confidence)}%</span>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid hsl(var(--border) / 0.5)' }} />

                  {/* Suggestions Form */}
                  <div className="metadata-grid">
                    
                    {/* Category Selection */}
                    <div className="metadata-field">
                      <label className="metadata-label">
                        <input 
                          type="checkbox" 
                          checked={applyCategory} 
                          onChange={(e) => setApplyCategory(e.target.checked)} 
                          style={{ marginRight: 6 }} 
                        />
                        Category
                      </label>
                      <select 
                        className="metadata-input" 
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setSelectedSubCategory('');
                        }}
                      >
                        <option value="">Select Category</option>
                        {CATEGORIES.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory Selection */}
                    <div className="metadata-field">
                      <label className="metadata-label">Subcategory</label>
                      <select 
                        className="metadata-input" 
                        value={selectedSubCategory}
                        disabled={!selectedCategory}
                        onChange={(e) => setSelectedSubCategory(e.target.value)}
                      >
                        <option value="">Select Subcategory</option>
                        {selectedCategory && (SUB_CATEGORIES[selectedCategory as keyof typeof SUB_CATEGORIES] || []).map((s) => (
                          <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Metadata Fields */}
                    <div className="metadata-field full-width">
                      <label className="metadata-label">
                        <input 
                          type="checkbox" 
                          checked={applyMetadata} 
                          onChange={(e) => setApplyMetadata(e.target.checked)} 
                          style={{ marginRight: 6 }} 
                        />
                        Document Title
                      </label>
                      <input 
                        type="text" 
                        className="metadata-input" 
                        value={metadataTitle} 
                        onChange={(e) => setMetadataTitle(e.target.value)} 
                      />
                    </div>

                    <div className="metadata-field full-width">
                      <label className="metadata-label">AI Description / Summary</label>
                      <textarea 
                        className="metadata-input" 
                        style={{ minHeight: '60px', resize: 'vertical' }}
                        value={metadataDesc} 
                        onChange={(e) => setMetadataDesc(e.target.value)} 
                      />
                    </div>

                    <div className="metadata-field">
                      <label className="metadata-label">Document Number</label>
                      <input 
                        type="text" 
                        className="metadata-input" 
                        value={metadataDocNo} 
                        onChange={(e) => setMetadataDocNo(e.target.value)} 
                      />
                    </div>

                    <div className="metadata-field">
                      <label className="metadata-label">Issuer</label>
                      <input 
                        type="text" 
                        className="metadata-input" 
                        value={metadataIssuer} 
                        onChange={(e) => setMetadataIssuer(e.target.value)} 
                      />
                    </div>

                    <div className="metadata-field">
                      <label className="metadata-label">Issue Date</label>
                      <input 
                        type="date" 
                        className="metadata-input" 
                        value={metadataIssueDate} 
                        onChange={(e) => setMetadataIssueDate(e.target.value)} 
                      />
                    </div>

                    <div className="metadata-field">
                      <label className="metadata-label">Expiry Date</label>
                      <input 
                        type="date" 
                        className="metadata-input" 
                        value={metadataExpiryDate} 
                        onChange={(e) => setMetadataExpiryDate(e.target.value)} 
                      />
                    </div>

                    {/* Tags */}
                    <div className="metadata-field full-width">
                      <label className="metadata-label">
                        <input 
                          type="checkbox" 
                          checked={applyTags} 
                          onChange={(e) => setApplyTags(e.target.checked)} 
                          style={{ marginRight: 6 }} 
                        />
                        Tags (comma separated)
                      </label>
                      <input 
                        type="text" 
                        className="metadata-input" 
                        value={tagsInput} 
                        onChange={(e) => setTagsInput(e.target.value)} 
                      />
                      <div className="tags-container" style={{ marginTop: '8px' }}>
                        {tagsInput.split(',').map((t) => t.trim()).filter((t) => t.length > 0).map((t, idx) => (
                          <span key={idx} className="tag-pill ai">#{t}</span>
                        ))}
                      </div>
                    </div>

                    {/* Review Notes */}
                    <div className="metadata-field full-width" style={{ marginTop: '10px' }}>
                      <label className="metadata-label">Review / Audit Notes (Optional)</label>
                      <input 
                        type="text" 
                        className="metadata-input" 
                        placeholder="Add reason for modifications or approval notes"
                        value={reviewNotes} 
                        onChange={(e) => setReviewNotes(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Actions bar inside right column */}
                  {aiAnalysis.status !== 'APPROVED' && aiAnalysis.status !== 'REJECTED' && (
                    <div className="review-action-bar" style={{ marginTop: '16px' }}>
                      <div className="review-action-info">
                        <span className="review-action-title">Awaiting Your Review</span>
                        <span className="review-action-desc">Verify AI values and apply to document</span>
                      </div>
                      <div className="review-action-btns">
                        <button 
                          className="btn-process btn-outline" 
                          onClick={handleReject} 
                          disabled={submitting}
                          style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: 6, border: '1px solid hsl(var(--border))' }}
                        >
                          Reject
                        </button>
                        <button 
                          className="btn-process btn-primary" 
                          onClick={handleApprove} 
                          disabled={submitting}
                          style={{ cursor: 'pointer', padding: '8px 16px', color: '#fff', background: '#10b981', border: 'none', borderRadius: 6 }}
                        >
                          {submitting ? 'Applying...' : 'Approve & Apply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {aiAnalysis.status === 'APPROVED' && (
                    <div style={{ padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: 13, textAlign: 'center' }}>
                      ✓ AI Suggestions have been approved and applied to this document.
                    </div>
                  )}

                  {aiAnalysis.status === 'REJECTED' && (
                    <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: 13, textAlign: 'center' }}>
                      ✗ AI Suggestions were rejected.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                  {processingStatus === 'QUEUED' || processingStatus === 'PROCESSING' 
                    ? 'AI analysis is running in the background...' 
                    : 'No AI analysis result available.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

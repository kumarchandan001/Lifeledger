'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type {
  ProcessingStatusSummary,
  ProcessingJobResponse,
  ReviewQueueItem,
} from '@lifeledger/shared';
import {
  PROCESSING_STATUS_COLORS,
  AI_CONFIDENCE_THRESHOLDS,
  AI_ANALYSIS_STATUS_COLORS,
} from '@lifeledger/shared';
import './intelligence.css';

type TabType = 'overview' | 'jobs' | 'review';

export default function IntelligencePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  // Overview data
  const [summary, setSummary] = useState<ProcessingStatusSummary>({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    needsReview: 0,
    totalProcessed: 0,
  });

  // Jobs data
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);

  // Review queue
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/processing/status');
      setSummary(res.data ?? { queued: 0, processing: 0, completed: 0, failed: 0, needsReview: 0, totalProcessed: 0 });
    } catch {
      // silently ignore
    }
  }, []);

  const fetchJobs = useCallback(async (page = 1) => {
    try {
      const res = await api.get('/processing/jobs', { params: { page, limit: 10, sortOrder: 'desc' } });
      setJobs(res.data?.jobs ?? []);
      setJobsTotal(res.data?.total ?? 0);
      setJobsPage(page);
    } catch {
      // silently ignore
    }
  }, []);

  const fetchReviewQueue = useCallback(async () => {
    try {
      const res = await api.get('/processing/review-queue', { params: { limit: 20 } });
      setReviewItems(res.data?.items ?? []);
      setReviewTotal(res.data?.total ?? 0);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchJobs(), fetchReviewQueue()]);
      setLoading(false);
    };
    fetchAll();

    // Poll summary every 10 seconds
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, [fetchSummary, fetchJobs, fetchReviewQueue]);

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH) return 'confidence-high';
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.MEDIUM) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.HIGH) return '✅ High';
    if (confidence >= AI_CONFIDENCE_THRESHOLDS.MEDIUM) return '⚠️ Medium';
    return '❌ Low';
  };

  const getStatusClass = (status: string) => {
    return `status-${status.toLowerCase().replace('_', '-')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="intelligence-page">
      {/* ─── Status Summary Cards ─── */}
      <div className="status-grid">
        <div className="status-card">
          <div className="status-card-header">
            <span className="status-card-label">Queued</span>
            <div className="status-card-icon" style={{ background: '#f1f5f9' }}>⏳</div>
          </div>
          <div className="status-card-value">{summary.queued}</div>
          <div className="status-card-sub">Waiting to process</div>
        </div>

        <div className="status-card">
          <div className="status-card-header">
            <span className="status-card-label">Processing</span>
            <div className="status-card-icon" style={{ background: '#eff6ff' }}>⚙️</div>
          </div>
          <div className="status-card-value" style={{ color: summary.processing > 0 ? '#3b82f6' : undefined }}>
            {summary.processing}
          </div>
          <div className="status-card-sub">Currently running</div>
        </div>

        <div className="status-card">
          <div className="status-card-header">
            <span className="status-card-label">Completed</span>
            <div className="status-card-icon" style={{ background: '#ecfdf5' }}>✅</div>
          </div>
          <div className="status-card-value" style={{ color: '#10b981' }}>
            {summary.completed}
          </div>
          <div className="status-card-sub">Successfully processed</div>
        </div>

        <div className="status-card">
          <div className="status-card-header">
            <span className="status-card-label">Failed</span>
            <div className="status-card-icon" style={{ background: '#fef2f2' }}>❌</div>
          </div>
          <div className="status-card-value" style={{ color: summary.failed > 0 ? '#ef4444' : undefined }}>
            {summary.failed}
          </div>
          <div className="status-card-sub">Need attention</div>
        </div>

        <div className="status-card">
          <div className="status-card-header">
            <span className="status-card-label">Needs Review</span>
            <div className="status-card-icon" style={{ background: '#fffbeb' }}>👁️</div>
          </div>
          <div className="status-card-value" style={{ color: summary.needsReview > 0 ? '#d97706' : undefined }}>
            {summary.needsReview}
          </div>
          <div className="status-card-sub">Awaiting approval</div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('jobs'); fetchJobs(); }}
        >
          📋 Processing Jobs
        </button>
        <button
          className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => { setActiveTab('review'); fetchReviewQueue(); }}
        >
          👁️ Review Queue {summary.needsReview > 0 && `(${summary.needsReview})`}
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === 'overview' && (
        <div className="intelligence-section">
          <div className="section-header">
            <span className="section-title">📋 Recent Processing Jobs</span>
          </div>
          <div className="section-body">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🧠</div>
                <div className="empty-state-title">No processing jobs yet</div>
                <div className="empty-state-desc">
                  Upload a document and click &quot;Process with AI&quot; to start extracting intelligence.
                </div>
              </div>
            ) : (
              <table className="jobs-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.slice(0, 5).map((job) => (
                    <tr
                      key={job.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/dashboard/intelligence/${job.documentId}`)}
                    >
                      <td>{job.document?.title || 'Untitled'}</td>
                      <td>{job.type.replace(/_/g, ' ')}</td>
                      <td>
                        <span className={`status-pill ${getStatusClass(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td>{job.attempts}</td>
                      <td>{formatDate(job.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="intelligence-section">
          <div className="section-header">
            <span className="section-title">📋 All Processing Jobs</span>
          </div>
          <div className="section-body">
            {jobs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No jobs found</div>
                <div className="empty-state-desc">Processing jobs will appear here once you start processing documents.</div>
              </div>
            ) : (
              <>
                <table className="jobs-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Started</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/intelligence/${job.documentId}`)}
                      >
                        <td>{job.document?.title || 'Untitled'}</td>
                        <td style={{ fontSize: 12 }}>{job.type.replace(/_/g, ' ')}</td>
                        <td>
                          <span className={`status-pill ${getStatusClass(job.status)}`}>
                            {job.status}
                          </span>
                        </td>
                        <td>{job.attempts}/{job.maxAttempts || 3}</td>
                        <td>{job.startedAt ? formatDate(job.startedAt) : '—'}</td>
                        <td>{job.completedAt ? formatDate(job.completedAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobsTotal > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button
                      className="btn-process btn-outline btn-sm"
                      disabled={jobsPage <= 1}
                      onClick={() => fetchJobs(jobsPage - 1)}
                    >
                      ← Previous
                    </button>
                    <span style={{ padding: '5px 12px', fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                      Page {jobsPage} of {Math.ceil(jobsTotal / 10)}
                    </span>
                    <button
                      className="btn-process btn-outline btn-sm"
                      disabled={jobsPage >= Math.ceil(jobsTotal / 10)}
                      onClick={() => fetchJobs(jobsPage + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'review' && (
        <div className="intelligence-section">
          <div className="section-header">
            <span className="section-title">👁️ Documents Needing Review ({reviewTotal})</span>
          </div>
          <div className="section-body">
            {reviewItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✅</div>
                <div className="empty-state-title">All caught up!</div>
                <div className="empty-state-desc">No documents need your review right now.</div>
              </div>
            ) : (
              reviewItems.map((item) => (
                <div
                  key={item.id}
                  className="review-item"
                  onClick={() => router.push(`/dashboard/intelligence/${item.document?.id || item.documentId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className="review-item-icon"
                    style={{ background: '#fffbeb' }}
                  >
                    {item.document?.category?.icon || '📄'}
                  </div>
                  <div className="review-item-info">
                    <div className="review-item-title">
                      {item.document?.title || 'Untitled Document'}
                    </div>
                    <div className="review-item-meta">
                      {item.suggestedCategory && `AI suggests: ${item.suggestedCategory}`}
                      {' · '}
                      {item.createdAt && formatDate(item.createdAt)}
                    </div>
                  </div>
                  <div className="review-item-actions">
                    <span className={`confidence-badge ${getConfidenceClass(item.categoryConfidence)}`}>
                      {getConfidenceLabel(item.categoryConfidence)} ({Math.round(item.categoryConfidence)}%)
                    </span>
                    <button className="btn-process btn-primary btn-sm">
                      Review →
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

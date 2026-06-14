'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../dashboard/billing/billing.css';
import { toast } from 'sonner';

interface SystemHealth {
  uptime: number;
  cpuLoad: number[];
  freeMemGb: string;
  totalMemGb: string;
  processMemory: {
    heapUsedMb: string;
    rssMb: string;
  };
  database: {
    totalUsers: number;
    totalDocuments: number;
    activeSessions: number;
  };
  queues: {
    queuedJobs: number;
    failedJobs: number;
  };
}

interface SystemCosts {
  currency: string;
  breakdown: {
    storageCost: string;
    aiCost: string;
    emailCost: string;
    baseInfrastructureCost: string;
  };
  metrics: {
    totalStorageGb: string;
    totalAIAnalyses: number;
    totalEmails: number;
  };
  totalCost: string;
}

export default function AdminOverviewPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [costs, setCosts] = useState<SystemCosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, costsRes] = await Promise.all([
        api.get('/admin/system/health'),
        api.get('/admin/system/costs'),
      ]);
      setHealth(healthRes.data?.data ?? null);
      setCosts(costsRes.data?.data ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access Denied or Server Error.');
      toast.error('Failed to load system metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds % 60}s`);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="billing-spinner" />
        <p>Loading System Health Metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#feb2b2' }}>
        <span style={{ fontSize: '3rem' }}>🔒</span>
        <h2 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Unauthorized</h2>
        <p style={{ color: '#a0aec0', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 700 }}>⚙️ System Overview & Costs</h2>
        <button
          onClick={fetchData}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            background: '#2d3748',
            color: '#fff',
            border: '1px solid #4a5568',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Primary KPI Stats */}
      {health && (
        <div className="revenue-metrics-grid">
          <div className="revenue-metric-card">
            <div className="metric-label">💻 Process Uptime</div>
            <div className="metric-value" style={{ fontSize: '1.5rem', color: '#6366f1' }}>
              {formatUptime(health.uptime)}
            </div>
          </div>
          <div className="revenue-metric-card">
            <div className="metric-label">🧠 CPU Load (1m)</div>
            <div className="metric-value">
              {health.cpuLoad[0]?.toFixed(2) ?? '0.00'}
            </div>
          </div>
          <div className="revenue-metric-card">
            <div className="metric-label">💾 Free System Memory</div>
            <div className="metric-value">
              {health.freeMemGb} GB / {health.totalMemGb} GB
            </div>
          </div>
          <div className="revenue-metric-card">
            <div className="metric-label">🐳 Process Heap Used</div>
            <div className="metric-value">
              {health.processMemory.heapUsedMb} MB
            </div>
          </div>
        </div>
      )}

      {/* System Health Breakdown & Cost Calculator */}
      <div className="distribution-section">
        {/* Resource Database Counts & Queue Status */}
        {health && (
          <div className="distribution-card" style={{ flex: 1 }}>
            <h3>📊 Platform Inventory</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Registered User Accounts</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{health.database.totalUsers}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Active Documents Stored</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{health.database.totalDocuments}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Active Token Sessions</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{health.database.activeSessions}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Queued Processing Jobs (OCR/AI)</span>
                <span style={{ color: '#ecc94b', fontWeight: 600 }}>{health.queues.queuedJobs}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#a0aec0' }}>Failed Processing Jobs</span>
                <span style={{ color: '#f56565', fontWeight: 600 }}>{health.queues.failedJobs}</span>
              </div>
            </div>
          </div>
        )}

        {/* SaaS Operational Costs */}
        {costs && (
          <div className="distribution-card" style={{ flex: 1 }}>
            <h3>💸 Estimated Monthly Cost Tracker</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>S3 File Storage ({costs.metrics.totalStorageGb} GB)</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>${costs.breakdown.storageCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Gemini AI Processing ({costs.metrics.totalAIAnalyses} docs)</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>${costs.breakdown.aiCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>SMTP Email Messages ({costs.metrics.totalEmails} sent)</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>${costs.breakdown.emailCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #2d3748', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#a0aec0' }}>Server Infrastructure (Flat Base)</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>${costs.breakdown.baseInfrastructureCost}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#fff', fontWeight: 700 }}>Total Estimated Costs</span>
                <span style={{ color: '#48bb78', fontWeight: 700, fontSize: '1.15rem' }}>${costs.totalCost} USD</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

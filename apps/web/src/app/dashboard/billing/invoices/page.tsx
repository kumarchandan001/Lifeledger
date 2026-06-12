'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../billing.css';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: string;
  description: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  pdfUrl: string | null;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/billing/invoices', {
        params: { page, limit },
      });
      setInvoices(res.data?.data?.invoices ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="billing-spinner" />
        <p>Loading invoices...</p>
      </div>
    );
  }

  return (
    <div className="invoices-page">
      <h2 className="billing-section-title">Invoice History</h2>

      {invoices.length === 0 ? (
        <div className="invoices-empty">
          <span style={{ fontSize: '3rem' }}>🧾</span>
          <p>No invoices yet. They'll appear here once you subscribe to a paid plan.</p>
        </div>
      ) : (
        <div className="invoices-table-wrapper">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        {inv.invoiceNumber}
                      </span>
                      {inv.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #9aa0a6)', marginTop: '0.2rem' }}>
                          {inv.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(inv.createdAt)}</td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</span>
                      {inv.tax > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9aa0a6)' }}>
                          (incl. {formatCurrency(inv.tax)} GST)
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    {inv.billingPeriodStart && inv.billingPeriodEnd ? (
                      <span style={{ fontSize: '0.82rem' }}>
                        {formatDate(inv.billingPeriodStart)} – {formatDate(inv.billingPeriodEnd)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span className={`invoice-status ${inv.status}`}>{inv.status}</span>
                  </td>
                  <td>
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#8ab4f8',
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                        }}
                      >
                        📥 Download
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary, #9aa0a6)', fontSize: '0.85rem' }}>
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="invoices-pagination">
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Previous
              </button>
              <span style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary, #9aa0a6)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

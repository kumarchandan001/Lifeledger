'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../../dashboard/billing/billing.css';
import { toast } from 'sonner';

interface TicketItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Resolution details
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState('OPEN');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/support/admin', {
        params: {
          page,
          limit: 10,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        },
      });
      setTickets(res.data?.data?.tickets ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch {
      toast.error('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSelectTicket = (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setUpdateNotes(ticket.adminNotes ?? '');
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setUpdating(true);
    try {
      await api.patch(`/support/admin/${selectedTicket.id}`, {
        status: updateStatus,
        adminNotes: updateNotes,
      });
      toast.success('Ticket updated successfully.');
      fetchTickets();
      setSelectedTicket(null);
    } catch {
      toast.error('Failed to update ticket status.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { background: '#ecc94b22', color: '#ecc94b' };
      case 'IN_PROGRESS':
        return { background: '#3182ce22', color: '#3182ce' };
      case 'RESOLVED':
        return { background: '#48bb7822', color: '#48bb78' };
      default:
        return { background: '#71809622', color: '#718096' };
    }
  };

  return (
    <div className="revenue-page" style={{ padding: '1rem' }}>
      <h2 className="billing-section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        🎫 Customer Support Center Moderator
      </h2>

      {/* Filter options */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              background: '#1a202c',
              border: '1px solid #2d3748',
              color: '#fff',
            }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Filter by Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '0.6rem',
              borderRadius: '6px',
              background: '#1a202c',
              border: '1px solid #2d3748',
              color: '#fff',
            }}
          >
            <option value="">All Categories</option>
            <option value="SUPPORT">General Support</option>
            <option value="BUG_REPORT">Bug Report</option>
            <option value="FEEDBACK">Feedback</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="billing-loading">
          <div className="billing-spinner" />
          <p>Loading support tickets...</p>
        </div>
      ) : (
        <div>
          {tickets.length === 0 ? (
            <div className="invoices-empty">
              <span style={{ fontSize: '3rem' }}>🎫</span>
              <p>No support tickets found matching the selected filters.</p>
            </div>
          ) : (
            <div className="invoices-table-wrapper">
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>Ticket Info</th>
                    <th>Category</th>
                    <th>User Profile</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ maxWidth: '350px' }}>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{t.subject}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.message}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: '#2d3748',
                            color: '#cbd5e0',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#a0aec0' }}>{t.email}</div>
                        </div>
                      </td>
                      <td>{formatDate(t.createdAt)}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '50px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            ...getStatusBadgeStyle(t.status),
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleSelectTicket(t)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            background: '#6366f1',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1a202c',
                    color: '#fff',
                    border: '1px solid #2d3748',
                    cursor: 'pointer',
                    opacity: page === 1 ? 0.5 : 1,
                  }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', color: '#a0aec0', padding: '0 0.5rem' }}>
                  Page {page} of {Math.ceil(total / 10) || 1}
                </span>
                <button
                  onClick={() => setPage((p) => (p * 10 < total ? p + 1 : p))}
                  disabled={page * 10 >= total}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#1a202c',
                    color: '#fff',
                    border: '1px solid #2d3748',
                    cursor: 'pointer',
                    opacity: page * 10 >= total ? 0.5 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket Resolve Modal */}
      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1a202c',
              border: '1px solid #2d3748',
              borderRadius: '12px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: 600 }}>
                  Ticket Resolution Process
                </span>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700, marginTop: '0.2rem' }}>
                  {selectedTicket.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0aec0',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            {/* Ticket details */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem' }}>
                <span>From: <strong>{selectedTicket.name}</strong> ({selectedTicket.email})</span>
                <span>Submitted: {formatDate(selectedTicket.createdAt)}</span>
              </div>
              <div
                style={{
                  background: '#2d374833',
                  border: '1px solid #2d3748',
                  borderRadius: '6px',
                  padding: '1rem',
                  color: '#e2e8f0',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedTicket.message}
              </div>
            </div>

            {/* Resolve Form */}
            <form onSubmit={handleUpdateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Ticket Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: '#1a202c',
                    border: '1px solid #4a5568',
                    color: '#fff',
                  }}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Resolution / Moderator Notes</label>
                <textarea
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: '#1a202c',
                    border: '1px solid #4a5568',
                    color: '#fff',
                    resize: 'vertical',
                  }}
                  placeholder="Detail actions taken to resolve this ticket..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    background: '#2d3748',
                    border: '1px solid #4a5568',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '6px',
                    background: '#6366f1',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: updating ? 0.7 : 1,
                  }}
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

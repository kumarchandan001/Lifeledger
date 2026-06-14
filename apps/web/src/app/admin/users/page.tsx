'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import '../../dashboard/billing/billing.css';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  storageUsedBytes: number;
  documentCount: number;
  subscription?: {
    id: string;
    plan: {
      id: string;
      name: string;
      displayName: string;
    };
    billingCycle: string;
    status: string;
  };
}

interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
  ipAddress: string | null;
  details: any;
}

interface PlanItem {
  id: string;
  name: string;
  displayName: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal / Slide-out Panel State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Subscription Override State
  const [overridePlanId, setOverridePlanId] = useState('');
  const [overrideCycle, setOverrideCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [overrideTrialDays, setOverrideTrialDays] = useState(0);
  const [overriding, setOverriding] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { page, limit: 10, search },
      });
      setUsers(res.data?.data?.users ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: any) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/billing/plans');
      setPlans(res.data?.data ?? []);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const toggleSuspension = async (user: UserItem) => {
    const isSuspended = user.status === 'SUSPENDED';
    const endpoint = `/admin/users/${user.id}/${isSuspended ? 'unsuspend' : 'suspend'}`;

    try {
      await api.post(endpoint);
      toast.success(`User successfully ${isSuspended ? 'reactivated' : 'suspended'}.`);
      fetchUsers();
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, status: isSuspended ? 'ACTIVE' : 'SUSPENDED' });
      }
    } catch {
      toast.error('Failed to change user status.');
    }
  };

  const handleViewLogs = async (user: UserItem) => {
    setSelectedUser(user);
    setOverridePlanId(user.subscription?.plan?.id ?? '');
    setAuditLogs([]);
    setLogsLoading(true);

    try {
      const res = await api.get(`/admin/users/${user.id}/audit-logs`);
      setAuditLogs(res.data?.data?.logs ?? []);
    } catch {
      toast.error('Failed to fetch user audit logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !overridePlanId) return;

    setOverriding(true);
    try {
      await api.post(`/admin/users/${selectedUser.id}/subscription`, {
        planId: overridePlanId,
        billingCycle: overrideCycle,
        trialDays: overrideTrialDays,
      });
      toast.success('Subscription plan overridden successfully.');
      fetchUsers();
      setSelectedUser(null);
    } catch {
      toast.error('Failed to override subscription plan.');
    } finally {
      setOverriding(false);
    }
  };

  const formatStorage = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="revenue-page" style={{ padding: '1rem' }}>
      <h2 className="billing-section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        👥 Platform User Management & Moderation
      </h2>

      {/* Lookup controls */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search users by name or email address..."
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            background: '#1a202c',
            border: '1px solid #2d3748',
            color: '#fff',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {loading ? (
        <div className="billing-loading">
          <div className="billing-spinner" />
          <p>Loading user list...</p>
        </div>
      ) : (
        <div>
          {users.length === 0 ? (
            <div className="invoices-empty">
              <span style={{ fontSize: '3rem' }}>👥</span>
              <p>No registered users found matching the search criteria.</p>
            </div>
          ) : (
            <div className="invoices-table-wrapper">
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Subscription</th>
                    <th>Billing Cycle</th>
                    <th>Storage / Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{u.fullName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a0aec0' }}>{u.email}</div>
                          <div style={{ fontSize: '0.75rem', color: '#718096', marginTop: '0.2rem' }}>
                            Joined {formatDate(u.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: u.subscription?.plan?.name === 'free' ? '#2d3748' : '#3182ce33',
                            color: u.subscription?.plan?.name === 'free' ? '#cbd5e0' : '#3182ce',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          {u.subscription?.plan?.displayName || 'Free'}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {u.subscription?.billingCycle?.toLowerCase() || '—'}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{formatStorage(u.storageUsedBytes)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{u.documentCount} documents</div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '50px',
                            background: u.status === 'ACTIVE' ? '#48bb7822' : '#f5656522',
                            color: u.status === 'ACTIVE' ? '#48bb78' : '#f56565',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleViewLogs(u)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: '#3182ce',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => toggleSuspension(u)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: u.status === 'ACTIVE' ? '#e53e3e' : '#38a169',
                              border: 'none',
                              borderRadius: '4px',
                              color: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
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

      {/* Moderation & Override Modal/Panel */}
      {selectedUser && (
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
              maxWidth: '850px',
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
                <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>
                  Manage Account: {selectedUser.fullName}
                </h3>
                <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
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

            <div style={{ display: 'flex', gap: '2rem', flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Subscription Override Form */}
              <div style={{ flex: 1, minWidth: '300px', background: '#2d374833', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2d3748' }}>
                <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>Plan Override</h4>
                <form onSubmit={handleApplyOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Select Plan</label>
                    <select
                      value={overridePlanId}
                      onChange={(e) => setOverridePlanId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        background: '#1a202c',
                        border: '1px solid #4a5568',
                        color: '#fff',
                      }}
                    >
                      <option value="">-- No Active Override --</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Billing Cycle</label>
                    <select
                      value={overrideCycle}
                      onChange={(e) => setOverrideCycle(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        background: '#1a202c',
                        border: '1px solid #4a5568',
                        color: '#fff',
                      }}
                    >
                      <option value="MONTHLY">Monthly Billing</option>
                      <option value="YEARLY">Yearly Billing</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#a0aec0', display: 'block', marginBottom: '0.4rem' }}>Trial Extension (Days)</label>
                    <input
                      type="number"
                      value={overrideTrialDays}
                      onChange={(e) => setOverrideTrialDays(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        background: '#1a202c',
                        border: '1px solid #4a5568',
                        color: '#fff',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={overriding}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: '#6366f1',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: overriding ? 0.7 : 1,
                    }}
                  >
                    {overriding ? 'Applying override...' : 'Apply Plan Override'}
                  </button>
                </form>
              </div>

              {/* User Audit Trail / Activity Logger */}
              <div style={{ flex: 1.5, minWidth: '300px' }}>
                <h4 style={{ color: '#fff', fontWeight: 600, marginBottom: '1rem' }}>📋 User Activity Logs</h4>
                {logsLoading ? (
                  <p style={{ color: '#a0aec0' }}>Loading logs...</p>
                ) : (
                  <div
                    style={{
                      maxHeight: '320px',
                      overflowY: 'auto',
                      background: '#1a202c',
                      border: '1px solid #2d3748',
                      borderRadius: '6px',
                      padding: '0.5rem',
                    }}
                  >
                    {auditLogs.length === 0 ? (
                      <p style={{ color: '#718096', padding: '1rem', textAlign: 'center' }}>No activities recorded.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              padding: '0.5rem',
                              borderBottom: '1px solid #2d3748',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6366f1', fontWeight: 600 }}>{log.action}</span>
                              <span style={{ color: '#718096' }}>{formatDate(log.createdAt)}</span>
                            </div>
                            <div style={{ color: '#cbd5e0', marginTop: '0.2rem' }}>
                              Target: {log.resourceType} | IP: {log.ipAddress || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

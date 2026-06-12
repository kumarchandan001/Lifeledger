'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { CheckCircle, XCircle, Clock, Shield } from 'lucide-react';

interface AccessRequest {
  id: string;
  reason: string;
  status: string;
  reviewNotes?: string;
  expiresAt: string;
  resolvedAt?: string;
  createdAt: string;
  beneficiary: { id: string; name: string; email: string; relationship: string };
  grant?: { id: string; duration: string; expiresAt: string; isActive: boolean };
}

const STATUS_STYLES: Record<string, { color: string; icon: typeof Clock }> = {
  PENDING: { color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  UNDER_REVIEW: { color: 'bg-blue-500/10 text-blue-600', icon: Clock },
  APPROVED: { color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  REJECTED: { color: 'bg-red-500/10 text-red-600', icon: XCircle },
  EXPIRED: { color: 'bg-gray-500/10 text-gray-600', icon: Clock },
};

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try { const res = await api.get('/legacy/access/requests'); setRequests(res.data); }
    catch (err) { console.error('Failed to fetch requests', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleResolve = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setResolving(requestId);
    try {
      await api.patch(`/legacy/access/requests/${requestId}/resolve`, {
        status,
        sessionDuration: 'DAYS_30',
        reviewNotes: status === 'APPROVED' ? 'Approved by owner' : 'Rejected by owner',
      });
      await fetchRequests();
    } catch (err: any) {
      alert(err?.response?.data?.message || `Failed to ${status.toLowerCase()} request`);
    } finally { setResolving(null); }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading access requests...</div></div>;

  const pending = requests.filter((r) => ['PENDING', 'UNDER_REVIEW'].includes(r.status));
  const resolved = requests.filter((r) => !['PENDING', 'UNDER_REVIEW'].includes(r.status));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Legacy Access Requests</h3>
        <p className="text-muted-foreground text-sm">Review and manage access requests from your beneficiaries.</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-600">Pending Review ({pending.length})</h4>
          {pending.map((req) => (
            <div key={req.id} className="bg-card border-border rounded-xl border border-l-4 border-l-amber-500 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{req.beneficiary.name}</h4>
                    <p className="text-muted-foreground text-sm">{req.beneficiary.email} • {req.beneficiary.relationship}</p>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">{new Date(req.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-muted-foreground mt-3 rounded-lg bg-gray-500/5 p-3 text-sm italic">"{req.reason}"</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleResolve(req.id, 'APPROVED')}
                  disabled={!!resolving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => handleResolve(req.id, 'REJECTED')}
                  disabled={!!resolving}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">History ({resolved.length})</h4>
        {resolved.length === 0 && pending.length === 0 ? (
          <div className="bg-card border-border rounded-xl border p-12 text-center">
            <p className="text-muted-foreground text-lg">No access requests</p>
          </div>
        ) : (
          resolved.map((req) => {
            const style = STATUS_STYLES[req.status] ?? { color: 'bg-gray-500/10 text-gray-600', icon: Clock };
            const StatusIcon = style.icon;
            return (
              <div key={req.id} className="bg-card border-border flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <StatusIcon className="h-5 w-5" />
                  <div>
                    <span className="font-medium">{req.beneficiary.name}</span>
                    <span className="text-muted-foreground ml-2 text-sm">{req.beneficiary.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${style.color}`}>{req.status}</span>
                  <span className="text-muted-foreground text-xs">{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

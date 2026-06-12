'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  BENEFICIARY_ADDED: { icon: '👤', label: 'Beneficiary added', color: 'text-emerald-600' },
  BENEFICIARY_REMOVED: { icon: '👤', label: 'Beneficiary removed', color: 'text-red-600' },
  BENEFICIARY_UPDATED: { icon: '👤', label: 'Beneficiary updated', color: 'text-blue-600' },
  PLAN_CREATED: { icon: '📋', label: 'Plan created', color: 'text-emerald-600' },
  PLAN_UPDATED: { icon: '📋', label: 'Plan updated', color: 'text-blue-600' },
  PLAN_DELETED: { icon: '📋', label: 'Plan deleted', color: 'text-red-600' },
  VAULT_DOCUMENT_ADDED: { icon: '🔐', label: 'Document added to vault', color: 'text-emerald-600' },
  VAULT_DOCUMENT_REMOVED: { icon: '🔐', label: 'Document removed from vault', color: 'text-red-600' },
  INSTRUCTION_CREATED: { icon: '📝', label: 'Instruction created', color: 'text-emerald-600' },
  INSTRUCTION_UPDATED: { icon: '📝', label: 'Instruction updated', color: 'text-blue-600' },
  INSTRUCTION_DELETED: { icon: '📝', label: 'Instruction deleted', color: 'text-red-600' },
  MESSAGE_CREATED: { icon: '💌', label: 'Message created', color: 'text-emerald-600' },
  MESSAGE_UPDATED: { icon: '💌', label: 'Message updated', color: 'text-blue-600' },
  MESSAGE_DELETED: { icon: '💌', label: 'Message deleted', color: 'text-red-600' },
  ASSET_REGISTERED: { icon: '🏦', label: 'Asset registered', color: 'text-emerald-600' },
  ASSET_UPDATED: { icon: '🏦', label: 'Asset updated', color: 'text-blue-600' },
  ASSET_REMOVED: { icon: '🏦', label: 'Asset removed', color: 'text-red-600' },
  ACCESS_REQUESTED: { icon: '🔑', label: 'Access requested', color: 'text-amber-600' },
  ACCESS_APPROVED: { icon: '✅', label: 'Access approved', color: 'text-emerald-600' },
  ACCESS_REJECTED: { icon: '❌', label: 'Access rejected', color: 'text-red-600' },
  READINESS_GENERATED: { icon: '📊', label: 'Readiness report generated', color: 'text-purple-600' },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await api.get(`/legacy/activity?limit=${limit}&offset=${offset}`);
        setActivities(res.data.activities);
        setTotal(res.data.total);
      } catch (err) {
        console.error('Failed to fetch activity', err);
      } finally { setLoading(false); }
    }
    fetchActivity();
  }, [offset]);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading activity...</div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Activity Log</h3>
        <p className="text-muted-foreground text-sm">Complete audit trail of all legacy planning actions.</p>
      </div>

      {activities.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <Clock className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
          <p className="text-muted-foreground mt-3 text-lg">No activity yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Actions you take will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border-border rounded-xl border shadow-sm">
          <div className="divide-y divide-gray-500/10">
            {activities.map((a) => {
              const info = ACTION_LABELS[a.action] || { icon: '📌', label: a.action, color: 'text-gray-600' };
              return (
                <div key={a.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-gray-500/5">
                  <span className="mt-0.5 text-lg">{info.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className={`font-medium ${info.color}`}>{info.label}</span>
                      {a.metadata && (a.metadata as any).beneficiaryName && (
                        <span className="text-muted-foreground"> — {(a.metadata as any).beneficiaryName}</span>
                      )}
                      {a.metadata && (a.metadata as any).title && (
                        <span className="text-muted-foreground"> — {(a.metadata as any).title}</span>
                      )}
                      {a.metadata && (a.metadata as any).serviceName && (
                        <span className="text-muted-foreground"> — {(a.metadata as any).serviceName}</span>
                      )}
                      {a.metadata && (a.metadata as any).planName && (
                        <span className="text-muted-foreground"> — {(a.metadata as any).planName}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{formatRelativeTime(a.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-gray-500/10 p-4">
              <span className="text-muted-foreground text-sm">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="bg-muted rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50">Previous</button>
                <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="bg-muted rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

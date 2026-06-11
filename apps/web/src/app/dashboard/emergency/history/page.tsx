'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { History } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  actorId: string;
  metadata: any;
  createdAt: string;
}

export default function HistoryPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await api.get('/emergency/activity');
        setActivities(res.data ?? []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load activity log');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const getActionDetails = (act: Activity) => {
    const meta = act.metadata || {};

    switch (act.action) {
      case 'CONTACT_ADDED':
        return {
          title: 'Trusted Contact Designated',
          description: `Added ${meta.contactName} (${meta.relationship}) as a trusted contact.`,
          icon: '👤',
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        };
      case 'CONTACT_UPDATED':
        return {
          title: 'Trusted Contact Updated',
          description: `Updated details for contact.`,
          icon: '✏️',
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
        };
      case 'CONTACT_REMOVED':
        return {
          title: 'Trusted Contact Removed',
          description: `Removed ${meta.contactName} from designated trusted contacts.`,
          icon: '🗑️',
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
        };
      case 'VAULT_DOCUMENT_ADDED':
        return {
          title: 'Document Added to Vault',
          description: `Marked "${meta.documentTitle}" for Emergency Vault access.`,
          icon: '🔒',
          color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        };
      case 'VAULT_DOCUMENT_REMOVED':
        return {
          title: 'Document Removed from Vault',
          description: `Unmarked "${meta.documentTitle}" from Emergency Vault access.`,
          icon: '🔓',
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
        };
      case 'REQUEST_SUBMITTED':
        return {
          title: 'Emergency Request Submitted',
          description: `Emergency access requested by contact ${meta.requesterName} (${meta.requesterEmail}). Waiting period of ${meta.waitingPeriod} days started.`,
          icon: '📨',
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
        };
      case 'REQUEST_APPROVED':
        return {
          title: 'Emergency Request Approved',
          description: `Access request approved. Secure session started for trusted contact.`,
          icon: '✅',
          color: 'text-green-500 bg-green-500/10 border-green-500/20',
        };
      case 'REQUEST_REJECTED':
        return {
          title: 'Emergency Request Rejected',
          description: `Access request was rejected.`,
          icon: '❌',
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
        };
      case 'REQUEST_CANCELLED':
        return {
          title: 'Emergency Request Cancelled',
          description: `Request was cancelled by the requester.`,
          icon: '🚫',
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
        };
      case 'REQUEST_ESCALATED':
        return {
          title: 'Request ESCALATED',
          description: `Waiting period expired without owner response. Request escalated for review.`,
          icon: '⚠️',
          color: 'text-red-600 bg-red-600/10 border-red-600/20',
        };
      case 'SESSION_STARTED':
        return {
          title: 'Emergency Session Started',
          description: `Trusted contact initiated access session to view vault items.`,
          icon: '🚨',
          color: 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse',
        };
      case 'SESSION_ENDED':
        return {
          title: 'Emergency Session Ended',
          description: `Emergency access session has completed/ended.`,
          icon: '🏁',
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
        };
      case 'SESSION_EXPIRED':
        return {
          title: 'Emergency Session Expired',
          description: `Emergency access session has automatically expired.`,
          icon: '⌛',
          color: 'text-yellow-600 bg-yellow-600/10 border-yellow-600/20',
        };
      case 'SETTINGS_UPDATED':
        return {
          title: 'Settings Adjusted',
          description: `Emergency waiting period set to ${meta.emergencyWaitingPeriod} days.`,
          icon: '⚙️',
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        };
      default:
        return {
          title: act.action,
          description: JSON.stringify(meta),
          icon: '🔔',
          color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading activity history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Emergency Activity Feed</h3>
        <p className="text-muted-foreground mt-0.5 text-sm font-normal">
          Audit logs of all emergency-related changes, contact status, and session views.
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center shadow-sm">
          <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <History className="h-6 w-6" />
          </div>
          <h4 className="text-foreground font-sans text-lg font-semibold">No Activity Logged</h4>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-normal font-normal">
            All emergency dashboard events, settings changes, and contact actions will be logged
            here for full auditability.
          </p>
        </div>
      ) : (
        <div className="bg-card border-border rounded-xl border p-6 shadow-sm">
          <div className="border-border relative space-y-6 border-l-2 pl-6">
            {activities.map((act) => {
              const details = getActionDetails(act);
              return (
                <div key={act.id} className="relative">
                  {/* Timeline icon */}
                  <span
                    className={`absolute top-0.5 -left-[35px] flex h-6.5 w-6.5 items-center justify-center rounded-full border text-xs shadow-sm ${details.color}`}
                  >
                    {details.icon}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-foreground text-sm font-bold">{details.title}</h4>
                      <span className="text-muted-foreground text-[10px] font-semibold">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed font-normal">
                      {details.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

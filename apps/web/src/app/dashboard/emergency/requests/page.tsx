'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Check, X, Clock, Calendar, Mail, FileText } from 'lucide-react';

interface Request {
  id: string;
  reason: string;
  status: string;
  waitingPeriod: number;
  expiresAt: string;
  createdAt: string;
  trustedContact: {
    name: string;
    email: string;
    relationship: string;
  };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);

  // Approval Options
  const [sessionDuration, setSessionDuration] = useState<'24h' | '72h' | '7d'>('72h');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories] = useState([
    { name: 'Identity Documents', slug: 'identity' },
    { name: 'Medical Records', slug: 'medical' },
    { name: 'Insurance Policies', slug: 'insurance' },
    { name: 'Financial Documents', slug: 'financial' },
    { name: 'Legal Documents', slug: 'legal' },
    { name: 'Property Documents', slug: 'property' },
    { name: 'Family Records', slug: 'family' },
  ]);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/emergency/requests');
      setRequests(res.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenApproveModal = (req: Request) => {
    setActiveRequest(req);
    setSessionDuration('72h');
    setSelectedCategories([]);
    setShowApproveModal(true);
  };

  const handleCategoryToggle = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleResolve = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeRequest) return;
    try {
      const payload: any = { status };
      if (status === 'APPROVED') {
        payload.sessionDuration = sessionDuration;
        payload.accessScope = {
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        };
      }

      await api.patch(`/emergency/requests/${activeRequest.id}/resolve`, payload);
      toast.success(status === 'APPROVED' ? 'Access request approved' : 'Access request rejected');
      setShowApproveModal(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20';
      case 'ESCALATED': return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold';
      case 'APPROVED': return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
      case 'REJECTED': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Emergency Access Requests</h3>
        <p className="text-sm text-muted-foreground mt-0.5 font-normal">
          Review request submissions from your trusted contacts. Approved sessions expire automatically.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
            <Mail className="h-6 w-6" />
          </div>
          <h4 className="font-semibold text-lg text-foreground font-sans">No Requests</h4>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 font-normal leading-normal">
            You don't have any incoming emergency access requests at this time.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
          {requests.map((r) => (
            <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/10 transition-colors">
              <div className="space-y-4 max-w-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="font-bold text-foreground text-md leading-none">{r.trustedContact.name}</h4>
                  <span className="text-xs text-muted-foreground">• {r.trustedContact.relationship}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusBadgeClass(r.status)}`}>
                    {r.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="italic bg-muted/40 border border-border p-3 rounded-lg text-foreground/90 font-normal text-xs leading-relaxed flex gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    "{r.reason}"
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                      Submitted: {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                      Expires/Escalates: {new Date(r.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {(r.status === 'PENDING' || r.status === 'ESCALATED') && (
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => {
                      setActiveRequest(r);
                      handleResolve('REJECTED');
                    }}
                    className="flex items-center gap-1 px-4 py-2 border border-border bg-muted/50 hover:bg-red-500/10 hover:text-destructive rounded-lg text-sm font-semibold transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleOpenApproveModal(r)}
                    className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>Approve Access</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && activeRequest && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Check className="h-6 w-6 text-green-500" />
                Configure Emergency Grant
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                Approving access for {activeRequest.trustedContact.name}. Customize the access session.
              </p>
            </div>

            <div className="space-y-4">
              {/* Session Duration Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Duration</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['24h', '72h', '7d'] as const).map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setSessionDuration(duration)}
                      className={`py-2 text-center text-xs font-semibold rounded-lg border transition-all ${
                        sessionDuration === duration
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.01]'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {duration === '24h' ? '24 Hours' : duration === '72h' ? '72 Hours' : '7 Days'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope/Category Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Allowed Document Categories
                </label>
                <p className="text-[11px] text-muted-foreground font-normal leading-normal">
                  Select which categories of vault documents are shared. Select none to share all documents in the vault.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-[180px] overflow-y-auto pr-1">
                  {allCategories.map((c) => {
                    const isChecked = selectedCategories.includes(c.slug);
                    return (
                      <div
                        key={c.slug}
                        onClick={() => handleCategoryToggle(c.slug)}
                        className={`flex items-center gap-2.5 p-2.5 border rounded-lg cursor-pointer hover:border-primary/50 select-none transition-all ${
                          isChecked ? 'bg-primary/5 border-primary/30 text-primary' : 'border-border text-foreground/80'
                        }`}
                      >
                        <div
                          className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/30 bg-background'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold">{c.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 border border-border bg-muted/50 hover:bg-muted text-foreground rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolve('APPROVED')}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

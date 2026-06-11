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
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20';
      case 'ESCALATED':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold';
      case 'APPROVED':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
      case 'REJECTED':
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
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
        <p className="text-muted-foreground mt-0.5 text-sm font-normal">
          Review request submissions from your trusted contacts. Approved sessions expire
          automatically.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center shadow-sm">
          <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Mail className="h-6 w-6" />
          </div>
          <h4 className="text-foreground font-sans text-lg font-semibold">No Requests</h4>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-normal font-normal">
            You don't have any incoming emergency access requests at this time.
          </p>
        </div>
      ) : (
        <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
          {requests.map((r) => (
            <div
              key={r.id}
              className="hover:bg-muted/10 flex flex-col justify-between gap-6 p-6 transition-colors md:flex-row md:items-center"
            >
              <div className="max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-foreground text-md leading-none font-bold">
                    {r.trustedContact.name}
                  </h4>
                  <span className="text-muted-foreground text-xs">
                    • {r.trustedContact.relationship}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${getStatusBadgeClass(r.status)}`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="text-muted-foreground space-y-2 text-sm">
                  <p className="bg-muted/40 border-border text-foreground/90 flex gap-2 rounded-lg border p-3 text-xs leading-relaxed font-normal italic">
                    <FileText className="text-muted-foreground/60 h-4 w-4 shrink-0" />"{r.reason}"
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="text-muted-foreground/60 h-3.5 w-3.5" />
                      Submitted: {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="text-muted-foreground/60 h-3.5 w-3.5" />
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
                    className="border-border bg-muted/50 hover:text-destructive flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleOpenApproveModal(r)}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
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
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border-border animate-in zoom-in-95 w-full max-w-lg space-y-5 rounded-xl border p-6 shadow-lg duration-200">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <Check className="h-6 w-6 text-green-500" />
                Configure Emergency Grant
              </h3>
              <p className="text-muted-foreground mt-1 text-xs font-normal">
                Approving access for {activeRequest.trustedContact.name}. Customize the access
                session.
              </p>
            </div>

            <div className="space-y-4">
              {/* Session Duration Selector */}
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Session Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['24h', '72h', '7d'] as const).map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setSessionDuration(duration)}
                      className={`rounded-lg border py-2 text-center text-xs font-semibold transition-all ${
                        sessionDuration === duration
                          ? 'bg-primary text-primary-foreground border-primary scale-[1.01] shadow-sm'
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
                <label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Allowed Document Categories
                </label>
                <p className="text-muted-foreground text-[11px] leading-normal font-normal">
                  Select which categories of vault documents are shared. Select none to share all
                  documents in the vault.
                </p>
                <div className="mt-2 grid max-h-[180px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {allCategories.map((c) => {
                    const isChecked = selectedCategories.includes(c.slug);
                    return (
                      <div
                        key={c.slug}
                        onClick={() => handleCategoryToggle(c.slug)}
                        className={`hover:border-primary/50 flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-all select-none ${
                          isChecked
                            ? 'bg-primary/5 border-primary/30 text-primary'
                            : 'border-border text-foreground/80'
                        }`}
                      >
                        <div
                          className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-all ${
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

            <div className="border-border mt-2 flex items-center justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="border-border bg-muted/50 hover:bg-muted text-foreground rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolve('APPROVED')}
                className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors"
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

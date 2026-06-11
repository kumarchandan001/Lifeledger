'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Shield, Send, CheckCircle2, Clock, Eye, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PublicRequestPage() {
  const [form, setForm] = useState({
    ownerEmail: '',
    requesterEmail: '',
    requesterName: '',
    reason: '',
    supportingInfo: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [trackId, setTrackId] = useState('');
  const [trackingRequest, setTrackingRequest] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/emergency/requests', form);
      toast.success('Emergency access request submitted successfully');
      setSubmittedRequest(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Access request failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId) return;
    setTrackingLoading(true);
    try {
      const res = await api.get(`/emergency/requests/${trackId}/status`);
      setTrackingRequest(res.data);
    } catch (err) {
      toast.error('Could not find a request with this ID');
      setTrackingRequest(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          title: 'Waiting Period Active',
          description: 'The request is currently in the security waiting period. The vault owner has been notified.',
          color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
          icon: <Clock className="h-10 w-10 text-yellow-500" />,
        };
      case 'ESCALATED':
        return {
          title: 'Escalated for Review',
          description: 'The waiting period expired with no response. The request is undergoing manual verification.',
          color: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
          icon: <AlertTriangle className="h-10 w-10 text-orange-500" />,
        };
      case 'APPROVED':
        return {
          title: 'Access APPROVED',
          description: 'The request has been approved. You can start your emergency session now.',
          color: 'text-green-600 bg-green-500/10 border-green-500/20',
          icon: <CheckCircle2 className="h-10 w-10 text-green-500" />,
        };
      case 'REJECTED':
        return {
          title: 'Access Rejected',
          description: 'The request was rejected by the vault owner.',
          color: 'text-red-600 bg-red-500/10 border-red-500/20',
          icon: <AlertTriangle className="h-10 w-10 text-red-500" />,
        };
      case 'CANCELLED':
        return {
          title: 'Request Cancelled',
          description: 'The request was cancelled by you.',
          color: 'text-gray-600 bg-gray-500/10 border-gray-500/20',
          icon: <AlertTriangle className="h-10 w-10 text-gray-500" />,
        };
      case 'EXPIRED':
        return {
          title: 'Session Expired',
          description: 'The emergency access session has ended or expired.',
          color: 'text-red-700 bg-red-500/10 border-red-500/20',
          icon: <Clock className="h-10 w-10 text-red-500" />,
        };
      default:
        return {
          title: status,
          description: '',
          color: 'bg-muted border-border text-muted-foreground',
          icon: <Clock className="h-10 w-10" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 bg-primary/10 text-primary rounded-full items-center justify-center mb-2">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground tracking-tight">LifeLedger Emergency Portal</h2>
          <p className="text-sm text-muted-foreground font-normal">
            Request emergency access to a user's critical documents or track an existing request.
          </p>
        </div>

        {submittedRequest ? (
          <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-md text-center">
            <div className="inline-flex h-12 w-12 bg-green-500/10 text-green-500 rounded-full items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Request Submitted Successfully</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your request has been filed. To protect user privacy, a security waiting period of {submittedRequest.waitingPeriod} days has started.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Your Request Tracker ID</p>
              <p className="text-md font-mono font-bold mt-1 text-foreground select-all">{submittedRequest.id}</p>
              <p className="text-[10px] text-muted-foreground mt-2">Copy this ID to track your request status below.</p>
            </div>
            <button
              onClick={() => {
                setTrackId(submittedRequest.id);
                setSubmittedRequest(null);
                setTrackingRequest(null);
              }}
              className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg text-sm font-semibold transition-all w-full shadow-sm"
            >
              Track Request Status
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {!trackingRequest && (
              <div className="bg-card border border-border rounded-xl p-6 shadow-md space-y-4">
                <h3 className="text-lg font-bold">Submit New Request</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Owner's Email Address</label>
                      <input
                        type="email"
                        required
                        value={form.ownerEmail}
                        onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                        placeholder="e.g. owner@example.com"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Your Email Address</label>
                      <input
                        type="email"
                        required
                        value={form.requesterEmail}
                        onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
                        placeholder="e.g. contact@example.com"
                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.requesterName}
                      onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Reason for Emergency Access</label>
                    <textarea
                      required
                      rows={3}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      placeholder="Specify relationship, emergency scenario (hospitalization, incapacity), and urgency..."
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Supporting Info / Attachment URL (Optional)</label>
                    <input
                      type="text"
                      value={form.supportingInfo}
                      onChange={(e) => setForm({ ...form, supportingInfo: e.target.value })}
                      placeholder="Optional link to document or details..."
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground rounded-lg text-sm font-semibold transition-all w-full shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Submitting...' : 'Submit Access Request'}</span>
                  </button>
                </form>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-6 shadow-md space-y-4">
              <h3 className="text-lg font-bold">Track Request Status</h3>
              <form onSubmit={handleTrack} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  placeholder="Enter Request ID"
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-semibold transition-all shrink-0"
                >
                  Track
                </button>
              </form>

              {trackingRequest && (
                <div className="border border-border rounded-xl p-5 mt-4 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    {getStatusDisplay(trackingRequest.status).icon}
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {getStatusDisplay(trackingRequest.status).title}
                      </h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        Owner: {trackingRequest.trustedContact.user.fullName}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border font-normal leading-relaxed">
                    {getStatusDisplay(trackingRequest.status).description}
                  </p>

                  {trackingRequest.status === 'APPROVED' && trackingRequest.grant && (
                    <div className="border-t border-border pt-4">
                      <Link
                        href={`/emergency/access?token=${trackingRequest.grant.id}`}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-all w-full shadow-sm"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Enter Access Session</span>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

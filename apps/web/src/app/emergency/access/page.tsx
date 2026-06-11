'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Shield, LogOut, Clock, Download, Calendar, Lock } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  downloadUrl: string;
  category: {
    name: string;
    slug: string;
    icon: string;
  };
  subCategory?: {
    name: string;
    slug: string;
  } | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  documentNumber?: string | null;
  issuer?: string | null;
  createdAt: string;
}

function AccessSessionContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!token) {
      toast.error('No session token provided');
    }
  }, [token]);

  useEffect(() => {
    if (!sessionDetails?.expiresAt || !sessionActive) return;

    const interval = setInterval(() => {
      const remaining = new Date(sessionDetails.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setSessionActive(false);
        setTimeLeft('Expired');
        toast.error('Session has expired');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (60 * 1000));
        const secs = Math.floor((remaining % (60 * 1000)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionDetails, sessionActive]);

  const handleStartSession = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const startRes = await api.post('/emergency/access/session/start', { token });
      setSessionDetails(startRes.data);

      const docsRes = await api.get('/emergency/access/documents', {
        params: { token },
      });
      setDocuments(docsRes.data ?? []);
      setSessionActive(true);
      toast.success('Emergency access session started');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to start session. Token may be invalid or expired.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!token) return;
    try {
      await api.post('/emergency/access/session/end', { token });
      toast.success('Session ended successfully');
      setSessionActive(false);
      setSessionDetails(null);
      setDocuments([]);
      router.push('/emergency/request');
    } catch (err) {
      toast.error('Failed to end session');
    }
  };

  if (!token) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-full max-w-md space-y-4">
          <Shield className="text-destructive mx-auto h-12 w-12" />
          <h2 className="text-2xl font-bold">Invalid Portal Request</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            No secure session token was provided. Please verify the URL link from your email
            notification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-6 font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="bg-card border-border flex flex-col justify-between gap-4 rounded-xl border p-6 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Shield className="text-primary h-8 w-8 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">LifeLedger Emergency Access Session</h2>
              <p className="text-muted-foreground mt-0.5 text-xs font-normal">
                {sessionActive
                  ? `Viewing vault of ${sessionDetails?.ownerName} • Access level: Read-Only`
                  : 'Establish a secure read-only session to view critical files.'}
              </p>
            </div>
          </div>

          {sessionActive && (
            <div className="flex items-center gap-4 self-end md:self-center">
              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                <Clock className="h-4 w-4" />
                <span>Time Remaining: {timeLeft}</span>
              </div>
              <button
                onClick={handleEndSession}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>End Session</span>
              </button>
            </div>
          )}
        </div>

        {sessionActive && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-xs font-normal text-yellow-700 dark:text-yellow-400">
            <span>🛡️</span>
            <p className="opacity-95">
              <strong>Security Notice:</strong> You are in a monitored emergency access session.
              Every document viewed or downloaded is logged for auditable security checks.
            </p>
          </div>
        )}

        {!sessionActive ? (
          <div className="bg-card border-border mx-auto flex max-w-lg flex-col items-center justify-center space-y-6 rounded-xl border p-12 text-center shadow-md">
            <Lock className="text-muted-foreground/60 h-12 w-12" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Secure Verification Required</h3>
              <p className="text-muted-foreground text-sm leading-relaxed font-normal">
                An authorized request has been approved. Start the session to establish a secure,
                time-limited cryptographic environment.
              </p>
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground w-full rounded-lg px-8 py-3 text-sm font-semibold shadow-sm transition-all"
            >
              {loading ? 'Starting Session...' : 'Start Session & View Documents'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shared Vault Documents ({documents.length})</h3>

            {documents.length === 0 ? (
              <div className="bg-card border-border text-muted-foreground rounded-xl border p-12 text-center shadow-sm">
                📁 No documents have been shared in this emergency vault session.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-card border-border relative flex flex-col justify-between space-y-4 overflow-hidden rounded-xl border p-6 transition-all hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-foreground text-md leading-tight font-bold">
                            {doc.title}
                          </h4>
                          <span className="bg-primary/10 text-primary mt-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold">
                            {doc.category.name}
                          </span>
                        </div>
                        <span className="text-2xl">{doc.category.icon}</span>
                      </div>

                      {doc.description && (
                        <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed font-normal">
                          {doc.description}
                        </p>
                      )}

                      <div className="text-muted-foreground border-border/60 grid grid-cols-2 gap-2 border-t pt-3 text-[11px] font-normal">
                        {doc.issuer && (
                          <div>
                            <span className="text-foreground/80 block font-semibold">Issuer</span>
                            <span className="block truncate">{doc.issuer}</span>
                          </div>
                        )}
                        {doc.documentNumber && (
                          <div>
                            <span className="text-foreground/80 block font-semibold">
                              Doc Number
                            </span>
                            <span className="block truncate">{doc.documentNumber}</span>
                          </div>
                        )}
                        {doc.expiryDate && (
                          <div className="col-span-2 mt-1 flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                            <Calendar className="h-3 w-3" />
                            <span>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download File (Read-Only)</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccessSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans">
          <div className="text-muted-foreground animate-pulse">Loading access session...</div>
        </div>
      }
    >
      <AccessSessionContent />
    </Suspense>
  );
}

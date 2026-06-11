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
      toast.error(err.response?.data?.message || 'Failed to start session. Token may be invalid or expired.');
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full space-y-4">
          <Shield className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Invalid Portal Request</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No secure session token was provided. Please verify the URL link from your email notification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary animate-pulse" />
            <div>
              <h2 className="text-xl font-bold">LifeLedger Emergency Access Session</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal">
                {sessionActive
                  ? `Viewing vault of ${sessionDetails?.ownerName} • Access level: Read-Only`
                  : 'Establish a secure read-only session to view critical files.'}
              </p>
            </div>
          </div>

          {sessionActive && (
            <div className="flex items-center gap-4 self-end md:self-center">
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold shrink-0">
                <Clock className="h-4 w-4" />
                <span>Time Remaining: {timeLeft}</span>
              </div>
              <button
                onClick={handleEndSession}
                className="flex items-center gap-1.5 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                <span>End Session</span>
              </button>
            </div>
          )}
        </div>

        {sessionActive && (
          <div className="bg-yellow-500/5 border border-yellow-500/10 text-yellow-700 dark:text-yellow-400 p-4 rounded-xl flex items-center gap-3 text-xs font-normal">
            <span>🛡️</span>
            <p className="opacity-95">
              <strong>Security Notice:</strong> You are in a monitored emergency access session. Every document viewed or downloaded is logged for auditable security checks.
            </p>
          </div>
        )}

        {!sessionActive ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-6 max-w-lg mx-auto shadow-md">
            <Lock className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Secure Verification Required</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                An authorized request has been approved. Start the session to establish a secure, time-limited cryptographic environment.
              </p>
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="px-8 py-3 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground rounded-lg text-sm font-semibold transition-all shadow-sm w-full"
            >
              {loading ? 'Starting Session...' : 'Start Session & View Documents'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shared Vault Documents ({documents.length})</h3>

            {documents.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground shadow-sm">
                📁 No documents have been shared in this emergency vault session.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-card border border-border rounded-xl p-6 flex flex-col justify-between hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-foreground text-md leading-tight">{doc.title}</h4>
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-md mt-2">
                            {doc.category.name}
                          </span>
                        </div>
                        <span className="text-2xl">{doc.category.icon}</span>
                      </div>

                      {doc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                          {doc.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground font-normal border-t border-border/60 pt-3">
                        {doc.issuer && (
                          <div>
                            <span className="block font-semibold text-foreground/80">Issuer</span>
                            <span className="truncate block">{doc.issuer}</span>
                          </div>
                        )}
                        {doc.documentNumber && (
                          <div>
                            <span className="block font-semibold text-foreground/80">Doc Number</span>
                            <span className="truncate block">{doc.documentNumber}</span>
                          </div>
                        )}
                        {doc.expiryDate && (
                          <div className="col-span-2 mt-1 flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
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
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-xs font-semibold transition-all shadow-sm w-full"
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
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="text-muted-foreground animate-pulse">Loading access session...</div>
      </div>
    }>
      <AccessSessionContent />
    </Suspense>
  );
}

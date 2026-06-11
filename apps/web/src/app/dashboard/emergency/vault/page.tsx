'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Check, Trash2, Lock, Cpu, Sparkles } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  category: {
    name: string;
    slug: string;
  };
}

interface VaultItem {
  id: string;
  documentId: string;
  document: Document;
}

interface AISuggestion {
  documentId: string;
  title: string;
  categoryName: string;
  reason: string;
}

interface AIMissing {
  categorySlug: string;
  categoryName: string;
  documentType: string;
  reason: string;
}

export default function EmergencyVaultPage() {
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [missing, setMissing] = useState<AIMissing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [vaultRes, docsRes, aiRes] = await Promise.all([
        api.get('/emergency/vault/documents'),
        api.get('/documents'),
        api.get('/emergency/vault/ai-suggestions'),
      ]);

      setVaultItems(vaultRes.data ?? []);
      const docsList = docsRes.data?.documents || docsRes.data || [];
      setAllDocs(docsList);
      setSuggestions(aiRes.data?.suggestions ?? []);
      setMissing(aiRes.data?.missing ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load vault configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToVault = async (docId: string) => {
    try {
      await api.post('/emergency/vault/documents', { documentId: docId });
      toast.success('Document added to emergency vault');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add document');
    }
  };

  const handleRemoveFromVault = async (docId: string) => {
    try {
      await api.delete(`/emergency/vault/documents/${docId}`);
      toast.success('Document removed from emergency vault');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove document');
    }
  };

  const getUnvaultedDocs = () => {
    const vaultDocIds = new Set(vaultItems.map((item) => item.documentId));
    return allDocs.filter((doc) => !vaultDocIds.has(doc.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading Emergency Vault...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* AI Intelligence Header */}
      {(suggestions.length > 0 || missing.length > 0) && (
        <div className="bg-card border-primary/20 relative space-y-4 overflow-hidden rounded-xl border p-6 shadow-sm">
          <div className="pointer-events-none absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="text-primary h-24 w-24" />
          </div>
          <div className="text-primary flex items-center gap-2">
            <Cpu className="h-5 w-5 animate-pulse" />
            <h3 className="text-lg font-bold">AI Vault Recommendations</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Our AI has scanned your documents and identified items that are highly recommended to
            add or upload for emergency situations.
          </p>

          <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Suggested documents to toggle */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Suggested to Add
                </h4>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.documentId}
                      className="bg-muted/40 border-border flex items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-foreground text-sm font-semibold">{s.title}</p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                          {s.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddToVault(s.documentId)}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing items */}
            {missing.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Missing Critical Items
                </h4>
                <div className="space-y-2">
                  {missing.map((m) => (
                    <div
                      key={m.categorySlug}
                      className="flex items-start gap-3 rounded-lg border border-red-500/10 bg-red-500/5 p-3"
                    >
                      <span className="mt-0.5 text-lg">⚠️</span>
                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                          Missing: {m.documentType}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">{m.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2/3: Vault Documents */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Documents in Emergency Vault ({vaultItems.length})
              </h3>
              <p className="text-muted-foreground mt-0.5 text-sm leading-normal font-normal">
                Only these documents will be shared with your trusted contacts during an approved
                session.
              </p>
            </div>
          </div>

          {vaultItems.length === 0 ? (
            <div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center shadow-sm">
              <div className="bg-muted text-muted-foreground mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Lock className="h-6 w-6" />
              </div>
              <h4 className="text-foreground font-sans text-lg font-semibold">Vault is Empty</h4>
              <p className="text-muted-foreground mt-1 mb-6 max-w-sm text-sm font-normal">
                You haven't designated any documents for emergency sharing yet. Use the selector on
                the right to add some.
              </p>
            </div>
          ) : (
            <div className="bg-card border-border divide-border divide-y overflow-hidden rounded-xl border shadow-sm">
              {vaultItems.map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-muted/30 flex items-center justify-between p-4 transition-colors"
                >
                  <div>
                    <h4 className="text-foreground text-sm font-bold">{item.document.title}</h4>
                    <span className="bg-muted text-muted-foreground mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold">
                      {item.document.category.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromVault(item.documentId)}
                    className="text-muted-foreground hover:text-destructive rounded-lg p-2 transition-colors hover:bg-red-500/10"
                    title="Remove from vault"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1/3: Document Selector */}
        <div className="bg-card border-border h-fit space-y-4 rounded-xl border p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Lock className="text-primary h-5 w-5 animate-pulse" /> Manage Vault Items
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Select from your uploaded documents to add them to your Emergency Vault. Checked
            documents are included.
          </p>

          <div className="border-border border-t pt-4">
            {allDocs.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No documents found in your LifeLedger account. Upload documents in your main
                dashboard first.
              </div>
            ) : (
              <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
                {allDocs.map((doc) => {
                  const isInVault = vaultItems.some((item) => item.documentId === doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() =>
                        isInVault ? handleRemoveFromVault(doc.id) : handleAddToVault(doc.id)
                      }
                      className={`hover:border-primary/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all duration-200 select-none ${
                        isInVault ? 'bg-primary/5 border-primary/30' : 'border-border'
                      }`}
                    >
                      <div className="max-w-[70%]">
                        <p className="text-foreground truncate text-xs font-semibold">
                          {doc.title}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {doc.category.name}
                        </p>
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                          isInVault
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30 bg-background'
                        }`}
                      >
                        {isInVault && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

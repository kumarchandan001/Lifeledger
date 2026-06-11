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
        <div className="bg-card border border-primary/20 rounded-xl p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="h-24 w-24 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Cpu className="h-5 w-5 animate-pulse" />
            <h3 className="font-bold text-lg">AI Vault Recommendations</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Our AI has scanned your documents and identified items that are highly recommended to add or upload for emergency situations.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Suggested documents to toggle */}
            {suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggested to Add</h4>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.documentId}
                      className="bg-muted/40 border border-border rounded-lg p-3 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-semibold text-sm text-foreground">{s.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.reason}</p>
                      </div>
                      <button
                        onClick={() => handleAddToVault(s.documentId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg text-xs font-semibold transition-all shrink-0"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Missing Critical Items</h4>
                <div className="space-y-2">
                  {missing.map((m) => (
                    <div
                      key={m.categorySlug}
                      className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex items-start gap-3"
                    >
                      <span className="text-lg mt-0.5">⚠️</span>
                      <div>
                        <p className="font-semibold text-sm text-red-700 dark:text-red-400">Missing: {m.documentType}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.reason}</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2/3: Vault Documents */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Documents in Emergency Vault ({vaultItems.length})</h3>
              <p className="text-sm text-muted-foreground mt-0.5 font-normal leading-normal">
                Only these documents will be shared with your trusted contacts during an approved session.
              </p>
            </div>
          </div>

          {vaultItems.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-lg text-foreground font-sans">Vault is Empty</h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6 font-normal">
                You haven't designated any documents for emergency sharing yet. Use the selector on the right to add some.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden shadow-sm">
              {vaultItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{item.document.title}</h4>
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-md mt-1">
                      {item.document.category.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFromVault(item.documentId)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-red-500/10 rounded-lg transition-colors"
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
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 h-fit">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary animate-pulse" /> Manage Vault Items
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Select from your uploaded documents to add them to your Emergency Vault. Checked documents are included.
          </p>

          <div className="border-t border-border pt-4">
            {allDocs.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No documents found in your LifeLedger account. Upload documents in your main dashboard first.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {allDocs.map((doc) => {
                  const isInVault = vaultItems.some((item) => item.documentId === doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => (isInVault ? handleRemoveFromVault(doc.id) : handleAddToVault(doc.id))}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:border-primary/50 select-none ${
                        isInVault ? 'bg-primary/5 border-primary/30' : 'border-border'
                      }`}
                    >
                      <div className="max-w-[70%]">
                        <p className="font-semibold text-xs text-foreground truncate">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{doc.category.name}</p>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
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

'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, X, FileText, FolderOpen } from 'lucide-react';

interface VaultDocument {
  id: string;
  documentId: string;
  category: string;
  notes?: string;
  createdAt: string;
  document: { id: string; title: string; fileName: string; category?: { name: string }; subCategory?: { name: string } };
}

const CATEGORIES = ['FAMILY', 'INSURANCE', 'PROPERTY', 'MEDICAL', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'NOTES'];
const CAT_COLORS: Record<string, string> = {
  FAMILY: 'bg-blue-500/10 text-blue-600', INSURANCE: 'bg-emerald-500/10 text-emerald-600',
  PROPERTY: 'bg-amber-500/10 text-amber-600', MEDICAL: 'bg-red-500/10 text-red-600',
  FINANCIAL: 'bg-purple-500/10 text-purple-600', BUSINESS: 'bg-cyan-500/10 text-cyan-600',
  PERSONAL: 'bg-pink-500/10 text-pink-600', NOTES: 'bg-gray-500/10 text-gray-600',
};

export default function LegacyVaultPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userDocs, setUserDocs] = useState<Array<{ id: string; title: string; fileName: string }>>([]);
  const [formData, setFormData] = useState({ documentId: '', category: 'PERSONAL', notes: '' });
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await api.get('/legacy/vault/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch vault documents', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const openAddForm = async () => {
    try {
      const res = await api.get('/documents');
      const docs = res.data?.data || res.data || [];
      setUserDocs(docs);
    } catch { setUserDocs([]); }
    setFormData({ documentId: '', category: 'PERSONAL', notes: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/legacy/vault/documents', formData);
      setShowForm(false);
      await fetchDocuments();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add document');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (docId: string) => {
    if (!confirm('Remove this document from the legacy vault?')) return;
    try {
      await api.delete(`/legacy/vault/documents/${docId}`);
      await fetchDocuments();
    } catch { alert('Failed to remove document'); }
  };

  const filtered = filter ? documents.filter((d) => d.category === filter) : documents;

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading vault...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Legacy Vault</h3>
          <p className="text-muted-foreground text-sm">Documents to be passed on to beneficiaries.</p>
        </div>
        <button onClick={openAddForm} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> Add Document
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
          All ({documents.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = documents.filter((d) => d.category === cat).length;
          if (count === 0) return null;
          return (
            <button key={cat} onClick={() => setFilter(cat)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {cat.charAt(0) + cat.slice(1).toLowerCase()} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <FolderOpen className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
          <p className="text-muted-foreground mt-3 text-lg">No documents in vault</p>
          <p className="text-muted-foreground mt-1 text-sm">Add important documents for your beneficiaries.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div key={doc.id} className="bg-card border-border flex items-center justify-between rounded-xl border p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{doc.document.title || doc.document.fileName}</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[doc.category] || 'bg-gray-500/10 text-gray-600'}`}>
                      {doc.category}
                    </span>
                    {doc.notes && <span className="text-muted-foreground text-xs">{doc.notes}</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => handleRemove(doc.documentId)} className="text-muted-foreground hover:text-destructive rounded-lg p-2 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Document to Vault</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Document *</label>
                <select value={formData.documentId} onChange={(e) => setFormData({ ...formData, documentId: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">Choose a document...</option>
                  {userDocs.map((d) => <option key={d.id} value={d.id}>{d.title || d.fileName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Category *</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Adding...' : 'Add to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

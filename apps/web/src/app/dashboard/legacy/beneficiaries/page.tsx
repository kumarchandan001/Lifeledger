'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { UserPlus, Edit2, Trash2, Download, X, Check } from 'lucide-react';

interface Beneficiary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  status: string;
  notes?: string;
  priority: number;
  _count?: { digitalAssets: number; accessRequests: number };
  planBeneficiaries?: Array<{ plan: { id: string; name: string; type: string } }>;
}

const RELATIONSHIPS = ['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'EXECUTOR', 'LAWYER', 'FRIEND', 'OTHER'];
const REL_LABELS: Record<string, string> = {
  SPOUSE: '💑 Spouse', PARENT: '👨‍👩‍👦 Parent', CHILD: '👶 Child', SIBLING: '🤝 Sibling',
  EXECUTOR: '⚖️ Executor', LAWYER: '📜 Lawyer', FRIEND: '🫂 Friend', OTHER: '👤 Other',
};

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', relationship: 'SPOUSE', notes: '', priority: 1 });
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchBeneficiaries = useCallback(async () => {
    try {
      const res = await api.get('/legacy/beneficiaries');
      setBeneficiaries(res.data);
    } catch (err) {
      console.error('Failed to fetch beneficiaries', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBeneficiaries(); }, [fetchBeneficiaries]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', email: '', phone: '', relationship: 'SPOUSE', notes: '', priority: 1 });
    setShowForm(true);
  };

  const openEdit = (b: Beneficiary) => {
    setEditing(b);
    setFormData({ name: b.name, email: b.email, phone: b.phone || '', relationship: b.relationship, notes: b.notes || '', priority: b.priority });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/legacy/beneficiaries/${editing.id}`, formData);
      } else {
        await api.post('/legacy/beneficiaries', formData);
      }
      setShowForm(false);
      await fetchBeneficiaries();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save beneficiary');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this beneficiary?')) return;
    try {
      await api.delete(`/legacy/beneficiaries/${id}`);
      await fetchBeneficiaries();
    } catch (err) {
      alert('Failed to remove beneficiary');
    }
  };

  const handleImport = async (source: 'family' | 'contacts') => {
    try {
      const endpoint = source === 'family' ? '/legacy/beneficiaries/import/family' : '/legacy/beneficiaries/import/contacts';
      const res = await api.post(endpoint);
      setImportResult(`Imported ${res.data.count} ${source === 'family' ? 'family members' : 'trusted contacts'}: ${res.data.imported.join(', ') || 'None new'}`);
      await fetchBeneficiaries();
      setTimeout(() => setImportResult(null), 5000);
    } catch (err) {
      alert('Import failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading beneficiaries...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-semibold">Beneficiaries</h3>
          <p className="text-muted-foreground text-sm">Manage the people who will receive your legacy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleImport('family')} className="bg-muted hover:bg-muted/80 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors">
            <Download className="h-4 w-4" /> Import Family
          </button>
          <button onClick={() => handleImport('contacts')} className="bg-muted hover:bg-muted/80 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors">
            <Download className="h-4 w-4" /> Import Contacts
          </button>
          <button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            <UserPlus className="h-4 w-4" /> Add Beneficiary
          </button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="mr-2 inline h-4 w-4" />{importResult}
        </div>
      )}

      {/* List */}
      {beneficiaries.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <p className="text-muted-foreground text-lg">No beneficiaries yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Add your first beneficiary to begin your legacy plan.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {beneficiaries.map((b) => (
            <div key={b.id} className="bg-card border-border rounded-xl border p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-lg font-bold text-white">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold">{b.name}</h4>
                    <p className="text-muted-foreground text-sm">{b.email}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(b)} className="text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleRemove(b.id)} className="text-muted-foreground hover:text-destructive rounded-lg p-2 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                  {REL_LABELS[b.relationship] || b.relationship}
                </span>
                <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Priority: {b.priority}
                </span>
                {b._count && b._count.digitalAssets > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {b._count.digitalAssets} assets
                  </span>
                )}
              </div>
              {b.planBeneficiaries && b.planBeneficiaries.length > 0 && (
                <div className="text-muted-foreground mt-2 text-xs">
                  Plans: {b.planBeneficiaries.map((pb) => pb.plan.name).join(', ')}
                </div>
              )}
              {b.notes && <p className="text-muted-foreground mt-2 text-xs">{b.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Beneficiary</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name *</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Relationship *</label>
                <select value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {RELATIONSHIPS.map((r) => <option key={r} value={r}>{REL_LABELS[r]?.replace(/^[^\s]+\s/, '') || r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, ScrollText } from 'lucide-react';

interface Instruction {
  id: string;
  title: string;
  content: string;
  category: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['FAMILY', 'FINANCIAL', 'MEDICAL', 'PROPERTY', 'BUSINESS', 'PERSONAL'];
const CAT_ICONS: Record<string, string> = {
  FAMILY: '👪', FINANCIAL: '💰', MEDICAL: '🏥', PROPERTY: '🏠', BUSINESS: '🏢', PERSONAL: '🧑',
};

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Instruction | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'FINANCIAL' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchInstructions = useCallback(async () => {
    try {
      const url = filter ? `/legacy/instructions?category=${filter}` : '/legacy/instructions';
      const res = await api.get(url);
      setInstructions(res.data);
    } catch (err) {
      console.error('Failed to fetch instructions', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchInstructions(); }, [fetchInstructions]);

  const openCreate = () => { setEditing(null); setFormData({ title: '', content: '', category: 'FINANCIAL' }); setShowForm(true); };
  const openEdit = (i: Instruction) => { setEditing(i); setFormData({ title: i.title, content: i.content, category: i.category }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.patch(`/legacy/instructions/${editing.id}`, formData); }
      else { await api.post('/legacy/instructions', formData); }
      setShowForm(false);
      await fetchInstructions();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Delete this instruction?')) return;
    try { await api.delete(`/legacy/instructions/${id}`); await fetchInstructions(); }
    catch { alert('Failed to delete'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading instructions...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Legacy Instructions</h3>
          <p className="text-muted-foreground text-sm">Written instructions for your beneficiaries.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" /> Write Instruction
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>All</button>
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {CAT_ICONS[cat]} {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {instructions.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <ScrollText className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
          <p className="text-muted-foreground mt-3 text-lg">No instructions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map((inst) => (
            <div key={inst.id} className="bg-card border-border rounded-xl border p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CAT_ICONS[inst.category] || '📝'}</span>
                    <h4 className="font-semibold">{inst.title}</h4>
                    <span className="text-muted-foreground rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium">v{inst.version}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{inst.content}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(inst)} className="text-muted-foreground hover:text-foreground rounded-lg p-2"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleRemove(inst.id)} className="text-muted-foreground hover:text-destructive rounded-lg p-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Write'} Instruction</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Category *</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_ICONS[c]} {c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Content *</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={8} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

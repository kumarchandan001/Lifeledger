'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, Mail, Lock } from 'lucide-react';

interface PersonalMessage {
  id: string;
  type: string;
  title: string;
  content: string;
  recipientName?: string;
  isPrivate: boolean;
  createdAt: string;
}

const MSG_TYPES = ['LETTER', 'NOTE', 'FUTURE_MESSAGE', 'FAMILY_MESSAGE'];
const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  LETTER: { icon: '✉️', label: 'Letter' },
  NOTE: { icon: '📝', label: 'Note' },
  FUTURE_MESSAGE: { icon: '⏳', label: 'Future Message' },
  FAMILY_MESSAGE: { icon: '👪', label: 'Family Message' },
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PersonalMessage | null>(null);
  const [formData, setFormData] = useState({ type: 'LETTER', title: '', content: '', recipientName: '', isPrivate: true });
  const [saving, setSaving] = useState(false);

  const fetchMessages = useCallback(async () => {
    try { const res = await api.get('/legacy/messages'); setMessages(res.data); }
    catch (err) { console.error('Failed to fetch messages', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const openCreate = () => { setEditing(null); setFormData({ type: 'LETTER', title: '', content: '', recipientName: '', isPrivate: true }); setShowForm(true); };
  const openEdit = (m: PersonalMessage) => { setEditing(m); setFormData({ type: m.type, title: m.title, content: m.content, recipientName: m.recipientName || '', isPrivate: m.isPrivate }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.patch(`/legacy/messages/${editing.id}`, formData); }
      else { await api.post('/legacy/messages', formData); }
      setShowForm(false);
      await fetchMessages();
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try { await api.delete(`/legacy/messages/${id}`); await fetchMessages(); }
    catch { alert('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading messages...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Personal Messages</h3>
          <p className="text-muted-foreground text-sm">Letters, notes, and messages for your loved ones.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" /> Write Message
        </button>
      </div>

      {messages.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <Mail className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
          <p className="text-muted-foreground mt-3 text-lg">No messages yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Write personal letters and notes for your beneficiaries.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {messages.map((msg) => {
            const typeInfo = TYPE_LABELS[msg.type] || { icon: '📝', label: msg.type };
            return (
              <div key={msg.id} className="bg-card border-border rounded-xl border p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <div>
                      <h4 className="font-semibold">{msg.title}</h4>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{typeInfo.label}</span>
                        {msg.recipientName && <span className="text-muted-foreground text-xs">→ {msg.recipientName}</span>}
                        {msg.isPrivate && <Lock className="text-muted-foreground h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(msg)} className="text-muted-foreground hover:text-foreground rounded-lg p-2"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleRemove(msg.id)} className="text-muted-foreground hover:text-destructive rounded-lg p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="text-muted-foreground mt-3 line-clamp-3 text-sm">{msg.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Write'} Message</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {MSG_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]?.icon} {TYPE_LABELS[t]?.label || t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Recipient Name</label>
                <input value={formData.recipientName} onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Who is this for?" />
              </div>
              <div>
                <label className="text-sm font-medium">Message *</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required rows={8} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPrivate" checked={formData.isPrivate} onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })} className="rounded" />
                <label htmlFor="isPrivate" className="text-sm">Mark as private (hidden from non-designated viewers)</label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

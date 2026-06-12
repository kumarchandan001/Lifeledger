'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react';

interface LegacyPlan {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  beneficiaries: Array<{ beneficiary: { id: string; name: string; email: string; relationship: string } }>;
  _count: { beneficiaries: number };
  createdAt: string;
}

const PLAN_TYPES = ['FAMILY', 'FINANCIAL', 'BUSINESS', 'PERSONAL', 'CUSTOM'];
const TYPE_ICONS: Record<string, string> = {
  FAMILY: '👪', FINANCIAL: '💰', BUSINESS: '🏢', PERSONAL: '🧑', CUSTOM: '🎯',
};

export default function PlansPage() {
  const [plans, setPlans] = useState<LegacyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LegacyPlan | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'FAMILY', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await api.get('/legacy/plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch plans', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', type: 'FAMILY', description: '' });
    setShowForm(true);
  };

  const openEdit = (p: LegacyPlan) => {
    setEditing(p);
    setFormData({ name: p.name, type: p.type, description: p.description || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/legacy/plans/${editing.id}`, formData);
      } else {
        await api.post('/legacy/plans', formData);
      }
      setShowForm(false);
      await fetchPlans();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this legacy plan?')) return;
    try {
      await api.delete(`/legacy/plans/${id}`);
      await fetchPlans();
    } catch (err) {
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Legacy Plans</h3>
          <p className="text-muted-foreground text-sm">Organize your legacy into structured plans.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" /> Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <p className="text-muted-foreground text-lg">No legacy plans yet</p>
          <p className="text-muted-foreground mt-1 text-sm">Create your first plan to organize your digital legacy.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-card border-border rounded-xl border p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[plan.type] || '📋'}</span>
                  <div>
                    <h4 className="font-semibold">{plan.name}</h4>
                    <span className="text-muted-foreground text-xs font-medium uppercase">{plan.type}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(plan)} className="text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="text-muted-foreground hover:text-destructive rounded-lg p-2 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {plan.description && (
                <p className="text-muted-foreground mt-3 text-sm">{plan.description}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Users className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-sm">{plan._count.beneficiaries} beneficiaries assigned</span>
              </div>
              {plan.beneficiaries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.beneficiaries.map((pb) => (
                    <span key={pb.beneficiary.id} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                      {pb.beneficiary.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Create'} Legacy Plan</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Plan Name *</label>
                <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Plan Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {PLAN_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted hover:bg-muted/80 rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
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

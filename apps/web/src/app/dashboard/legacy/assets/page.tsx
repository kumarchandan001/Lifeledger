'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, X, Building2 } from 'lucide-react';

interface DigitalAsset {
  id: string;
  assetType: string;
  serviceName: string;
  accountRef?: string;
  institutionName?: string;
  notes?: string;
  assignedBeneficiary?: { id: string; name: string; email: string; relationship: string };
  createdAt: string;
}

const ASSET_TYPES = ['BANK_ACCOUNT', 'INSURANCE_POLICY', 'INVESTMENT', 'PROPERTY', 'BUSINESS_ASSET', 'ONLINE_ACCOUNT', 'SUBSCRIPTION', 'EMAIL', 'SOCIAL_MEDIA', 'DOMAIN', 'OTHER'];
const TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  BANK_ACCOUNT: { icon: '🏦', label: 'Bank Account' },
  INSURANCE_POLICY: { icon: '🛡️', label: 'Insurance Policy' },
  INVESTMENT: { icon: '📈', label: 'Investment' },
  PROPERTY: { icon: '🏠', label: 'Property' },
  BUSINESS_ASSET: { icon: '🏢', label: 'Business Asset' },
  ONLINE_ACCOUNT: { icon: '🌐', label: 'Online Account' },
  SUBSCRIPTION: { icon: '📱', label: 'Subscription' },
  EMAIL: { icon: '📧', label: 'Email Account' },
  SOCIAL_MEDIA: { icon: '💬', label: 'Social Media' },
  DOMAIN: { icon: '🔗', label: 'Domain' },
  OTHER: { icon: '📦', label: 'Other' },
};

interface Beneficiary { id: string; name: string; email: string; }

export default function AssetsPage() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DigitalAsset | null>(null);
  const [formData, setFormData] = useState({ assetType: 'BANK_ACCOUNT', serviceName: '', accountRef: '', institutionName: '', notes: '', assignedBeneficiaryId: '' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchAssets = useCallback(async () => {
    try {
      const [assetsRes, benRes] = await Promise.all([
        api.get(filter ? `/legacy/assets?assetType=${filter}` : '/legacy/assets'),
        api.get('/legacy/beneficiaries'),
      ]);
      setAssets(assetsRes.data);
      setBeneficiaries(benRes.data);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const openCreate = () => { setEditing(null); setFormData({ assetType: 'BANK_ACCOUNT', serviceName: '', accountRef: '', institutionName: '', notes: '', assignedBeneficiaryId: '' }); setShowForm(true); };
  const openEdit = (a: DigitalAsset) => { setEditing(a); setFormData({ assetType: a.assetType, serviceName: a.serviceName, accountRef: a.accountRef || '', institutionName: a.institutionName || '', notes: a.notes || '', assignedBeneficiaryId: a.assignedBeneficiary?.id || '' }); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...formData, assignedBeneficiaryId: formData.assignedBeneficiaryId || null };
    try {
      if (editing) { await api.patch(`/legacy/assets/${editing.id}`, payload); }
      else { await api.post('/legacy/assets', payload); }
      setShowForm(false);
      await fetchAssets();
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this digital asset?')) return;
    try { await api.delete(`/legacy/assets/${id}`); await fetchAssets(); }
    catch { alert('Failed to remove'); }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="text-muted-foreground animate-pulse">Loading assets...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Digital Assets</h3>
          <p className="text-muted-foreground text-sm">Register your accounts and assets (metadata only — never store passwords or PINs).</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium">
          <Plus className="h-4 w-4" /> Register Asset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${!filter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>All ({assets.length})</button>
        {['BANK_ACCOUNT', 'INSURANCE_POLICY', 'INVESTMENT', 'PROPERTY', 'ONLINE_ACCOUNT'].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {TYPE_LABELS[t]?.icon} {TYPE_LABELS[t]?.label}
          </button>
        ))}
      </div>

      {assets.length === 0 ? (
        <div className="bg-card border-border rounded-xl border p-12 text-center">
          <Building2 className="text-muted-foreground mx-auto h-12 w-12 opacity-50" />
          <p className="text-muted-foreground mt-3 text-lg">No digital assets registered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => {
            const typeInfo = TYPE_LABELS[asset.assetType] || { icon: '📦', label: asset.assetType };
            return (
              <div key={asset.id} className="bg-card border-border flex items-center justify-between rounded-xl border p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div>
                    <h4 className="font-semibold">{asset.serviceName}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-xs">{typeInfo.label}</span>
                      {asset.institutionName && <span className="text-muted-foreground text-xs">• {asset.institutionName}</span>}
                      {asset.accountRef && <span className="rounded bg-gray-500/10 px-1.5 py-0.5 text-xs font-mono">{asset.accountRef}</span>}
                      {asset.assignedBeneficiary && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                          → {asset.assignedBeneficiary.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(asset)} className="text-muted-foreground hover:text-foreground rounded-lg p-2"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleRemove(asset.id)} className="text-muted-foreground hover:text-destructive rounded-lg p-2"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Register'} Digital Asset</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Asset Type *</label>
                <select value={formData.assetType} onChange={(e) => setFormData({ ...formData, assetType: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]?.icon} {TYPE_LABELS[t]?.label || t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Service / Account Name *</label>
                <input value={formData.serviceName} onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })} required className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., State Bank of India" />
              </div>
              <div>
                <label className="text-sm font-medium">Account Reference</label>
                <input value={formData.accountRef} onChange={(e) => setFormData({ ...formData, accountRef: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., XXXX-1234 (no full numbers)" />
              </div>
              <div>
                <label className="text-sm font-medium">Institution Name</label>
                <input value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Assign to Beneficiary</label>
                <select value={formData.assignedBeneficiaryId} onChange={(e) => setFormData({ ...formData, assignedBeneficiaryId: e.target.value })} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">None</option>
                  {beneficiaries.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.email})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="border-input bg-background mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="bg-muted rounded-lg px-4 py-2 text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Save, ShieldAlert, Check } from 'lucide-react';

export default function SettingsPage() {
  const [waitingPeriod, setWaitingPeriod] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get('/auth/me');
        const profile = res.data?.data || res.data || {};
        setWaitingPeriod(profile.emergencyWaitingPeriod ?? 7);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/emergency/settings', {
        emergencyWaitingPeriod: waitingPeriod,
      });
      toast.success('Emergency settings updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse">Loading settings...</div>
      </div>
    );
  }

  const DURATIONS = [
    { value: 3, label: '3 Days', description: 'Fastest escalation. Best if your contacts check in daily or monitor health closely.' },
    { value: 7, label: '7 Days', description: 'Recommended balance. Gives you ample time to intercept unauthorized requests.' },
    { value: 14, label: '14 Days', description: 'Conservative security. Suitable if you travel off-grid or lack internet access regularly.' },
    { value: 30, label: '30 Days', description: 'Maximum security. Longest period before automatic escalation is authorized.' },
  ];

  return (
    <div className="space-y-6 max-w-2xl font-sans">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Security Waiting Period</h3>
          <p className="text-sm text-muted-foreground mt-0.5 font-normal">
            Configure how long the system waits for your response before automatically escalating access requests.
          </p>
        </div>

        <div className="space-y-3">
          {DURATIONS.map((d) => {
            const isSelected = waitingPeriod === d.value;
            return (
              <div
                key={d.value}
                onClick={() => setWaitingPeriod(d.value)}
                className={`p-4 border rounded-xl cursor-pointer hover:border-primary/50 select-none flex items-start justify-between gap-4 transition-all duration-200 ${
                  isSelected ? 'bg-primary/5 border-primary/40' : 'border-border'
                }`}
              >
                <div>
                  <h4 className="font-bold text-sm text-foreground">{d.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1 font-normal leading-normal">{d.description}</p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 bg-background'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/10 p-4 rounded-xl flex items-start gap-3 text-yellow-700 dark:text-yellow-400">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-xs leading-normal font-normal">
            <p className="font-semibold">Privacy First Guarantee</p>
            <p className="mt-1 opacity-90 leading-relaxed">
              During this waiting period, you will receive multiple reminders via email and in-app notifications. If you reject the request at any time, access will be blocked immediately.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

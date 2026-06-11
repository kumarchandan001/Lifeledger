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
    {
      value: 3,
      label: '3 Days',
      description:
        'Fastest escalation. Best if your contacts check in daily or monitor health closely.',
    },
    {
      value: 7,
      label: '7 Days',
      description: 'Recommended balance. Gives you ample time to intercept unauthorized requests.',
    },
    {
      value: 14,
      label: '14 Days',
      description:
        'Conservative security. Suitable if you travel off-grid or lack internet access regularly.',
    },
    {
      value: 30,
      label: '30 Days',
      description: 'Maximum security. Longest period before automatic escalation is authorized.',
    },
  ];

  return (
    <div className="max-w-2xl space-y-6 font-sans">
      <div className="bg-card border-border space-y-6 rounded-xl border p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">Security Waiting Period</h3>
          <p className="text-muted-foreground mt-0.5 text-sm font-normal">
            Configure how long the system waits for your response before automatically escalating
            access requests.
          </p>
        </div>

        <div className="space-y-3">
          {DURATIONS.map((d) => {
            const isSelected = waitingPeriod === d.value;
            return (
              <div
                key={d.value}
                onClick={() => setWaitingPeriod(d.value)}
                className={`hover:border-primary/50 flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-4 transition-all duration-200 select-none ${
                  isSelected ? 'bg-primary/5 border-primary/40' : 'border-border'
                }`}
              >
                <div>
                  <h4 className="text-foreground text-sm font-bold">{d.label}</h4>
                  <p className="text-muted-foreground mt-1 text-xs leading-normal font-normal">
                    {d.description}
                  </p>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 bg-background'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-yellow-500/10 bg-yellow-500/5 p-4 text-yellow-700 dark:text-yellow-400">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-xs leading-normal font-normal">
            <p className="font-semibold">Privacy First Guarantee</p>
            <p className="mt-1 leading-relaxed opacity-90">
              During this waiting period, you will receive multiple reminders via email and in-app
              notifications. If you reject the request at any time, access will be blocked
              immediately.
            </p>
          </div>
        </div>

        <div className="border-border flex justify-end border-t pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground flex items-center space-x-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

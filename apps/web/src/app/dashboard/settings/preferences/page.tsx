'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import './preferences.css';

interface Preferences {
  notify90Days: boolean;
  notify60Days: boolean;
  notify30Days: boolean;
  notify7Days: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const EXPIRY_TOGGLES: { key: keyof Preferences; title: string; desc: string }[] = [
  { key: 'notify90Days', title: '90 Days Before', desc: 'Get notified 3 months before expiry' },
  { key: 'notify60Days', title: '60 Days Before', desc: 'Get notified 2 months before expiry' },
  { key: 'notify30Days', title: '30 Days Before', desc: 'Get notified 1 month before expiry' },
  { key: 'notify7Days', title: '7 Days Before', desc: 'Get notified 1 week before expiry' },
];

const CHANNEL_TOGGLES: { key: keyof Preferences; title: string; desc: string }[] = [
  { key: 'emailEnabled', title: 'Email Notifications', desc: 'Receive notifications via email' },
  { key: 'inAppEnabled', title: 'In-App Notifications', desc: 'Show notifications in the dashboard' },
];

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await api.get('/notification-preferences');
      setPreferences(res.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = async (key: keyof Preferences) => {
    if (!preferences) return;

    const newValue = !preferences[key];
    const newPreferences = { ...preferences, [key]: newValue };
    setPreferences(newPreferences);

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');

    try {
      await api.patch('/notification-preferences', { [key]: newValue });
      setSaveStatus('saved');

      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch {
      // Revert on error
      setPreferences(preferences);
      setSaveStatus('error');

      saveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  };

  if (loading) {
    return <div className="preferences-loading">Loading preferences...</div>;
  }

  if (!preferences) {
    return <div className="preferences-loading">Failed to load preferences</div>;
  }

  return (
    <div className="preferences-page">
      {/* Header */}
      <div className="preferences-header">
        <h2>Notification Preferences</h2>
        <p>Choose when and how you want to be notified about document expiry.</p>
      </div>

      {/* Expiry Reminders */}
      <div className="pref-section">
        <div className="pref-section-title">⏰ Expiry Reminders</div>
        <div className="pref-section-desc">
          Choose when you want to be reminded about upcoming document expirations.
        </div>

        {EXPIRY_TOGGLES.map((toggle) => (
          <div key={toggle.key} className="pref-row">
            <div className="pref-label">
              <span className="pref-label-title">{toggle.title}</span>
              <span className="pref-label-desc">{toggle.desc}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences[toggle.key]}
                onChange={() => handleToggle(toggle.key)}
                id={`toggle-${toggle.key}`}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      {/* Notification Channels */}
      <div className="pref-section">
        <div className="pref-section-title">📨 Notification Channels</div>
        <div className="pref-section-desc">
          Control how notifications are delivered to you.
        </div>

        {CHANNEL_TOGGLES.map((toggle) => (
          <div key={toggle.key} className="pref-row">
            <div className="pref-label">
              <span className="pref-label-title">{toggle.title}</span>
              <span className="pref-label-desc">{toggle.desc}</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={preferences[toggle.key]}
                onChange={() => handleToggle(toggle.key)}
                id={`toggle-${toggle.key}`}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      {/* Save Status */}
      {saveStatus === 'saving' && (
        <div className="save-indicator success">Saving...</div>
      )}
      {saveStatus === 'saved' && (
        <div className="save-indicator success">✓ Preferences saved</div>
      )}
      {saveStatus === 'error' && (
        <div className="save-indicator error">✕ Failed to save. Please try again.</div>
      )}
    </div>
  );
}

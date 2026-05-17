/**
 * useSettings — Global settings hook
 * Key names EXACTLY match what SettingsPage.jsx reads/writes.
 * Source of truth: Supabase (user_settings JSONB) + localStorage cache.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const SETTING_DEFAULTS = {
  // Detection
  sensitivityLevel: 'Medium',

  // Phishing
  urlScanEnabled: true,
  urlStrictMode: false,
  urlDetailedAnalysis: true,

  // Alerts
  alertsEnabled: true,
  alertLogin: true,
  alertIDS: true,
  alertPhishing: true,
  emailNotifications: false,

  // Activity
  activityTracking: true,
  dataRetentionDays: 30,

  // Appearance
  theme: 'dark',
  accentColor: '#6366f1',
  dashLayout: 'default',

  // Security
  twoFA: false,
};

const LS_KEY = 'smartsec_settings_v2';

function merge(saved) {
  return { ...SETTING_DEFAULTS, ...(saved || {}) };
}

export function useSettings() {
  const { user, saveSettings } = useAuth();

  const [settings, setSettings] = useState(() => {
    const fromUser =
      user?.user_settings && Object.keys(user.user_settings).length > 0
        ? user.user_settings
        : null;
    try {
      const fromLS = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      return merge(fromUser || fromLS);
    } catch {
      return merge(fromUser);
    }
  });

  // Re-sync from Supabase when user object loads
  useEffect(() => {
    if (user?.user_settings && Object.keys(user.user_settings).length > 0) {
      const merged = merge(user.user_settings);
      setSettings(merged);
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
    }
  }, [user?.id]);

  // update(key, value) — called by SettingsPage toggles
  const update = useCallback(
    (key, value) => {
      setSettings(prev => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        if (saveSettings) saveSettings(next);
        return next;
      });
    },
    [saveSettings]
  );

  // Bulk update
  const updateAll = useCallback(
    overrides => {
      setSettings(prev => {
        const next = { ...prev, ...overrides };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        if (saveSettings) saveSettings(next);
        return next;
      });
    },
    [saveSettings]
  );

  // Reset to defaults
  const reset = useCallback(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(SETTING_DEFAULTS));
    if (saveSettings) saveSettings(SETTING_DEFAULTS);
    setSettings(SETTING_DEFAULTS);
  }, [saveSettings]);

  return { settings, update, updateAll, reset };
}

/**
 * useSettings — Global settings hook
 * ─────────────────────────────────────
 * Source of truth:   Supabase (user_settings JSONB column)
 * Fallback / cache:  localStorage (instant reads, no flicker)
 *
 * On mount:   Loads from user.user_settings (already in AuthContext)
 * On change:  Saves to Supabase via saveSettings() + updates localStorage
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULTS = {
  // Detection sensitivity
  sensitivity: 'Medium',

  // Phishing
  urlScanning: true,
  strictMode: false,
  detailedAnalysis: true,

  // Alerts
  alertsEnabled: true,
  loginAlerts: true,
  idsAlerts: true,
  phishingAlerts: true,

  // Activity
  activityTracking: true,
  dataRetention: '7',

  // Appearance
  theme: 'dark',
  accentColor: '#6366f1',
  layout: 'sidebar',

  // 2FA (simulated)
  twoFAEnabled: false,
};

const LS_KEY = 'smartsec_settings';

function merge(saved) {
  return { ...DEFAULTS, ...(saved || {}) };
}

export function useSettings() {
  const { user, saveSettings } = useAuth();

  // Initialise: prefer Supabase data already hydrated into user object
  const [settings, setSettingsState] = useState(() => {
    const fromUser = user?.user_settings && Object.keys(user.user_settings).length > 0
      ? user.user_settings
      : null;
    const fromLS = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    return merge(fromUser || fromLS);
  });

  // When user object loads/refreshes, sync settings from Supabase
  useEffect(() => {
    if (user?.user_settings && Object.keys(user.user_settings).length > 0) {
      const merged = merge(user.user_settings);
      setSettingsState(merged);
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
    }
  }, [user?.id]);  // only re-sync when user id changes (login/switch)

  // Debounced save to Supabase
  const updateSetting = useCallback((key, value) => {
    setSettingsState(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      // Fire-and-forget save — no need to await
      if (saveSettings) saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  // Bulk update (e.g., reset defaults)
  const updateSettings = useCallback((overrides) => {
    setSettingsState(prev => {
      const next = { ...prev, ...overrides };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      if (saveSettings) saveSettings(next);
      return next;
    });
  }, [saveSettings]);

  const resetDefaults = useCallback(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(DEFAULTS));
    if (saveSettings) saveSettings(DEFAULTS);
    setSettingsState(DEFAULTS);
  }, [saveSettings]);

  return { settings, updateSetting, updateSettings, resetDefaults };
}

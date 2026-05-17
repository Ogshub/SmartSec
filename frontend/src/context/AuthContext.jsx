import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('smartsec_user') || 'null'));
  const [token, setToken] = useState(() => localStorage.getItem('smartsec_token') || null);
  const [loading, setLoading] = useState(false);

  /* Helper: sync user state + localStorage */
  const _setUserAndCache = (u) => {
    setUser(u);
    localStorage.setItem('smartsec_user', JSON.stringify(u));
  };

  /* ── Login ─────────────────────────────────────────────── */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('smartsec_token', data.access_token);
      _setUserAndCache(data.user);
      setToken(data.access_token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  /* ── Register ───────────────────────────────────────────── */
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('smartsec_token', data.access_token);
      _setUserAndCache(data.user);
      setToken(data.access_token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  /* ── Logout ─────────────────────────────────────────────── */
  const logout = () => {
    localStorage.removeItem('smartsec_token');
    localStorage.removeItem('smartsec_user');
    setToken(null);
    setUser(null);
  };

  /* ── Refresh user from backend ──────────────────────────── */
  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      _setUserAndCache(data);
      return data;
    } catch (_) { }
  };

  /* ── Update profile (PATCH /auth/update-profile) ─────────── */
  const updateProfile = async (fields) => {
    try {
      const { data } = await api.patch('/auth/update-profile', fields);
      _setUserAndCache(data);
      return { success: true, user: data };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Update failed' };
    }
  };

  /* ── Save settings to Supabase (POST /auth/update-settings) ─ */
  const saveSettings = async (settings) => {
    try {
      await api.post('/auth/update-settings', { settings });
      // Also cache locally for instant reads
      _setUserAndCache({ ...user, user_settings: settings });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Settings save failed' };
    }
  };

  /* ── OAuth login (Google / GitHub / Microsoft) ──────────────
   *  Called from AuthCallback.jsx after Supabase OAuth redirect.
   *  Sends the Supabase access_token to our backend, which
   *  finds-or-creates the user in our users table and returns
   *  our own JWT.
   */
  const loginWithOAuth = async (supabaseAccessToken, supabaseUser) => {
    try {
      const { data } = await api.post('/auth/oauth-callback', {
        access_token: supabaseAccessToken,
        email: supabaseUser.email,
        full_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || '',
        avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
        provider: supabaseUser.app_metadata?.provider || 'oauth',
      });
      localStorage.setItem('smartsec_token', data.access_token);
      _setUserAndCache(data.user);
      setToken(data.access_token);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'OAuth login failed' };
    }
  };

  /* ── Auto-refresh on mount if token exists ──────────────── */
  useEffect(() => {
    if (token) refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, updateProfile, saveSettings, loginWithOAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

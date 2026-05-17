import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import api from '../api/client';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

const PAGE_META = {
  '/dashboard': { title: 'Dashboard',        sub: 'Real-time security overview' },
  '/ids':       { title: 'Alerts',           sub: 'Intrusion detection events' },
  '/phishing':  { title: 'URL Scanner',      sub: 'Phishing detection — 19 signals + 3 threat intel APIs' },
  '/risk':      { title: 'Risk Engine',      sub: 'Composite risk score from all security modules' },
  '/activity':  { title: 'Activity Monitor', sub: 'Full user activity audit trail' },
  '/settings':  { title: 'Settings',         sub: 'Manage preferences and security configuration' },
  '/profile':   { title: 'My Profile',       sub: 'Account information and security settings' },
};

export default function DashboardLayout() {
  const [apiOk, setApiOk]       = useState(null);
  const [sideOpen, setSideOpen] = useState(false);
  const { user }                = useAuth();
  const location                = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'SmartSec', sub: '' };

  // Close sidebar on route change (mobile)
  useEffect(() => { setSideOpen(false); }, [location.pathname]);

  useEffect(() => {
    api.get('/health').then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070b14' }}>

      {/* ── Mobile overlay ─────────────────────────────────── */}
      {sideOpen && (
        <div
          onClick={() => setSideOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
            backdropFilter: 'blur(3px)', zIndex: 150,
          }}
        />
      )}

      <Sidebar mobileOpen={sideOpen} onClose={() => setSideOpen(false)} />

      {/* ── Main area ──────────────────────────────────────── */}
      <div style={{
        flex: 1,
        marginLeft: 'clamp(0px, 220px, 220px)',
        display: 'flex',
        flexDirection: 'column',
      }}
        className="main-area"
      >
        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,.06)',
          background: 'rgba(10,22,40,.9)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            {/* Hamburger — hidden on desktop via CSS */}
            <button
              onClick={() => setSideOpen(true)}
              className="mobile-menu-btn"
              style={{
                background: 'none', border: 'none', color: '#94a3b8',
                cursor: 'pointer', display: 'none', padding: '.2rem',
              }}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>
                {meta.title}
              </h1>
              <p style={{ fontSize: '.72rem', color: '#64748b', marginTop: '.1rem' }}
                className="topbar-sub">
                {meta.sub}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            {/* API status dot */}
            {apiOk !== null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '.35rem',
                fontSize: '.72rem', color: apiOk ? '#10b981' : '#ef4444',
              }} className="api-badge">
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: apiOk ? '#10b981' : '#ef4444',
                  boxShadow: apiOk ? '0 0 6px #10b981' : '0 0 6px #ef4444',
                  animation: apiOk ? 'pulse 2s infinite' : 'none',
                }} />
                <span className="api-badge-text">API {apiOk ? 'Online' : 'Offline'}</span>
              </div>
            )}

            <NotificationBell />

            {/* User chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <UserAvatar user={user} size={32} showOnline />
              <div className="user-name-block">
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
                  {user?.username || user?.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ fontSize: '.67rem', color: '#10b981' }}>Online ●</div>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.5rem 1.25rem', overflowY: 'auto' }}
          className="page-content">
          <Outlet />
        </main>
      </div>

      {/* Inline responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .main-area { margin-left: 0 !important; }
          .topbar-sub { display: none; }
          .user-name-block { display: none; }
          .api-badge-text { display: none; }
        }
        @media (max-width: 480px) {
          .page-content { padding: 1rem .75rem !important; }
        }
      `}</style>
    </div>
  );
}

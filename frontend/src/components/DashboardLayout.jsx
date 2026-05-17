import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import api from '../api/client';
import { ChevronDown } from 'lucide-react';
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
  const [apiOk, setApiOk] = useState(null);
  const { user }          = useAuth();
  const location          = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'SmartSec', sub: '' };

  useEffect(() => {
    api.get('/health').then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070b14' }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.9rem 2rem', borderBottom: '1px solid rgba(255,255,255,.06)',
          background: 'rgba(10,22,40,.85)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>{meta.title}</h1>
            <p style={{ fontSize: '.75rem', color: '#64748b', marginTop: '.15rem' }}>{meta.sub}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* API status dot */}
            {apiOk !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.73rem', color: apiOk ? '#10b981' : '#ef4444' }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: apiOk ? '#10b981' : '#ef4444',
                  boxShadow: apiOk ? '0 0 6px #10b981' : '0 0 6px #ef4444',
                  animation: apiOk ? 'pulse 2s infinite' : 'none',
                }}/>
                API {apiOk ? 'Online' : 'Offline'}
              </div>
            )}

            {/* Real notification bell */}
            <NotificationBell />

            {/* User chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <UserAvatar user={user} size={34} showOnline />
              <div>
                <div style={{ fontSize: '.83rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
                  {user?.username || user?.email?.split('@')[0] || 'User'}
                </div>
                <div style={{ fontSize: '.68rem', color: '#10b981' }}>Online ●</div>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

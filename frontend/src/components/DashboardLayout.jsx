import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import api from '../api/client';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PAGE_META = {
  '/dashboard': { title: 'Dashboard',           sub: 'Real-time security overview' },
  '/ids':       { title: 'Alerts',              sub: 'Intrusion detection events' },
  '/phishing':  { title: 'URL Scanner',         sub: 'Phishing detection module' },
  '/risk':      { title: 'Reports',             sub: 'Security analytics & risk reports' },
  '/activity':  { title: 'Activity Monitor',    sub: 'User activity tracking' },
  '/settings':  { title: 'Settings',            sub: 'Manage your preferences and configure SmartSec to protect you better.' },
  '/profile':   { title: 'My Profile',          sub: 'View and manage your account information and security.' },
};

export default function DashboardLayout() {
  const [apiOk, setApiOk]           = useState(null);
  const [notifOpen, setNotifOpen]   = useState(false);
  const { user }                    = useAuth();
  const location                    = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'SmartSec', sub: '' };

  useEffect(() => {
    api.get('/health').then(() => setApiOk(true)).catch(() => setApiOk(false));
  }, []);

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U';
  const riskLevel = user?.risk_level || 'Low';
  const onlineColor = '#10b981';
  const avatarUrl   = user?.avatar_url || null;
  const avatarColor = user?.avatar_color || '#6366f1';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070b14' }}>
      <Sidebar />

      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column' }}>
        {/* ── Topbar ── */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.9rem 2rem', borderBottom: '1px solid rgba(255,255,255,.06)',
          background: 'rgba(10,22,40,.8)', backdropFilter: 'blur(12px)',
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
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: apiOk ? '#10b981' : '#ef4444', boxShadow: apiOk ? '0 0 6px #10b981' : '0 0 6px #ef4444', animation: apiOk ? 'pulse 2s infinite' : 'none' }} />
                API {apiOk ? 'Online' : 'Offline'}
              </div>
            )}

            {/* Notification bell */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setNotifOpen(p => !p)}>
              <Bell size={20} color="#94a3b8" />
              <div style={{
                position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                borderRadius: '50%', background: '#6366f1', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 800, color: '#fff',
              }}>3</div>
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: '140%', right: 0, width: 280, zIndex: 200,
                  background: '#0f1929', border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,.5)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,.06)', fontWeight: 700, fontSize: '.83rem' }}>Notifications</div>
                  {[
                    { icon: '🚨', msg: 'Suspicious login detected', time: '2 min ago', color: '#ef4444' },
                    { icon: '⚠️', msg: 'Medium risk login from new IP', time: '1 hr ago',  color: '#f59e0b' },
                    { icon: '✅', msg: 'Password changed successfully', time: '2 hr ago',  color: '#10b981' },
                  ].map((n, i) => (
                    <div key={i} style={{ padding: '.7rem 1rem', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                      <span>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.8rem', color: '#cbd5e1' }}>{n.msg}</div>
                        <div style={{ fontSize: '.7rem', color: '#475569', marginTop: '.15rem' }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : `linear-gradient(135deg,${avatarColor},#8b5cf6)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '.8rem', color: '#fff',
                  overflow: 'hidden', border: avatarUrl ? `2px solid ${avatarColor}44` : 'none',
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : initials
                  }
                </div>
                <div style={{
                  position: 'absolute', bottom: 1, right: 1, width: 9, height: 9,
                  borderRadius: '50%', background: onlineColor, border: '2px solid #070b14',
                }} />
              </div>
              <div>
                <div style={{ fontSize: '.83rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
                  {user?.username || 'User'}
                </div>
                <div style={{ fontSize: '.68rem', color: onlineColor }}>Online ●</div>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

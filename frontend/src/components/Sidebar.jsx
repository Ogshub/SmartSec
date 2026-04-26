import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Activity, Bell, Globe, BarChart3,
  Settings, User, LogOut
} from 'lucide-react';

/* ── Nav structure matching the reference image exactly ───────── */
const mainNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/activity',  icon: Activity,        label: 'Activity Monitor' },
  { to: '/ids',       icon: Bell,            label: 'Alerts' },
  { to: '/phishing',  icon: Globe,           label: 'URL Scanner' },
  { to: '/risk',      icon: BarChart3,       label: 'Reports' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
];

const bottomNav = [
  { to: '/profile',   icon: User,    label: 'Profile' },
];

/* ── Half-circle risk gauge ───────────────────────────────────── */
function RiskGauge({ score, level }) {
  const colorMap = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
  const color = colorMap[level] || '#10b981';

  // SVG arc helper (angles in degrees, 0=top)
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arc = (cx, cy, r, startDeg, endDeg) => {
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };

  // Map score 0–100 to arc angle 180–360 (left → right)
  const fillEnd = 180 + (score / 100) * 180;

  return (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,.06)',
      padding: '1rem .85rem .85rem',
    }}>
      <div style={{ fontSize: '.68rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.6rem' }}>
        Current Risk Score
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width="148" height="84" viewBox="0 0 148 84" style={{ overflow: 'visible' }}>
          {/* Background track */}
          <path d={arc(74, 74, 56, 180, 360)} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12" strokeLinecap="round" />

          {/* Coloured zone tints */}
          <path d={arc(74, 74, 56, 180, 240)} fill="none" stroke="rgba(16,185,129,.18)"  strokeWidth="12" strokeLinecap="round" />
          <path d={arc(74, 74, 56, 240, 300)} fill="none" stroke="rgba(245,158,11,.18)"  strokeWidth="12" strokeLinecap="round" />
          <path d={arc(74, 74, 56, 300, 360)} fill="none" stroke="rgba(239,68,68,.18)"   strokeWidth="12" strokeLinecap="round" />

          {/* Active fill */}
          {score > 0 && (
            <path d={arc(74, 74, 56, 180, Math.min(fillEnd, 359.9))} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${color}88)` }} />
          )}

          {/* Score number */}
          <text x="74" y="72" textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="800" fontFamily="Inter, sans-serif">
            {score}
          </text>
        </svg>

        {/* Level label */}
        <div style={{ fontWeight: 700, fontSize: '.85rem', color, marginTop: '-.3rem' }}>{level}</div>
        <div style={{ fontSize: '.68rem', color: '#475569', marginTop: '.2rem' }}>Last updated: 2 min ago</div>
      </div>
    </div>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────── */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';
  const score    = Math.round(user?.risk_score ?? 0);
  const level    = user?.risk_level ?? 'Low';
  const avatarUrl = user?.avatar_url || null;
  const avatarColor = user?.avatar_color || '#6366f1';

  const navItemStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '.7rem',
    padding: '.55rem .85rem', borderRadius: 9,
    fontSize: '.855rem', fontWeight: isActive ? 600 : 500,
    color: isActive ? '#fff' : '#64748b',
    background: isActive ? 'rgba(99,102,241,.2)' : 'transparent',
    border: isActive ? '1px solid rgba(99,102,241,.3)' : '1px solid transparent',
    textDecoration: 'none', transition: 'all .18s', cursor: 'pointer',
    marginBottom: '.1rem',
    position: 'relative',
  });

  const iconColor = (isActive) => isActive ? '#a5b4fc' : '#475569';

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
      background: '#080f1e',
      borderRight: '1px solid rgba(255,255,255,.055)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* ── Logo ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.7rem',
        padding: '1.2rem 1rem 1.1rem',
        borderBottom: '1px solid rgba(255,255,255,.055)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem',
        }}>🛡️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '.97rem', color: '#f1f5f9', lineHeight: 1.2 }}>SmartSec</div>
          <div style={{ fontSize: '.62rem', color: '#334155', letterSpacing: '.03em', marginTop: '.1rem' }}>AI Cyber Defense Platform</div>
        </div>
      </div>

      {/* ── Main nav ─────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '.85rem .7rem .5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {mainNav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => navItemStyle(isActive)} end={to === '/dashboard'}>
            {({ isActive }) => (
              <>
                <Icon size={16} color={iconColor(isActive)} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* ── Divider ──────────────────────────────────── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.055)', margin: '.6rem 0' }} />

        {/* ── Profile ──────────────────────────────────── */}
        <NavLink to="/profile" style={() => navItemStyle(false)}>
          {() => (
            <>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: avatarUrl ? 'transparent' : `linear-gradient(135deg,${avatarColor},#8b5cf6)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.6rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                overflow: 'hidden', border: avatarUrl ? '1px solid rgba(255,255,255,.15)' : 'none',
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : initials
                }
              </div>
              <span style={{ color: '#64748b' }}>Profile</span>
            </>
          )}
        </NavLink>

        {/* ── Logout ───────────────────────────────────── */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          style={{ ...navItemStyle(false), width: '100%', background: 'none', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left' }}
        >
          <LogOut size={16} color="#ef444499" strokeWidth={2} />
          <span style={{ color: '#ef444499' }}>Logout</span>
        </button>
      </nav>

      {/* ── Risk gauge ───────────────────────────────────── */}
      <RiskGauge score={score} level={level} />
    </aside>
  );
}

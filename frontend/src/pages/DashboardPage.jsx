import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { ShieldAlert, Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

// Placeholder chart data — will be replaced with real data in Step 4+
const activityData = [
  { time: '00:00', requests: 12, alerts: 0 },
  { time: '04:00', requests: 5,  alerts: 0 },
  { time: '08:00', requests: 45, alerts: 1 },
  { time: '12:00', requests: 78, alerts: 2 },
  { time: '16:00', requests: 92, alerts: 1 },
  { time: '20:00', requests: 60, alerts: 3 },
  { time: '23:59', requests: 34, alerts: 1 },
];

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function RiskGauge({ score, level }) {
  const angle = (score / 100) * 180 - 90; // -90 to +90 degrees
  const color = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#10b981';

  return (
    <div className="gauge-wrap">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Track */}
        <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round" />
        {/* Green zone */}
        <path d="M 10 90 A 80 80 0 0 1 70 18" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="14" strokeLinecap="round" />
        {/* Yellow zone */}
        <path d="M 70 18 A 80 80 0 0 1 130 18" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="14" strokeLinecap="round" />
        {/* Red zone */}
        <path d="M 130 18 A 80 80 0 0 1 170 90" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="14" strokeLinecap="round" />
        {/* Needle */}
        <line
          x1="90" y1="90"
          x2={90 + 65 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={90 + 65 * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round"
        />
        <circle cx="90" cy="90" r="6" fill={color} />
        {/* Labels */}
        <text x="10" y="98" fill="rgba(255,255,255,0.4)" fontSize="9">LOW</text>
        <text x="75" y="12" fill="rgba(255,255,255,0.4)" fontSize="9">MED</text>
        <text x="143" y="98" fill="rgba(255,255,255,0.4)" fontSize="9">HIGH</text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: '-.5rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>
          {score.toFixed(0)}
        </div>
        <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>Risk Score / 100</div>
        <span className={`risk-badge ${level}`} style={{ marginTop: '.4rem', display: 'inline-block' }}>{level} Risk</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [history, setHistory]   = useState([]);
  const [loadingH, setLoadingH] = useState(true);

  useEffect(() => {
    refreshUser();
    api.get('/auth/login-history')
      .then(r => setHistory(r.data.history || []))
      .catch(() => {})
      .finally(() => setLoadingH(false));
  }, []);

  const riskScore = user?.risk_score ?? 0;
  const riskLevel = user?.risk_level ?? 'Low';

  const highCount = history.filter(e => e.event_type === 'SUSPICIOUS').length;
  const failCount = history.filter(e => e.event_type === 'FAILURE').length;

  return (
    <>
      {/* ── Stat Row ── */}
      <div className="stat-grid">
        <StatCard label="Risk Score"      value={riskScore.toFixed(0)} sub="Out of 100"             color="blue"   icon="🛡️" />
        <StatCard label="Login Sessions"  value={user?.login_count ?? 0} sub="Total authenticated"  color="green"  icon="🔑" />
        <StatCard label="Failed Attempts" value={failCount}            sub="Since last success"      color="yellow" icon="⚠️" />
        <StatCard label="Alerts Raised"   value={highCount}            sub="Suspicious logins"       color="red"    icon="🚨" />
      </div>

      <div className="grid-2 mt-3">
        {/* ── Risk Gauge ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={15} className="icon" /> Current Risk Level</div>
            <span className={`risk-badge ${riskLevel}`}>{riskLevel}</span>
          </div>
          <RiskGauge score={riskScore} level={riskLevel} />
          <p className="text-muted mt-2" style={{ textAlign: 'center' }}>
            Based on login behavior, IP changes & time patterns
          </p>
        </div>

        {/* ── Login History ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={15} className="icon" /> Recent Login Events</div>
            <span style={{ fontSize: '.72rem', color: 'var(--text3)' }}>Last 10</span>
          </div>
          {loadingH ? (
            <p className="text-muted">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-muted">No events recorded yet.</p>
          ) : (
            history.slice(0, 8).map((ev, i) => (
              <div key={i} className="history-row">
                <span className={`ev-chip ev-${ev.event_type}`}>{ev.event_type}</span>
                <span className="text-muted mono">{ev.ip_address}</span>
                <span className="text-muted" style={{ fontSize: '.68rem' }}>
                  {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                </span>
                <span style={{ fontSize: '.72rem', color: 'var(--yellow)', fontFamily: 'monospace' }}>
                  {(ev.risk_score ?? 0).toFixed(0)}/100
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Activity Chart ── */}
      <div className="card mt-3">
        <div className="card-header">
          <div className="card-title"><Activity size={15} className="icon" /> Request Activity (Simulated — Real data in Step 4)</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }} />
            <Area type="monotone" dataKey="requests" stroke="#3b82f6" fill="url(#gBlue)" strokeWidth={2} name="Requests" />
            <Area type="monotone" dataKey="alerts"   stroke="#ef4444" fill="url(#gRed)"  strokeWidth={2} name="Alerts" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Module Status ── */}
      <div className="card mt-3">
        <div className="card-header">
          <div className="card-title">Module Status</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
          {[
            { name: 'Authentication',       status: 'Online',      color: 'var(--green)',  step: '✅ Step 3' },
            { name: 'Intrusion Detection',  status: 'Coming Soon', color: 'var(--yellow)', step: '⏳ Step 4' },
            { name: 'Phishing Detector',    status: 'Coming Soon', color: 'var(--yellow)', step: '⏳ Step 5' },
            { name: 'Risk Scoring Engine',  status: 'Coming Soon', color: 'var(--yellow)', step: '⏳ Step 6' },
            { name: 'Real-Time Alerts',     status: 'Partial',     color: 'var(--accent2)', step: '🔄 Active' },
            { name: 'Activity Logger',      status: 'Online',      color: 'var(--green)',  step: '✅ Step 3' },
          ].map(m => (
            <div key={m.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '.75rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '.3rem' }}>{m.step}</div>
              <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: '.2rem' }}>{m.name}</div>
              <div style={{ fontSize: '.75rem', color: m.color, fontWeight: 600 }}>● {m.status}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

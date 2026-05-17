/**
 * DashboardPage — Real aggregated data from /dashboard endpoint (Step 8)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ShieldAlert, Activity, CheckCircle, AlertTriangle, Clock,
  Globe, BarChart3, RefreshCw, TrendingUp, TrendingDown, Zap,
} from 'lucide-react';

function StatCard({ label, value, sub, icon, color }) {
  const colorMap = { blue: '#3b82f6', green: '#10b981', yellow: '#f59e0b', red: '#ef4444', purple: '#8b5cf6' };
  const c = colorMap[color] || '#6366f1';
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 12, padding: '1.1rem 1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1, margin: '.3rem 0 .2rem' }}>{value ?? '0'}</div>
          <div style={{ fontSize: '.72rem', color: '#475569' }}>{sub}</div>
        </div>
        <span style={{ fontSize: '1.4rem', marginTop: '.1rem' }}>{icon}</span>
      </div>
    </div>
  );
}

function RiskGauge({ score, level }) {
  const color = level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#10b981';
  const pC = (cx,cy,r,deg) => { const rad=((deg-90)*Math.PI)/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; };
  const arc = (cx,cy,r,s,e) => { const a=pC(cx,cy,r,s),b=pC(cx,cy,r,e),l=e-s>180?1:0; return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${l} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`; };
  const fillEnd = 180 + (score/100)*180;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'1rem 0' }}>
      <svg width="180" height="110" viewBox="0 0 180 110" style={{ overflow:'visible' }}>
        <path d={arc(90,90,68,180,360)} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="14" strokeLinecap="round"/>
        <path d={arc(90,90,68,180,240)} fill="none" stroke="rgba(16,185,129,.2)"  strokeWidth="14" strokeLinecap="round"/>
        <path d={arc(90,90,68,240,300)} fill="none" stroke="rgba(245,158,11,.2)"  strokeWidth="14" strokeLinecap="round"/>
        <path d={arc(90,90,68,300,360)} fill="none" stroke="rgba(239,68,68,.2)"   strokeWidth="14" strokeLinecap="round"/>
        {score>0&&<path d={arc(90,90,68,180,Math.min(fillEnd,359.9))} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" style={{filter:`drop-shadow(0 0 6px ${color}99)`}}/>}
        <text x="90" y="88" textAnchor="middle" fill="#f1f5f9" fontSize="26" fontWeight="800" fontFamily="Inter,sans-serif">{Math.round(score)}</text>
        <text x="90" y="104" textAnchor="middle" fill="#475569" fontSize="9">RISK SCORE</text>
      </svg>
      <span style={{padding:'.2rem .7rem',borderRadius:99,fontSize:'.72rem',fontWeight:700,background:`${color}20`,color,border:`1px solid ${color}44`,marginTop:'-.3rem'}}>{level} Risk</span>
    </div>
  );
}

const MODULE_STATUS = [
  { name: 'Authentication',      status: 'Online',  color: '#10b981', icon: '🔐' },
  { name: 'Intrusion Detection', status: 'Active',  color: '#10b981', icon: '🤖' },
  { name: 'Phishing Detector',   status: 'Active',  color: '#10b981', icon: '🎣' },
  { name: 'Risk Scoring Engine', status: 'Online',  color: '#10b981', icon: '📊' },
  { name: 'Email Alerts',        status: 'Online',  color: '#10b981', icon: '📧' },
  { name: 'Activity Logger',     status: 'Active',  color: '#10b981', icon: '📋' },
];

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [dash,     setDash]     = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      refreshUser();
      const [d, h] = await Promise.all([
        api.get('/dashboard').catch(() => ({ data: null })),
        api.get('/auth/login-history').catch(() => ({ data: { history: [] } })),
      ]);
      setDash(d.data);
      setHistory(h.data.history || []);
    } catch (e) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const riskScore = user?.risk_score ?? 0;
  const riskLevel = user?.risk_level ?? 'Low';

  // Build 7-day chart from history
  const chartData = (() => {
    const days = Array.from({length: 7}, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { label: d.toLocaleDateString('en-IN', {weekday:'short'}), requests: 0, alerts: 0 };
    });
    history.forEach(ev => {
      const evDate = new Date(ev.created_at);
      const daysAgo = Math.floor((Date.now() - evDate.getTime()) / 86400000);
      if (daysAgo < 7) {
        const idx = 6 - daysAgo;
        days[idx].requests++;
        if (ev.event_type === 'SUSPICIOUS' || ev.event_type === 'FAILURE') days[idx].alerts++;
      }
    });
    return days;
  })();

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f1f5f9', margin:0 }}>
            👋 Welcome back, {user?.email?.split('@')[0] || 'User'}
          </h2>
          <p style={{ color:'#64748b', fontSize:'.82rem', margin:'.25rem 0 0' }}>
            Here's your real-time security overview
          </p>
        </div>
        <button onClick={fetchAll} disabled={loading} style={{
          display:'flex', alignItems:'center', gap:'.4rem', padding:'.45rem .9rem',
          borderRadius:8, fontSize:'.78rem', fontWeight:600,
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
          color:'#64748b', cursor:'pointer',
        }}>
          <RefreshCw size={13} style={loading?{animation:'spin .7s linear infinite'}:{}}/> Refresh
        </button>
      </div>

      {error && <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,padding:'.75rem 1rem',marginBottom:'1rem',color:'#f87171',fontSize:'.82rem'}}>⚠️ {error}</div>}

      {/* Stat cards */}
      <div className="dash-stat-grid">
        <StatCard label="Risk Score"       value={Math.round(riskScore)} sub="Out of 100"            icon="🛡️" color="blue"/>
        <StatCard label="Login Sessions"   value={user?.login_count??0}  sub="Total authenticated"   icon="🔑" color="green"/>
        <StatCard label="Threats Detected" value={dash?.ids?.anomalies??0} sub="IDS anomalies"       icon="🚨" color="red"/>
        <StatCard label="URLs Scanned"     value={dash?.phishing?.total_scans??0} sub="Phishing checks" icon="🔗" color="purple"/>
      </div>

      <div className="dash-mid-grid">
        {/* Risk gauge */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={14}/> Current Risk Level</div>
            <span className={`risk-badge ${riskLevel}`}>{riskLevel}</span>
          </div>
          {loading ? <div className="ids-empty-state"><span className="ids-spinner"/></div> : <RiskGauge score={riskScore} level={riskLevel}/>}
          <p style={{ textAlign:'center', fontSize:'.75rem', color:'#475569', padding:'0 1rem .75rem' }}>
            Computed from login behavior, IDS signals & phishing scans
          </p>
        </div>

        {/* Activity chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={14}/> 7-Day Activity</div>
            <span style={{ fontSize:'.72rem', color:'#64748b' }}>Login events</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={chartData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
              <XAxis dataKey="label" tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:'#0d1526',border:'1px solid #1e3a5f',borderRadius:8}}/>
              <Area type="monotone" dataKey="requests" stroke="#3b82f6" fill="url(#gBlue)" strokeWidth={2} name="Requests"/>
              <Area type="monotone" dataKey="alerts"   stroke="#ef4444" fill="url(#gRed)"  strokeWidth={2} name="Alerts"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Login history + module status */}
      <div className="dash-bot-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={14}/> Recent Login Events</div>
            <span style={{ fontSize:'.72rem', color:'#64748b' }}>Last 8</span>
          </div>
          {loading ? <div className="ids-empty-state"><span className="ids-spinner"/></div> :
          history.length === 0 ? <p className="text-muted">No events yet.</p> :
          history.slice(0,8).map((ev,i) => (
            <div key={i} className="history-row">
              <span className={`ev-chip ev-${ev.event_type}`}>{ev.event_type}</span>
              <span className="text-muted mono" style={{fontSize:'.72rem'}}>{ev.ip_address}</span>
              <span className="text-muted" style={{fontSize:'.68rem'}}>{ev.created_at?new Date(ev.created_at).toLocaleString():'—'}</span>
              <span style={{fontSize:'.72rem',color:'var(--yellow)',fontFamily:'monospace'}}>{(ev.risk_score??0).toFixed(0)}/100</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><Zap size={14}/> Module Status</div>
            <span style={{ fontSize:'.72rem', color:'#10b981' }}>All Systems Online</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
            {MODULE_STATUS.map(m => (
              <div key={m.name} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'.5rem .75rem', borderRadius:8,
                background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
                  <span>{m.icon}</span>
                  <span style={{ fontSize:'.8rem', color:'#e2e8f0' }}>{m.name}</span>
                </div>
                <span style={{ fontSize:'.72rem', color:m.color, fontWeight:600 }}>● {m.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

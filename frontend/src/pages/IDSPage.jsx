/**
 * IDSPage — Real AI Intrusion Detection Dashboard
 * ================================================
 * All data fetched from /ids/dashboard which reads from real DB rows
 * logged by RequestLoggerMiddleware. Zero hardcoded values.
 *
 * Real data sources:
 *   - Stat counts       → user_activity + alerts tables (7 vs 14 day comparison)
 *   - % deltas          → computed server-side from real weekly windows
 *   - Date range label  → comes from API (actual current dates)
 *   - Source IPs        → real client IPs stored by middleware
 *   - Trend chart       → daily aggregates from real user_activity rows
 */

import { useState, useEffect, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ShieldAlert, Activity, AlertTriangle, ShieldCheck,
  Filter, Download, Calendar, Eye, RefreshCw, Zap,
  TrendingUp, TrendingDown, CheckCircle,
} from 'lucide-react';
import api from '../api/client';

// ── Attack type icons ───────────────────────────────────────────────────────
const ATTACK_META = {
  'Brute Force':         { icon: '🔐', color: '#ef4444' },
  'Sql Injection':       { icon: '💉', color: '#f97316' },
  'Port Scan':           { icon: '🔍', color: '#f59e0b' },
  'Ddos Attempt':        { icon: '💥', color: '#8b5cf6' },
  'Suspicious Login':    { icon: '👤', color: '#3b82f6' },
  'Behavioral Anomaly':  { icon: '🤖', color: '#06b6d4' },
  'Other':               { icon: '⚠️', color: '#64748b' },
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#162140', border: '1px solid #1e3a5f', borderRadius: 8, padding: '.65rem .9rem', fontSize: '.78rem' }}>
      <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '.4rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '.2rem' }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function DonutCenter({ cx, cy, label, sub, color = '#10b981' }) {
  return (
    <g>
      <text x={cx} y={cy + 2}  textAnchor="middle" fill="#94a3b8" fontSize={11}>{label}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill={color}   fontSize={13} fontWeight="700">{sub}</text>
    </g>
  );
}

function IDSStatCard({ label, value, delta, icon, colorClass }) {
  // delta is a real number from the API (null if no baseline)
  const hasData = value > 0 || delta !== null;
  return (
    <div className="ids-stat-card">
      <div className={`ids-stat-icon ${colorClass}`}>{icon}</div>
      <div className="ids-stat-body">
        <div className="ids-stat-label">{label}</div>
        <div className="ids-stat-value">{value?.toLocaleString() ?? '0'}</div>
        {delta !== null && delta !== undefined ? (
          <span className={`ids-stat-change ${delta >= 0 ? 'up' : 'down'}`}>
            {delta >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {Math.abs(delta)}% vs last 7 days
          </span>
        ) : (
          <span style={{ fontSize: '.7rem', color: 'var(--text3)', marginTop: '.3rem', display: 'block' }}>
            No baseline yet
          </span>
        )}
      </div>
    </div>
  );
}

export default function IDSPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [error,      setError]      = useState('');
  const [simResult,  setSimResult]  = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/ids/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load IDS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSimulate = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.post('/ids/simulate');
      setSimResult(res.data);
      await fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.post(`/ids/resolve/${alertId}`);
      await fetchDashboard();
    } catch { /* silent */ }
  };

  const stats     = data?.stats          ?? {};
  const trend     = data?.trend_data     ?? [];
  const sysStatus = data?.system_status  ?? [];
  const attacks   = data?.top_attacks    ?? [];
  const alerts    = data?.recent_alerts  ?? [];
  const dateRange = data?.date_range;
  const totalSys  = sysStatus.reduce((s, i) => s + (i.value || 0), 0);
  const totalAtk  = attacks.reduce((s, i) => s + (i.value || 0), 0);
  const hasRealData = (stats.total_events ?? 0) > 0;

  const dateLabel = dateRange
    ? `${dateRange.from} – ${dateRange.to}`
    : 'Last 7 Days';

  return (
    <div>
      {/* ── Top Controls ── */}
      <div className="ids-controls">
        <div className="ids-title-block">
          <h2>Intrusion Detection System (IDS)</h2>
          <p>Real-time behavioral anomaly detection via IsolationForest ML.</p>
        </div>
        <div className="ids-actions">
          <button className="ids-date-btn">
            <Calendar size={14}/> {dateLabel}
          </button>
          <button
            className="ids-simulate-btn"
            onClick={handleSimulate}
            disabled={simLoading}
            title="Inject synthetic demo events to test the ML pipeline"
          >
            {simLoading ? <span className="ids-spinner"/> : <Zap size={14}/>}
            {simLoading ? 'Simulating…' : 'Demo: Simulate'}
          </button>
          <button className="ids-export-btn" onClick={fetchDashboard} disabled={loading}>
            {loading
              ? <RefreshCw size={14} style={{ animation: 'ids-spin .7s linear infinite' }}/>
              : <RefreshCw size={14}/>}
            Refresh
          </button>
        </div>
      </div>

      {/* ── No data callout ── */}
      {!loading && !hasRealData && !simResult && (
        <div style={{
          background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 10, padding: '.85rem 1.1rem', marginBottom: '1rem',
          fontSize: '.82rem', color: '#818cf8', display: 'flex', gap: '.6rem', alignItems: 'center',
        }}>
          <Zap size={15}/>
          <span>
            <strong>IDS is active and monitoring.</strong> No traffic logged yet — every API call you make
            is automatically tracked. Use <strong>Demo: Simulate</strong> to inject test events, or simply
            browse the app to generate real traffic.
          </span>
        </div>
      )}

      {/* ── Sim result ── */}
      {simResult && (
        <div style={{
          background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: 10, padding: '.7rem 1rem', marginBottom: '1rem',
          fontSize: '.82rem', color: '#10b981', display: 'flex', gap: '.5rem', alignItems: 'center',
        }}>
          <ShieldCheck size={15}/>
          Demo simulation complete — {simResult.total_events} events, <strong>{simResult.anomalies_found} anomalies</strong>, <strong>{simResult.alerts_created} alerts</strong> created.
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 10, padding: '.7rem 1rem', marginBottom: '1rem', fontSize: '.82rem', color: '#ef4444',
        }}>⚠️ {error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="ids-stat-grid" style={{ marginBottom: '1rem' }}>
        <IDSStatCard label="Total Events"       value={stats.total_events     ?? 0} delta={stats.delta_events}    colorClass="blue"   icon={<Activity size={18}/>}/>
        <IDSStatCard label="Anomalies Detected" value={stats.anomalies        ?? 0} delta={stats.delta_anomalies} colorClass="orange" icon={<AlertTriangle size={18}/>}/>
        <IDSStatCard label="High Risk Alerts"   value={stats.high_risk_alerts ?? 0} delta={null}                  colorClass="red"    icon={<ShieldAlert size={18}/>}/>
        <IDSStatCard label="Blocked Attacks"    value={stats.blocked_attacks  ?? 0} delta={null}                  colorClass="green"  icon={<ShieldCheck size={18}/>}/>
        <IDSStatCard label="False Positives"    value={stats.false_positives  ?? 0} delta={null}                  colorClass="purple" icon={<Filter size={18}/>}/>
      </div>

      {/* ── Chart Row ── */}
      <div className="ids-chart-row">
        {/* Anomaly Detection Area Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Activity size={15}/> Anomaly Detection — {dateLabel}</div>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '.75rem' }}>
            {[{color:'#10b981',label:'Normal'},{color:'#ef4444',label:'Anomalous'}].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:'.4rem', fontSize:'.75rem', color:'#94a3b8' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:l.color, display:'inline-block'}}/>
                {l.label}
              </div>
            ))}
          </div>
          {loading ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : !hasRealData && !trend.some(t => t.normal > 0 || t.anomalous > 0) ? (
            <div className="ids-empty-state">
              <span className="icon">📊</span>
              <span className="title">Waiting for real traffic</span>
              <span className="sub">Browse the app or click "Demo: Simulate" to populate this chart</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNorm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gAnom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                <XAxis dataKey="label" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="normal"    name="Normal"    stroke="#10b981" strokeWidth={2.5} fill="url(#gNorm)" dot={{ fill:'#10b981', r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
                <Area type="monotone" dataKey="anomalous" name="Anomalous" stroke="#ef4444" strokeWidth={2.5} fill="url(#gAnom)" dot={{ fill:'#ef4444', r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Status Donut */}
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="card-header"><div className="card-title"><ShieldCheck size={15}/> System Status</div></div>
          {loading ? <div className="ids-empty-state"><span className="ids-spinner"/></div> : (
            <>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={totalSys > 0 ? sysStatus : [{ name:'Monitoring', value:1, color:'#1e3a5f' }]}
                    cx={75} cy={75} innerRadius={52} outerRadius={72}
                    dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}
                  >
                    {(totalSys > 0 ? sysStatus : [{ color:'#1e3a5f' }]).map((e, i) => (
                      <Cell key={i} fill={e.color}/>
                    ))}
                  </Pie>
                  <DonutCenter cx={75} cy={75} label="Protection" sub={totalSys > 0 ? 'Active' : 'Idle'} color={totalSys > 0 ? '#10b981' : '#64748b'}/>
                </PieChart>
              </div>
              <div className="ids-legend">
                {sysStatus.map((item, i) => {
                  const pct = totalSys > 0 ? ((item.value / totalSys) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="ids-legend-item">
                      <div className="ids-legend-dot-label">
                        <div className="ids-legend-dot" style={{ background: item.color }}/>
                        <span style={{ color:'#94a3b8' }}>{item.name}</span>
                      </div>
                      <span className="ids-legend-count">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
              <div className="ids-all-good">
                <span>✅</span> Middleware active — every request is monitored.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="ids-bottom-row">
        {/* Real Alerts Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={15}/> Recent Alerts</div>
            <span style={{ fontSize:'.72rem', color:'var(--text3)' }}>Real IPs • No mock data</span>
          </div>
          {loading ? <div className="ids-empty-state"><span className="ids-spinner"/></div> : alerts.length === 0 ? (
            <div className="ids-empty-state">
              <span className="icon">🔒</span>
              <span className="title">No alerts yet</span>
              <span className="sub">Alerts are created automatically when anomalous requests are detected</span>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="ids-alert-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Type</th><th>Source IP</th>
                    <th>Description</th><th>Risk</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => {
                    const meta = ATTACK_META[a.type] || ATTACK_META['Other'];
                    return (
                      <tr key={a.id || i}>
                        <td style={{ color:'#64748b', fontSize:'.72rem', whiteSpace:'nowrap', fontFamily:'JetBrains Mono,monospace' }}>{a.time}</td>
                        <td><span className="attack-type-chip"><span className="attack-icon">{meta.icon}</span><span style={{ color: meta.color }}>{a.type}</span></span></td>
                        <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.75rem', color:'#94a3b8' }}>{a.source_ip}</td>
                        <td style={{ color:'#cbd5e1', maxWidth:200, fontSize:'.78rem' }}>{a.description}</td>
                        <td><span className={`ids-risk-pill ${a.severity}`}>{a.severity}</span></td>
                        <td>
                          {!a.resolved ? (
                            <button className="ids-action-btn" onClick={() => handleResolve(a.id)} title="Mark resolved">
                              <CheckCircle size={13}/>
                            </button>
                          ) : (
                            <span style={{ fontSize:'.7rem', color:'#10b981' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Attack Types Donut */}
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={15}/> Top Attack Types</div>
          </div>
          {loading ? <div className="ids-empty-state"><span className="ids-spinner"/></div> : attacks.length === 0 ? (
            <div className="ids-empty-state">
              <span className="icon">📊</span>
              <span className="title">No attacks detected</span>
              <span className="sub">Attack type breakdown appears here once alerts are created</span>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'center' }}>
                <PieChart width={160} height={160}>
                  <Pie data={attacks} cx={75} cy={75} innerRadius={52} outerRadius={72} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {attacks.map((e, i) => <Cell key={i} fill={e.color || '#64748b'}/>)}
                  </Pie>
                  <DonutCenter cx={75} cy={75} label={`${totalAtk}`} sub="Total" color="#e2e8f0"/>
                </PieChart>
              </div>
              <div className="ids-legend">
                {attacks.map((item, i) => {
                  const pct = totalAtk > 0 ? ((item.value / totalAtk) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="ids-legend-item">
                      <div className="ids-legend-dot-label">
                        <div className="ids-legend-dot" style={{ background: item.color || '#64748b' }}/>
                        <span style={{ color:'#94a3b8' }}>{item.name}</span>
                      </div>
                      <span className="ids-legend-count">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

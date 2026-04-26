/**
 * IDSPage — Step 4: AI Intrusion Detection System
 * ================================================
 * Full dashboard matching the reference design:
 *   - 5 stat cards with trend indicators
 *   - Anomaly Detection line chart (Normal vs Anomalous)
 *   - System Status donut with "Protection Active" center
 *   - Recent Alerts table with attack type icons + risk pills
 *   - Top Attack Types donut with legend
 *   - "Simulate Traffic" button to generate demo data
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
  TrendingUp, TrendingDown,
} from 'lucide-react';
import api from '../api/client';

// ── Attack type icons + colors ──────────────────────────────────────────────
const ATTACK_META = {
  'Brute Force':      { icon: '🔐', color: '#ef4444' },
  'Sql Injection':    { icon: '💉', color: '#f97316' },
  'Port Scan':        { icon: '🔍', color: '#f59e0b' },
  'Ddos Attempt':     { icon: '💥', color: '#8b5cf6' },
  'Suspicious Login': { icon: '👤', color: '#3b82f6' },
  'Other':            { icon: '⚠️', color: '#64748b' },
};

const DEFAULT_ATTACK_COLORS = ['#ef4444','#f97316','#f59e0b','#8b5cf6','#3b82f6','#64748b','#10b981'];

// ── Custom Tooltip for the line chart ──────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#162140', border: '1px solid #1e3a5f',
      borderRadius: 8, padding: '.65rem .9rem', fontSize: '.78rem',
    }}>
      <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '.4rem' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: '.2rem' }}>
          {p.name}: <strong>{p.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Donut center label ──────────────────────────────────────────────────────
function DonutCenter({ cx, cy, label, sub, color = '#10b981', icon = '🛡️' }) {
  return (
    <g>
      <text x={cx} y={cy - 18} textAnchor="middle" fill="#94a3b8" fontSize={11}>{icon}</text>
      <text x={cx} y={cy + 2}  textAnchor="middle" fill="#94a3b8" fontSize={11}>{label}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fill={color}   fontSize={13} fontWeight="700">{sub}</text>
    </g>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function IDSStatCard({ label, value, change, changeDir, icon, colorClass }) {
  return (
    <div className="ids-stat-card">
      <div className={`ids-stat-icon ${colorClass}`}>{icon}</div>
      <div className="ids-stat-body">
        <div className="ids-stat-label">{label}</div>
        <div className="ids-stat-value">{value?.toLocaleString() ?? '—'}</div>
        {change !== undefined && (
          <span className={`ids-stat-change ${changeDir}`}>
            {changeDir === 'up' ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
            {change}% from last 7 days
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function IDSPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [simLoading,  setSimLoading]  = useState(false);
  const [error,       setError]       = useState('');
  const [simResult,   setSimResult]   = useState(null);

  // ── Fetch dashboard data ─────────────────────────────────────────────────
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

  // ── Run simulation ────────────────────────────────────────────────────────
  const handleSimulate = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.post('/ids/simulate');
      setSimResult(res.data);
      await fetchDashboard(); // Refresh after simulation
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation failed');
    } finally {
      setSimLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const stats     = data?.stats          ?? {};
  const trend     = data?.trend_data     ?? [];
  const sysStatus = data?.system_status  ?? [];
  const attacks   = data?.top_attacks    ?? [];
  const alerts    = data?.recent_alerts  ?? [];
  const totalSys  = sysStatus.reduce((s, i) => s + (i.value || 0), 0);
  const totalAtk  = attacks.reduce((s, i) => s + (i.value || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Top Controls ── */}
      <div className="ids-controls">
        <div className="ids-title-block">
          <h2>Intrusion Detection System (IDS)</h2>
          <p>Monitor system activities and detect suspicious behaviors in real-time.</p>
        </div>
        <div className="ids-actions">
          <button className="ids-date-btn">
            <Calendar size={14}/> May 15 – May 21, 2024 ▾
          </button>
          <button
            className="ids-simulate-btn"
            onClick={handleSimulate}
            disabled={simLoading}
            title="Generate synthetic traffic data and run IsolationForest detection"
          >
            {simLoading ? <span className="ids-spinner"/> : <Zap size={14}/>}
            {simLoading ? 'Simulating…' : 'Simulate Traffic'}
          </button>
          <button className="ids-export-btn" onClick={fetchDashboard} disabled={loading}>
            {loading ? <RefreshCw size={14} style={{ animation:'ids-spin .7s linear infinite' }}/> : <Download size={14}/>}
            Export Report
          </button>
        </div>
      </div>

      {/* ── Sim result banner ── */}
      {simResult && (
        <div style={{
          background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)',
          borderRadius: 10, padding: '.7rem 1rem', marginBottom: '1rem',
          fontSize: '.82rem', color: '#10b981', display: 'flex', gap: '.5rem', alignItems: 'center',
        }}>
          <ShieldCheck size={15}/>
          Simulation complete — {simResult.total_events} events processed,&nbsp;
          <strong>{simResult.anomalies_found} anomalies</strong> detected,&nbsp;
          <strong>{simResult.alerts_created} alerts</strong> created.
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
          borderRadius: 10, padding: '.7rem 1rem', marginBottom: '1rem',
          fontSize: '.82rem', color: '#ef4444',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="ids-stat-grid" style={{ marginBottom: '1rem' }}>
        <IDSStatCard
          label="Total Events" value={stats.total_events}
          change={12.4} changeDir="up" colorClass="blue"
          icon={<Activity size={18}/>}
        />
        <IDSStatCard
          label="Anomalies Detected" value={stats.anomalies}
          change={8.7} changeDir="up" colorClass="orange"
          icon={<AlertTriangle size={18}/>}
        />
        <IDSStatCard
          label="High Risk Alerts" value={stats.high_risk_alerts}
          change={5.3} changeDir="up" colorClass="red"
          icon={<ShieldAlert size={18}/>}
        />
        <IDSStatCard
          label="Blocked Attacks" value={stats.blocked_attacks}
          change={15.2} changeDir="up" colorClass="green"
          icon={<ShieldCheck size={18}/>}
        />
        <IDSStatCard
          label="False Positives" value={stats.false_positives}
          change={4.1} changeDir="down" colorClass="purple"
          icon={<Filter size={18}/>}
        />
      </div>

      {/* ── Chart Row ── */}
      <div className="ids-chart-row">

        {/* Anomaly Detection Overview */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={15}/> Anomaly Detection Overview
            </div>
            <button className="ids-date-btn" style={{ padding: '.3rem .7rem', fontSize: '.75rem' }}>
              Last 7 Days ▾
            </button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '.75rem' }}>
            {[
              { color: '#10b981', label: 'Normal Activity' },
              { color: '#ef4444', label: 'Anomalous Activity' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem', color: '#94a3b8' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: 'inline-block' }}/>
                {l.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : trend.length === 0 || trend.every(t => t.normal === 0 && t.anomalous === 0) ? (
            <div className="ids-empty-state">
              <span className="icon">📊</span>
              <span className="title">No data yet</span>
              <span className="sub">Click <strong>Simulate Traffic</strong> to generate events and see the chart</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradAnom" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area
                  type="monotone" dataKey="normal" name="Normal Activity"
                  stroke="#10b981" strokeWidth={2.5}
                  fill="url(#gradNormal)"
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone" dataKey="anomalous" name="Anomalous Activity"
                  stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#gradAnom)"
                  dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Status Donut */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title"><ShieldCheck size={15}/> System Status</div>
          </div>

          {loading ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={totalSys > 0 ? sysStatus : [{ name: 'No Data', value: 1, color: '#1e3a5f' }]}
                    cx={75} cy={75} innerRadius={52} outerRadius={72}
                    dataKey="value" startAngle={90} endAngle={-270}
                    strokeWidth={0}
                  >
                    {(totalSys > 0 ? sysStatus : [{ color: '#1e3a5f' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color}/>
                    ))}
                  </Pie>
                  <DonutCenter
                    cx={75} cy={75}
                    icon="🛡️"
                    label="Protection"
                    sub={totalSys > 0 ? 'Active' : 'Idle'}
                    color={totalSys > 0 ? '#10b981' : '#64748b'}
                  />
                </PieChart>
              </div>

              <div className="ids-legend">
                {sysStatus.map((item, i) => {
                  const pct = totalSys > 0 ? ((item.value / totalSys) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={i} className="ids-legend-item">
                      <div className="ids-legend-dot-label">
                        <div className="ids-legend-dot" style={{ background: item.color }}/>
                        <span style={{ color: '#94a3b8' }}>{item.name}</span>
                      </div>
                      <span className="ids-legend-count">{item.value.toLocaleString()} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>

              <div className="ids-all-good">
                <span>✅</span> All security systems are running smoothly.
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="ids-bottom-row">

        {/* Recent Alerts Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><ShieldAlert size={15}/> Recent Alerts</div>
            <button className="ids-view-all">View All Alerts →</button>
          </div>

          {loading ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : alerts.length === 0 ? (
            <div className="ids-empty-state">
              <span className="icon">🔒</span>
              <span className="title">No alerts yet</span>
              <span className="sub">Run a simulation to generate attack events</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ids-alert-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Source IP</th>
                    <th>Description</th>
                    <th>Risk Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert, i) => {
                    const meta = ATTACK_META[alert.type] || ATTACK_META['Other'];
                    return (
                      <tr key={alert.id || i}>
                        <td style={{ color: '#64748b', fontSize: '.72rem', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                          {alert.time}
                        </td>
                        <td>
                          <span className="attack-type-chip">
                            <span className="attack-icon">{meta.icon}</span>
                            <span style={{ color: meta.color }}>{alert.type}</span>
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '.75rem', color: '#94a3b8' }}>
                          {alert.source_ip}
                        </td>
                        <td style={{ color: '#cbd5e1', maxWidth: 220 }}>{alert.description}</td>
                        <td>
                          <span className={`ids-risk-pill ${alert.severity}`}>{alert.severity}</span>
                        </td>
                        <td>
                          <button className="ids-action-btn" title="View details">
                            <Eye size={13}/>
                          </button>
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title"><AlertTriangle size={15}/> Top Attack Types</div>
            <button className="ids-date-btn" style={{ padding: '.3rem .7rem', fontSize: '.72rem' }}>
              Last 7 Days ▾
            </button>
          </div>

          {loading ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : attacks.length === 0 ? (
            <div className="ids-empty-state">
              <span className="icon">📊</span>
              <span className="title">No attack data</span>
              <span className="sub">Run a simulation to see attack type breakdown</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={attacks}
                    cx={75} cy={75} innerRadius={52} outerRadius={72}
                    dataKey="value" startAngle={90} endAngle={-270}
                    strokeWidth={0}
                  >
                    {attacks.map((entry, i) => (
                      <Cell key={i} fill={entry.color || DEFAULT_ATTACK_COLORS[i % DEFAULT_ATTACK_COLORS.length]}/>
                    ))}
                  </Pie>
                  <DonutCenter
                    cx={75} cy={75}
                    icon=""
                    label={totalAtk.toString()}
                    sub="Total"
                    color="#e2e8f0"
                  />
                </PieChart>
              </div>

              <div className="ids-legend">
                {attacks.map((item, i) => {
                  const pct = totalAtk > 0 ? ((item.value / totalAtk) * 100).toFixed(1) : '0.0';
                  const color = item.color || DEFAULT_ATTACK_COLORS[i % DEFAULT_ATTACK_COLORS.length];
                  return (
                    <div key={i} className="ids-legend-item">
                      <div className="ids-legend-dot-label">
                        <div className="ids-legend-dot" style={{ background: color }}/>
                        <span style={{ color: '#94a3b8' }}>{item.name}</span>
                      </div>
                      <span className="ids-legend-count">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '.75rem', paddingTop: '.75rem', borderTop: '1px solid var(--border)' }}>
                <button className="ids-view-all">View Attack Analytics →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

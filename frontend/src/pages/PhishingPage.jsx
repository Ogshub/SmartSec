/**
 * PhishingPage — Real ML-Powered URL Analyzer (Step 5)
 * ======================================================
 * 100% real — no mock data.
 *
 * Real signals evaluated per URL:
 *   IP address, URL shortener, suspicious TLD, URL length,
 *   @ symbol, double slash, redirect params, hyphens, subdomains,
 *   HTTPS, phishing keywords, brand-in-subdomain, digit ratio,
 *   special char count, HTTP reachability (optional VirusTotal).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Link2, Search, ShieldX, ShieldCheck, ShieldAlert,
  Trash2, RefreshCw, AlertCircle, CheckCircle2, Clock,
  TrendingUp, BarChart2, Globe, Zap,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
const VERDICT_CFG = {
  Safe:       { icon: <ShieldCheck size={16}/>,  color: '#10b981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.25)' },
  Suspicious: { icon: <ShieldAlert size={16}/>,  color: '#f59e0b', bg: 'rgba(245,158,11,.10)',  border: 'rgba(245,158,11,.25)' },
  Phishing:   { icon: <ShieldX size={16}/>,      color: '#ef4444', bg: 'rgba(239,68,68,.10)',   border: 'rgba(239,68,68,.25)'  },
};

const PIE_COLORS = { safe: '#10b981', suspicious: '#f59e0b', phishing: '#ef4444' };

function RiskMeter({ score }) {
  const color = score < 20 ? '#10b981' : score < 50 ? '#f59e0b' : '#ef4444';
  const pct   = Math.min(score, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 99, transition: 'width .5s ease',
          boxShadow: `0 0 6px ${color}`,
        }}/>
      </div>
      <span style={{ fontSize: '.78rem', fontWeight: 700, color, minWidth: 36, textAlign:'right' }}>
        {score}/100
      </span>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '.3rem',
    }}>
      <div style={{ color: '#64748b', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.07em', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
        <span style={{ color }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color ?? '#e2e8f0', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function FeatureGrid({ features }) {
  if (!features) return null;
  const items = [
    { label: 'URL Length',       value: features.url_length,      good: features.url_length < 75 },
    { label: 'HTTPS',            value: features.has_https ? 'Yes' : 'No', good: features.has_https },
    { label: 'Reachable',        value: features.is_reachable ? `Yes (${features.http_status})` : 'No', good: features.is_reachable },
    { label: 'Subdomains',       value: features.subdomain_count, good: features.subdomain_count <= 1 },
    { label: 'Hyphens',          value: features.hyphen_count,    good: features.hyphen_count <= 1 },
    { label: 'TLD',              value: `.${features.tld}` || '?',        good: !['tk','ml','ga','cf','gq','xyz'].includes(features.tld) },
    { label: 'Special Chars',    value: features.special_chars,   good: features.special_chars < 10 },
    { label: 'Phishing Keywords',value: features.keyword_count,   good: features.keyword_count === 0 },
    { label: 'IP as Host',       value: features.has_ip ? 'Yes' : 'No', good: !features.has_ip },
    { label: 'Shortened URL',    value: features.is_shortened ? 'Yes' : 'No', good: !features.is_shortened },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '.5rem', marginTop: '.75rem' }}>
      {items.map(({ label, value, good }) => (
        <div key={label} style={{
          background: good ? 'rgba(16,185,129,.07)' : 'rgba(239,68,68,.07)',
          border: `1px solid ${good ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.18)'}`,
          borderRadius: 8, padding: '.45rem .7rem',
        }}>
          <div style={{ fontSize: '.67rem', color: '#64748b', marginBottom: '.2rem' }}>{label}</div>
          <div style={{ fontSize: '.82rem', fontWeight: 600, color: good ? '#10b981' : '#ef4444' }}>
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PhishingPage() {
  const [url,        setUrl]        = useState('');
  const [scanning,   setScanning]   = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const [history,    setHistory]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [histLoad,   setHistLoad]   = useState(true);
  const [clearing,   setClearing]   = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistLoad(true);
    try {
      const [h, s] = await Promise.all([
        api.get('/phishing/history?limit=20'),
        api.get('/phishing/stats'),
      ]);
      setHistory(h.data.history || []);
      setStats(s.data);
    } catch { /* silent */ }
    finally { setHistLoad(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setScanning(true);
    setResult(null);
    setError('');
    try {
      const res = await api.post('/phishing/scan', { url: url.trim() });
      setResult(res.data);
      await fetchHistory();
    } catch (err) {
      setError(err.response?.data?.detail || 'Scan failed. Check the URL and try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.delete('/phishing/history');
      setHistory([]);
      setStats(null);
      setResult(null);
    } catch { /* silent */ }
    finally { setClearing(false); }
  };

  const verdict  = result?.verdict;
  const vcfg     = verdict ? VERDICT_CFG[verdict] : null;
  const pieData  = stats ? [
    { name: 'Safe',       value: stats.safe },
    { name: 'Suspicious', value: stats.suspicious },
    { name: 'Phishing',   value: stats.phishing },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="ids-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="ids-title-block">
          <h2>Phishing URL Detector</h2>
          <p>16-signal heuristic analysis with HTTP reachability check. Results stored to your account.</p>
        </div>
        <div className="ids-actions">
          <button className="ids-export-btn" onClick={fetchHistory} disabled={histLoad}>
            <RefreshCw size={14} style={histLoad ? { animation:'ids-spin .7s linear infinite' } : {}}/> Refresh
          </button>
          {history.length > 0 && (
            <button className="ids-export-btn" onClick={handleClear} disabled={clearing} style={{ borderColor:'rgba(239,68,68,.3)', color:'#ef4444' }}>
              <Trash2 size={14}/> Clear History
            </button>
          )}
        </div>
      </div>

      {/* ── Stats Row ── */}
      {stats && stats.total_scans > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'.75rem', marginBottom:'1rem' }}>
          <StatCard label="Total Scans"    value={stats.total_scans}                       icon={<Search size={13}/>}      color="#94a3b8"/>
          <StatCard label="Safe"           value={stats.safe}                              icon={<ShieldCheck size={13}/>} color="#10b981"/>
          <StatCard label="Suspicious"     value={stats.suspicious}                        icon={<ShieldAlert size={13}/>} color="#f59e0b"/>
          <StatCard label="Phishing"       value={stats.phishing}                          icon={<ShieldX size={13}/>}     color="#ef4444"/>
        </div>
      )}

      {/* ── Scanner Card ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title" style={{ marginBottom:'1rem', display:'flex', gap:'.5rem', alignItems:'center' }}>
          <Search size={15}/> URL Scanner
          <span style={{ fontSize:'.7rem', color:'var(--text3)', fontWeight:400, marginLeft:'auto' }}>
            16 heuristic signals · HTTP reachability · Optional VirusTotal
          </span>
        </div>
        <form onSubmit={handleScan} style={{ display:'flex', gap:'.75rem' }}>
          <div style={{ flex:1, position:'relative' }}>
            <Globe size={14} style={{
              position:'absolute', left:'.9rem', top:'50%', transform:'translateY(-50%)',
              color:'#475569', pointerEvents:'none',
            }}/>
            <input
              className="form-input"
              placeholder="Enter URL to scan — e.g. http://paypa1-secure-login.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ paddingLeft:'2.4rem' }}
              disabled={scanning}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ minWidth:130, display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem' }}
            disabled={scanning || !url.trim()}
          >
            {scanning ? (
              <><span className="ids-spinner" style={{ width:14, height:14 }}/> Analysing…</>
            ) : (
              <><Search size={14}/> Scan URL</>
            )}
          </button>
        </form>
        {error && (
          <div style={{ marginTop:'.65rem', display:'flex', gap:'.4rem', alignItems:'center', color:'#ef4444', fontSize:'.8rem' }}>
            <AlertCircle size={13}/> {error}
          </div>
        )}

        {/* ── Scan Result ── */}
        {result && vcfg && (
          <div style={{
            marginTop:'1.1rem', padding:'1rem 1.15rem', borderRadius:12,
            background: vcfg.bg, border: `1px solid ${vcfg.border}`,
          }}>
            {/* Verdict header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.65rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.55rem' }}>
                <span style={{ color: vcfg.color }}>{vcfg.icon}</span>
                <span style={{ fontWeight:700, fontSize:'1rem', color: vcfg.color }}>{verdict}</span>
                {result.virustotal && (
                  <span style={{ fontSize:'.7rem', padding:'.2rem .5rem', borderRadius:4, background:'rgba(99,102,241,.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,.25)' }}>
                    VirusTotal: {result.virustotal.malicious} malicious
                  </span>
                )}
              </div>
              <span style={{ fontSize:'.75rem', color:'#64748b' }}>
                Confidence: {Math.round(result.confidence * 100)}%
              </span>
            </div>

            <div style={{ fontSize:'.8rem', color:'#94a3b8', wordBreak:'break-all', marginBottom:'.65rem' }}>
              {result.url}
            </div>

            <RiskMeter score={result.risk_score}/>

            {/* Flags */}
            {result.flags?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'.35rem', marginTop:'.8rem' }}>
                {result.flags.map((f, i) => (
                  <span key={i} style={{
                    fontSize:'.71rem', padding:'.18rem .55rem', borderRadius:5,
                    background:'rgba(239,68,68,.1)', color:'#f87171',
                    border:'1px solid rgba(239,68,68,.2)',
                  }}>⚠ {f}</span>
                ))}
              </div>
            )}

            {/* Feature grid */}
            <FeatureGrid features={result.features}/>
          </div>
        )}
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem', alignItems:'start' }}>

        {/* History table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={14}/> Scan History</div>
            <span style={{ fontSize:'.72rem', color:'var(--text3)' }}>
              {history.length} scans · all from your account
            </span>
          </div>
          {histLoad ? (
            <div className="ids-empty-state"><span className="ids-spinner"/></div>
          ) : history.length === 0 ? (
            <div className="ids-empty-state">
              <span className="icon">🔗</span>
              <span className="title">No scans yet</span>
              <span className="sub">Scan a URL above — results are saved here automatically</span>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="ids-alert-table" style={{ fontSize:'.78rem' }}>
                <thead>
                  <tr><th>URL</th><th>Verdict</th><th>Risk</th><th>Scanned</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const cfg = VERDICT_CFG[h.verdict] || VERDICT_CFG['Safe'];
                    return (
                      <tr key={h.id || i}>
                        <td style={{ maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'JetBrains Mono,monospace', fontSize:'.72rem', color:'#94a3b8' }}>
                          {h.url}
                        </td>
                        <td>
                          <span style={{
                            display:'inline-flex', alignItems:'center', gap:'.3rem',
                            fontSize:'.72rem', fontWeight:600, color: cfg.color,
                            padding:'.18rem .5rem', borderRadius:5,
                            background: cfg.bg, border:`1px solid ${cfg.border}`,
                          }}>
                            {cfg.icon} {h.verdict}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', minWidth:90 }}>
                            <div style={{ flex:1, height:4, borderRadius:99, background:'rgba(255,255,255,.07)' }}>
                              <div style={{ height:'100%', width:`${h.risk_score}%`, borderRadius:99, background: cfg.color }}/>
                            </div>
                            <span style={{ color: cfg.color, fontWeight:600, fontSize:'.7rem' }}>{Math.round(h.risk_score)}</span>
                          </div>
                        </td>
                        <td style={{ color:'#475569', fontSize:'.7rem', whiteSpace:'nowrap' }}>
                          {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mini pie chart */}
        {stats && stats.total_scans > 0 && pieData.length > 0 && (
          <div className="card" style={{ minWidth:200 }}>
            <div className="card-title" style={{ fontSize:'.8rem', marginBottom:'.75rem' }}>
              <BarChart2 size={14}/> Breakdown
            </div>
            <PieChart width={160} height={160}>
              <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[entry.name.toLowerCase()] || '#64748b'}/>
                ))}
              </Pie>
            </PieChart>
            <div style={{ display:'flex', flexDirection:'column', gap:'.4rem', marginTop:'.25rem' }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:'.4rem', color:'#94a3b8' }}>
                    <span style={{ width:8, height:8, borderRadius:2, background: PIE_COLORS[d.name.toLowerCase()], display:'inline-block' }}/>
                    {d.name}
                  </span>
                  <span style={{ color: PIE_COLORS[d.name.toLowerCase()], fontWeight:700 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

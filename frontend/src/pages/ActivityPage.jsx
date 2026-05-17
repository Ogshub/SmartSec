/**
 * ActivityPage — Full request audit trail from real DB
 */
import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Shield, Clock, Filter } from 'lucide-react';
import api from '../api/client';

const TYPE_COLOR = {
  SUCCESS: { bg: 'rgba(16,185,129,.1)', color: '#34d399', border: 'rgba(16,185,129,.2)' },
  FAILURE: { bg: 'rgba(239,68,68,.1)',  color: '#f87171', border: 'rgba(239,68,68,.2)'  },
  SUSPICIOUS: { bg: 'rgba(245,158,11,.1)', color: '#fbbf24', border: 'rgba(245,158,11,.2)' },
  ANOMALY: { bg: 'rgba(139,92,246,.1)', color: '#a78bfa', border: 'rgba(139,92,246,.2)' },
};

export default function ActivityPage() {
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 20;

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/login-history?limit=100');
      setEvents(res.data.history || []);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const filtered = filter === 'ALL' ? events : events.filter(e => e.event_type === filter);
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const counts = events.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] || 0) + 1;
    return acc;
  }, {});

  const btnBase = (active) => ({
    padding: '.3rem .75rem', borderRadius: 6, fontSize: '.75rem', fontWeight: 600,
    cursor: 'pointer', border: '1px solid',
    background: active ? 'rgba(99,102,241,.2)' : 'transparent',
    borderColor: active ? 'rgba(99,102,241,.4)' : 'rgba(255,255,255,.1)',
    color: active ? '#a5b4fc' : '#64748b',
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem' }}>
        <div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:800, color:'#f1f5f9', margin:0 }}>📋 Activity Monitor</h2>
          <p style={{ color:'#64748b', fontSize:'.82rem', margin:'.3rem 0 0' }}>
            Full audit trail — every login event, session, and security signal
          </p>
        </div>
        <button onClick={fetchActivity} disabled={loading} style={{
          display:'flex', alignItems:'center', gap:'.4rem', padding:'.45rem .9rem',
          borderRadius:8, fontSize:'.78rem', fontWeight:600,
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
          color:'#64748b', cursor:'pointer',
        }}>
          <RefreshCw size={13} style={loading?{animation:'spin .7s linear infinite'}:{}}/> Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div style={{ display:'flex', gap:'.75rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        {[['ALL', events.length, '#6366f1'], ['SUCCESS', counts.SUCCESS||0, '#10b981'], ['FAILURE', counts.FAILURE||0, '#ef4444'], ['SUSPICIOUS', counts.SUSPICIOUS||0, '#f59e0b']].map(([type, count, color]) => (
          <button key={type} onClick={() => { setFilter(type); setPage(1); }} style={btnBase(filter===type)}>
            <span style={{ color }}>{count}</span> {type}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><Activity size={14}/> Login Events</div>
          <span style={{ fontSize:'.72rem', color:'#64748b' }}>{filtered.length} events</span>
        </div>

        {loading ? (
          <div className="ids-empty-state"><span className="ids-spinner"/></div>
        ) : filtered.length === 0 ? (
          <div className="ids-empty-state">
            <span className="icon">📋</span>
            <span className="title">No events found</span>
            <span className="sub">Activity is recorded as you log in and use the platform</span>
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table className="ids-alert-table" style={{ fontSize:'.78rem' }}>
                <thead>
                  <tr>
                    <th>Time</th><th>Event</th><th>IP Address</th>
                    <th>Risk Score</th><th>User Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((ev, i) => {
                    const c = TYPE_COLOR[ev.event_type] || TYPE_COLOR.SUCCESS;
                    return (
                      <tr key={ev.id || i}>
                        <td style={{ color:'#64748b', fontSize:'.72rem', whiteSpace:'nowrap', fontFamily:'monospace' }}>
                          {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span style={{ padding:'.18rem .5rem', borderRadius:5, fontSize:'.72rem', fontWeight:600, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
                            {ev.event_type}
                          </span>
                        </td>
                        <td style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'.75rem', color:'#94a3b8' }}>{ev.ip_address || '—'}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                            <div style={{ width:50, height:4, borderRadius:99, background:'rgba(255,255,255,.07)' }}>
                              <div style={{ height:'100%', width:`${ev.risk_score||0}%`, borderRadius:99, background: (ev.risk_score||0)>60?'#ef4444':(ev.risk_score||0)>30?'#f59e0b':'#10b981' }}/>
                            </div>
                            <span style={{ fontSize:'.7rem', color:'#94a3b8', fontFamily:'monospace' }}>{(ev.risk_score||0).toFixed(0)}</span>
                          </div>
                        </td>
                        <td style={{ color:'#475569', fontSize:'.68rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {ev.user_agent || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:'.5rem', padding:'1rem 0 .5rem' }}>
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{...btnBase(false), padding:'.3rem .6rem'}}>‹</button>
                <span style={{ fontSize:'.78rem', color:'#64748b', display:'flex', alignItems:'center' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{...btnBase(false), padding:'.3rem .6rem'}}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

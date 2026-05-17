import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, TrendingUp, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap, Activity, BarChart3, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, ReferenceLine } from 'recharts';
import api from '../api/client';

function RiskGauge({ score, level }) {
  const color = level === 'High' || level === 'Critical' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#10b981';
  const pC = (cx,cy,r,deg) => { const rad=((deg-90)*Math.PI)/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; };
  const arc = (cx,cy,r,s,e) => { const a=pC(cx,cy,r,s),b=pC(cx,cy,r,e),l=e-s>180?1:0; return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${l} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`; };
  const fillEnd = 180 + (score/100)*180;
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'1rem 0'}}>
      <svg width="200" height="120" viewBox="0 0 200 120" style={{overflow:'visible'}}>
        <path d={arc(100,100,76,180,360)} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" strokeLinecap="round"/>
        <path d={arc(100,100,76,180,240)} fill="none" stroke="rgba(16,185,129,.2)"  strokeWidth="16" strokeLinecap="round"/>
        <path d={arc(100,100,76,240,300)} fill="none" stroke="rgba(245,158,11,.2)"  strokeWidth="16" strokeLinecap="round"/>
        <path d={arc(100,100,76,300,360)} fill="none" stroke="rgba(239,68,68,.2)"   strokeWidth="16" strokeLinecap="round"/>
        {score>0&&<path d={arc(100,100,76,180,Math.min(fillEnd,359.9))} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" style={{filter:`drop-shadow(0 0 8px ${color}99)`}}/>}
        <text x="100" y="95" textAnchor="middle" fill="#f1f5f9" fontSize="30" fontWeight="800" fontFamily="Inter,sans-serif">{Math.round(score)}</text>
        <text x="100" y="114" textAnchor="middle" fill="#475569" fontSize="10">/ 100</text>
        <text x="18" y="110" fill="#64748b" fontSize="9">LOW</text>
        <text x="90" y="20" fill="#64748b" fontSize="9">MED</text>
        <text x="162" y="110" fill="#64748b" fontSize="9">HIGH</text>
      </svg>
      <span style={{padding:'.3rem .85rem',borderRadius:99,fontSize:'.78rem',fontWeight:700,background:`${color}20`,color,border:`1px solid ${color}44`,marginTop:'-.5rem'}}>{level} Risk</span>
    </div>
  );
}

function FactorBar({ label, pts, maxPts=30 }) {
  const pct = Math.min((pts/maxPts)*100,100);
  const color = pts>20?'#ef4444':pts>10?'#f59e0b':'#10b981';
  return (
    <div style={{marginBottom:'.65rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.25rem',fontSize:'.78rem'}}>
        <span style={{color:'#cbd5e1'}}>{label}</span>
        <span style={{color,fontWeight:700}}>+{pts.toFixed(1)}</span>
      </div>
      <div style={{height:5,borderRadius:99,background:'rgba(255,255,255,.06)'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:99,transition:'width .5s ease',boxShadow:`0 0 4px ${color}88`}}/>
      </div>
    </div>
  );
}

const EVENT_LABELS = {login_success:'✅ Login Success',login_failure:'⚠️ Login Failure',new_ip:'🌐 New IP',unusual_hour:'🕐 Unusual Hour',rapid_requests:'⚡ Rapid Requests',multiple_failures:'🔐 Multi Failures',phishing_detected:'🎣 Phishing Detected',phishing_suspicious:'🔍 Suspicious URL',ids_anomaly:'🤖 IDS Anomaly',password_change:'🔑 Password Changed'};
const SEV = {High:{bg:'rgba(239,68,68,.1)',color:'#f87171',border:'rgba(239,68,68,.2)'},Medium:{bg:'rgba(245,158,11,.1)',color:'#fbbf24',border:'rgba(245,158,11,.2)'},Low:{bg:'rgba(16,185,129,.07)',color:'#34d399',border:'rgba(16,185,129,.18)'}};

export default function RiskPage() {
  const [riskData,setRiskData]=useState(null);
  const [history,setHistory]=useState([]);
  const [loading,setLoading]=useState(true);
  const [recalcLoad,setRecalcLoad]=useState(false);
  const [error,setError]=useState('');

  const fetchData = useCallback(async()=>{
    setLoading(true); setError('');
    try {
      const [s,h]=await Promise.all([api.get('/risk/score'),api.get('/risk/history?limit=30')]);
      setRiskData(s.data);
      // backend returns 'events' key, alias as 'history'
      setHistory(h.data.history || h.data.events || []);
    } catch(e){setError(e.response?.data?.detail||'Failed to load risk data');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchData();},[fetchData]);

  const handleRecalc = async()=>{setRecalcLoad(true);try{await api.post('/risk/recalculate');await fetchData();}catch{}finally{setRecalcLoad(false);}};

  const score=riskData?.risk_score??0, level=riskData?.risk_level??'Low';
  const chartData=history.slice().reverse().map(ev=>({label:new Date(ev.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric'}),delta:ev.score_delta}));
  const radarData=[
    {subject:'Login Safety', score:Math.max(0,100-(riskData?.factors?.login_failure??0)*3)},
    {subject:'IP Safety',    score:Math.max(0,100-(riskData?.factors?.new_ip??0)*4)},
    {subject:'Time',         score:Math.max(0,100-(riskData?.factors?.unusual_hour??0)*5)},
    {subject:'URL Safety',   score:Math.max(0,100-(riskData?.factors?.phishing??0)*8)},
    {subject:'Request Rate', score:Math.max(0,100-(riskData?.factors?.rapid_requests??0)*3)},
    {subject:'Auth Health',  score:Math.max(0,100-(riskData?.factors?.multiple_failures??0)*6)},
  ];

  const btnBase={display:'flex',alignItems:'center',gap:'.4rem',padding:'.45rem .9rem',borderRadius:8,fontSize:'.78rem',fontWeight:600,cursor:'pointer'};

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
        <div>
          <h2 style={{fontSize:'1.2rem',fontWeight:800,color:'#f1f5f9',margin:0}}>🛡️ Risk Scoring Engine</h2>
          <p style={{color:'#64748b',fontSize:'.82rem',margin:'.3rem 0 0'}}>Composite score from IDS, phishing, login history & behavioral patterns</p>
        </div>
        <div style={{display:'flex',gap:'.5rem'}}>
          <button onClick={handleRecalc} disabled={recalcLoad} style={{...btnBase,background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',color:'#818cf8'}}>
            {recalcLoad?<RefreshCw size={13} style={{animation:'spin .7s linear infinite'}}/>:<Zap size={13}/>} Recalculate
          </button>
          <button onClick={fetchData} disabled={loading} style={{...btnBase,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',color:'#64748b'}}>
            <RefreshCw size={13} style={loading?{animation:'spin .7s linear infinite'}:{}}/> Refresh
          </button>
        </div>
      </div>

      {error&&<div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,padding:'.75rem 1rem',marginBottom:'1rem',color:'#f87171',fontSize:'.82rem'}}>⚠️ {error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
        <div className="card">
          <div className="card-header"><div className="card-title"><ShieldAlert size={14}/> Current Risk</div></div>
          {loading?<div className="ids-empty-state"><span className="ids-spinner"/></div>:<>
            <RiskGauge score={score} level={level}/>
            <div style={{fontSize:'.72rem',color:'#64748b',textAlign:'center',paddingBottom:'.5rem'}}>
              Updated: {riskData?.last_updated?new Date(riskData.last_updated).toLocaleString():'Just now'}
            </div>
          </>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><BarChart3 size={14}/> Risk Factors</div></div>
          {loading?<div className="ids-empty-state"><span className="ids-spinner"/></div>:
          riskData?.event_breakdown?.length>0?
          <div style={{padding:'.25rem 0'}}>
            {riskData.event_breakdown.slice(0,6).map((ev,i)=>(
              <FactorBar key={i} label={EVENT_LABELS[ev.type]||ev.type} pts={ev.total_delta}
                maxPts={Math.max(...riskData.event_breakdown.map(e=>e.total_delta),1)}/>
            ))}
          </div>:
          <div className="ids-empty-state"><span className="icon">📊</span><span className="title">No events yet</span><span className="sub">Risk factors appear as you use the platform</span></div>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><Activity size={14}/> Security Posture</div></div>
          {loading?<div className="ids-empty-state"><span className="ids-spinner"/></div>:
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{top:10,right:20,bottom:10,left:20}}>
              <PolarGrid stroke="rgba(255,255,255,.07)"/>
              <PolarAngleAxis dataKey="subject" tick={{fontSize:10,fill:'#64748b'}}/>
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2}/>
              <Tooltip contentStyle={{background:'#0d1526',border:'1px solid #1e3a5f',borderRadius:8}} formatter={v=>[`${v}/100`,'Score']}/>
            </RadarChart>
          </ResponsiveContainer>}
        </div>
      </div>

      {(riskData?.recommendations||[]).length>0&&(
        <div className="card" style={{marginBottom:'1rem'}}>
          <div className="card-header"><div className="card-title"><Info size={14}/> Recommendations</div></div>
          <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
            {riskData.recommendations.map((rec,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'.75rem',padding:'.6rem .85rem',borderRadius:8,background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)'}}>
                <span style={{color:'#6366f1',marginTop:'.1rem'}}>{rec.severity==='High'?<AlertTriangle size={14}/>:<CheckCircle size={14}/>}</span>
                <div>
                  <div style={{fontSize:'.82rem',color:'#e2e8f0',fontWeight:600}}>{rec.title}</div>
                  <div style={{fontSize:'.75rem',color:'#64748b',marginTop:'.15rem'}}>{rec.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:'1rem'}}>
        <div className="card">
          <div className="card-header"><div className="card-title"><TrendingUp size={14}/> Risk Event Timeline</div><span style={{fontSize:'.72rem',color:'#64748b'}}>Last {history.length} events</span></div>
          {loading?<div className="ids-empty-state"><span className="ids-spinner"/></div>:chartData.length===0?
          <div className="ids-empty-state"><span className="icon">📈</span><span className="title">No events yet</span><span className="sub">Timeline builds as you interact with the platform</span></div>:
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{top:5,right:10,left:-20,bottom:0}}>
              <defs>
                <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
              <XAxis dataKey="label" tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#475569',fontSize:10}} axisLine={false} tickLine={false}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,.15)" strokeDasharray="4 4"/>
              <Tooltip contentStyle={{background:'#0d1526',border:'1px solid #1e3a5f',borderRadius:8}} formatter={v=>[`${v>0?'+':''}${v.toFixed(1)}`,'Risk Delta']}/>
              <Area type="monotone" dataKey="delta" stroke="#6366f1" strokeWidth={2} fill="url(#gRisk)" name="Risk Delta"/>
            </AreaChart>
          </ResponsiveContainer>}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title"><Clock size={14}/> Recent Events</div></div>
          {loading?<div className="ids-empty-state"><span className="ids-spinner"/></div>:history.length===0?
          <div className="ids-empty-state"><span className="icon">📋</span><span className="title">No events recorded</span></div>:
          <div style={{display:'flex',flexDirection:'column',gap:'.35rem',maxHeight:260,overflowY:'auto'}}>
            {history.slice(0,15).map((ev,i)=>{
              const sev=ev.score_delta>15?'High':ev.score_delta>5?'Medium':'Low';
              const c=SEV[sev];
              return(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.4rem .6rem',borderRadius:7,background:c.bg,border:`1px solid ${c.border}`}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'.75rem',fontWeight:600,color:'#e2e8f0'}}>{EVENT_LABELS[ev.event_type]||ev.event_type}</div>
                    <div style={{fontSize:'.67rem',color:'#64748b'}}>{new Date(ev.created_at).toLocaleString()}</div>
                  </div>
                  <span style={{fontSize:'.72rem',fontWeight:700,color:c.color,whiteSpace:'nowrap'}}>{ev.score_delta>0?'+':''}{ev.score_delta.toFixed(1)}</span>
                </div>
              );
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}

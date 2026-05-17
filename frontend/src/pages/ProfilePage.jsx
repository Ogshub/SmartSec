import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import AvatarCropModal from '../components/AvatarCropModal';
import UserAvatar from '../components/UserAvatar';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChevronRight, Camera, X, Check, ExternalLink } from 'lucide-react';

const AVATAR_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
const C = { bg:'#070b14', card:'#0d1526', border:'rgba(255,255,255,.07)', text:'#f1f5f9', muted:'#64748b', muted2:'#94a3b8' };
const card = (x={}) => ({ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'1.25rem', ...x });

function Bar({ label, value, color }) {
  return (
    <div style={{ marginBottom:'.7rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.73rem', marginBottom:'.25rem' }}>
        <span style={{ color:C.muted2 }}>{label}</span><span style={{ color:C.text, fontWeight:600 }}>{value}/100</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3 }}>
        <div style={{ height:'100%', width:`${value}%`, borderRadius:3, background:color, boxShadow:`0 0 6px ${color}66` }} />
      </div>
    </div>
  );
}

function Gauge({ score, level }) {
  const color = { Low:'#10b981', Medium:'#f59e0b', High:'#ef4444' }[level]||'#f59e0b';
  const polar=(cx,cy,r,deg)=>{const rad=((deg-90)*Math.PI)/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}};
  const arc=(cx,cy,r,s,e)=>{const p1=polar(cx,cy,r,s),p2=polar(cx,cy,r,e);return`M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`};
  const end=180+(score/100)*180;
  return (
    <svg width="130" height="76" viewBox="0 0 130 76" style={{overflow:'visible'}}>
      <path d={arc(65,65,48,180,360)} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="10" strokeLinecap="round"/>
      <path d={arc(65,65,48,180,240)} fill="none" stroke="rgba(16,185,129,.2)" strokeWidth="10" strokeLinecap="round"/>
      <path d={arc(65,65,48,240,300)} fill="none" stroke="rgba(245,158,11,.2)" strokeWidth="10" strokeLinecap="round"/>
      <path d={arc(65,65,48,300,360)} fill="none" stroke="rgba(239,68,68,.2)" strokeWidth="10" strokeLinecap="round"/>
      {score>0&&<path d={arc(65,65,48,180,Math.min(end,359.9))} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${color})`}}/>}
      <text x="65" y="63" textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="800" fontFamily="Inter">{score}</text>
      <text x="65" y="72" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter">/100</text>
    </svg>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [loginHistory, setLoginHistory] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [form, setForm] = useState({ full_name:'', username:'', phone_number:'', location:'', bio:'', avatar_color:'#6366f1' });

  useEffect(() => { refreshUser(); }, []);

  useEffect(() => {
    if (user) setForm({
      full_name: user.full_name || user.username || '',
      username: user.username || '',
      phone_number: user.phone_number || '',
      location: user.location || '',
      bio: user.bio || '',
      avatar_color: user.avatar_color || '#6366f1',
    });
  }, [user?.id]);

  useEffect(() => {
    api.get('/auth/login-history?limit=5').then(r => setLoginHistory(r.data.history || [])).catch(()=>{});
    api.get('/risk/history?limit=7').then(r => {
      const evs = r.data.history || r.data.events || [];
      setRiskHistory(evs.slice().reverse().map(e => ({
        date: new Date(e.created_at).toLocaleDateString('en-IN',{month:'short',day:'numeric'}),
        score: Math.max(0, Math.min(100, e.score_delta || 0)),
      })));
    }).catch(()=>{});
    api.get('/dashboard').then(r => setDashStats(r.data)).catch(()=>{});
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };
  const handleSave = async () => {
    setSaving(true);
    const res = await updateProfile(form);
    setSaving(false);
    if (res.success) { setEditOpen(false); showToast('Profile saved ✓'); }
    else showToast(`Error: ${res.error}`);
  };

  const score = Math.round(user?.risk_score ?? 0);
  const level = user?.risk_level ?? 'Low';
  const lvlColor = { Low:'#10b981', Medium:'#f59e0b', High:'#ef4444' }[level]||'#10b981';
  const initials = (user?.username||'U').slice(0,2).toUpperCase();

  // Compute real security bars from actual data
  const loginFailPct = Math.min(100, (loginHistory.filter(e=>e.event_type==='FAILURE').length / Math.max(loginHistory.length,1)) * 100);
  const loginSecScore = Math.round(100 - loginFailPct * 0.7);
  const urlScansTotal = dashStats?.phishing?.total_scans ?? 0;
  const phishingScore = Math.min(100, Math.round((urlScansTotal / Math.max(urlScansTotal + (dashStats?.phishing?.phishing ?? 0), 1)) * 100));

  // Build badges dynamically
  const badges = [
    { icon:'🛡️', color:'#10b981', title:'Secure Login',   sub:`${user?.login_count??0} successful logins`, earned: (user?.login_count??0) >= 1 },
    { icon:'🔍', color:'#6366f1', title:'Threat Aware',   sub:`${urlScansTotal} URLs scanned`,             earned: urlScansTotal >= 1 },
    { icon:'⚡', color:'#3b82f6', title:'Active User',     sub:'Using SmartSec platform',                  earned: true },
    { icon:'📊', color:'#f59e0b', title:'Risk Monitor',    sub:'Risk tracking enabled',                    earned: true },
  ];

  const statusColor = (ev) => {
    if (ev.event_type === 'SUCCESS') return { color:'#10b981', icon:'✅', status:'Safe' };
    if (ev.event_type === 'SUSPICIOUS') return { color:'#f59e0b', icon:'⚠️', status:'Unusual' };
    return { color:'#ef4444', icon:'❌', status:'Failed' };
  };

  return (
    <div>
      {toast && (
        <div style={{ position:'fixed', top:20, right:24, zIndex:9999, background:'#0f1929', border:'1px solid rgba(99,102,241,.4)', borderRadius:10, padding:'.7rem 1.2rem', color:'#a5b4fc', fontWeight:600, fontSize:'.85rem', boxShadow:'0 8px 30px rgba(0,0,0,.5)' }}>
          {toast}
        </div>
      )}

      <div className="profile-header-row">
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:C.text }}>My Profile</h1>
          <p style={{ fontSize:'.8rem', color:C.muted, marginTop:'.2rem' }}>View and manage your account information and security.</p>
        </div>
        <button onClick={()=>setEditOpen(true)} style={{ display:'flex', alignItems:'center', gap:'.4rem', padding:'.5rem 1.1rem', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(99,102,241,.1)', color:'#a5b4fc', fontWeight:600, fontSize:'.82rem', cursor:'pointer' }}>
          ✏️ Edit Profile
        </button>
      </div>

      {/* Row 1 */}
      <div className="profile-row1">
        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.1rem' }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <UserAvatar user={user} size={72} fontSize="1.5rem" />
              <button onClick={()=>setAvatarOpen(true)} style={{ position:'absolute', bottom:0, right:0, width:22, height:22, borderRadius:'50%', background:'#1e3a5f', border:`2px solid ${C.card}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <Camera size={11} color="#94a3b8"/>
              </button>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:'1.1rem', color:C.text }}>{user?.full_name || user?.username || 'User'}</div>
              <div style={{ fontSize:'.78rem', color:C.muted, marginBottom:'.4rem' }}>{user?.email}</div>
              <span style={{ padding:'.2rem .65rem', borderRadius:999, background:'rgba(16,185,129,.12)', color:'#10b981', fontSize:'.7rem', fontWeight:700, border:'1px solid rgba(16,185,129,.25)' }}>Online</span>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.5rem', borderTop:`1px solid ${C.border}`, paddingTop:'.9rem' }}>
            {[
              { icon:'📅', label:'Member since', val: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—' },
              { icon:'🛡️', label:'Role', val: user?.account_type || 'User' },
              { icon:'📍', label:'Location', val: user?.location || 'Not set' },
            ].map(i=>(
              <div key={i.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.9rem', marginBottom:'.15rem' }}>{i.icon}</div>
                <div style={{ fontSize:'.63rem', color:C.muted }}>{i.label}</div>
                <div style={{ fontSize:'.72rem', fontWeight:600, color:C.muted2, marginTop:'.1rem' }}>{i.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}>
            <span>🛡️</span><span style={{ fontWeight:700, fontSize:'.92rem', color:C.text }}>Security Risk Summary</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'1.25rem', alignItems:'start' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.4rem' }}>
              <Gauge score={score} level={level}/>
              <button onClick={()=>navigate('/risk')} style={{ padding:'.4rem 1rem', borderRadius:7, background:'rgba(99,102,241,.15)', border:'1px solid rgba(99,102,241,.3)', color:'#a5b4fc', fontSize:'.73rem', fontWeight:600, cursor:'pointer' }}>View Risk Details</button>
            </div>
            <div>
              <div style={{ fontWeight:700, color:lvlColor, fontSize:'.9rem', marginBottom:'.2rem' }}>{level} Risk</div>
              <div style={{ fontSize:'.73rem', color:C.muted, lineHeight:1.6, marginBottom:'.85rem' }}>Your overall security risk is {level.toLowerCase()}. Follow best practices to stay protected.</div>
              <Bar label="Login Security"    value={loginSecScore}  color="#10b981"/>
              <Bar label="URL Safety"        value={phishingScore}  color="#3b82f6"/>
              <Bar label="Threat Exposure"   value={Math.max(0,100-score)} color="#ef4444"/>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="profile-row2">
        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}><span>👤</span><span style={{ fontWeight:700, fontSize:'.88rem', color:C.text }}>Account Information</span></div>
          {[
            { icon:'👤', label:'Full Name',    val: user?.full_name || user?.username || '—' },
            { icon:'✉️', label:'Email',        val: user?.email || '—' },
            { icon:'📞', label:'Phone',        val: user?.phone_number || 'Not set' },
            { icon:'🛡️', label:'Account Type', val: user?.account_type || 'Standard User' },
          ].map((row,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'.7rem', padding:'.52rem 0', borderBottom:i<3?`1px solid ${C.border}`:'none' }}>
              <span style={{ fontSize:'.88rem', flexShrink:0 }}>{row.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'.66rem', color:C.muted }}>{row.label}</div>
                <div style={{ fontSize:'.79rem', color:C.muted2, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.val}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}><span>🔄</span><span style={{ fontWeight:700, fontSize:'.88rem', color:C.text }}>Recent Login Activity</span></div>
          {loginHistory.length === 0 ? (
            <p style={{ color:C.muted, fontSize:'.8rem' }}>No login history yet.</p>
          ) : loginHistory.map((ev,i)=>{
            const s = statusColor(ev);
            return (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'.6rem', padding:'.48rem 0', borderBottom:i<loginHistory.length-1?`1px solid ${C.border}`:'none' }}>
                <span style={{ fontSize:'.88rem', marginTop:'.1rem' }}>{s.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'.74rem', fontWeight:600, color:C.muted2 }}>{new Date(ev.created_at).toLocaleString()}</div>
                  <div style={{ fontSize:'.69rem', color:C.muted, marginTop:'.08rem' }}>IP: {ev.ip_address || 'Unknown'}</div>
                </div>
                <span style={{ fontSize:'.7rem', fontWeight:700, color:s.color, flexShrink:0 }}>{s.status}</span>
              </div>
            );
          })}
          <div onClick={()=>navigate('/activity')} style={{ marginTop:'.5rem', fontSize:'.74rem', color:'#6366f1', cursor:'pointer', display:'flex', alignItems:'center', gap:'.3rem' }}>View all activity <ExternalLink size={11}/></div>
        </div>

        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}><span>🏆</span><span style={{ fontWeight:700, fontSize:'.88rem', color:C.text }}>Security Badges</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.55rem' }}>
            {badges.map(b=>(
              <div key={b.title} style={{ background: b.earned ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.01)', border:`1px solid ${b.earned ? C.border : 'rgba(255,255,255,.03)'}`, borderRadius:10, padding:'.65rem .55rem', textAlign:'center', opacity: b.earned ? 1 : 0.4 }}>
                <div style={{ width:38,height:38,borderRadius:'50%',background:`${b.color}18`,border:`2px solid ${b.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',margin:'0 auto .4rem' }}>{b.icon}</div>
                <div style={{ fontSize:'.7rem', fontWeight:700, color:C.muted2, marginBottom:'.15rem' }}>{b.title}</div>
                <div style={{ fontSize:'.62rem', color:C.muted, lineHeight:1.4 }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="profile-row3">
        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
              <span>🛡️</span>
              <div>
                <div style={{ fontWeight:700, fontSize:'.88rem', color:C.text }}>Security Overview</div>
                <div style={{ fontSize:'.69rem', color:C.muted }}>Risk score trend</div>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'1rem', alignItems:'center' }}>
            <ResponsiveContainer width="100%" height={155}>
              <LineChart data={riskHistory.length > 0 ? riskHistory : [{date:'Now',score:score}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                <XAxis dataKey="date" tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#475569' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:'#111e35', border:`1px solid ${C.border}`, borderRadius:8, fontSize:'.75rem' }}/>
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ fill:'#6366f1', r:4 }} activeDot={{ r:6 }}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem' }}>
              {[
                {icon:'🔍',label:'URLs Scanned',  val: urlScansTotal},
                {icon:'🔑',label:'Total Logins',  val: user?.login_count ?? 0},
                {icon:'🛡️',label:'Risk Score',    val: `${score}/100`},
              ].map(s=>(
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <span style={{ fontSize:'.95rem' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:'.67rem', color:C.muted }}>{s.label}</div>
                    <div style={{ fontSize:'.8rem', fontWeight:700, color:C.muted2 }}>{s.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={card()}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}><span>⚙️</span><span style={{ fontWeight:700, fontSize:'.88rem', color:C.text }}>Account Actions</span></div>
          {[
            {icon:'🔑',label:'Change Password',         sub:'Update your account password',        danger:false, action:()=>navigate('/settings')},
            {icon:'🔐',label:'Two-Factor Auth',          sub:'Configure security in settings',      danger:false, action:()=>navigate('/settings')},
            {icon:'📋',label:'View Activity Log',        sub:'Full audit trail of your actions',    danger:false, action:()=>navigate('/activity')},
            {icon:'🗑️',label:'Delete Account',           sub:'Contact support to delete account',   danger:true,  action:()=>showToast('Email support@smartsec.dev to delete your account.')},
          ].map((a,i)=>(
            <div key={i} onClick={a.action} style={{ display:'flex', alignItems:'center', gap:'.7rem', padding:'.62rem 0', borderBottom:i<3?`1px solid ${C.border}`:'none', cursor:'pointer' }}>
              <span style={{ fontSize:'.95rem', flexShrink:0 }}>{a.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'.81rem', fontWeight:600, color:a.danger?'#ef4444':C.muted2 }}>{a.label}</div>
                <div style={{ fontSize:'.69rem', color:C.muted, marginTop:'.08rem' }}>{a.sub}</div>
              </div>
              <ChevronRight size={14} color={C.muted}/>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#0d1526', border:`1px solid ${C.border}`, borderRadius:16, padding:'1.75rem', width:480, maxWidth:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.6)', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.4rem' }}>
              <h2 style={{ fontWeight:800, fontSize:'1.1rem', color:C.text }}>Edit Profile</h2>
              <button onClick={()=>setEditOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted }}><X size={20}/></button>
            </div>
            <div style={{ marginBottom:'1.2rem' }}>
              <div style={{ fontSize:'.75rem', color:C.muted, marginBottom:'.6rem', fontWeight:600 }}>Avatar Color</div>
              <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:`linear-gradient(135deg, ${form.avatar_color}, ${form.avatar_color}99)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:'1.1rem', flexShrink:0 }}>
                  {initials}
                </div>
                <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap' }}>
                  {AVATAR_COLORS.map(c=>(
                    <button key={c} onClick={()=>setForm(p=>({...p,avatar_color:c}))} style={{ width:24, height:24, borderRadius:'50%', background:c, border:form.avatar_color===c?'3px solid #fff':'2px solid transparent', cursor:'pointer', outline:'none' }}/>
                  ))}
                </div>
              </div>
            </div>
            {[
              {label:'Full Name',    key:'full_name',    type:'text', ph:'Enter your full name'},
              {label:'Username',     key:'username',     type:'text', ph:'Enter username'},
              {label:'Phone Number', key:'phone_number', type:'tel',  ph:'+91 00000 00000'},
              {label:'Location',     key:'location',     type:'text', ph:'City, Country'},
              {label:'Bio',          key:'bio',          type:'text', ph:'Short bio about yourself'},
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:'.9rem' }}>
                <label style={{ display:'block', fontSize:'.74rem', color:C.muted, fontWeight:600, marginBottom:'.3rem' }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} placeholder={f.ph}
                  onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                  style={{ width:'100%', padding:'.6rem .85rem', borderRadius:8, background:'rgba(255,255,255,.04)', border:`1px solid ${C.border}`, color:C.text, fontSize:'.85rem', outline:'none', boxSizing:'border-box' }}
                />
              </div>
            ))}
            <div style={{ display:'flex', gap:'.75rem', marginTop:'1.4rem' }}>
              <button onClick={()=>setEditOpen(false)} style={{ flex:1, padding:'.65rem', borderRadius:8, background:'rgba(255,255,255,.05)', border:`1px solid ${C.border}`, color:C.muted2, fontWeight:600, cursor:'pointer', fontSize:'.85rem' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:'.65rem', borderRadius:8, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.85rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', opacity:saving?0.7:1 }}>
                {saving?'Saving…':<><Check size={16}/>Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {avatarOpen && (
        <AvatarCropModal onClose={()=>setAvatarOpen(false)} onSuccess={()=>{ refreshUser(); showToast('Profile picture updated ✓'); }}/>
      )}

      <style>{`
        .profile-header-row { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:.75rem; }
        .profile-row1 { display:grid; grid-template-columns:1fr 1.6fr; gap:1rem; margin-bottom:1rem; }
        .profile-row2 { display:grid; grid-template-columns:1fr 1.4fr 1fr; gap:1rem; margin-bottom:1rem; }
        .profile-row3 { display:grid; grid-template-columns:1.6fr 1fr; gap:1rem; }
        @media(max-width:900px) {
          .profile-row1,.profile-row2,.profile-row3 { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}

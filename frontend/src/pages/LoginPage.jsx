/**
 * LoginPage — Premium split-panel design
 * Left: Animated hero with SmartSec branding
 * Right: Login / Register form + OAuth (Google, GitHub)
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, ShieldCheck, Zap, Lock, Activity } from 'lucide-react';

/* ─────────────── OAuth Brand SVGs ─────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);



/* ─────────────── Animated Background Orbs ─────────────── */
function AnimatedBG() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {[
        { w:420, h:420, top:'-10%', left:'-8%', c1:'#4f46e5', c2:'#7c3aed', dur:18 },
        { w:280, h:280, top:'55%',  left:'60%',  c1:'#0ea5e9', c2:'#6366f1', dur:14 },
        { w:200, h:200, top:'20%',  left:'70%',  c1:'#8b5cf6', c2:'#a855f7', dur:20 },
        { w:160, h:160, top:'70%',  left:'10%',  c1:'#06b6d4', c2:'#3b82f6', dur:16 },
      ].map((o, i) => (
        <div key={i} style={{
          position:'absolute', width:o.w, height:o.h,
          top:o.top, left:o.left,
          background:`radial-gradient(circle, ${o.c1}22, ${o.c2}08)`,
          borderRadius:'50%',
          animation:`float${i} ${o.dur}s ease-in-out infinite`,
          filter:'blur(40px)',
        }}/>
      ))}
      {/* Grid overlay */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)',
        backgroundSize:'40px 40px',
      }}/>
      <style>{`
        @keyframes float0 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,20px) scale(1.05)} }
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(0.95)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-25px) scale(1.1)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-15px,15px) scale(0.9)} }
      `}</style>
    </div>
  );
}

/* ─────────────── Stat badge ─────────────── */
function StatBadge({ icon, value, label, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'.6rem', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'.6rem .9rem', backdropFilter:'blur(8px)' }}>
      <div style={{ width:32, height:32, borderRadius:8, background:`${color}1a`, border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight:800, fontSize:'.95rem', color:'#f1f5f9', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:'.67rem', color:'#64748b', marginTop:'.1rem' }}>{label}</div>
      </div>
    </div>
  );
}

/* ─────────────── Input Field ─────────────── */
function Field({ id, label, type, placeholder, value, onChange, icon, right }) {
  return (
    <div style={{ marginBottom:'1rem' }}>
      <label style={{ display:'block', fontSize:'.73rem', fontWeight:600, color:'#94a3b8', marginBottom:'.35rem', letterSpacing:'.02em', textTransform:'uppercase' }}>{label}</label>
      <div style={{ position:'relative' }}>
        {icon && <div style={{ position:'absolute', left:'.85rem', top:'50%', transform:'translateY(-50%)', color:'#475569', pointerEvents:'none' }}>{icon}</div>}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={type === 'password' ? 'current-password' : 'email'}
          style={{
            width:'100%', boxSizing:'border-box',
            padding: icon ? '.7rem .85rem .7rem 2.4rem' : '.7rem .85rem',
            paddingRight: right ? '2.8rem' : '.85rem',
            background:'rgba(255,255,255,.04)',
            border:'1px solid rgba(255,255,255,.1)',
            borderRadius:10, color:'#f1f5f9', fontSize:'.88rem',
            outline:'none', transition:'border .2s, box-shadow .2s',
            fontFamily:'Inter, sans-serif',
          }}
          onFocus={e => { e.target.style.border='1px solid rgba(99,102,241,.6)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,.12)'; }}
          onBlur={e  => { e.target.style.border='1px solid rgba(255,255,255,.1)';  e.target.style.boxShadow='none'; }}
        />
        {right}
      </div>
    </div>
  );
}

/* ─────────────── OAuth Button ─────────────── */
function OAuthBtn({ icon, label, onClick, loading }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'.45rem',
        padding:'.65rem .5rem',
        background: hov ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.05)',
        border:'1px solid rgba(255,255,255,.12)',
        borderRadius:10, color:'#cbd5e1', fontSize:'.78rem', fontWeight:600,
        cursor:'pointer', transition:'all .2s', fontFamily:'Inter, sans-serif',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ─────────────── Main Component ─────────────── */
export default function LoginPage() {
  const [tab, setTab]         = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]     = useState('');
  const [oauthLoading, setOauthLoading] = useState('');
  const { login, register, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username:'', email:'', password:'' });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    let res;
    if (tab === 'login') {
      res = await login(form.email, form.password);
    } else {
      if (!form.username.trim()) { setError('Username is required'); return; }
      res = await register(form.username, form.email, form.password);
    }
    if (res.success) navigate('/dashboard');
    else setError(res.error);
  };

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: provider === 'github' ? 'read:user user:email' : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading('');
    }
    // On success, browser redirects — no need to clear loading
  };

  const features = [
    { icon: <Zap size={14}/>,      title:'Real-time Threat Detection',   sub:'AI monitors every login attempt' },
    { icon: <ShieldCheck size={14}/>, title:'ML-Powered IDS',              sub:'Isolation Forest anomaly engine' },
    { icon: <Lock size={14}/>,     title:'Zero-Trust Architecture',       sub:'Every session verified end-to-end' },
    { icon: <Activity size={14}/>, title:'Live Risk Scoring',             sub:'Adaptive score updates in seconds' },
  ];

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#070b14', fontFamily:'Inter, sans-serif' }}>

      {/* ── LEFT HERO PANEL ────────────────────────────────── */}
      <div style={{ flex:'0 0 54%', position:'relative', display:'flex', flexDirection:'column', justifyContent:'center', padding:'3rem 3.5rem', overflow:'hidden' }}>
        <AnimatedBG/>

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'3rem' }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.35rem', boxShadow:'0 0 20px rgba(79,70,229,.4)' }}>🛡️</div>
            <div>
              <div style={{ fontWeight:900, fontSize:'1.25rem', color:'#f1f5f9', letterSpacing:'-.02em' }}>SmartSec</div>
              <div style={{ fontSize:'.65rem', color:'#6366f1', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase' }}>AI Cyber Defense</div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'2.6rem', fontWeight:900, color:'#f1f5f9', lineHeight:1.15, marginBottom:'1rem', letterSpacing:'-.03em' }}>
            Defend Smarter.<br/>
            <span style={{ background:'linear-gradient(135deg,#6366f1,#a855f7,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Stay Secure.
            </span>
          </h1>
          <p style={{ fontSize:'1rem', color:'#64748b', lineHeight:1.7, marginBottom:'2.25rem', maxWidth:420 }}>
            Your AI-powered cyber defense platform. Real-time intrusion detection, phishing protection, and adaptive risk scoring — all in one place.
          </p>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:'.55rem', marginBottom:'2.5rem' }}>
            {features.map(f => (
              <div key={f.title} style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                <div style={{ width:28, height:28, borderRadius:7, background:'rgba(99,102,241,.12)', border:'1px solid rgba(99,102,241,.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#6366f1', flexShrink:0 }}>
                  {f.icon}
                </div>
                <div>
                  <span style={{ fontWeight:700, color:'#cbd5e1', fontSize:'.85rem' }}>{f.title}</span>
                  <span style={{ color:'#475569', fontSize:'.78rem' }}> — {f.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.6rem' }}>
            <StatBadge icon={<ShieldCheck size={15}/>} value="99.7%" label="Threat Detection" color="#10b981"/>
            <StatBadge icon={<Zap size={15}/>}         value="<200ms" label="Response Time"   color="#6366f1"/>
            <StatBadge icon={<Activity size={15}/>}    value="24/7"    label="Live Monitoring" color="#f59e0b"/>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ───────────────────────────────── */}
      <div style={{ flex:'0 0 46%', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', background:'rgba(13,21,38,.6)', borderLeft:'1px solid rgba(255,255,255,.06)', backdropFilter:'blur(20px)' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Header */}
          <div style={{ marginBottom:'2rem', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', margin:'0 auto 1rem', boxShadow:'0 0 30px rgba(79,70,229,.35)' }}>🛡️</div>
            <h2 style={{ fontWeight:900, fontSize:'1.5rem', color:'#f1f5f9', marginBottom:'.35rem', letterSpacing:'-.02em' }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color:'#475569', fontSize:'.85rem' }}>
              {tab === 'login' ? 'Sign in to your SmartSec account' : 'Join SmartSec to protect your systems'}
            </p>
          </div>

          {/* OAuth Buttons */}
          <div style={{ display:'flex', gap:'.55rem', marginBottom:'1.25rem' }}>
            <OAuthBtn icon={<GoogleIcon/>} label="Google" onClick={() => handleOAuth('google')} loading={oauthLoading === 'google'}/>
            <OAuthBtn icon={<GithubIcon/>} label="GitHub" onClick={() => handleOAuth('github')} loading={oauthLoading === 'github'}/>
          </div>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'1.25rem' }}>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,.07)' }}/>
            <span style={{ fontSize:'.72rem', color:'#334155', fontWeight:500 }}>or continue with email</span>
            <div style={{ flex:1, height:1, background:'rgba(255,255,255,.07)' }}/>
          </div>

          {/* Tab switcher */}
          <div style={{ display:'flex', background:'rgba(255,255,255,.04)', borderRadius:10, padding:'.25rem', marginBottom:'1.5rem', border:'1px solid rgba(255,255,255,.07)' }}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }} type="button"
                style={{ flex:1, padding:'.5rem', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:'.82rem', fontFamily:'Inter, sans-serif', transition:'all .2s',
                  background: tab===t ? 'linear-gradient(135deg,#4f46e5,#6d28d9)' : 'transparent',
                  color: tab===t ? '#fff' : '#475569',
                  boxShadow: tab===t ? '0 2px 12px rgba(79,70,229,.35)' : 'none',
                }}>
                {t === 'login' ? '🔑 Sign In' : '✨ Register'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, padding:'.65rem .9rem', marginBottom:'1rem', fontSize:'.82rem', color:'#fca5a5' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {tab === 'register' && (
              <Field
                id="reg-username" label="Username" type="text" placeholder="john_doe"
                value={form.username} onChange={set('username')}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
              />
            )}
            <Field
              id="login-email" label="Email address" type="email" placeholder="you@company.com"
              value={form.email} onChange={set('email')}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 8 10-8"/></svg>}
            />
            <Field
              id="login-password" label="Password" type={showPass ? 'text' : 'password'} placeholder="••••••••••"
              value={form.password} onChange={set('password')}
              icon={<Lock size={14}/>}
              right={
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:'absolute', right:'.85rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#475569', display:'flex', padding:0 }}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              }
            />

            {tab === 'login' && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem', marginTop:'-.25rem' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'.4rem', cursor:'pointer', fontSize:'.78rem', color:'#64748b' }}>
                  <input type="checkbox" style={{ accentColor:'#6366f1' }}/> Remember me
                </label>
                <button type="button" style={{ background:'none', border:'none', cursor:'pointer', color:'#6366f1', fontSize:'.78rem', fontWeight:600, fontFamily:'Inter, sans-serif' }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button id="auth-submit-btn" type="submit" disabled={loading}
              style={{ width:'100%', padding:'.8rem', borderRadius:10, border:'none', cursor:'pointer', fontWeight:800, fontSize:'.92rem', fontFamily:'Inter, sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem', transition:'all .2s',
                background: loading ? 'rgba(79,70,229,.5)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color:'#fff', boxShadow: loading ? 'none' : '0 4px 20px rgba(79,70,229,.45)',
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; }}
            >
              {loading ? (
                <><span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.35)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }}/> {tab==='login' ? 'Signing in…' : 'Creating account…'}</>
              ) : (
                <><ShieldCheck size={17}/> {tab==='login' ? 'Sign In Securely' : 'Create Account'}</>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop:'1.5rem', textAlign:'center' }}>
            <p style={{ fontSize:'.73rem', color:'#1e293b' }}>
              {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => { setTab(tab==='login'?'register':'login'); setError(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#6366f1', fontWeight:700, fontFamily:'Inter, sans-serif', fontSize:'.73rem' }}>
                {tab === 'login' ? 'Create one →' : '← Sign in'}
              </button>
            </p>
            <p style={{ fontSize:'.68rem', color:'#1e293b', marginTop:'.6rem' }}>
              🔒 Protected by SmartSec AI · All sessions encrypted
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}

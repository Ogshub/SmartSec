/**
 * AuthCallback — handles Supabase OAuth redirect
 *
 * Flow:
 *  1. Supabase redirects to /auth/callback with session in URL hash
 *  2. This page reads the session via supabase.auth.getSession()
 *  3. Calls POST /auth/oauth-callback with the access_token
 *  4. Backend finds/creates user → returns our JWT
 *  5. AuthContext stores JWT → redirects to /dashboard
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithOAuth } = useAuth();
  const [status, setStatus] = useState('Processing your login…');
  const [error,  setError]  = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        setStatus('Step 1/3 — Retrieving OAuth session…');
        console.log('[AuthCallback] Starting OAuth callback handling');

        // Poll for Supabase session (handles both hash & PKCE code flows)
        let session = null;
        for (let i = 0; i < 10; i++) {
          const { data, error: sessErr } = await supabase.auth.getSession();
          console.log(`[AuthCallback] Poll ${i+1}:`, data?.session ? 'session found' : 'no session', sessErr?.message);
          if (data?.session) { session = data.session; break; }
          await new Promise(r => setTimeout(r, 300));
        }

        if (cancelled) return;

        if (!session) {
          console.error('[AuthCallback] No Supabase session after polling');
          setError('Could not retrieve OAuth session from Supabase.');
          setDetail('Try logging in again. If this keeps happening, check that your Redirect URL is configured in Supabase.');
          return;
        }

        console.log('[AuthCallback] Session found for:', session.user?.email);
        setStatus(`Step 2/3 — Hello ${session.user?.user_metadata?.full_name || session.user?.email}! Creating your account…`);

        const res = await loginWithOAuth(session.access_token, session.user);
        console.log('[AuthCallback] loginWithOAuth result:', res);
        if (cancelled) return;

        if (res.success) {
          setStatus('Step 3/3 — All done! Redirecting…');
          console.log('[AuthCallback] Success — hard navigating to /dashboard');
          // Hard redirect forces AuthContext to re-init from localStorage
          window.location.replace('/dashboard');
        } else {
          console.error('[AuthCallback] Backend login failed:', res.error);
          setError('Backend authentication failed.');
          setDetail(res.error || 'Unknown error from server.');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[AuthCallback] Unexpected error:', err);
          setError('Unexpected error: ' + err.message);
        }
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  const C = { bg:'#070b14', card:'#0d1526', border:'rgba(255,255,255,.08)', text:'#f1f5f9', muted:'#64748b' };

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter, sans-serif' }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:'2.5rem', width:380, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'1rem' }}>{error ? '⚠️' : '🛡️'}</div>

        {!error ? (
          <>
            <div style={{ width:40, height:40, margin:'0 auto 1.25rem', borderRadius:'50%', border:'3px solid rgba(99,102,241,.3)', borderTopColor:'#6366f1', animation:'spin .8s linear infinite' }}/>
            <div style={{ fontWeight:700, color:C.text, marginBottom:'.5rem', fontSize:'.95rem' }}>Authenticating</div>
            <div style={{ color:C.muted, fontSize:'.82rem', lineHeight:1.6 }}>{status}</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight:700, color:'#ef4444', marginBottom:'.5rem' }}>Authentication Failed</div>
            <div style={{ color:C.muted, fontSize:'.82rem', lineHeight:1.6, marginBottom:'.75rem' }}>{error}</div>
            {detail && (
              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'.65rem .85rem', marginBottom:'1rem', fontSize:'.75rem', color:'#fca5a5', textAlign:'left', wordBreak:'break-all', fontFamily:'monospace' }}>
                {detail}
              </div>
            )}
            <p style={{ fontSize:'.72rem', color:'#334155', marginBottom:'1rem' }}>Check the browser console (F12) for more details.</p>
            <button onClick={() => navigate('/login')} style={{ padding:'.6rem 1.5rem', borderRadius:8, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
              Back to Login
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

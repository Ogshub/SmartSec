import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../hooks/useSettings';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw, Info } from 'lucide-react';

/* ══════════════════════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════════════════════ */

function Toggle({ checked, onChange, id }) {
  return (
    <label htmlFor={id} style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <div style={{
        width: 46, height: 26, borderRadius: 13, transition: '.25s',
        background: checked ? 'linear-gradient(135deg,#6366f1,#3b82f6)' : '#1e3a5f',
        position: 'relative', boxShadow: checked ? '0 0 12px rgba(99,102,241,.4)' : 'none',
        border: `1px solid ${checked ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.08)'}`,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .25s', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
        }} />
      </div>
    </label>
  );
}

function Checkbox({ checked, onChange, id }) {
  return (
    <label htmlFor={id} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <div style={{
        width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? '#6366f1' : '#1e3a5f'}`,
        background: checked ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center',
        justifyContent: 'center', transition: '.2s',
      }}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L4 7L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
      </div>
    </label>
  );
}

function Card({ icon, title, children, style }) {
  return (
    <div style={{
      background: '#0f1929', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 14, padding: '1.25rem', ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.1rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '.95rem', color: '#e2e8f0' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, children, indent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '.55rem 0', borderBottom: '1px solid rgba(255,255,255,.05)',
    }}>
      <div style={{ paddingLeft: indent ? '.75rem' : 0, borderLeft: indent ? '2px solid #6366f1' : 'none' }}>
        <div style={{ fontSize: '.83rem', fontWeight: 500, color: '#cbd5e1' }}>{label}</div>
        {sub && <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: '.1rem' }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: '1rem' }}>{children}</div>
    </div>
  );
}

function SmBtn({ children, color, onClick, disabled }) {
  const colors = {
    primary: { bg: 'transparent', border: '#334155', hover: '#1e293b', text: '#cbd5e1' },
    danger:  { bg: 'transparent', border: 'rgba(239,68,68,.4)', hover: 'rgba(239,68,68,.1)', text: '#ef4444' },
  };
  const c = colors[color] || colors.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '.35rem .9rem', borderRadius: 7, border: `1px solid ${c.border}`,
      background: c.bg, color: c.text, fontSize: '.8rem', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1,
      transition: '.15s', whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background: '#0d1526', border: '1px solid rgba(255,255,255,.1)', color: '#cbd5e1',
      padding: '.35rem .65rem', borderRadius: 7, fontSize: '.8rem', cursor: 'pointer',
      outline: 'none',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      background: type === 'success' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
      border: `1px solid ${type === 'success' ? '#10b981' : '#ef4444'}`,
      color: type === 'success' ? '#10b981' : '#ef4444',
      padding: '.75rem 1.25rem', borderRadius: 10, fontSize: '.875rem',
      backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,.5)',
    }}>{msg}</div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { settings, update, reset } = useSettings();
  const navigate = useNavigate();

  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };

  const [lastLogin, setLastLogin] = useState(null);
  useEffect(() => {
    api.get('/auth/last-login').then(r => setLastLogin(r.data)).catch(() => {});
  }, []);

  /* ── Change Password ──────────────────────────────────── */
  const [pwModal, setPwModal]   = useState(false);
  const [pwForm, setPwForm]     = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw]     = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match.', 'error'); return; }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.newPw });
      showToast('Password changed! Logging you out…');
      setPwModal(false);
      setTimeout(() => { logout(); navigate('/login'); }, 2000);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed.', 'error');
    } finally { setPwLoading(false); }
  };

  /* ── Logout all ───────────────────────────────────────── */
  const [logoutLoading, setLogoutLoading] = useState(false);
  const handleLogoutAll = async () => {
    if (!confirm('Sign out from all active sessions?')) return;
    setLogoutLoading(true);
    try {
      await api.post('/auth/logout-all');
      showToast('All sessions cleared. Redirecting…');
      setTimeout(() => { logout(); navigate('/login'); }, 2000);
    } catch { showToast('Failed.', 'error'); }
    finally { setLogoutLoading(false); }
  };

  /* ── Sensitivity ──────────────────────────────────────── */
  const levels = ['Low', 'Medium', 'High'];
  const lvlIdx = levels.indexOf(settings.sensitivityLevel);
  const lvlColor = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' }[settings.sensitivityLevel];
  const lvlDesc = {
    Low:    'Fewer alerts. Only flag obvious anomalies. Good for trusted networks.',
    Medium: 'Balanced detection. Recommended for most environments.',
    High:   'Very strict. System will detect more anomalies and may generate more alerts. Recommended for high security environments.',
  }[settings.sensitivityLevel];

  /* ── Accent colors ────────────────────────────────────── */
  const accents = ['#6366f1','#10b981','#3b82f6','#f59e0b','#ef4444'];

  return (
    <>
      <Toast msg={toast.msg} type={toast.type} />

      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Settings</h1>
        <p style={{ fontSize: '.83rem', color: '#64748b', marginTop: '.25rem' }}>
          Manage your preferences and configure SmartSec to protect you better.
        </p>
      </div>

      {/* ── Responsive grid ── */}
      <div className="settings-grid">

        {/* ═══ ACCOUNT & SECURITY ═══════════════════════════ */}
        <Card icon="👤" title="Account & Security">
          <Row label="Change Password" sub="Update your account password">
            <SmBtn onClick={() => setPwModal(true)}>Change</SmBtn>
          </Row>
          <Row label="Two-Factor Authentication" sub="Add an extra layer of security" indent>
            <Toggle id="2fa" checked={settings.twoFA || false}
              onChange={() => showToast('Full TOTP 2FA coming in a future step.', 'error')} />
          </Row>
          <Row label="Last Login Details" sub="View your recent login activity" indent>
            <SmBtn onClick={() => {
              const t = lastLogin?.last_login_at ? new Date(lastLogin.last_login_at).toLocaleString() : 'No data';
              const ip = lastLogin?.last_login_ip || 'Unknown';
              showToast(`Last login: ${t} from ${ip}`);
            }}>View</SmBtn>
          </Row>
          <Row label="Logout from All Devices" sub="Sign out from all active sessions" indent>
            <SmBtn color="danger" onClick={handleLogoutAll} disabled={logoutLoading}>
              {logoutLoading ? 'Working…' : 'Logout All'}
            </SmBtn>
          </Row>
        </Card>

        {/* ═══ RISK SENSITIVITY ══════════════════════════════ */}
        <Card icon="🛡️" title="Risk Sensitivity">
          <div style={{ fontSize: '.82rem', color: '#94a3b8', marginBottom: '.6rem' }}>
            Detection Sensitivity Level
          </div>
          <div style={{ fontSize: '.75rem', color: '#64748b', marginBottom: '1rem' }}>
            Choose how strict the system should be in detecting threats
          </div>

          {/* Custom slider */}
          <div style={{ position: 'relative', marginBottom: '.5rem' }}>
            <input type="range" min="0" max="2" step="1" value={lvlIdx}
              onChange={e => update('sensitivityLevel', levels[+e.target.value])}
              style={{ width: '100%', accentColor: lvlColor, cursor: 'pointer', height: 6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.3rem' }}>
              {levels.map((l, i) => (
                <span key={l} style={{ fontSize: '.72rem', color: i === lvlIdx ? lvlColor : '#475569', fontWeight: i === lvlIdx ? 700 : 400 }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div style={{
            marginTop: '.75rem', background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)',
            borderRadius: 10, padding: '.9rem', display: 'flex', gap: '.75rem', alignItems: 'flex-start',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.83rem', color: '#e2e8f0', marginBottom: '.3rem' }}>
                {settings.sensitivityLevel} Sensitivity
              </div>
              <div style={{ fontSize: '.75rem', color: '#94a3b8', lineHeight: 1.5 }}>{lvlDesc}</div>
            </div>
          </div>
        </Card>

        {/* ═══ PHISHING DETECTION ════════════════════════════ */}
        <Card icon="🌐" title="Phishing Detection">
          <Row label="Enable URL Scanning" sub="Automatically analyze URLs for threats">
            <Toggle id="url-scan" checked={settings.urlScanEnabled} onChange={v => update('urlScanEnabled', v)} />
          </Row>
          <Row label="Strict Mode" sub="Detect suspicious URLs with higher accuracy" indent>
            <Toggle id="url-strict" checked={settings.urlStrictMode} onChange={v => update('urlStrictMode', v)} />
          </Row>
          <Row label="Show Detailed Analysis" sub="Show feature-level analysis in results" indent>
            <Toggle id="url-detail" checked={settings.urlDetailedAnalysis} onChange={v => update('urlDetailedAnalysis', v)} />
          </Row>
        </Card>

        {/* ═══ ALERTS & NOTIFICATIONS ════════════════════════ */}
        <Card icon="🔔" title="Alerts & Notifications">
          <Row label="Enable Alerts" sub="Receive alerts for suspicious activities">
            <Toggle id="alerts-on" checked={settings.alertsEnabled} onChange={v => update('alertsEnabled', v)} />
          </Row>
          <div style={{ opacity: settings.alertsEnabled ? 1 : .4, pointerEvents: settings.alertsEnabled ? 'auto' : 'none', transition: '.2s' }}>
            <Row label="Login Alerts" sub="Get notified for unusual login attempts" indent>
              <Checkbox id="al-login" checked={settings.alertLogin} onChange={v => update('alertLogin', v)} />
            </Row>
            <Row label="Intrusion Detection Alerts" sub="Get notified for detected anomalies" indent>
              <Checkbox id="al-ids" checked={settings.alertIDS} onChange={v => update('alertIDS', v)} />
            </Row>
            <Row label="Phishing Alerts" sub="Get notified for phishing URLs" indent>
              <Checkbox id="al-phish" checked={settings.alertPhishing} onChange={v => update('alertPhishing', v)} />
            </Row>
            <Row label="Email Notifications" sub="Receive alerts via email">
              <Toggle id="al-email" checked={settings.emailNotifications} onChange={v => { update('emailNotifications', v); if(v) showToast('Email delivery is simulated — SMTP in a future step.'); }} />
            </Row>
          </div>
        </Card>

        {/* ═══ ACTIVITY & PRIVACY ════════════════════════════ */}
        <Card icon="🔒" title="Activity & Privacy">
          <Row label="Activity Tracking" sub="Allow system to track your activities">
            <Toggle id="tracking" checked={settings.activityTracking} onChange={v => update('activityTracking', v)} />
          </Row>
          <Row label="Data Retention (Days)" sub="Choose how long to store your activity logs">
            <Select value={String(settings.dataRetentionDays)} onChange={v => update('dataRetentionDays', +v)}
              options={[7,14,30,90,365].map(d => ({ value: String(d), label: `${d} Days` }))} />
          </Row>
          <Row label="Clear Activity Logs" sub="Remove all your stored activity logs">
            <SmBtn color="danger" onClick={() => showToast('Log clearing will be wired to the DB in Step 4.', 'error')}>
              Clear Logs
            </SmBtn>
          </Row>
        </Card>

        {/* ═══ APPEARANCE ════════════════════════════════════ */}
        <Card icon="🎨" title="Appearance">
          <Row label="Theme Mode" sub="Choose your preferred theme">
            <Select value={settings.theme} onChange={v => { update('theme', v); if(v==='light') showToast('Light mode coming soon!', 'error'); }}
              options={[{ value: 'dark', label: '🌙 Dark' }, { value: 'light', label: '☀️ Light' }]} />
          </Row>
          <Row label="Accent Color" sub="Choose your dashboard accent color">
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              {accents.map(c => (
                <div key={c} onClick={() => update('accentColor', c)} style={{
                  width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer',
                  border: `2px solid ${settings.accentColor === c ? '#fff' : 'transparent'}`,
                  transition: '.15s', transform: settings.accentColor === c ? 'scale(1.2)' : 'scale(1)',
                }} />
              ))}
            </div>
          </Row>
          <Row label="Dashboard Layout" sub="Choose your preferred dashboard layout">
            <Select value={settings.dashLayout || 'default'} onChange={v => update('dashLayout', v)}
              options={[{ value: 'default', label: 'Default' }, { value: 'compact', label: 'Compact' }, { value: 'wide', label: 'Wide' }]} />
          </Row>
        </Card>
      </div>

      {/* ═══ ABOUT + RESET ROW ═════════════════════════════════ */}
      <div className="settings-about-row">
        <Card icon="ℹ️" title="About SmartSec" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '.82rem', color: '#94a3b8', lineHeight: 1.8 }}>
            <div style={{ color: '#cbd5e1', fontWeight: 600 }}>SmartSec AI Cyber Defense Platform</div>
            <div>Version 1.0.0</div>
            <div>Protecting you with AI-powered security</div>
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', alignItems: 'flex-end' }}>
          <SmBtn onClick={() => showToast('You are using the latest version ✓')}>
            Check for Updates
          </SmBtn>
          <div style={{ fontSize: '.72rem', color: '#475569' }}>You are using the latest version</div>
          <SmBtn onClick={() => { reset(); showToast('Settings reset to defaults.'); }}>
            <RefreshCw size={12} style={{ display: 'inline', marginRight: 4 }} />Reset Defaults
          </SmBtn>
        </div>
      </div>

      {/* ══ Change Password Modal ══════════════════════════════ */}
      {pwModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setPwModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0f1929', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 16, padding: '2rem', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,.6)',
          }}>
            <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>🔑 Change Password</h3>
            <form onSubmit={handleChangePw}>
              {[
                { label: 'Current Password', key: 'current', ph: 'Your current password' },
                { label: 'New Password',      key: 'newPw',   ph: 'Min. 8 characters' },
                { label: 'Confirm New',       key: 'confirm', ph: 'Repeat new password' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '.9rem' }}>
                  <label style={{ display: 'block', fontSize: '.75rem', color: '#64748b', marginBottom: '.3rem' }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} placeholder={f.ph}
                      value={pwForm[f.key]} onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', background: '#0d1526', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '.6rem .9rem', color: '#e2e8f0', fontSize: '.875rem', outline: 'none', paddingRight: f.key === 'current' ? '2.5rem' : '.9rem' }} />
                    {f.key === 'current' && (
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setPwModal(false)} style={{ flex: 1, padding: '.65rem', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={pwLoading} style={{ flex: 1, padding: '.65rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: pwLoading ? .7 : 1 }}>
                  {pwLoading ? 'Saving…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive CSS for settings page */}
      <style>{`
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .settings-about-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: center;
          margin-top: 1rem;
        }
        @media (max-width: 1100px) {
          .settings-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 700px) {
          .settings-grid { grid-template-columns: 1fr !important; }
          .settings-about-row { grid-template-columns: 1fr !important; }
          .settings-about-row > div:last-child {
            align-items: flex-start !important;
            flex-direction: row !important;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}

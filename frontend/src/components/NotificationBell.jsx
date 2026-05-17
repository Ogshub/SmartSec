/**
 * NotificationBell — Header notification center (Step 9)
 * Reads from NotificationContext — polling every 30s
 */
import { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, CheckCheck, X, Shield, AlertTriangle, Info } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const TYPE_ICON = {
  critical: <Shield size={13} color="#ef4444"/>,
  warning:  <AlertTriangle size={13} color="#f59e0b"/>,
  info:     <Info size={13} color="#3b82f6"/>,
  success:  <Shield size={13} color="#10b981"/>,
};
const TYPE_COLOR = {
  critical: { bg:'rgba(239,68,68,.1)',  border:'rgba(239,68,68,.2)',  dot:'#ef4444' },
  warning:  { bg:'rgba(245,158,11,.1)', border:'rgba(245,158,11,.2)', dot:'#f59e0b' },
  info:     { bg:'rgba(59,130,246,.1)', border:'rgba(59,130,246,.2)', dot:'#3b82f6' },
  success:  { bg:'rgba(16,185,129,.1)', border:'rgba(16,185,129,.2)', dot:'#10b981' },
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayCount = Math.min(unreadCount, 99);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'relative', width:36, height:36, borderRadius:9,
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)',
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
          color:'#64748b', transition:'all .2s',
        }}
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing size={16} color="#818cf8"/> : <Bell size={16}/>}
        {unreadCount > 0 && (
          <span style={{
            position:'absolute', top:-5, right:-5,
            background:'#ef4444', color:'#fff',
            fontSize:'.6rem', fontWeight:800, minWidth:16, height:16,
            borderRadius:99, display:'flex', alignItems:'center', justifyContent:'center',
            padding:'0 3px', border:'2px solid #080f1e',
          }}>
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, width:340,
          background:'#0d1526', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:12, boxShadow:'0 20px 60px rgba(0,0,0,.6)',
          zIndex:999, overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,.07)',
          }}>
            <span style={{ fontWeight:700, fontSize:'.88rem', color:'#e2e8f0' }}>
              Notifications {unreadCount>0&&<span style={{color:'#818cf8'}}>({unreadCount})</span>}
            </span>
            <div style={{ display:'flex', gap:'.5rem' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  display:'flex', alignItems:'center', gap:'.3rem',
                  fontSize:'.7rem', color:'#6366f1', background:'none', border:'none', cursor:'pointer', padding:'2px 6px',
                }}>
                  <CheckCheck size={12}/> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#475569' }}>
                <X size={14}/>
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight:380, overflowY:'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding:'2rem 1rem', textAlign:'center', color:'#475569', fontSize:'.82rem' }}>
                <Bell size={24} style={{ margin:'0 auto .75rem', display:'block', opacity:.3 }}/>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const c = TYPE_COLOR[n.type] || TYPE_COLOR.info;
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    style={{
                      padding:'.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,.04)',
                      background: n.is_read ? 'transparent' : 'rgba(99,102,241,.04)',
                      cursor: n.is_read ? 'default' : 'pointer',
                      transition:'background .2s',
                    }}
                  >
                    <div style={{ display:'flex', gap:'.6rem', alignItems:'flex-start' }}>
                      <div style={{
                        width:28, height:28, borderRadius:7, flexShrink:0,
                        background:c.bg, border:`1px solid ${c.border}`,
                        display:'flex', alignItems:'center', justifyContent:'center', marginTop:'.1rem',
                      }}>
                        {TYPE_ICON[n.type] || TYPE_ICON.info}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'.5rem' }}>
                          <span style={{ fontSize:'.8rem', fontWeight: n.is_read ? 500 : 700, color: n.is_read ? '#94a3b8' : '#e2e8f0' }}>
                            {n.title}
                          </span>
                          {!n.is_read && <span style={{ width:7, height:7, borderRadius:99, background:c.dot, flexShrink:0 }}/>}
                        </div>
                        <div style={{ fontSize:'.73rem', color:'#64748b', margin:'.2rem 0 .3rem', lineHeight:1.4 }}>{n.message}</div>
                        <div style={{ fontSize:'.67rem', color:'#334155' }}>
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

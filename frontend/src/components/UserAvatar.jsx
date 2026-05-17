/**
 * UserAvatar
 * ─────────────────────────────────────────────────────────
 * A bulletproof avatar component that:
 *   1. Renders the avatar_url image if the URL is valid & loads OK
 *   2. Falls back to colored initials on ANY load error (404, 403, CORS, expired)
 *   3. Never shows a broken-image icon
 *
 * Props:
 *   user       – user object from AuthContext (needs avatar_url, avatar_color, username)
 *   size       – px size of the circle (default 34)
 *   fontSize   – font size for initials text (default '.8rem')
 *   style      – extra styles to merge in
 *   showOnline – show the green online dot (default false)
 */
import { useState, useEffect } from 'react';

export default function UserAvatar({
  user,
  size = 34,
  fontSize = '.8rem',
  style = {},
  showOnline = false,
}) {
  const avatarColor = user?.avatar_color || '#6366f1';
  const initials    = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  // Treat empty string the same as null/undefined
  const rawUrl      = user?.avatar_url || null;
  const cleanUrl    = rawUrl && rawUrl.trim() !== '' ? rawUrl : null;

  // imgOk: null = not yet tried, true = loaded, false = errored
  const [imgOk, setImgOk] = useState(null);

  // Reset whenever the URL changes (e.g. after uploading a new avatar)
  useEffect(() => {
    setImgOk(cleanUrl ? null : false);
  }, [cleanUrl]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div
        style={{
          width:          size,
          height:         size,
          borderRadius:   '50%',
          overflow:       'hidden',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontWeight:     800,
          fontSize,
          color:          '#fff',
          flexShrink:     0,
          // Show gradient bg only when no image is rendering
          background: (cleanUrl && imgOk !== false)
            ? 'transparent'
            : `linear-gradient(135deg, ${avatarColor}, #8b5cf6)`,
          border: (cleanUrl && imgOk !== false)
            ? `2px solid ${avatarColor}55`
            : 'none',
          transition: 'background 0.2s',
        }}
      >
        {cleanUrl && imgOk !== false ? (
          <img
            src={cleanUrl}
            alt={initials}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onLoad={() => setImgOk(true)}
            onError={() => setImgOk(false)}   // ← fallback to initials on ANY error
          />
        ) : (
          initials
        )}
      </div>

      {/* Online dot */}
      {showOnline && (
        <div
          style={{
            position:   'absolute',
            bottom:     1,
            right:      1,
            width:      Math.max(8, size * 0.26),
            height:     Math.max(8, size * 0.26),
            borderRadius: '50%',
            background: '#10b981',
            border:     '2px solid #070b14',
          }}
        />
      )}
    </div>
  );
}

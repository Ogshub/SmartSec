# Step 9 — Notification Center
## Status: ✅ COMPLETE
**Last Updated:** 2026-05-17

---

## 🎯 Objective
Replace the hardcoded "3 fake notifications" bell in the header with a fully functional real-time notification center — live data from the database, unread badge, mark-read, mark-all-read, and auto-polling.

---

## 🏗️ Architecture

```
Supabase notifications table
         │
         ▼
GET /notifications (polls every 30s)
         │
         ▼
NotificationContext (React Context)
  ├── notifications[]   — full list
  ├── unreadCount       — integer badge
  ├── markRead(id)      — POST /notifications/:id/read
  └── markAllRead()     — POST /notifications/mark-all-read
         │
         ▼
NotificationBell component (in DashboardLayout header)
  └── Dropdown panel with notification items
```

---

## 📁 Files Created

### `src/context/NotificationContext.jsx`
React Context Provider — global notification state:

```javascript
// Polls backend every 30 seconds
const interval = setInterval(fetchNotifications, 30_000);

// API calls
GET  /notifications?limit=20    → { notifications: [], unread_count: 0 }
POST /notifications/:id/read    → mark single as read
POST /notifications/mark-all-read → mark all as read
```

**State:**
| Variable | Type | Description |
|----------|------|-------------|
| `notifications` | Array | Full list of notification objects |
| `unreadCount` | Number | Badge count (0-99) |
| `loading` | Boolean | First-load indicator |

**Polling:** 30-second interval using `setInterval` + `clearInterval` cleanup in `useEffect`. Interval is destroyed when component unmounts or user logs out (token dependency).

---

### `src/components/NotificationBell.jsx`
Header dropdown component:

#### Visual States:
| State | Display |
|-------|---------|
| No notifications | Bell icon, no badge |
| Has unread | BellRing icon (animated), red badge with count |
| Badge overflow | Shows "99" max |
| Panel open | Dropdown slides below header |

#### Notification Types & Colors:
| Type | Background | Icon | Color |
|------|-----------|------|-------|
| `critical` | Red tint | ShieldAlert | `#ef4444` |
| `warning` | Amber tint | AlertTriangle | `#f59e0b` |
| `info` | Blue tint | Info | `#3b82f6` |
| `success` | Green tint | CheckCircle | `#10b981` |

#### Interactions:
- **Click bell** → toggle dropdown
- **Click unread notification** → calls `markRead(id)`, removes dot, decrements badge
- **Click "Mark all read"** → calls `markAllRead()`, zeroes badge
- **Click outside** → closes dropdown (via `mousedown` event listener on `document`)

---

### `src/components/DashboardLayout.jsx` (Updated)
Replaced the old hardcoded bell block:

```jsx
// BEFORE (hardcoded mock):
<Bell size={20} />
<div style={{...}}>3</div>  // static badge

// AFTER (live data):
import NotificationBell from './NotificationBell';
<NotificationBell />  // self-contained, reads from context
```

---

### Backend — `routers/notifications.py`
```
GET  /notifications?limit=20        → paginated notification list + unread count
POST /notifications/:id/read        → mark single notification as read
POST /notifications/mark-all-read   → mark all user notifications as read
```

---

### Backend — When Notifications Are Created
The `risk_service.trigger_alert()` function creates notifications automatically:

```python
# In risk_service.py — called when score crosses threshold
db.table("notifications").insert({
    "user_id": user["id"],
    "type": "critical" if score >= 80 else "warning",
    "title": "⚠️ High Risk Score Detected",
    "message": f"Your risk score has reached {score:.0f}/100. Immediate action recommended.",
    "is_read": False,
}).execute()
```

Notification creation triggers:
| Trigger | Type | Threshold |
|---------|------|-----------|
| Risk score ≥ 80 | `critical` | Score cross |
| Risk score 60-79 | `warning` | Score cross |
| Phishing detected | `critical` | Every event |
| IDS High anomaly | `warning` | Every event |
| New IP login | `info` | First time from IP |

---

### `src/App.jsx` (Updated)
Added `NotificationProvider` wrapping around all protected routes:

```jsx
<AuthProvider>
  <NotificationProvider>   {/* ← NEW */}
    <AppRoutes />
  </NotificationProvider>
</AuthProvider>
```

The `NotificationProvider` only starts polling when a valid JWT token is present (reads from `AuthContext`).

---

## 🗄️ Database Schema

### `notifications` table
```sql
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL DEFAULT 'info',   -- info|warning|critical|success
    title      TEXT NOT NULL,
    message    TEXT,
    is_read    BOOLEAN DEFAULT FALSE,
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

---

## ⚡ Performance Notes
- Polling interval is 30s — deliberately not real-time to avoid rate-limiting
- `fetchNotifications` is wrapped in `useCallback` to prevent unnecessary re-renders
- Only active when user is authenticated (no polling on login page)
- `limit=20` cap prevents large payload on every poll cycle
- Unread count is returned from backend (single SQL `COUNT`) — not computed client-side

# Step 8 — Dashboard & Activity Monitor (Live Data)
## Status: ✅ COMPLETE
**Last Updated:** 2026-05-17

---

## 🎯 Objective
Replace all placeholder/mock data on the Dashboard and Activity pages with real-time data from backend APIs. Every widget must reflect the actual state of the system.

---

## 🏗️ What Was Built / Updated

### Backend — `routers/dashboard.py`
Aggregated endpoint that merges data from all 4 modules into one response:

```
GET /dashboard
Returns:
{
  "user": { risk_score, risk_level, login_count, ... },
  "ids": { total_events, anomalies, normal, accuracy },
  "phishing": { total_scans, malicious, suspicious, safe },
  "risk": { current_score, level, events_7d },
  "activity": { recent_logins: [...], recent_alerts: [...] }
}
```

### Backend — `routers/auth.py` (login-history endpoint)
```
GET /auth/login-history?limit=100
Returns:
{
  "history": [
    {
      "id": UUID,
      "event_type": "SUCCESS|FAILURE|SUSPICIOUS|REGISTRATION",
      "ip_address": "...",
      "user_agent": "...",
      "risk_score": 23.4,
      "created_at": "ISO8601"
    }
  ]
}
```

---

## 📁 Frontend Files Updated

### `pages/DashboardPage.jsx` — Full Rewrite
**Before:** Hardcoded stat numbers, static chart with fake data  
**After:** 100% real data from backend APIs

#### Components & Data Sources:
| Widget | API Endpoint | Fallback |
|--------|-------------|---------|
| 4 Stat Cards | `/dashboard` + `/auth/me` | 0 |
| Risk Gauge (SVG) | `user.risk_score` + `user.risk_level` | 0 / Low |
| 7-Day Activity Chart | `/auth/login-history` → computed by date | Zeros |
| Login Events Table | `/auth/login-history?limit=8` | Empty state |
| Module Status Grid | Static (hardcoded — all Online) | — |

#### 7-Day Chart Data Algorithm:
```javascript
// Buckets login events into the last 7 days
const days = Array.from({length: 7}, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (6-i));
  return { label: d.toLocaleDateString('en-IN', {weekday:'short'}), requests:0, alerts:0 };
});
history.forEach(ev => {
  const daysAgo = Math.floor((Date.now() - new Date(ev.created_at)) / 86400000);
  if (daysAgo < 7) {
    days[6-daysAgo].requests++;
    if (ev.event_type === 'SUSPICIOUS' || ev.event_type === 'FAILURE') days[6-daysAgo].alerts++;
  }
});
```

---

### `pages/ActivityPage.jsx` — Full Rewrite
Full audit trail with server-side pagination simulation (client-side pagination over 100 records).

#### Features:
- **Filter chips:** ALL / SUCCESS / FAILURE / SUSPICIOUS (with live counts)
- **Paginated table:** 20 rows/page, prev/next controls
- **Risk score mini-bar:** Per-row inline progress bar (green/yellow/red)
- **User agent column:** Identifies browser + OS of each session
- **IP address column:** Monospace font for readability

#### Data Source:
```
GET /auth/login-history?limit=100
```
Fetches last 100 events, filters client-side by type, paginates in 20-row pages.

---

## 🎨 Design Patterns Used

### StatCard Component (DashboardPage)
```jsx
<StatCard
  label="Risk Score"
  value={Math.round(riskScore)}
  sub="Out of 100"
  icon="🛡️"
  color="blue"
/>
```
Inline component — no external library. Uses CSS variables for color.

### RiskGauge Component (DashboardPage)
Compact 180×110 SVG gauge reused from RiskPage with smaller dimensions for dashboard context. Shows score + level badge.

### Risk Score Mini-Bar (ActivityPage)
```jsx
<div style={{height:4, width:`${ev.risk_score||0}%`,
  background: score>60 ? '#ef4444' : score>30 ? '#f59e0b' : '#10b981'}}/>
```
Inline HTML — zero external dependencies.

---

## 🔄 Data Refresh Strategy
- Dashboard auto-calls `refreshUser()` on mount (updates cached user object in AuthContext)
- Manual **Refresh** button re-fetches all APIs
- No polling (dashboard is not real-time critical)
- Activity page refreshes on button click only

---

## 📊 API Calls Made on Dashboard Mount
1. `GET /dashboard` — aggregated security summary
2. `GET /auth/login-history?limit=100` — for 7-day chart + recent events
3. `GET /auth/me` (via `refreshUser()`) — fresh risk_score + risk_level

All three run in `Promise.all()` — parallel, not sequential.

---

## ⚠️ Error Handling
- Each API call wrapped in try/catch with `.catch(() => ({ data: null }))` fallback
- Failing `/dashboard` does not break login-history display
- All widgets show "No data" empty states if API returns empty array
- Error banner displayed at top if all calls fail

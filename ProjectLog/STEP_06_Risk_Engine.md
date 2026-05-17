# Step 6 — Risk Scoring Engine
## Status: ✅ COMPLETE
**Last Updated:** 2026-05-17

---

## 🎯 Objective
Build a composite, adaptive risk scoring engine that tracks every security-relevant user action, applies weighted delta scoring with exponential time decay, and automatically triggers alerts + email notifications when risk crosses critical thresholds.

---

## 🏗️ Architecture Overview

```
User Action (login / scan / IDS anomaly)
          │
          ▼
    risk_service.record_event()
          │
          ├── 1. Classify event → severity (Low / Medium / High / Critical)
          ├── 2. Calculate score_delta (weighted table)
          ├── 3. Apply time decay to existing score
          ├── 4. Clamp final score to [0, 100]
          ├── 5. Persist to risk_events table
          ├── 6. Update users.risk_score + users.risk_level
          ├── 7. If score ≥ 70 AND first cross → send Resend email alert
          └── 8. If score ≥ 80 → create notification record
```

---

## 🔢 Scoring Table

| Event Type | Score Delta | Severity |
|------------|-------------|----------|
| `login_success` | +0 (baseline) | Low |
| `login_failure` | +5 | Low |
| `multiple_failures` (≥5 in 1hr) | +20 | High |
| `new_ip` | +8 | Medium |
| `unusual_hour` (2AM–6AM login) | +10 | Medium |
| `rapid_requests` (>100 req/min) | +15 | High |
| `phishing_suspicious` | +12 | Medium |
| `phishing_detected` | +25 | High |
| `ids_anomaly` | +18 | High |
| `password_change` | -5 (improvement) | Low |
| `mfa_enabled` | -10 (improvement) | Low |

### Time Decay Formula
```python
decayed_score = current_score * (decay_rate ** hours_since_last_event)
# decay_rate = 0.98 (2% per hour)
# After 24 hours: score × 0.98^24 ≈ score × 0.619
# After 7 days: score × 0.98^168 ≈ score × 0.035 (near zero)
```

This ensures old events naturally fade — a user with no recent activity trends back toward 0.

---

## 📁 Files Created

### `services/risk_service.py`
Core risk engine — 12 functions:

| Function | Description |
|----------|-------------|
| `score_to_level(score)` | Maps 0-100 → Low/Medium/High/Critical |
| `record_event(db, user, event_type, metadata)` | Main entry — logs event + updates score |
| `apply_decay(current_score, last_event_time)` | Exponential decay calculation |
| `get_score_delta(event_type)` | Lookup table for event weights |
| `get_risk_breakdown(db, user)` | Full score report with breakdown by event type |
| `recalculate_from_history(db, user)` | Rebuild score from scratch from full event log |
| `get_recommendations(score, breakdown)` | Returns actionable security recommendations |
| `trigger_alert(user, score, event_type)` | Sends Resend HTML email + creates notification |
| `check_thresholds(db, user, new_score, old_score)` | Detects threshold crossings → triggers alerts |

### `routers/risk.py`
REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/risk/score` | Current score + level + factor breakdown + recommendations |
| GET | `/risk/history?limit=30&days=30` | Full event audit trail |
| POST | `/risk/recalculate` | Force full recalculation from history |
| GET | `/risk/stats` | 7-day summary: event counts by severity |

---

## 🗄️ Database Schema

### `risk_events` table
```sql
CREATE TABLE risk_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    score_delta FLOAT NOT NULL DEFAULT 0,
    severity    TEXT NOT NULL DEFAULT 'Low',
    metadata    JSONB DEFAULT '{}',
    source_ip   INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_risk_events_user_time ON risk_events(user_id, created_at DESC);
```

### New columns added to `users` table
```sql
ALTER TABLE users ADD COLUMN risk_score   FLOAT   DEFAULT 0;
ALTER TABLE users ADD COLUMN risk_level   TEXT    DEFAULT 'Low';
ALTER TABLE users ADD COLUMN last_risk_update TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN source_ip    INET;
ALTER TABLE users ADD COLUMN login_count  INTEGER DEFAULT 0;
```

---

## 📧 Email Alert System — Resend Integration

**Service:** `services/email_service.py`  
**Provider:** [Resend](https://resend.com) — transactional email API  
**From:** `alerts@smartsec.dev`

Triggers:
- Risk score crosses 70 for the first time in a session
- `phishing_detected` event fires
- IDS anomaly flagged as `High` severity

Email template features:
- Dark-themed HTML with SmartSec branding
- Risk score gauge (text-based)
- Event breakdown table
- "What to do now" recommendations
- Unsubscribe footer

**Environment variable:** `RESEND_API_KEY=re_GGzvwRwp_...`

---

## 🔗 Cross-Module Integration

The risk engine is called by **three other modules:**

1. **`routers/phishing.py`** — after every URL scan:
   ```python
   risk_service.record_event(db, user, "phishing_detected" if malicious else "phishing_suspicious", {...})
   ```

2. **`routers/auth.py`** — after login attempts:
   ```python
   risk_service.record_event(db, user, "login_failure", {...})
   risk_service.record_event(db, user, "new_ip", {...})
   ```

3. **`routers/ids.py`** — after ML anomaly detection:
   ```python
   risk_service.record_event(db, user, "ids_anomaly", {...})
   ```

---

## 🎨 Frontend — `pages/RiskPage.jsx`

### Visualizations (all real API data):
| Component | Data Source | Library |
|-----------|------------|---------|
| SVG Risk Gauge | `/risk/score → risk_score` | Custom SVG |
| Factor Bars | `/risk/score → event_breakdown` | Custom CSS |
| Security Radar | `/risk/score → factors` | Recharts RadarChart |
| Event Timeline | `/risk/history → events[]` | Recharts AreaChart |
| Recent Events list | `/risk/history → events[]` | Inline JSX |
| Recommendations | `/risk/score → recommendations[]` | Inline JSX |

### Controls:
- **Refresh** — re-fetches score + history
- **Recalculate** — calls `POST /risk/recalculate` → rebuilds score from full event log

---

## ⚠️ Notes
- Score is **per-user** — stored directly on the `users` row for fast reads
- Decay only applies when `record_event` is called — no background cron job needed
- `recalculate_from_history` rebuilds from scratch by replaying all events in chronological order — useful after tuning weights

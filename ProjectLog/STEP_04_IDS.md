# 🛡️ SmartSec: AI-Based Cyber Defense Platform
## 📋 Project Development Log — Step 4: AI Intrusion Detection System (IDS)

---

> **Date:** 2026-04-26
> **Step:** 4 of (estimated) 10
> **Status:** 🔄 In Progress (Core complete — UI polish & real traffic wiring pending)
> **ML Model:** scikit-learn `IsolationForest`
> **New Endpoints:** `GET /ids/status` · `GET /ids/dashboard` · `POST /ids/simulate`

---

## 📌 What This Step Was About

We built the complete **AI-powered Intrusion Detection System** for SmartSec:

- A real **machine learning model** (`IsolationForest`) that learns what "normal" traffic looks like and flags deviations
- A **traffic simulator** that generates synthetic normal + attack events to demo the system
- A **full dashboard** matching the reference UI design with live charts, a stats bar, alerts table, and attack breakdown
- **Supabase persistence** — all detected events and alerts are stored and fetched from the database

---

## 📁 Files Created / Modified

```
backend/
├── services/
│   └── ids_service.py         [NEW] IsolationForest ML wrapper + traffic simulator
├── routers/
│   └── ids.py                 [NEW] /ids/* API endpoints
├── main.py                    [MODIFIED] Registered ids router
frontend/src/
├── pages/
│   └── IDSPage.jsx            [REWRITTEN] Full IDS dashboard (matches screenshot)
├── index.css                  [MODIFIED] +180 lines of IDS-specific CSS
ProjectLog/
└── STEP_04_IDS.md             [NEW] This file
```

---

## 🤖 How the ML Model Works

### IsolationForest Algorithm
```
IsolationForest is an anomaly detection algorithm that works by:

1. Building N random decision trees (n_estimators=100)
2. For each tree, randomly selecting a feature and a split value
3. Repeating until all points are isolated in their own leaf

Key insight:
  • NORMAL points require MANY splits to isolate (they cluster together)
  • ANOMALOUS points require FEW splits (they're far from the cluster)

Result:
  • score_samples() → more negative = more anomalous
  • predict()       → -1 (anomaly), +1 (normal)
  • contamination=0.05 → expects ~5% of events to be anomalies
```

### Feature Engineering
Each API request is converted into a 5-dimensional feature vector:

| Feature | Normal Range | Attack Range | Why? |
|---|---|---|---|
| `response_time_ms` | ~120ms ±50ms | <50ms (brute) or >500ms (SQLi) | Attacks have unusual timing |
| `status_code` | 200, 201, 204, 301 | 401, 404, 500, 503 | Failed/error codes indicate probing |
| `requests_per_min` | ~5 req/min | 80–1000 req/min | DDoS/brute-force spike the rate |
| `hour_of_day` | 8–20 (business) | 0–5 (night) | Off-hours logins are suspicious |
| `failed_attempts` | 0–1 | 3–50 | Repeated failures = brute force |

### Training Strategy
```python
# We train on synthetic "normal" baseline (200 events)
train_model([])   # Auto-generates normal baseline

# Then score incoming events
scored = detect_anomalies(raw_events)

# Normalize raw scores to 0-100
normalized = (1 - (raw_score - min_score) / range_score) * 100
```

---

## 🔬 Attack Types Simulated

| Attack | HTTP Status | Req/Min | Hour | Failed | Description |
|---|---|---|---|---|---|
| **Brute Force** | 401 | 80–200 | 0–5am | 10–50 | Rapid password guessing |
| **SQL Injection** | 500 | 20–60 | 1–6am | 2–8 | DB query manipulation |
| **Port Scan** | 404 | 100–300 | 0–4am | 0 | Service enumeration |
| **DDoS Attempt** | 503 | 500–1000 | 2–8am | 0–3 | Flooding attack |
| **Suspicious Login** | 200 | 1–5 | 0–6am | 3–10 | Valid login but unusual context |

---

## 🌐 New API Endpoints

### `GET /ids/status`
```json
{
  "module": "IDS",
  "status": "ready",
  "trained": true,
  "model_type": "IsolationForest",
  "n_estimators": 100,
  "contamination": 0.05,
  "features": ["response_time_ms", "status_code", "requests_per_min", "hour_of_day", "failed_attempts"]
}
```

### `POST /ids/simulate`
Generates 90 normal + 10 attack events, runs ML detection, inserts to Supabase.
```json
{
  "total_events": 100,
  "anomalies_found": 10,
  "alerts_created": 8,
  "normal_events": 90
}
```

### `GET /ids/dashboard`
Returns everything the frontend needs in one call:
```json
{
  "stats": {
    "total_events": 100,
    "anomalies": 10,
    "high_risk_alerts": 5,
    "blocked_attacks": 3,
    "false_positives": 2
  },
  "trend_data": [
    { "label": "Apr 19", "normal": 45, "anomalous": 3 },
    ...7 days
  ],
  "system_status": [
    { "name": "Normal",    "value": 90, "color": "#10b981" },
    { "name": "Anomalous", "value": 10, "color": "#ef4444" },
    { "name": "Blocked",   "value": 3,  "color": "#8b5cf6" },
    { "name": "Other",     "value": 7,  "color": "#64748b" }
  ],
  "top_attacks": [...],
  "recent_alerts": [...],
  "protection_active": true
}
```

---

## 🎨 Frontend Architecture (IDSPage.jsx)

### Layout Structure
```
IDSPage
├── Top Controls Bar
│   ├── Title + subtitle
│   ├── Date picker button (aesthetic)
│   ├── [Simulate Traffic] button  ← Triggers ML pipeline
│   └── [Export Report] button     ← Refreshes data
│
├── Simulation Result Banner (conditional)
│
├── Stat Cards Row (5 cards)
│   ├── Total Events        (blue)
│   ├── Anomalies Detected  (orange)
│   ├── High Risk Alerts    (red)
│   ├── Blocked Attacks     (green)
│   └── False Positives     (purple)
│
├── Chart Row (60/40 split)
│   ├── Anomaly Detection Overview (AreaChart — dual lines)
│   └── System Status (PieChart donut with "Protection Active" center)
│
└── Bottom Row (60/40 split)
    ├── Recent Alerts Table (with attack icons + neon risk pills)
    └── Top Attack Types (PieChart donut + legend with percentages)
```

### Data Flow
```
IDSPage mounts
  → GET /ids/dashboard
    → Fetch user_activity (7 days) from Supabase
    → Fetch alerts (20 most recent) from Supabase
    → Aggregate stats + build trend array
    ← JSON response → setState → Charts render

User clicks "Simulate Traffic"
  → POST /ids/simulate
    → Generate 100 synthetic events
    → train_model() (IsolationForest on 200-point normal baseline)
    → detect_anomalies() → score all 100 events
    → INSERT into user_activity (all events)
    → INSERT into alerts (anomalies only)
    ← {total, anomalies_found, alerts_created}
  → fetchDashboard() called again
  → UI updates with real data
```

---

## 🐛 Bugs Encountered & Fixed

### Recharts `defs`/`linearGradient` import
- **Problem:** Recharts doesn't export `defs`, `linearGradient`, `stop` as named imports — they're SVG primitives
- **Fix:** Used JSX `<defs>`, `<linearGradient>`, `<stop>` directly inside `<AreaChart>` — no import needed

### White Screen Bug (Recharts import crash)
- **Problem:** `IDSPage.jsx` imported `defs`, `linearGradient`, `stop` from `recharts` — these are SVG primitives, NOT recharts exports
- **Symptom:** Vite threw `SyntaxError: does not provide an export named 'defs'` → entire React module tree silently crashed → white blank page
- **Fix:** Removed the invalid imports. These SVG elements (`<defs>`, `<linearGradient>`, `<stop>`) are used directly as JSX with no import needed since they're built-in SVG HTML elements

---

## 🚧 What's Remaining for Full Completion

| Item | Priority | Notes |
|---|---|---|
| Wire date-range picker to filter real Supabase data | High | Currently aesthetic only |
| Export Report → actual CSV/PDF download | Medium | Currently just refreshes data |
| Connect IDS alerts to the main Alerts page | High | Alert count badge in sidebar |
| Auto-run simulation on first login (seed data) | Low | Better first-run experience |
| Replace synthetic IPs with real request IP tracking | High | Requires backend middleware |
| Add WebSocket / polling for real-time chart updates | Medium | Auto-refresh every 30s |

---


## 📊 Project Progress Tracker

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & Basic FastAPI | Done |
| ✅ Step 2 | Database Setup + Supabase | Done |
| ✅ Step 3 | User Authentication (JWT) | Done |
| 🔄 **Step 4** | **AI Intrusion Detection System (IDS)** | **In Progress** |
| ⏳ Step 5 | Phishing URL Detector | Next |
| ⬜ Step 6 | Risk Scoring Engine | Pending |
| ✅ Step 7 | React Frontend + Settings | Done |
| ⬜ Step 8 | Full Dashboard Integration | Pending |
| ⬜ Step 9 | Frontend ↔ Backend Deep Integration | Pending |
| ⬜ Step 10 | Final Polish & Testing | Pending |

---

*Log created by: Antigravity AI Mentor*
*Project: SmartSec — AI-Based Cyber Defense Platform*

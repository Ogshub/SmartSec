# 🛡️ SmartSec: AI-Based Cyber Defense Platform
## 📋 Project Development Log — Step 2: Database Setup with Supabase

---

> **Date:** 2026-04-25
> **Step:** 2 of (estimated) 10
> **Status:** ✅ Completed & Verified Live
> **Change from original plan:** Switched from SQLite → **Supabase (PostgreSQL cloud)**
> **Supabase Project:** zkemyhvrbqgwozgowjfa
> **Verification:** All 5 tables confirmed in cloud DB. SDK connection tested successfully.

---

## 📌 What This Step Was About

In Step 1 we built the server skeleton. Now in Step 2 we gave it **memory** — a database.

Without a database, our API is stateless:
- A user registers → data is lost when the server restarts
- A login attempt happens → nothing is stored
- An alert is generated → gone forever

**Supabase** gives us a real, cloud-hosted **PostgreSQL** database with a beautiful web dashboard, so we can inspect our data visually as we develop.

---

## 🔄 Architecture Decision: SQLite → Supabase

Originally the plan used SQLite (a local file database). We switched to **Supabase** because:

| Reason | Detail |
|---|---|
| ☁️ Cloud-hosted | Accessible from anywhere — no local file |
| 🐘 Real PostgreSQL | Industry-standard database, production-grade |
| 🎛️ Dashboard | Visual table explorer at supabase.com |
| 🔐 Auth built-in | Supabase has its own auth system we can integrate |
| ⚡ Realtime | Supports live data subscriptions (for future dashboard) |
| 🆓 Free tier | Generous free tier, perfect for projects |

---

## 📁 New Files Created This Step

```
backend/
├── database.py           ← Supabase client setup (replaces SQLAlchemy config)
├── schemas.py            ← Pydantic request/response schemas
├── supabase_schema.sql   ← SQL to create all 5 database tables
└── .env                  ← Updated with Supabase credentials
```

---

## 🗄️ Database Tables Created

### Table 1: `users`
Stores every registered account in SmartSec.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique identifier (auto-generated) |
| `username` | VARCHAR(30) | Display name |
| `email` | VARCHAR(255) | Login identifier |
| `hashed_password` | TEXT | BCrypt hash — never plain text! |
| `risk_score` | FLOAT | Current security risk (0–100) |
| `risk_level` | VARCHAR | "Low", "Medium", or "High" |
| `last_login_at` | TIMESTAMPTZ | Tracks login time for anomaly detection |
| `last_login_ip` | VARCHAR | IP address tracking |
| `login_count` | INTEGER | Total successful logins |
| `failed_attempts` | INTEGER | Consecutive failures (lockout trigger) |
| `is_active` | BOOLEAN | Account enabled/disabled |
| `created_at` | TIMESTAMPTZ | Registration timestamp |
| `updated_at` | TIMESTAMPTZ | Auto-updated on every change |

---

### Table 2: `login_events`
Every login attempt — success or failure — is logged here. This is the raw data for our IDS module.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique event ID |
| `user_id` | UUID | Foreign key → users.id |
| `event_type` | VARCHAR | 'SUCCESS', 'FAILURE', 'SUSPICIOUS' |
| `ip_address` | VARCHAR | Where the login came from |
| `location` | VARCHAR | City, Country (simulated) |
| `user_agent` | TEXT | Browser/device info |
| `risk_score` | FLOAT | Risk at moment of login |
| `risk_flags` | TEXT[] | Array of flags: ['UNUSUAL_TIME', 'NEW_IP'] |
| `created_at` | TIMESTAMPTZ | When it happened |

---

### Table 3: `alerts`
Security alerts shown on the dashboard. Created by IDS and phishing modules.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique alert ID |
| `user_id` | UUID | Who the alert belongs to |
| `alert_type` | VARCHAR | 'SUSPICIOUS_LOGIN', 'ANOMALY', 'PHISHING_DETECTED' |
| `severity` | VARCHAR | 'Low', 'Medium', 'High' |
| `message` | TEXT | Human-readable description |
| `is_read` | BOOLEAN | User acknowledged it |
| `resolved` | BOOLEAN | Alert was handled |
| `created_at` | TIMESTAMPTZ | When it was triggered |

---

### Table 4: `url_scans`
Results from the Phishing URL Detector module.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique scan ID |
| `user_id` | UUID | Who ran the scan |
| `url` | TEXT | The URL that was scanned |
| `verdict` | VARCHAR | 'Safe', 'Suspicious', 'Phishing' |
| `confidence` | FLOAT | 0.0–1.0 model confidence |
| `risk_score` | FLOAT | 0–100 risk score |
| `features` | JSONB | URL feature breakdown (for explainability) |
| `created_at` | TIMESTAMPTZ | Scan timestamp |

---

### Table 5: `user_activity`
Every API call a user makes is logged here. The IDS uses this to detect abnormal behavior patterns.

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Unique activity record |
| `user_id` | UUID | Who did the action |
| `action` | VARCHAR | 'scan_url', 'view_dashboard', etc. |
| `endpoint` | VARCHAR | Which API route was called |
| `method` | VARCHAR | HTTP method (GET/POST) |
| `status_code` | INTEGER | Response code (200, 401, etc.) |
| `response_time` | FLOAT | In milliseconds |
| `is_anomaly` | BOOLEAN | IDS flagged this as anomalous |
| `anomaly_score` | FLOAT | How anomalous (0.0–1.0) |
| `created_at` | TIMESTAMPTZ | Timestamp |

---

## 📄 File Explanations

### `backend/database.py` — Supabase Client

```python
from supabase import create_client, Client

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def get_supabase() -> Client:
    return supabase
```

**Key concepts:**
- We use `SUPABASE_SERVICE_KEY` (not the anon key) for backend operations
- The **service key bypasses Row Level Security** — only safe for server-side code
- `get_supabase()` is a FastAPI **dependency** — injected into routes via `Depends(get_supabase)`

---

### `backend/schemas.py` — Pydantic Data Schemas

These define the shape of every request body and response. Examples:

**`UserRegister`** — What the client sends to create an account:
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "MySecurePass123"
}
```

**`Token`** — What we send back after a successful login:
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
    "token_type": "bearer",
    "user": { "id": "...", "username": "john_doe", ... }
}
```

**Key Validators:**
- `username`: 3–30 chars, alphanumeric + underscores only
- `password`: minimum 8 characters
- `email`: must be a valid email format (uses `email-validator` library)

---

### `backend/supabase_schema.sql` — Database Schema

Run this once in the **Supabase SQL Editor** to create all 5 tables.
Also includes:
- **Indexes** on frequently queried columns (faster queries)
- **Auto-trigger** that updates `updated_at` whenever a user row changes

---

## ⚙️ How to Apply the Schema to Supabase

```
1. Go to https://supabase.com
2. Open your SmartSec project
3. Click "SQL Editor" in the left sidebar
4. Open backend/supabase_schema.sql (copy all contents)
5. Paste into the SQL editor
6. Click "Run" (▶)
7. You should see 5 tables in Table Editor
```

---

## 🔑 Credentials Setup (`.env`)

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJ...   ← From Settings → API → anon key
SUPABASE_SERVICE_KEY=eyJ... ← From Settings → API → service_role key
```

---

## ⚠️ Issue Encountered & Fixed

### Problem: `supabase>=2.4.0` pulled in `pyiceberg` which needs C++ Build Tools
- **Root Cause:** Latest supabase SDK depends on `storage3` which started pulling in `pyiceberg`, a data lake library that needs to compile C extensions.
- **Fix:** Pinned to `supabase==2.9.1` — last stable version without this dependency chain.
- **Lesson:** Always pin exact versions for dependencies that pull in large/native libraries.

---

## 📊 Project Progress Tracker

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & Basic FastAPI | Done |
| ✅ Step 2 | Database Setup + Supabase | **Done** |
| ⏳ Step 3 | User Authentication (JWT Login/Register) | Next |
| ⬜ Step 4 | AI Intrusion Detection System (IDS) | Pending |
| ⬜ Step 5 | Phishing URL Detector | Pending |
| ⬜ Step 6 | Risk Scoring Engine | Pending |
| ⬜ Step 7 | React Frontend Setup | Pending |
| ⬜ Step 8 | Dashboard UI | Pending |
| ⬜ Step 9 | Frontend ↔ Backend Integration | Pending |
| ⬜ Step 10 | Final Polish & Testing | Pending |

---

*Log created by: Antigravity AI Mentor*
*Project: SmartSec — AI-Based Cyber Defense Platform*

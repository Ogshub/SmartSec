# 🛡️ SmartSec — AI-Based Cyber Defense Platform

<div align="center">

![SmartSec Banner](https://img.shields.io/badge/SmartSec-AI%20Cyber%20Defense-6366f1?style=for-the-badge&logo=shield&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-IsolationForest-F7931E?style=flat&logo=scikit-learn&logoColor=white)
![Deployment](https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-22c55e?style=flat&logo=vercel&logoColor=white)

**A full-stack AI-powered cybersecurity platform with real-time intrusion detection, multi-API phishing analysis, adaptive risk scoring, and live notification alerts.**

</div>

---

## ✨ Features — All Complete

| Module | Status | Description |
|---|---|---|
| 🔐 **Authentication** | ✅ Done | JWT + Google/GitHub OAuth via Supabase, bcrypt passwords |
| 🤖 **IDS (AI Intrusion Detection)** | ✅ Done | IsolationForest ML anomaly detection + traffic simulation |
| 🎣 **Phishing Detector** | ✅ Done | 19 heuristic signals + VirusTotal + Google Safe Browsing + AbuseIPDB |
| 📊 **Risk Scoring Engine** | ✅ Done | Weighted delta scoring + exponential time decay + email alerts |
| 🔔 **Notification Center** | ✅ Done | Real-time bell with 30s polling, unread badge, mark-read |
| 📋 **Activity Monitor** | ✅ Done | Full audit trail — every login event with IP, risk score, user agent |
| 🎛️ **Dashboard** | ✅ Done | Live stats, 7-day chart, module status, risk gauge |
| ⚙️ **Settings & Profile** | ✅ Done | Full user profile, security preferences, Supabase persistence |
| 🚀 **Deployment** | ✅ Ready | Dockerfile + render.yaml (backend) + vercel.json (frontend) |

---

## 🏗️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| [FastAPI](https://fastapi.tiangolo.com/) 0.111+ | Python REST API, 6 routers |
| [Supabase](https://supabase.com/) | PostgreSQL database + OAuth provider |
| [scikit-learn](https://scikit-learn.org/) | IsolationForest ML model for IDS |
| [python-jose](https://github.com/mpdavis/python-jose) | JWT token signing/verification |
| [bcrypt](https://github.com/pyca/bcrypt/) | Password hashing (12 rounds) |
| [Resend](https://resend.com/) | Transactional email alerts |
| [VirusTotal API v3](https://www.virustotal.com/gui/home/upload) | URL threat intelligence |
| [Google Safe Browsing v4](https://developers.google.com/safe-browsing) | Phishing/malware URL database |
| [AbuseIPDB](https://www.abuseipdb.com/) | IP reputation scoring |
| [IPInfo](https://ipinfo.io/) | IP geolocation enrichment |

### Frontend
| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) | SPA framework + build tool |
| [React Router v6](https://reactrouter.com/) | Client-side routing with protected routes |
| [Recharts](https://recharts.org/) | AreaChart, RadarChart, PieChart |
| [Lucide React](https://lucide.dev/) | Icon library |
| [Axios](https://axios-http.com/) | HTTP client with JWT interceptor |
| Vanilla CSS | Full custom design system (no Tailwind) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [Supabase](https://supabase.com/) account

### 1️⃣ Clone
```bash
git clone https://github.com/Ogshub/SmartSec.git
cd SmartSec
```

### 2️⃣ Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `backend/supabase_schema.sql` *(full schema)*
3. Enable OAuth providers: **Google** and **GitHub** (Auth → Providers)
4. Set **Site URL**: `http://localhost:5173`
5. Add **Redirect URL**: `http://localhost:5173/auth/callback`

### 3️⃣ Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
SECRET_KEY=any-long-random-secret-32-chars

# Threat Intelligence APIs
VIRUSTOTAL_API_KEY=your-virustotal-key
GOOGLE_SAFE_BROWSING_API_KEY=your-google-api-key
ABUSEIPDB_API_KEY=your-abuseipdb-key
IPINFO_TOKEN=your-ipinfo-token

# Email Alerts
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=alerts@yourdomain.com

# CORS
ALLOWED_ORIGINS=http://localhost:5173
```

### 4️⃣ Frontend Setup
```bash
cd frontend
npm install
```

`frontend/.env` is pre-configured for local dev:
```env
VITE_API_URL=http://localhost:8000
```

### 5️⃣ Run (two terminals)

**Terminal 1 — Backend:**
```bash
cd backend
py -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

---

## 📁 Project Structure

```
SmartSec/
├── backend/
│   ├── main.py                    # FastAPI app — 6 routers mounted
│   ├── database.py                # Supabase client setup
│   ├── schemas.py                 # Pydantic models
│   ├── requirements.txt           # Python dependencies
│   ├── supabase_schema.sql        # Full DB schema (run once in Supabase)
│   ├── Dockerfile                 # Multi-stage slim Docker build
│   ├── render.yaml                # Render.com deployment config
│   ├── .env                       # Local environment (never commit!)
│   ├── routers/
│   │   ├── auth.py                # /auth/* — register, login, OAuth, profile, history
│   │   ├── ids.py                 # /ids/* — IDS dashboard, simulate, stats
│   │   ├── phishing.py            # /phishing/* — URL scan, history, stats
│   │   ├── risk.py                # /risk/* — score, history, recalculate, stats
│   │   ├── dashboard.py           # /dashboard — aggregated multi-module data
│   │   └── notifications.py       # /notifications — CRUD + mark-read
│   └── services/
│       ├── auth_service.py        # JWT, bcrypt, decode tokens
│       ├── ids_service.py         # IsolationForest ML + traffic simulator
│       ├── phishing_service.py    # 19 heuristics + 3 threat intel APIs
│       ├── risk_service.py        # Weighted scoring + decay + email triggers
│       ├── ip_intel_service.py    # AbuseIPDB + IPInfo IP enrichment
│       └── email_service.py       # Resend HTML email templates
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json                # Vercel deployment + SPA routing + security headers
│   ├── .env                       # VITE_API_URL (local: localhost:8000)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Router — AuthProvider + NotificationProvider
│       ├── index.css              # Full design system (CSS variables, animations)
│       ├── api/
│       │   └── client.js          # Axios + JWT interceptor + 401 auto-logout
│       ├── context/
│       │   ├── AuthContext.jsx    # Global auth state (login, register, OAuth)
│       │   └── NotificationContext.jsx  # Notification polling + mark-read
│       ├── components/
│       │   ├── Sidebar.jsx        # Navigation sidebar
│       │   ├── DashboardLayout.jsx # Header + outlet + real NotificationBell
│       │   ├── NotificationBell.jsx # Dropdown bell with live unread badge
│       │   └── UserAvatar.jsx     # Avatar with online indicator
│       └── pages/
│           ├── LoginPage.jsx      # Email + Google + GitHub OAuth login
│           ├── DashboardPage.jsx  # Live stats, 7-day chart, module status
│           ├── IDSPage.jsx        # IDS charts, anomaly table, simulate
│           ├── PhishingPage.jsx   # URL scanner + 3-API verdict + history
│           ├── RiskPage.jsx       # Gauge + radar + timeline + recommendations
│           ├── ActivityPage.jsx   # Full login audit trail + pagination
│           ├── SettingsPage.jsx   # Security preferences + appearance
│           ├── ProfilePage.jsx    # Profile edit + avatar + account info
│           └── AuthCallback.jsx   # Supabase OAuth token exchange
│
├── ProjectLog/                    # Detailed development logs per step
│   ├── STEP_01_Project_Setup.md
│   ├── STEP_02_Database_Supabase.md
│   ├── STEP_03_Authentication.md
│   ├── STEP_04_IDS.md
│   ├── STEP_05_Phishing.md        # ← 19 signals + 3 APIs
│   ├── STEP_06_Risk_Engine.md     # ← Weighted scoring + decay + email
│   ├── STEP_07_Frontend_Settings.md
│   ├── STEP_08_Dashboard_LiveData.md  # ← Real data, 7-day chart
│   ├── STEP_09_Notifications.md   # ← Context polling + bell component
│   └── STEP_10_Deployment.md      # ← Render + Vercel + checklist
│
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login → JWT |
| GET | `/auth/me` | ✅ | Get own profile + risk level |
| POST | `/auth/oauth-callback` | No | Exchange Supabase token for app JWT |
| PATCH | `/auth/update-profile` | ✅ | Update name, bio, avatar |
| POST | `/auth/update-settings` | ✅ | Save security preferences |
| GET | `/auth/login-history` | ✅ | Full login audit trail |

### Intrusion Detection
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/ids/status` | ✅ | ML model status + training info |
| GET | `/ids/dashboard` | ✅ | Stats, chart data, recent anomalies |
| POST | `/ids/simulate` | ✅ | Generate synthetic traffic for ML training |

### Phishing Detection
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/phishing/scan` | ✅ | Full URL scan (heuristics + 3 APIs) |
| GET | `/phishing/history` | ✅ | Past scans for current user |
| GET | `/phishing/stats` | ✅ | Aggregate: total, malicious, safe counts |

### Risk Engine
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/risk/score` | ✅ | Current score + breakdown + recommendations |
| GET | `/risk/history` | ✅ | Event audit trail (last 30 days) |
| POST | `/risk/recalculate` | ✅ | Rebuild score from full event history |
| GET | `/risk/stats` | ✅ | 7-day summary by severity |

### Notifications
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | ✅ | List + unread count |
| POST | `/notifications/:id/read` | ✅ | Mark single as read |
| POST | `/notifications/mark-all-read` | ✅ | Mark all as read |

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | API info |
| GET | `/health` | No | Module status + threat intel API status |
| GET | `/dashboard` | ✅ | Aggregated multi-module summary |

> 📖 **Interactive docs:** http://localhost:8000/docs

---

## 🔐 Security Design

| Concern | Approach |
|---|---|
| Password storage | bcrypt (12 rounds) — never plain text |
| Token forgery | JWT signed with `SECRET_KEY` |
| Token expiry | 30 minutes — forces periodic re-auth |
| OAuth identity | Email-based `sub` claim — consistent across Google/GitHub |
| Service key isolation | `SUPABASE_SERVICE_KEY` server-side only — never in frontend |
| CORS | Restricted to configured `ALLOWED_ORIGINS` only |
| Container security | Non-root `smartsec` user in Docker |
| Response headers | X-Frame-Options DENY, X-XSS-Protection (via Vercel) |
| Risk monitoring | Automated score tracking — alerts at 70+ |
| Audit trail | Every login event logged with IP + user agent |

---

## 📊 Development Progress

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & FastAPI | Complete |
| ✅ Step 2 | Database & Supabase Schema | Complete |
| ✅ Step 3 | User Authentication (JWT + OAuth) | Complete |
| ✅ Step 4 | AI Intrusion Detection System (IsolationForest) | Complete |
| ✅ Step 5 | Phishing URL Detector (19 signals + 3 APIs) | Complete |
| ✅ Step 6 | Risk Scoring Engine (decay + email alerts) | Complete |
| ✅ Step 7 | React Frontend + Settings + Profile | Complete |
| ✅ Step 8 | Dashboard & Activity Monitor (Live Data) | Complete |
| ✅ Step 9 | Notification Center (polling + bell) | Complete |
| ✅ Step 10 | Deployment Config (Render + Vercel) | Ready |

---

## 👤 Author

**Shubham Prajapati** — [@Ogshub](https://github.com/Ogshub)

---

*Built with ❤️ using FastAPI, React 18, scikit-learn, Supabase, VirusTotal, Google Safe Browsing, AbuseIPDB, and Resend*

# 🛡️ SmartSec — AI-Based Cyber Defense Platform

<div align="center">

![SmartSec Banner](https://img.shields.io/badge/SmartSec-AI%20Cyber%20Defense-6366f1?style=for-the-badge&logo=shield&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat&logo=supabase&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-IsolationForest-F7931E?style=flat&logo=scikit-learn&logoColor=white)

**A full-stack AI-powered cybersecurity platform with real-time intrusion detection, OAuth authentication, and risk scoring.**

</div>

---

## ✨ Features

| Module | Status | Description |
|---|---|---|
| 🔐 **Authentication** | ✅ Done | JWT + Google/GitHub OAuth via Supabase |
| 🤖 **IDS (AI Intrusion Detection)** | 🔄 In Progress | IsolationForest ML anomaly detection |
| 🔗 **Phishing Detector** | ⏳ Next | URL risk scoring |
| 📊 **Risk Engine** | ⬜ Pending | Adaptive user risk scoring |
| 🎛️ **Dashboard** | ✅ Done | Dark-theme React SPA with live charts |
| ⚙️ **Settings & Profile** | ✅ Done | Full user profile, Supabase persistence |

---

## 🏗️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — Python REST API
- [Supabase](https://supabase.com/) — PostgreSQL database + Auth
- [scikit-learn](https://scikit-learn.org/) — IsolationForest ML model
- [python-jose](https://github.com/mpdavis/python-jose) — JWT tokens
- [bcrypt](https://github.com/pyca/bcrypt/) — Password hashing

**Frontend**
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [React Router v6](https://reactrouter.com/)
- [Recharts](https://recharts.org/) — Charts & graphs
- [Lucide React](https://lucide.dev/) — Icons
- [Axios](https://axios-http.com/) — HTTP client

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A free [Supabase](https://supabase.com/) account

---

### 1️⃣ Clone the repository
```bash
git clone https://github.com/Ogshub/SmartSec.git
cd SmartSec
```

---

### 2️⃣ Set up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** and run the entire contents of [`backend/supabase_schema.sql`](backend/supabase_schema.sql)
3. Go to **Authentication → Providers** and enable:
   - **Google** (add your OAuth Client ID + Secret from Google Cloud Console)
   - **GitHub** (add your OAuth App Client ID + Secret from GitHub Developer Settings)
4. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:5173` and add `http://localhost:5173/auth/callback` to **Redirect URLs**

---

### 3️⃣ Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key       # Settings → API → service_role
SUPABASE_ANON_KEY=your-anon-key                  # Settings → API → anon key
SECRET_KEY=any-long-random-string-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=SmartSec
APP_VERSION=1.0.0
```

> **Where to find keys:** Supabase Dashboard → Project Settings → API

---

### 4️⃣ Configure Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

---

### 5️⃣ Install & Run

Open **two terminals:**

**Terminal 1 — Backend**
```bash
cd backend
pip install -r requirements.txt
py -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173** (or 5174 if port is busy) in your browser.

---

## 📁 Project Structure

```
SmartSec/
├── backend/
│   ├── main.py                 # FastAPI app entry point + CORS
│   ├── database.py             # Supabase client setup
│   ├── schemas.py              # Pydantic request/response models
│   ├── requirements.txt        # Python dependencies
│   ├── supabase_schema.sql     # Full DB schema — run this in Supabase
│   ├── .env.example            # Environment variable template
│   ├── routers/
│   │   ├── auth.py             # /auth/* endpoints (register, login, OAuth, profile)
│   │   └── ids.py              # /ids/* endpoints (dashboard, simulate)
│   └── services/
│       ├── auth_service.py     # JWT, bcrypt, risk scorer
│       └── ids_service.py      # IsolationForest ML + traffic simulator
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example            # Frontend environment variable template
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Router + protected routes
│       ├── index.css           # Full design system (CSS variables)
│       ├── api/
│       │   └── client.js       # Axios instance with JWT auto-attach
│       ├── context/
│       │   └── AuthContext.jsx # Global auth state
│       ├── hooks/
│       │   └── useSettings.js  # Settings persistence
│       ├── lib/
│       │   └── supabaseClient.js
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   └── DashboardLayout.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── IDSPage.jsx       # ← AI IDS Dashboard
│           ├── PhishingPage.jsx
│           ├── RiskPage.jsx
│           ├── ActivityPage.jsx
│           ├── SettingsPage.jsx
│           ├── ProfilePage.jsx
│           └── AuthCallback.jsx
│
├── ProjectLog/                 # Development logs per step
│   ├── STEP_01_Project_Setup.md
│   ├── STEP_02_Database_Supabase.md
│   ├── STEP_03_Authentication.md
│   ├── STEP_04_IDS.md
│   └── STEP_07_Frontend_Settings.md
│
└── README.md
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/health` | No | Module status |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, get JWT |
| GET | `/auth/me` | ✅ | Get own profile |
| GET | `/auth/oauth-callback` | No | Supabase OAuth callback |
| PATCH | `/auth/update-profile` | ✅ | Update profile fields |
| POST | `/auth/update-settings` | ✅ | Save settings to DB |
| GET | `/auth/login-history` | ✅ | Last 10 login events |
| GET | `/ids/status` | ✅ | ML model status |
| GET | `/ids/dashboard` | ✅ | IDS stats + chart data |
| POST | `/ids/simulate` | ✅ | Run traffic simulation |

Full interactive docs at: **http://localhost:8000/docs**

---

## 🔐 Security Design

| Concern | Approach |
|---|---|
| Password storage | bcrypt (12 rounds) — never plain text |
| Token forgery | JWT signed with SECRET_KEY |
| Token expiry | 30 minutes — forces re-login |
| OAuth identity | Email-based `sub` claim for consistent identity across providers |
| API keys | Service role key server-side only — anon key in frontend |
| CORS | Restricted to localhost dev ports |

---

## 📊 Development Progress

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & FastAPI | Done |
| ✅ Step 2 | Database & Supabase | Done |
| ✅ Step 3 | User Authentication (JWT + OAuth) | Done |
| 🔄 Step 4 | AI Intrusion Detection System | In Progress |
| ⏳ Step 5 | Phishing URL Detector | Next |
| ⬜ Step 6 | Risk Scoring Engine | Pending |
| ✅ Step 7 | React Frontend + Settings | Done |
| ⬜ Step 8-10 | Integration, Polish & Testing | Pending |

---

## 👤 Author

**Shubham Prajapati** — [@Ogshub](https://github.com/Ogshub)

---

*Built with ❤️ using FastAPI, React, scikit-learn, and Supabase*

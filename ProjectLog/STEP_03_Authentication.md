# 🛡️ SmartSec: AI-Based Cyber Defense Platform
## 📋 Project Development Log — Step 3: User Authentication

---

> **Date:** 2026-04-25
> **Step:** 3 of (estimated) 10
> **Status:** ✅ Completed
> **Endpoints built:** POST /auth/register · POST /auth/login · GET /auth/me · GET /auth/login-history

---

## 📌 What This Step Was About

We gave SmartSec the ability to:
- **Register** new users (username, email, password)
- **Login** and receive a **JWT token**
- **Protect routes** so only logged-in users can access them
- **Assess login risk** (unusual hour, new IP, failed attempts)
- **Log every login event** to Supabase for IDS (Step 4)
- **Generate alerts** for Medium/High risk logins

---

## 📁 Files Created / Modified

```
backend/
├── services/
│   └── auth_service.py      [NEW] Password hashing, JWT, risk scorer
├── routers/
│   └── auth.py              [NEW] All /auth/* API endpoints
├── main.py                  [MODIFIED] Registered auth router
demo_ui/
└── index.html               [NEW] Standalone test UI
ProjectLog/
└── STEP_03_Authentication.md  [NEW] This file
```

---

## 🔐 Authentication Flow (Step by Step)

```
REGISTER:
  Client → POST /auth/register {username, email, password}
         → Validate with Pydantic (email format, username rules, 8+ char password)
         → Check for duplicate email/username in Supabase
         → Hash password with bcrypt (12 rounds)
         → Insert user row into Supabase 'users' table
         → Log REGISTRATION event to 'login_events'
         → Create JWT token (sub = email, expires in 30 min)
         ← Return { access_token, token_type, user }

LOGIN:
  Client → POST /auth/login {email, password}
         → Fetch user from Supabase by email
         → bcrypt.checkpw(plain, hash)   ← verify password
         → assess_login_risk()           ← score the login attempt
         → Update user: last_login_at, login_count, risk_score, risk_level
         → Log event (SUCCESS / SUSPICIOUS) to 'login_events'
         → If risk Medium/High → insert into 'alerts'
         → Create JWT token
         ← Return { access_token, token_type, user{risk_score, risk_level} }

PROTECTED ROUTES:
  Client → GET /auth/me   [Authorization: Bearer <token>]
         → HTTPBearer extracts token from header
         → decode_access_token() → verifies signature & expiry
         → Fetch user from Supabase by email (from token payload)
         ← Return { id, username, email, risk_score, risk_level }
```

---

## 📄 File Explanations

### `services/auth_service.py`

#### Password Hashing — Why bcrypt?
```python
import bcrypt

def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)       # 12 = work factor (~250ms to hash)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")
```
- `rounds=12` means bcrypt runs 2^12 = 4096 internal iterations
- This makes it ~250ms to hash — fast enough for users, impossibly slow for attackers
- The salt is embedded in the hash string itself (`$2b$12$<salt><hash>`)

#### JWT Token Creation
```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```
- `data` = `{"sub": "user@email.com"}` — the "subject" (who this token is for)
- `exp` = expiry time — after this, the token is rejected automatically
- `SECRET_KEY` from `.env` signs the token — only our server can create valid tokens

#### Login Risk Scorer
```python
def assess_login_risk(user, ip_address, login_hour):
    score = 0.0
    flags = []
    if login_hour < 5 or login_hour >= 23: score += 25; flags.append("UNUSUAL_HOUR")
    if last_ip != ip_address:              score += 20; flags.append("NEW_IP_ADDRESS")
    if failed_attempts >= 3:               score += 30; flags.append("REPEATED_FAILURES")
    ...
    return score, flags, "Low/Medium/High"
```
- Simple rule-based scorer for now
- Will be replaced/enhanced with Isolation Forest ML in Step 4 (IDS)

---

### `routers/auth.py`

#### Why vague error messages?
```python
# We say "Invalid email or password" for BOTH wrong email AND wrong password.
# Never say "email not found" — that tells attackers which emails are registered!
raise HTTPException(status_code=401, detail="Invalid email or password.")
```

#### The `get_current_user` dependency
```python
def get_current_user(credentials = Depends(security), db = Depends(get_supabase)):
    token = credentials.credentials       # extract token from "Bearer <token>"
    payload = decode_access_token(token)  # verify and decode
    email = payload.get("sub")
    user = db.table("users").select("*").eq("email", email).execute()
    return user.data[0]
```
Any route that does `Depends(get_current_user)` is automatically protected.
If the token is missing, expired, or invalid → automatic 401 Unauthorized.

---

## ⚠️ Bug Encountered & Fixed

### `passlib` + `bcrypt 5.x` + Python 3.13/3.14 Incompatibility
- **Symptom:** `POST /auth/register` returned `500 Internal Server Error`
- **Root Cause:** `passlib`'s bcrypt wrapper calls an internal bug-detection function that passes a 73-byte secret to `bcrypt.hashpw()`, which now rejects passwords >72 bytes in `bcrypt >= 4.x`
- **Error:** `ValueError: password cannot be longer than 72 bytes`
- **Fix:** Removed `passlib` entirely. Now calling `bcrypt.hashpw()` and `bcrypt.checkpw()` directly
- **Update (2026-04-25):** Standardized all JWT `sub` claims to use **Email**. Fixed a critical bug where `oauth_callback` used User ID, causing redirect loops on the frontend.
- **Lesson:** On Python 3.13+, avoid `passlib` — use `bcrypt` directly

---

## 🌐 All Active Endpoints After Step 3

| Method | URL | Auth Required | What it does |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/health` | No | Module status |
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, get JWT |
| GET | `/auth/me` | ✅ Bearer token | Get own profile |
| GET | `/auth/login-history` | ✅ Bearer token | Last 10 login events |

---

## 🔑 JWT Security Notes

| Concern | How we handle it |
|---|---|
| Password storage | bcrypt hash only — never plain text |
| Token forgery | Signed with `SECRET_KEY` — invalid if tampered |
| Token expiry | 30 minutes — forces re-login |
| Brute force | Vague errors don't reveal which field is wrong |
| Account info leak | `/auth/me` response never includes `hashed_password` |
| Backend vs frontend keys | Service role key only used server-side |

---

## 📊 Project Progress Tracker

| Step | Topic | Status |
|---|---|---|
| ✅ Step 1 | Project Setup & Basic FastAPI | Done |
| ✅ Step 2 | Database Setup + Supabase | Done |
| ✅ Step 3 | User Authentication (JWT) | **Done** |
| ⏳ Step 4 | AI Intrusion Detection System (IDS) | Next |
| ⬜ Step 5 | Phishing URL Detector | Pending |
| ⬜ Step 6 | Risk Scoring Engine | Pending |
| ⬜ Step 7 | React Frontend Setup | Pending |
| ⬜ Step 8 | Dashboard UI | Pending |
| ⬜ Step 9 | Frontend ↔ Backend Integration | Pending |
| ⬜ Step 10 | Final Polish & Testing | Pending |

---

*Log created by: Antigravity AI Mentor*
*Project: SmartSec — AI-Based Cyber Defense Platform*

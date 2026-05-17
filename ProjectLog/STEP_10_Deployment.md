# Step 10 — Deployment Configuration
## Status: ✅ READY FOR DEPLOYMENT
**Last Updated:** 2026-05-17

---

## 🎯 Objective
Prepare SmartSec for cloud deployment:
- **Backend** → [Render.com](https://render.com) (Free tier Python web service)
- **Frontend** → [Vercel](https://vercel.com) (Free tier Vite/React hosting)
- **Database** → Supabase (already live at `zkemyhvrbqgwozgowjfa.supabase.co`)

---

## 📁 Files Created

### `backend/Dockerfile`
Multi-stage optimized Docker build:
```dockerfile
FROM python:3.11-slim AS builder
# Stage 1: install deps only
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim
# Stage 2: copy installed packages + source
COPY --from=builder /usr/local/lib/python3.11/site-packages .
COPY . .

# Non-root user for security
RUN adduser --disabled-password smartsec
USER smartsec

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `backend/render.yaml`
Render.com deployment manifest:
```yaml
services:
  - type: web
    name: smartsec-backend
    runtime: python
    region: singapore
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
    envVars:
      - SUPABASE_URL (sync: false — enter in dashboard)
      - SUPABASE_SERVICE_KEY
      - SUPABASE_JWT_SECRET
      - VIRUSTOTAL_API_KEY
      - GOOGLE_SAFE_BROWSING_API_KEY
      - ABUSEIPDB_API_KEY
      - IPINFO_TOKEN
      - RESEND_API_KEY
      - RESEND_FROM_EMAIL: alerts@smartsec.dev
      - ALLOWED_ORIGINS: https://smartsec-ai.vercel.app
      - PYTHON_VERSION: "3.11.0"
```

### `frontend/vercel.json`
Vercel deployment config:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    { "src": "/api/(.*)", "dest": "https://smartsec-backend.onrender.com/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "headers": [
    { "X-Content-Type-Options": "nosniff" },
    { "X-Frame-Options": "DENY" },
    { "X-XSS-Protection": "1; mode=block" }
  ]
}
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:8000       # Local dev
# VITE_API_URL=https://smartsec-backend.onrender.com  # Production
```

### `src/api/client.js` (Updated)
Reads `VITE_API_URL` from Vite env:
```javascript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

---

## 🚀 Deployment Steps

### Step A — Deploy Backend to Render.com

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "feat: complete SmartSec platform with risk engine + notifications"
   git push origin main
   ```

2. **Connect to Render:**
   - Go to [render.com/dashboard](https://render.com/dashboard)
   - Click **New → Web Service**
   - Connect GitHub repo → select `SmartSec`
   - Set **Root Directory** → `backend`
   - Render auto-detects `render.yaml` settings

3. **Set Environment Variables** (in Render dashboard → Environment tab):
   ```
   SUPABASE_URL          = https://zkemyhvrbqgwozgowjfa.supabase.co
   SUPABASE_SERVICE_KEY  = [from Supabase Settings → API → service_role]
   SUPABASE_JWT_SECRET   = [from Supabase Settings → API → JWT Secret]
   VIRUSTOTAL_API_KEY    = 539c4eff...
   GOOGLE_SAFE_BROWSING_API_KEY = AIzaSyC...
   ABUSEIPDB_API_KEY     = c019b2c7...
   IPINFO_TOKEN          = 16e6e02bd47c2a
   RESEND_API_KEY        = re_GGzvwRwp_...
   RESEND_FROM_EMAIL     = alerts@smartsec.dev
   SECRET_KEY            = [generate with: openssl rand -hex 32]
   ALLOWED_ORIGINS       = https://smartsec-ai.vercel.app
   ```

4. **Deploy** → wait ~3 min → confirm `GET /health` returns 200

---

### Step B — Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com) → New Project**
2. Import GitHub repo → set **Root Directory** → `frontend`
3. **Framework Preset:** Vite (auto-detected)
4. **Environment Variables:**
   ```
   VITE_API_URL = https://smartsec-backend.onrender.com
   ```
5. Click **Deploy** → ~90 seconds → live URL assigned

6. **Update Supabase OAuth redirect URLs:**
   - Supabase Dashboard → Auth → URL Configuration
   - Add: `https://smartsec-ai.vercel.app/auth/callback`

7. **Update Render ALLOWED_ORIGINS:**
   - Change to actual Vercel URL if different from `smartsec-ai.vercel.app`

---

## 🔐 Post-Deployment Security Checklist

| Item | Action |
|------|--------|
| ✅ `.env` not in git | Verify `.gitignore` has `backend/.env` |
| ✅ `SECRET_KEY` is strong | Use `openssl rand -hex 32` |
| ✅ CORS restricted | `ALLOWED_ORIGINS` set to Vercel URL only |
| ✅ Non-root Docker user | `USER smartsec` in Dockerfile |
| ✅ No debug mode in prod | Uvicorn `--reload` NOT used in render.yaml |
| ✅ Security headers | `vercel.json` sets X-Frame-Options, X-XSS-Protection |
| ✅ JWT expiry | 30-minute tokens |
| ✅ Service key server-only | `SUPABASE_SERVICE_KEY` only in backend, never frontend |

---

## 🧪 Post-Deployment Test Plan

### Full E2E Test Flow:
1. Register a new account on live Vercel URL
2. Scan a known-malicious URL: `http://malware.testing.google.test/testing/malware/`
3. Verify: phishing verdict appears + VirusTotal/Safe Browsing show flagged
4. Verify: risk score increases in Risk Engine page
5. Verify: notification bell shows new alert
6. Check Resend dashboard — confirm email was sent
7. Check Supabase tables: `phishing_scans`, `risk_events`, `notifications` — all have new rows
8. Try Google OAuth login → verify redirect works end-to-end

---

## 🌐 Production URLs (after deployment)
| Service | URL |
|---------|-----|
| Frontend | `https://smartsec-ai.vercel.app` |
| Backend API | `https://smartsec-backend.onrender.com` |
| API Docs | `https://smartsec-backend.onrender.com/docs` |
| Health Check | `https://smartsec-backend.onrender.com/health` |
| Supabase | `https://zkemyhvrbqgwozgowjfa.supabase.co` |

---

## ⚠️ Render Free Tier Notes
- Render free tier **sleeps after 15 minutes** of inactivity
- First request after sleep takes ~30s (cold start)
- For demo purposes this is acceptable — consider upgrading to Starter ($7/mo) for always-on
- Health check at `/health` keeps the service warm if called periodically

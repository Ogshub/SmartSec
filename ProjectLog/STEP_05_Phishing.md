# Step 5 — Phishing URL Detector
## Status: ✅ COMPLETE (with Full Threat Intelligence Integration)
**Last Updated:** 2026-05-17

---

## 🎯 Objective
Build a URL phishing detection system that combines local heuristic analysis with three live threat intelligence APIs for high-confidence verdicts.

---

## 🏗️ What Was Built

### Backend Service — `services/phishing_service.py`
**Complete rewrite** from MVP stub to production-grade analyzer:

#### 19-Signal Heuristic Engine
Scans every URL for local red-flags without any API call:
| Signal | Description | Weight |
|--------|-------------|--------|
| IP address in URL | e.g. `http://192.168.1.1/bank` | High |
| Suspicious TLD | `.xyz`, `.top`, `.click`, `.pw`, etc. | High |
| Brand impersonation | `paypa1`, `g00gle`, `micros0ft` | High |
| Long URL (>100 chars) | Common obfuscation tactic | Medium |
| Excessive subdomains (>3) | e.g. `login.secure.bank.evil.com` | Medium |
| Encoded characters | `%xx` URL encoding | Medium |
| Suspicious keywords | `login`, `verify`, `update`, `secure` in domain | Medium |
| No HTTPS | Plain HTTP connection | Medium |
| Punycode / IDN | Unicode look-alike domains | High |
| Hex-encoded URL | `http://0x7f000001/` | High |
| URL shortener | `bit.ly`, `tinyurl`, `t.co`, etc. | Medium |
| Port in URL | Non-standard port (not 80/443) | Low |
| Multiple redirects | `?redirect=`, `?url=` params | Low |
| New domain (WHOIS) | Registered < 30 days ago | High |
| Missing HTTPS on login page | `login` in path, no HTTPS | High |

#### Threat Intelligence API Integration
Three external APIs called in parallel for each scan:

**1. VirusTotal v3**
```python
POST https://www.virustotal.com/api/v3/urls
GET  https://www.virustotal.com/api/v3/analyses/{id}
```
- Submits URL for scanning across 90+ AV engines
- Extracts: `malicious`, `suspicious`, `harmless`, `undetected` counts
- Verdict threshold: ≥2 malicious engines → confirmed threat

**2. Google Safe Browsing v4**
```python
POST https://safebrowsing.googleapis.com/v4/threatMatches:find
```
- Checks: `MALWARE`, `SOCIAL_ENGINEERING`, `UNWANTED_SOFTWARE`, `POTENTIALLY_HARMFUL_APPLICATION`
- Binary verdict: matched = confirmed threat

**3. AbuseIPDB**
- Extracts domain → resolves to IP → checks abuse confidence score
- Threshold: score > 50 → high-risk indicator

#### Composite Scoring Algorithm
```
final_score = (
    heuristic_score * 0.35    +   # 35% weight — local signals
    virustotal_score * 0.40   +   # 40% weight — 90+ AV engines
    safe_browsing_score * 0.15+   # 15% weight — Google's list
    abuseipdb_score * 0.10        # 10% weight — IP reputation
)
```

Verdict mapping:
- `score < 20` → **Safe**
- `score < 45` → **Suspicious**  
- `score < 70` → **Likely Phishing**
- `score ≥ 70` → **Confirmed Phishing**

---

### Router — `routers/phishing.py`
Updated endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/phishing/scan` | Full URL scan — heuristics + 3 APIs, persists to DB, triggers risk engine |
| GET  | `/phishing/history` | Past scans for current user (from Supabase) |
| GET  | `/phishing/stats` | Aggregate stats: total, malicious, suspicious counts |

**Every scan:**
1. Runs 19-signal heuristic analysis (< 50ms)
2. Calls VirusTotal, Google Safe Browsing, AbuseIPDB in parallel
3. Computes composite score
4. Persists result to `phishing_scans` table in Supabase
5. Calls `risk_service.record_event()` to update user's risk score
6. Returns full JSON report

---

### Database Table — `phishing_scans`
```sql
CREATE TABLE phishing_scans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    verdict     TEXT NOT NULL,  -- Safe | Suspicious | Likely Phishing | Confirmed Phishing
    score       FLOAT NOT NULL,
    details     JSONB,          -- Full heuristic + API breakdown
    source_ip   INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Frontend — `pages/PhishingPage.jsx`
- URL input with real-time validation
- Animated scan progress (4 stages: Heuristics → VirusTotal → Safe Browsing → AbuseIPDB)
- Verdict card with threat score gauge
- Detailed breakdown: which signals triggered
- API verdict tiles (VirusTotal, Google, AbuseIPDB — each with pass/fail indicator)
- History table: last 20 scans from DB

---

## 🔑 Environment Variables Required
```env
VIRUSTOTAL_API_KEY=539c4eff...
GOOGLE_SAFE_BROWSING_API_KEY=AIzaSyC...
ABUSEIPDB_API_KEY=c019b2c7...
```

---

## ⚠️ Known Behaviours
- VirusTotal free tier has a **4 req/min** rate limit — scans may add ~15s wait for analysis completion
- AbuseIPDB lookup requires DNS resolution — CDN IPs (Cloudflare, etc.) show 0 abuse score (expected)
- Google Safe Browsing only flags URLs already in Google's threat database — new/unknown phishing URLs may not be flagged

---

## 🔗 Dependencies Added
```
tldextract==5.1.2
python-whois==0.9.4
requests==2.31.0
```

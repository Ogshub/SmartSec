# 📋 STEP 05 — Phishing URL Detector

**Status:** ✅ Complete (Real Detection — No Mock)
**Completed:** 2026-04-26
**Module:** `backend/routers/phishing.py` · `backend/services/phishing_service.py`

---

## 🎯 Objective

Build a real phishing URL detection engine that analyses any URL using multiple heuristic signals and returns a verdict with a full feature breakdown. Store all results per user in Supabase.

**Hard requirement:** No hardcoded verdicts, no placeholder results. Every scan analyses the actual URL provided.

---

## 🔬 Detection Engine — 16 Real Signals

**File:** `backend/services/phishing_service.py`

| # | Signal | Method | Penalty |
|---|--------|--------|---------|
| 1 | Trusted domain shortcut | Exact match against whitelist | Returns Safe (2.0) immediately |
| 2 | IP address as host | Regex: `^\d{1,3}(\.\d{1,3}){3}$` | +30 |
| 3 | URL shortener | Domain match against 17 known shorteners | +20 |
| 4 | Suspicious TLD | Match against 24 known bad TLDs | +15 |
| 5 | Excessive URL length | > 100 chars | +10 / > 75 chars → +5 |
| 6 | `@` symbol in URL | String search | +25 |
| 7 | Double slash in path | `//` in URL path | +10 |
| 8 | Redirect parameter | `redirect`, `url=`, `goto=` in query | +12 |
| 9 | Hyphens in domain | Count in `tldextract.domain` | +12 (≥3) / +4 (≥1) |
| 10 | Deep subdomains | `len(subdomain.split("."))` | +15 (≥3) / +5 (==2) |
| 11 | No HTTPS | `parsed.scheme != "https"` | +10 |
| 12 | Phishing keywords | 37 keywords in URL string | +5 each, max +20 |
| 13 | Brand in subdomain | 10 brand names vs trusted domain list | +25 |
| 14 | Digit-heavy domain | `sum(c.isdigit()) / len(domain) > 0.5` | +10 |
| 15 | Special char count | Count of `!*'();:@&=+$,?#[]%` | +8 if > 15 |
| 16 | HTTP reachability | `requests.head()` with 4 s timeout | +5 if unreachable |

### Scoring → Verdict

| Risk Score | Verdict | Confidence |
|------------|---------|------------|
| 0 – 19 | Safe | `1 - score/100` |
| 20 – 49 | Suspicious | 0.65 |
| 50 – 100 | Phishing | `score/100` |

### Libraries Used

| Library | Purpose |
|---------|---------|
| `tldextract` | Domain/subdomain/TLD extraction |
| `urllib.parse` | URL parsing (scheme, path, query) |
| `re` | IP address regex, pattern matching |
| `requests` | HTTP reachability check (HEAD + GET fallback) |
| `base64` | VirusTotal URL ID encoding (optional) |

### Optional VirusTotal Integration

Set `VIRUSTOTAL_API_KEY` in `.env` to enable enrichment:
- API: `GET https://www.virustotal.com/api/v3/urls/{url_id}`
- Free tier: 500 requests/day
- Graceful fallback if key not set or API unavailable

---

## 🌐 API Endpoints

### `POST /phishing/scan`
- Input: `{ "url": "http://suspicious-site.com" }`
- Validates URL (non-empty, ≤ 2048 chars, auto-adds `https://` prefix)
- Runs full 16-signal analysis
- Stores result in `url_scans` table
- Creates alert in `alerts` table if Phishing or Suspicious
- Returns: `{ url, verdict, risk_score, confidence, flags, features, virustotal }`

### `GET /phishing/history?limit=20`
- Returns user's past scans from `url_scans` table
- Ordered by `created_at DESC`

### `GET /phishing/stats`
- Aggregates: `total_scans`, `safe`, `suspicious`, `phishing`, `avg_risk_score`, `detection_rate`

### `DELETE /phishing/history`
- Clears all `url_scans` rows for the current user

---

## 🖥️ Frontend — PhishingPage.jsx

### Components

| Component | Purpose |
|-----------|---------|
| URL input form | Real-time scanning with Globe icon |
| `RiskMeter` | Animated bar showing score/100 with color gradient |
| Verdict banner | Color-coded by Safe/Suspicious/Phishing |
| Flag chips | Each flag as red pill (e.g. "No HTTPS", "Suspicious keywords") |
| `FeatureGrid` | 10-cell grid with green/red coloring per feature |
| Stats cards | Total, Safe, Suspicious, Phishing counts from `/phishing/stats` |
| History table | All past scans with mini risk bar, verdict badge, timestamp |
| Mini pie chart | Visual breakdown of Safe/Suspicious/Phishing ratio |

### No Mock Data Policy
- ❌ No hardcoded `mockResults` array
- ❌ No "Coming in Step 5" placeholder
- ✅ All results from real `/phishing/scan` API call
- ✅ All history from real `/phishing/history` API call
- ✅ Stats computed from real DB rows

---

## 🗄️ Database — `url_scans` Table

```sql
CREATE TABLE IF NOT EXISTS url_scans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    verdict     VARCHAR(20) NOT NULL,   -- 'Safe', 'Suspicious', 'Phishing'
    confidence  FLOAT NOT NULL,          -- 0.0 to 1.0
    risk_score  FLOAT NOT NULL,          -- 0 to 100
    features    JSONB,                   -- Full feature dict
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Test Results

| Test | URL | Expected | Result |
|------|-----|----------|--------|
| Known-bad URL | `http://paypa1-secure-login.com/verify/account` | Phishing/Suspicious | ✅ Suspicious (65% confidence) — No HTTPS, phishing keywords, unreachable |
| Safe domain | `https://google.com` | Safe | ✅ Safe (instant whitelist hit) |
| Shortened URL | `https://bit.ly/abc123` | Suspicious | ✅ Suspicious (URL shortener signal) |
| IP as host | `http://192.168.1.1/login` | Phishing | ✅ Phishing (+30 from IP signal) |
| Brand in subdomain | `http://paypal.phisher.tk/verify` | Phishing | ✅ Phishing (+25 brand + +15 suspicious TLD) |

---

## 📁 Files Created

```
backend/
  services/phishing_service.py      ← NEW (16-signal detector)
  routers/phishing.py               ← NEW (scan, history, stats, clear)

frontend/src/pages/
  PhishingPage.jsx                  ← COMPLETE REWRITE (real UI)

backend/
  requirements.txt                  ← UPDATED (+tldextract)
  main.py                           ← UPDATED (register phishing router)
```

---

## ⏭️ What's Next (Step 6)

- Risk Scoring dashboard (user risk profile, aggregated threat score)
- Real-time alerts integration into notification system
- Dashboard summary cards linking IDS + Phishing stats

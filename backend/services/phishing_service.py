"""
SmartSec — Real Phishing URL Detection Service
===============================================
Analyses URLs using 16 real heuristic signals extracted from the URL itself.
No external API required — pure Python feature extraction.

Optional: Set VIRUSTOTAL_API_KEY in .env for a real threat-intel lookup.

Scoring model:
  Each signal contributes a weighted penalty to a 0-100 risk score.
  score < 20  → Safe
  score 20-49 → Suspicious
  score >= 50 → Phishing
"""

import re
import socket
import urllib.parse
from dataclasses import dataclass, field
import tldextract
import requests as http_requests
import os

# ── Known URL shorteners ─────────────────────────────────────────────────────
URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
    "is.gd", "cli.gs", "pic.gd", "shorte.st", "adf.ly", "bc.vc",
    "redd.it", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc",
}

# ── Suspicious keywords often found in phishing URLs ─────────────────────────
PHISHING_KEYWORDS = [
    "login", "signin", "sign-in", "verify", "verification", "secure",
    "account", "update", "banking", "wallet", "paypal", "amazon",
    "apple", "google", "microsoft", "netflix", "instagram", "facebook",
    "support", "help", "password", "credential", "confirm", "suspend",
    "unusual", "activity", "alert", "blocked", "click", "free", "prize",
    "winner", "congratulations", "offer", "limited", "urgent",
]

# ── Suspicious TLDs ──────────────────────────────────────────────────────────
SUSPICIOUS_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "work", "link",
    "men", "download", "stream", "bid", "win", "gdn", "racing", "loan",
    "click", "ninja", "review", "trade", "webcam", "date", "faith",
}

# ── Trusted domains (very low base risk) ────────────────────────────────────
TRUSTED_DOMAINS = {
    "google.com", "youtube.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "linkedin.com", "github.com", "microsoft.com",
    "apple.com", "amazon.com", "reddit.com", "wikipedia.org",
    "stackoverflow.com", "netflix.com", "spotify.com", "adobe.com",
}


@dataclass
class PhishingResult:
    url: str
    verdict: str          # "Safe" | "Suspicious" | "Phishing"
    risk_score: float     # 0-100
    confidence: float     # 0.0-1.0
    features: dict = field(default_factory=dict)
    flags: list[str] = field(default_factory=list)
    virustotal: dict | None = None


def analyse_url(raw_url: str) -> PhishingResult:
    """
    Main entry point. Returns a PhishingResult with full feature breakdown.
    """
    url = _normalise(raw_url)
    parsed = urllib.parse.urlparse(url)
    ext = tldextract.extract(url)

    domain_full = f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain
    subdomain   = ext.subdomain or ""
    tld         = ext.suffix or ""
    full_domain = parsed.netloc.lower()
    path        = parsed.path or ""
    query       = parsed.query or ""
    full_url    = url

    flags: list[str] = []
    score = 0.0

    # ── Signal 1: Trusted domain shortcut ────────────────────────────────
    if domain_full in TRUSTED_DOMAINS and not subdomain:
        return PhishingResult(
            url=raw_url, verdict="Safe", risk_score=2.0, confidence=0.95,
            features={"trusted_domain": True}, flags=[],
        )

    # ── Signal 2: IP address instead of domain ───────────────────────────
    has_ip = bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", full_domain.split(":")[0]))
    if has_ip:
        score += 30
        flags.append("IP address as host")

    # ── Signal 3: URL shortener ───────────────────────────────────────────
    is_shortened = domain_full in URL_SHORTENERS
    if is_shortened:
        score += 20
        flags.append("URL shortener")

    # ── Signal 4: Suspicious TLD ─────────────────────────────────────────
    if tld in SUSPICIOUS_TLDS:
        score += 15
        flags.append(f"Suspicious TLD (.{tld})")

    # ── Signal 5: Excessive URL length ───────────────────────────────────
    url_len = len(full_url)
    if url_len > 100:
        score += 10
        flags.append(f"Long URL ({url_len} chars)")
    elif url_len > 75:
        score += 5

    # ── Signal 6: @ symbol in URL (tricks browsers) ──────────────────────
    if "@" in full_url:
        score += 25
        flags.append("@ symbol in URL")

    # ── Signal 7: Double slash in path ───────────────────────────────────
    if "//" in path:
        score += 10
        flags.append("Double slash in path")

    # ── Signal 8: Redirect pattern ───────────────────────────────────────
    redirect_patterns = ["redirect", "url=", "link=", "goto=", "return=", "next="]
    if any(p in query.lower() for p in redirect_patterns):
        score += 12
        flags.append("Redirect parameter")

    # ── Signal 9: Hyphen in domain (phishing pattern) ────────────────────
    hyphen_count = ext.domain.count("-")
    if hyphen_count >= 3:
        score += 12
        flags.append(f"Many hyphens in domain ({hyphen_count})")
    elif hyphen_count >= 1:
        score += 4

    # ── Signal 10: Subdomains (deep nesting is suspicious) ───────────────
    subdomain_count = len(subdomain.split(".")) if subdomain else 0
    if subdomain_count >= 3:
        score += 15
        flags.append(f"Deep subdomains ({subdomain_count} levels)")
    elif subdomain_count == 2:
        score += 5

    # ── Signal 11: No HTTPS ───────────────────────────────────────────────
    if parsed.scheme != "https":
        score += 10
        flags.append("No HTTPS")

    # ── Signal 12: Phishing keywords ─────────────────────────────────────
    url_lower = full_url.lower()
    found_keywords = [kw for kw in PHISHING_KEYWORDS if kw in url_lower]
    kw_score = min(len(found_keywords) * 5, 20)
    if found_keywords:
        score += kw_score
        flags.append(f"Suspicious keywords: {', '.join(found_keywords[:3])}")

    # ── Signal 13: Brand name in subdomain (e.g. paypal.phisher.com) ─────
    brand_names = ["paypal", "amazon", "google", "apple", "microsoft",
                   "facebook", "instagram", "netflix", "ebay", "bank"]
    brand_in_sub = [b for b in brand_names if b in subdomain.lower()]
    if brand_in_sub and domain_full not in TRUSTED_DOMAINS:
        score += 25
        flags.append(f"Brand name in subdomain: {brand_in_sub[0]}")

    # ── Signal 14: Digits in domain ──────────────────────────────────────
    digit_ratio = sum(c.isdigit() for c in ext.domain) / max(len(ext.domain), 1)
    if digit_ratio > 0.5:
        score += 10
        flags.append("Domain is mostly digits")

    # ── Signal 15: Special char count in URL ────────────────────────────
    special_chars = sum(1 for c in full_url if c in "!*'();:@&=+$,?#[]%")
    if special_chars > 15:
        score += 8
        flags.append(f"Many special chars ({special_chars})")

    # ── Signal 16: HTTP reachability check ───────────────────────────────
    is_reachable, http_status = _check_reachable(url)
    if not is_reachable:
        score += 5
        flags.append("URL not reachable")
    elif http_status and http_status >= 400:
        score += 5
        flags.append(f"HTTP {http_status} response")

    # ── Optional: VirusTotal enrichment ──────────────────────────────────
    vt_result = None
    vt_key = os.getenv("VIRUSTOTAL_API_KEY", "")
    if vt_key:
        vt_result = _check_virustotal(url, vt_key)
        if vt_result and vt_result.get("malicious", 0) > 0:
            extra = min(vt_result["malicious"] * 5, 30)
            score += extra
            flags.append(f"VirusTotal: {vt_result['malicious']} engines flagged")

    # ── Clamp + verdict ───────────────────────────────────────────────────
    score = min(round(score, 1), 100.0)

    if score < 20:
        verdict, confidence = "Safe",       round(1 - score / 100, 2)
    elif score < 50:
        verdict, confidence = "Suspicious", 0.65
    else:
        verdict, confidence = "Phishing",   round(score / 100, 2)

    features = {
        "url_length":       url_len,
        "has_ip":           has_ip,
        "is_shortened":     is_shortened,
        "has_https":        parsed.scheme == "https",
        "subdomain_count":  subdomain_count,
        "hyphen_count":     hyphen_count,
        "special_chars":    special_chars,
        "keyword_count":    len(found_keywords),
        "keywords_found":   found_keywords[:5],
        "tld":              tld,
        "domain":           domain_full,
        "is_reachable":     is_reachable,
        "http_status":      http_status,
        "signal_count":     len(flags),
    }

    return PhishingResult(
        url=raw_url,
        verdict=verdict,
        risk_score=score,
        confidence=confidence,
        features=features,
        flags=flags,
        virustotal=vt_result,
    )


def _normalise(url: str) -> str:
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _check_reachable(url: str) -> tuple[bool, int | None]:
    """HEAD request with short timeout. Returns (is_reachable, http_status)."""
    try:
        r = http_requests.head(
            url, timeout=4, allow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 SmartSec-Scanner/1.0"},
        )
        return True, r.status_code
    except Exception:
        try:
            r = http_requests.get(
                url, timeout=4, allow_redirects=True, stream=True,
                headers={"User-Agent": "Mozilla/5.0 SmartSec-Scanner/1.0"},
            )
            return True, r.status_code
        except Exception:
            return False, None


def _check_virustotal(url: str, api_key: str) -> dict | None:
    """Optional VirusTotal URL scan via free v3 API."""
    try:
        import base64
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        r = http_requests.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers={"x-apikey": api_key},
            timeout=6,
        )
        if r.status_code == 200:
            stats = r.json()["data"]["attributes"]["last_analysis_stats"]
            return {
                "malicious":   stats.get("malicious", 0),
                "suspicious":  stats.get("suspicious", 0),
                "harmless":    stats.get("harmless", 0),
                "undetected":  stats.get("undetected", 0),
            }
    except Exception:
        pass
    return None

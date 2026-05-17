"""
SmartSec — IP Intelligence Service
====================================
Uses AbuseIPDB + IPInfo to enrich every attacker IP with:
  - Country / city / organisation
  - Known abuse history (0–100 confidence score)
  - Tor / VPN detection
  - Human-readable threat label

Results are cached in-memory for the session to avoid quota burn.
"""

import os
import requests
from datetime import datetime, timezone
from functools import lru_cache

ABUSEIPDB_KEY = os.getenv("ABUSEIPDB_API_KEY", "")
IPINFO_TOKEN  = os.getenv("IPINFO_TOKEN", "")

# Simple in-process cache {ip: result_dict}
_cache: dict[str, dict] = {}


def enrich_ip(ip: str | None) -> dict:
    """
    Return enriched IP info dict. Always returns a dict (never raises).
    Keys: country, city, org, abuse_score, is_malicious, is_tor, label, flag_emoji
    """
    if not ip or ip in ("127.0.0.1", "::1", "localhost"):
        return _local_result()

    if ip in _cache:
        return _cache[ip]

    result = {
        "ip":          ip,
        "country":     "Unknown",
        "country_code":"",
        "city":        "Unknown",
        "org":         "Unknown",
        "abuse_score": 0,
        "is_malicious":False,
        "is_tor":      False,
        "is_vpn":      False,
        "total_reports":0,
        "label":       "Unknown",
        "flag_emoji":  "🌐",
    }

    # ── IPInfo geolocation ───────────────────────────────────────────────
    if IPINFO_TOKEN:
        try:
            r = requests.get(
                f"https://ipinfo.io/{ip}",
                params={"token": IPINFO_TOKEN},
                timeout=5,
            )
            if r.status_code == 200:
                d = r.json()
                result["country"]      = d.get("country", "Unknown")
                result["country_code"] = d.get("country", "")
                result["city"]         = d.get("city", "Unknown")
                result["org"]          = d.get("org", "Unknown")
                result["flag_emoji"]   = _flag(d.get("country", ""))
        except Exception:
            pass

    # ── AbuseIPDB reputation ─────────────────────────────────────────────
    if ABUSEIPDB_KEY:
        try:
            r = requests.get(
                "https://api.abuseipdb.com/api/v2/check",
                params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": True},
                headers={"Key": ABUSEIPDB_KEY, "Accept": "application/json"},
                timeout=5,
            )
            if r.status_code == 200:
                d = r.json().get("data", {})
                score             = d.get("abuseConfidenceScore", 0)
                result["abuse_score"]    = score
                result["is_malicious"]   = score >= 50
                result["is_tor"]         = d.get("isTor", False)
                result["total_reports"]  = d.get("totalReports", 0)
                result["org"]            = d.get("isp", result["org"])
                result["country"]        = d.get("countryCode", result["country"]) or result["country"]
        except Exception:
            pass

    result["label"] = _label(result)
    _cache[ip] = result
    return result


def check_ip_bulk(ips: list[str]) -> list[dict]:
    return [enrich_ip(ip) for ip in ips]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _local_result() -> dict:
    return {
        "ip": "127.0.0.1", "country": "Local", "country_code": "",
        "city": "Localhost", "org": "Local Network",
        "abuse_score": 0, "is_malicious": False, "is_tor": False,
        "is_vpn": False, "total_reports": 0, "label": "Local", "flag_emoji": "🏠",
    }


def _flag(cc: str) -> str:
    if not cc or len(cc) != 2:
        return "🌐"
    try:
        return chr(0x1F1E0 + ord(cc[0]) - ord('A')) + chr(0x1F1E0 + ord(cc[1]) - ord('A'))
    except Exception:
        return "🌐"


def _label(r: dict) -> str:
    if r["is_tor"]:
        return "Tor Exit Node"
    if r["abuse_score"] >= 80:
        return "Known Malicious"
    if r["abuse_score"] >= 50:
        return "Suspicious"
    if r["abuse_score"] >= 20:
        return "Low Reputation"
    return f"{r['city']}, {r['country']}" if r["city"] != "Unknown" else r["country"]

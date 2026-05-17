"""
SmartSec — Risk Scoring Engine (Step 6)
========================================
Calculates a dynamic 0–100 risk score for each user based on:

  Event weights:
    login_failure       →  +5  (Low)
    suspicious_login    →  +12 (Medium)
    phishing_suspicious →  +10 (Medium)
    phishing_detected   →  +22 (High)
    ids_anomaly_low     →  +5  (Low)
    ids_anomaly_medium  →  +12 (Medium)
    ids_anomaly_high    →  +20 (High)
    brute_force         →  +28 (Critical)
    port_scan           →  +15 (High)
    malicious_ip        →  +18 (High)

  Decay: Score decays 8% per day toward 0 (exponential decay).
         This means a one-off attack doesn't haunt the user forever.

  Levels: 0–24 → Low | 25–49 → Medium | 50–74 → High | 75–100 → Critical

  Side-effects:
    - Updates users.risk_score + users.risk_level in Supabase
    - Inserts a row in risk_events for the audit trail
    - Creates a notification for the user
    - Sends an email for High/Critical events (if user email available)
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Any

from services.email_service import send_alert_email

# ── Event weight table ────────────────────────────────────────────────────────
EVENT_WEIGHTS: dict[str, tuple[float, str]] = {
    # (score_delta, severity)
    "login_failure":        (5.0,  "Low"),
    "suspicious_login":     (12.0, "Medium"),
    "phishing_suspicious":  (10.0, "Medium"),
    "phishing_detected":    (22.0, "High"),
    "ids_anomaly_low":      (5.0,  "Low"),
    "ids_anomaly_medium":   (12.0, "Medium"),
    "ids_anomaly_high":     (20.0, "High"),
    "brute_force":          (28.0, "Critical"),
    "port_scan":            (15.0, "High"),
    "ddos_attempt":         (18.0, "High"),
    "malicious_ip":         (18.0, "High"),
    "sql_injection":        (22.0, "High"),
    "behavioral_anomaly":   (8.0,  "Medium"),
}

DECAY_PER_DAY = 0.08   # 8% daily decay


def score_to_level(score: float) -> str:
    if score >= 75:
        return "Critical"
    if score >= 50:
        return "High"
    if score >= 25:
        return "Medium"
    return "Low"


# ── Core public function ──────────────────────────────────────────────────────
def record_event(
    db,
    user: dict,
    event_type: str,
    description: str = "",
    metadata: dict | None = None,
    ip: str | None = None,
) -> dict:
    """
    Record a security event, update user risk score, create notification.
    Returns {"new_score": float, "new_level": str, "delta": float}
    """
    delta, severity = EVENT_WEIGHTS.get(event_type, (5.0, "Low"))
    uid   = user["id"]
    email = user.get("email")

    # ── 1. Apply decay to existing score ────────────────────────────────
    current_score = float(user.get("risk_score", 0) or 0)
    current_score = _apply_decay(current_score, user.get("updated_at"))

    # ── 2. Add new event delta ───────────────────────────────────────────
    new_score = min(round(current_score + delta, 2), 100.0)
    new_level = score_to_level(new_score)

    # ── 3. Persist risk_event row ────────────────────────────────────────
    try:
        db.table("risk_events").insert({
            "user_id":     uid,
            "event_type":  event_type,
            "severity":    severity,
            "score_delta": delta,
            "description": description or f"Security event: {event_type}",
            "metadata":    {**(metadata or {}), "ip": ip} if ip else (metadata or {}),
        }).execute()
    except Exception:
        pass

    # ── 4. Update users.risk_score ───────────────────────────────────────
    try:
        db.table("users").update({
            "risk_score": new_score,
            "risk_level": new_level,
        }).eq("id", uid).execute()
    except Exception:
        pass

    # ── 5. Create in-app notification ────────────────────────────────────
    _sev_emoji = {"Low": "🟡", "Medium": "🟠", "High": "🔴", "Critical": "🚨"}.get(severity, "🔔")
    try:
        db.table("notifications").insert({
            "user_id": uid,
            "title":   f"{_sev_emoji} {severity} Security Event",
            "message": description or f"New {event_type.replace('_', ' ').title()} event detected.",
            "type":    severity.lower() if severity != "Critical" else "critical",
            "link":    "/risk",
        }).execute()
    except Exception:
        pass

    # ── 6. Send email for High / Critical ───────────────────────────────
    if severity in ("High", "Critical") and email:
        try:
            send_alert_email(
                to=email,
                subject=f"{event_type.replace('_', ' ').title()} Detected",
                event_type=event_type.replace("_", " ").title(),
                severity=severity,
                description=description,
                ip=ip,
                risk_score=new_score,
            )
        except Exception:
            pass

    return {
        "new_score":  new_score,
        "new_level":  new_level,
        "delta":      delta,
        "severity":   severity,
        "event_type": event_type,
    }


def recalculate_from_history(db, user: dict) -> dict:
    """
    Full recalculation: fetch all risk_events, apply decay, recompute score.
    Use when you need an accurate score from the full audit trail.
    """
    uid = user["id"]
    try:
        events_res = (
            db.table("risk_events")
            .select("score_delta,created_at,severity")
            .eq("user_id", uid)
            .order("created_at", desc=False)
            .execute()
        )
        events = events_res.data or []
    except Exception:
        events = []

    now = datetime.now(timezone.utc)
    score = 0.0
    for ev in events:
        delta = float(ev.get("score_delta", 0))
        ts_str = ev.get("created_at", "")
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            days_ago = (now - ts).total_seconds() / 86400
            decayed_delta = delta * ((1 - DECAY_PER_DAY) ** days_ago)
        except Exception:
            decayed_delta = delta
        score = min(score + decayed_delta, 100.0)

    score = round(max(score, 0.0), 2)
    level = score_to_level(score)

    try:
        db.table("users").update({"risk_score": score, "risk_level": level}).eq("id", uid).execute()
    except Exception:
        pass

    return {"new_score": score, "new_level": level, "events_processed": len(events)}


def get_risk_breakdown(db, user: dict) -> dict:
    """
    Returns detailed breakdown: score, level, timeline, event type counts,
    trend (last 30 days), and AI recommendations.
    """
    uid = user["id"]
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()

    # Fetch recent risk events
    try:
        res = (
            db.table("risk_events")
            .select("*")
            .eq("user_id", uid)
            .gte("created_at", thirty_days_ago)
            .order("created_at", desc=True)
            .limit(200)
            .execute()
        )
        events = res.data or []
    except Exception:
        events = []

    # Category breakdown
    cat_map: dict[str, float] = {}
    for ev in events:
        cat = _categorize(ev.get("event_type", ""))
        cat_map[cat] = cat_map.get(cat, 0) + float(ev.get("score_delta", 0))

    # 30-day timeline (daily totals)
    timeline = _build_timeline(events, now)

    current_score = float(user.get("risk_score", 0) or 0)
    current_level = user.get("risk_level", "Low") or score_to_level(current_score)

    return {
        "score":         current_score,
        "level":         current_level,
        "events_30d":    len(events),
        "breakdown":     [{"category": k, "total_delta": round(v, 1)} for k, v in cat_map.items()],
        "timeline":      timeline,
        "recommendations": _recommendations(current_score, cat_map, events),
        "last_updated":  now.isoformat(),
    }


# ── Private helpers ───────────────────────────────────────────────────────────
def _apply_decay(score: float, updated_at_str: str | None) -> float:
    if not updated_at_str or score == 0:
        return score
    try:
        updated = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
        days = (datetime.now(timezone.utc) - updated).total_seconds() / 86400
        return max(0.0, score * ((1 - DECAY_PER_DAY) ** days))
    except Exception:
        return score


def _categorize(event_type: str) -> str:
    if "login" in event_type or "brute" in event_type:
        return "Authentication"
    if "phishing" in event_type:
        return "Phishing"
    if "ids" in event_type or "anomaly" in event_type:
        return "Network Anomaly"
    if "scan" in event_type or "ddos" in event_type:
        return "Network Attack"
    if "sql" in event_type or "injection" in event_type:
        return "Injection Attack"
    return "Other"


def _build_timeline(events: list[dict], now: datetime) -> list[dict]:
    from collections import defaultdict
    by_day: dict[str, float] = defaultdict(float)
    for ev in events:
        day = (ev.get("created_at") or "")[:10]
        if day:
            by_day[day] += float(ev.get("score_delta", 0))
    timeline = []
    for i in range(29, -1, -1):
        d = now - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        timeline.append({"date": key, "label": d.strftime("%b %d"), "delta": round(by_day.get(key, 0), 1)})
    return timeline


def _recommendations(score: float, categories: dict, events: list) -> list[dict]:
    recs = []

    if score == 0 and not events:
        recs.append({
            "icon": "✅", "title": "No threats detected",
            "description": "Your account has a clean security record. Keep up good security hygiene.",
            "priority": "low"
        })
        return recs

    if score >= 75:
        recs.append({
            "icon": "🚨", "title": "Immediate Action Required",
            "description": "Your risk score is Critical. Change your password immediately and review all recent alerts.",
            "priority": "critical"
        })

    if categories.get("Authentication", 0) > 10:
        recs.append({
            "icon": "🔐", "title": "Enable Two-Factor Authentication",
            "description": "Multiple login failures detected. Enable 2FA to prevent unauthorized access.",
            "priority": "high"
        })

    if categories.get("Phishing", 0) > 0:
        recs.append({
            "icon": "🎣", "title": "Avoid Scanning Untrusted URLs",
            "description": "You've scanned phishing URLs. Do not click links from unknown sources.",
            "priority": "medium"
        })

    if categories.get("Network Anomaly", 0) > 15:
        recs.append({
            "icon": "📡", "title": "Review API Access Patterns",
            "description": "Unusual API access patterns detected. Review connected applications and revoke unused access.",
            "priority": "high"
        })

    if categories.get("Network Attack", 0) > 0:
        recs.append({
            "icon": "🛡️", "title": "Check Firewall Rules",
            "description": "Port scan or DDoS patterns detected originating from or targeting your account.",
            "priority": "high"
        })

    if score < 25 and score > 0:
        recs.append({
            "icon": "👍", "title": "Low Risk — Stay Vigilant",
            "description": "Your risk score is low. Continue monitoring and reviewing security alerts.",
            "priority": "low"
        })

    return recs[:5]

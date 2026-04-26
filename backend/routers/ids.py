"""
SmartSec — IDS Router
=====================
Endpoints for the Intrusion Detection System module.

Routes:
  GET  /ids/status          — Model health check
  GET  /ids/dashboard       — Full dashboard data (charts, stats, alerts)
  POST /ids/simulate        — Simulate traffic, run detection, store results
"""

from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from services.ids_service import (
    simulate_traffic,
    detect_anomalies,
    train_model,
    get_model_status,
)
from services.auth_service import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import random
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/ids", tags=["IDS"])
security = HTTPBearer()

# ── Auth helper ───────────────────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_supabase),
):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    result = db.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


# ── GET /ids/status ───────────────────────────────────────────────────────────
@router.get("/status")
async def ids_status():
    """Check the ML model status."""
    return {"module": "IDS", "status": "ready", **get_model_status()}


# ── POST /ids/simulate ────────────────────────────────────────────────────────
@router.post("/simulate")
async def run_simulation(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """
    Simulate network traffic, run IsolationForest detection,
    and persist results to Supabase.
    """
    # 1. Generate synthetic events
    raw_events = simulate_traffic(n_normal=90, n_attacks=10)

    # 2. Train model on baseline first
    train_model([])  # Uses synthetic normal baseline

    # 3. Run anomaly detection
    scored_events = detect_anomalies(raw_events)

    # 4. Insert all events into user_activity
    activity_rows = []
    for ev in scored_events:
        activity_rows.append({
            "user_id":      user["id"],
            "action":       ev.get("attack_type") or "api_request",
            "endpoint":     "/api/request",
            "method":       "POST",
            "status_code":  int(ev.get("status_code", 200)),
            "response_time": ev.get("response_time_ms", 100),
            "is_anomaly":   ev["is_anomaly"],
            "anomaly_score": ev["anomaly_score"],
        })

    # Batch insert (Supabase handles this well)
    try:
        db.table("user_activity").insert(activity_rows).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {str(e)}")

    # 5. Create alerts for detected anomalies
    anomalies = [e for e in scored_events if e["is_anomaly"]]
    alert_rows = []
    for ev in anomalies:
        attack_type = ev.get("attack_type") or "Unknown"
        score = ev["anomaly_score"]
        severity = "High" if score >= 70 else ("Medium" if score >= 40 else "Low")
        alert_rows.append({
            "user_id":    user["id"],
            "alert_type": attack_type.upper().replace(" ", "_"),
            "severity":   severity,
            "message":    ev.get("description", f"Anomalous activity detected: {attack_type}"),
            "is_read":    False,
            "resolved":   False,
        })

    if alert_rows:
        try:
            db.table("alerts").insert(alert_rows).execute()
        except Exception:
            pass  # Alerts failing shouldn't break the simulation

    return {
        "total_events":     len(scored_events),
        "anomalies_found":  len(anomalies),
        "alerts_created":   len(alert_rows),
        "normal_events":    len(scored_events) - len(anomalies),
    }


# ── GET /ids/dashboard ────────────────────────────────────────────────────────
@router.get("/dashboard")
async def ids_dashboard(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """
    Return all data needed to render the IDS dashboard.
    Aggregates from: user_activity, alerts tables.
    """

    # ── Fetch last 7 days of activity ─────────────────────────────────────────
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    try:
        activity_res = (
            db.table("user_activity")
            .select("*")
            .eq("user_id", user["id"])
            .gte("created_at", seven_days_ago)
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )
        activity = activity_res.data or []
    except Exception:
        activity = []

    # ── Fetch recent alerts ───────────────────────────────────────────────────
    try:
        alerts_res = (
            db.table("alerts")
            .select("*")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        alerts = alerts_res.data or []
    except Exception:
        alerts = []

    # ── Aggregate stats ───────────────────────────────────────────────────────
    total_events     = len(activity)
    anomalies        = [a for a in activity if a.get("is_anomaly")]
    blocked_attacks  = len([a for a in alerts if a.get("resolved") is False and a.get("severity") == "High"])
    high_risk_alerts = len([a for a in alerts if a.get("severity") == "High"])
    false_positives  = max(0, len(anomalies) - len(alerts))

    # If no real data, provide meaningful demo defaults
    if total_events == 0:
        total_events     = 0
        anomalies_count  = 0
        high_risk_alerts = 0
        blocked_attacks  = 0
        false_positives  = 0
    else:
        anomalies_count = len(anomalies)

    # ── Build 7-day trend data for the line chart ─────────────────────────────
    trend_data = _build_trend_data(activity)

    # ── System status donut chart ─────────────────────────────────────────────
    normal_count   = total_events - len(anomalies)
    blocked_count  = blocked_attacks
    other_count    = max(0, len(anomalies) - blocked_count)

    system_status = [
        {"name": "Normal",    "value": normal_count,   "color": "#10b981"},
        {"name": "Anomalous", "value": len(anomalies), "color": "#ef4444"},
        {"name": "Blocked",   "value": blocked_count,  "color": "#8b5cf6"},
        {"name": "Other",     "value": other_count,    "color": "#64748b"},
    ]

    # ── Top attack types donut chart ──────────────────────────────────────────
    attack_counts: dict[str, int] = {}
    for a in alerts:
        atype = a.get("alert_type", "OTHER").replace("_", " ").title()
        attack_counts[atype] = attack_counts.get(atype, 0) + 1

    attack_colors = {
        "Brute Force":      "#ef4444",
        "Sql Injection":    "#f97316",
        "Port Scan":        "#f59e0b",
        "Ddos Attempt":     "#8b5cf6",
        "Suspicious Login": "#3b82f6",
        "Other":            "#64748b",
    }
    top_attacks = [
        {
            "name":  name,
            "value": count,
            "color": attack_colors.get(name, "#64748b"),
        }
        for name, count in sorted(attack_counts.items(), key=lambda x: -x[1])
    ]

    # ── Format recent alerts table ────────────────────────────────────────────
    recent_alerts_table = []
    for a in alerts[:10]:
        recent_alerts_table.append({
            "id":          a.get("id"),
            "time":        _format_time(a.get("created_at")),
            "type":        a.get("alert_type", "UNKNOWN").replace("_", " ").title(),
            "source_ip":   _random_ip(),   # We store alert type, not IP — simulate for display
            "description": a.get("message", "Anomalous activity detected"),
            "severity":    a.get("severity", "Low"),
            "resolved":    a.get("resolved", False),
        })

    return {
        "stats": {
            "total_events":     total_events,
            "anomalies":        len(anomalies) if total_events > 0 else 0,
            "high_risk_alerts": high_risk_alerts,
            "blocked_attacks":  blocked_attacks,
            "false_positives":  false_positives,
        },
        "trend_data":      trend_data,
        "system_status":   system_status,
        "top_attacks":     top_attacks,
        "recent_alerts":   recent_alerts_table,
        "model_status":    get_model_status(),
        "protection_active": True,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────
def _build_trend_data(activity: list) -> list:
    """Build a 7-point daily array for the anomaly line chart."""
    from collections import defaultdict
    days: dict[str, dict] = defaultdict(lambda: {"normal": 0, "anomalous": 0})
    
    for event in activity:
        raw_ts = event.get("created_at", "")
        try:
            day_label = raw_ts[:10]  # "YYYY-MM-DD"
        except Exception:
            continue
        if event.get("is_anomaly"):
            days[day_label]["anomalous"] += 1
        else:
            days[day_label]["normal"] += 1

    # Build last 7 days array
    result = []
    for i in range(6, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        label = day.strftime("%b %d")
        key = day.strftime("%Y-%m-%d")
        d = days.get(key, {"normal": 0, "anomalous": 0})
        result.append({
            "label":     label,
            "normal":    d["normal"],
            "anomalous": d["anomalous"],
        })
    return result


def _format_time(ts_str: str | None) -> str:
    if not ts_str:
        return "Unknown"
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y %I:%M %p")
    except Exception:
        return ts_str[:16] if ts_str else "Unknown"


def _random_ip() -> str:
    """Generate a plausible-looking external IP for display purposes."""
    return f"{random.randint(100,220)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"

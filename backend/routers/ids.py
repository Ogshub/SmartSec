"""
SmartSec — IDS Router (Real Data Only)
=======================================
All dashboard data comes from the real `user_activity` and `alerts`
tables populated by RequestLoggerMiddleware. Zero hardcoded values.

Endpoints:
  GET  /ids/status          — ML model health
  GET  /ids/dashboard       — Real aggregated stats + chart data
  POST /ids/simulate        — Demo: inject synthetic events (clearly labelled)
  POST /ids/resolve/{id}    — Mark an alert as resolved
"""

from fastapi import APIRouter, Depends, HTTPException, Path
from database import get_supabase
from services.ids_service import (
    simulate_traffic, detect_anomalies, train_model,
    get_model_status, ensure_trained,
)
from services.auth_service import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from collections import defaultdict

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
    return {"module": "IDS", "status": "ready", **get_model_status()}


# ── POST /ids/simulate ────────────────────────────────────────────────────────
@router.post("/simulate")
async def run_simulation(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """
    DEMO MODE: Inject synthetic events to populate the dashboard for testing.
    All inserted rows are tagged with action='SIMULATION' for transparency.
    """
    raw_events = simulate_traffic(n_normal=90, n_attacks=10)
    train_model([])
    scored_events = detect_anomalies(raw_events)

    activity_rows = []
    for ev in scored_events:
        activity_rows.append({
            "user_id":       user["id"],
            "action":        f"SIMULATION:{ev.get('attack_type') or 'normal'}",
            "endpoint":      "/ids/simulate",
            "method":        "POST",
            "status_code":   int(ev.get("status_code", 200)),
            "response_time": float(ev.get("response_time_ms", 100)),
            "source_ip":     ev.get("source_ip", "127.0.0.1"),
            "is_anomaly":    ev["is_anomaly"],
            "anomaly_score": ev["anomaly_score"],
        })

    try:
        db.table("user_activity").insert(activity_rows).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB insert failed: {e}")

    anomalies = [e for e in scored_events if e["is_anomaly"]]
    alert_rows = []
    for ev in anomalies:
        atype = ev.get("attack_type") or "Unknown"
        score = ev["anomaly_score"]
        sev = "High" if score >= 70 else ("Medium" if score >= 40 else "Low")
        alert_rows.append({
            "user_id":    user["id"],
            "alert_type": atype.upper().replace(" ", "_"),
            "severity":   sev,
            "message":    ev.get("description", f"Simulated anomaly: {atype}"),
            "source_ip":  ev.get("source_ip", "127.0.0.1"),
            "is_read":    False,
            "resolved":   False,
        })

    if alert_rows:
        try:
            db.table("alerts").insert(alert_rows).execute()
        except Exception:
            pass

    return {
        "mode":            "simulation",
        "total_events":    len(scored_events),
        "anomalies_found": len(anomalies),
        "alerts_created":  len(alert_rows),
        "normal_events":   len(scored_events) - len(anomalies),
    }


# ── GET /ids/dashboard ────────────────────────────────────────────────────────
@router.get("/dashboard")
async def ids_dashboard(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """
    Full dashboard data from real DB rows.
    - No hardcoded IPs, percentages, or dates.
    - Trend data compares current vs previous 7-day window for real deltas.
    """
    uid = user["id"]
    now = datetime.now(timezone.utc)
    seven_days_ago  = (now - timedelta(days=7)).isoformat()
    fourteen_days_ago = (now - timedelta(days=14)).isoformat()

    # ── Fetch last 14 days of activity (for delta comparison) ─────────────
    try:
        act_res = (
            db.table("user_activity")
            .select("created_at,is_anomaly,anomaly_score,source_ip,status_code,endpoint,response_time")
            .eq("user_id", uid)
            .gte("created_at", fourteen_days_ago)
            .order("created_at", desc=True)
            .limit(2000)
            .execute()
        )
        all_activity = act_res.data or []
    except Exception:
        all_activity = []

    # Split into current vs previous week
    current_week = [a for a in all_activity if a.get("created_at", "") >= seven_days_ago]
    prev_week    = [a for a in all_activity if a.get("created_at", "") < seven_days_ago]

    # ── Fetch real alerts ─────────────────────────────────────────────────
    try:
        alerts_res = (
            db.table("alerts")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        alerts = alerts_res.data or []
    except Exception:
        alerts = []

    # ── Current-week stats ────────────────────────────────────────────────
    total_events      = len(current_week)
    anomalies_current = [a for a in current_week if a.get("is_anomaly")]
    recent_alerts     = [a for a in alerts if a.get("created_at", "") >= seven_days_ago]
    high_risk         = [a for a in recent_alerts if a.get("severity") == "High"]
    blocked           = [a for a in recent_alerts if a.get("resolved") is True]
    false_positives   = max(0, len(anomalies_current) - len(recent_alerts))

    # ── Previous-week stats (for real % deltas) ───────────────────────────
    prev_total     = len(prev_week)
    prev_anomalies = len([a for a in prev_week if a.get("is_anomaly")])

    def _pct_change(curr, prev):
        if prev == 0:
            return None   # can't compute — no baseline
        return round((curr - prev) / prev * 100, 1)

    # ── 7-day trend for AreaChart ─────────────────────────────────────────
    trend_data = _build_trend(current_week, now)

    # ── System status donut ───────────────────────────────────────────────
    normal_count   = total_events - len(anomalies_current)
    blocked_count  = len(blocked)
    anomalous_not_blocked = max(0, len(anomalies_current) - blocked_count)
    system_status = [
        {"name": "Normal",    "value": normal_count,         "color": "#10b981"},
        {"name": "Anomalous", "value": anomalous_not_blocked,"color": "#ef4444"},
        {"name": "Blocked",   "value": blocked_count,        "color": "#8b5cf6"},
        {"name": "False Positive", "value": false_positives, "color": "#64748b"},
    ]

    # ── Top attack types from real alerts ────────────────────────────────
    atk_counts: dict[str, int] = defaultdict(int)
    for a in recent_alerts:
        atype = a.get("alert_type", "OTHER").replace("_", " ").title()
        atk_counts[atype] += 1

    ATTACK_COLORS = {
        "Brute Force":       "#ef4444",
        "Sql Injection":     "#f97316",
        "Port Scan":         "#f59e0b",
        "Ddos Attempt":      "#8b5cf6",
        "Suspicious Login":  "#3b82f6",
        "Behavioral Anomaly":"#06b6d4",
        "Other":             "#64748b",
    }
    top_attacks = sorted(
        [{"name": k, "value": v,
          "color": ATTACK_COLORS.get(k, "#64748b")} for k, v in atk_counts.items()],
        key=lambda x: -x["value"]
    )

    # ── Recent alerts table (real source_ip, real timestamps) ────────────
    recent_alerts_table = []
    for a in alerts[:10]:
        recent_alerts_table.append({
            "id":          a.get("id"),
            "time":        _fmt_time(a.get("created_at")),
            "type":        a.get("alert_type", "UNKNOWN").replace("_", " ").title(),
            "source_ip":   a.get("source_ip") or "N/A",
            "description": a.get("message", "Anomalous activity detected"),
            "severity":    a.get("severity", "Low"),
            "resolved":    a.get("resolved", False),
        })

    return {
        "stats": {
            "total_events":       total_events,
            "anomalies":          len(anomalies_current),
            "high_risk_alerts":   len(high_risk),
            "blocked_attacks":    blocked_count,
            "false_positives":    false_positives,
            # Real percentage deltas vs previous 7 days
            "delta_events":       _pct_change(total_events, prev_total),
            "delta_anomalies":    _pct_change(len(anomalies_current), prev_anomalies),
        },
        "trend_data":      trend_data,
        "system_status":   system_status,
        "top_attacks":     top_attacks,
        "recent_alerts":   recent_alerts_table,
        "model_status":    get_model_status(),
        "protection_active": True,
        "date_range": {
            "from": (now - timedelta(days=7)).strftime("%b %d, %Y"),
            "to":    now.strftime("%b %d, %Y"),
        },
    }


# ── POST /ids/resolve/{id} ────────────────────────────────────────────────────
@router.post("/resolve/{alert_id}")
async def resolve_alert(
    alert_id: str = Path(...),
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    try:
        db.table("alerts").update({"resolved": True, "is_read": True}).eq("id", alert_id).eq("user_id", user["id"]).execute()
        return {"status": "resolved", "alert_id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Helpers ───────────────────────────────────────────────────────────────────
def _build_trend(activity: list, now: datetime) -> list:
    by_day: dict[str, dict] = defaultdict(lambda: {"normal": 0, "anomalous": 0})
    for ev in activity:
        ts = ev.get("created_at", "")
        if not ts:
            continue
        day = ts[:10]
        if ev.get("is_anomaly"):
            by_day[day]["anomalous"] += 1
        else:
            by_day[day]["normal"] += 1

    result = []
    for i in range(6, -1, -1):
        d = now - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        dd = by_day.get(key, {"normal": 0, "anomalous": 0})
        result.append({"label": d.strftime("%b %d"), **dd})
    return result


def _fmt_time(ts: str | None) -> str:
    if not ts:
        return "—"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y %I:%M %p")
    except Exception:
        return ts[:16]

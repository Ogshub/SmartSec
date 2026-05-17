"""
SmartSec — Risk Router (Step 6)
================================
Endpoints:
  GET  /risk/score           — Current risk score + level + breakdown
  GET  /risk/history         — Full event audit trail (last 30 days)
  GET  /risk/recommendations — AI recommendations based on current score
  POST /risk/recalculate     — Force full recalculation from event history
"""

from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from services.auth_service import decode_access_token
from services.risk_service import (
    get_risk_breakdown, recalculate_from_history, score_to_level
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta

router   = APIRouter(prefix="/risk", tags=["Risk"])
security = HTTPBearer()


# ── Auth helper ───────────────────────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_supabase),
):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email  = payload.get("sub")
    result = db.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


# ── GET /risk/score ───────────────────────────────────────────────────────────
@router.get("/score")
async def risk_score(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Full risk score + breakdown + recommendations."""
    breakdown = get_risk_breakdown(db, user)
    return breakdown


# ── GET /risk/history ─────────────────────────────────────────────────────────
@router.get("/history")
async def risk_history(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    days: int = 30,
    limit: int = 50,
):
    """Paginated risk event audit trail."""
    days  = max(1, min(days, 90))
    limit = max(1, min(limit, 200))
    uid   = user["id"]
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    try:
        res = (
            db.table("risk_events")
            .select("*")
            .eq("user_id", uid)
            .gte("created_at", since)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        events = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "events":    events,
        "count":     len(events),
        "days":      days,
        "user_score": float(user.get("risk_score", 0) or 0),
        "user_level": user.get("risk_level", "Low") or "Low",
    }


# ── POST /risk/recalculate ────────────────────────────────────────────────────
@router.post("/recalculate")
async def recalculate(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Force full recalculation of risk score from the complete event history."""
    result = recalculate_from_history(db, user)
    return result


# ── GET /risk/leaderboard ─────────────────────────────────────────────────────
@router.get("/stats")
async def risk_stats(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Quick stats: score, level, event counts by severity."""
    uid = user["id"]
    now = datetime.now(timezone.utc)
    seven_days_ago = (now - timedelta(days=7)).isoformat()

    try:
        res = (
            db.table("risk_events")
            .select("severity,score_delta,created_at")
            .eq("user_id", uid)
            .gte("created_at", seven_days_ago)
            .execute()
        )
        events = res.data or []
    except Exception:
        events = []

    sev_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    total_delta = 0.0
    for ev in events:
        sev = ev.get("severity", "Low")
        sev_counts[sev] = sev_counts.get(sev, 0) + 1
        total_delta += float(ev.get("score_delta", 0))

    return {
        "current_score":  float(user.get("risk_score", 0) or 0),
        "current_level":  user.get("risk_level", "Low") or "Low",
        "events_7d":      len(events),
        "severity_counts": sev_counts,
        "total_delta_7d": round(total_delta, 1),
    }

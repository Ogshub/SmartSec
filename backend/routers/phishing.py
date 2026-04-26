"""
SmartSec — Phishing Router (Step 5)
=====================================
Real phishing URL analysis using heuristic ML scoring.

Endpoints:
  POST /phishing/scan          — Analyse a single URL
  GET  /phishing/history       — Past scans for current user
  GET  /phishing/stats         — Aggregate stats (safe/suspicious/phishing counts)
  DELETE /phishing/history     — Clear scan history
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, field_validator
from database import get_supabase
from services.phishing_service import analyse_url
from services.auth_service import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/phishing", tags=["Phishing"])
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


# ── Request model ─────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def url_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL cannot be empty")
        if len(v) > 2048:
            raise ValueError("URL too long (max 2048 chars)")
        return v


# ── POST /phishing/scan ───────────────────────────────────────────────────────
@router.post("/scan")
async def scan_url(
    body: ScanRequest,
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """
    Analyse the given URL for phishing indicators.
    Stores the result in url_scans for history and statistics.
    """
    try:
        result = analyse_url(body.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # Persist to Supabase
    row = {
        "user_id":    user["id"],
        "url":        body.url,
        "verdict":    result.verdict,
        "confidence": result.confidence,
        "risk_score": result.risk_score,
        "features":   result.features,
    }
    try:
        db.table("url_scans").insert(row).execute()
    except Exception:
        pass  # Don't fail the scan if DB insert fails

    # If phishing detected → create an alert
    if result.verdict == "Phishing":
        try:
            db.table("alerts").insert({
                "user_id":    user["id"],
                "alert_type": "PHISHING_DETECTED",
                "severity":   "High",
                "message":    f"Phishing URL detected: {body.url[:80]} (score {result.risk_score})",
                "source_ip":  None,
                "is_read":    False,
                "resolved":   False,
            }).execute()
        except Exception:
            pass
    elif result.verdict == "Suspicious":
        try:
            db.table("alerts").insert({
                "user_id":    user["id"],
                "alert_type": "SUSPICIOUS_URL",
                "severity":   "Medium",
                "message":    f"Suspicious URL scanned: {body.url[:80]} (score {result.risk_score})",
                "source_ip":  None,
                "is_read":    False,
                "resolved":   False,
            }).execute()
        except Exception:
            pass

    return {
        "url":          result.url,
        "verdict":      result.verdict,
        "risk_score":   result.risk_score,
        "confidence":   result.confidence,
        "flags":        result.flags,
        "features":     result.features,
        "virustotal":   result.virustotal,
    }


# ── GET /phishing/history ─────────────────────────────────────────────────────
@router.get("/history")
async def scan_history(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    limit: int = 20,
):
    """Return the user's last N URL scans in reverse chronological order."""
    try:
        res = (
            db.table("url_scans")
            .select("id,url,verdict,risk_score,confidence,features,created_at")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(max(1, min(limit, 100)))
            .execute()
        )
        return {"history": res.data or [], "count": len(res.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /phishing/stats ───────────────────────────────────────────────────────
@router.get("/stats")
async def phishing_stats(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Aggregate scan statistics for the current user."""
    try:
        res = db.table("url_scans").select("verdict,risk_score").eq("user_id", user["id"]).execute()
        rows = res.data or []
    except Exception:
        rows = []

    total     = len(rows)
    safe      = sum(1 for r in rows if r["verdict"] == "Safe")
    suspicious= sum(1 for r in rows if r["verdict"] == "Suspicious")
    phishing  = sum(1 for r in rows if r["verdict"] == "Phishing")
    avg_score = round(sum(r["risk_score"] for r in rows) / total, 1) if total else 0.0

    return {
        "total_scans":   total,
        "safe":          safe,
        "suspicious":    suspicious,
        "phishing":      phishing,
        "avg_risk_score": avg_score,
        "detection_rate": round(phishing / total * 100, 1) if total else 0.0,
    }


# ── DELETE /phishing/history ──────────────────────────────────────────────────
@router.delete("/history")
async def clear_history(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    try:
        db.table("url_scans").delete().eq("user_id", user["id"]).execute()
        return {"status": "cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

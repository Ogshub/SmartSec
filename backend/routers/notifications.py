"""
SmartSec — Notifications Router (Step 9)
==========================================
Endpoints:
  GET    /notifications          — Get user notifications (unread first)
  POST   /notifications/read/{id} — Mark single notification as read
  POST   /notifications/read-all  — Mark all as read
  GET    /notifications/count    — Unread count only (for badge)
  DELETE /notifications          — Clear all read notifications
"""

from fastapi import APIRouter, Depends, HTTPException, Path
from database import get_supabase
from services.auth_service import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router   = APIRouter(prefix="/notifications", tags=["Notifications"])
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
    result = db.table("users").select("id,email,username").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


# ── GET /notifications ────────────────────────────────────────────────────────
@router.get("")
async def get_notifications(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
    limit: int = 30,
):
    """Return up to `limit` notifications, unread first."""
    try:
        res = (
            db.table("notifications")
            .select("*")
            .eq("user_id", user["id"])
            .order("is_read", desc=False)
            .order("created_at", desc=True)
            .limit(max(1, min(limit, 100)))
            .execute()
        )
        notifications = res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    unread = sum(1 for n in notifications if not n.get("is_read"))
    return {"notifications": notifications, "total": len(notifications), "unread": unread}


# ── GET /notifications/count ──────────────────────────────────────────────────
@router.get("/count")
async def unread_count(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    """Return only the unread notification count (for sidebar badge)."""
    try:
        res = (
            db.table("notifications")
            .select("id")
            .eq("user_id", user["id"])
            .eq("is_read", False)
            .execute()
        )
        count = len(res.data or [])
    except Exception:
        count = 0
    return {"unread": count}


# ── POST /notifications/read/{id} ─────────────────────────────────────────────
@router.post("/read/{notification_id}")
async def mark_read(
    notification_id: str = Path(...),
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    try:
        db.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user["id"]).execute()
        return {"status": "read", "id": notification_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /notifications/read-all ─────────────────────────────────────────────
@router.post("/read-all")
async def mark_all_read(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    try:
        db.table("notifications").update({"is_read": True}).eq("user_id", user["id"]).eq("is_read", False).execute()
        return {"status": "all_read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DELETE /notifications ─────────────────────────────────────────────────────
@router.delete("")
async def clear_read_notifications(
    user=Depends(get_current_user),
    db=Depends(get_supabase),
):
    try:
        db.table("notifications").delete().eq("user_id", user["id"]).eq("is_read", True).execute()
        return {"status": "cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

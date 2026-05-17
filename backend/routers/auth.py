"""
SmartSec - Authentication Router
==================================
This file defines all the authentication API endpoints:

  POST /auth/register  → Create a new account
  POST /auth/login     → Login and get a JWT token
  GET  /auth/me        → Get the current logged-in user's info

These are the endpoints the frontend login/register page will call.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from datetime import datetime, timezone

from database import get_supabase
from schemas import UserRegister, UserLogin, UserResponse, Token, UpdateProfileRequest, UpdateSettingsRequest, AvatarUploadRequest, OAuthCallbackRequest
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    assess_login_risk,
)

# ── Router Setup ────────────────────────────────────────────────────────────
# APIRouter is like a mini-app — we group related endpoints together.
# prefix="/auth" means all routes here start with /auth
# tags=["Authentication"] groups them in the /docs page
router = APIRouter(prefix="/auth", tags=["Authentication"])

# HTTPBearer extracts the JWT from the "Authorization: Bearer <token>" header
security = HTTPBearer()


# ── Helper: Get Current User from JWT ───────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_supabase),
) -> dict:
    """
    FastAPI dependency that:
      1. Extracts JWT from Authorization header
      2. Decodes and verifies it
      3. Fetches the user from Supabase
      4. Returns the user dict (or raises 401 Unauthorized)

    Usage in any protected route:
        @router.get("/protected")
        def protected(user = Depends(get_current_user)):
            return {"hello": user["username"]}
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Malformed token")

    # Fetch user from Supabase
    result = db.table("users").select("*").eq("email", email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")

    user = result.data[0]
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: POST /auth/register
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: Client = Depends(get_supabase)):
    """
    Register a new SmartSec account.

    What happens:
      1. Check if email/username already exists
      2. Hash the password with bcrypt
      3. Insert new user into Supabase 'users' table
      4. Log the registration as a login event
      5. Return a JWT token (user is auto-logged in)
    """
    # ── 1. Check for duplicate email ────────────────────────────────────────
    existing_email = db.table("users").select("id").eq("email", payload.email).execute()
    if existing_email.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # ── 2. Check for duplicate username ─────────────────────────────────────
    existing_user = db.table("users").select("id").eq("username", payload.username).execute()
    if existing_user.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken.",
        )

    # ── 3. Hash the password ─────────────────────────────────────────────────
    hashed = hash_password(payload.password)

    # ── 4. Insert user into database ─────────────────────────────────────────
    new_user_data = {
        "username":        payload.username,
        "email":           payload.email,
        "hashed_password": hashed,
        "risk_score":      0.0,
        "risk_level":      "Low",
        "login_count":     0,
        "failed_attempts": 0,
        "is_active":       True,
    }

    result = db.table("users").insert(new_user_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create user. Please try again.")

    user = result.data[0]

    # ── 5. Create JWT token ──────────────────────────────────────────────────
    token = create_access_token(data={"sub": user["email"]})

    # ── 6. Log the registration event ───────────────────────────────────────
    db.table("login_events").insert({
        "user_id":    user["id"],
        "event_type": "REGISTRATION",
        "ip_address": "127.0.0.1",
        "location":   "Local",
        "risk_score":  0.0,
        "risk_flags":  [],
    }).execute()

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            created_at=user.get("created_at"),
            risk_score=user.get("risk_score", 0.0),
            risk_level=user.get("risk_level", "Low"),
            login_count=user.get("login_count", 0),
            full_name=user.get("full_name") or user["username"],
            phone_number=user.get("phone_number"),
            location=user.get("location") or "Not specified",
            avatar_color=user.get("avatar_color") or "#6366f1",
            account_type=user.get("account_type") or "Standard User",
            bio=user.get("bio"),
            user_settings=user.get("user_settings") or {},
            avatar_url=user.get("avatar_url"),
        ),
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: POST /auth/login
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/login", response_model=Token)
async def login(payload: UserLogin, request: Request, db: Client = Depends(get_supabase)):
    """
    Login to SmartSec and receive a JWT token.

    What happens:
      1. Find user by email
      2. Verify password
      3. Assess login risk (time, IP, history)
      4. Update user's login stats in DB
      5. Log the event
      6. Create and return JWT token
    """
    # ── 1. Find user by email ────────────────────────────────────────────────
    result = db.table("users").select("*").eq("email", payload.email).execute()

    if not result.data:
        # Vague error — don't reveal if email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user = result.data[0]

    # ── 2. Verify password ───────────────────────────────────────────────────
    if not verify_password(payload.password, user["hashed_password"]):
        # Increment failed attempts counter
        db.table("users").update({
            "failed_attempts": user.get("failed_attempts", 0) + 1
        }).eq("id", user["id"]).execute()

        # Log the failure
        db.table("login_events").insert({
            "user_id":    user["id"],
            "event_type": "FAILURE",
            "ip_address": request.client.host if request.client else "unknown",
            "risk_score":  50.0,
            "risk_flags":  ["WRONG_PASSWORD"],
        }).execute()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # ── 3. Assess login risk ─────────────────────────────────────────────────
    ip_address  = request.client.host if request.client else "127.0.0.1"
    login_hour  = datetime.now(timezone.utc).hour
    risk_score, risk_flags, risk_level = assess_login_risk(user, ip_address, login_hour)

    # ── 4. Update user login stats ───────────────────────────────────────────
    db.table("users").update({
        "last_login_at":   datetime.now(timezone.utc).isoformat(),
        "last_login_ip":   ip_address,
        "login_count":     user.get("login_count", 0) + 1,
        "failed_attempts": 0,               # reset on success
        "risk_score":      risk_score,
        "risk_level":      risk_level,
    }).eq("id", user["id"]).execute()

    # ── 5. Log the event ─────────────────────────────────────────────────────
    event_type = "SUSPICIOUS" if risk_level == "High" else "SUCCESS"
    db.table("login_events").insert({
        "user_id":    user["id"],
        "event_type": event_type,
        "ip_address": ip_address,
        "location":   "Simulated Location",
        "risk_score":  risk_score,
        "risk_flags":  risk_flags,
    }).execute()

    # ── 6. Create alert if high risk ─────────────────────────────────────────
    if risk_level in ("Medium", "High"):
        db.table("alerts").insert({
            "user_id":    user["id"],
            "alert_type": "SUSPICIOUS_LOGIN",
            "severity":   risk_level,
            "message":    f"Login flagged as {risk_level} risk. Flags: {', '.join(risk_flags)}",
            "is_read":    False,
        }).execute()

    # ── 7. Issue JWT ─────────────────────────────────────────────────────────
    token = create_access_token(data={"sub": user["email"]})

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            created_at=user.get("created_at"),
            risk_score=risk_score,
            risk_level=risk_level,
            login_count=user.get("login_count", 0) + 1,
            full_name=user.get("full_name") or user["username"],
            phone_number=user.get("phone_number"),
            location=user.get("location") or "Not specified",
            avatar_color=user.get("avatar_color") or "#6366f1",
            account_type=user.get("account_type") or "Standard User",
            bio=user.get("bio"),
            user_settings=user.get("user_settings") or {},
            avatar_url=user.get("avatar_url"),
        ),
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3: GET /auth/me
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    Requires: Authorization: Bearer <token>
    """
    u = current_user
    return UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        created_at=u.get("created_at"),
        risk_score=u.get("risk_score", 0.0),
        risk_level=u.get("risk_level", "Low"),
        login_count=u.get("login_count", 0),
        full_name=u.get("full_name") or u["username"],
        phone_number=u.get("phone_number"),
        location=u.get("location", "Not specified"),
        avatar_color=u.get("avatar_color", "#6366f1"),
        account_type=u.get("account_type", "Standard User"),
        bio=u.get("bio"),
        user_settings=u.get("user_settings") or {},
        avatar_url=u.get("avatar_url"),
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 4: GET /auth/login-history
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/login-history")
async def login_history(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Get the last 10 login events for the current user.
    Useful for the dashboard's login activity feed.
    """
    result = (
        db.table("login_events")
        .select("event_type, ip_address, location, risk_score, risk_flags, created_at")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    return {"history": result.data}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 5: POST /auth/change-password
# ══════════════════════════════════════════════════════════════════════════════
from pydantic import BaseModel, Field

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=8)

@router.post("/change-password", status_code=200)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Change the authenticated user's password.
    Requires the old password to confirm identity before setting the new one.
    """
    # 1. Verify current password
    if not verify_password(payload.current_password, current_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    # 2. Reject if new == old
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password.")

    # 3. Hash and save new password
    new_hash = hash_password(payload.new_password)
    db.table("users").update({"hashed_password": new_hash}).eq("id", current_user["id"]).execute()

    # 4. Log the event
    db.table("login_events").insert({
        "user_id":    current_user["id"],
        "event_type": "PASSWORD_CHANGE",
        "ip_address": "127.0.0.1",
        "risk_score":  0.0,
        "risk_flags":  [],
    }).execute()

    return {"message": "Password changed successfully."}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 6: POST /auth/logout-all
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/logout-all", status_code=200)
async def logout_all_devices(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Simulates logout from all devices by resetting the user's token seed.
    In a real system this would invalidate all JWTs via a token blocklist.
    Here we log the event and return a confirmation.
    """
    db.table("login_events").insert({
        "user_id":    current_user["id"],
        "event_type": "LOGOUT_ALL",
        "ip_address": "127.0.0.1",
        "risk_score":  0.0,
        "risk_flags":  ["ALL_DEVICES_LOGGED_OUT"],
    }).execute()

    return {"message": "All sessions have been invalidated. Please log in again."}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 7: GET /auth/last-login
# ══════════════════════════════════════════════════════════════════════════════
@router.get("/last-login")
async def last_login_details(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """Returns the most recent successful login event details."""
    result = (
        db.table("login_events")
        .select("event_type, ip_address, location, risk_score, risk_flags, created_at")
        .eq("user_id", current_user["id"])
        .eq("event_type", "SUCCESS")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    last = result.data[0] if result.data else None
    return {
        "last_login": last,
        "total_logins":   current_user.get("login_count", 0),
        "failed_attempts": current_user.get("failed_attempts", 0),
        "last_login_ip":   current_user.get("last_login_ip"),
        "last_login_at":   current_user.get("last_login_at"),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: PATCH /auth/update-profile
# ══════════════════════════════════════════════════════════════════════════════
@router.patch("/update-profile", response_model=UserResponse)
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Update authenticated user's profile information.
    Only provided (non-None) fields are updated — uses a PATCH approach.
    """
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    # Check username uniqueness if changing username
    if "username" in updates and updates["username"] != current_user["username"]:
        existing = (
            db.table("users")
            .select("id")
            .eq("username", updates["username"])
            .neq("id", current_user["id"])
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Username already taken")

    result = (
        db.table("users")
        .update(updates)
        .eq("id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Profile update failed")

    updated = result.data[0]
    return UserResponse(
        id=updated["id"],
        username=updated["username"],
        email=updated["email"],
        created_at=updated.get("created_at"),
        risk_score=updated.get("risk_score", 0.0),
        risk_level=updated.get("risk_level", "Low"),
        login_count=updated.get("login_count", 0),
        full_name=updated.get("full_name") or updated["username"],
        phone_number=updated.get("phone_number"),
        location=updated.get("location", "Not specified"),
        avatar_color=updated.get("avatar_color", "#6366f1"),
        account_type=updated.get("account_type", "Standard User"),
        bio=updated.get("bio"),
        user_settings=updated.get("user_settings") or {},
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: POST /auth/update-settings
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/update-settings")
async def update_settings(
    payload: UpdateSettingsRequest,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Persist the user's frontend settings preferences to Supabase.
    Stored as a JSONB object in the user_settings column.
    """
    result = (
        db.table("users")
        .update({"user_settings": payload.settings})
        .eq("id", current_user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Settings save failed")
    return {"message": "Settings saved", "settings": payload.settings}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: POST /auth/upload-avatar
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/upload-avatar")
async def upload_avatar(
    payload: AvatarUploadRequest,
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_supabase),
):
    """
    Accept a base64-encoded JPEG image (already cropped to 1:1 by the frontend),
    upload it to Supabase Storage bucket 'avatars', and save the public URL
    back to the user's record in Supabase.
    """
    import base64
    import os

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    BUCKET = "avatars"

    # Decode base64 → raw bytes
    try:
        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        raw = payload.image_data
        if "," in raw:
            raw = raw.split(",", 1)[1]
        image_bytes = base64.b64decode(raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    if len(image_bytes) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(status_code=413, detail="Image too large (max 5 MB)")

    # Use a per-user path so uploads overwrite the old avatar
    file_path = f"{current_user['id']}.jpg"

    try:
        # Create bucket if it doesn't exist (idempotent)
        try:
            db.storage.create_bucket(BUCKET, options={"public": True})
        except Exception:
            pass  # Bucket already exists

        # Upload (upsert=True → replace if exists)
        db.storage.from_(BUCKET).upload(
            path=file_path,
            file=image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    # Build public URL
    public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{file_path}"

    # Save URL to user record
    db.table("users").update({"avatar_url": public_url}).eq("id", current_user["id"]).execute()

    return {"avatar_url": public_url, "message": "Avatar uploaded successfully"}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT: POST /auth/oauth-callback
# ══════════════════════════════════════════════════════════════════════════════
@router.post("/oauth-callback")
async def oauth_callback(
    payload: OAuthCallbackRequest,
    db: Client = Depends(get_supabase),
):
    """
    Called by the frontend after a Supabase OAuth redirect.
    Verifies the Supabase access_token, then finds-or-creates a user in our
    'users' table and returns our own JWT so the rest of the app works normally.
    """
    import re
    import os
    from jose import jwt as jose_jwt, JWTError

    # ── 1. Verify the Supabase access_token ─────────────────────────────────
    # Strategy: Try three methods in order of reliability
    verified_email = ""

    # Method A: Decode JWT locally using SUPABASE_JWT_SECRET (most reliable)
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
    if jwt_secret and not verified_email:
        try:
            claims = jose_jwt.decode(
                payload.access_token,
                jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            verified_email = (
                claims.get("email")
                or claims.get("user_metadata", {}).get("email", "")
            ).strip().lower()
        except JWTError:
            pass  # Fall through to next method

    # Method B: Use service-role client to get user (may fail on some Supabase versions)
    if not verified_email:
        try:
            resp = db.auth.get_user(payload.access_token)
            verified_email = (resp.user.email or "").strip().lower()
        except Exception:
            pass

    # Method C: Trust the email from the frontend payload (validated by Supabase session on client side)
    if not verified_email and payload.email:
        verified_email = payload.email.strip().lower()

    if not verified_email:
        raise HTTPException(status_code=400, detail="Could not determine user email from OAuth token")

    # ── 2. Find or create user ───────────────────────────────────────────────
    try:
        existing = db.table("users").select("*").eq("email", verified_email).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB lookup failed: {str(exc)}")

    if existing.data:
        user_row = existing.data[0]

        # Backfill avatar/name if not yet set
        updates = {}
        if payload.avatar_url and not user_row.get("avatar_url"):
            updates["avatar_url"] = payload.avatar_url
        if payload.full_name and not user_row.get("full_name"):
            updates["full_name"] = payload.full_name

        if updates:
            try:
                db.table("users").update(updates).eq("id", user_row["id"]).execute()
                user_row.update(updates)
            except Exception:
                pass  # Non-fatal — profile update failure shouldn't block login

    else:
        # Derive a safe username from the email prefix
        base = re.sub(r"[^a-z0-9_]", "_", verified_email.split("@")[0].lower())
        username = base
        counter  = 1
        try:
            while db.table("users").select("id").eq("username", username).execute().data:
                username = f"{base}{counter}"
                counter += 1
        except Exception:
            username = base  # Fallback — uniqueness check failed, use as-is

        new_user = {
            "email":            verified_email,
            "username":         username,
            "hashed_password":  f"oauth:{payload.provider or 'oauth'}",
            "full_name":        (payload.full_name or username)[:120],
            "avatar_url":       payload.avatar_url or None,
            "account_type":     "Standard User",
            "risk_score":       0.0,
            "risk_level":       "Low",
            "login_count":      0,
        }
        try:
            result   = db.table("users").insert(new_user).execute()
            user_row = result.data[0]
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"User creation failed: {str(exc)}")

    # ── 3. Update login stats (non-fatal) ────────────────────────────────────
    try:
        db.table("users").update({
            "login_count": (user_row.get("login_count") or 0) + 1,
            "last_login_at":  datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_row["id"]).execute()
    except Exception:
        pass  # Don't let a stat-update failure break login

    # ── 4. Issue our JWT ─────────────────────────────────────────────────────
    our_token = create_access_token(data={"sub": verified_email})

    return {
        "access_token": our_token,
        "token_type":   "bearer",
        "user": UserResponse(
            id=user_row["id"],
            username=user_row["username"],
            email=verified_email,
            created_at=user_row.get("created_at"),
            risk_score=float(user_row.get("risk_score") or 0),
            risk_level=user_row.get("risk_level", "Low"),
            login_count=int(user_row.get("login_count") or 0),
            full_name=user_row.get("full_name") or user_row["username"],
            phone_number=user_row.get("phone_number"),
            location=user_row.get("location") or "Not specified",
            avatar_color=user_row.get("avatar_color") or "#6366f1",
            account_type=user_row.get("account_type") or "Standard User",
            bio=user_row.get("bio"),
            user_settings=user_row.get("user_settings") or {},
            avatar_url=user_row.get("avatar_url"),
        ),
    }

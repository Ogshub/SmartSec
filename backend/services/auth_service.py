"""
SmartSec - Authentication Service
===================================
This service handles all the security-sensitive operations:
  1. Password hashing  → Never store plain text passwords
  2. Password checking → Verify login attempts
  3. JWT creation      → Issue tokens after successful login
  4. JWT verification  → Protect private routes

Note: We use bcrypt directly (not via passlib) because passlib
has a compatibility bug with Python 3.13+ and bcrypt >= 4.x.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from dotenv import load_dotenv
import os

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-change-me")
ALGORITHM  = os.getenv("ALGORITHM", "HS256")
TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# ── Password Hashing ────────────────────────────────────────────────────────
# We use the bcrypt library directly.
# bcrypt is the industry standard for hashing passwords:
#   - Slow ON PURPOSE (brute-force attacks take years)
#   - Auto-salts (same password → different hash every time)
#   - One-way (you can never "unhash" a password)

def hash_password(plain_password: str) -> str:
    """
    Convert a plain text password into a bcrypt hash.
    Example:
        hash_password("MyPass123") → "$2b$12$eImiTXuWVxfM37uY4JANjOe5XE..."
    """
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain text password matches a stored hash.
    Returns True if match, False if not.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


# ── JWT Token Operations ────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT token that encodes user identity.
    
    How JWTs work:
      - Token = Header.Payload.Signature
      - Header: algorithm info
      - Payload: our data (email, expiry) — NOT encrypted, just signed
      - Signature: proves the token wasn't tampered with
    
    Args:
        data: dict to encode, typically {"sub": user_email}
        expires_delta: how long the token is valid
    
    Returns:
        A JWT string like "eyJhbGciOiJIUzI1NiIs..."
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    
    Returns the payload dict if valid, None if:
      - Token has expired
      - Token signature is invalid (tampered)
      - Token is malformed
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def assess_login_risk(
    user: dict,
    ip_address: str,
    login_hour: int,
) -> tuple[float, list[str], str]:
    """
    Assess the risk level of a login attempt.
    
    This is a simple rule-based risk scorer for now.
    In Step 4 (IDS), we'll replace/enhance this with ML.
    
    Returns:
        (risk_score, risk_flags, risk_level)
        risk_score: 0.0 to 100.0
        risk_flags: list of strings describing why it's risky
        risk_level: 'Low', 'Medium', or 'High'
    """
    score = 0.0
    flags = []

    # Flag 1: Login at unusual hours (midnight to 5am)
    if login_hour < 5 or login_hour >= 23:
        score += 25.0
        flags.append("UNUSUAL_HOUR")

    # Flag 2: Different IP from last known login
    last_ip = user.get("last_login_ip")
    if last_ip and last_ip != ip_address:
        score += 20.0
        flags.append("NEW_IP_ADDRESS")

    # Flag 3: Multiple recent failed attempts
    failed = user.get("failed_attempts", 0)
    if failed >= 3:
        score += 30.0
        flags.append("REPEATED_FAILURES")
    elif failed >= 1:
        score += 10.0
        flags.append("PREVIOUS_FAILURES")

    # Flag 4: First-ever login (brand new account)
    if user.get("login_count", 0) == 0:
        score += 5.0
        flags.append("FIRST_LOGIN")

    # Clamp to 100
    score = min(score, 100.0)

    # Determine level
    if score >= 60:
        level = "High"
    elif score >= 25:
        level = "Medium"
    else:
        level = "Low"

    return score, flags, level

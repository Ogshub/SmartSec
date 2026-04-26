"""
SmartSec - Pydantic Schemas
============================
Pydantic schemas define the SHAPE of data coming into and going out of our API.

Think of schemas as "contracts":
  - Request schemas: "This is exactly what the client must send us"
  - Response schemas: "This is exactly what we will send back"

Pydantic automatically:
  - Validates data types (e.g., is this actually an email?)
  - Rejects invalid input with clear error messages
  - Converts types where possible (e.g., "30" string → 30 int)
  - Generates JSON Schema for the auto-docs at /docs
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ============================================================
# 👤 USER SCHEMAS
# ============================================================

class UserRegister(BaseModel):
    """
    Schema for user registration request.
    The client sends this JSON body when calling POST /auth/register
    
    Example request body:
    {
        "username": "john_doe",
        "email": "john@example.com",
        "password": "MySecurePass123"
    }
    """
    username: str
    email: EmailStr          # Pydantic validates this is a proper email format
    password: str

    @field_validator("username")
    @classmethod
    def username_must_be_valid(cls, v: str) -> str:
        """Username must be 3-30 chars, alphanumeric + underscores only."""
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if len(v) > 30:
            raise ValueError("Username must be 30 characters or fewer")
        if not v.replace("_", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, and underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        """Basic password strength check."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserLogin(BaseModel):
    """
    Schema for login request.
    The client sends this JSON body when calling POST /auth/login
    
    Example:
    {
        "email": "john@example.com",
        "password": "MySecurePass123"
    }
    """
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """
    Schema for what we send BACK to the client about a user.
    Includes all profile fields stored in Supabase.
    """
    id: str
    username: str
    email: str
    created_at: Optional[datetime] = None
    risk_score: Optional[float] = 0.0
    risk_level: Optional[str] = "Low"
    login_count: Optional[int] = 0
    # Extended profile fields
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = "Not specified"
    avatar_color: Optional[str] = "#6366f1"
    account_type: Optional[str] = "Standard User"
    bio: Optional[str] = None
    user_settings: Optional[dict] = {}
    avatar_url: Optional[str] = None


# ============================================================
# 🔑 TOKEN SCHEMAS
# ============================================================

class Token(BaseModel):
    """
    Schema for the JWT token response after successful login.
    
    Example response from POST /auth/login:
    {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
        "token_type": "bearer"
    }
    
    The client stores this token and sends it with every future request
    in the Authorization header: "Bearer eyJhbGciOiJIUzI1NiIsInR..."
    """
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class TokenData(BaseModel):
    """
    Schema for the DATA inside a decoded JWT token.
    'sub' = subject = the user's email (standard JWT claim)
    """
    email: Optional[str] = None


class UpdateProfileRequest(BaseModel):
    """Schema for PATCH /auth/update-profile request."""
    full_name:    Optional[str] = None
    username:     Optional[str] = None
    phone_number: Optional[str] = None
    location:     Optional[str] = None
    avatar_color: Optional[str] = None
    bio:          Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    """Schema for POST /auth/update-settings — stores user preferences in Supabase."""
    settings: dict


class AvatarUploadRequest(BaseModel):
    """Schema for POST /auth/upload-avatar — base64 encoded JPEG image data."""
    image_data: str  # base64 encoded image (JPEG), without data URI prefix


class OAuthCallbackRequest(BaseModel):
    """Schema for POST /auth/oauth-callback — Supabase OAuth session → our JWT."""
    access_token: str   # Supabase session access_token
    email: str
    full_name: Optional[str] = ''
    avatar_url: Optional[str] = ''
    provider: Optional[str] = 'oauth'


# ============================================================
# 🚨 ALERT SCHEMAS
# ============================================================

class AlertResponse(BaseModel):
    """
    Schema for a security alert returned from the API.
    Alerts are created when anomalies or threats are detected.
    """
    id: str
    user_id: str
    alert_type: str          # e.g., "SUSPICIOUS_LOGIN", "ANOMALY_DETECTED", "PHISHING_URL"
    severity: str            # "Low", "Medium", "High"
    message: str
    created_at: Optional[datetime] = None
    is_read: Optional[bool] = False


# ============================================================
# 🔍 PHISHING SCAN SCHEMAS
# ============================================================

class URLScanRequest(BaseModel):
    """Schema for phishing URL scan request."""
    url: str

    @field_validator("url")
    @classmethod
    def url_must_not_be_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL cannot be empty")
        return v


class URLScanResponse(BaseModel):
    """Schema for phishing scan result."""
    url: str
    verdict: str             # "Safe", "Suspicious", "Phishing"
    confidence: float        # 0.0 to 1.0
    risk_score: float        # 0 to 100
    features: dict           # The extracted URL features
    scanned_at: Optional[datetime] = None


# ============================================================
# 📊 DASHBOARD SCHEMAS
# ============================================================

class DashboardStats(BaseModel):
    """Schema for the central dashboard summary data."""
    user_risk_score: float
    user_risk_level: str
    total_alerts: int
    recent_alerts: list[AlertResponse]
    total_scans: int
    recent_logins: list[dict]

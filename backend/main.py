"""
SmartSec - Main Application Entry Point
Full feature set: Auth + IDS + Phishing + Risk + Dashboard + Notifications
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os
import pathlib

from routers.auth          import router as auth_router
from routers.ids           import router as ids_router
from routers.phishing      import router as phishing_router
from routers.risk          import router as risk_router
from routers.dashboard     import router as dashboard_router
from routers.notifications import router as notifications_router
from middleware.request_logger import RequestLoggerMiddleware

load_dotenv()

app = FastAPI(
    title=os.getenv("APP_NAME", "SmartSec"),
    description="🛡️ AI-Based Cyber Defense Platform — Real-time threat detection, IDS, phishing analysis & risk scoring",
    version=os.getenv("APP_VERSION", "1.0.0"),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_env_origins = [o.strip() for o in os.getenv("FRONTEND_URL", "").split(",") if o.strip()]
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    # Production URLs — add your Vercel/Render URLs here
    "https://smartsec.vercel.app",
    "https://smart-sec-eight.vercel.app",
    "https://smartsec-ai.vercel.app",
    "https://smartsec-frontend.vercel.app",
    *_env_origins,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── IDS Request Logger ────────────────────────────────────────────────────────
app.add_middleware(RequestLoggerMiddleware)

# ── CORS on error responses ───────────────────────────────────────────────────
# FastAPI's CORSMiddleware doesn't always add headers to error responses.
# This ensures the browser can read the real error instead of a fake CORS block.
from fastapi import Request as _Request
from fastapi.responses import JSONResponse as _JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: _Request, exc: StarletteHTTPException):
    origin = request.headers.get("origin", "")
    headers = {"Access-Control-Allow-Credentials": "true"}
    if origin in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
    return _JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(ids_router)
app.include_router(phishing_router)
app.include_router(risk_router)
app.include_router(dashboard_router)
app.include_router(notifications_router)

# ── Demo UI ───────────────────────────────────────────────────────────────────
_DEMO_FILE = pathlib.Path(__file__).resolve().parent.parent / "demo_ui" / "index.html"

@app.get("/demo", include_in_schema=False)
async def demo_ui():
    return FileResponse(str(_DEMO_FILE))


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "🛡️ SmartSec Platform is running!",
        "status":  "online",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "docs":    "Visit /docs for the full API documentation",
        "modules": [
            "authentication", "intrusion_detection",
            "phishing_detector", "risk_engine",
            "dashboard", "notifications",
        ],
    }


@app.get("/health", tags=["Health"])
async def health_check():
    from services.ids_service import get_model_status
    vt_key  = bool(os.getenv("VIRUSTOTAL_API_KEY"))
    gsb_key = bool(os.getenv("GOOGLE_SAFE_BROWSING_API_KEY"))
    abu_key = bool(os.getenv("ABUSEIPDB_API_KEY"))
    ipi_key = bool(os.getenv("IPINFO_TOKEN"))
    res_key = bool(os.getenv("RESEND_API_KEY"))

    return {
        "status":  "healthy",
        "service": "SmartSec API v1.0",
        "modules": {
            "authentication":      "ready",
            "intrusion_detection": f"ready ({get_model_status()['model_type']})",
            "phishing_detector":   f"ready (19-signal + {'VT+GSB+AbuseIPDB' if vt_key else 'heuristic'})",
            "risk_engine":         "ready (weighted decay scoring)",
            "dashboard":           "ready (real aggregated data)",
            "notifications":       "ready",
            "request_logger":      "active",
        },
        "threat_intel": {
            "virustotal":       "active" if vt_key  else "not configured",
            "safe_browsing":    "active" if gsb_key else "not configured",
            "abuseipdb":        "active" if abu_key else "not configured",
            "ipinfo":           "active" if ipi_key else "not configured",
            "email_alerts":     "active" if res_key else "not configured",
        },
    }

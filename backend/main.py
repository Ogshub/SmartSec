"""
SmartSec - AI-Based Cyber Defense Platform
==========================================
Main application entry point.

Registered Routers:
  - /auth     → Authentication (register, login, OAuth, me, settings)
  - /ids      → Intrusion Detection System (IsolationForest ML)
  - /phishing → Phishing URL Detector (16-signal heuristic scoring)

Middleware:
  - CORSMiddleware       → Allow React frontend dev servers
  - RequestLoggerMiddleware → Log every authenticated request for real IDS data
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os
import pathlib

from routers.auth     import router as auth_router
from routers.ids      import router as ids_router
from routers.phishing import router as phishing_router
from middleware.request_logger import RequestLoggerMiddleware

load_dotenv()

app = FastAPI(
    title=os.getenv("APP_NAME", "SmartSec"),
    description="🛡️ AI-Based Cyber Defense Platform — Real-time threat detection, IDS & phishing analysis",
    version=os.getenv("APP_VERSION", "1.0.0"),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── IDS Request Logger (AFTER CORS so headers are available) ─────────────────
# This middleware intercepts every authenticated request, measures real
# response times, scores with IsolationForest, and persists to Supabase.
app.add_middleware(RequestLoggerMiddleware)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(ids_router)
app.include_router(phishing_router)

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
    }


@app.get("/health", tags=["Health"])
async def health_check():
    from services.ids_service import get_model_status
    return {
        "status":  "healthy",
        "service": "SmartSec API",
        "modules": {
            "authentication":     "ready",
            "intrusion_detection": f"ready ({get_model_status()['model_type']})",
            "phishing_detector":  "ready (16-signal heuristic)",
            "request_logger":     "active",
        },
    }

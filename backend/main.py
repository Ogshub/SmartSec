"""
SmartSec - AI-Based Cyber Defense Platform
==========================================
Main application entry point.

This file creates the FastAPI application and registers all routes.
Think of it like the front door of our system.

Registered Routers:
  - /auth  → Authentication (register, login, me)
  - /ids   → Intrusion Detection System (IDS)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import os
import pathlib

# Import routers
from routers.auth import router as auth_router
from routers.ids  import router as ids_router

# Load environment variables from our .env file
load_dotenv()

# --- Create the FastAPI Application ---
# This is like opening our restaurant for business.
# title, description, version show up in the auto-generated API docs.
app = FastAPI(
    title=os.getenv("APP_NAME", "SmartSec"),
    description="🛡️ AI-Based Cyber Defense Platform - Real-time threat detection and risk scoring",
    version=os.getenv("APP_VERSION", "1.0.0"),
    docs_url="/docs",      # Swagger UI will be at http://localhost:8000/docs
    redoc_url="/redoc",    # Alternative docs at http://localhost:8000/redoc
)

# --- CORS Middleware ---
# CORS = Cross-Origin Resource Sharing.
# This allows our React frontend (running on port 3000) to talk to
# our FastAPI backend (running on port 8000).
# Without this, the browser would BLOCK the communication for security reasons.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],  # Vite dev server (auto-increments port if busy)
    allow_credentials=True,
    allow_methods=["*"],   # Allow GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],   # Allow all HTTP headers
)


# --- Register Routers ---
# Each router handles a group of related endpoints.
app.include_router(auth_router)
app.include_router(ids_router)

# --- Serve Demo UI ---
# Serves the demo HTML file at http://localhost:8000/demo
_DEMO_FILE = pathlib.Path(__file__).resolve().parent.parent / "demo_ui" / "index.html"

@app.get("/demo", include_in_schema=False)
async def demo_ui():
    return FileResponse(str(_DEMO_FILE))


# --- Root Endpoint ---
# This is our "health check" - a simple test to confirm the server is running.
# Visit http://localhost:8000/ to see this response.
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "🛡️ SmartSec Platform is running!",
        "status": "online",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "docs": "Visit /docs for the full API documentation"
    }


# --- Health Check Endpoint ---
# A dedicated endpoint that monitoring tools can ping to verify the server is alive.
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "SmartSec API",
        "modules": {
            "authentication": "ready",
            "intrusion_detection": "ready (IsolationForest ML)",
            "phishing_detector": "ready",
            "risk_scoring": "ready",
        }
    }

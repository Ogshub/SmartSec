"""
SmartSec — Request Logger Middleware (Real IDS Data Source)
============================================================
Intercepts EVERY authenticated API request, extracts real security
features, scores them with IsolationForest, and persists to Supabase.

No synthetic data — these are actual requests hitting the API.

Pipeline per request:
  1. Decode JWT from Authorization header (pure computation, non-blocking)
  2. Measure real response_time_ms with perf_counter
  3. Count rpm + failed_attempts via in-memory sliding windows
  4. Score with IsolationForest
  5. Fire-and-forget DB insert on a daemon thread
"""

import time
import threading
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# ── Paths to skip ────────────────────────────────────────────────────────────
_SKIP_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json", "/demo"}
_SKIP_PREFIXES = ("/docs", "/redoc", "/static", "/openapi")

# ── In-memory sliding window trackers (thread-safe) ──────────────────────────
_lock = threading.Lock()
_ip_request_window: dict[str, deque] = defaultdict(deque)  # last 60 s
_ip_failure_window: dict[str, deque] = defaultdict(deque)  # last 3600 s


def _get_client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _sliding_counts(ip: str, is_failure: bool) -> tuple[float, int]:
    """Return (requests_per_min, failed_attempts_last_hour) and update windows."""
    now = time.time()
    with _lock:
        rq = _ip_request_window[ip]
        while rq and now - rq[0] > 60:
            rq.popleft()
        rq.append(now)
        rpm = float(len(rq))

        fq = _ip_failure_window[ip]
        while fq and now - fq[0] > 3600:
            fq.popleft()
        if is_failure:
            fq.append(now)
        failed = len(fq)
    return rpm, failed


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if path in _SKIP_PATHS or any(path.startswith(p) for p in _SKIP_PREFIXES):
            return await call_next(request)

        # ── Decode JWT (non-blocking pure computation) ────────────────────
        auth_header = request.headers.get("authorization", "")
        user_email: str | None = None
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:]
            try:
                from services.auth_service import decode_access_token
                payload = decode_access_token(token)
                if payload:
                    user_email = payload.get("sub")
            except Exception:
                pass

        # Skip unauthenticated requests
        if not user_email:
            return await call_next(request)

        # ── Measure real response time ────────────────────────────────────
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        source_ip = _get_client_ip(request)
        status_code = response.status_code
        is_failure = status_code >= 400
        rpm, failed = _sliding_counts(source_ip, is_failure)
        hour = datetime.now(timezone.utc).hour

        # ── Fire-and-forget persist ───────────────────────────────────────
        threading.Thread(
            target=_persist,
            args=(user_email, request.method, path, status_code,
                  elapsed_ms, source_ip, rpm, float(failed), float(hour)),
            daemon=True,
        ).start()

        return response


def _persist(email, method, path, status_code, elapsed_ms,
             source_ip, rpm, failed, hour):
    try:
        from database import get_supabase_direct
        from services.ids_service import detect_anomalies, ensure_trained

        db = get_supabase_direct()

        # Resolve user_id from email
        u = db.table("users").select("id").eq("email", email).limit(1).execute()
        if not u.data:
            return
        user_id = u.data[0]["id"]

        event = {
            "response_time_ms": round(elapsed_ms, 2),
            "status_code":      float(status_code),
            "requests_per_min": rpm,
            "hour_of_day":      hour,
            "failed_attempts":  failed,
        }

        ensure_trained()
        scored = detect_anomalies([event])[0]
        is_anomaly = scored["is_anomaly"]
        anomaly_score = scored["anomaly_score"]

        db.table("user_activity").insert({
            "user_id":       user_id,
            "action":        f"{method} {path}",
            "endpoint":      path,
            "method":        method,
            "status_code":   status_code,
            "response_time": round(elapsed_ms, 2),
            "source_ip":     source_ip,
            "is_anomaly":    is_anomaly,
            "anomaly_score": anomaly_score,
        }).execute()

        if is_anomaly:
            score = anomaly_score
            sev = "High" if score >= 70 else ("Medium" if score >= 40 else "Low")
            parts = [f"Anomalous request to {path} (score {score:.1f})"]
            if rpm > 30:
                parts.append(f"rate {rpm:.0f} req/min")
            if failed > 3:
                parts.append(f"{int(failed)} recent failures from {source_ip}")
            if status_code >= 400:
                parts.append(f"HTTP {status_code}")
            db.table("alerts").insert({
                "user_id":    user_id,
                "alert_type": "BEHAVIORAL_ANOMALY",
                "severity":   sev,
                "message":    ". ".join(parts) + ".",
                "source_ip":  source_ip,
                "is_read":    False,
                "resolved":   False,
            }).execute()
    except Exception as exc:
        import sys
        print(f"[IDS Middleware] {exc}", file=sys.stderr)

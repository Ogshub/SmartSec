"""
SmartSec — IDS Service (IsolationForest)
=========================================
Real ML anomaly detection. No synthetic scoring for display —
only the training baseline is synthetic (to bootstrap the model
before enough real traffic exists).
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime, timezone
import random

# ── Singleton model state ─────────────────────────────────────────────────────
_model: IsolationForest | None = None
_is_trained: bool = False


def is_model_trained() -> bool:
    return _is_trained


def ensure_trained() -> None:
    """Ensure the model is trained; call train_model with empty list to use baseline."""
    if not _is_trained:
        train_model([])


# ── Feature Extraction ────────────────────────────────────────────────────────
def extract_features(events: list[dict]) -> np.ndarray:
    """
    5-feature vector per event:
      [0] response_time_ms  — real measured latency
      [1] status_code       — real HTTP status
      [2] requests_per_min  — real sliding-window count
      [3] hour_of_day       — real UTC hour
      [4] failed_attempts   — real failure count from sliding window
    """
    rows = []
    for e in events:
        rows.append([
            float(e.get("response_time_ms", 100)),
            float(e.get("status_code", 200)),
            float(e.get("requests_per_min", 1)),
            float(e.get("hour_of_day", 12)),
            float(e.get("failed_attempts", 0)),
        ])
    return np.array(rows, dtype=float)


# ── Model Training ────────────────────────────────────────────────────────────
def train_model(real_normal_events: list[dict]) -> None:
    """
    Train IsolationForest.
    If fewer than 10 real events are provided, augment with a
    synthetic normal-traffic baseline so the model is immediately useful.
    """
    global _model, _is_trained

    events = list(real_normal_events)
    if len(events) < 10:
        events = _generate_normal_baseline(200)

    X = extract_features(events)
    _model = IsolationForest(
        n_estimators=150,
        contamination=0.05,
        random_state=42,
        max_features=5,
        max_samples="auto",
    )
    _model.fit(X)
    _is_trained = True


def _generate_normal_baseline(n: int = 200) -> list[dict]:
    """
    Synthetic baseline representing healthy API usage.
    Used ONLY to bootstrap the model before real traffic accumulates.
    """
    events = []
    for _ in range(n):
        events.append({
            "response_time_ms": max(5, random.gauss(120, 40)),
            "status_code":      random.choices([200, 201, 204, 301], weights=[70, 10, 10, 10])[0],
            "requests_per_min": max(0.1, random.gauss(5, 2)),
            "hour_of_day":      random.randint(8, 20),
            "failed_attempts":  random.randint(0, 1),
        })
    return events


# ── Anomaly Detection ─────────────────────────────────────────────────────────
def detect_anomalies(events: list[dict]) -> list[dict]:
    """
    Score events. Returns each event dict with added keys:
      is_anomaly: bool
      anomaly_score: float 0–100 (higher = more suspicious)
    """
    global _model, _is_trained
    if not _is_trained or _model is None:
        train_model([])

    X = extract_features(events)
    raw = _model.score_samples(X)   # more negative = more anomalous
    preds = _model.predict(X)       # -1 = anomaly, +1 = normal

    lo, hi = raw.min(), raw.max()
    span = hi - lo if hi != lo else 1.0

    results = []
    for i, ev in enumerate(events):
        normalized = round(float((1 - (raw[i] - lo) / span) * 100), 2)
        results.append({**ev,
                        "is_anomaly":    bool(preds[i] == -1),
                        "anomaly_score": normalized})
    return results


# ── Simulation (DEMO MODE ONLY) ───────────────────────────────────────────────
def simulate_traffic(n_normal: int = 90, n_attacks: int = 10) -> list[dict]:
    """
    Generate synthetic attack mix for demo purposes.
    This data is clearly labelled — it is NOT used for real dashboard stats.
    Real stats come exclusively from the RequestLoggerMiddleware.
    """
    now = datetime.now(timezone.utc)
    events = []

    # Normal traffic
    for _ in range(n_normal):
        events.append({
            "response_time_ms": max(10, random.gauss(130, 50)),
            "status_code":      random.choices([200, 201, 204, 301], weights=[70, 10, 10, 10])[0],
            "requests_per_min": max(0, random.gauss(4, 1.5)),
            "hour_of_day":      float(random.randint(8, 20)),
            "failed_attempts":  float(random.randint(0, 1)),
            "attack_type":      None,
            "source_ip":        f"192.168.{random.randint(1,10)}.{random.randint(1,254)}",
            "description":      "Normal API request",
            "simulated":        True,
        })

    # Attack templates
    templates = [
        {"attack_type": "Brute Force",      "status_code": 401, "response_time_ms": random.uniform(10, 50),   "requests_per_min": random.uniform(80, 200),  "hour_of_day": float(random.randint(0, 5)), "failed_attempts": float(random.randint(10, 50)), "description": "Multiple failed login attempts"},
        {"attack_type": "SQL Injection",     "status_code": 500, "response_time_ms": random.uniform(500, 2000),"requests_per_min": random.uniform(20, 60),   "hour_of_day": float(random.randint(1, 6)), "failed_attempts": float(random.randint(2, 8)),  "description": "SQL injection attempt detected"},
        {"attack_type": "Port Scan",         "status_code": 404, "response_time_ms": random.uniform(5, 30),    "requests_per_min": random.uniform(100, 300), "hour_of_day": float(random.randint(0, 4)), "failed_attempts": 0.0,                          "description": "Port scanning activity detected"},
        {"attack_type": "DDoS Attempt",      "status_code": 503, "response_time_ms": random.uniform(1, 10),    "requests_per_min": random.uniform(500, 1000),"hour_of_day": float(random.randint(2, 8)), "failed_attempts": float(random.randint(0, 3)),  "description": "DDoS attack pattern detected"},
        {"attack_type": "Suspicious Login",  "status_code": 200, "response_time_ms": max(50, random.gauss(150, 40)), "requests_per_min": random.uniform(1, 5), "hour_of_day": float(random.randint(0, 6)), "failed_attempts": float(random.randint(3, 10)), "description": "Login from unusual location at off-hours"},
    ]

    for _ in range(n_attacks):
        t = random.choice(templates).copy()
        t["source_ip"] = f"{random.randint(100,220)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
        t["simulated"] = True
        events.append(t)

    random.shuffle(events)
    return events


def get_model_status() -> dict:
    return {
        "trained":       _is_trained,
        "model_type":    "IsolationForest",
        "n_estimators":  150,
        "contamination": 0.05,
        "features":      ["response_time_ms", "status_code", "requests_per_min", "hour_of_day", "failed_attempts"],
    }

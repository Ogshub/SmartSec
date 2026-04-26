"""
SmartSec — IDS (Intrusion Detection System) Service
=====================================================
Uses scikit-learn's IsolationForest to detect anomalous
user/network activity patterns.

How IsolationForest works:
  - Trains on "normal" data by building random decision trees
  - Anomalies are isolated in fewer splits → lower anomaly score
  - Returns -1 for anomalies, +1 for normal observations
"""

import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime, timezone
import random


# ── Singleton model state ────────────────────────────────────────────────────
_model: IsolationForest | None = None
_is_trained: bool = False

# Attack type labels for simulation
ATTACK_TYPES = [
    "Brute Force",
    "SQL Injection",
    "Port Scan",
    "DDoS Attempt",
    "Suspicious Login",
]

# ── Feature Extraction ────────────────────────────────────────────────────────
def extract_features(events: list[dict]) -> np.ndarray:
    """
    Convert raw event dicts into a numeric feature matrix.

    Features per event:
      [0] response_time_ms  — How long the request took (ms)
      [1] status_code       — HTTP status (200, 401, 500…)
      [2] requests_per_min  — Burst rate at time of event
      [3] hour_of_day       — 0-23, unusual hours score higher
      [4] failed_attempts   — Consecutive failures from same IP
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
    return np.array(rows)


# ── Model Training ────────────────────────────────────────────────────────────
def train_model(normal_events: list[dict]) -> None:
    """
    Train the IsolationForest on a set of 'normal' events.
    Called once at startup or when new baseline data is available.
    """
    global _model, _is_trained

    if len(normal_events) < 10:
        # Not enough data — use synthetic baseline
        normal_events = _generate_normal_baseline(200)

    X = extract_features(normal_events)
    _model = IsolationForest(
        n_estimators=100,
        contamination=0.05,   # Expect ~5% anomalies in production
        random_state=42,
        max_features=5,
    )
    _model.fit(X)
    _is_trained = True


def _generate_normal_baseline(n: int = 200) -> list[dict]:
    """Generate synthetic normal traffic for initial training."""
    events = []
    for _ in range(n):
        events.append({
            "response_time_ms": random.gauss(120, 40),   # ~120ms avg
            "status_code":      random.choices([200, 201, 204, 301], weights=[70, 10, 10, 10])[0],
            "requests_per_min": random.gauss(5, 2),       # ~5 req/min
            "hour_of_day":      random.randint(8, 20),    # Business hours
            "failed_attempts":  random.randint(0, 1),
        })
    return events


# ── Anomaly Detection ─────────────────────────────────────────────────────────
def detect_anomalies(events: list[dict]) -> list[dict]:
    """
    Score a list of events and tag each one as normal or anomalous.

    Returns the same events with extra fields added:
      - is_anomaly: bool
      - anomaly_score: float 0-100 (higher = more anomalous)
    """
    global _model, _is_trained

    if not _is_trained or _model is None:
        train_model([])  # Auto-train on baseline if not ready

    X = extract_features(events)
    raw_scores = _model.score_samples(X)   # More negative = more anomalous
    predictions = _model.predict(X)         # -1 = anomaly, 1 = normal

    # Normalize to 0-100 where 100 = most anomalous
    min_s, max_s = raw_scores.min(), raw_scores.max()
    range_s = max_s - min_s if max_s != min_s else 1.0

    results = []
    for i, event in enumerate(events):
        normalized = (1 - (raw_scores[i] - min_s) / range_s) * 100
        results.append({
            **event,
            "is_anomaly":    bool(predictions[i] == -1),
            "anomaly_score": round(float(normalized), 2),
        })
    return results


# ── Traffic Simulation ────────────────────────────────────────────────────────
def simulate_traffic(n_normal: int = 90, n_attacks: int = 10) -> list[dict]:
    """
    Generate a synthetic mix of normal and attack events for demo purposes.
    Each event mimics a real API call with relevant features.
    """
    events = []
    now = datetime.now(timezone.utc)

    # Normal traffic
    for _ in range(n_normal):
        events.append({
            "response_time_ms": max(10, random.gauss(130, 50)),
            "status_code":      random.choices([200, 201, 204, 301], weights=[70, 10, 10, 10])[0],
            "requests_per_min": max(0, random.gauss(4, 1.5)),
            "hour_of_day":      random.randint(8, 20),
            "failed_attempts":  random.randint(0, 1),
            "attack_type":      None,
            "source_ip":        f"192.168.{random.randint(1,10)}.{random.randint(1,254)}",
            "timestamp":        now.isoformat(),
            "description":      "Normal API request",
        })

    # Attack traffic — extreme values that the model will flag
    attack_templates = [
        {
            "attack_type":      "Brute Force",
            "response_time_ms": random.uniform(10, 50),    # Fast repeated hits
            "status_code":      401,
            "requests_per_min": random.uniform(80, 200),   # Very high rate
            "hour_of_day":      random.randint(0, 5),      # Night-time
            "failed_attempts":  random.randint(10, 50),
            "description":      "Multiple failed login attempts",
        },
        {
            "attack_type":      "SQL Injection",
            "response_time_ms": random.uniform(500, 2000),  # Slow DB queries
            "status_code":      500,
            "requests_per_min": random.uniform(20, 60),
            "hour_of_day":      random.randint(1, 6),
            "failed_attempts":  random.randint(2, 8),
            "description":      "SQL injection attempt detected",
        },
        {
            "attack_type":      "Port Scan",
            "response_time_ms": random.uniform(5, 30),
            "status_code":      404,
            "requests_per_min": random.uniform(100, 300),
            "hour_of_day":      random.randint(0, 4),
            "failed_attempts":  0,
            "description":      "Port scanning activity detected",
        },
        {
            "attack_type":      "DDoS Attempt",
            "response_time_ms": random.uniform(1, 10),
            "status_code":      503,
            "requests_per_min": random.uniform(500, 1000),
            "hour_of_day":      random.randint(2, 8),
            "failed_attempts":  random.randint(0, 3),
            "description":      "DDoS attack pattern detected",
        },
        {
            "attack_type":      "Suspicious Login",
            "response_time_ms": random.gauss(150, 40),
            "status_code":      200,
            "requests_per_min": random.uniform(1, 5),
            "hour_of_day":      random.randint(0, 6),
            "failed_attempts":  random.randint(3, 10),
            "description":      "Unusual login from new location",
        },
    ]

    for _ in range(n_attacks):
        tmpl = random.choice(attack_templates).copy()
        tmpl["source_ip"] = f"{random.randint(100,220)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
        tmpl["timestamp"] = now.isoformat()
        events.append(tmpl)

    random.shuffle(events)
    return events


def get_model_status() -> dict:
    return {
        "trained":       _is_trained,
        "model_type":    "IsolationForest",
        "n_estimators":  100,
        "contamination": 0.05,
        "features":      ["response_time_ms", "status_code", "requests_per_min", "hour_of_day", "failed_attempts"],
    }

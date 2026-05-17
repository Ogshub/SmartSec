"""
SmartSec — Email Alert Service (Resend)
=======================================
Sends HTML email alerts when critical security events occur.
Uses the Resend API (free: 3,000 emails/month).

Usage:
    from services.email_service import send_alert_email
    send_alert_email(
        to="user@example.com",
        subject="Critical Alert: Brute Force Detected",
        event_type="Brute Force",
        severity="Critical",
        description="Multiple failed logins from 185.220.101.5 (Tor exit node)",
        ip="185.220.101.5",
        risk_score=87.5,
    )
"""

import os
import requests

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("ALERT_EMAIL_FROM", "alerts@smartsec.dev")


def send_alert_email(
    to: str,
    subject: str,
    event_type: str,
    severity: str,
    description: str,
    ip: str | None = None,
    risk_score: float | None = None,
) -> bool:
    """Send a styled HTML security alert email. Returns True on success."""
    if not RESEND_API_KEY or not to:
        return False

    severity_color = {
        "Critical": "#dc2626",
        "High":     "#ea580c",
        "Medium":   "#d97706",
        "Low":      "#16a34a",
    }.get(severity, "#6366f1")

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f0f23; color: #e2e8f0; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background: #1a1a2e;
                 border-radius: 16px; overflow: hidden;
                 border: 1px solid rgba(99,102,241,0.3); }}
    .header {{ background: linear-gradient(135deg, #1e1e3f 0%, #0f0f23 100%);
               padding: 32px; text-align: center;
               border-bottom: 1px solid rgba(99,102,241,0.2); }}
    .logo {{ font-size: 28px; font-weight: 800; color: #6366f1;
             letter-spacing: -0.5px; }}
    .badge {{ display: inline-block; padding: 6px 16px; border-radius: 999px;
              font-size: 12px; font-weight: 700; letter-spacing: 1px;
              background: {severity_color}22; color: {severity_color};
              border: 1px solid {severity_color}44; margin-top: 8px; }}
    .body {{ padding: 32px; }}
    .alert-title {{ font-size: 22px; font-weight: 700; color: #f1f5f9;
                   margin-bottom: 12px; }}
    .description {{ color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }}
    .stats {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
             margin-bottom: 24px; }}
    .stat {{ background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
             border-radius: 10px; padding: 16px; }}
    .stat-label {{ font-size: 11px; font-weight: 600; color: #64748b;
                  text-transform: uppercase; letter-spacing: 0.5px; }}
    .stat-value {{ font-size: 18px; font-weight: 700; color: #f1f5f9;
                  margin-top: 4px; }}
    .cta {{ display: block; text-align: center; background: #6366f1;
            color: white; padding: 14px 32px; border-radius: 10px;
            text-decoration: none; font-weight: 600; margin-top: 24px; }}
    .footer {{ padding: 20px 32px; text-align: center; color: #475569;
              font-size: 12px; border-top: 1px solid rgba(99,102,241,0.1); }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🛡️ SmartSec</div>
      <div class="badge">{severity.upper()} SEVERITY</div>
    </div>
    <div class="body">
      <div class="alert-title">{event_type} Detected</div>
      <div class="description">{description}</div>
      <div class="stats">
        {f'<div class="stat"><div class="stat-label">Source IP</div><div class="stat-value">{ip}</div></div>' if ip else ''}
        {f'<div class="stat"><div class="stat-label">Risk Score</div><div class="stat-value" style="color:{severity_color}">{risk_score:.1f}/100</div></div>' if risk_score is not None else ''}
        <div class="stat"><div class="stat-label">Severity</div><div class="stat-value" style="color:{severity_color}">{severity}</div></div>
        <div class="stat"><div class="stat-label">Module</div><div class="stat-value">{event_type}</div></div>
      </div>
      <a class="cta" href="https://smartsec-platform.vercel.app">View in SmartSec Dashboard →</a>
    </div>
    <div class="footer">
      SmartSec AI-Based Cyber Defense Platform • Automated Security Alert<br>
      You are receiving this because you have critical alerts enabled.
    </div>
  </div>
</body>
</html>
"""

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
            json={
                "from":    FROM_EMAIL,
                "to":      [to],
                "subject": f"🛡️ SmartSec Alert: {subject}",
                "html":    html,
            },
            timeout=10,
        )
        return response.status_code in (200, 201)
    except Exception:
        return False

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

OUT = r'C:\ShubhamCollege\SmartSec AI-Based Cyber Defense Platform\Shubham_Report'

def save(name):
    plt.savefig(f'{OUT}\\{name}', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('Saved', name)

# ─── COLOR PALETTE ───────────────────────────────────────────────────────────
PRIMARY_DARK = '#0f172a'  # Slate 900
BORDER_COLOR = '#1e3a8a'  # Deep Navy
TEXT_DARK = '#1e293b'     # Slate 800

# Service Colors
BG_BLUE = '#eff6ff'
BORDER_BLUE = '#3b82f6'

BG_GREEN = '#ecfdf5'
BORDER_GREEN = '#10b981'

BG_ORANGE = '#fffbeb'
BORDER_ORANGE = '#f59e0b'

BG_RED = '#fef2f2'
BORDER_RED = '#ef4444'

BG_PURPLE = '#faf5ff'
BORDER_PURPLE = '#a855f7'

BG_YELLOW = '#fefce8'
BORDER_YELLOW = '#eab308'

# ─── HELPER: draw arrow between elements ─────────────────────────────────────
def arrow(ax, x1, y1, x2, y2, label='', color='#475569', style='->', ls='solid'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=1.5, ls=ls,
                                connectionstyle='arc3,rad=0.0'))
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my, label, fontsize=6.5, ha='center', va='center', color=TEXT_DARK,
                fontweight='semibold',
                bbox=dict(boxstyle='round,pad=0.2', fc='#ffffff', ec='#cbd5e1', lw=0.8, alpha=0.95))

# ─── HELPER: draw boxes ──────────────────────────────────────────────────────
def rect(ax, cx, cy, w, h, label, fc=BG_BLUE, ec=BORDER_BLUE, fs=8.5, bold=False):
    ax.add_patch(FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                 boxstyle='round,pad=0.08', fc=fc, ec=ec, lw=1.6))
    ax.text(cx, cy, label, ha='center', va='center', fontsize=fs,
            fontweight='bold' if bold else 'normal', color=TEXT_DARK)

def ellipse(ax, cx, cy, rx, ry, label, fc=BG_GREEN, ec=BORDER_GREEN):
    ax.add_patch(mpatches.Ellipse((cx, cy), rx, ry, fc=fc, ec=ec, lw=1.6))
    ax.text(cx, cy, label, ha='center', va='center', fontsize=8, fontweight='bold', color=TEXT_DARK)

def store(ax, cx, cy, w, h, label, fc=BG_BLUE, ec=BORDER_BLUE):
    # DFD data store style: open left and right, double horizontal line
    ax.plot([cx - w/2, cx + w/2], [cy + h/2, cy + h/2], color=ec, lw=1.8)
    ax.plot([cx - w/2, cx + w/2], [cy - h/2, cy - h/2], color=ec, lw=1.8)
    ax.fill_between([cx - w/2, cx + w/2], cy - h/2, cy + h/2, color=fc, alpha=0.6)
    ax.text(cx, cy, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color=TEXT_DARK)

# ─── 1. GANTT CHART ─────────────────────────────────────────────────────────
def gantt():
    fig, ax = plt.subplots(figsize=(12, 6))
    tasks = [
        'Requirement Analysis', 'System & DB Design', 'Authentication',
        'IDS Module (ML)', 'Phishing Detection', 'Risk Scoring Engine',
        'Notifications', 'React Frontend', 'Testing & Integration', 'Deployment & Docs'
    ]
    starts = [0, 2, 4, 6, 6, 8, 9, 7, 10, 12]
    durs =   [2, 2, 2, 2, 3, 2, 2, 4,  2,  2]
    
    # Modern clean gradients/colors
    cols = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
            '#06b6d4', '#84cc16', '#ec4899', '#64748b', '#78350f']
            
    for i, (t, s, d, c) in enumerate(zip(tasks, starts, durs, cols)):
        ax.barh(i, d, left=s, height=0.5, color=c, alpha=0.9, edgecolor=PRIMARY_DARK, lw=1)
        ax.text(s + d + 0.15, i, t, va='center', fontsize=9, fontweight='semibold', color=TEXT_DARK)
        
    ax.set_yticks([])
    ax.set_xlim(0, 15)
    ax.set_xticks(range(15))
    ax.set_xticklabels([f'W{i+1}' for i in range(15)], fontsize=8.5, fontweight='bold', color=TEXT_DARK)
    ax.set_xlabel('Project Week Timeline', fontsize=10.5, fontweight='bold', labelpad=8, color=TEXT_DARK)
    ax.invert_yaxis()
    ax.set_title('SmartSec Platform — 14-Week Implementation Gantt Chart', fontsize=13, fontweight='bold', pad=15, color=PRIMARY_DARK)
    ax.grid(axis='x', alpha=0.3, ls='--', color='#94a3b8')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#cbd5e1')
    ax.spines['bottom'].set_color('#cbd5e1')
    plt.tight_layout()
    save('gantt_chart.png')

# ─── 2. DFD LEVEL 0 (CONTEXT DIAGRAM) ────────────────────────────────────────
def dfd0():
    fig, ax = plt.subplots(figsize=(11, 7.5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # Central process (circle)
    ax.add_patch(mpatches.Circle((6, 4), 1.4, fc='#eff6ff', ec='#1d4ed8', lw=2.5, zorder=3))
    ax.text(6, 4.2, 'SmartSec System', ha='center', va='center', fontsize=9.5, fontweight='bold', color=PRIMARY_DARK, zorder=4)
    ax.text(6, 3.8, '0.0 Central Engine', ha='center', va='center', fontsize=8.5, fontweight='semibold', color=BORDER_BLUE, zorder=4)

    # External entities (rectangles)
    ents = {
        'User':                (1.2, 4.0, BG_PURPLE, BORDER_PURPLE),
        'Supabase DB':         (6.0, 1.0, BG_GREEN, BORDER_GREEN),
        'VirusTotal API':      (10.8, 6.2, BG_RED, BORDER_RED),
        'Google Safe Browsing':(10.8, 4.0, BG_RED, BORDER_RED),
        'AbuseIPDB API':       (10.8, 1.8, BG_RED, BORDER_RED),
        'Resend Email Service':(6.0, 7.0, BG_ORANGE, BORDER_ORANGE),
    }
    for name, (ex, ey, bg, border) in ents.items():
        rect(ax, ex, ey, 2.1, 0.6, name, fc=bg, ec=border, fs=8, bold=True)

    # Clean flow arrows with exact trimmed coordinates
    # User -> Platform
    arrow(ax, 2.25, 4.15, 4.6, 4.15, 'URL / Credentials')
    arrow(ax, 4.6, 3.85, 2.25, 3.85, 'Security Verdicts')

    # Platform <-> Supabase
    arrow(ax, 5.85, 2.6, 5.85, 1.3, 'Insert Log')
    arrow(ax, 6.15, 1.3, 6.15, 2.6, 'Fetch Config')

    # Platform <-> External APIs
    arrow(ax, 7.25, 4.6, 9.75, 5.9, 'Query URL')
    arrow(ax, 9.75, 5.7, 7.25, 4.4, 'Reputation')

    arrow(ax, 7.4, 4.0, 9.75, 4.0, 'Verify Safe')
    arrow(ax, 9.75, 3.8, 7.4, 3.8, 'Threat Flag')

    arrow(ax, 7.25, 3.4, 9.75, 2.1, 'Check IP')
    arrow(ax, 9.75, 1.9, 7.25, 3.2, 'Abuse Score')

    # Platform -> Email
    arrow(ax, 6.0, 5.4, 6.0, 6.7, 'Send HTML Alert')

    ax.set_title('Data Flow Diagram (DFD) Level 0 — Context Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('dfd_level0.png')

# ─── 3. DFD LEVEL 1 ──────────────────────────────────────────────────────────
def dfd1():
    fig, ax = plt.subplots(figsize=(14, 10))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 10.5)
    ax.axis('off')

    # Central Actor
    rect(ax, 7.5, 9.6, 1.8, 0.5, 'USER', fc=BG_PURPLE, ec=BORDER_PURPLE, fs=9, bold=True)

    # Processes (ellipses)
    # Row 1 processes
    ellipse(ax, 2.5, 8.0, 2.6, 1.25, '1.0\nAuthentication')
    ellipse(ax, 7.5, 8.0, 2.6, 1.25, '2.0\nIDS Traffic\nAnalysis')
    ellipse(ax, 12.5, 8.0, 2.6, 1.25, '3.0\nPhishing\nDetection')

    # Row 2 processes
    ellipse(ax, 2.5, 4.5, 2.6, 1.25, '5.0\nDashboard\nAggregation')
    ellipse(ax, 7.5, 4.5, 2.6, 1.25, '4.0\nRisk\nScoring Engine')
    ellipse(ax, 12.5, 4.5, 2.6, 1.25, '6.0\nNotification\nDelivery')

    # Data Stores (open rectangles next to processes)
    # Row 1 stores
    store(ax, 0.8, 8.0, 1.3, 0.45, 'D1: users')
    store(ax, 2.5, 6.2, 1.7, 0.45, 'D2: login_events')
    store(ax, 9.9, 8.0, 1.4, 0.45, 'D5: ids_logs')
    store(ax, 15.0, 8.0, 1.4, 0.45, 'D3: url_scans')

    # Row 2/3 stores
    store(ax, 7.5, 2.5, 1.7, 0.45, 'D4: risk_events')
    store(ax, 12.5, 2.5, 1.7, 0.45, 'D6: notifications')

    # Flow Arrows
    # User to Row 1 processes
    arrow(ax, 6.6, 9.6, 2.5, 8.65, 'Credentials')
    arrow(ax, 7.5, 9.35, 7.5, 8.65, 'Traffic features')
    arrow(ax, 8.4, 9.6, 12.5, 8.65, 'URL string')

    # Process 1.0 (Auth) interactions
    arrow(ax, 1.8, 8.0, 1.45, 8.0, 'Verify')
    arrow(ax, 2.5, 7.35, 2.5, 6.45, 'Log attempt')
    arrow(ax, 3.1, 7.5, 6.8, 4.9, 'Login outcome')

    # Process 2.0 (IDS) interactions
    arrow(ax, 8.8, 8.0, 9.2, 8.0, 'Save alert')
    arrow(ax, 7.5, 7.35, 7.5, 5.15, 'Anomaly alert')

    # Process 3.0 (Phishing) interactions
    arrow(ax, 13.8, 8.0, 14.3, 8.0, 'Save verdict')
    arrow(ax, 11.9, 7.5, 8.2, 4.9, 'Threat alert')

    # Process 4.0 (Risk Scoring Engine) interactions
    arrow(ax, 7.5, 3.85, 7.5, 2.75, 'Persist delta')
    # Update score back in users table (D1)
    arrow(ax, 6.2, 4.5, 1.1, 7.75, 'Update risk score', color='#e11d48')
    # Trigger notifications
    arrow(ax, 8.8, 4.5, 11.2, 4.5, 'Trigger alerts')

    # Process 6.0 (Notifications)
    arrow(ax, 12.5, 3.85, 12.5, 2.75, 'Save notification')

    # Process 5.0 (Dashboard) reads from stores
    arrow(ax, 0.8, 7.75, 2.0, 5.1, 'Read profile', ls='dashed')
    arrow(ax, 2.5, 5.95, 2.5, 5.15, 'Read activity', ls='dashed')
    arrow(ax, 7.5, 2.75, 3.4, 4.2, 'Read risk logs', ls='dashed')

    # Dashboard display to User
    arrow(ax, 2.0, 4.8, 6.6, 9.35, 'Display status', color='#16a34a')

    ax.set_title('Data Flow Diagram (DFD) Level 1 — Process & Data Flow Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('dfd_level1.png')

# ─── 4. USE CASE DIAGRAM ─────────────────────────────────────────────────────
def usecase():
    fig, ax = plt.subplots(figsize=(11, 8.5))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis('off')

    # System boundary box
    ax.add_patch(FancyBboxPatch((2.6, 0.4), 8.8, 8.2, boxstyle='square,pad=0.1',
                 fc='#f8fafc', ec=BORDER_BLUE, lw=2.2))
    ax.text(7, 8.35, 'SmartSec Security Platform', ha='center', fontsize=10.5, fontweight='bold', color=BORDER_BLUE)

    # Actor stick figure
    ax.add_patch(mpatches.Circle((1.1, 4.5), 0.28, fc='#f1f5f9', ec=PRIMARY_DARK, lw=1.8))
    ax.plot([1.1, 1.1], [4.22, 3.3], color=PRIMARY_DARK, lw=2)  # spine
    ax.plot([0.5, 1.1, 1.7], [3.8, 3.3, 3.8], color=PRIMARY_DARK, lw=2)  # arms
    ax.plot([0.6, 1.1, 1.6], [2.5, 3.3, 2.5], color=PRIMARY_DARK, lw=2)  # legs
    ax.text(1.1, 2.1, 'Registered\nUser', ha='center', fontsize=9.5, fontweight='bold', color=PRIMARY_DARK)

    ucs = [
        (6.8, 7.6, 'Register / Login Authentication'),
        (6.8, 6.6, 'View Real-Time Security Dashboard'),
        (6.8, 5.6, 'Execute Unsupervised IDS Analysis'),
        (6.8, 4.6, 'Perform 19-Signal Phishing Scans'),
        (6.8, 3.6, 'View 30-Day Risk History Gauge'),
        (6.8, 2.6, 'Monitor Detailed Login Audit Trail'),
        (6.8, 1.6, 'Customize User Security Settings'),
    ]
    for cx, cy, lbl in ucs:
        ax.add_patch(mpatches.Ellipse((cx, cy), 4.2, 0.72, fc=BG_BLUE, ec=BORDER_BLUE, lw=1.6))
        ax.text(cx, cy, lbl, ha='center', va='center', fontsize=8.5, fontweight='semibold', color=TEXT_DARK)
        # Connect actor to use case
        ax.annotate('', xy=(cx - 2.1, cy), xytext=(1.38, 4.2 if cy > 4.5 else 3.8),
                    arrowprops=dict(arrowstyle='-', color='#64748b', lw=1.2))

    ax.set_title('System Architecture — Use Case Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('usecase_diagram.png')

# ─── 5. ENTITY RELATIONSHIP (ER) DIAGRAM ──────────────────────────────────────
def er():
    fig, ax = plt.subplots(figsize=(15.5, 9))
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9)
    ax.axis('off')

    def entity(cx, cy, name, fields):
        w = 2.1
        rh = 0.38
        h = rh * len(fields) + 0.5
        # Header block
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - 0.4), w, 0.5,
                     boxstyle='square,pad=0', fc='#1e3a8a', ec='#1e293b', lw=1.5))
        ax.text(cx, cy - 0.15, name, ha='center', va='center', color='white', fontsize=8, fontweight='bold')
        # Body block
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - 0.4 - rh*len(fields)), w, rh*len(fields),
                     boxstyle='square,pad=0', fc='#f8fafc', ec='#475569', lw=1.5))
        ax.plot([cx - w/2, cx + w/2], [cy - 0.4, cy - 0.4], color='#1e293b', lw=1.2)
        for j, f in enumerate(fields):
            ax.text(cx, cy - 0.58 - j*rh, f, ha='center', va='center', fontsize=6.8, color=TEXT_DARK, fontweight='medium')
        return (cx, cy - 0.4 - rh*len(fields)/2)  # midpoint for lines

    # Balanced layout of 7 entities (users in top middle, others in bottom row)
    entities = {
        'users':        (7.5, 8.5, ['id (PK)', 'email', 'username', 'hashed_password', 'risk_score', 'risk_level']),
        'login_events': (1.25, 3.5, ['id (PK)', 'user_id (FK)', 'event_type', 'ip_address', 'created_at']),
        'ids_logs':     (3.75, 3.5, ['id (PK)', 'user_id (FK)', 'is_anomaly', 'anomaly_score', 'created_at']),
        'url_scans':    (6.25, 3.5, ['id (PK)', 'user_id (FK)', 'url', 'verdict', 'risk_score', 'created_at']),
        'risk_events':  (8.75, 3.5, ['id (PK)', 'user_id (FK)', 'event_type', 'severity', 'score_delta']),
        'notifications':(11.25, 3.5, ['id (PK)', 'user_id (FK)', 'title', 'message', 'is_read']),
        'alerts':       (13.75, 3.5, ['id (PK)', 'user_id (FK)', 'type', 'is_resolved', 'created_at']),
    }
    
    mids = {}
    for name, (cx, cy, fields) in entities.items():
        mids[name] = entity(cx, cy, name, fields)

    # 1:N relations pointing from users bottom to children tops
    ux, uy = 7.5, 8.5 - 0.4 - 0.38*6  # bottom of users box (5.82)
    for name, (cx, cy, fields) in entities.items():
        if name != 'users':
            child_top_y = cy + 0.1  # top of child box
            ax.annotate('', xy=(cx, child_top_y), xytext=(ux, uy),
                        arrowprops=dict(arrowstyle='-|>', color='#475569', lw=1.4,
                                        mutation_scale=10))
            ax.text((cx + ux)/2, (child_top_y + uy)/2, '1:N', fontsize=6.5,
                    color='#0284c7', ha='center', fontweight='bold',
                    bbox=dict(fc='white', ec='#bae6fd', lw=0.8, alpha=0.95))

    ax.set_title('Database Architecture — Entity Relationship (ER) Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('er_diagram.png')

# ─── 6. CLASS DIAGRAM (UML) ──────────────────────────────────────────────────
def classdiag():
    fig, ax = plt.subplots(figsize=(15.5, 9.5))
    ax.set_xlim(0, 15)
    ax.set_ylim(0, 9.5)
    ax.axis('off')

    def cls(cx, cy, name, methods):
        w = 3.1
        rh = 0.36
        mh = rh * len(methods)
        # Header block
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - 0.4), w, 0.45,
                     boxstyle='square,pad=0', fc='#1e3a8a', ec='#1e293b', lw=1.5))
        ax.text(cx, cy - 0.18, name, ha='center', va='center', color='white', fontsize=8, fontweight='bold')
        # Body block
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - 0.4 - mh), w, mh,
                     boxstyle='square,pad=0', fc='#f8fafc', ec='#475569', lw=1.5))
        ax.plot([cx - w/2, cx + w/2], [cy - 0.4, cy - 0.4], color='#1e293b', lw=1.2)
        for j, m in enumerate(methods):
            ax.text(cx, cy - 0.58 - j*rh, m, ha='center', va='center', fontsize=6.8, color=TEXT_DARK, fontweight='medium')
        return cx, cy, cx, cy - 0.4 - mh

    classes = [
        (2.5, 7.2, 'AuthService',
         ['-users: list', '+login(user,pwd)', '+register(user,pwd)', '+verify_jwt(token)']),
        (2.5, 4.5, 'IDSService',
         ['-rules: list', '+analyze_traffic()', '+detect_anomalies()', '+log_event()']),
        (2.5, 1.8, 'PhishingService',
         ['-blacklist: list', '+scan_url(url)', '+extract_features()', '+predict_score()']),
        (7.5, 4.5, 'RiskService',
         ['-decay_rate: float', '+calculate_risk()', '+aggregate_metrics()', '+apply_decay()']),
        (12.5, 7.2, 'NotificationService',
         ['-alerts: list', '+send_push()', '+mark_resolved()', '+get_active()']),
        (12.5, 1.8, 'EmailService',
         ['-api_key: str', '+send_alert(to,subj,body)', '+render_template()']),
    ]
    
    tops = {}
    bots = {}
    for (cx, cy, name, methods) in classes:
        tx, ty, bx, by = cls(cx, cy, name, methods)
        tops[name] = (tx, ty)
        bots[name] = (bx, by)

    # Dashed dependency lines (clear, symmetric flows with labels)
    def dep(n1, n2, label=''):
        x1, y1 = bots[n1]
        x2, y2 = tops[n2]
        arrow(ax, x1, y1, x2, y2, label=label, color='#475569', style='->', ls='dashed')

    dep('AuthService', 'RiskService', 'assesses')
    dep('IDSService', 'RiskService', 'triggers')
    dep('PhishingService', 'RiskService', 'reports')
    dep('RiskService', 'NotificationService', 'dispatches')
    dep('RiskService', 'EmailService', 'alerts')

    ax.set_title('System Architecture — Unified Modeling Language (UML) Class Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('class_diagram.png')

# ─── 7. ACTIVITY DIAGRAM ─────────────────────────────────────────────────────
def activity():
    fig, ax = plt.subplots(figsize=(9, 15.5))
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 15.5)
    ax.axis('off')

    def box(cx, cy, txt, w=4.5, h=0.5, fc=BG_BLUE, ec=BORDER_BLUE):
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                     boxstyle='round,pad=0.08', fc=fc, ec=ec, lw=1.5))
        ax.text(cx, cy, txt, ha='center', va='center', fontsize=8.5, fontweight='bold', color=TEXT_DARK)

    def diam(cx, cy, txt):
        d = 0.4
        xs = [cx, cx + d*2.2, cx, cx - d*2.2, cx]
        ys = [cy + d, cy, cy - d, cy, cy + d]
        ax.fill(xs, ys, fc=BG_YELLOW, ec=BORDER_YELLOW, lw=1.5)
        ax.text(cx, cy, txt, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#854d0e')

    # Start node
    ax.add_patch(mpatches.Circle((4.5, 14.7), 0.22, fc=PRIMARY_DARK, ec=PRIMARY_DARK))
    arrow(ax, 4.5, 14.45, 4.5, 13.95)
    
    box(4.5, 13.6, 'Open SmartSec Dashboard UI')
    arrow(ax, 4.5, 13.3, 4.5, 12.75)
    
    diam(4.5, 12.3, 'Active Session?')
    
    # Left Branch (No)
    arrow(ax, 3.6, 12.3, 1.8, 12.3, label='No')
    arrow(ax, 1.8, 12.3, 1.8, 11.55)
    box(1.8, 11.2, 'Log In / Register\n(Authenticate User)', w=2.8, fc=BG_RED, ec=BORDER_RED)
    arrow(ax, 1.8, 10.9, 1.8, 10.25)
    
    # Join node (Horizontal bar for Auth Join)
    ax.plot([1.5, 4.8], [10.2, 10.2], color=PRIMARY_DARK, lw=4)
    arrow(ax, 1.8, 10.2, 1.8, 10.1, style='-')
    
    # Right Branch (Yes)
    arrow(ax, 4.5, 11.9, 4.5, 10.25, label='Yes')
    
    arrow(ax, 4.5, 10.2, 4.5, 9.8) # From Auth Join to Init
    box(4.5, 9.5, 'Initialize Dashboard State', fc=BG_GREEN, ec=BORDER_GREEN)
    
    # Fork to Parallel Security Scans (represented by a horizontal fork bar at y=8.9)
    ax.plot([1.5, 7.5], [8.9, 8.9], color=PRIMARY_DARK, lw=4)
    arrow(ax, 4.5, 9.22, 4.5, 8.9) # From Init to Fork bar
    
    # Connect Fork bar to the three modules
    arrow(ax, 2.0, 8.9, 2.0, 8.45)
    arrow(ax, 4.5, 8.9, 4.5, 8.45)
    arrow(ax, 7.0, 8.9, 7.0, 8.45)
    
    # IDS (Left)
    box(2.0, 8.1, 'Execute IDS\nAnomaly Scan', w=2.1, h=0.55, fc=BG_BLUE, ec=BORDER_BLUE)
    arrow(ax, 2.0, 7.8, 2.0, 7.45)
    diam(2.0, 7.0, 'Anomaly?')
    arrow(ax, 2.0, 6.6, 2.0, 6.2, label='Yes')
    box(2.0, 5.9, 'Flag IDS Anomaly', w=2.1, h=0.45, fc=BG_ORANGE, ec=BORDER_ORANGE)
    arrow(ax, 2.0, 5.65, 2.0, 5.15) # Yes path to join bar
    
    # IDS No path: bypass Flag box down to join bar
    arrow(ax, 1.12, 7.0, 0.6, 7.0, style='-')
    arrow(ax, 0.6, 7.0, 0.6, 5.15, style='-')
    arrow(ax, 0.6, 5.15, 1.5, 5.15, label='No')
    
    # Phishing (Center)
    box(4.5, 8.1, 'Analyze URL for\nPhishing Signals', w=2.1, h=0.55, fc=BG_BLUE, ec=BORDER_BLUE)
    arrow(ax, 4.5, 7.8, 4.5, 7.45)
    diam(4.5, 7.0, 'Phishing?')
    arrow(ax, 4.5, 6.6, 4.5, 6.2, label='Yes')
    box(4.5, 5.9, 'Flag URL Phishing', w=2.1, h=0.45, fc=BG_ORANGE, ec=BORDER_ORANGE)
    arrow(ax, 4.5, 5.65, 4.5, 5.15) # Yes path to join bar
    
    # Phishing No path: bypass Flag box down to join bar
    arrow(ax, 3.62, 7.0, 3.3, 7.0, style='-')
    arrow(ax, 3.3, 7.0, 3.3, 5.15, style='-')
    arrow(ax, 3.3, 5.15, 4.0, 5.15, label='No')

    # Risk Profile (Right)
    box(7.0, 8.1, 'Configure Rules/\nView Score Gauge', w=2.1, h=0.55, fc=BG_BLUE, ec=BORDER_BLUE)
    arrow(ax, 7.0, 7.8, 7.0, 7.45)
    diam(7.0, 7.0, 'Score Delta?')
    arrow(ax, 7.0, 6.6, 7.0, 6.2, label='Yes')
    box(7.0, 5.9, 'Flag Config Change', w=2.1, h=0.45, fc=BG_ORANGE, ec=BORDER_ORANGE)
    arrow(ax, 7.0, 5.65, 7.0, 5.15) # Yes path to join bar
    
    # Risk Profile No path: bypass Flag box down to join bar
    arrow(ax, 7.88, 7.0, 8.4, 7.0, style='-')
    arrow(ax, 8.4, 7.0, 8.4, 5.15, style='-')
    arrow(ax, 8.4, 5.15, 7.5, 5.15, label='No')

    # Join Node (Horizontal solid bar at y=5.1 for synchronizing modules)
    ax.plot([1.5, 7.5], [5.1, 5.1], color=PRIMARY_DARK, lw=4)
    
    # From Join bar to Exponential decay calculation
    arrow(ax, 4.5, 5.1, 4.5, 4.6)
    box(4.5, 4.3, 'Recalculate Exponential Time-Decay Risk', fc=BG_RED, ec=BORDER_RED)
    arrow(ax, 4.5, 4.0, 4.5, 3.55)
    
    box(4.5, 3.2, 'Write Notifications & Alert Logs', fc=BG_PURPLE, ec=BORDER_PURPLE)
    arrow(ax, 4.5, 2.9, 4.5, 2.45)
    
    box(4.5, 2.1, 'Dispatch Resend Email Alerts (if High/Critical)', h=0.6, fc=BG_YELLOW, ec=BORDER_YELLOW)
    arrow(ax, 4.5, 1.8, 4.5, 1.35)
    
    box(4.5, 1.0, 'Synchronize UI State / Return to Dashboard')
    arrow(ax, 4.5, 0.7, 4.5, 0.45)
    
    # End node
    ax.add_patch(mpatches.Circle((4.5, 0.25), 0.18, fc='white', ec=PRIMARY_DARK, lw=2.2))
    ax.add_patch(mpatches.Circle((4.5, 0.25), 0.10, fc=PRIMARY_DARK))

    ax.set_title('System Workflow — Activity Diagram', fontsize=12, fontweight='bold', pad=10, color=PRIMARY_DARK)
    plt.tight_layout()
    save('activity_diagram.png')

# ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Generating all premium diagrams...")
    gantt()
    dfd0()
    dfd1()
    usecase()
    er()
    classdiag()
    activity()
    print("All premium diagrams generated successfully!")


import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT = r'C:\ShubhamCollege\SmartSec AI-Based Cyber Defense Platform\Shubham_Report'
PRIMARY_DARK = '#0f172a'
TEXT_DARK    = '#1e293b'

def save(name):
    plt.savefig(f'{OUT}\\{name}', dpi=200, bbox_inches='tight', facecolor='white')
    plt.close()
    print('Saved', name)

def gantt():
    fig, ax = plt.subplots(figsize=(13, 5.5))
    ax.set_facecolor('white')
    fig.patch.set_facecolor('white')

    # (task_label, start, duration, bar_color, group)
    tasks = [
        ('Requirement Analysis',   0,  2,  '#9fa8da', 'Core Planning'),
        ('System & DB Design',     2,  2,  '#9fa8da', 'Core Planning'),
        ('Authentication Module',  4,  2,  '#9fa8da', 'Core Planning'),
        ('IDS Module (ML)',        6,  2,  '#7986cb', 'Security Modules'),
        ('Phishing Detection',     6,  3,  '#7986cb', 'Security Modules'),
        ('Risk Scoring Engine',    9,  2,  '#7986cb', 'Security Modules'),
        ('Notifications',         10,  2,  '#7986cb', 'Security Modules'),
        ('React Frontend',         6,  5,  '#7986cb', 'Frontend'),
        ('Testing & Integration', 10,  2,  '#9fa8da', 'Finalisation'),
        ('Deployment & Docs',     12,  2,  '#9fa8da', 'Finalisation'),
    ]

    groups     = ['Core Planning', 'Security Modules', 'Frontend', 'Finalisation']
    group_rows = {g: [] for g in groups}
    for i, (_, _, _, _, g) in enumerate(tasks):
        group_rows[g].append(i)

    band_colors = {
        'Core Planning':    '#eef0fb',
        'Security Modules': '#f0f0ff',
        'Frontend':         '#fffff0',
        'Finalisation':     '#f0f0ff',
    }

    n = len(tasks)
    ax.set_xlim(0, 15)
    ax.set_ylim(-0.6, n - 0.4)

    # Swim-lane background bands
    for g, rows in group_rows.items():
        ax.axhspan(min(rows) - 0.5, max(rows) + 0.5,
                   color=band_colors[g], zorder=0)

    # Vertical grid lines
    for x in range(0, 16):
        ax.axvline(x, color='#c5cae9', lw=0.6, zorder=1)

    # Bars + inside labels
    for i, (label, start, dur, col, _) in enumerate(tasks):
        ax.barh(i, dur, left=start, height=0.45,
                color=col, edgecolor='#5c6bc0', lw=0.8, zorder=3)
        ax.text(start + dur / 2, i, label,
                ha='center', va='center', fontsize=7.5,
                fontweight='semibold', color='white', zorder=4, clip_on=True)

    # Y-axis: group names at mid-row
    group_mid = {g: (min(r) + max(r)) / 2 for g, r in group_rows.items()}
    ax.set_yticks(list(group_mid.values()))
    ax.set_yticklabels(list(group_mid.keys()),
                       fontsize=9, fontweight='semibold', color=TEXT_DARK)
    ax.yaxis.set_tick_params(length=0)
    ax.invert_yaxis()

    # X-axis: 01 .. 15
    ax.set_xticks(range(0, 15))
    ax.set_xticklabels([f'{i+1:02d}' for i in range(15)],
                       fontsize=8, color='#555')
    ax.tick_params(axis='x', length=0)

    # Spines
    for sp in ['top', 'right', 'left']:
        ax.spines[sp].set_visible(False)
    ax.spines['bottom'].set_color('#c5cae9')

    ax.set_title(
        'Figure 3.1: SmartSec Platform - 14-Week Implementation Gantt Chart',
        fontsize=11, fontweight='bold', pad=10, color=PRIMARY_DARK)

    plt.tight_layout()
    save('gantt_chart.png')

if __name__ == '__main__':
    gantt()
    print('Done.')

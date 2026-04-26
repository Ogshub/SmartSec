import { BarChart3, Zap } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts';

const radarData = [
  { subject: 'Login Safety',   score: 80 },
  { subject: 'IP Reputation',  score: 65 },
  { subject: 'Time Pattern',   score: 90 },
  { subject: 'Request Rate',   score: 55 },
  { subject: 'URL Safety',     score: 75 },
  { subject: 'Failed Logins',  score: 95 },
];

const factors = [
  { label: 'Login Time Anomaly',  contribution: 15, status: 'Low' },
  { label: 'New IP Address',      contribution: 20, status: 'Medium' },
  { label: 'Failed Attempts',     contribution: 0,  status: 'Low' },
  { label: 'Unusual Location',    contribution: 10, status: 'Low' },
  { label: 'Request Frequency',   contribution: 5,  status: 'Low' },
];

export default function RiskPage() {
  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="pill-badge"><Zap size={14} /> Coming in Step 6 — Composite Risk Engine</span>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}><BarChart3 size={15} /> Risk Factor Breakdown</div>
          {factors.map(f => (
            <div key={f.label} style={{ marginBottom: '.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.25rem' }}>
                <span style={{ fontSize: '.82rem' }}>{f.label}</span>
                <span className={`risk-badge ${f.status}`}>{f.contribution} pts</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${f.contribution * 3}%`,
                  background: f.status === 'Low' ? 'var(--green)' : f.status === 'Medium' ? 'var(--yellow)' : 'var(--red)',
                  transition: 'width .5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Security Posture Radar</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
              <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mt-3">
        <div className="coming-soon-banner">
          <div className="coming-soon-icon">📊</div>
          <div className="coming-soon-title">Composite Risk Scoring Engine</div>
          <div className="coming-soon-sub">
            Step 6 will combine signals from the IDS (anomaly score), phishing detector,
            login history, and behavioral patterns into a single, explainable risk score per user.
          </div>
          <span className="pill-badge"><Zap size={13} /> Implementation in Step 6</span>
        </div>
      </div>
    </>
  );
}

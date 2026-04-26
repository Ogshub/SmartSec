import { useState } from 'react';
import { Link2, Search, ShieldX, ShieldCheck, Zap } from 'lucide-react';

const mockResults = [
  { url: 'http://paypa1-secure-login.com', verdict: 'Phishing', score: 96, flags: ['Typosquatting', 'Suspicious TLD'] },
  { url: 'https://bit.ly/3xR9qKL',         verdict: 'Suspicious', score: 62, flags: ['Shortened URL'] },
  { url: 'https://google.com',             verdict: 'Safe',      score: 2,  flags: [] },
];

export default function PhishingPage() {
  const [url, setUrl] = useState('');

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <span className="pill-badge"><Zap size={14} /> Coming in Step 5 — ML + VirusTotal API</span>
      </div>

      {/* URL Input */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}><Search size={15} /> Phishing URL Scanner</div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <input
            className="form-input"
            placeholder="Enter a URL to scan e.g. http://suspicious-site.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" style={{ minWidth: 120 }} disabled>
            Scan URL
          </button>
        </div>
        <p className="text-muted mt-1">⚠️ Real scanning will be enabled in Step 5 (ML + VirusTotal integration)</p>
      </div>

      {/* Mock results */}
      <div className="card mt-3">
        <div className="card-header">
          <div className="card-title"><Link2 size={15} /> Recent Scan Results (Mock Data)</div>
        </div>
        {mockResults.map((r, i) => (
          <div key={i} className="alert-item mt-1" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <code style={{ fontSize: '.8rem', color: 'var(--accent2)' }}>{r.url}</code>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {r.verdict === 'Safe'
                  ? <ShieldCheck size={16} color="var(--green)" />
                  : <ShieldX size={16} color={r.verdict === 'Phishing' ? 'var(--red)' : 'var(--yellow)'} />
                }
                <span className={`risk-badge ${r.verdict === 'Safe' ? 'Low' : r.verdict === 'Suspicious' ? 'Medium' : 'High'}`}>
                  {r.verdict}
                </span>
                <span className="text-muted mono">{r.score}/100</span>
              </div>
            </div>
            {r.flags.length > 0 && (
              <div style={{ display: 'flex', gap: '.4rem' }}>
                {r.flags.map(f => (
                  <span key={f} style={{ fontSize: '.7rem', padding: '.15rem .5rem', borderRadius: 4, background: 'rgba(239,68,68,.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)' }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card mt-3">
        <div className="coming-soon-banner">
          <div className="coming-soon-icon">🔗</div>
          <div className="coming-soon-title">ML-Powered Phishing Detector</div>
          <div className="coming-soon-sub">
            Step 5 will integrate VirusTotal API, extract URL features (domain age, HTTPS,
            redirects, suspicious keywords), and run them through a trained classifier.
          </div>
          <span className="pill-badge"><Zap size={13} /> Implementation in Step 5</span>
        </div>
      </div>
    </>
  );
}

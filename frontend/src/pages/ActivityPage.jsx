import { Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ActivityPage() {
  const { user } = useAuth();
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: '1.5rem' }}><Activity size={15} /> Full Activity Log</div>
      <p className="text-muted">Detailed per-request activity tracking will be added progressively from Step 4 onwards.</p>
      <div className="coming-soon-banner">
        <div className="coming-soon-icon">📋</div>
        <div className="coming-soon-title">Activity Log</div>
        <div className="coming-soon-sub">Complete request-level audit trail. Will show every API call, its risk score, and outcome.</div>
      </div>
    </div>
  );
}

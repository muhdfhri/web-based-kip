import React, { useState, useEffect } from 'react';

function DashboardTab() {
  const [summary, setSummary] = useState({ activeQueues: 0, activePatrols: 0, openIncidents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('kip_token');
        const res = await fetch('/api/security/queues/summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json) {
          setSummary(json);
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading Dashboard...</div>;

  return (
    <div className="som-view-container">
      <section className="som-dashboard-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '20px' }}>
        <div className="stat-card" style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '14px' }}>TRUCKS IN QUEUE</h3>
          <div style={{ fontSize: '48px', color: '#ffdb3b', fontWeight: 'bold' }}>{summary.activeQueues}</div>
        </div>
        <div className="stat-card" style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '14px' }}>ACTIVE PATROLS</h3>
          <div style={{ fontSize: '48px', color: '#39ff14', fontWeight: 'bold' }}>{summary.activePatrols}</div>
        </div>
        <div className="stat-card" style={{ background: 'rgba(2, 6, 23, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
          <h3 style={{ color: '#94a3b8', margin: '0 0 10px 0', fontSize: '14px' }}>OPEN INCIDENTS</h3>
          <div style={{ fontSize: '48px', color: summary.openIncidents > 0 ? '#ef4444' : '#64748b', fontWeight: 'bold' }}>{summary.openIncidents}</div>
        </div>
      </section>
    </div>
  );
}

export default DashboardTab;

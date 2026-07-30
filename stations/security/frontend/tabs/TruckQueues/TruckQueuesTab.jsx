import React, { useState, useEffect } from 'react';

function TruckQueuesTab() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const token = localStorage.getItem('kip_token');
        const res = await fetch('/api/security/queues/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (Array.isArray(json)) {
          setQueues(json);
        }
      } catch (err) {
        console.error('Failed to fetch queues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueues();
    const interval = setInterval(fetchQueues, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading Queues...</div>;

  return (
    <div className="som-view-container">
      <section className="som-logs-full-section">
        <div className="som-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="som-section-title">TRUCK QUEUE MANAGEMENT</div>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Auto-refreshes every 10s</div>
        </div>
        <div className="som-logs-table-container">
          <table className="som-logs-table">
            <thead>
              <tr>
                <th>TIME (CHECK IN)</th>
                <th>TICKET NUMBER</th>
                <th>PLATE NUMBER</th>
                <th>DRIVER</th>
                <th>CLASS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {queues.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No active truck queues.</td></tr>
              ) : (
                queues.map(q => (
                  <tr key={q.id}>
                    <td>{new Date(q.check_in_at).toLocaleString('id-ID')}</td>
                    <td style={{ fontFamily: 'monospace', color: '#ffdb3b', fontWeight: 'bold' }}>{q.queue_number}</td>
                    <td>{q.plate_number}</td>
                    <td>{q.driver_name || '-'}</td>
                    <td>{q.classification_name || '-'}</td>
                    <td>
                      <span className={`log-status-tag`} style={{ 
                        background: q.status === 'WAITING' ? 'rgba(234, 179, 8, 0.2)' : 
                                    q.status === 'WEIGH_IN' ? 'rgba(56, 189, 248, 0.2)' : 
                                    'rgba(148, 163, 184, 0.2)', 
                        color: q.status === 'WAITING' ? '#eab308' : 
                               q.status === 'WEIGH_IN' ? '#38bdf8' : 
                               '#94a3b8' 
                      }}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default TruckQueuesTab;

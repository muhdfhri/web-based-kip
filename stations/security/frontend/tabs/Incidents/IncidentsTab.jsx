import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState(null);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const token = localStorage.getItem('kip_token');
        const res = await fetch('/api/security/incidents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (Array.isArray(json)) {
          setIncidents(json);
        }
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  const resolveIncident = async (id) => {
    try {
      const token = localStorage.getItem('kip_token');
      await fetch(`/api/security/incidents/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'RESOLVED', resolved_notes: 'Resolved via Command Center' })
      });
      setSelectedIncident(null);
      // Update local state
      setIncidents(incidents.map(inc => inc.id === id ? { ...inc, status: 'RESOLVED' } : inc));
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading Incidents...</div>;

  return (
    <div className="som-view-container">
      <section className="som-logs-full-section">
        <div className="som-section-header">
          <div className="som-section-title">INCIDENT REPORTS</div>
        </div>
        <div className="som-logs-table-container">
          <table className="som-logs-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>GUARD ID</th>
                <th>STATION/LOCATION</th>
                <th>CATEGORY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No incidents reported.</td></tr>
              ) : (
                incidents.map(inc => (
                  <tr key={inc.id}>
                    <td>{new Date(inc.reported_at).toLocaleString('id-ID')}</td>
                    <td>{inc.user_id}</td>
                    <td>{inc.station_name || 'N/A'}</td>
                    <td>{inc.incident_category}</td>
                    <td>
                      <span className={`log-status-tag ${inc.status === 'RESOLVED' ? 'verified' : 'pending'}`} style={{ background: inc.status === 'RESOLVED' ? 'rgba(57,255,20,0.2)' : 'rgba(239,68,68,0.2)', color: inc.status === 'RESOLVED' ? '#39ff14' : '#ef4444' }}>
                        {inc.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => setSelectedIncident(inc)}
                        style={{ background: 'transparent', border: '1px solid #ffdb3b', color: '#ffdb3b', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        VIEW DETAILS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Incident Detail Modal */}
      {selectedIncident && createPortal(
        <div className="som-proof-modal-overlay">
          <div className="som-proof-modal-content animate-in">
            <div className="som-proof-modal-header">
              <h2>INCIDENT DETAILS: {selectedIncident.incident_category}</h2>
              <button className="som-close-modal" onClick={() => setSelectedIncident(null)}>×</button>
            </div>
            <div className="som-proof-modal-body" style={{ display: 'flex', gap: '20px', background: '#0f172a', padding: '20px' }}>
              <div style={{ flex: 1 }}>
                {selectedIncident.photo_path ? (
                  <img src={selectedIncident.photo_path} alt="Incident" style={{ width: '100%', borderRadius: '8px', border: '1px solid #334155' }} />
                ) : (
                  <div style={{ width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #334155', color: '#64748b' }}>NO PHOTO ATTACHED</div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>REPORTED BY GUARD ID</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>{selectedIncident.user_id}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>LOCATION</div>
                  <div style={{ color: '#fff', fontSize: '16px' }}>{selectedIncident.station_name || 'Free Roaming'}</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>DESCRIPTION</div>
                  <div style={{ color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px' }}>
                    {selectedIncident.incident_description || '-'}
                  </div>
                </div>
                {selectedIncident.status !== 'RESOLVED' && (
                  <button 
                    onClick={() => resolveIncident(selectedIncident.id)}
                    style={{ marginTop: 'auto', background: '#39ff14', color: '#000', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    MARK AS RESOLVED
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default IncidentsTab;

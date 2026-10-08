import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaCamera, FaCheckCircle, FaFilter, FaSync, FaArrowLeft, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import ProofModal from '../../components/ProofModal.jsx';

function PatrolLogsView({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);
  const [isAllData, setIsAllData] = useState(false);

  const [stations, setStations] = useState([]);
  const [activeProof, setActiveProof] = useState(null);
  const [proofIndex, setProofIndex] = useState(0);

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/security/patrol/stations');
      const json = await res.json();
      if (Array.isArray(json)) {
        setStations(json.map(st => st.station_name || st.label).filter(Boolean).sort());
      }
    } catch (err) {
      console.error('[PatrolLogsView] Failed to fetch stations:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kip_token');
      const queryParams = new URLSearchParams({
        from_date: fromDate,
        to_date: toDate,
        all_data: isAllData
      });

      const res = await fetch(`/api/security/patrol/logs?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const rawLogs = Array.isArray(json) ? json : (json.logs || json.data || []);
      
      const parsedLogs = [];

      rawLogs.forEach(item => {
        if (!item.verified_at && !item.created_at) return;
        const verifiedAt = new Date(item.verified_at || item.created_at);
        const officer = item.guard_name || item.verified_by_name || item.officer_name || 'Security Officer';
        const station = item.station_name || item.station || 'Station';
        const lat = parseFloat(item.latitude || 0).toFixed(5);
        const lng = parseFloat(item.longitude || 0).toFixed(5);
        const photo = item.verification_photo || item.photo_path || item.photo_url || item.photo;

        const startAt = item.started_at ? new Date(item.started_at) : null;
        const completeAt = item.completed_at ? new Date(item.completed_at) : null;
        
        const formatTime = (d) => d ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-';
        const formatDate = (d) => d ? d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

        parsedLogs.push({
          id: item.id || Math.random(),
          dateObj: verifiedAt,
          dateStr: verifiedAt.toISOString().split('T')[0],
          timeStr: formatTime(verifiedAt),
          formattedDate: formatDate(verifiedAt),
          startTimeStr: formatTime(startAt),
          startDateStr: formatDate(startAt),
          endTimeStr: formatTime(completeAt),
          endDateStr: formatDate(completeAt),
          shift: item.shift || '-',
          officer,
          initial: officer.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          station,
          coord: `${lat}, ${lng}`,
          status: (item.status || 'VERIFIED').toUpperCase(),
          photo
        });
      });

      setLogs(parsedLogs);
    } catch (err) {
      console.error('[PatrolLogsView] Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fromDate, toDate, isAllData]);

  const exportToExcel = () => {
    if (filteredLogs.length === 0) return alert("No logs to export");
    const exportData = filteredLogs.map((log, index) => ({
      "No": index + 1,
      "PIC Security": log.officer,
      "Start Time": log.startTimeStr !== '-' ? `${log.startDateStr} ${log.startTimeStr}` : '-',
      "End Time": log.endTimeStr !== '-' ? `${log.endDateStr} ${log.endTimeStr}` : '-',
      "Shift": log.shift,
      "Location Checkpoint": log.station,
      "Verified Time": `${log.formattedDate} ${log.timeStr}`,
      "GPS Coordinates": log.coord,
      "Status": log.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PatrolLogs");
    XLSX.writeFile(workbook, `PatrolLogs_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
  };

  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.officer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.coord.toLowerCase().includes(searchQuery.toLowerCase());

    const stationMatch = selectedStation === 'ALL' || log.station === selectedStation;

    return searchMatch && stationMatch;
  });

  const thStyle = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '800',
    color: '#475569',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  };

  const tdStyle = {
    padding: '12px 16px',
    verticalAlign: 'middle'
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#ffffff',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #cbd5e1',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      
      {/* ── HEADER TOOLBAR ── */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        color: '#0f172a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: '#0f172a',
                border: '1px solid #0f172a',
                color: '#ffdb3b',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: '700',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <FaArrowLeft /> Back to Map
            </button>
          )}

          {onBack && <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Patrol Logs</h2>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Historical verified checkpoint findings & guard activity logs</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={exportToExcel}
            style={{
              background: '#10b981',
              border: 'none',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
          >
            <FaFileExcel style={{ fontSize: '14px' }} /> Export Excel
          </button>
          
          <button
            onClick={fetchLogs}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '700',
              transition: 'all 0.2s'
            }}
          >
            <FaSync style={{ fontSize: '12px', color: '#64748b' }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTERS BAR ── */}
      <div style={{
        padding: '14px 24px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }} />
          <input
            type="text"
            placeholder="Search officer, station, coordinates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '9px 14px 9px 36px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Station Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <FaFilter style={{ color: '#64748b', fontSize: '12px' }} />
            <select
              value={selectedStation}
              onChange={e => setSelectedStation(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Stations ({stations.length})</option>
              {stations.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Date Picker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', opacity: isAllData ? 0.5 : 1, pointerEvents: isAllData ? 'none' : 'auto' }}>
            <FaCalendarAlt style={{ color: '#64748b', fontSize: '13px' }} />
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '800' }}>-</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* All Data Toggle */}
          <button
            onClick={() => setIsAllData(!isAllData)}
            style={{
              background: isAllData ? '#0f172a' : '#f1f5f9',
              color: isAllData ? '#ffffff' : '#64748b',
              border: `1px solid ${isAllData ? '#0f172a' : '#cbd5e1'}`,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            All Data
          </button>
        </div>
      </div>

      {/* ── TABLE CONTENT ── */}
      <div style={{ flex: '1', overflowY: 'auto', background: '#ffffff' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
            Loading patrol logs...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={thStyle}>PIC SECURITY</th>
                <th style={thStyle}>START TIME</th>
                <th style={thStyle}>END TIME</th>
                <th style={thStyle}>SHIFT</th>
                <th style={thStyle}>LOCATION CHECKPOINT</th>
                <th style={thStyle}>GPS COORDINATES</th>
                <th style={thStyle}>PHOTO PROOF</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FaClipboardList style={{ fontSize: '36px', color: '#cbd5e1' }} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO PATROL LOGS FOUND</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search filters or selected date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    
                    {/* Officer / PIC Security */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#0f172a',
                          color: '#ffdb3b',
                          border: '1px solid #ffdb3b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '800'
                        }}>
                          {log.initial}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{log.officer}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>Security Duty</div>
                        </div>
                      </div>
                    </td>

                    {/* Start Time */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.startTimeStr}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{log.startDateStr}</div>
                    </td>

                    {/* End Time */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.endTimeStr}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>{log.endDateStr}</div>
                    </td>

                    {/* Shift */}
                    <td style={tdStyle}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', border: '1px solid #cbd5e1' }}>
                        {log.shift}
                      </span>
                    </td>

                    {/* Location Checkpoint */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FaMapMarkerAlt style={{ color: '#ef4444', fontSize: '14px' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{log.station}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Verified: {log.timeStr}</div>
                        </div>
                      </div>
                    </td>

                    {/* Coordinates */}
                    <td style={tdStyle}>
                      <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', color: '#334155', fontWeight: '700' }}>
                        {log.coord}
                      </code>
                    </td>

                    {/* Photo Proof */}
                    <td style={tdStyle}>
                      {log.photo ? (
                        <button
                          onClick={() => {
                            const imgUrl = log.photo.startsWith('http') ? log.photo : `/uploads/${log.photo.replace(/^\/+uploads\/+/, '')}`;
                            setProofIndex(0);
                            setActiveProof({
                              name: log.station,
                              proofs: [{
                                img: imgUrl,
                                guard: log.officer,
                                id: log.id,
                                time: log.timeStr,
                                date: log.formattedDate
                              }]
                            });
                          }}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#2563eb',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <FaCamera /> View Photo
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>No Photo</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={tdStyle}>
                      <span style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <FaCheckCircle /> {log.status}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FOOTER STATS ── */}
      <div style={{
        padding: '12px 24px',
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '600'
      }}>
        <span>Total Logs: <strong>{filteredLogs.length}</strong> {filteredLogs.length !== logs.length && `(Filtered from ${logs.length})`}</span>
        <span>Security Station Gateway Command Center</span>
      </div>

      {/* ── AI VERIFIED PROOF MODAL (MATCHING MAP STYLE) ── */}
      <ProofModal
        activeProof={activeProof}
        setActiveProof={setActiveProof}
        proofIndex={proofIndex}
        setProofIndex={setProofIndex}
        currentTime={new Date().toLocaleTimeString('id-ID')}
      />
    </div>
  );
}

export default PatrolLogsView;

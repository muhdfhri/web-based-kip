import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaCamera, FaCheckCircle, FaFilter, FaSync, FaArrowLeft, FaFileExcel, FaPlay } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import ProofModal from '../../components/ProofModal.jsx';

function PatrolLogsView({ onBack, onReplaySession }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('ALL');
  const [selectedOfficer, setSelectedOfficer] = useState('ALL');
  
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

        const roundNum = item.round_number || 1;
        const totalMaster = parseInt(item.total_master_stations || stations.length || 20, 10);
        const orderDone = parseInt(item.checkpoint_order || 1, 10);
        const sessionTotal = parseInt(item.session_total_scanned || orderDone, 10);
        const pct = totalMaster > 0 ? Math.min(100, Math.round((orderDone / totalMaster) * 100)) : 0;

        parsedLogs.push({
          id: item.id || Math.random(),
          sessionId: item.session_id,
          dateObj: verifiedAt,
          dateStr: verifiedAt.toISOString().split('T')[0],
          timeStr: formatTime(verifiedAt),
          formattedDate: formatDate(verifiedAt),
          startTimeStr: formatTime(startAt),
          startDateStr: formatDate(startAt),
          endTimeStr: formatTime(completeAt),
          endDateStr: formatDate(completeAt),
          shift: item.shift || '-',
          roundNum,
          orderDone,
          sessionTotal,
          totalMaster,
          progressPct: pct,
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
  }, [fromDate, toDate, isAllData, stations.length]);

  const exportToExcel = () => {
    if (filteredLogs.length === 0) return alert("No logs to export");
    const exportData = filteredLogs.map((log, index) => ({
      "No": index + 1,
      "PIC Security": log.officer,
      "Shift": log.shift,
      "Round": `Round ${log.roundNum}`,
      "Checkpoint Progress": `${log.orderDone}/${log.totalMaster} (${log.progressPct}%)`,
      "Start Time": log.startTimeStr !== '-' ? `${log.startDateStr} ${log.startTimeStr}` : '-',
      "End Time": log.endTimeStr !== '-' ? `${log.endDateStr} ${log.endTimeStr}` : '-',
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

  // Unique officers present in logs
  const officerList = Array.from(new Set(logs.map(l => l.officer).filter(Boolean))).sort();

  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.officer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.station.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.shift && log.shift.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `round ${log.roundNum}`.includes(searchQuery.toLowerCase()) ||
      log.coord.toLowerCase().includes(searchQuery.toLowerCase());

    const stationMatch = selectedStation === 'ALL' || log.station === selectedStation;
    const officerMatch = selectedOfficer === 'ALL' || log.officer === selectedOfficer;

    return searchMatch && stationMatch && officerMatch;
  });

  const thStyle = {
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: '800',
    color: '#475569',
    letterSpacing: '0.05em',
    textTransform: 'uppercase'
  };

  const tdStyle = {
    padding: '12px 14px',
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

      {/* ── TOP KPI SUMMARY CARDS ── */}
      {(() => {
        const totalMaster = stations.length > 0 ? stations.length : (logs[0]?.totalMaster || 25);
        // Use filteredLogs for KPI cards so filters accurately reflect on metrics
        const targetLogs = (selectedOfficer !== 'ALL' || selectedStation !== 'ALL') ? filteredLogs : logs;
        
        const uniqueSessions = new Set(targetLogs.map(l => l.sessionId).filter(Boolean));
        const totalRounds = uniqueSessions.size || (targetLogs.length > 0 ? 1 : 0);
        
        // Count distinct officers in the current view
        const activeOfficers = Array.from(new Set(targetLogs.map(l => l.officer).filter(Boolean)));
        
        // Count rounds that reached 100%
        const completedRounds = Array.from(uniqueSessions).filter(sid => {
          const sessLogs = targetLogs.filter(l => l.sessionId === sid);
          return sessLogs.some(l => l.progressPct >= 100 || l.orderDone >= totalMaster);
        }).length;

        const totalScanned = targetLogs.length;

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            padding: '12px 24px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Master Checkpoints</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalMaster}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Active Stations</span>
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {selectedOfficer !== 'ALL' ? `Rounds (${selectedOfficer})` : 'Total Patrol Rounds'}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalRounds}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>({completedRounds} Selesai 100%)</span>
                {selectedOfficer === 'ALL' && activeOfficers.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: '700', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>
                    {activeOfficers.length} Petugas Aktif
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Checkpoints Verified</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{totalScanned}</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Scanned Logs</span>
              </div>
            </div>
          </div>
        );
      })()}

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
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }} />
          <input
            type="text"
            placeholder="Search officer, station, shift, round..."
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
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* PIC Security Officer Filter (Opsi B) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7' }}>PIC</span>
            <select
              value={selectedOfficer}
              onChange={e => setSelectedOfficer(e.target.value)}
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
              <option value="ALL">All Officers ({officerList.length})</option>
              {officerList.map(off => (
                <option key={off} value={off}>{off}</option>
              ))}
            </select>
          </div>

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
                <th style={thStyle}>SHIFT & ROUND</th>
                <th style={{ ...thStyle, minWidth: '150px' }}>CHECKPOINT PROGRESS</th>
                <th style={thStyle}>START TIME</th>
                <th style={thStyle}>END TIME</th>
                <th style={thStyle}>LOCATION CHECKPOINT</th>
                <th style={thStyle}>GPS COORDINATES</th>
                <th style={thStyle}>PHOTO PROOF</th>
                <th style={thStyle}>REPLAY</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FaClipboardList style={{ fontSize: '36px', color: '#cbd5e1' }} />
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO PATROL LOGS FOUND</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search filters or selected date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isComplete = log.progressPct >= 100 || log.orderDone >= log.totalMaster;
                  const progressColor = isComplete ? '#10b981' : (log.progressPct >= 50 ? '#0284c7' : '#d97706');
                  const progressBg = isComplete ? '#ecfdf5' : (log.progressPct >= 50 ? '#f0f9ff' : '#fffbeb');
                  const progressBorder = isComplete ? '#a7f3d0' : (log.progressPct >= 50 ? '#bae6fd' : '#fde68a');

                  return (
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

                      {/* Shift & Round */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', border: '1px solid #cbd5e1', width: 'fit-content' }}>
                            {log.shift}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                            Round {log.roundNum}
                          </span>
                        </div>
                      </td>

                      {/* Checkpoint Progress & Percentage */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                              {log.orderDone}/{log.totalMaster}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: progressColor, background: progressBg, padding: '1px 5px', borderRadius: '4px', border: `1px solid ${progressBorder}` }}>
                              {log.progressPct}% {isComplete ? '✓' : ''}
                            </span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${log.progressPct}%`,
                              height: '100%',
                              background: progressColor,
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
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

                    {/* Replay Patrol */}
                    <td style={tdStyle}>
                      {log.sessionId ? (
                        <button
                          onClick={() => onReplaySession && onReplaySession(log.sessionId)}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          title={`Replay patrol round ${log.roundNum} by ${log.officer}`}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#38bdf8';
                            e.currentTarget.style.color = '#0f172a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#0f172a';
                            e.currentTarget.style.color = '#38bdf8';
                          }}
                        >
                          <FaPlay style={{ fontSize: '9px' }} /> Replay
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>-</span>
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
                  );
                })
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

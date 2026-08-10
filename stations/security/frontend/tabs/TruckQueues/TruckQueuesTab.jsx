import React, { useState, useEffect } from 'react';
import { FaTruck, FaClock, FaSearch, FaFilter, FaCamera, FaChevronRight, FaPrint, FaVolumeUp } from 'react-icons/fa';

function TruckQueuesTab() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch('/api/security/queues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      const dataList = Array.isArray(json) ? json : (json.data || json.queues || []);
      setQueues(dataList);
    } catch (err) {
      console.error('Failed to fetch queues:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Web Audio Chime Sound (Ding Before Speech) ──
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note chime
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('[AudioChime] Error playing chime:', e);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 4000);

    // Audio unlock listener for browser autoplay policy
    const unlockAudio = () => {
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') ctx.resume();
        }
      } catch (e) {}
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // WebSocket listener with auto-reconnect for real-time speaker audio call & queue updates
    let ws;
    let reconnectTimer;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:3200/ws`;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => console.log('[WS Web Base] Connected to queue speaker channel');
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const evtName = (payload.event || '').toLowerCase();
            if (evtName === 'queue_called' || evtName === 'queue_call' || evtName === 'truck_queue_called') {
              if (payload.data) {
                announceQueue(payload.data);
                fetchQueues();
              }
            } else if (evtName.includes('queue') || evtName.includes('truck') || evtName.includes('update') || evtName.includes('create') || evtName.includes('delete')) {
              fetchQueues();
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimer = setTimeout(connectWs, 3000);
          }
        };
        ws.onerror = () => {
          try { ws.close(); } catch (e) {}
        };
      } catch (e) {
        if (!isDisposed) reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      isDisposed = true;
      clearInterval(interval);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
    };
  }, []);

  // ── Helper to resolve photo proof URLs ──
  const getPhotoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    const host = window.location.hostname || 'localhost';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const u = new URL(url);
        return `http://${host}:3101${u.pathname}`;
      } catch (e) {
        return url;
      }
    }
    return `http://${host}:3101${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // ── Web Speech API (TTS Voice Call) ──
  const announceQueue = (q) => {
    if (!q) return;
    playChime();

    if (!('speechSynthesis' in window)) return;

    // Helper functions for spelling code and plate digit by digit / letter by letter
    const spellCode = (code = '') => {
      if (!code) return '';
      const prefix = code[0] || '';
      const digits = code.slice(1);
      const digitMap = { '0': 'nol', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat', '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan' };
      const spelledDigits = digits.split('').map(d => digitMap[d] || d).join(' ');
      return `${prefix} ${spelledDigits}`;
    };

    const spellPlate = (plate = '') => {
      return plate.split('').map(c => c === ' ' ? ', ' : c).join(' ');
    };

    const code = spellCode(q.queueCode || q.queue_number || q.ticket_number || '');
    const driver = q.driverName || q.driver_name || '';
    const plate = spellPlate(q.licensePlate || q.plate_number || '');

    const text = `Nomor antrian ${code}, ${driver}, plat nomor ${plate}, silakan menuju timbangan.`;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.88; // Slightly slower for clarity
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('[WebSpeech] Error playing utterance:', e);
    }
  };

  const handleStatusUpdate = async (id, newStatus, itemData = null) => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/security/queues/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        if (newStatus === 'WEIGH_IN' && itemData) {
          announceQueue(itemData);
        }
        fetchQueues();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredQueues = queues.filter(q => {
    const status = (q.status || q.status_code || 'WAITING').toUpperCase();
    if (activeTab === 'WAITING' && status !== 'WAITING') return false;
    if (activeTab === 'WEIGHIN' && status !== 'WEIGH_IN' && status !== 'GRADING') return false;
    if (activeTab === 'COMPLETED' && status !== 'COMPLETED' && status !== 'CHECKED_OUT') return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const plate = (q.licensePlate || q.plate_number || '').toLowerCase();
    const code = (q.queueCode || q.queue_number || '').toLowerCase();
    const driver = (q.driverName || q.driver_name || '').toLowerCase();
    const doNo = (q.noDo || q.no_do || '').toLowerCase();
    const company = (q.perusahaan || q.transporterCompany || '').toLowerCase();

    return plate.includes(query) || code.includes(query) || driver.includes(query) || doNo.includes(query) || company.includes(query);
  });

  // Calculate Metrics
  const totalCount = queues.length;
  const waitingCount = queues.filter(q => (q.status || '').toUpperCase() === 'WAITING').length;
  const weighinCount = queues.filter(q => ['WEIGH_IN', 'GRADING'].includes((q.status || '').toUpperCase())).length;
  const completedCount = queues.filter(q => ['COMPLETED', 'CHECKED_OUT'].includes((q.status || '').toUpperCase())).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748b', fontFamily: 'system-ui' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.05em' }}>LOADING LIVE QUEUE SYSTEM...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="som-view-container" style={{ padding: '0', background: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      
      {/* ── TOP INDUSTRIAL STATS BAR (FLUSH FULL-WIDTH ALIGNMENT) ── */}
      <div style={{
        padding: '16px 20px',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexShrink: 0,
        boxSizing: 'border-box',
        width: '100%'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          width: '100%'
        }}>
          {/* Metric 1 */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaTruck />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TOTAL REGISTERED</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', lineHeight: '1.2' }}>{totalCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Trucks</span></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div style={{ background: '#f8fafc', border: '1px solid #fef08a', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#fefce8', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaClock />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WAITING IN QUEUE</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#b45309', lineHeight: '1.2' }}>{waitingCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#d97706' }}>Pending</span></div>
            </div>
          </div>

          {/* Metric 3 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bae6fd', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaVolumeUp />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', letterSpacing: '0.05em', textTransform: 'uppercase' }}>WEIGH-IN / GRADING</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0369a1', lineHeight: '1.2' }}>{weighinCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#0284c7' }}>Active</span></div>
            </div>
          </div>

          {/* Metric 4 */}
          <div style={{ background: '#f8fafc', border: '1px solid #bbf7d0', borderRadius: '0px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '0px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <FaChevronRight />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>COMPLETED TODAY</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d', lineHeight: '1.2' }}>{completedCount} <span style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a' }}>Finished</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (FULL-WIDTH 100% WITHOUT SIDE SPACE) ── */}
      <div style={{ padding: '16px 0px', flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '0px',
          borderLeft: 'none',
          borderRight: 'none',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>

          {/* ── HEADER FILTER & SEARCH BAR ── */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            background: '#ffffff'
          }}>
            {/* Title & Live Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                TRUCK QUEUE MANAGEMENT
              </span>
              <span style={{ fontSize: '10px', fontWeight: '800', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                LIVE MONITORING
              </span>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '13px' }} />
                <input
                  type="text"
                  placeholder="Search Plate, Ticket, Driver, DO..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    padding: '8px 14px 8px 36px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    outline: 'none',
                    width: '260px',
                    transition: 'all 0.2s'
                  }}
                />
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
                {[
                  { key: 'ALL', label: 'ALL QUEUES' },
                  { key: 'WAITING', label: 'WAITING' },
                  { key: 'WEIGHIN', label: 'WEIGH-IN' },
                  { key: 'COMPLETED', label: 'COMPLETED' }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      background: activeTab === t.key ? '#0f172a' : 'transparent',
                      color: activeTab === t.key ? '#ffffff' : '#64748b',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '800',
                      letterSpacing: '0.03em',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── TABLE CONTAINER ── */}
          <div style={{ flex: '1', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                <tr>
                  <th style={thStyle}>CHECK-IN TIME</th>
                  <th style={thStyle}>TICKET NO.</th>
                  <th style={thStyle}>LICENSE PLATE</th>
                  <th style={thStyle}>DRIVER NAME</th>
                  <th style={thStyle}>SIM NO.</th>
                  <th style={thStyle}>DO NUMBER</th>
                  <th style={thStyle}>COMPANY / VENDOR</th>
                  <th style={thStyle}>CLASSIFICATION</th>
                  <th style={thStyle}>PHOTO PROOF</th>
                  <th style={thStyle}>QUEUE STATUS</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueues.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <FaTruck style={{ fontSize: '32px', color: '#cbd5e1' }} />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>NO TRUCK QUEUE RECORDS FOUND</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Try adjusting your search query or filter tab</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueues.map((q, idx) => {
                    const checkInDate = q.checkInAt || q.check_in_at;
                    const queueCode = q.queueCode || q.queue_number;
                    const plate = q.licensePlate || q.plate_number;
                    const driver = q.driverName || q.driver_name || '-';
                    const sim = q.noSim || q.no_sim || '-';
                    const doNo = q.noDo || q.no_do || '-';
                    const company = q.perusahaan || q.transporterCompany || q.transporter_company || '-';
                    const classCode = q.classificationCode || q.classification_name || '-';
                    const photo = q.driverPhoto || q.driver_photo;
                    const status = (q.status || 'WAITING').toUpperCase();

                    return (
                      <tr key={q.id || queueCode || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', transition: 'background 0.15s' }}>
                        
                        {/* Check-in Time */}
                        <td style={tdStyle}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                            {checkInDate ? new Date(checkInDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':') + ' WIB' : '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                            {checkInDate ? new Date(checkInDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </td>

                        {/* Ticket Code */}
                        <td style={tdStyle}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: '900',
                            color: '#b45309',
                            background: '#fef3c7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fde68a'
                          }}>
                            {queueCode}
                          </span>
                        </td>

                        {/* License Plate */}
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '900',
                            color: '#0f172a',
                            letterSpacing: '0.03em',
                            background: '#f1f5f9',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1'
                          }}>
                            {plate}
                          </span>
                        </td>

                        {/* Driver */}
                        <td style={{ ...tdStyle, fontWeight: '700', color: '#0f172a' }}>{driver}</td>

                        {/* SIM */}
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{sim}</td>

                        {/* DO */}
                        <td style={{ ...tdStyle, fontSize: '12px', fontWeight: '700', color: '#0284c7' }}>{doNo}</td>

                        {/* Company */}
                        <td style={{ ...tdStyle, fontSize: '12px', color: '#475569', fontWeight: '600' }}>{company}</td>

                        {/* Classification */}
                        <td style={tdStyle}>
                          {(() => {
                            const classMap = {
                              'U': 'FFB UMUM',
                              'M': 'FFB MITRA',
                              'C': 'CRUDE PALM OIL',
                              'K': 'PALM KERNEL',
                              'S': 'PALM KERNEL SHELL'
                            };
                            const label = classMap[classCode] || (q.classification_name && q.classification_name !== classCode ? q.classification_name : '');
                            const text = label ? `${classCode} - ${label}` : classCode;
                            return (
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                background: '#0f172a',
                                color: '#fbbf24',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                letterSpacing: '0.02em',
                                display: 'inline-block'
                              }}>
                                {text}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Photo */}
                        <td style={tdStyle}>
                          {photo ? (
                            <button
                              onClick={() => setSelectedPhoto(photo)}
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <img 
                                src={getPhotoUrl(photo)} 
                                alt="Proof" 
                                style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569', paddingRight: '4px' }}>View</span>
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: '600' }}>No Photo</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '900',
                            letterSpacing: '0.04em',
                            background: status === 'WAITING' ? '#fefce8' : status === 'WEIGH_IN' || status === 'GRADING' ? '#e0f2fe' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '#dcfce7' : '#f1f5f9',
                            color: status === 'WAITING' ? '#b45309' : status === 'WEIGH_IN' || status === 'GRADING' ? '#0369a1' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '#15803d' : '#64748b',
                            border: status === 'WAITING' ? '1px solid #fde68a' : status === 'WEIGH_IN' || status === 'GRADING' ? '1px solid #bae6fd' : status === 'COMPLETED' || status === 'CHECKED_OUT' ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                          }}>
                            {status}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {status === 'WAITING' && (
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'WEIGH_IN', q)}
                                title="Call truck to weigh bridge speaker"
                                style={{
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  letterSpacing: '0.02em',
                                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
                                  transition: 'all 0.15s',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <FaVolumeUp style={{ fontSize: '11px' }} />
                                CALL WEIGH-IN
                              </button>
                            )}

                            {status === 'WEIGH_IN' && (
                              <>
                                <button
                                  onClick={() => handleStatusUpdate(q.id, 'COMPLETED')}
                                  style={{
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  COMPLETE
                                </button>
                                <button
                                  onClick={() => announceQueue(q)}
                                  title="Repeat speaker call"
                                  style={{
                                    background: '#fff7ed',
                                    color: '#ea580c',
                                    border: '1px solid #ffedd5',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <FaVolumeUp />
                                  RE-CALL
                                </button>
                              </>
                            )}

                            {status === 'GRADING' && (
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'COMPLETED')}
                                style={{
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  letterSpacing: '0.02em',
                                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                                  transition: 'all 0.15s'
                                }}
                              >
                                COMPLETE
                              </button>
                            )}

                            {(status === 'COMPLETED' || status === 'CHECKED_OUT') && (
                              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>DONE</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PHOTO PROOF LIGHTBOX MODAL ── */}
      {selectedPhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.04em' }}>DRIVER / TRUCK PHOTO PROOF</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{ background: '#f1f5f9', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <div style={{ width: '100%', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
              <img src={getPhotoUrl(selectedPhoto)} alt="Driver Proof" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'contain' }} />
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
            >
              CLOSE PREVIEW
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const thStyle = {
  padding: '12px 14px',
  fontSize: '10px',
  fontWeight: '900',
  color: '#475569',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '12px 14px',
  fontSize: '12px',
  whiteSpace: 'nowrap'
};

export default TruckQueuesTab;

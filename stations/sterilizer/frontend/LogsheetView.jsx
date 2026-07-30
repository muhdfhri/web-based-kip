import React, { useState, useEffect } from 'react';

const SCORE_COLUMNS = [
  { key: 'deaeration_temp', label: 'Deaer.', stepNum: 1 },
  { key: 'peak1_press', label: 'Pk 1', stepNum: 2 },
  { key: 'peak2_press', label: 'Pk 2', stepNum: 4 },
  { key: 'peak3_press', label: 'Pk 3', stepNum: 6 },
  { key: 'holding_press', label: 'Hld 1', stepNum: 7 },
  { key: 'blow1_temp', label: 'Blw 1', stepNum: 8 },
  { key: 'holding2_press', label: 'Hld 2', stepNum: 9 },
  { key: 'blow2_temp', label: 'Blw 2', stepNum: 10 },
  { key: 'holding3_press', label: 'Hld 3', stepNum: 11 },
  { key: 'blow3_temp', label: 'Blw 3', stepNum: 12 },
  { key: 'holding4_press', label: 'Hld 4', stepNum: 13 },
  { key: 'blowdown_time', label: 'Blowd.', stepNum: 14 },
  { key: 'exhaust_time', label: 'Exh.', stepNum: 15 },
];

export default function LogsheetView({ stationSlug = 'sterilizer' }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load logsheet data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [date, stationSlug]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('kip_token');
      const res = await fetch(`/api/${stationSlug}/logsheet/export-excel?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Logsheet_Sterilizer_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Gagal Export: " + e.message);
    }
  };

  return (
    <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: 'bold' }}>Automatic Sterilizer Logsheet</h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0 12px' }}>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              style={{ border: 'none', outline: 'none', padding: '8px 0', color: '#334155', fontWeight: '500' }}
            />
          </div>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
            Refresh
          </button>
          <button 
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Export
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <thead>
              {/* Super Header */}
              <tr style={{ background: '#FCD200', color: '#1e293b' }}>
                <th colSpan="4" style={{ padding: '6px 4px', borderRight: '1px solid #ca8a04' }}>CYCLE INFO</th>
                <th colSpan="1" style={{ padding: '6px 4px', borderRight: '1px solid #ca8a04', background: '#facc15' }}>LOADING</th>
                <th colSpan="13" style={{ padding: '6px 4px', borderRight: '1px solid #ca8a04', background: '#FCD200' }}>13 SCORE LOGICS (DURATIONS)</th>
                <th colSpan="1" style={{ padding: '6px 4px', background: '#facc15' }}>UNLOADING</th>
              </tr>
              {/* Sub Header */}
              <tr style={{ background: '#fef9c3', color: '#854d0e', borderBottom: '2px solid #fde047' }}>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #fef08a' }}>Line</th>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #fef08a' }}>Cycle</th>
                <th style={{ padding: '6px 4px', borderRight: '1px solid #fef08a' }}>Start</th>
                <th style={{ padding: '6px 4px', borderRight: '2px solid #fde047' }}>End</th>

                <th style={{ padding: '6px 4px', borderRight: '2px solid #fde047' }}>Inlet</th>
                
                {SCORE_COLUMNS.map((col, idx) => (
                  <th key={col.key} style={{ padding: '6px 4px', borderRight: idx === 12 ? '2px solid #fde047' : '1px solid #fef08a' }}>
                    {col.label}
                  </th>
                ))}
                
                <th style={{ padding: '6px 4px' }}>Outlet</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="19" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="19" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No cycles recorded on this date.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const door = row.door_details || {};
                  const cycleData = typeof row.cycle_data === 'string' ? JSON.parse(row.cycle_data || '{}') : (row.cycle_data || {});
                  const stepDetails = typeof row.step_details === 'string' ? JSON.parse(row.step_details || '[]') : (row.step_details || []);
                  const dId = row.device_id;

                  // Compute Scores based on durations
                  const scores = SCORE_COLUMNS.map(col => {
                     const st = stepDetails.find(s => s.step === col.stepNum);
                     const actual = st ? st.duration : 0;
                     let target = cycleData[`settings_score_logic_line_${dId}_${col.key}_target__TARGET`] 
                                  || cycleData[`settings_score_logic_${col.key}_target`] || 0;
                     let score = cycleData[`settings_score_logic_line_${dId}_${col.key}_score__SCORE`]
                                 || cycleData[`settings_score_logic_${col.key}_score`];
                                 
                     if (score === undefined || score === null || score === '-') {
                         const t = Number(target)||0;
                         const a = Number(actual)||0;
                         if (t <= 0 || a <= 0) score = 0;
                         else {
                             score = Math.max(0, Math.round((1 - Math.abs(a - t) / t) * 100));
                         }
                     }
                     return { ...col, actual, target, score };
                  });

                  return (
                    <React.Fragment key={row.id}>
                      {/* Row 1: The Actual Logsheet Values */}
                      <tr style={{ borderTop: '4px solid #e2e8f0', background: '#fff' }}>
                        <td rowSpan="3" style={{ padding: '6px 4px', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', fontSize: '14px', color: '#0f172a', verticalAlign: 'top', paddingTop: '16px' }}>
                          L{dId}
                        </td>
                        <td style={{ padding: '6px 4px', borderRight: '1px solid #e2e8f0', fontWeight: 'bold', color: '#334155' }}>#{row.cycle_number}</td>
                        <td style={{ padding: '6px 4px', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{new Date(row.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '6px 4px', borderRight: '2px solid #cbd5e1', color: '#64748b' }}>{new Date(row.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>

                        <td style={{ padding: '6px 4px', borderRight: '2px solid #cbd5e1', fontWeight: 'bold', color: '#0ea5e9' }}>
                          {door.inlet?.duration ? `${door.inlet.duration}s (${Math.floor(door.inlet.duration/60)}m)` : '-'}
                        </td>

                        {scores.map((s, cIdx) => (
                          <td key={s.key} style={{ padding: '6px 4px', borderRight: cIdx === 12 ? '2px solid #cbd5e1' : '1px solid #e2e8f0', color: '#334155', fontWeight: '500' }}>
                            {s.actual > 0 ? `${s.actual}s (${Math.floor(s.actual/60)}m)` : '-'}
                          </td>
                        ))}

                        <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#0ea5e9' }}>
                          {door.outlet?.duration ? `${door.outlet.duration}s (${Math.floor(door.outlet.duration/60)}m)` : '-'}
                        </td>
                      </tr>

                      {/* Row 2: Target & Score */}
                      <tr style={{ background: '#fff' }}>
                        <td colSpan="3" style={{ padding: '2px 4px', textAlign: 'right', fontSize: '10px', color: '#94a3b8', borderRight: '2px solid #cbd5e1' }}>
                          Target:
                        </td>
                        <td style={{ padding: '2px 4px', borderRight: '2px solid #cbd5e1', fontSize: '10px', color: '#94a3b8' }}>-</td>
                        {scores.map((s, cIdx) => (
                          <td key={`tgt-${s.key}`} style={{ padding: '2px 4px', borderRight: cIdx === 12 ? '2px solid #cbd5e1' : '1px solid #f1f5f9', fontSize: '10px', color: '#94a3b8' }}>
                            {s.target > 0 ? `${s.target}s` : '-'}
                          </td>
                        ))}
                        <td style={{ padding: '2px 4px', fontSize: '10px', color: '#94a3b8' }}>-</td>
                      </tr>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                        <td colSpan="3" style={{ padding: '4px 6px', textAlign: 'right', fontStyle: 'italic', color: '#64748b', fontSize: '11px', borderRight: '2px solid #cbd5e1' }}>
                          Score Logics (0-100)
                        </td>
                        <td style={{ borderRight: '2px solid #cbd5e1' }}></td>
                        {scores.map((s, cIdx) => (
                          <td key={`score_${s.key}`} style={{ padding: '4px 6px', borderRight: cIdx === 12 ? '2px solid #cbd5e1' : '1px solid #e2e8f0', color: '#059669', fontWeight: 'bold', fontSize: '11px' }}>
                            {s.score}
                          </td>
                        ))}
                        <td></td>
                      </tr>

                      {/* Row 3: Global Metrics & Parameters */}
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <td colSpan="18" style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                            
                            {/* Global Performance Metrics */}
                            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 'bold', padding: '4px 8px', textAlign: 'center', fontSize: '11px', borderBottom: '2px solid #fbbf24' }}>
                                GLOBAL PERFORMANCE METRICS
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef3c7', fontWeight: 'bold', width: '20%', color: '#92400e' }}>FFB</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '500' }}>FFB loading in/out</td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span style={{ fontWeight: 'bold' }}>1200 <small style={{color: '#94a3b8', fontWeight:'normal'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span>{cycleData['settings_score_logic_ffb_loading_actual'] || '0'} <small style={{color: '#94a3b8'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fffbeb' }}>{cycleData['settings_score_logic_ffb_loading_score'] || '0'}%</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#92400e' }}>T_Ster</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '500' }}>Target Sterilization Time</td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span style={{ fontWeight: 'bold' }}>6690 <small style={{color: '#94a3b8', fontWeight:'normal'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span>{cycleData['settings_score_logic_target_ster_time_actual'] || '0'} <small style={{color: '#94a3b8'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fffbeb' }}>{cycleData['settings_score_logic_target_ster_time_score'] || '0'}%</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#92400e' }}>T_Cyc</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '500' }}>Target Cycle Time</td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span style={{ fontWeight: 'bold' }}>7890 <small style={{color: '#94a3b8', fontWeight:'normal'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                       <span>{cycleData['settings_score_logic_target_cyc_time_actual'] || '0'} <small style={{color: '#94a3b8'}}>s</small></span>
                                    </td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fffbeb' }}>{cycleData['settings_score_logic_target_cyc_time_score'] || '0'}%</td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '4px 8px', backgroundColor: '#fef3c7', fontWeight: 'bold', color: '#92400e' }}>Tput</td>
                                    <td style={{ padding: '4px 8px', color: '#1e293b', fontWeight: '500' }}>Throughput</td>
                                    <td style={{ padding: '4px', textAlign: 'center' }}>
                                       <span style={{ fontWeight: 'bold' }}>22.8 <small style={{color: '#94a3b8', fontWeight:'normal'}}>mt/hr</small></span>
                                    </td>
                                    <td style={{ padding: '4px', textAlign: 'center' }}>
                                       <span>{cycleData['settings_score_logic_throughput_rate_actual'] || '0.0'} <small style={{color: '#94a3b8'}}>mt/hr</small></span>
                                    </td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 'bold', color: '#b45309', backgroundColor: '#fffbeb' }}>{cycleData['settings_score_logic_throughput_rate_score'] || '0'}%</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Global Parameters */}
                            <div style={{ flex: 1.5, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ backgroundColor: '#fef08a', color: '#1e293b', fontWeight: 'bold', padding: '4px 8px', textAlign: 'left', fontSize: '11px', borderBottom: '2px solid #fbbf24' }}>
                                GLOBAL PARAMETERS
                              </div>
                              <div style={{ display: 'flex', padding: '6px', gap: '6px', flex: 1 }}>
                                {/* CAPACITY SETTINGS */}
                                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                                  <div style={{ color: '#b45309', fontWeight: 'bold', fontSize: '10px', marginBottom: '8px' }}>CAPACITY SETTINGS</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#475569', fontWeight: '600' }}><span>Sterilizer Design Cap.</span><span style={{ color: '#0f172a' }}>50 <small style={{color:'#94a3b8', fontWeight: 'normal'}}>ton</small></span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#475569', fontWeight: '600' }}><span>No. of Sterilizer</span><span style={{ color: '#0f172a' }}>2 <small style={{color:'#94a3b8', fontWeight: 'normal'}}>unit</small></span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#475569', fontWeight: '600' }}><span>Mill Design Cap.</span><span style={{ color: '#0f172a' }}>45.0 <small style={{color:'#94a3b8', fontWeight: 'normal'}}>mt/hr</small></span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', fontWeight: '600' }}><strong>Actual Throughput</strong><span style={{ color: '#0f172a' }}>{cycleData['settings_capacity_actual_throughput'] || '0'} <small style={{color:'#94a3b8', fontWeight: 'normal'}}>mt/hr</small></span></div>
                                </div>

                                {/* SCORE PERFORMANCE */}
                                <div style={{ flex: 1, border: '1px solid #fde68a', borderRadius: '4px', padding: '8px', backgroundColor: '#fffbeb' }}>
                                  <div style={{ color: '#b45309', fontWeight: 'bold', fontSize: '10px', marginBottom: '8px' }}>SCORE PERFORMANCE</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px' }}><strong style={{color: '#92400e'}}>Sterilization Score</strong><strong style={{ color: '#b45309' }}>{cycleData['settings_score_perf_steril'] || '0'}%</strong></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px' }}><strong style={{color: '#92400e'}}>Lead time Score</strong><strong style={{ color: '#b45309' }}>{cycleData['settings_score_perf_lead_time'] || '0'}%</strong></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}><strong style={{color: '#92400e'}}>Throughput Score</strong><strong style={{ color: '#b45309' }}>{cycleData['settings_score_perf_throughput'] || '0'}%</strong></div>
                                </div>

                                {/* OVER LIMIT TOLERANCES */}
                                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '4px', padding: '8px' }}>
                                  <div style={{ color: '#b45309', fontWeight: 'bold', fontSize: '10px', marginBottom: '8px' }}>OVER LIMIT TOLERANCES</div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px', color: '#475569', fontWeight: '600' }}><span>Over Limit (Time)</span><span style={{ color: '#0f172a' }}>300 <small style={{color:'#94a3b8', fontWeight: 'normal'}}>s</small></span></div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569', fontWeight: '600' }}><span>Over Limit (Score)</span><span style={{ color: '#0f172a' }}>300 <small style={{color:'#94a3b8', fontWeight: 'normal'}}>%</small></span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

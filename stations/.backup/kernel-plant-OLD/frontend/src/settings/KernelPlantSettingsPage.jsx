import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './KernelPlantSettingsModal.css'
import '../KernelStationPage.css'

// Internal Component for the Silo Diagram - Updated for Light Theme
const SiloDiagram = ({ status }) => {
  const isActive = status === 'running';
  return (
    <svg viewBox="0 0 120 180" className="som-silo-svg">
      {/* Upper Hopper/Funnel */}
      <path d="M 10 10 L 110 10 L 90 40 L 30 40 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1" />
      {/* Main Container Body */}
      <rect x="20" y="40" width="80" height="90" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
      <line x1="20" y1="55" x2="100" y2="55" stroke="#e5e7eb" strokeWidth="1" />
      <line x1="20" y1="115" x2="100" y2="115" stroke="#e5e7eb" strokeWidth="1" />
      {/* Bottom Funnel */}
      <path d="M 20 130 L 100 130 L 80 150 L 40 150 Z" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" />
      {/* Motor/Blower Detail on the right */}
      <rect x="100" y="105" width="15" height="12" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1" />
      <circle cx="115" cy="111" r="5" fill={isActive ? "#2563eb" : "#9ca3af"} stroke="#1e293b" strokeWidth="1" />
      {/* Status Interior */}
      {isActive && (
        <circle cx="60" cy="85" r="15" fill="rgba(37, 99, 235, 0.1)">
          <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="60" cy="85" r="8" fill={isActive ? "#3b82f6" : "#cbd5e1"} stroke="#64748b" strokeWidth="1" />
    </svg>
  );
};

function KernelPlantSettingsPage({ onSelectSubmenu }) {
  const [overallSettings] = useState({
    totalLoad: 29.2,
    lowSPs: [7.0, 7.0, 7.0, 7.0],
    highSPs: [22.0, 22.0, 22.0, 22.0],
    mills: [
      { name: 'Ripple Mill No.1', pv: 0.0, load: 0.0, status: 'idle' },
      { name: 'Ripple Mill No.2', pv: 0.0, load: 0.0, status: 'idle' },
      { name: 'Ripple Mill No.3', pv: 11.3, load: 29.2, status: 'running' },
      { name: 'Ripple Mill No.4', pv: 0.0, load: 0.0, status: 'idle' },
    ]
  });

  const initialLtdsState = {
    minFreq: 47.0, maxFreq: 48.0,
    frequencyTable: [
      { range: '0 - 10%', freq: 47.0 }, { range: '10 - 20%', freq: 47.1 },
      { range: '21 - 30%', freq: 47.2 }, { range: '31 - 40%', freq: 47.3 },
      { range: '41 - 50%', freq: 47.4 }, { range: '51 - 60%', freq: 47.6 },
      { range: '61 - 70%', freq: 47.7 }, { range: '71 - 80%', freq: 47.8 },
      { range: '81 - 90%', freq: 47.9 }, { range: '91 - 100%', freq: 48.0 },
    ]
  };

  const [ltds1, setLtds1] = useState({ ...initialLtdsState });
  const [ltds2, setLtds2] = useState({ ...initialLtdsState });

  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const getActiveSettings = (device) => device === 'ltds1' ? ltds1 : ltds2;
  const getSetter = (device) => device === 'ltds1' ? setLtds1 : setLtds2;

  const handleNumericInput = (device, type, index, newValue) => {
    const setter = getSetter(device);
    setter(prev => {
      const updated = { ...prev };
      if (type === 'min') updated.minFreq = newValue;
      else if (type === 'max') updated.maxFreq = newValue;
      else if (type === 'freq') {
        const newTable = [...prev.frequencyTable];
        newTable[index] = { ...newTable[index], freq: newValue };
        updated.frequencyTable = newTable;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
  };

  const renderLtdsCard = (id, title) => {
    const data = getActiveSettings(id);
    return (
      <div className="som-ltds-card">
        <div className="som-ltds-header">
          <span className="som-ltds-badge">{title}</span>
        </div>

        <div className="som-minmax-row">
          <div className="som-minmax-item">
            <span className="som-minmax-label">Min</span>
            <div className="som-freq-input-box" onClick={() => setActiveKeypad({ device: id, type: 'min' })}>
              <input type="text" readOnly value={data.minFreq.toFixed(1)} />
              <span className="som-freq-unit">Hz</span>
            </div>
          </div>
          <div className="som-minmax-item">
            <span className="som-minmax-label">Max</span>
            <div className="som-freq-input-box" onClick={() => setActiveKeypad({ device: id, type: 'max' })}>
              <input type="text" readOnly value={data.maxFreq.toFixed(1)} />
              <span className="som-freq-unit">Hz</span>
            </div>
          </div>
        </div>

        <div className="som-freq-table">
          {data.frequencyTable.map((item, idx) => (
            <div key={idx} className="som-freq-row">
              <span className="som-freq-range">{item.range}</span>
              <div className="som-freq-input-box" onClick={() => setActiveKeypad({ device: id, type: 'freq', index: idx })}>
                <input type="text" readOnly value={item.freq.toFixed(1)} />
                <span className="som-freq-unit">Hz</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="som-kernel-station">
      <header className="som-kernel-station-header">
        <div className="som-header-left">
          <h1 className="som-kernel-station-title">KERNEL PLANT STATION</h1>
          <div className="som-station-tabs">
            <button className="som-station-tab" onClick={() => onSelectSubmenu && onSelectSubmenu('Kernel Plant', 'Overview')}>Overview</button>
          </div>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className="som-view-btn" onClick={() => onSelectSubmenu && onSelectSubmenu('Kernel Plant', 'Process View')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>
          </button>
          <button className="som-view-btn active" onClick={() => {}} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>
      </header>
      <div className="som-kernel-main">
        <div className="som-kernel-layout">
          <div className="som-kernel-page">
            <div className="som-kernel-settings-modal">
              <div className="som-kernel-settings-content">
                {/* Left Monitor Panel */}
                <div className="som-kernel-monitor-panel">
                  <div className="som-monitoring-header">
                    <div className="som-overall-label">Ripple Mill Overall</div>
                    <div className="som-total-load-row">
                      <span className="som-total-load-label">Total Load</span>
                      <div className="som-scada-value-box">
                        <span className="som-scada-value">{overallSettings.totalLoad.toFixed(1)}</span>
                        <span className="som-scada-unit">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="som-sp-section">
                    <div className="som-sp-label-text">Low SP</div>
                    <div className="som-sp-grid">
                      {overallSettings.lowSPs.map((sp, i) => (
                        <div key={i} className="som-scada-value-box">
                          <span className="som-scada-value">{sp.toFixed(1)}</span>
                          <span className="som-scada-unit">A</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="som-sp-section">
                    <div className="som-sp-label-text">High SP</div>
                    <div className="som-sp-grid">
                      {overallSettings.highSPs.map((sp, i) => (
                        <div key={i} className="som-scada-value-box">
                          <span className="som-scada-value">{sp.toFixed(1)}</span>
                          <span className="som-scada-unit">A</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Silo Diagram Section */}
                  <div className="som-silo-diagram-container">
                    {overallSettings.mills.map((mill, i) => (
                      <div key={i} className="som-silo-unit">
                        <SiloDiagram status={mill.status} />
                        <div className="som-mill-info">
                          <div className="som-mill-name">Ripple Mill No.{i + 1}</div>
                          <div className="som-param-row">
                            <span className="som-param-label">PV</span>
                            <div className="som-scada-value-box" style={{ flex: 1, minWidth: 'unset' }}>
                              <span className="som-scada-value">{mill.pv.toFixed(1)}</span>
                              <span className="som-scada-unit">A</span>
                            </div>
                          </div>
                          <div className="som-param-row">
                            <span className="som-param-label">Load</span>
                            <div className="som-scada-value-box" style={{ flex: 1, minWidth: 'unset' }}>
                              <span className="som-scada-value">{mill.load.toFixed(1)}</span>
                              <span className="som-scada-unit">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {renderLtdsCard('ltds1', 'LTDS No.1')}
                {renderLtdsCard('ltds2', 'LTDS No.2')}
              </div>

              <footer className="som-kernel-settings-footer">
                <button
                  className={`som-kernel-settings-btn--save ${isSaving ? 'som-kernel-settings-btn--disabled' : ''}`}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
                </button>
              </footer>

              {activeKeypad && (() => {
                const data = getActiveSettings(activeKeypad.device);
                let currentVal = 0;
                let label = '';
                if (activeKeypad.type === 'min') { currentVal = data.minFreq; label = `${activeKeypad.device.toUpperCase()} - MIN FREQ`; }
                else if (activeKeypad.type === 'max') { currentVal = data.maxFreq; label = `${activeKeypad.device.toUpperCase()} - MAX FREQ`; }
                else if (activeKeypad.type === 'freq') { currentVal = data.frequencyTable[activeKeypad.index].freq; label = `${activeKeypad.device.toUpperCase()} - ${data.frequencyTable[activeKeypad.index].range}`; }

                return (
                  <NumericKeypad
                    value={currentVal}
                    label={label}
                    unit="Hz"
                    onClose={() => setActiveKeypad(null)}
                    onConfirm={(val) => {
                      handleNumericInput(activeKeypad.device, activeKeypad.type, activeKeypad.index, val);
                      setActiveKeypad(null);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => value.toFixed(1))

  const handleNumber = (n) => {
    setDisplayValue(prev => {
      if (prev === '0.0' || prev === '0') return n.toString();
      return prev + n.toString();
    });
  }

  const handleDecimal = () => {
    if (!displayValue.includes('.')) setDisplayValue(displayValue + ".");
  }

  const handleBack = () => {
    setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  }

  const handleEnter = () => {
    onConfirm(parseFloat(displayValue) || 0);
  }

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button className="som-numeric-keypad-close" style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value" style={{ fontSize: '32px', fontWeight: 'bold' }}>{displayValue}</span>
          <span className="som-numeric-keypad-unit" style={{ fontSize: '14px', marginLeft: '8px', color: '#64748b' }}>{unit}</span>
        </div>
        <div className="som-numeric-keypad-grid-modern" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button key={n} onClick={() => handleNumber(n)} className="som-num-btn" style={{ padding: '16px', fontSize: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>{n}</button>
          ))}
          <button onClick={handleDecimal} className="som-num-btn" style={{ padding: '16px', fontSize: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>.</button>
          <button onClick={() => handleNumber(0)} className="som-num-btn" style={{ padding: '16px', fontSize: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>0</button>
          <button onClick={handleBack} className="som-num-btn" style={{ padding: '16px', fontSize: '20px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '12px', cursor: 'pointer' }}>⌫</button>

          <button onClick={() => setDisplayValue('0')} className="som-keypad-action-btn" style={{ gridColumn: 'span 1', padding: '14px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button onClick={handleEnter} className="som-keypad-action-btn" style={{ gridColumn: 'span 2', padding: '14px', background: 'var(--scada-primary)', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default KernelPlantSettingsPage

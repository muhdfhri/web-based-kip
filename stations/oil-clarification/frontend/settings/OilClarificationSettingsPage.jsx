import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './OilClarificationSettingsModal.css';

// Reusable Keypad Component (Same as Boiler/Press/Sterilizer/EFB)
const Keypad = ({ isOpen, onClose, onSave, title, initialValue }) => {
  const [value, setValue] = useState(initialValue?.toString() || '');

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue?.toString() || '');
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleKeyPress = (key) => {
    if (key === 'CLR') {
      setValue('');
    } else if (key === 'DEL') {
      setValue(value.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) setValue(value + '.');
    } else {
      setValue(value + key);
    }
  };

  const handleSave = () => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onSave(num);
    }
    onClose();
  };

  const renderKeypad = () => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div style={{
        background: '#0f172a', border: '2px solid #39FF14',
        borderRadius: '8px', padding: '20px', width: '300px',
        boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)'
      }}>
        <div style={{ color: '#39FF14', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>
          {title}
        </div>
        <div style={{
          background: '#020617', border: '1px solid #334155',
          color: '#e2e8f0', fontSize: '24px', padding: '12px',
          textAlign: 'right', marginBottom: '20px', borderRadius: '4px',
          minHeight: '28px'
        }}>
          {value || '0'}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px'
        }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'DEL'].map((btn) => (
            <button
              key={btn}
              onClick={() => handleKeyPress(btn)}
              style={{
                background: '#1e293b', color: '#fff', border: '1px solid #334155',
                padding: '16px 0', fontSize: '20px', borderRadius: '4px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
              onMouseOut={(e) => e.currentTarget.style.background = '#1e293b'}
            >
              {btn}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={() => handleKeyPress('CLR')}
            style={{
              background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444',
              padding: '12px', fontSize: '16px', borderRadius: '4px', cursor: 'pointer'
            }}
          >
            CLR
          </button>
          <button
            onClick={handleSave}
            style={{
              background: 'rgba(57, 255, 20, 0.2)', color: '#39FF14', border: '1px solid #39FF14',
              padding: '12px', fontSize: '16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            ENTER
          </button>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', background: 'transparent', color: '#94a3b8', border: 'none',
            padding: '12px', marginTop: '10px', cursor: 'pointer', textDecoration: 'underline'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return createPortal(renderKeypad(), document.body);
};

export default function OilClarificationSettingsPage() {
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Default values based on the image
  const [settings, setSettings] = useState({
    spTankHeating: 95,
    spTankBlowdown: 90,
    spOilSkimming: 300,
    decanter: {
      start: 10, running: 4, flushing: 10, shutdown: 10, stop: 10
    },
    cyclone: {
      start: 1, running: 60, flushing: 0.5, shutdown: 1, stop: 1
    },
    activeDecanters: 2
  });

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('oc_plant_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('oc_plant_settings', JSON.stringify(settings));
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const handleKeypadSave = (val) => {
    if (!activeKeypad) return;
    const { section, param } = activeKeypad;

    setSettings(prev => {
      if (section === 'decanter') {
        return { ...prev, decanter: { ...prev.decanter, [param]: val } };
      }
      if (section === 'cyclone') {
        return { ...prev, cyclone: { ...prev.cyclone, [param]: val } };
      }
      return { ...prev, [param]: val };
    });
  };

  // Helper component for values
  const ValBox = ({ value, unit, onClick, decimals = 0 }) => (
    <div className="som-oc-val-box" onClick={onClick}>
      <span className="som-oc-val">{Number(value).toFixed(decimals)}</span>
      {unit && <span className="som-oc-unit">{unit}</span>}
    </div>
  );

  return (
    <section className="som-oc-settings-page">
      <div className="som-oc-content-wrapper">
        
        {/* Left Column */}
        <div className="som-oc-col-left">
          
          {/* Tank Heating */}
          <div className="som-oc-section" data-tour="oc-settings-heating">
            <div className="som-oc-section-body">
              <table className="som-oc-table">
                <thead>
                  <tr>
                    <th className="left-align" style={{ width: '40%' }}>Read</th>
                    <th className="left-align">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="left-align">Tank Heating (COT, CST, ST, SDT)</td>
                    <td className="left-align">Temperature &lt; 95° Valve Opening -1%</td>
                  </tr>
                  <tr>
                    <td className="left-align"></td>
                    <td className="left-align">Temperature = 95° No Action</td>
                  </tr>
                  <tr style={{ background: 'rgba(253, 224, 71, 0.1)' }}>
                    <td className="left-align" style={{ color: '#fde047', fontWeight: 'bold' }}>
                      SP Temperature = <ValBox value={settings.spTankHeating} onClick={() => setActiveKeypad({ section: 'main', param: 'spTankHeating', label: 'Tank Heating SP (°C)' })} />
                    </td>
                    <td className="left-align">Temperature &gt; 95° Valve Opening +1%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Oil Skimming */}
          <div className="som-oc-section" data-tour="oc-settings-skimming">
            <div className="som-oc-section-body">
              <table className="som-oc-table">
                <thead>
                  <tr>
                    <th className="left-align" style={{ width: '40%' }}>Read</th>
                    <th className="left-align">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="left-align">Oil Skimming</td>
                    <td className="left-align">Oil Layer &gt; 300mm Skimmer level +1%</td>
                  </tr>
                  <tr style={{ background: 'rgba(253, 224, 71, 0.1)' }}>
                    <td className="left-align" style={{ color: '#fde047', fontWeight: 'bold' }}>
                      SP Oil Layer = <ValBox value={settings.spOilSkimming} unit="mm" onClick={() => setActiveKeypad({ section: 'main', param: 'spOilSkimming', label: 'Oil Skimming SP (mm)' })} />
                    </td>
                    <td className="left-align">Oil Layer = 300mm No Action</td>
                  </tr>
                  <tr>
                    <td className="left-align"></td>
                    <td className="left-align">Oil Layer &lt; 300mm Skimmer level -1%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Decanter Operation */}
          <div className="som-oc-section" data-tour="oc-settings-decanter">
            <div className="som-oc-section-body">
              <table className="som-oc-table">
                <thead>
                  <tr>
                    <th className="left-align">Decanter Operation</th>
                    <th>Duration</th>
                    <th>Sludge inlet valve</th>
                    <th>Water inlet valve</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="left-align">Start</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.decanter.start} unit="minutes" onClick={() => setActiveKeypad({ section: 'decanter', param: 'start', label: 'Start Duration' })} /></td>
                    <td>Close</td><td>Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Running</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.decanter.running} unit="hours" onClick={() => setActiveKeypad({ section: 'decanter', param: 'running', label: 'Running Duration' })} /></td>
                    <td className="som-oc-highlight-orange">Open</td><td>Close</td>
                  </tr>
                  <tr>
                    <td className="left-align">Flushing</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.decanter.flushing} unit="minutes" onClick={() => setActiveKeypad({ section: 'decanter', param: 'flushing', label: 'Flushing Duration' })} /></td>
                    <td>Close</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Shut-down</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.decanter.shutdown} unit="minutes" onClick={() => setActiveKeypad({ section: 'decanter', param: 'shutdown', label: 'Shutdown Duration' })} /></td>
                    <td>Close</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Stop</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.decanter.stop} unit="minutes" onClick={() => setActiveKeypad({ section: 'decanter', param: 'stop', label: 'Stop Duration' })} /></td>
                    <td>Close</td><td>Close</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sand Cyclone Operation */}
          <div className="som-oc-section" data-tour="oc-settings-cyclone">
            <div className="som-oc-section-body">
              <table className="som-oc-table">
                <thead>
                  <tr>
                    <th className="left-align">Sand Cyclone Operation</th>
                    <th>Timer</th>
                    <th>Connecting Valve</th>
                    <th>Drain Valve</th>
                    <th>Water inlet valve</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="left-align">Start</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.cyclone.start} unit="minute" onClick={() => setActiveKeypad({ section: 'cyclone', param: 'start', label: 'Start Timer' })} /></td>
                    <td>Close</td><td>Close</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Running</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.cyclone.running} unit="minutes" onClick={() => setActiveKeypad({ section: 'cyclone', param: 'running', label: 'Running Timer' })} /></td>
                    <td className="som-oc-highlight-orange">Open</td><td>Close</td><td>Close</td>
                  </tr>
                  <tr>
                    <td className="left-align">Flushing</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.cyclone.flushing} decimals={1} unit="minute" onClick={() => setActiveKeypad({ section: 'cyclone', param: 'flushing', label: 'Flushing Timer' })} /></td>
                    <td>Close</td><td className="som-oc-highlight-orange">Open</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Shut-down</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.cyclone.shutdown} unit="minute" onClick={() => setActiveKeypad({ section: 'cyclone', param: 'shutdown', label: 'Shutdown Timer' })} /></td>
                    <td className="som-oc-highlight-orange">Open</td><td className="som-oc-highlight-orange">Open</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                  <tr>
                    <td className="left-align">Stop</td>
                    <td style={{ background: 'rgba(253, 224, 71, 0.15)' }}><ValBox value={settings.cyclone.stop} unit="minute" onClick={() => setActiveKeypad({ section: 'cyclone', param: 'stop', label: 'Stop Timer' })} /></td>
                    <td className="som-oc-highlight-orange">Open</td><td className="som-oc-highlight-orange">Open</td><td className="som-oc-highlight-orange">Open</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="som-oc-col-right">
          
          {/* Tank Bottom Blow-down */}
          <div className="som-oc-section" data-tour="oc-settings-blowdown">
            <div className="som-oc-section-body">
              <table className="som-oc-table">
                <thead>
                  <tr>
                    <th className="left-align" style={{ width: '40%' }}>Read</th>
                    <th className="left-align">Command</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="left-align">Tank Bottom Blow-down (COT, CST, ST, SDT)</td>
                    <td className="left-align">Temperature &lt; 90° Valve Close</td>
                  </tr>
                  <tr>
                    <td className="left-align"></td>
                    <td className="left-align">Temperature = 90° No Action</td>
                  </tr>
                  <tr style={{ background: 'rgba(253, 224, 71, 0.1)' }}>
                    <td className="left-align" style={{ color: '#fde047', fontWeight: 'bold' }}>
                      SP Temperature = <ValBox value={settings.spTankBlowdown} onClick={() => setActiveKeypad({ section: 'main', param: 'spTankBlowdown', label: 'Tank Blowdown SP (°C)' })} />
                    </td>
                    <td className="left-align">Temperature &gt; 90° Valve Open</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ padding: '8px' }}></div>

          {/* Current Oil Room Performance */}
          <div className="som-oc-section" data-tour="oc-settings-performance" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <table className="som-oc-table" style={{ background: 'transparent', border: 'none' }}>
              <tbody>
                <tr>
                  <td className="left-align" style={{ border: 'none', fontWeight: '600' }}>Current Oil Room Performance</td>
                  <td style={{ border: 'none' }}></td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>Sludge Processing Throughput</td>
                  <td style={{ border: 'none', textAlign: 'left' }}>
                    <span className="som-oc-big-green-box">#####</span> m³/hr
                  </td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>Average Sludge Mass Balance</td>
                  <td style={{ border: 'none', textAlign: 'left' }}>
                    <span style={{ color: '#f97316', border: '1px solid #64748b', padding: '2px 8px', marginLeft: '4px' }}>51%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '8px' }}></div>

          {/* Process Scoring */}
          <div className="som-oc-section" data-tour="oc-settings-scoring" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <table className="som-oc-table" style={{ background: 'transparent', border: 'none' }}>
              <thead>
                <tr>
                  <th className="left-align" style={{ background: 'transparent', color: '#e2e8f0', borderBottom: '1px solid #334155', border: 'none' }}>Process Scoring</th>
                  <th style={{ background: 'transparent', color: '#e2e8f0', border: 'none', textDecoration: 'underline' }}>Current</th>
                  <th style={{ background: 'transparent', color: '#e2e8f0', border: 'none', textDecoration: 'underline' }}>Min</th>
                  <th style={{ background: 'transparent', color: '#e2e8f0', border: 'none', textDecoration: 'underline' }}>Target</th>
                  <th style={{ background: 'transparent', color: '#e2e8f0', border: 'none', textDecoration: 'underline' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>COT temperature</td>
                  <td style={{ border: 'none' }}>85 °C</td>
                  <td style={{ border: 'none' }}>80 °C</td>
                  <td style={{ border: 'none' }}>95 °C</td>
                  <td style={{ border: 'none' }}>33%</td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>CST temperature</td>
                  <td style={{ border: 'none' }}>90 °C</td>
                  <td style={{ border: 'none' }}>80 °C</td>
                  <td style={{ border: 'none' }}>95 °C</td>
                  <td style={{ border: 'none' }}>67%</td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>ST temperature</td>
                  <td style={{ border: 'none' }}>90 °C</td>
                  <td style={{ border: 'none' }}>80 °C</td>
                  <td style={{ border: 'none' }}>95 °C</td>
                  <td style={{ border: 'none' }}>67%</td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>SDT temperature</td>
                  <td style={{ border: 'none' }}>90 °C</td>
                  <td style={{ border: 'none' }}>80 °C</td>
                  <td style={{ border: 'none' }}>95 °C</td>
                  <td style={{ border: 'none' }}>67%</td>
                </tr>
                <tr>
                  <td className="left-align" style={{ border: 'none' }}>Sludge Throughput</td>
                  <td style={{ border: 'none' }}>##### m³/hr</td>
                  <td style={{ border: 'none' }}>21 m³/hr</td>
                  <td style={{ border: 'none' }}>23 m³/hr</td>
                  <td style={{ border: 'none' }}>93%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '8px' }}></div>

          {/* Averages */}
          <div className="som-oc-section" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
             <table className="som-oc-table" style={{ background: 'transparent', border: 'none' }}>
                <tbody>
                  <tr>
                    <td className="left-align som-oc-big-blue-bg" style={{ width: '60%' }}>Average Process Score</td>
                    <td className="som-oc-big-blue-box" style={{ width: '40%' }}>58%</td>
                  </tr>
                  <tr>
                    <td className="left-align som-oc-big-blue-bg">Oil Room Throughput Score</td>
                    <td className="som-oc-big-blue-box">93%</td>
                  </tr>
                </tbody>
             </table>
             
             <div style={{ marginTop: '20px', display: 'flex' }}>
                <ValBox 
                  value={settings.activeDecanters} 
                  onClick={() => setActiveKeypad({ section: 'main', param: 'activeDecanters', label: 'Active Decanters' })} 
                />
             </div>
          </div>
        </div>

      </div> {/* end of content wrapper */}

      <div className="som-oc-footer" data-tour="oc-settings-apply">
        <button className="som-oc-save-btn" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'SAVING...' : 'SAVE SETTINGS'}
        </button>
      </div>

      <Keypad 
        isOpen={!!activeKeypad}
        title={activeKeypad?.label}
        initialValue={
          activeKeypad?.section === 'decanter' ? settings.decanter[activeKeypad?.param] :
          activeKeypad?.section === 'cyclone' ? settings.cyclone[activeKeypad?.param] :
          settings[activeKeypad?.param]
        }
        onClose={() => setActiveKeypad(null)}
        onSave={handleKeypadSave}
      />
    </section>
  );
}

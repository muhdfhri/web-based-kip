import { useState } from 'react'
import { createPortal } from 'react-dom'
import './PressStationSettingsModal.css'
import '../PressStationPage.css'
import pressImg from '../assets/press.svg'
import dilutionImg from '../assets/dilution.webp'

// ==========================================
// Data Defaults
// ==========================================
const defaultPressData = {
  1: {
    lmh: [
      { l: 55.0, m: 60.0, h: 62.0 }, { l: 55.0, m: 60.0, h: 62.0 },
      { l: 55.0, m: 60.0, h: 62.0 }, { l: 55.0, m: 60.0, h: 62.0 },
    ],
    llol: { ll: 6.0, llRetract: 5, ol: 78.0, olRetract: 15 },
    hysteresis: { delay: 0, retract: 0, idling: 0, off: true },
    pvShift: { '4mA': [0.0, 0.0], '20mA': [0.0, 0.0], shiftAmp: [0.0, 0.0] },
    range: { analog: [5520, 27648], seneca: [0.0, 7.5] },
  },
  2: {
    lmh: [
      { l: 55.0, m: 60.0, h: 62.0 }, { l: 45.0, m: 55.0, h: 60.0 },
      { l: 42.0, m: 44.0, h: 58.0 }, { l: 50.0, m: 56.0, h: 58.0 },
    ],
    llol: { ll: 6.0, llRetract: 5, ol: 78.0, olRetract: 15 },
    hysteresis: { delay: 0, retract: 0, idling: 0, off: true },
    pvShift: { '4mA': [0.0, 0.0], '20mA': [0.0, 0.0], shiftAmp: [0.0, 0.0] },
    range: { analog: [5520, 27648], seneca: [0.0, 7.5] },
  },
  3: {
    lmh: [
      { l: 55.0, m: 60.0, h: 62.0 }, { l: 45.0, m: 55.0, h: 60.0 },
      { l: 42.0, m: 44.0, h: 58.0 }, { l: 50.0, m: 56.0, h: 58.0 },
    ],
    llol: { ll: 6.0, llRetract: 5, ol: 78.0, olRetract: 15 },
    hysteresis: { delay: 0, retract: 0, idling: 0, off: true },
    pvShift: { '4mA': [0.0, 0.0], '20mA': [0.0, 0.0], shiftAmp: [0.0, 0.0] },
    range: { analog: [5520, 27648], seneca: [0.0, 7.5] },
  },
  4: {
    lmh: [
      { l: 55.0, m: 60.0, h: 62.0 }, { l: 45.0, m: 55.0, h: 60.0 },
      { l: 42.0, m: 44.0, h: 58.0 }, { l: 50.0, m: 56.0, h: 58.0 },
    ],
    llol: { ll: 6.0, llRetract: 5, ol: 78.0, olRetract: 15 },
    hysteresis: { delay: 0, retract: 0, idling: 0, off: true },
    pvShift: { '4mA': [0.0, 0.0], '20mA': [0.0, 0.0], shiftAmp: [0.0, 0.0] },
    range: { analog: [5520, 27648], seneca: [0.0, 7.5] },
  },
};

const defaultDigesterData = [1, 2, 3, 4].map(n => ({
  id: n,
  digesterFull: n === 1 ? 38.0 : 40.0,
  pvTable: [
    { label: 'PV <', pv: n === 1 ? 15.0 : 20.0, pct: 20 },
    { label: '< PV <', pv: n === 1 ? 17.6 : 22.2, pct: 28 },
    { label: '< PV <', pv: n === 1 ? 20.1 : 24.4, pct: 36 },
    { label: '< PV <', pv: n === 1 ? 22.7 : 26.7, pct: 44 },
    { label: '< PV <', pv: n === 1 ? 25.2 : 28.9, pct: 52 },
    { label: '< PV <', pv: n === 1 ? 27.8 : 31.1, pct: 60 },
    { label: '< PV <', pv: n === 1 ? 30.3 : 33.3, pct: 68 },
    { label: '< PV <', pv: n === 1 ? 32.9 : 35.6, pct: 76 },
    { label: '< PV <', pv: n === 1 ? 35.4 : 37.8, pct: 84 },
    { label: 'PV >', pv: n === 1 ? 38.0 : 40.0, pct: 100 },
  ],
  tempCV: { sv: 96.0, upperLimit: 80.0, p: n === 3 ? 5.0 : 2.0, i: n === 3 ? 0.5 : 1.0, d: 0.0 },
}));

// Overview monitoring data
const defaultOverviewData = {
  1: { pressAmp: 0.0, load: 0.0, activeSet: 1, mode: 'Auto', ll: 5.0, l: 0.0, m: 0.0, h: 0.0, ol: 0.0, motorHour: '00000' },
  2: { pressAmp: 53.6, load: 74.3, activeSet: 1, mode: 'Auto', ll: 6.0, l: 55.0, m: 60.0, h: 62.0, ol: 78.0, motorHour: '00139' },
  3: { pressAmp: 54.4, load: 75.2, activeSet: 4, mode: 'Auto', ll: 5.0, l: 50.0, m: 56.0, h: 58.0, ol: 78.0, motorHour: '00083' },
  4: { pressAmp: 61.3, load: 96.1, activeSet: 1, mode: 'Auto', ll: 5.0, l: 40.0, m: 60.0, h: 62.0, ol: 78.0, motorHour: '00077' },
};

const defaultDilutionData = {
  flowratePV: -0.138,
  flowrateSP: 6.985,
  cv: 90,
};

// ==========================================
// Main Component
// ==========================================
function PressStationSettingsPage({ onSelectSubmenu }) {
  const [activeSlide, setActiveSlide] = useState('overview');
  const [activePress, setActivePress] = useState(2);
  const [pressData, setPressData] = useState(defaultPressData);
  const [digesterData, setDigesterData] = useState(defaultDigesterData);
  const [overviewData] = useState(defaultOverviewData);
  const [dilutionData] = useState(defaultDilutionData);
  const [activeKeypad, setActiveKeypad] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const current = pressData[activePress];

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSaving(false);
  };

  // Keypad handler
  const handleKeypadConfirm = (val) => {
    if (!activeKeypad) return;
    const kp = activeKeypad;

    if (kp.section === 'lmh') {
      setPressData(prev => {
        const np = { ...prev };
        const sets = [...np[activePress].lmh];
        sets[kp.setIdx] = { ...sets[kp.setIdx], [kp.param]: val };
        np[activePress] = { ...np[activePress], lmh: sets };
        return np;
      });
    } else if (kp.section === 'llol') {
      setPressData(prev => {
        const np = { ...prev };
        np[activePress] = { ...np[activePress], llol: { ...np[activePress].llol, [kp.param]: val } };
        return np;
      });
    } else if (kp.section === 'hysteresis') {
      setPressData(prev => {
        const np = { ...prev };
        np[activePress] = { ...np[activePress], hysteresis: { ...np[activePress].hysteresis, [kp.param]: val } };
        return np;
      });
    } else if (kp.section === 'pvShift') {
      setPressData(prev => {
        const np = { ...prev };
        const pvs = { ...np[activePress].pvShift };
        const arr = [...pvs[kp.param]];
        arr[kp.colIdx] = val;
        pvs[kp.param] = arr;
        np[activePress] = { ...np[activePress], pvShift: pvs };
        return np;
      });
    } else if (kp.section === 'range') {
      setPressData(prev => {
        const np = { ...prev };
        const rng = { ...np[activePress].range };
        const arr = [...rng[kp.param]];
        arr[kp.colIdx] = val;
        rng[kp.param] = arr;
        np[activePress] = { ...np[activePress], range: rng };
        return np;
      });
    } else if (kp.section === 'digester') {
      setDigesterData(prev => prev.map((d, i) => {
        if (i !== kp.digIdx) return d;
        if (kp.param === 'digesterFull') return { ...d, digesterFull: val };
        if (kp.param === 'pv') {
          const nt = [...d.pvTable];
          nt[kp.rowIdx] = { ...nt[kp.rowIdx], pv: val };
          return { ...d, pvTable: nt };
        }
        if (kp.param === 'pct') {
          const nt = [...d.pvTable];
          nt[kp.rowIdx] = { ...nt[kp.rowIdx], pct: val };
          return { ...d, pvTable: nt };
        }
        if (['sv', 'upperLimit', 'p', 'i', 'd'].includes(kp.param)) {
          return { ...d, tempCV: { ...d.tempCV, [kp.param]: val } };
        }
        return d;
      }));
    }
    setActiveKeypad(null);
  };

  const ValBox = ({ value, unit, decimals = 1, onClick }) => (
    <div className={`som-val-box ${onClick ? 'som-val-box--editable' : ''}`} onClick={onClick}>
      {typeof value === 'number' ? value.toFixed(decimals) : value}
      {unit && <span className="som-val-unit">{unit}</span>}
    </div>
  );

  // ==========================================
  //  OVERVIEW SLIDE
  // ==========================================
  const renderOverviewSlide = () => (
    <div className="som-overview-layout">
      {/* 4 Press Cards */}
      <div className="som-overview-press-grid">
        {[1, 2, 3, 4].map(n => {
          const d = overviewData[n];
          const isActive = d.pressAmp > 0;
          return (
            <div key={n} className="som-overview-press-card">
              <div className="som-overview-press-header">
                <span className="som-overview-press-title">Press No.{n}</span>
              </div>
              <div className="som-overview-press-body">
                {/* Top Controls */}
                <div className="som-overview-controls">
                  <span className="som-overview-mode-badge">{d.mode}</span>
                  <span className="som-overview-set-indicator">Set {d.activeSet}</span>
                </div>
                {/* Main Values */}
                <div className="som-overview-main-values">
                  <div className="som-overview-param-row">
                    <span className="som-overview-param-label">Press Amp</span>
                    <ValBox value={d.pressAmp} unit="A" />
                  </div>
                  <div className="som-overview-param-row">
                    <span className="som-overview-param-label">Load</span>
                    <ValBox value={d.load} unit="%" />
                  </div>
                </div>
                {/* LMH OL Table */}
                <div className="som-overview-lmh-table">
                  {[
                    { label: 'LL', val: d.ll },
                    { label: 'L', val: d.l },
                    { label: 'M', val: d.m },
                    { label: 'H', val: d.h },
                    { label: 'OL', val: d.ol },
                  ].map((item, idx) => (
                    <div key={idx} className="som-overview-lmh-item">
                      <span className="som-overview-lmh-label">{item.label}</span>
                      <ValBox value={item.val} unit="A" />
                    </div>
                  ))}
                </div>
                {/* Motor Running Hour */}
                <div className="som-overview-motor-row">
                  <span className="som-overview-param-label">Motor Running Hour</span>
                  <div className="som-val-box" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '2px' }}>
                    {d.motorHour} <span className="som-val-unit">H</span>
                  </div>
                </div>
                {/* Press / Release Indicator Lights */}
                <div className="som-overview-indicators">
                  <div className="som-indicator-item">
                    <span className={`som-indicator-light ${isActive ? 'som-indicator--green' : 'som-indicator--off'}`} />
                    <span className="som-indicator-label">Press</span>
                  </div>
                  <div className="som-indicator-item">
                    <span className={`som-indicator-light ${!isActive ? 'som-indicator--red' : 'som-indicator--off'}`} />
                    <span className="som-indicator-label">Release</span>
                  </div>
                </div>
                {/* Press Machine Image */}
                <div className="som-overview-press-image">
                  <img src={pressImg} alt="Press Machine" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dilution Section (single card with Crude Oil Gutter label) */}
      <div className="som-overview-dilution-card">
        <div className="som-overview-press-header">
          <span className="som-overview-press-title">Dilution</span>
        </div>
        <div className="som-overview-dilution-body">
          <div className="som-overview-dilution-image">
            <img src={dilutionImg} alt="Dilution System" />
          </div>
          <div className="som-overview-dilution-left">
            <span className="som-overview-mode-badge">Auto</span>
          </div>
          <div className="som-overview-dilution-center">
            <div className="som-overview-param-row">
              <span className="som-overview-param-label">Flowrate PV</span>
              <ValBox value={dilutionData.flowratePV} decimals={3} unit="M3/HR" />
            </div>
            <div className="som-overview-param-row">
              <span className="som-overview-param-label">Flowrate SP</span>
              <ValBox value={dilutionData.flowrateSP} decimals={3} unit="M3/HR" />
            </div>
            <div className="som-overview-param-row">
              <span className="som-overview-param-label">CV</span>
              <ValBox value={dilutionData.cv} decimals={0} unit="%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  //  PRESS SETTINGS SLIDE
  // ==========================================
  const renderPressSlide = () => (
    <div className="som-press-settings-grid">
      {/* L, M, H Setting */}
      <div className="som-ps-card">
        <div className="som-ps-card-header"><h3 className="som-ps-card-title">L, M, H Setting</h3></div>
        <div className="som-ps-card-body">
          <div className="som-lmh-grid">
            {current.lmh.map((set, si) => (
              <div key={si} className="som-lmh-set">
                <div className="som-lmh-set-title">Set {si + 1}</div>
                <div className="som-lmh-columns">
                  <span></span>
                  <span className="som-lmh-col-header">Active</span>
                  <span className="som-lmh-col-header">New Setting</span>
                  {['l', 'm', 'h'].map(p => (
                    <>{/* key on Fragment not needed for <> but React may warn */}
                      <span key={`lbl-${si}-${p}`} className="som-lmh-row-label">{p.toUpperCase()}</span>
                      <ValBox key={`act-${si}-${p}`} value={set[p]} unit="A" />
                      <ValBox key={`new-${si}-${p}`} value={set[p]} unit="A" onClick={() => setActiveKeypad({ section: 'lmh', setIdx: si, param: p, label: `Press ${activePress} Set ${si + 1} ${p.toUpperCase()}` })} />
                    </>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: LL&OL, Hysteresis, PV Shift, Range */}
      <div className="som-press-bottom-grid">
        {/* LL & OL Setting */}
        <div className="som-ps-card">
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">LL & OL Setting</h3></div>
          <div className="som-ps-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
              <span></span>
              <span className="som-lmh-col-header">Active</span>
              <span className="som-lmh-col-header">New Setting</span>
              {[
                { key: 'll', label: 'LL', unit: 'A', dec: 1 },
                { key: 'llRetract', label: 'LL Retract', unit: 'Sec', dec: 0 },
                { key: 'ol', label: 'OL', unit: 'A', dec: 1 },
                { key: 'olRetract', label: 'OL Retract', unit: 'Sec', dec: 0 },
              ].map(item => (
                <>
                  <span key={`lbl-${item.key}`} className="som-data-row-label">{item.label}</span>
                  <ValBox key={`act-${item.key}`} value={current.llol[item.key]} unit={item.unit} decimals={item.dec} />
                  <ValBox key={`new-${item.key}`} value={current.llol[item.key]} unit={item.unit} decimals={item.dec} onClick={() => setActiveKeypad({ section: 'llol', param: item.key, label: `Press ${activePress} ${item.label}` })} />
                </>
              ))}
            </div>
          </div>
        </div>

        {/* L Hysteresis Value */}
        <div className="som-ps-card">
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">L Hysteresis Value</h3></div>
          <div className="som-ps-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
              <span></span>
              <span className="som-lmh-col-header">Active</span>
              <span className="som-lmh-col-header">New Setting</span>
              {['delay', 'retract', 'idling'].map(key => (
                <>
                  <span key={`lbl-${key}`} className="som-data-row-label" style={{ textTransform: 'capitalize' }}>{key}</span>
                  <ValBox key={`act-${key}`} value={current.hysteresis[key]} unit="Sec" decimals={0} />
                  <ValBox key={`new-${key}`} value={current.hysteresis[key]} unit="Sec" decimals={0} onClick={() => setActiveKeypad({ section: 'hysteresis', param: key, label: `Press ${activePress} Hysteresis ${key}` })} />
                </>
              ))}
            </div>
            <button className="som-off-btn" style={{ alignSelf: 'center', marginTop: '6px' }}>{current.hysteresis.off ? 'OFF' : 'ON'}</button>
          </div>
        </div>

        {/* Current (A) PV Shift */}
        <div className="som-ps-card">
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">Current (A) PV Shift</h3></div>
          <div className="som-ps-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
              <span></span>
              <span className="som-lmh-col-header">Active</span>
              <span className="som-lmh-col-header">New Setting</span>
              {[
                { key: '4mA', label: '4mA' },
                { key: '20mA', label: '20mA' },
                { key: 'shiftAmp', label: 'Shift Amp' },
              ].map(item => (
                <>
                  <span key={`lbl-${item.key}`} className="som-data-row-label">{item.label}</span>
                  <ValBox key={`act-${item.key}`} value={current.pvShift[item.key][0]} unit="A" />
                  <ValBox key={`new-${item.key}`} value={current.pvShift[item.key][1]} unit="A" onClick={() => setActiveKeypad({ section: 'pvShift', param: item.key, colIdx: 1, label: `Press ${activePress} ${item.label}` })} />
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Range Setting */}
        <div className="som-ps-card">
          <div className="som-ps-card-header"><h3 className="som-ps-card-title">Range Setting</h3></div>
          <div className="som-ps-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 6px', alignItems: 'center' }}>
              <span></span>
              <span className="som-lmh-col-header">Active</span>
              <span className="som-lmh-col-header">New Setting</span>
              <span className="som-data-row-label">Analog</span>
              <ValBox value={current.range.analog[0]} decimals={0} />
              <ValBox value={current.range.analog[1]} decimals={0} onClick={() => setActiveKeypad({ section: 'range', param: 'analog', colIdx: 1, label: `Press ${activePress} Analog New` })} />
              <span className="som-data-row-label">Seneca</span>
              <ValBox value={current.range.seneca[0]} unit="A" />
              <ValBox value={current.range.seneca[1]} unit="A" onClick={() => setActiveKeypad({ section: 'range', param: 'seneca', colIdx: 1, label: `Press ${activePress} Seneca New` })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  //  DIGESTER SLIDE
  // ==========================================
  const renderDigesterSlide = () => (
    <div className="som-digester-grid">
      {digesterData.map((dig, di) => (
        <div key={di} className="som-digester-card">
          <div className="som-digester-card-header">
            <h3 className="som-digester-card-title">Digester No.{dig.id}</h3>
          </div>
          <div className="som-digester-card-body">
            <div className="som-digester-section-title">Discharge CV</div>

            <div className="som-digester-full-row">
              <span className="som-digester-full-label">Digester Full</span>
              <ValBox value={dig.digesterFull} unit="A" onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'digesterFull', label: `Digester ${dig.id} Full` })} />
            </div>

            <div className="som-pv-table">
              {dig.pvTable.map((row, ri) => (
                <div key={ri} className="som-pv-row">
                  <span className="som-pv-label">{row.label}</span>
                  <ValBox value={row.pv} unit="A" onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'pv', rowIdx: ri, label: `Dig${dig.id} ${row.label} PV` })} />
                  <ValBox value={row.pct} unit="%" decimals={0} onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'pct', rowIdx: ri, label: `Dig${dig.id} ${row.label} %` })} />
                </div>
              ))}
            </div>

            <div className="som-tempcv-section">
              <div className="som-digester-section-title">Temperature CV</div>
              <div className="som-tempcv-grid">
                <span className="som-tempcv-label">SV</span>
                <ValBox value={dig.tempCV.sv} unit="℃" onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'sv', label: `Dig${dig.id} SV` })} />
                <span className="som-tempcv-label">P</span>
                <ValBox value={dig.tempCV.p} onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'p', label: `Dig${dig.id} P` })} />
                <span className="som-tempcv-label">Upper Limit</span>
                <ValBox value={dig.tempCV.upperLimit} unit="%" onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'upperLimit', label: `Dig${dig.id} Upper Limit` })} />
                <span className="som-tempcv-label">I</span>
                <ValBox value={dig.tempCV.i} onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'i', label: `Dig${dig.id} I` })} />
                <span></span><span></span>
                <span className="som-tempcv-label">D</span>
                <ValBox value={dig.tempCV.d} onClick={() => setActiveKeypad({ section: 'digester', digIdx: di, param: 'd', label: `Dig${dig.id} D` })} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ==========================================
  //  RENDER
  // ==========================================
  const renderSlide = () => {
    if (activeSlide === 'overview') return renderOverviewSlide();
    if (activeSlide === 'press') return renderPressSlide();
    return renderDigesterSlide();
  };

  return (
    <section className="som-press-station">
      <header className="som-press-station-header">
        <div className="som-header-left">
          <h1 className="som-press-station-title">PRESS STATION</h1>
          <div className="som-station-tabs">
            <button className="som-station-tab" onClick={() => onSelectSubmenu && onSelectSubmenu('Press Station', 'Overview')}>Overview</button>
          </div>
        </div>
        <div className="som-view-toggle-container" style={{ marginLeft: 'auto' }}>
          <button className="som-view-btn" onClick={() => onSelectSubmenu && onSelectSubmenu('Press Station', 'Process View')}>PROCESS VIEW</button>
          <button className="som-view-btn" disabled style={{ cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
            MAINTENANCE VIEW
            <svg width="10" height="12" viewBox="0 0 448 512" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>
          </button>
          <button className="som-view-btn active" onClick={() => {}} style={{ marginLeft: '8px' }}>⚙️ SETTINGS</button>
        </div>
      </header>
      <div className="som-press-main">
        <div className="som-press-layout">
          <div className="som-press-page">
            {/* Tab Navigation - 3 tabs */}
            <div className="som-press-tabs">
              <button className={`som-press-tab ${activeSlide === 'overview' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('overview')}>Press Overview</button>
              <button className={`som-press-tab ${activeSlide === 'press' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('press')}>Press Settings</button>
              <button className={`som-press-tab ${activeSlide === 'digester' ? 'som-press-tab--active' : ''}`} onClick={() => setActiveSlide('digester')}>Digester Settings</button>
            </div>

            {/* Press Number Selector (for press settings slide only) */}
            {activeSlide === 'press' && (
              <div className="som-press-selector">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} className={`som-press-num-btn ${activePress === n ? 'som-press-num-btn--active' : ''}`} onClick={() => setActivePress(n)}>
                    Press No.{n}
                  </button>
                ))}
              </div>
            )}

            {/* Slide Content */}
            <div className="som-press-slide">
              {renderSlide()}
            </div>

            {/* Footer */}
            <footer className="som-press-footer">
              <button className="som-press-save-btn" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'SAVING...' : 'APPLY CHANGES'}
              </button>
            </footer>

            {/* Numeric Keypad */}
            {activeKeypad && (
              <NumericKeypad
                value={(() => {
                  const kp = activeKeypad;
                  if (kp.section === 'lmh') return current.lmh[kp.setIdx][kp.param];
                  if (kp.section === 'llol') return current.llol[kp.param];
                  if (kp.section === 'hysteresis') return current.hysteresis[kp.param];
                  if (kp.section === 'pvShift') return current.pvShift[kp.param][kp.colIdx];
                  if (kp.section === 'range') return current.range[kp.param][kp.colIdx];
                  if (kp.section === 'digester') {
                    const d = digesterData[kp.digIdx];
                    if (kp.param === 'digesterFull') return d.digesterFull;
                    if (kp.param === 'pv') return d.pvTable[kp.rowIdx].pv;
                    if (kp.param === 'pct') return d.pvTable[kp.rowIdx].pct;
                    if (['sv', 'upperLimit', 'p', 'i', 'd'].includes(kp.param)) return d.tempCV[kp.param];
                  }
                  return 0;
                })()}
                label={activeKeypad.label}
                unit={activeKeypad.unit || ''}
                onClose={() => setActiveKeypad(null)}
                onConfirm={handleKeypadConfirm}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// Numeric Keypad Component
// ==========================================
function NumericKeypad({ value, onConfirm, onClose, label, unit }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    }
    return '0';
  });

  const handleNumber = (n) => {
    setDisplayValue(prev => (prev === '0' ? n.toString() : prev + n.toString()));
  };
  const handleDecimal = () => { if (!displayValue.includes('.')) setDisplayValue(displayValue + '.'); };
  const handleBack = () => setDisplayValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const handleEnter = () => onConfirm(parseFloat(displayValue) || 0);

  const btnStyle = { padding: '14px', fontSize: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' };

  return createPortal(
    <div className="som-numeric-keypad-backdrop" onClick={onClose}>
      <div className="som-numeric-keypad" onClick={e => e.stopPropagation()}>
        <div className="som-numeric-keypad-header">
          <span className="som-numeric-keypad-label">{label}</span>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }} onClick={onClose}>✕</button>
        </div>
        <div className="som-numeric-keypad-display">
          <span className="som-numeric-keypad-value">{displayValue}</span>
          {unit && <span className="som-numeric-keypad-unit">{unit}</span>}
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
            <button key={n} onClick={() => handleNumber(n)} style={btnStyle}>{n}</button>
          ))}
          <button onClick={handleDecimal} style={btnStyle}>.</button>
          <button onClick={() => handleNumber(0)} style={btnStyle}>0</button>
          <button onClick={handleBack} style={{ ...btnStyle, background: '#f1f5f9' }}>⌫</button>
          <button onClick={() => setDisplayValue('0')} style={{ gridColumn: 'span 1', padding: '12px', background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
          <button onClick={handleEnter} style={{ gridColumn: 'span 2', padding: '12px', background: '#F59E0B', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>ENTER</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PressStationSettingsPage

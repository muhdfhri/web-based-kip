import React from 'react';
import './ThreeDPlantViewPage.css';
import sklImage from './assets/KIP.webp';

const toTitleCase = (str) => {
  return str.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

const getMappedStationTitle = (cardTitle) => {
  const upper = cardTitle.toUpperCase();
  if (upper === 'OIL CLARIFICATION') return 'Oil Clarification Room';
  if (upper === 'EFFLUENT DISCHARGE' || upper === 'ANAEROBIC POND' || upper === 'AEROBIC POND') return 'Effluent Treatment';
  
  const titleMap = {
    'PRESS STATION': 'Press Station',
    'THRESHING STATION': 'Threshing Station',
    'STERILIZER STATION': 'Sterilizer Station',
    'KERNEL PLANT': 'Kernel Plant',
    'GRADING RAMP': 'Grading Ramp',
    'BOILER HOUSE': 'Boiler House',
    'EFB PLANT': 'EFB Plant',
    'ENGINE ROOM': 'Engine Room',
    'SECURITY': 'Security',
    'WEIGHBRIDGE': 'Weighbridge',
    'LOADING RAMP': 'Loading Ramp',
    'OIL CLARIFICATION': 'Oil Clarification Room',
    'RAW WATER TREATMENT': 'Raw Water Treatment',
    'DAF / OSR': 'DAF / OSR',
    'CMRS': 'CMRS',
  };
  return titleMap[upper] || toTitleCase(cardTitle);
};

const MonitoringCard = ({ title, status = 'online', data = [], style = {}, onNavigate, isLocked }) => {
  const mappedTitle = getMappedStationTitle(title);
  const isNavigable = [
    "Press Station", "Threshing Station", "Sterilizer Station", "Kernel Plant", 
    "Grading Ramp", "Boiler House", "EFB Plant", "Engine Room", "Security", 
    "Weighbridge", "Loading Ramp", "Oil Clarification Room", "Raw Water Treatment", 
    "Effluent Treatment", "DAF / OSR", "CMRS"
  ].includes(mappedTitle);

  const handleCardClick = () => {
    if (isNavigable && !isLocked && onNavigate) {
      onNavigate(mappedTitle);
    }
  };

  return (
    <div
      className={`som-monitor-card ${isNavigable ? 'is-station' : ''} ${isLocked ? 'is-locked' : ''}`}
      style={style}
      onClick={isLocked ? undefined : handleCardClick}
    >
      <div className="som-card-header" style={isLocked ? { background: '#cbd5e1' } : undefined}>
        <span className="som-card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {title}
          {isLocked && (
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 448 512"
              height="8px"
              width="8px"
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: '#64748b' }}
            >
              <path d="M400 224h-24v-72C376 68.4 307.6 0 224 0S72 68.4 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path>
            </svg>
          )}
        </span>
        {!isLocked && <div className={`som-status-dot ${status}`}></div>}
      </div>
      <div className="som-card-body">
        {data.map((item, idx) => (
          <div key={idx} className="som-data-row">
            <span className="som-label">{item.label}</span>
            <span className={`som-value ${item.color || 'orange'}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ThreeDPlantViewPage = ({ onNavigate, stations }) => {
  const isCardLocked = (cardTitle) => {
    const mappedTitle = getMappedStationTitle(cardTitle);
    if (stations && stations.length > 0) {
      const station = stations.find((s) => s.title === mappedTitle);
      if (station) {
        return !station.is_active;
      }
    }
    return false;
  };

  return (
    <div className="som-overview-immersive-wrapper">
      <main className="som-immersive-main">
        <div className="som-immersive-layout">
          <div className="som-immersive-canvas-body">
            <svg
              viewBox="0 0 3200 1600"
              className="som-immersive-svg-canvas"
              preserveAspectRatio="xMidYMid meet"
            >
              <foreignObject x="0" y="0" width="3200" height="1600">
                <div className="som-immersive-ultra-fit-shell">

                  {/* Background Image Layer */}
                  <div className="som-immersive-bg-wrapper">
                    <img src={sklImage} alt="SKL Plant View" className="som-immersive-bg-image" />
                    <div className="som-immersive-overlay"></div>
                  </div>

                  {/* UI Content Layer */}
                  <div className="som-immersive-content-overlay">

                    {/* Main Performance Score - Top Left */}
                    <div className="som-main-score-card">
                      <div className="som-score-header">
                        <span className="som-score-title">Current Mill Performance Score</span>
                        <span className="som-score-value">0%</span>
                      </div>
                      <div className="som-score-footer">
                        <span className="som-label">THROUGHPUT</span>
                        <span className="som-value orange">0.0 mt/hr</span>
                      </div>
                    </div>

                    {/* Group: Oil Losses */}
                    <MonitoringCard
                      title="OIL LOSSES REPORT"
                      style={{ top: '12%', left: '1%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('OIL LOSSES REPORT')}
                      data={[
                        { label: 'USB Count', value: '0.00%' },
                        { label: 'PSB Count', value: '0.00%' },
                        { label: 'EFB', value: 'Wet', color: 'gray' },
                        { label: 'Unprocessed EFB', value: '0%' },
                        { label: 'Press Floor', value: 'Wet' },
                        { label: 'Station', value: 'Oily' },
                      ]}
                    />
                    <MonitoringCard
                      title="OIL LOSSES REPORT"
                      style={{ top: '12%', left: '10%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('OIL LOSSES REPORT')}
                      data={[
                        { label: 'KL in Fibre', value: '0.0%' },
                        { label: 'KL in TDS 1', value: '0.0%' },
                        { label: 'KL in TDS 2', value: '0.0%' },
                        { label: 'KL in Wet Shell', value: '0.0%' },
                        { label: 'TOL', value: '0.00%' },
                      ]}
                    />

                    {/* Group: Central Stations */}
                    <MonitoringCard
                      title="BOILER HOUSE"
                      style={{ top: '45%', left: '45%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('BOILER HOUSE')}
                      data={[
                        { label: 'Steam Pressure', value: '0 bar' },
                        { label: 'Water Level', value: '0%' },
                        { label: 'TDS', value: '0 mg/L' },
                        { label: 'Station Score', value: '0%' },
                        { label: 'Capacity', value: '0% (0/0)' },
                      ]}
                    />
                    <MonitoringCard
                      title="PRESS STATION"
                      style={{ top: '20%', left: '73%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('PRESS STATION')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="THRESHING STATION"
                      style={{ top: '29%', left: '73%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('THRESHING STATION')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="EFB PLANT"
                      style={{ top: '48%', left: '73%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('EFB PLANT')}
                      data={[
                        { label: 'FFB Processed', value: '0%' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />

                    {/* Group: Engine & Kernel */}
                    <MonitoringCard
                      title="ENGINE ROOM"
                      style={{ top: '30%', left: '45%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('ENGINE ROOM')}
                      data={[
                        { label: 'Power Consumption', value: '0 kW' },
                        { label: 'Steam Consumption', value: '0 mt/hr' },
                        { label: 'Frequency', value: '0.00 Hz' },
                        { label: 'Station Score', value: '0% 0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="KERNEL PLANT"
                      style={{ top: '35%', left: '60%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('KERNEL PLANT')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="OIL CLARIFICATION"
                      style={{ top: '25%', left: '60%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('OIL CLARIFICATION')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="STERILIZER STATION"
                      style={{ top: '38%', left: '73%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('STERILIZER STATION')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />

                    {/* Group: Ponds */}
                    <MonitoringCard
                      title="ANAEROBIC POND"
                      style={{ top: '5%', left: '45%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('ANAEROBIC POND')}
                      data={[
                        { label: 'pH', value: '0.0' },
                        { label: 'MLSS', value: '0 mg/L' },
                        { label: 'Recycling', value: 'ON' },
                        { label: 'Scrimming', value: 'ON' },
                        { label: 'Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="AEROBIC POND"
                      style={{ top: '5%', left: '55%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('AEROBIC POND')}
                      data={[
                        { label: 'pH', value: '0.0' },
                        { label: 'MLSS', value: '0 mg/L' },
                        { label: 'DO', value: '0.0 mg/L' },
                        { label: 'Recycling', value: 'ON' },
                        { label: 'Deludging', value: 'OFF' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="EFFLUENT DISCHARGE"
                      style={{ top: '5%', left: '65%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('EFFLUENT DISCHARGE')}
                      data={[
                        { label: 'pH', value: '0.0' },
                        { label: 'TSS', value: '0.0 mg/L' },
                        { label: 'COD', value: '0.0 mg/L' },
                        { label: 'D&O', value: '0.0 mg/L' },
                      ]}
                    />

                    {/* Group: Left & Bottom Additional */}
                    <MonitoringCard
                      title="MINI MILL"
                      style={{ top: '32%', left: '28%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('MINI MILL')}
                      data={[
                        { label: 'LF Received', value: '0 mt' },
                        { label: 'LF Processed', value: '0.0 mt' },
                        { label: 'LF balance', value: '0 mt' },
                        { label: 'Nut Produced', value: '0.0 mt' },
                        { label: 'CPO Produced', value: '0.0 mt' },
                        { label: 'OER', value: '0.0%' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />

                    <MonitoringCard
                      title="RAW WATER TREATMENT"
                      style={{ top: '10%', left: '22%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('RAW WATER TREATMENT')}
                      data={[
                        { label: 'Throughput', value: '0.00 m3/hr' },
                        { label: 'Turbidity', value: '0.00 NTU' },
                      ]}
                    />
                    <MonitoringCard
                      title="WATER CONSUMPTION"
                      style={{ top: '10%', left: '32%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('WATER CONSUMPTION')}
                      data={[
                        { label: 'Domestic', value: '0%' },
                        { label: 'Process', value: '0%' },
                        { label: 'Boiler', value: '0%' },
                        { label: 'Water Consumption', value: '0 m3/mt.FFB' },
                      ]}
                    />
                    <MonitoringCard
                      title="LOADING RAMP"
                      style={{ top: '60%', left: '90%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('LOADING RAMP')}
                      data={[
                        { label: 'Throughput', value: '0.00 mt/hr' },
                        { label: 'Station Score', value: '0%' },
                      ]}
                    />

                    <MonitoringCard
                      title="WEIGHBRIDGE"
                      style={{ top: '65%', left: '13%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('WEIGHBRIDGE')}
                      data={[
                        { label: 'FFB Received', value: '0.0 mt' },
                        { label: 'FFB Grading', value: '0 trucks' },
                        { label: 'FFB Grading', value: '0 trucks' },
                      ]}
                    />
                    <MonitoringCard
                      title="CPO STORAGE"
                      style={{ top: '60%', left: '54.5%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('CPO STORAGE')}
                      data={[
                        { label: 'Tank 1', value: '0 mt' },
                        { label: 'Tank 2', value: '0 mt' },
                        { label: 'Tank 3', value: '0' },
                      ]}
                    />
                    <MonitoringCard
                      title="GRADING RAMP"
                      style={{ top: '25%', left: '85%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('GRADING RAMP')}
                      data={[
                        { label: 'FFB Ripeness', value: '0.0%' },
                        { label: 'Dust', value: '0.0%' },
                        { label: 'OGER', value: '0.0%' },
                      ]}
                    />
                    <MonitoringCard
                      title="FFB BALANCE"
                      style={{ top: '45%', left: '60%' }}
                      onNavigate={onNavigate}
                      isLocked={isCardLocked('FFB BALANCE')}
                      data={[
                        { label: 'FFB Received', value: '0 mt' },
                        { label: 'FFB Processed', value: '0 mt' },
                        { label: 'FFB Balance', value: '0 mt' },
                      ]}
                    />

                  </div>
                </div>
              </foreignObject>
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ThreeDPlantViewPage;
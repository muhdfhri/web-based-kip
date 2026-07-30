import { useState, useEffect } from 'react'
import './SecurityStationPage.css'
import DashboardTab from './tabs/Dashboard/DashboardTab.jsx'
import IncidentsTab from './tabs/Incidents/IncidentsTab.jsx'
import TruckQueuesTab from './tabs/TruckQueues/TruckQueuesTab.jsx'
import PatrolMapTab from './tabs/PatrolMap/PatrolMapTab.jsx'
import CctvFeedTab from './tabs/CctvFeed/CctvFeedTab.jsx'
import SecurityAside from './components/SecurityAside.jsx'
import ProofModal from './components/ProofModal.jsx'
import CctvModal from './components/CctvModal.jsx'

function SecurityStationPage() {
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())
    const [activeTab, setActiveTab] = useState('dashboard')
    
    // Shared State for Modals & Views
    const [activeProof, setActiveProof] = useState(null)
    const [proofIndex, setProofIndex] = useState(0)
    const [selectedCctv, setSelectedCctv] = useState(null)
    const [cctvCameras, setCctvCameras] = useState([])
    
    // Live Data State
    const [patrolGuards, setPatrolGuards] = useState([])
    const [stationCheckpoints, setStationCheckpoints] = useState([])
    const [mapStations, setMapStations] = useState([])
    const [patrolTracks, setPatrolTracks] = useState([])
    const [patrolHistory, setPatrolHistory] = useState([])
    const [replaySessionId, setReplaySessionId] = useState(null)

    // Update Clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Fetch CCTV Cameras dynamically from database
    useEffect(() => {
        const token = localStorage.getItem('kip_token');
        fetch('/api/security/cctv', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                setCctvCameras(json.data);
            }
        })
        .catch(err => console.error('[SecurityStationPage] Failed to fetch CCTV:', err));
    }, []);

    // Fetch Live Patrol Data
    useEffect(() => {
        const fetchPatrolData = async () => {
            try {
                const token = localStorage.getItem('kip_token');
                const [guardsRes, checkpointsRes, stationsRes, tracksRes, historyRes] = await Promise.all([
                    fetch('/api/security/patrol/active', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/security/patrol/checkpoints', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/security/patrol/stations', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/security/patrol/tracks', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/security/patrol/history', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                const guardsData = await guardsRes.json();
                const checkpointsData = await checkpointsRes.json();
                const stationsData = await stationsRes.json();
                const tracksData = await tracksRes.json();
                const historyData = await historyRes.json();
                
                if (Array.isArray(guardsData)) setPatrolGuards(guardsData);
                if (Array.isArray(checkpointsData)) setStationCheckpoints(checkpointsData);
                if (Array.isArray(stationsData)) setMapStations(stationsData);
                if (Array.isArray(tracksData)) setPatrolTracks(tracksData);
                if (Array.isArray(historyData)) setPatrolHistory(historyData);
            } catch (err) {
                console.error('[SecurityStationPage] Error fetching patrol data:', err);
            }
        };
        fetchPatrolData();
        const interval = setInterval(fetchPatrolData, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="som-security-station">
            <header className="som-security-header">
                <div className="som-header-left">
                    <h1 className="som-security-title">SECURITY CONTROL CENTER</h1>
                </div>

                <div className="som-station-tabs">
                    <button className={`som-station-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
                    <button className={`som-station-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Patrol Map</button>
                    <button className={`som-station-tab ${activeTab === 'cctv' ? 'active' : ''}`} onClick={() => setActiveTab('cctv')}>CCTV Feed</button>
                    <button className={`som-station-tab ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>Incidents</button>
                    <button className={`som-station-tab ${activeTab === 'queues' ? 'active' : ''}`} onClick={() => setActiveTab('queues')}>Truck Queues</button>
                </div>

                <div className="som-header-right">
                    <div className="som-security-clock">{currentTime}</div>
                    <div className="som-security-date">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </header>

            <main className={`som-security-content tab-${activeTab}`}>
                <div className="som-security-main-panel">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'incidents' && <IncidentsTab />}
                    {activeTab === 'overview' && (
                        <PatrolMapTab
                            mapStations={mapStations}
                            patrolGuards={patrolGuards}
                            stationCheckpoints={stationCheckpoints}
                            patrolTracks={patrolTracks}
                            cctvCameras={cctvCameras}
                            setProofIndex={setProofIndex}
                            setActiveProof={setActiveProof}
                            replaySessionId={replaySessionId}
                            setReplaySessionId={setReplaySessionId}
                        />
                    )}
                    {activeTab === 'cctv' && <CctvFeedTab setSelectedCctv={setSelectedCctv} cctvCameras={cctvCameras} />}
                    {activeTab === 'queues' && <TruckQueuesTab />}
                </div>

                <SecurityAside 
                    patrolGuards={patrolGuards} 
                    stationCheckpoints={stationCheckpoints}
                    patrolHistory={patrolHistory}
                    replaySessionId={replaySessionId}
                    setReplaySessionId={setReplaySessionId}
                />
            </main>

            <ProofModal 
                activeProof={activeProof}
                setActiveProof={setActiveProof}
                proofIndex={proofIndex}
                setProofIndex={setProofIndex}
                currentTime={currentTime}
            />

            <CctvModal 
                selectedCctv={selectedCctv}
                setSelectedCctv={setSelectedCctv}
            />
        </div>
    )
}

export default SecurityStationPage

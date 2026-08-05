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

function SecurityStationPage({ user, isCamConfigOpen, setIsCamConfigOpen }) {
    // ── Detect ?mode=mobile from URL — render bare Patrol Map for Flutter WebView ──
    const urlParams = new URLSearchParams(window.location.search);
    const isMobileEmbed = urlParams.get('mode') === 'mobile';

    // If mobile embed: inject stored token from URL param (Flutter passes it)
    useEffect(() => {
        const tokenFromUrl = urlParams.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('kip_token', tokenFromUrl);
        }
    }, []);

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
    const fetchCctvCameras = () => {
        const token = localStorage.getItem('kip_token');
        fetch('/api/security/cctv', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) {
                    setCctvCameras(json);
                } else if (json.success && Array.isArray(json.data)) {
                    setCctvCameras(json.data);
                }
            })
            .catch(err => console.error('[SecurityStationPage] Failed to fetch CCTV:', err));
    };

    useEffect(() => {
        fetchCctvCameras();
    }, []);


    // Fetch Live Patrol Data
    useEffect(() => {
        const fetchPatrolData = async () => {
            try {
                const token = localStorage.getItem('kip_token');
                const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [guardsRes, checkpointsRes, stationsRes, tracksRes, historyRes] = await Promise.all([
                    fetch('/api/security/patrol/active', { headers: authHeaders }),
                    fetch('/api/security/patrol/checkpoints', { headers: authHeaders }),
                    fetch('/api/security/patrol/stations', { headers: authHeaders }),
                    fetch('/api/security/patrol/tracks', { headers: authHeaders }),
                    fetch('/api/security/patrol/history', { headers: authHeaders })
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

    // ══════════════════════════════════════════════════════════════
    // MOBILE EMBED MODE — Flutter WebView renders ONLY PatrolMapTab
    // URL: http://host:5177/security?mode=mobile&token=<jwt>
    // ══════════════════════════════════════════════════════════════
    if (isMobileEmbed) {
        return (
            <div className="som-mobile-embed-container" style={{
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                background: '#0f172a',
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
            }}>
                <PatrolMapTab
                    isMobileEmbed={true}
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
            </div>
        );
    }

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
                    {activeTab === 'cctv' && (
                        <CctvFeedTab
                            setSelectedCctv={setSelectedCctv}
                            cctvCameras={cctvCameras}
                        />
                    )}
                    {activeTab === 'queues' && <TruckQueuesTab />}
                </div>

                {activeTab === 'overview' && (
                    <SecurityAside
                        patrolGuards={patrolGuards}
                        stationCheckpoints={stationCheckpoints}
                        patrolHistory={patrolHistory}
                        replaySessionId={replaySessionId}
                        setReplaySessionId={setReplaySessionId}
                    />
                )}
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

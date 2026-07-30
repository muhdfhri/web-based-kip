import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import './PatrolMapModern.css';
import { FaCog, FaPlay, FaPause, FaStop, FaTachometerAlt } from 'react-icons/fa';

// Helper Haversine Formula (Meter)
const calculateHaversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// 🛡️ 2D Kalman Filter — Meredam GPS Multipath Error & Bergetar (Jumping GPS)
class KalmanFilter2D {
    constructor(processNoise = 0.00001, measurementNoise = 0.00008) {
        this.q = processNoise;       // Process Noise (Kecepatan pergerakan wajar)
        this.r = measurementNoise;  // Measurement Noise (Variansi eror sensor GPS HP)
        this.lat = null;
        this.lng = null;
        this.pLat = 1;
        this.pLng = 1;
    }

    filter(lat, lng) {
        if (this.lat === null || this.lng === null) {
            this.lat = lat;
            this.lng = lng;
            return [lat, lng];
        }

        // 1. Prediction Step (Estimasi error variance)
        this.pLat = this.pLat + this.q;
        this.pLng = this.pLng + this.q;

        // 2. Measurement Update Step (Hitung Kalman Gain)
        const kLat = this.pLat / (this.pLat + this.r);
        const kLng = this.pLng / (this.pLng + this.r);

        // 3. Update State (Menghaluskan posisi berdasarkan gain)
        this.lat = this.lat + kLat * (lat - this.lat);
        this.lng = this.lng + kLng * (lng - this.lng);

        // 4. Update Covariance
        this.pLat = (1 - kLat) * this.pLat;
        this.pLng = (1 - kLng) * this.pLng;

        return [this.lat, this.lng];
    }
}

// 🛡️ Filter Visualisasi 100% Akurat: Hapus Distorsi & Double Kalman
// Menggunakan koordinat presisi langsung dari GPS + Pembersihan Noise Stasioner (< 0.5m)
const filterCleanTrack = (rawPositions) => {
    if (!rawPositions || rawPositions.length === 0) return [];
    
    const cleanPoints = [rawPositions[0]];
    for (let i = 1; i < rawPositions.length; i++) {
        const prev = cleanPoints[cleanPoints.length - 1];
        const curr = rawPositions[i];
        const dist = calculateHaversine(prev[0], prev[1], curr[0], curr[1]);
        
        // Hanya saring getaran mikro (< 0.5m) saat HP diam, & lompatan teleportasi (> 150m)
        if (dist >= 0.5 && dist <= 150.0) {
            cleanPoints.push(curr);
        }
    }

    return cleanPoints;
};

function MapUpdater({ center, zoom, bearing }) {
    const map = useMap();
    useEffect(() => {
        if (center && zoom) map.setView(center, zoom);
        if (bearing !== undefined && map.setBearing) map.setBearing(bearing);
    }, [center, zoom, bearing, map]);
    return null;
}

function PatrolMapTab({ mapStations = [], patrolGuards = [], stationCheckpoints = [], patrolTracks = [], cctvCameras = [], setProofIndex, setActiveProof, replaySessionId, setReplaySessionId }) {
    const defaultLat = parseFloat(localStorage.getItem('mewah_factory_lat')) || 3.683095;
    const defaultLng = parseFloat(localStorage.getItem('mewah_factory_lng')) || 98.704352;
    const defaultZoom = parseInt(localStorage.getItem('mewah_factory_zoom')) || 18;
    const defaultBearing = parseInt(localStorage.getItem('mewah_factory_bearing')) || 0;
    const defaultGpsOffsetLat = parseFloat(localStorage.getItem('mewah_gps_offset_lat')) || 0;
    const defaultGpsOffsetLng = parseFloat(localStorage.getItem('mewah_gps_offset_lng')) || 0;

    const [center, setCenter] = useState([defaultLat, defaultLng]);
    const [zoom, setZoom] = useState(defaultZoom);
    const [bearing, setBearing] = useState(defaultBearing);
    const [gpsOffsetLat, setGpsOffsetLat] = useState(defaultGpsOffsetLat);
    const [gpsOffsetLng, setGpsOffsetLng] = useState(defaultGpsOffsetLng);
    
    const [showSettings, setShowSettings] = useState(false);
    const [tempLat, setTempLat] = useState(defaultLat);
    const [tempLng, setTempLng] = useState(defaultLng);
    const [tempZoom, setTempZoom] = useState(defaultZoom);
    const [tempBearing, setTempBearing] = useState(defaultBearing);
    const [tempGpsOffsetLat, setTempGpsOffsetLat] = useState(defaultGpsOffsetLat);
    const [tempGpsOffsetLng, setTempGpsOffsetLng] = useState(defaultGpsOffsetLng);

    // Replay state
    const [replayData, setReplayData] = useState(null);
    const [replayIndex, setReplayIndex] = useState(0);
    const [replayPlaying, setReplayPlaying] = useState(false);
    const [replaySpeed, setReplaySpeed] = useState(1);
    const replayTimerRef = useRef(null);

    const saveSettings = () => {
        localStorage.setItem('mewah_factory_lat', tempLat);
        localStorage.setItem('mewah_factory_lng', tempLng);
        localStorage.setItem('mewah_factory_zoom', tempZoom);
        localStorage.setItem('mewah_factory_bearing', tempBearing);
        localStorage.setItem('mewah_gps_offset_lat', tempGpsOffsetLat);
        localStorage.setItem('mewah_gps_offset_lng', tempGpsOffsetLng);
        setCenter([tempLat, tempLng]);
        setZoom(tempZoom);
        setBearing(tempBearing);
        setGpsOffsetLat(tempGpsOffsetLat);
        setGpsOffsetLng(tempGpsOffsetLng);
        setShowSettings(false);
    };

    // Fetch replay data when replaySessionId changes
    useEffect(() => {
        if (!replaySessionId) {
            setReplayData(null);
            setReplayIndex(0);
            setReplayPlaying(false);
            if (replayTimerRef.current) clearInterval(replayTimerRef.current);
            return;
        }
        const token = localStorage.getItem('kip_token');
        fetch(`/api/security/patrol/replay/${replaySessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            if (data.tracks && data.tracks.length > 0) {
                setReplayData(data);
                setReplayIndex(0);
                setReplayPlaying(true);
            }
        })
        .catch(err => console.error('Replay fetch error:', err));
    }, [replaySessionId]);

    // Replay animation timer
    useEffect(() => {
        if (replayTimerRef.current) clearInterval(replayTimerRef.current);
        if (!replayPlaying || !replayData) return;

        const totalPoints = replayData.tracks.length;
        replayTimerRef.current = setInterval(() => {
            setReplayIndex(prev => {
                if (prev >= totalPoints - 1) {
                    setReplayPlaying(false);
                    return totalPoints - 1;
                }
                return prev + 1;
            });
        }, 150 / replaySpeed);

        return () => clearInterval(replayTimerRef.current);
    }, [replayPlaying, replayData, replaySpeed]);

    const stopReplay = useCallback(() => {
        setReplaySessionId(null);
    }, [setReplaySessionId]);

    const isReplayMode = !!replayData;

    // Which checkpoints have been "reached" in replay so far
    const replayVisibleCheckpoints = isReplayMode ? replayData.checkpoints.filter((cp, i) => {
        if (!replayData.tracks[replayIndex]) return false;
        const currentTime = new Date(replayData.tracks[replayIndex].recorded_at);
        return new Date(cp.verified_at) <= currentTime;
    }) : [];

    // Replay trail (only up to current index)
    const replayTrailPositions = isReplayMode
        ? replayData.tracks.slice(0, replayIndex + 1).map(t => [parseFloat(t.latitude) + gpsOffsetLat, parseFloat(t.longitude) + gpsOffsetLng])
        : [];

    // Current replay avatar position
    const replayCurrentPos = isReplayMode && replayData.tracks[replayIndex]
        ? [parseFloat(replayData.tracks[replayIndex].latitude) + gpsOffsetLat, parseFloat(replayData.tracks[replayIndex].longitude) + gpsOffsetLng]
        : null;

    const getStationData = (cp) => ({
        status: 'SECURE',
        lastCheck: new Date(cp.verified_at).toLocaleTimeString('id-ID'),
        activeProofImg: cp.verification_photo || null,
        activeGuardName: cp.guard_name || `Guard`,
        proofs: [{
            guard: cp.guard_name || `Guard`,
            id: cp.session_id,
            img: cp.verification_photo || null,
            time: new Date(cp.verified_at).toLocaleTimeString('id-ID'),
            date: new Date(cp.verified_at).toLocaleDateString('id-ID')
        }]
    });

    const createGuardIcon = (guard, color = '#10b981', searching = false) => {
        const initial = (guard.name || guard.guard_name || '?').charAt(0).toUpperCase();
        const photoHtml = guard.latest_photo
            ? `<img src="${guard.latest_photo}" alt="G" style="width:100%;height:100%;object-fit:cover;" />`
            : `<span style="color:#fff;font-size:15px;font-weight:800;">${initial}</span>`;
        const borderColor = searching ? '#ef4444' : color;
        const avatarStyle = searching
            ? `border-color:${borderColor};box-shadow:0 0 12px ${borderColor}40;opacity:0.7;`
            : `border-color:${borderColor};box-shadow:0 0 12px ${borderColor}40;`;
        const tagExtra = searching ? `<div style="font-size:8px;color:#ef4444;font-weight:700;margin-top:2px;">📡 Mencari GPS...</div>` : '';
        return L.divIcon({
            className: 'custom-guard-icon',
            html: `
                <div style="position:absolute;bottom:0px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;z-index:50;">
                    <div class="pm-guard-tag">${guard.name || guard.guard_name || 'Guard'}</div>
                    ${tagExtra}
                    <div style="position:relative;">
                        <div class="pm-guard-avatar" style="${avatarStyle}">
                            ${photoHtml}
                        </div>
                        <div class="pm-guard-pulse" style="border-color:${borderColor};"></div>
                        <div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${borderColor};"></div>
                    </div>
                </div>
            `,
            iconSize: [40, 56],
            iconAnchor: [20, 56]
        });
    };

    const createCheckpointIcon = (cp) => L.divIcon({
        className: 'custom-cp-icon',
        html: `<div class="pm-cp-marker"><div class="pm-cp-dot"></div><div class="pm-cp-label">${cp.station_name || `CP-${cp.id}`}</div></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    return (
        <div className="som-view-container overview-grid" style={{ position: 'relative' }}>
            {/* Settings Modal */}
            {showSettings && (
                <div className="pm-settings-overlay">
                    <div className="pm-settings-modal">
                        <h3 className="pm-settings-title">Pengaturan Lokasi Pabrik</h3>
                        <div className="pm-field"><label>Latitude</label><input type="number" step="0.000001" value={tempLat} onChange={e => setTempLat(parseFloat(e.target.value))} /></div>
                        <div className="pm-field"><label>Longitude</label><input type="number" step="0.000001" value={tempLng} onChange={e => setTempLng(parseFloat(e.target.value))} /></div>
                        <div className="pm-field"><label>Zoom Level</label><input type="number" step="1" min="1" max="22" value={tempZoom} onChange={e => setTempZoom(parseInt(e.target.value))} /></div>
                        <div className="pm-field"><label>Rotasi Peta (Derajat)</label><input type="number" step="1" min="0" max="360" value={tempBearing} onChange={e => setTempBearing(parseInt(e.target.value))} /></div>
                        
                        <h3 className="pm-settings-title" style={{ marginTop: '20px', fontSize: '13px', color: '#f59e0b' }}>Kalibrasi Offset Satelit (GPS)</h3>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>Jika titik GPS melenceng dari bangunan di peta Leaflet, atur kalibrasi ini (contoh: 0.00005)</div>
                        <div className="pm-field"><label>Offset Lat (Utara/Selatan)</label><input type="number" step="0.000005" value={tempGpsOffsetLat} onChange={e => setTempGpsOffsetLat(parseFloat(e.target.value))} /></div>
                        <div className="pm-field"><label>Offset Lng (Timur/Barat)</label><input type="number" step="0.000005" value={tempGpsOffsetLng} onChange={e => setTempGpsOffsetLng(parseFloat(e.target.value))} /></div>

                        <div className="pm-settings-actions">
                            <button onClick={() => setShowSettings(false)} className="pm-btn-cancel">Batal</button>
                            <button onClick={saveSettings} className="pm-btn-save">Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            <section className="som-patrol-map-section mini">
                <div className="som-section-header">
                    <div className="som-section-title">
                        <span className="dot animate-ping" style={{ backgroundColor: isReplayMode ? '#f59e0b' : '#ffdb3b' }}></span>
                        {isReplayMode ? `REPLAY: ${replayData.session.guard_name}` : 'LIVE PATROL MAP'}
                    </div>
                    <div className="som-map-legend" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {isReplayMode && (
                            <button onClick={stopReplay} className="pm-stop-replay-btn">
                                <FaStop style={{ marginRight: '5px' }} /> Kembali ke Live
                            </button>
                        )}
                        {!isReplayMode && (
                            <>
                                <span className="legend-item"><span className="dot secure"></span> CHECKPOINT</span>
                                <span className="legend-item"><span className="dot guard"></span> GUARD</span>
                            </>
                        )}
                        <button onClick={() => setShowSettings(true)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', padding: '0 5px' }}>
                            <FaCog style={{ marginRight: '5px' }} />
                        </button>
                    </div>
                </div>

                <div className="som-patrol-map-container mini-map real-map-container" style={{ position: 'relative', height: '100%', minHeight: '500px', backgroundColor: '#0f172a', borderRadius: '10px', overflow: 'hidden' }}>

                    {/* Replay banner */}
                    {isReplayMode && (
                        <div className="pm-replay-banner">
                            <span>🎬 Mode Replay — {replayData.session.guard_name} ({new Date(replayData.session.started_at).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})})</span>
                        </div>
                    )}

                    <MapContainer center={center} zoom={zoom} rotate={true} bearing={bearing} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={false}>
                        <MapUpdater center={center} zoom={zoom} bearing={bearing} />
                        <TileLayer url="http://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution='&copy; Google Maps' maxZoom={22} />

                        {isReplayMode ? (
                            <>
                                {/* Replay trail (drawn progressively) */}
                                {replayTrailPositions.length > 1 && (
                                    <Polyline
                                        positions={replayTrailPositions}
                                        pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round', className: 'pm-track-replay-glow' }}
                                    />
                                )}

                                {/* Replay checkpoints (appear as avatar passes them) */}
                                {replayVisibleCheckpoints.map((cp, i) => {
                                    const sData = getStationData(cp);
                                    return (
                                        <Marker
                                            key={`rcp-${i}`}
                                            position={[parseFloat(cp.latitude) + gpsOffsetLat, parseFloat(cp.longitude) + gpsOffsetLng]}
                                            icon={createCheckpointIcon(cp)}
                                            eventHandlers={{ click: () => { setProofIndex(0); setActiveProof({ name: cp.station_name, ...sData }); } }}
                                        >
                                            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                <div className="pm-tooltip-card">
                                                    <div className="pm-tooltip-title">{cp.station_name}</div>
                                                    <div className="pm-tooltip-meta">{sData.lastCheck}</div>
                                                    {sData.activeProofImg && (
                                                        <div className="pm-tooltip-photo">
                                                            <img src={sData.activeProofImg} alt="Bukti" />
                                                            <div className="pm-click-hint">Klik untuk perbesar</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    );
                                })}

                                {/* Replay guard avatar */}
                                {replayCurrentPos && (
                                    <Marker
                                        position={replayCurrentPos}
                                        icon={createGuardIcon(replayData.session, '#f59e0b')}
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {/* LIVE: GPS Tracks per session */}
                                {patrolTracks && Object.values(
                                    patrolTracks.reduce((acc, t) => {
                                        if (!t.latitude || !t.longitude) return acc;
                                        if (!acc[t.session_id]) acc[t.session_id] = [];
                                        acc[t.session_id].push(t);
                                        return acc;
                                    }, {})
                                ).map(pts => {
                                    const sorted = [...pts].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
                                    const rawPositions = sorted.map(t => [parseFloat(t.latitude), parseFloat(t.longitude)]);
                                    let positions = filterCleanTrack(rawPositions).map(p => [p[0] + gpsOffsetLat, p[1] + gpsOffsetLng]);
                                    
                                    // Sambungkan titik akhir lintasan secara presisi ke marker guard aktif jika ada
                                    const activeGuard = patrolGuards.find(g => g.session_id === sorted[0].session_id && g.latitude && g.longitude);
                                    if (activeGuard) {
                                        const guardPos = [parseFloat(activeGuard.latitude) + gpsOffsetLat, parseFloat(activeGuard.longitude) + gpsOffsetLng];
                                        const lastPos = positions[positions.length - 1];
                                        if (!lastPos || calculateHaversine(lastPos[0], lastPos[1], guardPos[0], guardPos[1]) > 0.3) {
                                            positions = [...positions, guardPos];
                                        }
                                    }
                                    
                                    return (
                                            <React.Fragment key={`lt-${sorted[0].session_id}`}>
                                                {/* Halo Glow */}
                                                <Polyline
                                                    positions={positions}
                                                    pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.2, lineCap: 'round', lineJoin: 'round', className: 'pm-track-halo' }}
                                                />
                                                {/* Core Track (Thin Solid Line + Smoothing) */}
                                                <Polyline
                                                    positions={positions}
                                                    pathOptions={{ color: '#ef4444', weight: 2, opacity: 0.8, lineCap: 'round', lineJoin: 'round', smoothFactor: 1.5 }}
                                                />
                                                {/* 100% Accurate GPS Pings (Filtered Dots) */}
                                                {positions.map((pos, idx) => (
                                                    <CircleMarker
                                                        key={`ping-${idx}`}
                                                        center={pos}
                                                        radius={3}
                                                        pathOptions={{ color: '#fff', weight: 1, fillColor: '#ef4444', fillOpacity: 1 }}
                                                    />
                                                ))}
                                            </React.Fragment>
                                    );
                                })}

                                {/* LIVE: Checkpoint markers */}
                                {stationCheckpoints.map(cp => {
                                    if (!cp.latitude || !cp.longitude) return null;
                                    const sData = getStationData(cp);
                                    return (
                                        <Marker
                                            key={`cp-${cp.id}`}
                                            position={[parseFloat(cp.latitude) + gpsOffsetLat, parseFloat(cp.longitude) + gpsOffsetLng]}
                                            icon={createCheckpointIcon(cp)}
                                            eventHandlers={{ click: () => { setProofIndex(0); setActiveProof({ name: cp.station_name, ...sData }); } }}
                                        >
                                            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="pm-hover-tooltip">
                                                <div className="pm-tooltip-card">
                                                    <div className="pm-tooltip-title">{cp.station_name}</div>
                                                    <div className="pm-tooltip-meta">{sData.lastCheck} • {sData.activeGuardName}</div>
                                                    {sData.activeProofImg && (
                                                        <div className="pm-tooltip-photo">
                                                            <img src={sData.activeProofImg} alt="Bukti" />
                                                            <div className="pm-click-hint">Klik untuk perbesar</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    );
                                })}

                                {/* LIVE: Guard avatars */}
                                {(() => {
                                    // Hitung centroid dari guard yg punya GPS
                                    const guardsWithGps = patrolGuards.filter(g => g.latitude && g.longitude);
                                    const centroidLat = guardsWithGps.length > 0
                                        ? guardsWithGps.reduce((sum, g) => sum + parseFloat(g.latitude), 0) / guardsWithGps.length
                                        : center[0];
                                    const centroidLng = guardsWithGps.length > 0
                                        ? guardsWithGps.reduce((sum, g) => sum + parseFloat(g.longitude), 0) / guardsWithGps.length
                                        : center[1];

                                    return patrolGuards.map((guard, idx, arr) => {
                                        const hasGps = !!(guard.latitude && guard.longitude);
                                        
                                        let lat = hasGps ? parseFloat(guard.latitude) : centroidLat;
                                        let lng = hasGps ? parseFloat(guard.longitude) : centroidLng;
                                        
                                        if (hasGps) {
                                            // Cegah marker bertumpuk jika koordinatnya persis sama
                                            const overlapping = arr.filter(g => g.latitude === guard.latitude && g.longitude === guard.longitude);
                                            if (overlapping.length > 1) {
                                                const myOverlapIdx = overlapping.findIndex(g => g.session_id === guard.session_id);
                                                const offsetDist = 0.00003;
                                                const angle = (Math.PI * 2 / overlapping.length) * myOverlapIdx;
                                                lat += Math.sin(angle) * offsetDist;
                                                lng += Math.cos(angle) * offsetDist;
                                            }
                                        } else {
                                            // Guards tanpa GPS: sebar kecil di sekitar centroid agar tidak tumpuk
                                            const noGpsGuards = arr.filter(g => !g.latitude || !g.longitude);
                                            const myIdx = noGpsGuards.findIndex(g => g.session_id === guard.session_id);
                                            const angle = (Math.PI * 2 / Math.max(noGpsGuards.length, 1)) * myIdx;
                                            lat += Math.sin(angle) * 0.00005;
                                            lng += Math.cos(angle) * 0.00005;
                                        }

                                        return (
                                            <Marker 
                                                key={`g-${guard.session_id}`} 
                                                position={[lat + gpsOffsetLat, lng + gpsOffsetLng]} 
                                                icon={createGuardIcon(guard, '#10b981', !hasGps)} 
                                                zIndexOffset={hasGps ? (1000 - idx) : 500}
                                            />
                                        );
                                    });
                                })()}
                            </>
                        )}
                    </MapContainer>

                    {/* HUD or Replay Controls */}
                    {isReplayMode ? (
                        <div className="pm-replay-controls">
                            <button onClick={() => setReplayPlaying(!replayPlaying)} className="pm-ctrl-btn">
                                {replayPlaying ? <FaPause /> : <FaPlay />}
                            </button>
                            <button onClick={stopReplay} className="pm-ctrl-btn stop"><FaStop /></button>
                            <div className="pm-progress-bar">
                                <input
                                    type="range"
                                    min={0}
                                    max={replayData.tracks.length - 1}
                                    value={replayIndex}
                                    onChange={e => { setReplayIndex(parseInt(e.target.value)); setReplayPlaying(false); }}
                                    className="pm-slider"
                                />
                            </div>
                            <div className="pm-speed-selector">
                                <FaTachometerAlt style={{ marginRight: '4px', fontSize: '11px' }} />
                                {[1, 2, 4].map(s => (
                                    <button key={s} onClick={() => setReplaySpeed(s)} className={`pm-speed-btn ${replaySpeed === s ? 'active' : ''}`}>{s}x</button>
                                ))}
                            </div>
                            <div className="pm-replay-progress-text">
                                {replayIndex + 1} / {replayData.tracks.length}
                            </div>
                        </div>
                    ) : (
                        <div className="pm-hud">
                            <div className="pm-hud-item">
                                <span className="pm-hud-value">{patrolGuards.length}</span>
                                <span className="pm-hud-label">Aktif</span>
                            </div>
                            <div className="pm-hud-divider"></div>
                            <div className="pm-hud-item">
                                <span className="pm-hud-value">{stationCheckpoints.length}</span>
                                <span className="pm-hud-label">Checkpoint</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default PatrolMapTab;

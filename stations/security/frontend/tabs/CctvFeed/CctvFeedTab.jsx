import React from 'react';

function CctvFeedTab({ cctvCameras, setSelectedCctv }) {
    return (
        <div className="som-view-container cctv-grid-view" style={{ padding: 0 }}>
            <section className="som-cctv-section" style={{ padding: 0 }}>
                <div className="som-cctv-grid extended" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0px', height: 'auto' }}>
                    {cctvCameras.map(camera => (
                        <div key={camera.id} className="som-cctv-card live" style={{ borderRadius: '0px', margin: '0px', boxShadow: 'none', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <div className="som-cctv-feed-overlay" style={{ zIndex: 3 }}>
                                <span className="cam-name">{camera.camera_name}</span>
                                <span className="cam-status">LIVE</span>
                            </div>
                            <div className="som-cctv-display" style={{ position: 'relative', overflow: 'hidden', flex: 1, aspectRatio: '16/9' }}>
                                <img 
                                    src={`/api/security/cctv/stream/${camera.id}`} 
                                    alt={camera.camera_name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                                <div className="som-cctv-noise" style={{ pointerEvents: 'none', zIndex: 2 }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#ffffff', borderTop: '1px solid #e2e8f0', zIndex: 3 }}>
                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>SYS_LINK: ACTIVE</span>
                                <button
                                    onClick={() => setSelectedCctv(camera)}
                                    title="Zoom Camera"
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex', alignItems: 'center' }}
                                >
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {cctvCameras.length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '14px', gridColumn: '1/-1', textAlign: 'center', padding: '40px', border: '1px dashed #334155', borderRadius: '8px' }}>
                            No cameras registered in database.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default CctvFeedTab;

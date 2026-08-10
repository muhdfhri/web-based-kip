import React, { useState } from 'react';

function CctvFeedTab({ cctvCameras, setSelectedCctv }) {
    // null = ALL (auto-fit), number = fixed columns
    const [gridSize, setGridSize] = useState(null); // default: ALL

    /**
     * 🎯 Helper Function: determine stream URL per camera
     */
    const getAiStreamUrl = (camera) => {
        if (camera && camera.stream_url) return camera.stream_url;
        const isDirectDevPort = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '5177');
        const baseUrl = isDirectDevPort ? 'http://localhost:3101' : '';
        return `${baseUrl}/api/security/cctv/stream/${camera ? camera.id : ''}`;
    };

    // Resolve actual column count from gridSize state
    const resolveColumns = () => {
        if (gridSize !== null) return gridSize;
        // ALL: auto-fit based on camera count
        const count = cctvCameras.length;
        if (count <= 1) return 1;
        if (count <= 4) return 2;
        if (count <= 9) return 3;
        if (count <= 16) return 4;
        return 6;
    };
    const cols = resolveColumns();

    // Mini grid icon squares count & sizing per grid option
    const gridOptions = [
        { n: 3, squares: 9,  s: 3.2, g: 0.4 },
        { n: 4, squares: 16, s: 2.4, g: 0.32 },
        { n: 6, squares: 36, s: 1.6, g: 0.16 },
    ];

    return (
        <div className="som-view-container cctv-grid-view" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* ── Grid Size & Stream Info Toolbar ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                width: '100%',
                padding: '10px 20px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                boxSizing: 'border-box',
                flexShrink: 0,
            }}>
                {/* Left Side: Title & Minimalist Aktif / Non-Aktif Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 8px #0284c7', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        LIVE CCTV MONITORING
                    </span>
                    
                    {/* Minimalist Aktif Badge */}
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Aktif:</span>
                        <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {cctvCameras.filter(c => c.is_active === 1 || c.is_active === true || c.is_active === undefined).length}
                        </strong>
                    </span>

                    {/* Minimalist Non-Aktif Badge */}
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>Non-Aktif:</span>
                        <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {cctvCameras.filter(c => c.is_active === 0 || c.is_active === false).length}
                        </strong>
                    </span>
                </div>

                {/* Extreme Right Side: Layout Grid Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Layout Grid:
                    </span>
                    <div className="som-cctv-grid-selector">
                        {/* ALL button */}
                        <button
                            className={`som-grid-btn ${gridSize === null ? 'active' : ''}`}
                            onClick={() => setGridSize(null)}
                            title="Show all cameras"
                        >
                            <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor">
                                <rect x="0" y="0" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="4.4" y="0" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="8.8" y="0" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="0" y="4.4" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="4.4" y="4.4" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="8.8" y="4.4" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="0" y="8.8" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="4.4" y="8.8" width="3.2" height="3.2" rx="0.4"/>
                                <rect x="8.8" y="8.8" width="3.2" height="3.2" rx="0.4"/>
                            </svg>
                            ALL
                        </button>

                        {/* Fixed-size grid buttons */}
                        {gridOptions.map(({ n, squares, s, g }) => (
                            <button
                                key={n}
                                className={`som-grid-btn ${gridSize === n ? 'active' : ''}`}
                                onClick={() => setGridSize(n)}
                                title={`${n}×${n} grid`}
                            >
                                <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor">
                                    {Array.from({ length: squares }).map((_, i) => {
                                        const col = i % n;
                                        const row = Math.floor(i / n);
                                        return (
                                            <rect
                                                key={i}
                                                x={col * (s + g)}
                                                y={row * (s + g)}
                                                width={s}
                                                height={s}
                                                rx="0.3"
                                            />
                                        );
                                    })}
                                </svg>
                                {n}×{n}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Camera Grid (Scrollable when content overflows) ── */}
            <section className="som-cctv-section som-cctv-scrollable" style={{ padding: 0, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 170px)' }}>
                <div
                    className="som-cctv-grid extended"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gap: '0px',
                        height: 'auto',
                    }}
                >
                    {cctvCameras.map(camera => (
                        <div
                            key={camera.id}
                            className="som-cctv-card live"
                            style={{
                                borderRadius: '0px',
                                margin: '0px',
                                boxShadow: 'none',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div className="som-cctv-feed-overlay" style={{ zIndex: 3 }}>
                                <span className="cam-name">{camera.camera_name}</span>
                                <span className="cam-status">LIVE</span>
                            </div>
                            <div
                                className="som-cctv-display"
                                style={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    flex: 1,
                                    aspectRatio: '16/9',
                                }}
                            >
                                <img
                                    src={getAiStreamUrl(camera)}
                                    alt={camera.camera_name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                    }}
                                />
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    justify: 'space-between',
                                    alignItems: 'center',
                                    padding: gridSize !== null && gridSize >= 6 ? '4px 8px' : '8px 12px',
                                    background: '#ffffff',
                                    borderTop: '1px solid #e2e8f0',
                                    zIndex: 3,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: gridSize !== null && gridSize >= 6 ? '9px' : '10px',
                                        color: '#64748b',
                                        fontWeight: 'bold',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '80%',
                                    }}
                                >
                                    LOCATION: {camera.location || 'SECURITY_AREA'}
                                </span>
                                <button
                                    onClick={() => setSelectedCctv(camera)}
                                    title="Zoom Camera"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <svg
                                        width={gridSize !== null && gridSize >= 6 ? 12 : 14}
                                        height={gridSize !== null && gridSize >= 6 ? 12 : 14}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}

                    {cctvCameras.length === 0 && (
                        <div style={{
                            color: '#94a3b8',
                            fontSize: '14px',
                            gridColumn: '1/-1',
                            textAlign: 'center',
                            padding: '40px',
                            border: '1px dashed #334155',
                            borderRadius: '8px',
                        }}>
                            No cameras registered in database.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default CctvFeedTab;
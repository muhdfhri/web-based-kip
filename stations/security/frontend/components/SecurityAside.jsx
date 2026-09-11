import React from 'react';
import { FaUserShield, FaMapMarkerAlt, FaShieldAlt, FaPlay, FaStop, FaWalking } from 'react-icons/fa';

function SecurityAside({ patrolGuards, stationCheckpoints, patrolHistory = [], replaySessionId, setReplaySessionId }) {
    return (
        <aside className="som-security-aside">
            {/* GUARD STATUS */}
            <div className="som-patrol-card guards-card">
                <div className="som-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><FaUserShield style={{ marginRight: '6px', fontSize: '11px' }} />GUARD STATUS</span>
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>{patrolGuards.length} ACTIVE</span>
                </div>
                <div className="som-guards-list">
                    {patrolGuards.length === 0 && <div style={{color: '#64748b', fontSize: '12px', padding: '15px', textAlign: 'center'}}>No active guards</div>}
                    {patrolGuards.map(guard => {
                        const gColor = '#f59e0b';
                        return (
                            <div key={guard.id || guard.session_id}
                                className="som-guard-item"
                                style={{ transition: 'all 0.2s', padding: '10px', borderRadius: '8px' }}
                            >
                                <div className="guard-initials" style={{color: '#fff', background: gColor, border: `1px solid ${gColor}`}}>{guard.name ? guard.name.charAt(0).toUpperCase() : '?'}</div>
                                <div className="guard-info">
                                    <div className="guard-name-row"><span className="guard-name">{guard.name || `ID: ${guard.session_id}`}</span></div>
                                    <div className="guard-location">
                                        {(!guard.latitude || !guard.longitude) ? (
                                            <b style={{ color: '#ef4444', animation: 'pulse 2s infinite' }}>Searching GPS Signal...</b>
                                        ) : (
                                            <b>{guard.current_station_key || 'Patrolling'}</b>
                                        )}
                                    </div>
                                </div>
                                <div className={`status-dot ${(!guard.latitude || !guard.longitude) ? 'waiting' : 'online'}`} style={{background: (!guard.latitude || !guard.longitude) ? '#ef4444' : gColor}}></div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* PATROL HISTORY — with Replay buttons */}
            <div className="som-patrol-card journey-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="som-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><FaWalking style={{ marginRight: '6px', fontSize: '11px' }} />PATROL HISTORY</span>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>{patrolHistory.length} SESSIONS</span>
                </div>
                <div className="som-checkpoint-journey" style={{ flex: 1, overflowY: 'auto' }}>
                    {patrolHistory.length === 0 && (
                        <div style={{color: '#64748b', fontSize: '12px', padding: '15px', textAlign: 'center'}}>No patrol history today</div>
                    )}
                    {patrolHistory.map((session) => {
                        const isActive = session.status === 'active';
                        const isReplaying = replaySessionId === session.id;
                        const formatTime = (dateStr) => {
                            if (!dateStr) return null;
                            const d = new Date(dateStr);
                            const hours = String(d.getHours()).padStart(2, '0');
                            const mins = String(d.getMinutes()).padStart(2, '0');
                            return `${hours}:${mins}`;
                        };
                        const startTime = formatTime(session.started_at);
                        const endTime = formatTime(session.completed_at);

                        return (
                            <div key={session.id} className={`som-history-item ${isReplaying ? 'replaying' : ''}`}>
                                <div className="history-left">
                                    <div className={`history-status-dot ${isActive ? 'active' : 'completed'}`}></div>
                                    <div className="history-info">
                                        <div className="history-name">{session.guard_name}</div>
                                        <div className="history-meta">
                                            {startTime}{endTime ? ` — ${endTime} WIB` : ' WIB (active)'}
                                            <span className="history-cp-count" title={session.checkpoint_names || `${session.checkpoint_count} Checkpoints`}>
                                                <FaMapMarkerAlt style={{ fontSize: '9px', marginLeft: '4px', marginRight: '3px' }} /> 
                                                {session.checkpoint_names ? `${session.checkpoint_count} (${session.checkpoint_names})` : session.checkpoint_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!isActive && (session.track_count > 0 || session.checkpoint_count > 0) && (
                                    <button
                                        className={`history-replay-btn ${isReplaying ? 'stop' : ''}`}
                                        onClick={() => setReplaySessionId(isReplaying ? null : session.id)}
                                        title={isReplaying ? 'Stop Replay' : 'Replay Patrol'}
                                    >
                                        {isReplaying ? <FaStop /> : <FaPlay />}
                                    </button>
                                )}
                                {isActive && (
                                    <span className="history-live-badge">LIVE</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

export default SecurityAside;

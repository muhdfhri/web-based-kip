import express from 'express';
import { dbPool } from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from '../middleware/jwtMiddleware.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper to calculate 7 AM of the current operational shift (in server's local time)
const getShiftStartTimeStr = () => {
    const now = new Date();
    let startOfDay = new Date(now);
    startOfDay.setHours(7, 0, 0, 0);
    // If it's currently before 7 AM, the operational day started yesterday at 7 AM
    if (now.getHours() < 7) {
        startOfDay.setDate(startOfDay.getDate() - 1);
    }
    const pad = (n) => n.toString().padStart(2, '0');
    return `${startOfDay.getFullYear()}-${pad(startOfDay.getMonth() + 1)}-${pad(startOfDay.getDate())} ${pad(startOfDay.getHours())}:${pad(startOfDay.getMinutes())}:${pad(startOfDay.getSeconds())}`;
};

/**
 * GET /api/security/patrol/active
 * Fetch currently active patrols (guards)
 */
router.get('/active', async (req, res) => {
  try {
    // Tampilkan HANYA guard yang sedang memiliki sesi patroli AKTIF (status = 'active')
    const [rows] = await dbPool.query(`
      SELECT 
        s.id as session_id,
        s.session_code,
        s.guard_name as name,
        s.status,
        (SELECT station_name FROM security_session_checkpoints c WHERE c.session_id = s.id ORDER BY verified_at DESC LIMIT 1) as current_station_key,
        (SELECT verified_at FROM security_session_checkpoints c WHERE c.session_id = s.id ORDER BY verified_at DESC LIMIT 1) as last_update,
        (SELECT verification_photo FROM security_session_checkpoints c WHERE c.session_id = s.id AND verification_photo IS NOT NULL ORDER BY verified_at DESC LIMIT 1) as latest_photo,
        gs.latitude,
        gs.longitude
      FROM security_patrol_sessions s
      JOIN security_guards_status gs ON gs.user_id = s.guard_id
      WHERE s.status = 'active' 
        AND gs.status = 'active'
        AND gs.latitude IS NOT NULL 
        AND gs.longitude IS NOT NULL
      ORDER BY s.started_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching active guards:', error);
    res.status(500).json({ error: 'Failed to fetch active guards' });
  }
});

/**
 * GET /api/security/patrol/sessions
 * Fetch patrol sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM security_patrol_sessions ORDER BY started_at DESC LIMIT 50'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching patrol sessions:', error);
    res.status(500).json({ error: 'Failed to fetch patrol sessions' });
  }
});

/**
 * GET /api/security/patrol/checkpoints
 * Fetch patrol checkpoints (photos/notes uploaded by guards)
 */
router.get('/checkpoints', async (req, res) => {
  try {
    const startTimeStr = getShiftStartTimeStr();

    const [rows] = await dbPool.query(`
      SELECT c.*, s.guard_name, s.guard_id 
      FROM security_session_checkpoints c
      JOIN security_patrol_sessions s ON c.session_id = s.id
      WHERE c.status = "verified" AND (s.status = "active" OR c.verified_at >= ?)
      ORDER BY c.verified_at DESC 
      LIMIT 200
    `, [startTimeStr]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching patrol checkpoints:', error);
    res.status(500).json({ error: 'Failed to fetch patrol checkpoints' });
  }
});

/**
 * POST /api/security/patrol/sessions/start
 * Start a new patrol session from mobile app
 */
router.post('/sessions/start', async (req, res) => {
  const user_id = req.body.user_id || req.body.guard_id;
  const shift = req.body.shift;
  const initial_lat = req.body.initial_lat;
  const initial_lng = req.body.initial_lng;
  let guard_name = req.body.guard_name;
  
  if (!user_id || !shift) {
    return res.status(400).json({ error: 'user_id and shift are required' });
  }
  
  try {
    // Automatically fetch guard_name from mewah_auth if not provided
    if (!guard_name) {
      try {
        const [userRows] = await dbPool.query('SELECT username FROM mewah_auth.users WHERE id = ?', [user_id]);
        if (userRows.length > 0) {
          guard_name = userRows[0].username;
        } else {
          guard_name = `Guard-${user_id}`;
        }
      } catch (err) {
        guard_name = `Guard-${user_id}`;
      }
    }

    // Auto-close any previous active session for this guard to maintain clean single-session lifecycle
    await dbPool.query(
      'UPDATE security_patrol_sessions SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE guard_id = ? AND status = "active"',
      [user_id]
    );

    const session_code = `PTR-${Date.now()}`;
    const [result] = await dbPool.query(
      'INSERT INTO security_patrol_sessions (session_code, guard_id, guard_name, shift, status) VALUES (?, ?, ?, ?, "active")',
      [session_code, user_id, guard_name, shift]
    );
    
    // Clear Kalman filter cache for this session if any
    sessionKalmanMap.delete(result.insertId);

    // Update guard status: Reset to NULL unless initial_lat & initial_lng are provided for the NEW patrol
    try {
        if (initial_lat && initial_lng) {
            const initLatNum = parseFloat(initial_lat);
            const initLngNum = parseFloat(initial_lng);
            
            await dbPool.query(
              'INSERT INTO security_guards_status (user_id, status, latitude, longitude, last_update) VALUES (?, "active", ?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE status="active", latitude=VALUES(latitude), longitude=VALUES(longitude), last_update=CURRENT_TIMESTAMP',
              [user_id, initLatNum, initLngNum]
            );

            // Simpan sebagai titik PERTAMA di tracks untuk sesi baru ini
            await dbPool.query(
              'INSERT INTO security_patrol_tracks (session_id, latitude, longitude) VALUES (?, ?, ?)',
              [result.insertId, initLatNum, initLngNum]
            );
        } else {
            // Jika belum ada koordinat saat tekan start: RESET lat & lng ke NULL agar tidak memakai lokasi sesi lama!
            await dbPool.query(
              'INSERT INTO security_guards_status (user_id, status, latitude, longitude, last_update) VALUES (?, "active", NULL, NULL, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE status="active", latitude=NULL, longitude=NULL, last_update=CURRENT_TIMESTAMP',
              [user_id]
            );
        }
    } catch (e) {
        console.error('Error resetting/updating guard status on session start:', e);
    }

    res.status(201).json({ success: true, session_id: result.insertId, session_code, message: 'Patrol session started' });
  } catch (error) {
    console.error('Error starting patrol session:', error);
    res.status(500).json({ error: 'Failed to start patrol session' });
  }
});

/**
 * POST /api/security/patrol/sessions/end
 * End a patrol session from mobile app
 */
router.post('/sessions/end', async (req, res) => {
  const { session_id } = req.body;
  
  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' });
  }
  
  try {
    // 1. Set status sesi menjadi completed
    await dbPool.query(
      'UPDATE security_patrol_sessions SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [session_id]
    );
    
    // 2. Ambil guard_id dan reset status guard di security_guards_status
    const [sess] = await dbPool.query('SELECT guard_id FROM security_patrol_sessions WHERE id = ?', [session_id]);
    if (sess.length > 0) {
        const guard_id = sess[0].guard_id;
        await dbPool.query(
          'UPDATE security_guards_status SET status = "completed", latitude = NULL, longitude = NULL, last_update = CURRENT_TIMESTAMP WHERE user_id = ?',
          [guard_id]
        );
    }
    
    res.json({ success: true, message: 'Patrol session ended' });
  } catch (error) {
    console.error('Error ending patrol session:', error);
    res.status(500).json({ error: 'Failed to end patrol session' });
  }
});

/**
 * POST /api/security/patrol/checkpoints
 * Submit a checkpoint (photo/location) from mobile app
 */
router.post('/checkpoints', async (req, res) => {
  console.log('[DEBUG] Incoming POST /checkpoints body:', req.body);
  
  let guard_id = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
          // Lenient decode to avoid 'expired token' blocking the checkpoint submission
          const decoded = jwt.decode(token);
          if (decoded && decoded.userId) {
              guard_id = decoded.userId;
          }
      } catch (e) {
          // Ignore decode errors
      }
  }
  
  let session_id = req.body.session_id;
  
  try {
      if (guard_id) {
          // AUTO-CORRECT: Ignore mobile app's session_id if they send the wrong one.
          // We force find the latest active session for this authenticated guard.
          const [activeSessions] = await dbPool.query(
              'SELECT id FROM security_patrol_sessions WHERE guard_id = ? AND status = "active" ORDER BY id DESC LIMIT 1', 
              [guard_id]
          );
          
          if (activeSessions.length > 0) {
              session_id = activeSessions[0].id;
          }
      }
  } catch (err) {
      console.error('[DEBUG] Auto-correct session failed:', err);
  }
      
  let latitude = req.body.latitude;
  let longitude = req.body.longitude;
  const station_id = req.body.station_id || null;
  const checkpoint_code = req.body.checkpoint_code || null;
  const gps_accuracy = req.body.gps_accuracy || null;
  
  // SNAPPING FEATURE DISABLED: The master coordinates in security_stations are inaccurate, 
  // causing checkpoints to jump away from the actual GPS track. We will just trust the mobile app's GPS.
  /*
  try {
      const [stationData] = await dbPool.query(
          'SELECT latitude, longitude FROM security_stations WHERE (checkpoint_code = ? OR label = ?) AND latitude IS NOT NULL AND longitude IS NOT NULL LIMIT 1', 
          [checkpoint_code, station_name]
      );
      if (stationData.length > 0) {
          const snapLat = parseFloat(stationData[0].latitude);
          const snapLng = parseFloat(stationData[0].longitude);
          if (!isNaN(snapLat) && !isNaN(snapLng)) {
              latitude = snapLat;
              longitude = snapLng;
              console.log(`[DEBUG] SNAPPED Checkpoint ${station_name} to master coordinates: ${latitude}, ${longitude}`);
          }
      } else {
          console.log(`[DEBUG] No master station found for snapping: code=${checkpoint_code}, name=${station_name}`);
      }
  } catch (err) {
      console.error('[DEBUG] Snapping failed:', err);
  }
  */
  
  const station_name = req.body.station_name || req.body.notes;
  const verification_photo = req.body.photo_path || req.body.verification_photo;
  const verification_notes = req.body.notes || req.body.verification_notes;
  
  if (!session_id || !latitude || !longitude || !station_name) {
    // LOG IT TO FILE SO I CAN SEE WHY IT FAILED
    const fs = await import('fs');
    fs.appendFileSync('failed_checkpoints_log.txt', JSON.stringify(req.body) + '\\n');
    return res.status(400).json({ error: 'session_id, station_name (or notes), latitude, and longitude are required' });
  }
  
  try {
    const [result] = await dbPool.query(
      'INSERT INTO security_session_checkpoints (session_id, checkpoint_code, station_name, status, verified_at, verification_photo, verification_notes, latitude, longitude, gps_accuracy) VALUES (?, ?, ?, "verified", CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)',
      [session_id, checkpoint_code, station_name, verification_photo || null, verification_notes || null, latitude, longitude, gps_accuracy]
    );
    
    // Auto update guard status location (use UPSERT with subquery for user_id)
    try {
        await dbPool.query(`
          INSERT INTO security_guards_status (user_id, status, latitude, longitude, last_update) 
          VALUES (?, "active", ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE status="active", latitude=VALUES(latitude), longitude=VALUES(longitude), last_update=CURRENT_TIMESTAMP
        `, [guard_id, latitude, longitude]);
    } catch (e) {
        console.error('Error updating guard status location:', e);
    }
    
    res.status(201).json({
      success: true,
      checkpoint_id: result.insertId,
      message: 'Checkpoint submitted successfully',
      data: {
        id: result.insertId,
        session_id: session_id,
        station_id: station_id,
        status: "verified",
        verified_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error submitting checkpoint:', error);
    res.status(500).json({ error: 'Failed to submit checkpoint' });
  }
});

/**
 * POST /api/security/patrol/location
 * Submit live GPS tracking ping from mobile app
 */
// 🛡️ Kalman Filter 2D untuk Backend (Server-Side Smoothing)
class KalmanFilter2D {
    constructor(processNoise = 0.00001, measurementNoise = 0.00008) {
        this.q = processNoise;
        this.r = measurementNoise;
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

        this.pLat = this.pLat + this.q;
        this.pLng = this.pLng + this.q;

        const kLat = this.pLat / (this.pLat + this.r);
        const kLng = this.pLng / (this.pLng + this.r);

        this.lat = this.lat + kLat * (lat - this.lat);
        this.lng = this.lng + kLng * (lng - this.lng);

        this.pLat = (1 - kLat) * this.pLat;
        this.pLng = (1 - kLng) * this.pLng;

        return [this.lat, this.lng];
    }
}

// In-memory Kalman instances per session
const sessionKalmanMap = new Map();

// Helper Haversine Formula (Meter)
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

router.post('/location', async (req, res) => {
  const { session_id, latitude, longitude, gps_accuracy } = req.body;
  if (!session_id || !latitude || !longitude) {
    return res.status(400).json({ error: 'session_id, latitude, and longitude are required' });
  }

  // 1. Inisialisasi atau ambil Kalman Filter untuk session ini
  if (!sessionKalmanMap.has(session_id)) {
      sessionKalmanMap.set(session_id, new KalmanFilter2D());
  }
  const kalman = sessionKalmanMap.get(session_id);

  let lat = parseFloat(latitude);
  let lng = parseFloat(longitude);
  const accuracy = gps_accuracy ? parseFloat(gps_accuracy) : null;

  try {
    // Cek apakah ini ping pertama untuk session ini
    const [lastLog] = await dbPool.query(
      "SELECT latitude, longitude FROM security_patrol_tracks WHERE session_id = ? ORDER BY id DESC LIMIT 1",
      [session_id]
    );

    const isFirstPing = lastLog.length === 0;
    let shouldSaveToTrack = true;

    if (!isFirstPing) {
      const prevLat = parseFloat(lastLog[0].latitude);
      const prevLng = parseFloat(lastLog[0].longitude);
      const distance = calculateHaversine(prevLat, prevLng, lat, lng);

      // 🛡️ 1. Filter getaran micro stasioner (< 0.3m diabaikan agar titik diam tenang)
      const isStationaryJitter = distance < 0.3;

      // 🛡️ 2. Filter lompatan teleportasi tak wajar (> 150m)
      const isImpossibleJump = distance > 150.0;

      if (isStationaryJitter || isImpossibleJump) {
        shouldSaveToTrack = false;
      }
    }

    if (shouldSaveToTrack) {
      await dbPool.query(
        'INSERT INTO security_patrol_tracks (session_id, latitude, longitude) VALUES (?, ?, ?)',
        [session_id, lat, lng]
      );
    }

    // Selalu update guard status/posisi avatar (bahkan jika track di-skip)
    // sehingga icon security SELALU muncul di peta
    const [sessions] = await dbPool.query('SELECT guard_id FROM security_patrol_sessions WHERE id = ?', [session_id]);
    if (sessions.length > 0) {
       const guard_id = sessions[0].guard_id;
       await dbPool.query(`
          INSERT INTO security_guards_status (user_id, status, latitude, longitude, last_update) 
          VALUES (?, "active", ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE status="active", latitude=VALUES(latitude), longitude=VALUES(longitude), last_update=CURRENT_TIMESTAMP
        `, [guard_id, lat, lng]);
    }

    res.status(201).json({ success: true, message: shouldSaveToTrack ? 'Location track recorded' : 'Guard position updated (track filtered)' });
  } catch (error) {
    console.error('Error recording location track:', error);
    res.status(500).json({ error: 'Failed to record location' });
  }
});

/**
 * GET /api/security/patrol/tracks
 * Fetch live GPS tracking breadcrumbs for all active sessions
 */
router.get('/tracks', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT t.session_id, t.latitude, t.longitude, t.recorded_at
      FROM security_patrol_tracks t
      JOIN security_patrol_sessions s ON t.session_id = s.id
      WHERE s.status = 'active' AND s.started_at >= ?
      ORDER BY t.session_id, t.recorded_at ASC
    `, [getShiftStartTimeStr()]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

/**
 * GET /api/security/patrol/replay/:sessionId
 * Fetch complete patrol data for a specific session (for replay animation)
 */
router.get('/replay/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    // Get session info
    const [sessions] = await dbPool.query(
      'SELECT id, guard_name, status, started_at, completed_at FROM security_patrol_sessions WHERE id = ?',
      [sessionId]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get all GPS tracks for this session
    const [tracks] = await dbPool.query(
      'SELECT latitude, longitude, recorded_at FROM security_patrol_tracks WHERE session_id = ? ORDER BY recorded_at ASC',
      [sessionId]
    );

    // Get all checkpoints for this session
    const [checkpoints] = await dbPool.query(
      'SELECT station_name, latitude, longitude, verified_at, verification_photo FROM security_session_checkpoints WHERE session_id = ? ORDER BY verified_at ASC',
      [sessionId]
    );

    res.json({
      session: sessions[0],
      tracks,
      checkpoints
    });
  } catch (error) {
    console.error('Error fetching replay data:', error);
    res.status(500).json({ error: 'Failed to fetch replay data' });
  }
});

/**
 * GET /api/security/patrol/history
 * Fetch today's patrol sessions for the sidebar (active + completed)
 */
router.get('/history', async (req, res) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT 
        s.id, s.guard_name, s.status, s.started_at, s.completed_at,
        (SELECT COUNT(*) FROM security_session_checkpoints c WHERE c.session_id = s.id) as checkpoint_count,
        (SELECT COUNT(*) FROM security_patrol_tracks t WHERE t.session_id = s.id) as track_count
      FROM security_patrol_sessions s
      WHERE s.started_at >= ?
      ORDER BY s.started_at DESC
    `, [getShiftStartTimeStr()]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching patrol history:', error);
    res.status(500).json({ error: 'Failed to fetch patrol history' });
  }
});

/**
 * GET /api/security/patrol/stations
 * Fetch all defined factory stations with their coordinates
 */
router.get('/stations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM security_stations WHERE is_active = 1');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

/**
 * GET /api/security/patrol/map-image
 * Provide the map image to the mobile app
 */
router.get('/map-image', (req, res) => {
  const imagePath = path.join(__dirname, '../../../frontend/assets/skl.webp');
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Map image not found' });
  }
});

/**
 * GET /api/security/patrol/debug-gps
 * Debug endpoint: cek status GPS ping semua sesi aktif hari ini
 */
router.get('/debug-gps', async (req, res) => {
  try {
    const [sessions] = await dbPool.query(`
      SELECT 
        s.id as session_id,
        s.guard_name,
        s.guard_id,
        s.status,
        s.started_at,
        (SELECT COUNT(*) FROM security_patrol_tracks t WHERE t.session_id = s.id) as total_pings,
        (SELECT latitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_track_lat,
        (SELECT longitude FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_track_lng,
        (SELECT recorded_at FROM security_patrol_tracks t WHERE t.session_id = s.id ORDER BY t.id DESC LIMIT 1) as last_ping_time,
        gs.latitude as status_lat,
        gs.longitude as status_lng,
        gs.last_update as status_last_update
      FROM security_patrol_sessions s
      LEFT JOIN security_guards_status gs ON gs.user_id = s.guard_id
      WHERE s.status = 'active' AND s.started_at >= ?
      ORDER BY s.started_at DESC
    `, [getShiftStartTimeStr()]);

    const result = sessions.map(s => ({
      session_id: s.session_id,
      guard_name: s.guard_name,
      started_at: s.started_at,
      total_gps_pings: s.total_pings,
      last_ping_time: s.last_ping_time,
      has_track_data: !!(s.last_track_lat && s.last_track_lng),
      last_track_position: s.last_track_lat ? `${s.last_track_lat}, ${s.last_track_lng}` : 'BELUM ADA',
      has_status_position: !!(s.status_lat && s.status_lng),
      status_position: s.status_lat ? `${s.status_lat}, ${s.status_lng}` : 'NULL',
      diagnosis: s.total_pings === 0
        ? '❌ HP TIDAK MENGIRIM GPS SAMA SEKALI — cek mobile app'
        : (!s.last_track_lat ? '⚠️ Ping masuk tapi difilter semua — akurasi GPS terlalu buruk' : '✅ GPS OK')
    }));

    res.json({ shift_start: getShiftStartTimeStr(), active_sessions: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

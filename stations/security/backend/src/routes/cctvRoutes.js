import express from 'express';
import http from 'http';
import { dbPool } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/security/cctv
 * Fetch all CCTV cameras with Gateway stream_url on Port 3101
 * If ?all=true is passed, returns both active and inactive cameras for CRUD management
 */
router.get('/', async (req, res) => {
  try {
    const showAll = req.query.all === 'true' || req.query.all === '1';
    const { location, search } = req.query;
    const filterKeyword = (location || search || '').trim();

    let sql = 'SELECT id, camera_name, location, rtsp_url, is_active, sort_order, created_at FROM cctv_cameras WHERE 1=1';
    const params = [];

    if (!showAll) {
      sql += ' AND is_active = 1';
    }

    if (filterKeyword) {
      sql += ' AND (LOWER(location) LIKE ? OR LOWER(camera_name) LIKE ?)';
      const pattern = `%${filterKeyword.toLowerCase()}%`;
      params.push(pattern, pattern);
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const [rows] = await dbPool.query(sql, params);
    const hostHeader = req.headers.host ? req.headers.host : 'localhost:3101';
    const protocol = req.protocol || 'http';
    const cameras = rows.map(cam => ({
      ...cam,
      stream_url: `${protocol}://${hostHeader}/api/security/cctv/stream/${cam.id}`
    }));
    res.json({ success: true, data: cameras });
  } catch (error) {
    console.error('Error fetching CCTVs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch CCTV cameras' });
  }
});

/**
 * POST /api/security/cctv
 * Create a new CCTV camera
 */
router.post('/', async (req, res) => {
  try {
    const { camera_name, location, rtsp_url, is_active = 1, sort_order = 0 } = req.body;

    if (!camera_name || !rtsp_url) {
      return res.status(400).json({ success: false, message: 'Nama Kamera dan RTSP URL wajib diisi' });
    }

    const [result] = await dbPool.query(
      'INSERT INTO cctv_cameras (camera_name, location, rtsp_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
      [camera_name, location || null, rtsp_url, is_active ? 1 : 0, parseInt(sort_order, 10) || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Kamera CCTV berhasil ditambahkan',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating CCTV:', error);
    res.status(500).json({ success: false, message: 'Gagal menambahkan kamera CCTV' });
  }
});

/**
 * PUT /api/security/cctv/:id
 * Update an existing CCTV camera
 */
router.put('/:id', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.id, 10);
    if (isNaN(cameraId) || cameraId <= 0) {
      return res.status(400).json({ success: false, message: 'ID Kamera tidak valid' });
    }

    const { camera_name, location, rtsp_url, is_active, sort_order } = req.body;

    if (!camera_name || !rtsp_url) {
      return res.status(400).json({ success: false, message: 'Nama Kamera dan RTSP URL wajib diisi' });
    }

    const [result] = await dbPool.query(
      'UPDATE cctv_cameras SET camera_name = ?, location = ?, rtsp_url = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [camera_name, location || null, rtsp_url, is_active ? 1 : 0, parseInt(sort_order, 10) || 0, cameraId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kamera CCTV tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Kamera CCTV berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating CCTV:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kamera CCTV' });
  }
});

/**
 * DELETE /api/security/cctv/:id
 * Delete a CCTV camera
 */
router.delete('/:id', async (req, res) => {
  try {
    const cameraId = parseInt(req.params.id, 10);
    if (isNaN(cameraId) || cameraId <= 0) {
      return res.status(400).json({ success: false, message: 'ID Kamera tidak valid' });
    }

    const [result] = await dbPool.query('DELETE FROM cctv_cameras WHERE id = ?', [cameraId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Kamera CCTV tidak ditemukan' });
    }

    res.json({
      success: true,
      message: 'Kamera CCTV berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting CCTV:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus kamera CCTV' });
  }
});

/**
 * GET /api/security/cctv/stream/:id
 * Internal Stream Proxy to Python Security AI (:4101)
 */
router.get('/stream/:id', (req, res) => {
  const cameraId = parseInt(req.params.id, 10);
  if (isNaN(cameraId) || cameraId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid camera ID' });
  }

  const upstreamUrl = `http://127.0.0.1:4101/api/security-ai/stream?camera_id=${cameraId}`;

  const proxyReq = http.get(upstreamUrl, (upstreamRes) => {
    // Pass headers (e.g. Content-Type: multipart/x-mixed-replace; boundary=frame)
    res.writeHead(upstreamRes.statusCode, upstreamRes.headers);

    // Pipe upstream stream directly to client response without buffering to memory
    upstreamRes.pipe(res);

    upstreamRes.on('error', (err) => {
      console.error(`[CCTV Gateway] Stream error for Camera ID ${cameraId}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({ success: false, message: 'Security AI stream forwarding error' });
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error(`[CCTV Gateway] Cannot reach Security AI (:4101) for Camera ID ${cameraId}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ success: false, message: 'Security AI streamer is unavailable' });
    }
  });

  // Clean up upstream proxy request if client disconnects to prevent memory leaks
  req.on('close', () => {
    proxyReq.destroy();
  });
});

export default router;
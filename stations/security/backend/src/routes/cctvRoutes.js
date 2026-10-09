import express from 'express';
import http from 'node:http';
import { pool } from '../config/db.js';

const router = express.Router();
const aiHost = process.env.SECURITY_AI_HOST || '127.0.0.1';
const aiPort = Number(process.env.SECURITY_AI_PORT || 4101);
const validId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const active = value => value === true || value === 1 || value === '1';

// One grid/modal connection. Pipe respects backpressure; response close releases upstream.
function forwardCameraStream(req, res, path) {
  let upstream;
  const proxy = http.get({ hostname: aiHost, port: aiPort, path, agent: false }, incoming => {
    upstream = incoming;
    if (res.destroyed) { incoming.destroy(); return; }
    res.writeHead(incoming.statusCode, { ...incoming.headers,
      'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    incoming.pipe(res);
    incoming.on('error', () => res.destroy());
  });
  proxy.setTimeout(15000, () => proxy.destroy(new Error('Stream stalled')));
  proxy.on('error', () => {
    if (!res.headersSent && !res.destroyed) res.status(502).json({ success: false, message: 'Security AI streamer unavailable' });
    else res.destroy();
  });
  res.on('close', () => { upstream?.destroy(); proxy.destroy(); });
}

function syncToAiBackend(camera, deleting = false) {
  const code = camera.camera_code || `CAM_${camera.id}`;
  const body = deleting ? null : JSON.stringify({ camera_code: code,
    camera_name: camera.camera_name, station_slug: camera.station_slug || 'security',
    rtsp_url: camera.rtsp_url, is_active: active(camera.is_active) });
  const request = http.request({ hostname: aiHost, port: aiPort,
    path: '/api/security-ai/config/cameras' + (deleting ? `/${encodeURIComponent(code)}` : ''),
    method: deleting ? 'DELETE' : 'POST',
    headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
  }, response => {
    response.resume();
    if (response.statusCode >= 400) console.warn('[CCTV Auto-Sync] HTTP', response.statusCode);
  });
  request.setTimeout(5000, () => request.destroy());
  request.on('error', () => console.warn('[CCTV Auto-Sync] AI service unavailable; retry camera save after recovery'));
  request.end(body);
}

router.get('/live', (req, res) => {
  const values = String(req.query.ids || '').split(',');
  if (!values.length || values.length > 64 || values.some(value => !validId(value))) {
    return res.status(400).json({ success: false, message: 'Invalid camera IDs' });
  }
  const ids = [...new Set(values.map(Number))];
  const query = new URLSearchParams({ ids: ids.join(',') });
  if (validId(req.query.focus) && ids.includes(Number(req.query.focus))) query.set('focus', String(Number(req.query.focus)));
  forwardCameraStream(req, res, `/api/security-ai/live?${query}`);
});
router.get('/stream/status', (req, res) => forwardCameraStream(req, res, '/api/security-ai/stream/status'));
router.get('/stream/:id', (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid camera ID' });
  forwardCameraStream(req, res, `/api/security-ai/stream?camera_id=${Number(req.params.id)}`);
});

router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT id, camera_code, camera_name, location, station_slug, rtsp_url, is_active, sort_order, created_at FROM public.cctv_cameras WHERE 1=1';
    const params = [];
    if (req.query.all !== 'true' && req.query.all !== '1') sql += ' AND is_active = 1';
    if (req.query.station_slug) {
      params.push(String(req.query.station_slug).trim());
      sql += ` AND LOWER(station_slug) = LOWER($${params.length})`;
    }
    const keyword = String(req.query.location || req.query.search || '').trim();
    if (keyword) {
      params.push(`%${keyword.toLowerCase()}%`);
      sql += ` AND (LOWER(location) LIKE $${params.length} OR LOWER(camera_name) LIKE $${params.length} OR LOWER(camera_code) LIKE $${params.length})`;
    }
    const { rows } = await pool.query(sql + ' ORDER BY sort_order ASC, id ASC', params);
    res.json({ success: true, data: rows.map(camera => ({ ...camera,
      camera_code: camera.camera_code || `CAM_${camera.id}`, station_slug: camera.station_slug || 'security',
      stream_url: `/api/security/cctv/stream/${camera.id}` })) });
  } catch (error) {
    console.error('[CCTV] List failed:', error.code || error.name);
    res.status(500).json({ success: false, message: 'Failed to fetch CCTV cameras' });
  }
});

router.post('/', async (req, res) => {
  const { camera_name, rtsp_url, location, station_slug, camera_code, is_active = 1, sort_order = 0 } = req.body;
  if (!camera_name || !rtsp_url) return res.status(400).json({ success: false, message: 'Nama Kamera dan RTSP URL wajib diisi' });
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Use the PostgreSQL identity, never MAX(id)+1 (deletions/concurrent saves).
    const { rows } = await client.query(
      'INSERT INTO public.cctv_cameras (camera_code, camera_name, location, station_slug, rtsp_url, is_active, sort_order, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *',
      [String(camera_code || '').trim() || null, camera_name, location || null, station_slug || 'security',
        rtsp_url, active(is_active) ? 1 : 0, parseInt(sort_order, 10) || 0]);
    const camera = rows[0];
    if (!camera.camera_code) {
      camera.camera_code = `CAM_${camera.id}`;
      await client.query('UPDATE public.cctv_cameras SET camera_code = $1 WHERE id = $2', [camera.camera_code, camera.id]);
    }
    await client.query('COMMIT');
    syncToAiBackend(camera);
    res.status(201).json({ success: true, message: 'Kamera CCTV berhasil ditambahkan', id: camera.id, camera_code: camera.camera_code });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('[CCTV] Create failed:', error.code || error.name);
    res.status(error.code === '23505' ? 409 : 500).json({ success: false,
      message: error.code === '23505' ? 'Kode kamera sudah digunakan' : 'Gagal menambahkan kamera CCTV' });
  } finally { client?.release(); }
});

router.put('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'ID Kamera tidak valid' });
  const id = Number(req.params.id);
  const { camera_name, rtsp_url, location, station_slug, camera_code, is_active, sort_order } = req.body;
  if (!camera_name || !rtsp_url) return res.status(400).json({ success: false, message: 'Nama Kamera dan RTSP URL wajib diisi' });
  try {
    const existing = await pool.query('SELECT * FROM public.cctv_cameras WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Kamera CCTV tidak ditemukan' });
    const old = existing.rows[0];
    const { rows } = await pool.query(
      'UPDATE public.cctv_cameras SET camera_code = $1, camera_name = $2, location = $3, station_slug = $4, rtsp_url = $5, is_active = $6, sort_order = $7 WHERE id = $8 RETURNING *',
      [String(camera_code || '').trim() || old.camera_code || `CAM_${id}`, camera_name, location || null,
        station_slug || old.station_slug || 'security', rtsp_url, active(is_active ?? old.is_active) ? 1 : 0,
        parseInt(sort_order ?? old.sort_order, 10) || 0, id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kamera CCTV tidak ditemukan' });
    syncToAiBackend(rows[0]);
    res.json({ success: true, message: 'Kamera CCTV berhasil diperbarui' });
  } catch (error) {
    console.error('[CCTV] Update failed:', error.code || error.name);
    res.status(error.code === '23505' ? 409 : 500).json({ success: false, message: 'Gagal memperbarui kamera CCTV' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'ID Kamera tidak valid' });
  try {
    const { rows } = await pool.query('DELETE FROM public.cctv_cameras WHERE id = $1 RETURNING *', [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Kamera CCTV tidak ditemukan' });
    syncToAiBackend(rows[0], true); // Stored code matters: dump contains id=21 with code=CAM_1.
    res.json({ success: true, message: 'Kamera CCTV berhasil dihapus' });
  } catch (error) {
    console.error('[CCTV] Delete failed:', error.code || error.name);
    res.status(500).json({ success: false, message: 'Gagal menghapus kamera CCTV' });
  }
});

export default router;

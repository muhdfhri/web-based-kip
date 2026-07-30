import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/security/cctv
 * Fetch all active CCTV cameras
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT id, camera_name, location, rtsp_url, is_active, sort_order FROM cctv_cameras WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching CCTVs:', error);
    res.status(500).json({ error: 'Failed to fetch CCTV cameras' });
  }
});

export default router;

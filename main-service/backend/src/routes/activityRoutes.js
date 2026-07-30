import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth, authorizePermission } from '../middleware/jwtMiddleware.js';

const router = Router();
router.use(requireAuth);
router.use(authorizePermission('manage_users'));

// GET /api/activity/login
router.get('/login', async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  try {
    let sql = `SELECT * FROM activity_logs WHERE activity_type='login' AND username != 'dev'`;
    const params = [];
    if (from) { sql += ' AND created_at >= ?'; params.push(from); }
    if (to)   { sql += ' AND created_at <= ?'; params.push(to); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await dbPool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/activity/settings
router.get('/settings', async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  try {
    let sql = `SELECT * FROM activity_logs WHERE activity_type='setting_change' AND username != 'dev'`;
    const params = [];
    if (from) { sql += ' AND created_at >= ?'; params.push(from); }
    if (to)   { sql += ' AND created_at <= ?'; params.push(to); }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const [rows] = await dbPool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

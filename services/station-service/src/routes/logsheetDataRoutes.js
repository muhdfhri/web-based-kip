import { Router } from 'express';
import { dbPool } from '../config/db.js';
import { requireAuth } from '../middleware/jwtMiddleware.js';
const router = Router();
router.use(requireAuth);

router.get('/chart/:station', async (req, res) => {
  const { from, to } = req.query;
  const params = [req.params.station];
  let sql = 'SELECT tag_name, new_value as value, timestamp FROM station_event_logs WHERE station_name=?';
  if (from) { sql += ' AND timestamp >= ?'; params.push(from); }
  if (to)   { sql += ' AND timestamp <= ?'; params.push(to); }
  sql += ' ORDER BY timestamp ASC LIMIT 1000';
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get('/:station', async (req, res) => {
  const { startDate, endDate, from, to, shift, severity, search, limit = 500 } = req.query;
  const params = [req.params.station];
  let sql = 'SELECT * FROM station_event_logs WHERE station_name=?';
  
  const filterFrom = startDate || from;
  const filterTo = endDate || to;

  if (filterFrom) { sql += ' AND timestamp >= ?'; params.push(filterFrom); }
  if (filterTo)   { sql += ' AND timestamp <= ?'; params.push(filterTo); }
  if (shift)      { sql += ' AND shift=?';        params.push(shift); }
  if (severity)   { sql += ' AND severity=?';     params.push(severity); }
  if (search) {
    sql += ' AND (tag_name LIKE ? OR new_value LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  const [rows] = await dbPool.query(sql, params).catch(() => [[]]);
  res.json({ success: true, data: rows });
});

export default router;

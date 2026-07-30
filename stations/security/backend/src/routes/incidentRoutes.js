import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/security/incidents
 * Fetch incidents reported by security guards
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM security_incidents ORDER BY reported_at DESC LIMIT 100'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

/**
 * PUT /api/security/incidents/:id/status
 * Update incident status
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, resolved_notes } = req.body;
  
  try {
    const [result] = await dbPool.query(
      'UPDATE security_incidents SET status = ?, resolved_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, resolved_notes || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    
    res.json({ success: true, message: 'Incident updated successfully' });
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

/**
 * POST /api/security/incidents
 * Submit a new incident report from mobile app
 */
router.post('/', async (req, res) => {
  const { user_id, station_name, incident_category, incident_description, photo_path } = req.body;
  
  if (!user_id || !incident_category) {
    return res.status(400).json({ error: 'user_id and incident_category are required' });
  }
  
  try {
    const [result] = await dbPool.query(
      'INSERT INTO security_incidents (user_id, station_name, incident_category, incident_description, photo_path, reported_at, status) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, "PENDING")',
      [user_id, station_name || null, incident_category, incident_description || null, photo_path || null]
    );
    
    res.status(201).json({ success: true, incident_id: result.insertId, message: 'Incident reported successfully' });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

export default router;

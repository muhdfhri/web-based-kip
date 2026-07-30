import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

/**
 * GET /api/security/queues/active
 * Fetch active queues (Waiting, Weigh In, Grading)
 */
router.get('/active', async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE status IN ("WAITING", "WEIGH_IN", "GRADING", "PENDING") ORDER BY check_in_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching active queues:', error);
    res.status(500).json({ error: 'Failed to fetch active queues' });
  }
});

/**
 * GET /api/security/queues/summary
 * Fetch summary statistics for the dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const [queueCount] = await dbPool.query(
      'SELECT COUNT(*) as count FROM security_truck_queues WHERE status IN ("WAITING", "WEIGH_IN", "GRADING")'
    );
    const [patrolCount] = await dbPool.query(
      'SELECT COUNT(*) as count FROM security_guards_status WHERE status = "active"'
    );
    const [incidentCount] = await dbPool.query(
      'SELECT COUNT(*) as count FROM security_incidents WHERE status = "SUBMITTED"'
    );
    
    res.json({
      activeQueues: queueCount[0].count,
      activePatrols: patrolCount[0].count,
      openIncidents: incidentCount[0].count
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

/**
 * POST /api/security/queues/checkin
 * Register a new truck from mobile app
 */
router.post('/checkin', async (req, res) => {
  const { queue_number, plate_number, driver_name, classification_id, classification_name } = req.body;
  
  if (!queue_number || !plate_number) {
    return res.status(400).json({ error: 'queue_number and plate_number are required' });
  }
  
  try {
    const [result] = await dbPool.query(
      'INSERT INTO security_truck_queues (queue_number, plate_number, driver_name, classification_id, classification_name, check_in_at, status) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, "WAITING")',
      [queue_number, plate_number, driver_name || null, classification_id || null, classification_name || null]
    );
    
    res.status(201).json({ success: true, queue_id: result.insertId, message: 'Truck checked in successfully' });
  } catch (error) {
    console.error('Error checking in truck:', error);
    res.status(500).json({ error: 'Failed to check in truck' });
  }
});

/**
 * PUT /api/security/queues/:id/status
 * Update truck queue status from mobile app (e.g., WAITING -> WEIGH_IN)
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }
  
  try {
    let updateQuery = 'UPDATE security_truck_queues SET status = ? WHERE id = ?';
    
    // If checking out, update check_out_at
    if (status === 'COMPLETED' || status === 'CHECKED_OUT') {
      updateQuery = 'UPDATE security_truck_queues SET status = ?, check_out_at = CURRENT_TIMESTAMP WHERE id = ?';
    }
    
    const [result] = await dbPool.query(updateQuery, [status, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Truck queue not found' });
    }
    
    res.json({ success: true, message: `Truck status updated to ${status}` });
  } catch (error) {
    console.error('Error updating truck status:', error);
    res.status(500).json({ error: 'Failed to update truck status' });
  }
});

export default router;

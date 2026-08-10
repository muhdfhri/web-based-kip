import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

// Helper to broadcast WebSocket events via maintenance-service (Port 3200)
async function broadcastQueueEvent(event, data) {
  try {
    const http = await import('http');
    const postData = JSON.stringify({ event, data });
    const req = http.request('http://localhost:3200/api/maintenance/notify-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    });
    req.on('error', (err) => console.error('[QUEUE WS] Broadcast error:', err.message));
    req.write(postData);
    req.end();
  } catch (err) {
    console.error('[QUEUE WS] Broadcast exception:', err);
  }
}

// ⏱️ 5-MINUTE AUTO TRANSITION WORKER: WEIGH_IN -> GRADING
setInterval(async () => {
  try {
    const [dueRows] = await dbPool.query(
      `SELECT id, queue_code, license_plate, driver_name 
       FROM security_truck_queues 
       WHERE status = 'WEIGH_IN' AND weigh_in_at IS NOT NULL 
       AND TIMESTAMPDIFF(SECOND, weigh_in_at, NOW()) >= 300`
    );
    if (dueRows.length > 0) {
      const ids = dueRows.map(r => r.id);
      await dbPool.query(
        `UPDATE security_truck_queues SET status = 'GRADING' WHERE id IN (?)`,
        [ids]
      );
      console.log(`[QUEUE WORKER] Auto-transitioned ${dueRows.length} queue(s) from WEIGH_IN to GRADING:`, ids);
      
      for (const row of dueRows) {
        const [[updatedRow]] = await dbPool.query(
          'SELECT * FROM security_truck_queues WHERE id = ?',
          [row.id]
        );
        if (updatedRow) {
          broadcastQueueEvent('queue_updated', updatedRow);
        }
      }
    }
  } catch (err) {
    console.error('[QUEUE WORKER] Auto-transition error:', err.message);
  }
}, 5000);

// Master Data Classifications
const CLASSIFICATIONS = [
  { code: 'U', name: 'FFB UMUM', label: 'FFB UMUM' },
  { code: 'M', name: 'FFB MITRA', label: 'FFB MITRA' },
  { code: 'C', name: 'CRUDE PALM OIL', label: 'CRUDE PALM OIL' },
  { code: 'K', name: 'PALM KERNEL', label: 'PALM KERNEL' },
  { code: 'S', name: 'PALM KERNEL SHELL', label: 'PALM KERNEL SHELL' },
];

/**
 * GET /api/security/queues/classifications
 */
router.get('/classifications', (req, res) => {
  res.json({ success: true, data: CLASSIFICATIONS });
});

/**
 * GET /api/security/queues/lookup?q=:query
 * Search truck & driver history by license_plate OR driver_name
 */
router.get('/lookup', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  const rawQuery = q.trim();
  const cleanPlateQuery = `%${rawQuery.replace(/\s+/g, '%')}%`;
  const cleanDriverQuery = `%${rawQuery}%`;

  try {
    const [rows] = await dbPool.query(
      `SELECT q1.id, q1.license_plate, q1.driver_name, q1.no_sim, q1.perusahaan, 
              q1.transporter_company, q1.classification_code
       FROM security_truck_queues q1
       INNER JOIN (
         SELECT MAX(id) as max_id 
         FROM security_truck_queues 
         WHERE license_plate LIKE ? OR driver_name LIKE ?
         GROUP BY license_plate, driver_name
       ) q2 ON q1.id = q2.max_id
       ORDER BY q1.id DESC
       LIMIT 10`,
      [cleanPlateQuery, cleanDriverQuery]
    );

    const formatted = rows.map(r => ({
      id: r.id,
      licensePlate: r.license_plate,
      driverName: r.driver_name,
      noSim: r.no_sim || '',
      perusahaan: r.perusahaan || '',
      transporterCompany: r.transporter_company || '',
      classificationCode: r.classification_code || 'U'
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error looking up truck history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/security/queues/next-sequence/:code
 */
router.get('/next-sequence/:code', async (req, res) => {
  const { code } = req.params;
  const upperCode = (code || 'U').toUpperCase();

  try {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await dbPool.query(
      `SELECT queue_code, sequence_number FROM security_truck_queues 
       WHERE classification_code = ? AND queue_date = ?
       ORDER BY id DESC LIMIT 1`,
      [upperCode, today]
    );

    let nextNum = 1;
    if (rows.length > 0) {
      if (rows[0].sequence_number) {
        nextNum = rows[0].sequence_number + 1;
      } else if (rows[0].queue_code) {
        const parts = rows[0].queue_code.split('-');
        if (parts.length > 1) {
          const parsed = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
      }
    }

    const ticketNumber = `${upperCode}-${String(nextNum).padStart(3, '0')}`;
    res.json({ success: true, ticket_number: ticketNumber });
  } catch (error) {
    console.error('Error generating next sequence:', error);
    res.json({ success: true, ticket_number: `${upperCode}-001` });
  }
});

/**
 * GET /api/security/queues
 * GET /api/security/queues/active
 */
const getQueueList = async (req, res) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT 
        id,
        COALESCE(queue_code, CONCAT(classification_code, '-', LPAD(sequence_number, 3, '0'))) AS queueCode,
        COALESCE(queue_code, CONCAT(classification_code, '-', LPAD(sequence_number, 3, '0'))) AS queue_number,
        license_plate AS licensePlate,
        license_plate AS plate_number,
        driver_name AS driverName,
        driver_name,
        classification_code AS classification_id,
        classification_code AS classificationCode,
        classification_code AS classification_name,
        status,
        check_in_at AS checkInAt,
        check_in_at,
        weigh_in_at AS weighInAt,
        weigh_in_at,
        driver_photo AS driverPhoto,
        driver_photo,
        no_do AS noDo,
        no_do,
        no_sim AS noSim,
        no_sim,
        perusahaan,
        transporter_company AS transporterCompany,
        transporter_company,
        notes,
        created_at AS createdAt,
        created_at,
        updated_at AS updatedAt,
        updated_at
       FROM security_truck_queues 
       ORDER BY check_in_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching truck queues:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch truck queues' });
  }
};

router.get('/', getQueueList);
router.get('/active', getQueueList);

/**
 * GET /api/security/queues/summary
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
 * POST /api/security/queues
 * POST /api/security/queues/checkin
 * Register new truck queue
 */
const createQueueHandler = async (req, res) => {
  const {
    driverName, driver_name,
    licensePlate, plate_number,
    classificationCode, classification_name,
    noSim, no_sim,
    noDo, no_do,
    perusahaan,
    transporterCompany, transporter_company,
    notes,
    driverPhoto, driver_photo,
    queueCode, queue_number
  } = req.body;

  const finalDriverName = driverName || driver_name || 'Driver';
  const finalPlateNumber = licensePlate || plate_number || '';
  const finalClassCode = (classificationCode || classification_name || 'U').toUpperCase();
  const finalNoSim = noSim || no_sim || null;
  const finalNoDo = noDo || no_do || null;
  const finalPerusahaan = perusahaan || null;
  const finalTransporter = transporterCompany || transporter_company || null;
  const finalNotes = notes || null;
  const finalPhoto = driverPhoto || driver_photo || null;

  if (!finalPlateNumber) {
    return res.status(400).json({ success: false, message: 'License plate number is required' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [seqRows] = await dbPool.query(
      `SELECT sequence_number FROM security_truck_queues 
       WHERE classification_code = ? AND queue_date = ?
       ORDER BY id DESC LIMIT 1`,
      [finalClassCode, today]
    );

    let nextSeq = 1;
    if (seqRows.length > 0 && seqRows[0].sequence_number) {
      nextSeq = seqRows[0].sequence_number + 1;
    }

    const finalQueueCode = queueCode || queue_number || `${finalClassCode}-${String(nextSeq).padStart(3, '0')}`;

    const [result] = await dbPool.query(
      `INSERT INTO security_truck_queues 
       (queue_code, classification_code, queue_date, sequence_number, driver_name, no_sim, license_plate, no_do, transporter_company, perusahaan, driver_photo, status, check_in_at, notes, registered_by, registered_by_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "WAITING", CURRENT_TIMESTAMP, ?, 1, 'Security')`,
      [
        finalQueueCode,
        finalClassCode,
        today,
        nextSeq,
        finalDriverName,
        finalNoSim,
        finalPlateNumber,
        finalNoDo,
        finalTransporter,
        finalPerusahaan,
        finalPhoto,
        finalNotes
      ]
    );

    const newQueue = {
      id: result.insertId,
      queueCode: finalQueueCode,
      queue_number: finalQueueCode,
      licensePlate: finalPlateNumber,
      plate_number: finalPlateNumber,
      driverName: finalDriverName,
      driver_name: finalDriverName,
      classificationCode: finalClassCode,
      classification_name: finalClassCode,
      noSim: finalNoSim,
      noDo: finalNoDo,
      perusahaan: finalPerusahaan,
      transporterCompany: finalTransporter,
      notes: finalNotes,
      driverPhoto: finalPhoto,
      status: 'WAITING',
      checkInAt: new Date(),
    };

    broadcastQueueEvent('queue_created', newQueue);

    res.status(201).json({
      success: true,
      message: 'Truck queue registered successfully',
      data: newQueue,
      queue_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to create truck queue: ' + error.message });
  }
};

router.post('/', createQueueHandler);
router.post('/checkin', createQueueHandler);

/**
 * POST /api/security/queues/call/:id
 * POST /api/security/queues/:id/call
 * Call queue speaker and update status to WEIGH_IN
 */
const callQueueHandler = async (req, res) => {
  const { id } = req.params;
  try {
    const [[queueRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    if (!queueRow) {
      return res.status(404).json({ success: false, message: 'Truck queue entry not found' });
    }

    await dbPool.query(
      'UPDATE security_truck_queues SET status = "WEIGH_IN", weigh_in_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    const [[updatedRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    const payload = {
      id: updatedRow.id,
      queueCode: updatedRow.queue_code,
      licensePlate: updatedRow.license_plate,
      driverName: updatedRow.driver_name,
      classificationCode: updatedRow.classification_code,
      status: 'WEIGH_IN',
      weighInAt: updatedRow.weigh_in_at
    };

    // Broadcast audio speaker call event and status update event
    broadcastQueueEvent('queue_called', payload);
    broadcastQueueEvent('queue_updated', payload);

    res.json({
      success: true,
      message: `Queue ticket ${updatedRow.queue_code} called to weigh bridge speaker. Status updated to WEIGH_IN.`,
      data: updatedRow
    });
  } catch (error) {
    console.error('Error calling truck queue speaker:', error);
    res.status(500).json({ success: false, message: 'Failed to call queue speaker: ' + error.message });
  }
};

router.post('/call/:id', callQueueHandler);
router.post('/:id/call', callQueueHandler);

/**
 * PUT /api/security/queues/:id
 * PUT /api/security/queues/:id/status
 * Edit / Update queue entry
 */
const updateQueueHandler = async (req, res) => {
  const { id } = req.params;
  const {
    status,
    driverName, driver_name,
    licensePlate, plate_number,
    classificationCode, classification_name,
    noSim, no_sim,
    noDo, no_do,
    perusahaan,
    transporterCompany, transporter_company,
    notes,
    driverPhoto, driver_photo
  } = req.body;

  try {
    const fields = [];
    const values = [];

    const finalStatus = status ? status.toUpperCase() : null;
    const finalDriverName = driverName || driver_name;
    const finalPlateNumber = licensePlate || plate_number;
    const finalClassCode = classificationCode || classification_name;
    const finalNoSim = noSim !== undefined ? noSim : no_sim;
    const finalNoDo = noDo !== undefined ? noDo : no_do;
    const finalTransporter = transporterCompany !== undefined ? transporterCompany : transporter_company;
    const finalPhoto = driverPhoto !== undefined ? driverPhoto : driver_photo;

    if (finalStatus) {
      fields.push('status = ?');
      values.push(finalStatus);
      if (finalStatus === 'WEIGH_IN') {
        fields.push('weigh_in_at = CURRENT_TIMESTAMP');
      }
    }
    if (finalDriverName) {
      fields.push('driver_name = ?');
      values.push(finalDriverName);
    }
    if (finalPlateNumber) {
      fields.push('license_plate = ?');
      values.push(finalPlateNumber);
    }
    if (finalClassCode) {
      fields.push('classification_code = ?');
      values.push(finalClassCode.toUpperCase());
    }
    if (finalNoSim !== undefined) {
      fields.push('no_sim = ?');
      values.push(finalNoSim);
    }
    if (finalNoDo !== undefined) {
      fields.push('no_do = ?');
      values.push(finalNoDo);
    }
    if (perusahaan !== undefined) {
      fields.push('perusahaan = ?');
      values.push(perusahaan);
    }
    if (finalTransporter !== undefined) {
      fields.push('transporter_company = ?');
      values.push(finalTransporter);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
    }
    if (finalPhoto !== undefined) {
      fields.push('driver_photo = ?');
      values.push(finalPhoto);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    const [result] = await dbPool.query(
      `UPDATE security_truck_queues SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Truck queue entry not found' });
    }

    const [[updatedRow]] = await dbPool.query(
      'SELECT * FROM security_truck_queues WHERE id = ?',
      [id]
    );

    broadcastQueueEvent('queue_updated', updatedRow);

    res.json({
      success: true,
      message: 'Truck queue updated successfully',
      data: updatedRow
    });
  } catch (error) {
    console.error('Error updating truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to update truck queue: ' + error.message });
  }
};

router.put('/:id', updateQueueHandler);
router.put('/:id/status', updateQueueHandler);

/**
 * DELETE /api/security/queues/:id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await dbPool.query('DELETE FROM security_truck_queues WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Truck queue not found' });
    }
    broadcastQueueEvent('queue_updated', { deletedId: id });
    res.json({ success: true, message: 'Truck queue deleted successfully' });
  } catch (error) {
    console.error('Error deleting truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to delete truck queue' });
  }
});

export default router;

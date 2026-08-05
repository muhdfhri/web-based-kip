import express from 'express';
import { dbPool } from '../config/db.js';

const router = express.Router();

// Master Data Classifications (Sesuai Spesifikasi)
const CLASSIFICATIONS = [
  { code: 'U', name: 'FFB UMUM', label: 'FFB UMUM' },
  { code: 'M', name: 'FFB MITRA', label: 'FFB MITRA' },
  { code: 'C', name: 'CRUDE PALM OIL', label: 'CRUDE PALM OIL' },
  { code: 'K', name: 'PALM KERNEL', label: 'PALM KERNEL' },
  { code: 'S', name: 'PALM KERNEL SHELL', label: 'PALM KERNEL SHELL' },
];

/**
 * GET /api/security/queues/classifications
 * GET /api/security/truck-queue/classifications
 */
router.get('/classifications', (req, res) => {
  res.json({ success: true, data: CLASSIFICATIONS });
});

/**
 * GET /api/security/queues/next-sequence/:code
 * GET /api/security/truck-queue/next-sequence/:code
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
        driver_photo AS driverPhoto,
        driver_photo,
        no_do AS noDo,
        no_do,
        no_sim AS noSim,
        no_sim,
        perusahaan,
        transporter_company AS transporterCompany,
        transporter_company,
        notes
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
    driverName,
    driver_name,
    licensePlate,
    plate_number,
    classificationCode,
    classification_name,
    noSim,
    no_sim,
    noDo,
    no_do,
    perusahaan,
    transporterCompany,
    transporter_company,
    notes,
    driverPhoto,
    driver_photo,
    queueCode,
    queue_number
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
    
    // Calculate sequence number for today
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
 * PUT /api/security/queues/:id
 * PUT /api/security/queues/:id/status
 * Update queue status
 */
const updateQueueHandler = async (req, res) => {
  const { id } = req.params;
  const { status, driverName, licensePlate, noSim, noDo, notes } = req.body;

  try {
    const fields = [];
    const values = [];

    if (status) {
      fields.push('status = ?');
      values.push(status);
    }
    if (driverName) {
      fields.push('driver_name = ?');
      values.push(driverName);
    }
    if (licensePlate) {
      fields.push('license_plate = ?');
      values.push(licensePlate);
    }
    if (noSim !== undefined) {
      fields.push('no_sim = ?');
      values.push(noSim);
    }
    if (noDo !== undefined) {
      fields.push('no_do = ?');
      values.push(noDo);
    }
    if (notes !== undefined) {
      fields.push('notes = ?');
      values.push(notes);
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

    res.json({
      success: true,
      message: 'Truck queue updated successfully',
      data: updatedRow
    });
  } catch (error) {
    console.error('Error updating truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to update truck queue' });
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
    res.json({ success: true, message: 'Truck queue deleted successfully' });
  } catch (error) {
    console.error('Error deleting truck queue:', error);
    res.status(500).json({ success: false, message: 'Failed to delete truck queue' });
  }
});

export default router;

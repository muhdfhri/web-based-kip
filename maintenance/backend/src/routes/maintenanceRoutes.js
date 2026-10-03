import Router from "express";
import { dbPool } from "../config/db.js";
import { requireAuth, optionalAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
// Apply optionalAuth globally so public/mobile operator routes work without hard 401 blocking
router.use(optionalAuth);
const adminOnly = authorize(["developer", "admin"]);

// GET /api/maintenance/logs/:machineId/:category
router.get("/logs/:machineId/:category", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_logs WHERE machine_id=? AND work_type=? ORDER BY work_date DESC",
      [req.params.machineId, req.params.category],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/logs/add
router.post("/logs/add", async (req, res) => {
  const { machine_id, work_type, description, technician_name, parts_used } =
    req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_logs (machine_id,work_type,description,technician_name,parts_used) VALUES (?,?,?,?,?)",
      [
        machine_id,
        work_type,
        description,
        technician_name,
        JSON.stringify(parts_used),
      ],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/schedules/:machineId
router.get("/schedules/:machineId", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_schedules WHERE machine_id=? AND is_active=1",
      [req.params.machineId],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/schedules/update
router.post("/schedules/update", adminOnly, async (req, res) => {
  const { id, next_due_date, frequency_days } = req.body;
  try {
    await dbPool.query(
      "UPDATE maintenance_schedules SET next_due_date=?,frequency_days=? WHERE id=?",
      [next_due_date, frequency_days, id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/inventory/:category
router.get("/inventory/:category", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_inventory WHERE category=? ORDER BY item_name",
      [req.params.category],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/docs/:machineId
router.get("/docs/:machineId", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_documents WHERE machine_id=? ORDER BY created_at DESC",
      [req.params.machineId],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// POST /api/maintenance/docs/add
router.post("/docs/add", adminOnly, async (req, res) => {
  const { machine_id, title, doc_type, file_url } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_documents (machine_id,title,doc_type,file_url) VALUES (?,?,?,?)",
      [machine_id, title, doc_type, file_url],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/maintenance/spare-parts/:station
router.get("/spare-parts/:station", async (req, res) => {
  const [rows] = await dbPool
    .query(
      `SELECT mm.*, ms.task_name, ms.next_due_date FROM maintenance_machines mm
     LEFT JOIN maintenance_schedules ms ON mm.id = ms.machine_id
     WHERE mm.station_name=? AND mm.category='spare-part'`,
      [req.params.station],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/spare-parts/machines/:station
router.get("/spare-parts/machines/:station", async (req, res) => {
  const [rows] = await dbPool
    .query(
      "SELECT * FROM maintenance_machines WHERE station_name=? ORDER BY machine_name",
      [req.params.station],
    )
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// GET /api/maintenance/machinery/all — include parts per machine
router.get("/machinery/all", async (_req, res) => {
  try {
    const [machines] = await dbPool
      .query(
        `SELECT mm.*, COUNT(ml.id) as log_count
       FROM maintenance_machines mm
       LEFT JOIN maintenance_logs ml ON mm.id = ml.machine_id
       GROUP BY mm.id ORDER BY mm.station_name, mm.machine_name`,
      )
      .catch(() => [[]]);
    // Attach parts to each machine
    for (const machine of machines) {
      const [parts] = await dbPool.query(
        "SELECT id, part_name, category FROM maintenance_parts WHERE machine_id = ? ORDER BY part_name",
        [machine.id],
      );
      machine.parts = parts;
    }
    res.json({ success: true, data: machines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Machinery CRUD
router.post("/machinery/machines/add", adminOnly, async (req, res) => {
  const { station_name, machine_name, category } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_machines (station_name,machine_name,category,qr_token) VALUES (?,?,?,UUID())",
      [station_name, machine_name, category || "spare-part"],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/machinery/machines/:id", adminOnly, async (req, res) => {
  const { machine_name, category, status, last_service } = req.body;
  try {
    await dbPool.query(
      "UPDATE maintenance_machines SET machine_name=?,category=?,status=?,last_service=? WHERE id=?",
      [machine_name, category, status, last_service, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/machinery/machines/:id", adminOnly, async (req, res) => {
  try {
    await dbPool.query("DELETE FROM maintenance_machines WHERE id=?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Spare Parts (Inventory) ──
router.get("/parts", async (_req, res) => {
  const [rows] = await dbPool
    .query("SELECT * FROM maintenance_inventory ORDER BY item_name ASC")
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post("/machinery/parts/add", adminOnly, async (req, res) => {
  const { machineId, partName } = req.body;
  if (!partName || !partName.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Part name required" });
  }
  if (!machineId) {
    return res
      .status(400)
      .json({ success: false, error: "Machine ID required" });
  }
  try {
    const [r] = await dbPool.query(
      "INSERT INTO maintenance_parts (machine_id, part_name) VALUES (?, ?)",
      [machineId, partName.trim()],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/maintenance/machinery/parts/:machineId/:partId
router.delete(
  "/machinery/parts/:machineId/:partId",
  adminOnly,
  async (req, res) => {
    try {
      await dbPool.query(
        "DELETE FROM maintenance_parts WHERE id=? AND machine_id=?",
        [req.params.partId, req.params.machineId],
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
);

// ── OPERATOR PREVENTIVE MAINTENANCE TEMPLATES & SUBMISSIONS (POSTGRESQL - mewah_operator) ──

// GET /api/operator/preventive/templates or /api/maintenance/preventive/templates
router.get("/preventive/templates", async (_req, res) => {
  try {
    const [templates] = await dbPool.query(
      "SELECT id, name, station, description, is_active FROM mewah_operator.public.operator_pm_templates WHERE is_active = true ORDER BY id DESC"
    ).catch(async () => {
      return await dbPool.query(
        "SELECT id, name, station, description, is_active FROM operator_pm_templates WHERE is_active = true ORDER BY id DESC"
      );
    });

    for (const t of templates) {
      const templateIdNum = parseInt(t.id, 10);
      const [items] = await dbPool.query(
        "SELECT id, item_text FROM operator_pm_items WHERE template_id = ? ORDER BY id ASC",
        [isNaN(templateIdNum) ? t.id : templateIdNum]
      ).catch(() => [[]]);

      t.items = (items || []).map((i) => ({ id: String(i.id), itemText: i.item_text || "" }));
      t.id = String(t.id);
    }
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error("[PM Templates GET Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/operator/preventive/templates or /api/maintenance/preventive/templates
router.post("/preventive/templates", async (req, res) => {
  const { name, description, station, items } = req.body;
  if (!name || !station) {
    return res.status(400).json({ success: false, error: "Name and Station are required" });
  }
  try {
    const [r] = await dbPool.query(
      "INSERT INTO operator_pm_templates (name, description, station, is_active) VALUES (?, ?, ?, true) RETURNING id",
      [name, description || null, station]
    );

    const rawId = r[0] ? r[0].id : r.insertId;
    const templateId = parseInt(rawId, 10);

    if (Array.isArray(items) && !isNaN(templateId)) {
      for (let idx = 0; idx < items.length; idx++) {
        const itemObj = items[idx];
        const itemText = typeof itemObj === 'string' ? itemObj : (itemObj.itemText || itemObj.title || itemObj.name || String(itemObj));
        if (itemText && itemText.trim()) {
          try {
            await dbPool.query(
              "INSERT INTO operator_pm_items (template_id, item_text, item_order) VALUES (?, ?, ?)",
              [templateId, itemText.trim(), idx + 1]
            );
          } catch (_) {
            await dbPool.query(
              "INSERT INTO operator_pm_items (template_id, item_text) VALUES (?, ?)",
              [templateId, itemText.trim()]
            );
          }
        }
      }
    }

    res.status(201).json({ success: true, id: String(templateId) });
  } catch (err) {
    console.error("[PM Template Insert Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/operator/preventive/templates/:id or /api/maintenance/preventive/templates/:id
router.put("/preventive/templates/:id", async (req, res) => {
  const { name, description, station, items } = req.body;
  const templateId = parseInt(req.params.id, 10);
  try {
    await dbPool.query(
      "UPDATE operator_pm_templates SET name = ?, description = ?, station = ? WHERE id = ?",
      [name, description || null, station, templateId]
    );

    if (Array.isArray(items) && !isNaN(templateId)) {
      await dbPool.query("DELETE FROM operator_pm_items WHERE template_id = ?", [templateId]);
      for (let idx = 0; idx < items.length; idx++) {
        const itemObj = items[idx];
        const itemText = typeof itemObj === 'string' ? itemObj : (itemObj.itemText || itemObj.title || itemObj.name || String(itemObj));
        if (itemText && itemText.trim()) {
          await dbPool.query(
            "INSERT INTO operator_pm_items (template_id, item_text, sort_order) VALUES (?, ?, ?)",
            [templateId, itemText.trim(), idx + 1]
          ).catch(async () => {
            await dbPool.query(
              "INSERT INTO operator_pm_items (template_id, item_text) VALUES (?, ?)",
              [templateId, itemText.trim()]
            );
          });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[PM Template Update Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/operator/preventive/templates/:id or /api/maintenance/preventive/templates/:id
router.delete("/preventive/templates/:id", async (req, res) => {
  const templateId = req.params.id;
  try {
    await dbPool.query("DELETE FROM operator_pm_items WHERE template_id = ?", [templateId]);
    await dbPool.query("DELETE FROM operator_pm_templates WHERE id = ?", [templateId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/operator/preventive/submissions
router.get("/preventive/submissions", async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT id, template_id, template_name, submitted_by, status, answers, created_at FROM operator_pm_submissions ORDER BY id DESC"
    ).catch(() => [[]]);

    const data = (rows || []).map((row) => ({
      id: String(row.id),
      templateId: row.template_id || String(row.id),
      templateName: row.template_name || "Daily Checklist",
      submittedBy: row.submitted_by || row.operator_name || "Operator",
      submissionDate: row.created_at || new Date().toISOString(),
      status: row.status || "COMPLETED",
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : (row.answers || []),
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/operator/preventive/submissions
router.post("/preventive/submissions", async (req, res) => {
  const { templateId, templateName, submittedBy, answers, status, createTickets } = req.body;
  const parsedTemplateId = parseInt(templateId, 10);
  const finalTemplateId = isNaN(parsedTemplateId) ? null : parsedTemplateId;

  try {
    const [r] = await dbPool.query(
      "INSERT INTO operator_pm_submissions (template_id, template_name, submitted_by, submitted_name, status, answers) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
      [finalTemplateId, templateName, submittedBy || "Operator", submittedBy || "Operator", status || "COMPLETED", JSON.stringify(answers || [])]
    );

    // Auto-create tickets if requested and issues found
    if (createTickets && Array.isArray(answers)) {
      for (const ans of answers) {
        if (ans.visualOk === false || ans.condition === "replace" || ans.condition === "attention") {
          await dbPool.query(
            "INSERT INTO operator_tickets (ticket_code, station_name, issue_type, priority, description, reported_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              `TICK-PM-${Date.now().toString().slice(-6)}`,
              templateName,
              "Preventive Issue",
              ans.condition === "replace" ? "URGENT" : "HIGH",
              `${ans.itemText}: ${ans.issueDescription || "Abnormal inspection finding"}`,
              submittedBy || "Operator",
              "OPEN"
            ]
          ).catch(() => {});
        }
      }
    }

    res.status(201).json({ success: true, id: String(r[0] ? r[0].id : r.insertId) });
  } catch (err) {
    console.error("[PM Submission Insert Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── OPERATIONAL SHIFT HANDOVER (POSTGRESQL - operator_handover_notes) ──

// GET /api/operator/handover
router.get("/handover", async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT id, station_name, shift, operator_id, operator_name, note_text, is_urgent, created_at FROM operator_handover_notes ORDER BY id DESC"
    ).catch((err) => {
      console.error("[Handover GET Query Error]:", err);
      return [[]];
    });

    const data = (rows || []).map((r) => ({
      id: String(r.id),
      stationName: r.station_name || "Stasiun Kempa",
      shift: r.shift || "Shift 1",
      operatorId: r.operator_id || null,
      operatorName: r.operator_name || "Operator",
      noteText: r.note_text || "",
      isUrgent: Boolean(r.is_urgent),
      createdAt: r.created_at || new Date().toISOString(),
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/operator/handover
router.post("/handover", async (req, res) => {
  const {
    stationName,
    shift,
    operatorId,
    operatorName,
    noteText,
    isUrgent
  } = req.body;

  try {
    const [r] = await dbPool.query(
      `INSERT INTO operator_handover_notes 
      (station_name, shift, operator_id, operator_name, note_text, is_urgent) 
      VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        stationName || "Stasiun Kempa",
        shift || "Shift 1",
        operatorId ? parseInt(operatorId, 10) : null,
        operatorName || "Operator",
        noteText || "",
        Boolean(isUrgent)
      ]
    );

    const newId = String(r[0] ? r[0].id : (r.insertId || Date.now()));
    res.status(201).json({ success: true, id: newId });
  } catch (err) {
    console.error("[Shift Handover Insert Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/operator/handover/:id/ack
router.put("/handover/:id/ack", async (req, res) => {
  const { id } = req.params;
  const { incomingOperator } = req.body;
  try {
    await dbPool.query(
      "UPDATE operator_handover_notes SET status = 'ACKNOWLEDGED', ack_at = CURRENT_TIMESTAMP, incoming_operator = COALESCE(?, incoming_operator) WHERE id = ?",
      [incomingOperator || null, parseInt(id, 10)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CORRECTIVE TICKETS (POSTGRESQL - operator_tickets) ──

// GET /api/operator/corrective
router.get("/corrective", async (_req, res) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT id, ticket_code as ticket_number, station_name as station, issue_type as equipment, description, priority as urgency, reported_by, status, created_at FROM operator_tickets ORDER BY id DESC"
    ).catch(() => [[]]);

    const data = (rows || []).map((row) => ({
      id: String(row.id),
      ticketNumber: row.ticket_number || `TICK-${row.id}`,
      station: row.station || "General",
      equipment: row.equipment || "Machine",
      description: row.description || "",
      urgency: (row.urgency || "MEDIUM").toLowerCase(),
      status: row.status || "OPEN",
      createdAt: row.created_at || new Date().toISOString(),
      photos: [],
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/operator/corrective
router.post("/corrective", async (req, res) => {
  const { station, equipment, description, urgency, photos } = req.body;
  try {
    const ticketCode = `TICK-${Date.now().toString().slice(-6)}`;
    const [r] = await dbPool.query(
      "INSERT INTO operator_tickets (ticket_code, station_name, issue_type, priority, description, reported_by, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
      [
        ticketCode,
        station || "General",
        equipment || "Equipment",
        (urgency || "MEDIUM").toUpperCase(),
        description || "",
        "Operator",
        "OPEN",
      ]
    );

    res.status(201).json({ success: true, id: String(r[0] ? r[0].id : r.insertId) });
  } catch (err) {
    console.error("[Corrective Ticket Insert Error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;


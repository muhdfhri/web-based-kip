import { Router } from "express";
import { dbPool } from "../config/db.js";
import { requireAuth, authorize } from "../middleware/jwtMiddleware.js";

const router = Router();
router.use(requireAuth);

// ── READ ONLY (all users) ──
router.get("/tags", async (_req, res) => {
  const [rows] = await dbPool
    .query("SELECT * FROM plc_tags ORDER BY id")
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.get("/tags-live", async (_req, res) => {
  const [rows] = await dbPool
    .query(
      `SELECT l.tag_id, l.value, l.updated_at as timestamp
     FROM plc_tag_latest l
     JOIN plc_tags t ON l.tag_id = t.id WHERE t.enabled=1`,
    )
    .catch(() => [[]]);
  // Convert to object keyed by tag_id
  const result = {};
  for (const row of rows) {
    result[row.tag_id] = row;
  }
  res.json({ success: true, data: result });
});

router.get("/station-mappings/:station", async (req, res) => {
  const [rows] = await dbPool
    .query("SELECT * FROM station_tag_mappings WHERE station=?", [
      req.params.station,
    ])
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

// ── WRITE (developer/admin only) ──
const adminOnly = authorize(["developer", "admin"]);

router.get("/devices", adminOnly, async (_req, res) => {
  const [rows] = await dbPool
    .query("SELECT * FROM plc_devices ORDER BY id")
    .catch(() => [[]]);
  res.json({ success: true, data: rows });
});

router.post("/devices", adminOnly, async (req, res) => {
  const { name, ip_address, rack, slot } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO plc_devices (name, ip_address, rack, slot) VALUES (?,?,?,?)",
      [name, ip_address, rack ?? 0, slot ?? 1],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/devices/:id", adminOnly, async (req, res) => {
  const { name, ip_address, rack, slot, enabled } = req.body;
  try {
    await dbPool.query(
      "UPDATE plc_devices SET name=?,ip_address=?,rack=?,slot=?,enabled=? WHERE id=?",
      [name, ip_address, rack, slot, enabled, req.params.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/devices/:id", adminOnly, async (req, res) => {
  try {
    await dbPool.query("DELETE FROM plc_devices WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/tags", adminOnly, async (req, res) => {
  const {
    plc_id,
    db_number,
    byte_offset,
    bit_offset,
    data_type,
    tag_name,
    access,
  } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO plc_tags (plc_id,db_number,byte_offset,bit_offset,data_type,tag_name,access) VALUES (?,?,?,?,?,?,?)",
      [
        plc_id,
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        tag_name,
        access || "READ",
      ],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/tags/:id", adminOnly, async (req, res) => {
  const {
    db_number,
    byte_offset,
    bit_offset,
    data_type,
    tag_name,
    access,
    enabled,
  } = req.body;
  try {
    await dbPool.query(
      "UPDATE plc_tags SET db_number=?,byte_offset=?,bit_offset=?,data_type=?,tag_name=?,access=?,enabled=? WHERE id=?",
      [
        db_number,
        byte_offset,
        bit_offset,
        data_type,
        tag_name,
        access,
        enabled,
        req.params.id,
      ],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/tags/:id", adminOnly, async (req, res) => {
  try {
    await dbPool.query("DELETE FROM plc_tags WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/station-mappings", adminOnly, async (req, res) => {
  const { station, equipment, signal_key, tag_id } = req.body;
  try {
    const [r] = await dbPool.query(
      "INSERT INTO station_tag_mappings (station,equipment,signal_key,tag_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE tag_id=VALUES(tag_id)",
      [station, equipment, signal_key, tag_id],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/station-mappings/:id", adminOnly, async (req, res) => {
  try {
    await dbPool.query("DELETE FROM station_tag_mappings WHERE id=?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

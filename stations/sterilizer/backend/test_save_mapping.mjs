import { dbPool } from "./src/config/db.js";

async function testSave() {
  const station = "sterilizer";
  const equipment = "card_inlet_steam_2_st1";
  const signal_key = "MONITOR";
  const tag_id = 1;

  try {
    console.log("Attempting dbPool.query for station_tag_mappings...");
    const res = await dbPool.query(
      `INSERT INTO station_tag_mappings (station, equipment, signal_key, tag_id)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tag_id = VALUES(tag_id), updated_at = NOW()`,
      [station, equipment, signal_key, tag_id]
    );
    console.log("SUCCESS:", res);
  } catch (err) {
    console.error("FAILED dbPool:", err);
  } finally {
    process.exit(0);
  }
}

testSave();

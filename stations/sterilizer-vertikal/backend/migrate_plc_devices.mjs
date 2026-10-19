import { dbPoolPlc } from "./src/config/db.js";

async function migrate() {
  console.log("Adding missing columns to plc_devices table...");
  try {
    await dbPoolPlc.query(`
      ALTER TABLE plc_devices 
      ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 502,
      ADD COLUMN IF NOT EXISTS protocol VARCHAR(50) DEFAULT 'modbus';
    `);
    console.log("✅ Column 'port' and 'protocol' successfully added to plc_devices!");

    // Check table columns
    const [rows] = await dbPoolPlc.query("SELECT * FROM plc_devices LIMIT 1");
    console.log("Sample device row:", rows);
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    process.exit(0);
  }
}

migrate();

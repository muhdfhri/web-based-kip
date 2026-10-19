const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgresql://postgres:admin123@localhost:5432/mewah_sterilizer" });

async function run() {
  try {
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'station_tag_mappings'");
    console.log("COLUMNS:", cols.rows);

    const rows = await pool.query("SELECT * FROM station_tag_mappings");
    console.log("ROWS:", rows.rows);

    const tags = await pool.query("SELECT id, tag_name, db_number, byte_offset, bit_offset, data_type FROM plc_tags");
    console.log("PLC_TAGS:", tags.rows);

    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      WHERE conrelid = 'station_tag_mappings'::regclass
    `);
    console.log("CONSTRAINTS:", constraints.rows);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

run();

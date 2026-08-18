import mysql from "mysql2/promise";
import fs from "fs";

async function main() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "mewah_sterilizer"
  });

  console.log("Checking station tag mappings...");
  
  const [rows] = await connection.query(
    "SELECT m.*, t.tag_name, t.db_number, t.byte_offset, t.bit_offset, t.data_type FROM station_tag_mappings m JOIN plc_tags t ON m.tag_id = t.id"
  );
  
  console.log(`Found ${rows.length} mappings.`);
  fs.writeFileSync("mappings_result.json", JSON.stringify(rows, null, 2));
  console.log("Saved mappings to mappings_result.json");
  await connection.end();
}

main().catch(err => {
  console.error("Error:", err);
  fs.writeFileSync("mappings_result.json", JSON.stringify({ error: err.message }, null, 2));
});

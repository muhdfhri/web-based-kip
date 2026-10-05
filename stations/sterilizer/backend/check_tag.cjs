const mysql = require('mysql2/promise');
require('dotenv').config({ path: './stations/sterilizer/backend/.env' });

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mewah_sterilizer',
    port: process.env.DB_PORT || 3306,
  });
  
  // Check all press-related mappings with their tag and latest value
  const [pressRows] = await conn.query(`
    SELECT m.equipment, m.signal_key, t.tag_name, l.value 
    FROM station_tag_mappings m 
    JOIN plc_tags t ON m.tag_id = t.id 
    JOIN plc_tag_latest l ON m.tag_id = l.tag_id 
    WHERE m.equipment LIKE '%press%' 
    LIMIT 20
  `);
  console.log('=== Mapped press values ===');
  console.log(JSON.stringify(pressRows, null, 2));
  
  // Check all mappings (no filter)
  const [allMappings] = await conn.query(`
    SELECT m.equipment, m.signal_key, t.tag_name, l.value 
    FROM station_tag_mappings m 
    JOIN plc_tags t ON m.tag_id = t.id 
    JOIN plc_tag_latest l ON m.tag_id = l.tag_id 
    LIMIT 30
  `);
  console.log('\n=== All mapped values (with latest) ===');
  console.log(JSON.stringify(allMappings, null, 2));
  
  // Check Test_Settings tag
  const [tags] = await conn.query(`
    SELECT id, tag_name FROM plc_tags WHERE tag_name LIKE '%Test_Settings%' OR tag_name LIKE '%test_settings%' OR tag_name LIKE '%TEST_SETTINGS%' LIMIT 10
  `);
  console.log('\n=== Test_Settings tag ===');
  console.log(JSON.stringify(tags, null, 2));
  
  // Check plc_tag_latest for Test_Settings
  const [latest] = await conn.query(`
    SELECT t.tag_name, l.value, l.updated_at 
    FROM plc_tag_latest l 
    JOIN plc_tags t ON l.tag_id = t.id 
    WHERE t.tag_name LIKE '%Test_Settings%' OR t.tag_name LIKE '%TEST%'
    LIMIT 10
  `);
  console.log('\n=== Latest values for Test* tags ===');
  console.log(JSON.stringify(latest, null, 2));
  
  conn.end();
}
run().catch(console.error);

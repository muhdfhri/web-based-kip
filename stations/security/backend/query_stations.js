import { dbPool } from './src/config/db.js';
async function run() {
  const [rows] = await dbPool.query('SELECT station_name, latitude, longitude FROM security_patrol_stations WHERE station_name = \'Security Pos 1\'');
  console.log(rows);
  process.exit(0);
}
run();

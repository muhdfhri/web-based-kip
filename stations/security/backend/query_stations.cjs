const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mewah_security',
  password: 'kip2026',
  port: 5432,
});
pool.query("SELECT * FROM security_checkpoints WHERE station_name = 'Security Pos 1' OR id = 1;")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

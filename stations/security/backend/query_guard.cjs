const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mewah_security',
  password: 'kip2026',
  port: 5432,
});

pool.query("SELECT s.id, s.guard_id, gs.latitude, gs.longitude FROM security_patrol_sessions s LEFT JOIN security_guards_status gs ON gs.user_id = s.guard_id WHERE s.status = 'active';")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

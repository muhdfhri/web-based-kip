const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'kip2026', database: 'mewah_security' });
client.connect()
  .then(() => client.query("SELECT column_name, column_default, is_identity FROM information_schema.columns WHERE table_name = 'security_guards_status';"))
  .then(res => { console.table(res.rows); process.exit(0); })
  .catch(e => { console.log(e); process.exit(1); });

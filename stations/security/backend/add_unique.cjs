const { Client } = require('pg');
const client = new Client({ user: 'postgres', password: 'kip2026', database: 'mewah_security' });
client.connect()
  .then(() => client.query("ALTER TABLE security_guards_status ADD CONSTRAINT unique_user_id UNIQUE (user_id);"))
  .then(res => { console.log('Added unique constraint'); process.exit(0); })
  .catch(e => { console.log(e.message); process.exit(1); });

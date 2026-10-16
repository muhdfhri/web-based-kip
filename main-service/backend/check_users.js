import pg from 'pg';

const { Pool } = pg;

async function check() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'kip2026',
    database: 'mewah_main'
  });

  try {
    const resCols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    console.log('--- COLUMNS ---');
    console.table(resCols.rows);

    const resRoles = await pool.query(`SELECT * FROM roles ORDER BY id`);
    console.log('--- ROLES ---');
    console.table(resRoles.rows);

    const resUsers = await pool.query(`SELECT * FROM users ORDER BY id`);
    console.log('--- USERS (DISTINCT ID) ---');
    const userMap = new Map();
    for (const u of resUsers.rows) {
      if (!userMap.has(u.id)) {
        userMap.set(u.id, u);
      }
    }
    console.table(Array.from(userMap.values()).map(u => ({
      id: u.id,
      username: u.username,
      company_name: u.company_name,
      position_title: u.position_title,
      role_id: u.role_id,
      must_change_password: u.must_change_password
    })));

    const resConstraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'users'::regclass
    `);
    console.log('--- CONSTRAINTS ---');
    console.table(resConstraints.rows);

    const countRaw = await pool.query('SELECT count(*) FROM users');
    console.log('Raw count in users:', countRaw.rows[0].count);

    const checkDouble = await pool.query('SELECT id, username, ctid FROM users ORDER BY id');
    console.log('Users raw with ctid count:', checkDouble.rows.length);
    console.table(checkDouble.rows.slice(0, 10));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

check();

import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function run() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'kip2026',
    database: 'mewah_main'
  });

  const hashedPw = await bcrypt.hash('mewah2026', 10);

  try {
    // 1. Insert Roles
    const asistenManagerRole = await pool.query(`
      INSERT INTO roles (name, description) 
      VALUES ('asisten_manager', 'Asisten Manajer')
      ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
      RETURNING id;
    `);
    
    const generalManagerRole = await pool.query(`
      INSERT INTO roles (name, description) 
      VALUES ('general_manager', 'General Manajer')
      ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
      RETURNING id;
    `);

    // fallback if returning is empty (already exists)
    const amRoleRes = await pool.query(`SELECT id FROM roles WHERE name = 'asisten_manager'`);
    const gmRoleRes = await pool.query(`SELECT id FROM roles WHERE name = 'general_manager'`);
    
    const amRoleId = amRoleRes.rows[0].id;
    const gmRoleId = gmRoleRes.rows[0].id;

    // 2. Insert Users
    await pool.query(`
      INSERT INTO users (username, password_hash, company_name, position_title, role_id)
      VALUES 
      ('asisten_manager', $1, 'Mewah Group', 'Asisten Manajer', $3),
      ('general_manager', $2, 'Mewah Group', 'General Manajer', $4)
      ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, role_id=EXCLUDED.role_id
    `, [hashedPw, hashedPw, amRoleId, gmRoleId]);
    
    console.log('Roles and Users inserted successfully!');
  } catch (err) {
    console.error('Error inserting users:', err);
  } finally {
    await pool.end();
  }
}
run();

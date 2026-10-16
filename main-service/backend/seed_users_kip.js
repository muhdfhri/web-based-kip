import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

async function seed() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'kip2026',
    database: 'mewah_main'
  });

  try {
    console.log('--- 1. Menambahkan kolom full_name ke tabel users jika belum ada ---');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT NULL;
    `);
    console.log('Kolom full_name berhasil dipastikan ada di tabel users.');

    console.log('--- 2. Mengosongkan (TRUNCATE) tabel users dan reset sequence ---');
    await pool.query(`TRUNCATE TABLE users RESTART IDENTITY CASCADE;`);
    console.log('Tabel users berhasil di-truncate dan id direset ke 1.');

    console.log('--- 3. Memastikan Primary Key dan Unique Constraint pada users ---');
    // Cek constraint primary key
    const pkCheck = await pool.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND contype = 'p'
    `);
    if (pkCheck.rows.length === 0) {
      console.log('Menambahkan Primary Key (id) ke tabel users...');
      await pool.query(`ALTER TABLE users ADD PRIMARY KEY (id);`);
    }

    const uqCheck = await pool.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'users'::regclass AND contype = 'u' AND conname = 'users_username_unique'
    `);
    if (uqCheck.rows.length === 0) {
      console.log('Menambahkan UNIQUE constraint untuk username...');
      try {
        await pool.query(`ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);`);
      } catch (e) {
        console.log('Notice saat add unique constraint:', e.message);
      }
    }

    console.log('--- 4. Menyiapkan hash password ---');
    const hashPassword123 = await bcrypt.hash('password123', 10);
    const hashMewah2026 = await bcrypt.hash('mewah2026', 10);
    const hashKip2026 = await bcrypt.hash('kip2026', 10);

    // Daftar Security Names:
    const securityNames = [
      'Rahmadani',
      'Nahwan Panjaitan',
      'Baharuddin',
      'Saudi Tua Manik',
      'Zulkarnain Sarumpaet',
      'Ananda M Yusril H',
      'Heri Safrizal Marpaung',
      'Muhammad Arifin',
      'Adek Prasetyo',
      'Rudiansyah Pohan',
      'Putra Madani',
      'Subur',
      'Bivaldo Aprian Munthe'
    ];

    const usersToInsert = [
      // 1. Manager = Username (manager) Password (password123)
      {
        username: 'manager',
        password_hash: hashPassword123,
        position_title: 'Mill Manager',
        company_name: 'Mewah Group',
        role_id: 5,
        full_name: null,
        must_change_password: 0
      },
      // 2. Asisten Manager = Username (asisten_manager) Password (mewah2026)
      {
        username: 'asisten_manager',
        password_hash: hashMewah2026,
        position_title: 'Asisten Manajer',
        company_name: 'Mewah Group',
        role_id: 24,
        full_name: null,
        must_change_password: 0
      },
      // 3. General Manager = Username (general_manager) Password (mewah2026)
      {
        username: 'general_manager',
        password_hash: hashMewah2026,
        position_title: 'General Manajer',
        company_name: 'Mewah Group',
        role_id: 25,
        full_name: null,
        must_change_password: 0
      },
      // 5. Developer = Username (dev) Password (password123)
      {
        username: 'dev',
        password_hash: hashPassword123,
        position_title: 'Lead Developer',
        company_name: 'PT Premier Engineering Indonesia',
        role_id: 4,
        full_name: null,
        must_change_password: 0
      },
      // 6. Admin = Username (admin) Password (password123)
      {
        username: 'admin',
        password_hash: hashPassword123,
        position_title: 'System Administrator',
        company_name: 'IPOMAS Internal',
        role_id: 1,
        full_name: null,
        must_change_password: 0
      }
    ];

    // 4. Security = Username (security1-13) Password (kip2026)
    for (let i = 1; i <= 13; i++) {
      usersToInsert.push({
        username: `security${i}`,
        password_hash: hashKip2026,
        position_title: 'Security',
        company_name: 'PT Kencana Inti Perkasa',
        role_id: 6,
        full_name: securityNames[i - 1],
        must_change_password: 0
      });
    }

    console.log(`--- 5. Menginput ${usersToInsert.length} data user ke database ---`);
    for (const u of usersToInsert) {
      await pool.query(`
        INSERT INTO users (
          username, 
          password_hash, 
          position_title, 
          company_name, 
          role_id, 
          full_name,
          must_change_password, 
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        u.username,
        u.password_hash,
        u.position_title,
        u.company_name,
        u.role_id,
        u.full_name,
        u.must_change_password
      ]);
    }

    console.log('--- 6. Verifikasi isi tabel users setelah seeding ---');
    const verifyRes = await pool.query(`
      SELECT id, username, full_name, position_title, company_name, role_id, must_change_password
      FROM users 
      ORDER BY id
    `);
    console.table(verifyRes.rows);
    console.log(`Total baris tabel users: ${verifyRes.rows.length}`);

  } catch (err) {
    console.error('Error saat eksekusi seed:', err);
  } finally {
    await pool.end();
  }
}

seed();

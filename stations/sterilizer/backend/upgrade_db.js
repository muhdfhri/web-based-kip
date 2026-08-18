import mysql from 'mysql2/promise';

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'mewah_sterilizer'
  });
  
  const addCol = async (col) => {
    try {
      await conn.query(`ALTER TABLE recipe_settings ADD COLUMN ${col} TINYINT DEFAULT 0`);
      console.log('Added column ' + col);
    } catch(err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column ' + col + ' already exists');
      } else {
        throw err;
      }
    }
  };

  console.log('Starting migration...');
  await addCol('inl1');
  await addCol('inl2');
  await addCol('dinl');
  await addCol('rcon');
  await addCol('dcon');
  console.log('Migration completed successfully!');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

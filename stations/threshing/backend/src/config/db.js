import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Koneksi ke database khusus stasiun
export const dbPool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'kip_station_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'mewah_kip_{station}',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit:         0,
});

// Koneksi ke database khusus stasiun (PLC tables now hosted locally in each station's database)
export const dbPoolPlc = dbPool;

// Automatically ensure station_tag_mappings and log tables exist
async function ensureTablesExist() {
  try {
    const createMappingSql = `
      CREATE TABLE IF NOT EXISTS \`station_tag_mappings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`station\` VARCHAR(50) NOT NULL,
        \`equipment\` VARCHAR(100) NOT NULL,
        \`signal_key\` VARCHAR(50) NOT NULL,
        \`tag_id\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_station_equip_sig\` (\`station\`, \`equipment\`, \`signal_key\`),
        FOREIGN KEY (\`tag_id\`) REFERENCES \`plc_tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    const createEventLogsSql = `
      CREATE TABLE IF NOT EXISTS \`station_event_logs\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`tag_name\` VARCHAR(150) NOT NULL,
        \`old_value\` VARCHAR(255) DEFAULT NULL,
        \`new_value\` VARCHAR(255) DEFAULT NULL,
        \`quality\` VARCHAR(50) DEFAULT 'GOOD',
        \`severity\` ENUM('INFO','WARNING','ALARM') DEFAULT 'INFO',
        \`source\` VARCHAR(50) DEFAULT 'PLC',
        \`timestamp\` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`shift\` VARCHAR(10) DEFAULT NULL,
        KEY \`idx_timestamp\` (\`timestamp\`),
        KEY \`idx_severity\` (\`severity\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createLogsheetEntriesSql = `
      CREATE TABLE IF NOT EXISTS \`logsheet_entries\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`shift\` ENUM('1','2','3') NOT NULL,
        \`log_date\` DATE NOT NULL,
        \`operator_id\` INT NOT NULL,
        \`operator_name\` VARCHAR(100) NOT NULL,
        \`data_json\` JSON NOT NULL,
        \`notes\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY \`idx_log_date_shift\` (\`log_date\`, \`shift\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await dbPool.query(createMappingSql);
    await dbPool.query(createEventLogsSql);
    await dbPool.query(createLogsheetEntriesSql);
    console.log('Database verification: Threshing Logsheet and Event tables are ready.');
  } catch (err) {
    console.error('Failed to create Threshing log tables:', err.message);
  }
}
ensureTablesExist();

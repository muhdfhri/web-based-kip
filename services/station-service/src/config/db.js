import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'kip_backend',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mewah_kip_db',
  waitForConnections: true, connectionLimit: 10, queueLimit: 0,
});

// Auto-create required tables
dbPool.query(`
  CREATE TABLE IF NOT EXISTS station_event_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    station_name VARCHAR(100),
    tag_name VARCHAR(100),
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    quality VARCHAR(50),
    severity VARCHAR(50),
    source VARCHAR(100),
    shift VARCHAR(10),
    timestamp DATETIME,
    INDEX idx_station_time (station_name, timestamp)
  )
`).catch(err => console.error('[DB Init] Error creating station_event_logs:', err));

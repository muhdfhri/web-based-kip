import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const makePool = (dbName) => mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'kip_reporting_ro',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// ── Read-only pools untuk setiap domain database ──
export const stationDb     = makePool(process.env.DB_NAME_STATION     || 'mewah_station');
export const plcDb         = makePool(process.env.DB_NAME_PLC         || 'mewah_plc');
export const maintenanceDb = makePool(process.env.DB_NAME_MAINTENANCE || 'mewah_maintenance');
export const logsheetDb    = makePool(process.env.DB_NAME_LOGSHEET    || 'mewah_logsheet');
export const gradingDb     = makePool(process.env.DB_NAME_GRADING     || 'mewah_grading');
export const authDb        = makePool(process.env.DB_NAME_AUTH        || 'mewah_auth');

// Default pool alias (backward compat)
export const dbPool = stationDb;

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Koneksi ke database khusus stasiun
// Gunakan empty string jika DB_PASSWORD tidak di-set (untuk root tanpa password lokal)
const dbPassword =
  process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== ""
    ? process.env.DB_PASSWORD
    : "";

export const dbPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "kip_station_user",
  password: dbPassword,
  database: process.env.DB_NAME || "mewah_pis_sterilizer_trial",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Koneksi ke database khusus stasiun (PLC tables now hosted locally in each station's database)
export const dbPoolPlc = dbPool;

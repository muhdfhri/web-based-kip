import mysql from 'mysql2/promise';
import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load env variables from the same folder (.env is in services/station-service)
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST ?? 'localhost',
  user: process.env.DB_USER ?? 'kip_station',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'mewah_station'
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_CHANNEL = process.env.REDIS_CHANNEL || 'kip:plc:data';

async function initThresholds() {
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    console.log('Ensuring Sterilizer thresholds exist in mewah_station...');
    
    // Insert warning/danger thresholds for Sterilizer Station if not exist
    await connection.query(`
      INSERT INTO threshold_settings (station, parameter_key, warning_val, danger_val, unit)
      VALUES 
        ('STERILIZER STATION', 'steam_pressure', 2.5, 3.5, 'Bar'),
        ('STERILIZER STATION', 'temperature', 120.0, 140.0, '°C')
      ON DUPLICATE KEY UPDATE 
        warning_val = VALUES(warning_val),
        danger_val = VALUES(danger_val),
        unit = VALUES(unit)
    `);
    
    console.log('Thresholds initialized successfully!');
  } catch (err) {
    console.error('Error initializing thresholds:', err);
  } finally {
    await connection.end();
  }
}

async function startSimulation() {
  await initThresholds();

  console.log(`Connecting to Redis at ${REDIS_URL}...`);
  const redisClient = createClient({ url: REDIS_URL });
  await redisClient.connect();
  console.log('Connected to Redis!');

  console.log('Starting Sterilizer PLC Simulation...');
  console.log('Press Ctrl + C to stop.');

  // Simulation loop
  setInterval(async () => {
    // Generate some mock values
    // Normal range pressure is 1.0 - 2.4, warning is 2.5 - 3.4, danger is 3.5+
    const steamPressure = (1.5 + Math.random() * 2.5).toFixed(2); 
    // Normal range temperature is 90 - 119, warning is 120 - 139, danger is 140+
    const temperature = (100 + Math.random() * 50).toFixed(2);

    const payload = {
      timestamp: new Date().toISOString(),
      tags: [
        { tag: 'STERI_steam_pressure', value: steamPressure },
        { tag: 'STERI_temperature', value: temperature }
      ]
    };

    console.log(`[SIMULATOR] Publishing: Press=${steamPressure} Bar, Temp=${temperature} °C`);
    
    try {
      await redisClient.publish(REDIS_CHANNEL, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to publish to Redis:', err);
    }
  }, 3000); // Send data every 3 seconds
}

startSimulation().catch(console.error);

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cctvRoutes from './routes/cctvRoutes.js';
import patrolRoutes from './routes/patrolRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import queueRoutes from './routes/queueRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3100;
const STATION_SLUG = process.env.STATION_SLUG || 'security';

// ── Middleware ──
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── Routes (Security Module) ──
app.use(`/api/${STATION_SLUG}/cctv`, cctvRoutes);
app.use(`/api/${STATION_SLUG}/patrol`, patrolRoutes);
app.use(`/api/${STATION_SLUG}/incidents`, incidentRoutes);
app.use(`/api/${STATION_SLUG}/queues`, queueRoutes);
app.use(`/api/${STATION_SLUG}/upload`, uploadRoutes);
// Alias for mobile app that hardcodes /api/upload
app.use('/api/upload', uploadRoutes);

// ── Static Files (Uploads) ──
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', station: STATION_SLUG, module: 'security' });
});

// ── Start Server ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[station-${STATION_SLUG}] Security backend listening on port ${PORT}`);
});

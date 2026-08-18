import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import configRoutes from './routes/configRoutes.js';

import { runMigration } from './config/migration.js';

dotenv.config();

// Run database migrations
await runMigration().catch(err => {
  console.error('[server] Migration failed:', err);
});

const app = express();
const PORT = process.env.PORT || 3011;

// ── Middleware ──
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  console.log(`[Diagnostic] ${req.method} ${req.url}`);
  console.log(`[Diagnostic] Auth Header:`, req.headers.authorization);
  next();
});

app.use(express.json());

// ── Routes ──
app.use('/auth', authRoutes);
app.use('/api/admin', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/config', configRoutes);

// ── Health ──
const getHealthResponse = () => ({
  success: true,
  message: 'API is reachable',
  server: 'Node.js Express',
  service: 'main-service',
  port: PORT
});

app.get('/health', (_req, res) => res.json(getHealthResponse()));
app.get('/api/health', (_req, res) => res.json(getHealthResponse()));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[main-service] listening on port ${PORT}`);
});

// Emulate config-service on port 3008 for other services during transition
const CONFIG_PORT = 3009;
app.listen(CONFIG_PORT, '0.0.0.0', () => {
  console.log(`[main-service] emulating config-service on port ${CONFIG_PORT}`);
});

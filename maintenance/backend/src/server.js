import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import maintenanceRoutes from './routes/maintenanceRoutes.js';

dotenv.config();

const PORT = process.env.PORT || 3200;
const app = express();
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : true;

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// ── WebSocket Gateway & Broadcast Endpoint for Port 3200 ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[WS 3200] Client connected. Total active clients: ${wsClients.size}`);

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WS 3200] Client disconnected. Remaining clients: ${wsClients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS 3200] Client error:', err.message);
    wsClients.delete(ws);
  });
});

function broadcastEvent(event, data) {
  const payload = JSON.stringify({ event, data });
  for (const client of wsClients) {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(payload);
      } catch (err) {
        console.error('[WS 3200] Send error:', err.message);
      }
    }
  }
}

// Public broadcast endpoint used by security-service (Port 3101) & patrol-service
app.post('/api/maintenance/notify-ticket', (req, res) => {
  const { event, data } = req.body;
  console.log(`[WS 3200 Broadcast] Event: ${event}, Active clients: ${wsClients.size}`);
  broadcastEvent(event, data);
  res.json({ success: true, message: 'Broadcasted to WebSocket clients', clients: wsClients.size });
});

app.use('/api/maintenance', maintenanceRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'maintenance-service', mill: 'KIP', wsClients: wsClients.size }));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[maintenance-service] listening on port ${PORT} with WebSocket gateway`);
});

// Creates and drops only its own cctv_verify_api_<pid> database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

test('RTSP CRUD, imported code collisions and concurrent saves need no per-camera configuration', async () => {
  const name = `cctv_verify_api_${process.pid}`;
  const options = { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'kip2026' };
  const admin = new pg.Pool({ ...options, database: 'postgres' });
  let db, server, ai, routePool, mainPool, created = false;
  const synced = new Map();
  try {
    await admin.query(`CREATE DATABASE "${name}"`); created = true;
    db = new pg.Pool({ ...options, database: name });
    await db.query(`CREATE TABLE cctv_cameras (
      id serial PRIMARY KEY, camera_code varchar(50) UNIQUE, camera_name varchar(255) NOT NULL,
      location varchar(255), station_slug varchar(100), rtsp_url text NOT NULL,
      is_active integer DEFAULT 1, sort_order integer DEFAULT 0, created_at timestamp DEFAULT CURRENT_TIMESTAMP)`);
    await db.query("INSERT INTO cctv_cameras (camera_code,camera_name,rtsp_url) VALUES ('CAM_2','Imported camera','rtsp://example.invalid/main')");
    ai = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        if (req.method === 'POST') { const data = JSON.parse(body); synced.set(data.camera_code, data); }
        else synced.delete(decodeURIComponent(req.url.split('/').pop()));
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"success":true}');
      });
    });
    await new Promise(resolve => ai.listen(0, '127.0.0.1', resolve));
    process.env.DB_NAME = name;
    process.env.SECURITY_AI_HOST = '127.0.0.1';
    process.env.SECURITY_AI_PORT = String(ai.address().port);
    const { default: router } = await import('../src/routes/cctvRoutes.js');
    ({ pool: routePool, mainPool } = await import('../src/config/db.js'));
    const app = express(); app.use(express.json()); app.use('/api/security/cctv', router);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}/api/security/cctv`;
    async function request(path = '', method = 'GET', body) {
      const response = await fetch(origin + path, { method,
        headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, ...await response.json() };
    }
    const camera = { camera_name: 'New RTSP', rtsp_url: '  rtsp://example.invalid/live?channel=3  ' };
    assert.equal((await request('', 'POST', { ...camera, rtsp_url: 'http://example.invalid' })).status, 400);
    const saved = await request('', 'POST', camera);
    assert.equal(saved.status, 201);
    assert.match(saved.camera_code, /^CAM_2_[a-f0-9]+$/, 'imported CAM_2 must not prevent an automatic camera code');
    let listed = await request();
    const row = listed.data.find(item => item.id === saved.id);
    assert.equal(row.rtsp_url, camera.rtsp_url.trim());
    assert.equal(row.stream_url, `/api/security/cctv/stream/${saved.id}`);
    assert.equal((await request('', 'POST', { ...camera, camera_code: 'CAM_2' })).status, 409);
    const concurrent = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      request('', 'POST', { ...camera, camera_name: `Concurrent ${index}` })));
    assert.ok(concurrent.every(result => result.status === 201));
    assert.equal(new Set(concurrent.map(result => result.id)).size, 5);
    assert.equal((await request(`/${saved.id}`, 'PUT', { ...row, rtsp_url: 'rtsp://example.invalid/changed', is_active: false })).status, 200);
    assert.ok(!(await request()).data.some(item => item.id === saved.id));
    listed = await request('?all=true');
    assert.equal(listed.data.find(item => item.id === saved.id).rtsp_url, 'rtsp://example.invalid/changed');
    const until = Date.now() + 3000;
    while (synced.get(saved.camera_code)?.is_active !== false && Date.now() < until) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(synced.get(saved.camera_code).is_active, false);
    assert.equal((await request(`/${saved.id}`, 'DELETE')).status, 200);
    assert.equal((await request(`/${saved.id}`, 'DELETE')).status, 404);
    assert.equal((await request('/live?ids=1&view=2')).status, 400);
    assert.equal((await request('/live?ids=1&width=bad')).status, 400);
    assert.equal((await request('/live?ids=1&width=2000')).status, 400);
    assert.equal((await request('/live?ids=1&width=159')).status, 400);
    assert.equal((await request('/live?ids=1&width=160')).status, 200);
    assert.equal((await request('/live?ids=1&fps=0')).status, 400);
    assert.equal((await request('/live?ids=1&fps=31')).status, 400);
    assert.equal((await request('/live?ids=1&width=160&fps=15')).status, 200);
    const rtspOnly = await request('', 'POST', { rtsp_url: 'rtsp://example.invalid/rtsp-only' });
    assert.equal(rtspOnly.status, 201);
    const automatic = (await request()).data.find(item => item.id === rtspOnly.id);
    assert.equal(automatic.camera_name, `Kamera ${rtspOnly.id}`);
    assert.equal(automatic.camera_code, rtspOnly.camera_code);
    assert.equal(automatic.station_slug, 'security');
    assert.equal(automatic.is_active, 1);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (ai) await new Promise(resolve => ai.close(resolve));
    await routePool?.end(); await mainPool?.end(); await db?.end();
    if (created && /^cctv_verify_api_\d+$/.test(name)) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
});

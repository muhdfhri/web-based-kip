import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import express from 'express';

test('live proxy preserves session negotiation, feedback bodies and closes abandoned upstreams', async () => {
  let closed = false, feedback;
  const token = 'b'.repeat(32);
  const ai = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        feedback = { path: req.url, body: JSON.parse(body) };
        res.setHeader('Content-Type', 'application/json');
        res.end('{"success":true}');
      });
    } else {
      assert.equal(new URL(req.url, 'http://localhost').searchParams.get('session'), token);
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'X-CCTV-Control': '1' });
      res.write('frame');
      res.on('close', () => { closed = true; });
    }
  });
  await new Promise(resolve => ai.listen(0, '127.0.0.1', resolve));
  process.env.SECURITY_AI_PORT = String(ai.address().port);
  const { default: router } = await import('../src/routes/cctvRoutes.js');
  const { pool, mainPool } = await import('../src/config/db.js');
  const app = express(); app.use(express.json()); app.use('/api/security/cctv', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/security/cctv`;
  try {
    assert.equal((await fetch(`${base}/live?ids=1&session=invalid`)).status, 400);
    const response = await fetch(`${base}/live?ids=1&session=${token}`);
    assert.equal(response.headers.get('X-CCTV-Control'), '1');
    assert.match(response.headers.get('Cache-Control'), /no-transform/);
    const reader = response.body.getReader();
    assert.equal(new TextDecoder().decode((await reader.read()).value), 'frame');
    const body = { ack: 1, query: 'ids=1&view=1&focus=1&width=160&fps=15' };
    const control = await fetch(`${base}/live/control/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal(control.status, 200);
    assert.deepEqual(feedback, { path: `/api/security-ai/live/control/${token}`, body });
    await reader.cancel();
    const deadline = Date.now() + 2000;
    while (!closed && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(closed);
  } finally {
    server.closeAllConnections(); ai.closeAllConnections();
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => ai.close(resolve)), pool.end(), mainPool.end()]);
  }
});

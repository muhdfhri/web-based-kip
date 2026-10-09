// Run only against a disposable DB restored from the supplied server dump.
// The dump's dblink target must also point to the disposable AI database.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const dbName = process.env.DB_NAME || '';
const aiName = process.env.DB_NAME_AI || '';
if (!dbName.startsWith('cctv_verify_') || !aiName.startsWith('cctv_verify_')) {
  throw new Error('Refusing CRUD verification outside cctv_verify_* databases');
}
const options = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD };
const db = new pg.Pool({ ...options, database: dbName });
const ai = new pg.Pool({ ...options, database: aiName });
const origin = process.env.CCTV_VERIFY_ORIGIN || 'http://127.0.0.1:3181';
async function request(path = '', method = 'GET', body) {
  const response = await fetch(`${origin}/api/security/cctv${path}`, {
    method, headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}
async function synced(code, expected) {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    const { rows } = await ai.query('SELECT is_active FROM public.security_ai_cctv_configs WHERE camera_code=$1', [code]);
    if (expected === null ? !rows.length : rows.length && rows[0].is_active === expected) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.fail('AI synchronization did not match stored camera_code/is_active');
}

test('server dump: list/filter, identity allocation, CRUD and AI sync preserve other data', async () => {
  const inserted = [];
  let original;
  try {
    const listed = await request();
    assert.equal(listed.status, 200); assert.equal(listed.body.data.length, 5);
    original = listed.body.data.find(camera => camera.id === 21);
    assert.equal(original.camera_code, 'CAM_1');
    const filtered = await request('?station_slug=security&search=tes');
    assert.equal(filtered.body.data.length, 5);
    assert.equal((await request("?search=%27%20OR%201%3D1--")).body.data.length, 0);
    assert.equal((await request('/live?ids=1oops')).status, 400);
    assert.equal((await request('/stream/21oops')).status, 400);
    assert.equal((await request('/0', 'DELETE')).status, 400);
    assert.equal((await request('/999999', 'PUT', original)).status, 404);

    assert.equal((await request('/21', 'PUT', { ...original, is_active: false })).status, 200);
    await synced('CAM_1', false);
    const { is_active, ...withoutActive } = original;
    assert.equal((await request('/21', 'PUT', withoutActive)).status, 200);
    assert.equal((await db.query('SELECT is_active FROM public.cctv_cameras WHERE id=21')).rows[0].is_active, 0);
    assert.equal((await request('/21', 'PUT', original)).status, 200);
    await synced('CAM_1', true);

    const code = 'CCTV_VERIFY_CUSTOM';
    const create = await request('', 'POST', { camera_code: code, camera_name: 'Verification',
      rtsp_url: 'rtsp://example.invalid/Streaming/Channels/101', is_active: false });
    assert.equal(create.status, 201); inserted.push(create.body.id);
    await synced(code, false);
    const row = (await db.query('SELECT * FROM public.cctv_cameras WHERE id=$1', [create.body.id])).rows[0];
    assert.ok(row.created_at); assert.equal(row.is_active, 0);
    assert.equal((await request(`/${row.id}`, 'PUT', { ...row, is_active: true })).status, 200);
    await synced(code, true);

    const concurrent = await Promise.all(Array.from({ length: 5 }, (_, index) => request('', 'POST', {
      camera_name: `Verification ${index}`, rtsp_url: 'rtsp://example.invalid/test', is_active: 0,
    })));
    for (const result of concurrent) {
      assert.equal(result.status, 201); inserted.push(result.body.id);
      assert.equal(result.body.camera_code, `CAM_${result.body.id}`);
      await synced(result.body.camera_code, false);
    }
    assert.equal(new Set(concurrent.map(result => result.body.id)).size, 5);
    assert.equal((await request('', 'POST', { ...original, camera_code: 'CAM_1' })).status, 409);
    assert.equal((await request(`/${row.id}`, 'DELETE')).status, 200);
    await synced(code, null);
    inserted.splice(inserted.indexOf(row.id), 1);
    assert.equal((await request(`/${row.id}`, 'DELETE')).status, 404);
  } finally {
    for (const id of inserted) await request(`/${id}`, 'DELETE');
    if (original) await request('/21', 'PUT', original);
    await db.end(); await ai.end();
  }
});

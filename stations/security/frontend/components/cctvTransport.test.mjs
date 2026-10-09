import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { FrameDecoder, StreamClock, subscribeCctv } from './cctvTransport.js';

function packet(id, sequence = 1) {
    const jpeg = Buffer.from([255, 216, id, 255, 217]);
    const header = Buffer.from(JSON.stringify({ camera_id: id, sequence, status: 'live', length: jpeg.length }));
    const prefix = Buffer.alloc(4); prefix.writeUInt32BE(header.length);
    return Buffer.concat([prefix, header, jpeg]);
}
const waitFor = async (condition, timeout = 3000) => {
    const until = Date.now() + timeout;
    while (!condition()) {
        if (Date.now() > until) throw new Error('Condition timed out');
        await new Promise(resolve => setTimeout(resolve, 20));
    }
};

test('fragmented binary packets retain all 16 channels without mixing JPEG bytes', () => {
    const data = Buffer.concat(Array.from({ length: 16 }, (_, i) => packet(i + 1)));
    const decoder = new FrameDecoder();
    const received = [];
    for (let i = 0; i < data.length; i += 7) received.push(...decoder.push(data.subarray(i, i + 7)));
    assert.equal(received.length, 16);
    received.forEach(({ meta, jpeg }, i) => {
        assert.equal(meta.camera_id, i + 1); assert.equal(jpeg[2], i + 1);
    });
    assert.equal(decoder.buffer.length, 0);
    assert.throws(() => new FrameDecoder().push(Buffer.from([255, 255, 255, 255])));
});

test('backlog detection ignores clock offset and catches continuously arriving delayed frames', () => {
    const clock = new StreamClock();
    assert.equal(clock.backlog({ sent_ms: 9000000, age_ms: 20 }, 100), 0);
    assert.equal(clock.backlog({ sent_ms: 9000100, age_ms: 20 }, 200), 0);
    assert.equal(clock.backlog({ sent_ms: 9000200, age_ms: 60000, status: 'reconnecting' }, 300), 0);
    assert.ok(clock.backlog({ sent_ms: 9000200, age_ms: 20 }, 2300) > 1500);
    assert.equal(clock.backlog({ age_ms: 20 }, 2400), 0); // older protocol
});

test('16 cameras and modal share one connection, reconnect on disconnect, and release it on unmount', async () => {
    let requests = 0, closed = 0, active = 0, maximum = 0;
    const urls = [];
    const connections = new Set();
    const server = http.createServer((req, res) => {
        requests++; active++; maximum = Math.max(maximum, active); urls.push(req.url);
        connections.add(res);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        let sequence = 0;
        const send = () => {
            sequence++;
            for (let id = 1; id <= 16; id++) res.write(packet(id, sequence));
        };
        send(); const timer = setInterval(send, 50);
        res.on('close', () => { clearInterval(timer); active--; closed++; connections.delete(res); });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    globalThis.window = { location: { href: origin }, addEventListener() {} };
    globalThis.document = { hidden: false, addEventListener() {} };
    let bitmaps = 0;
    globalThis.createImageBitmap = async () => {
        bitmaps++;
        return { width: 640, height: 360, close() { bitmaps--; } };
    };
    const statuses = new Map(); const unsubscribe = [];
    const canvas = fit => ({ dataset: { fit }, clientWidth: 320, clientHeight: 180,
        getContext: () => ({ clearRect() {}, drawImage() {} }) });
    try {
        for (let id = 1; id <= 16; id++) {
            unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/${id}`, canvas('cover'),
                status => statuses.set(id, status)));
        }
        unsubscribe.push(subscribeCctv(`${origin}/api/security/cctv/stream/16`, canvas('contain'), () => {}));
        await waitFor(() => statuses.size === 16 && [...statuses.values()].every(s => s === 'live'));
        assert.equal(requests, 1); assert.equal(maximum, 1);
        assert.equal(new URL(urls[0], origin).searchParams.get('ids').split(',').length, 16);
        assert.equal(new URL(urls[0], origin).searchParams.get('focus'), '16');
        for (const res of connections) res.destroy();
        await waitFor(() => requests === 2 && [...statuses.values()].every(s => s === 'live'));
        assert.equal(maximum, 1);
    } finally {
        unsubscribe.forEach(fn => fn());
        await waitFor(() => active === 0 && bitmaps === 0);
        await new Promise(resolve => server.close(resolve));
    }
    assert.equal(closed, requests);
});

// Real NVR soak test. Uses the same multiplexed URL and decoder as the browser.
import { FrameDecoder } from '../frontend/components/cctvTransport.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const origin = process.argv[2] || 'http://127.0.0.1:5177';
const seconds = Number(process.argv[3] || 360);
const cameras = (await (await fetch(`${origin}/api/security/cctv`)).json()).data;
const ids = cameras.map(camera => camera.id);
const option = prefix => process.argv.slice(5).find(value => value.startsWith(prefix))?.slice(prefix.length).split(',').filter(Boolean);
const allowedOffline = new Set(option('--allow-offline=') || []);
const viewCodes = new Set(option('--view-codes=') || cameras.map(camera => camera.camera_code));
const viewedIds = cameras.filter(camera => viewCodes.has(camera.camera_code)).map(camera => camera.id);
const requiredIds = cameras.filter(camera => !allowedOffline.has(camera.camera_code)).map(camera => camera.id);
const requiredFrames = viewedIds.filter(id => requiredIds.includes(id));
const sourceGroups = new Map();
for (const camera of cameras) {
    const group = sourceGroups.get(camera.rtsp_url) || [];
    group.push(camera.id); sourceGroups.set(camera.rtsp_url, group);
}
const requiredReaders = [...sourceGroups.values()].filter(group => group.some(id => requiredIds.includes(id)));
// OpenCV serializes RTSP opens on some Windows builds. Measure reconnects/FPS
// after readers warm up; record cold-start time separately from stream failures.
const warmingStarted = performance.now();
while (true) {
    const diagnostics = (await (await fetch(`${origin}/api/security/cctv/stream/status`)).json()).data;
    if (requiredReaders.every(group => diagnostics.some(row => group.includes(row.camera_id) && row.age_ms !== null && row.age_ms < 4000))) break;
    if (performance.now() - warmingStarted > 120000) throw new Error('Active CCTV readers did not warm up within 120 seconds');
    await new Promise(resolve => setTimeout(resolve, 1000));
}
const warmupSeconds = +((performance.now() - warmingStarted) / 1000).toFixed(2);
const start = performance.now();
const end = start + seconds * 1000;
const frames = new Map(ids.map(id => [id, { frames: 0, first: null, last: null,
    largestGapMs: 0, previousHash: null, imageChanges: 0, steadyFrames: 0, gaps: [] }]));
const sessions = [];
let bytes = 0, refreshes = 0, violations = [];
let nextReport = start + 10000;
const codeById = new Map(cameras.map(camera => [camera.id, camera.camera_code]));
console.log(JSON.stringify({ event: 'start', cameras: ids.length, seconds }));
while (performance.now() < end) {
    const sessionStart = performance.now();
    const firstFrames = new Map();
    const controller = new AbortController();
    // Close/reopen twice to simulate refresh, then keep one connection >5 minutes.
    const duration = refreshes === 0 ? 45000 : refreshes === 1 ? 10000 : Math.max(1, end - performance.now());
    const timer = setTimeout(() => controller.abort(), duration);
    let reader;
    try {
    const response = await fetch(`${origin}/api/security/cctv/live?ids=${ids.join(',')}&view=${viewedIds.join(',')}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        reader = response.body.getReader();
        const decoder = new FrameDecoder();
        while (performance.now() < end) {
            const { value, done } = await reader.read();
            if (done) throw new Error('Unexpected EOF');
            bytes += value.length;
            const now = performance.now();
            for (const { meta, jpeg } of decoder.push(value)) {
                const record = frames.get(meta.camera_id);
                if (!record) continue;
                record.status = meta.status; record.lastPacket = now;
                if (!jpeg.length) continue;
                if (jpeg[0] !== 255 || jpeg[1] !== 216) throw new Error('Invalid JPEG');
                if (meta.status !== 'live') continue;
                record.frames++;
                if (now - start >= 30000) record.steadyFrames++;
                const hash = createHash('sha256').update(jpeg).digest('hex');
                if (record.previousHash && hash !== record.previousHash) record.imageChanges++;
                record.previousHash = hash;
                if (!record.first) record.first = (now - start) / 1000;
                if (record.last) {
                    const gap = now - record.last;
                    record.largestGapMs = Math.max(record.largestGapMs, gap);
                    if (now - start >= 30000) record.gaps.push(gap);
                }
                record.last = now;
                if (!firstFrames.has(meta.camera_id)) firstFrames.set(meta.camera_id, now - sessionStart);
            }
            if (now >= nextReport) {
                const missing = requiredIds.filter(id => {
                    const record = frames.get(id);
                    return record.status !== 'live' || !record.lastPacket || now - record.lastPacket > 5000
                        || (viewedIds.includes(id) && (!record.last || now - record.last > 5000));
                });
                if (now - start > 30000 && missing.length) violations.push({ second: Math.round((now - start) / 1000), missing });
                console.log(JSON.stringify({ event: 'sample', second: Math.round((now - start) / 1000),
                    live: requiredIds.length - missing.length, missing: missing.map(id => codeById.get(id)),
                    framesMin: Math.min(...requiredFrames.map(id => frames.get(id).frames)),
                    bandwidthMbps: +(bytes * 8 / ((now - start) / 1000) / 1e6).toFixed(2) }));
                nextReport = now + 30000;
            }
        }
    } catch (error) {
        if (!controller.signal.aborted) {
            violations.push({ second: Math.round((performance.now() - start) / 1000), error: error.message });
            console.log(JSON.stringify({ event: 'error', message: error.message }));
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    } finally {
        clearTimeout(timer); controller.abort();
        if (reader) { try { await reader.cancel(); } catch {} }
        sessions.push({ allLiveSeconds: requiredFrames.every(id => firstFrames.has(id))
            ? +(Math.max(...requiredFrames.map(id => firstFrames.get(id))) / 1000).toFixed(3) : null,
            live: requiredFrames.filter(id => firstFrames.has(id)).length });
        refreshes++;
    }
}
const report = { durationSeconds: +((performance.now() - start) / 1000).toFixed(1),
    cameras: ids.length, warmupSeconds, allowedOffline: [...allowedOffline], viewedCameras: [...viewCodes], sessions, violations,
    frames: ids.map(id => ({ camera: codeById.get(id), viewed: viewedIds.includes(id), status: frames.get(id).status,
        frames: frames.get(id).frames, imageChanges: frames.get(id).imageChanges,
        steadyFps: +(frames.get(id).steadyFrames / Math.max(1, seconds - 30)).toFixed(2),
        p95GapMs: Math.round(frames.get(id).gaps.sort((a, b) => a - b)[Math.floor(frames.get(id).gaps.length * .95)] || 0),
        firstLiveSeconds: frames.get(id).first,
        largestGapSeconds: +(frames.get(id).largestGapMs / 1000).toFixed(3) })) };
mkdirSync('stations/security/verification', { recursive: true });
writeFileSync(process.argv[4] || 'stations/security/verification/cctv-live-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ event: 'complete', ...report }));
if (violations.length || sessions.some(session => session.live !== requiredFrames.length)
    || report.frames.some(frame => frame.viewed && !allowedOffline.has(frame.camera) && frame.imageChanges < 2)) process.exitCode = 1;

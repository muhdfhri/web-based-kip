// Wire format: uint32 header length (network order), JSON header, JPEG bytes.
// One connection carries every camera. There is never a per-camera fetch queue.
export class FrameDecoder {
    constructor() { this.buffer = new Uint8Array(0); this.decoder = new TextDecoder(); }
    push(chunk) {
        const data = new Uint8Array(this.buffer.length + chunk.length);
        data.set(this.buffer); data.set(chunk, this.buffer.length);
        let offset = 0;
        const packets = [];
        while (data.length - offset >= 4) {
            const size = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0);
            if (!size || size > 4096) throw new Error('Invalid CCTV header');
            if (data.length - offset < 4 + size) break;
            const meta = JSON.parse(this.decoder.decode(data.subarray(offset + 4, offset + 4 + size)));
            if (!Number.isSafeInteger(meta.length) || meta.length < 0 || meta.length > 2 * 1024 * 1024) {
                throw new Error('Invalid CCTV frame length');
            }
            const end = offset + 4 + size + meta.length;
            if (end > data.length) break;
            packets.push({ meta, jpeg: data.slice(offset + 4 + size, end) });
            offset = end;
        }
        this.buffer = data.slice(offset);
        if (this.buffer.length > 2 * 1024 * 1024 + 4100) throw new Error('CCTV buffer limit');
        return packets;
    }
}

const groups = new Map();

// Compare monotonic clock deltas; server/browser wall clocks need not match.
export class StreamClock {
    constructor() { this.offset = Infinity; }
    backlog(meta, receivedAt) {
        if (!Number.isFinite(meta.sent_ms)) return 0;
        const offset = receivedAt - meta.sent_ms;
        this.offset = Math.min(this.offset, offset);
        return Math.max(0, offset - this.offset);
    }
}
const messages = {
    connecting: 'Menghubungkan kamera…', reconnecting: 'Koneksi terputus. Menghubungkan ulang…',
    offline: 'Kamera tidak aktif atau tidak tersedia', live: '',
};

function notify(source, status) {
    if (source.status === status) return;
    source.status = status;
    for (const listener of source.subscribers.values()) listener(status, messages[status]);
}

function draw(source, target) {
    const image = source.bitmap;
    if (!image || target.dataset.cctvVisible === 'false' || document.hidden
        || !target.clientWidth || !target.clientHeight) return;
    const width = Math.max(1, Math.round(target.clientWidth));
    const height = Math.max(1, Math.round(target.clientHeight));
    if (target.width !== width) target.width = width;
    if (target.height !== height) target.height = height;
    const scale = target.dataset.fit === 'contain'
        ? Math.min(width / image.width, height / image.height)
        : Math.max(width / image.width, height / image.height);
    // Opaque CPU-backed canvas avoids allocating a GPU surface per CCTV tile.
    const context = target.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!context) return;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, (width - image.width * scale) / 2,
        (height - image.height * scale) / 2, image.width * scale, image.height * scale);
    target.dataset.cctvRenderedFrames = String(source.renderedFrames);
}

const visible = source => [...source.subscribers.keys()].some(canvas => canvas.dataset.cctvVisible !== 'false');
const focused = group => [...group.sources].find(([, source]) =>
    [...source.subscribers.keys()].some(canvas => canvas.dataset.fit === 'contain' && canvas.dataset.cctvVisible !== 'false'));
const wantsImage = (group, id, source) => {
    return group.focusId ? group.focusId === id : visible(source);
};

function scheduleDraw(group, source) {
    group.dirty.add(source);
    if (group.paint !== null) return;
    const paint = () => {
        group.paint = null;
        const focus = group.focusId;
        for (const dirty of group.dirty) {
            for (const canvas of dirty.subscribers.keys()) {
                if (!focus || canvas.dataset.fit === 'contain') draw(dirty, canvas);
            }
        }
        group.dirty.clear();
    };
    group.paint = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(paint) : setTimeout(paint, 0);
}

function streamUrl(group) {
    const url = new URL(group.endpoint);
    url.searchParams.set('ids', [...group.sources.keys()].join(','));
    const focus = focused(group);
    url.searchParams.set('view', focus ? focus[0] : [...group.sources].filter(([, source]) => visible(source)).map(([id]) => id).join(','));
    if (focus) url.searchParams.set('focus', focus[0]);
    return url;
}

async function decodeLatest(group, source) {
    if (source.decoding) return;
    source.decoding = true;
    try {
        while (source.pending) {
            const { jpeg, generation, frameEpoch } = source.pending;
            source.pending = null;
            const bitmap = await createImageBitmap(new Blob([jpeg], { type: 'image/jpeg' }));
            if (generation !== group.generation || frameEpoch !== source.frameEpoch
                || group.controller?.signal.aborted || !source.subscribers.size || !visible(source)) { bitmap.close(); continue; }
            source.bitmap?.close();
            source.bitmap = bitmap;
            source.renderedFrames++;
            notify(source, 'live');
            scheduleDraw(group, source);
        }
    } catch {
        notify(source, 'reconnecting');
    } finally { source.decoding = false; }
}

function stop(group) {
    group.generation++;
    group.controller?.abort();
    group.controller = null;
    clearTimeout(group.retry);
    group.retry = null;
    for (const source of group.sources.values()) {
        source.pending = null;
        source.frameEpoch++;
    }
}

async function connect(group) {
    stop(group);
    if (!group.sources.size || document.hidden) return;
    const generation = group.generation;
    const controller = new AbortController();
    group.controller = controller;
    const url = streamUrl(group);
    group.signature = url.href;
    group.focusId = url.searchParams.get('focus');
    let receivedAt = performance.now();
    let behindSince = null;
    let reader;
    const watchdog = setInterval(() => {
        if (performance.now() - receivedAt > 12000) controller.abort();
        for (const source of group.sources.values()) {
            if (source.status === 'live' && performance.now() - source.lastFrameAt > 4500) {
                notify(source, 'reconnecting');
            }
        }
    }, 1000);
    try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok || !response.body) throw new Error('CCTV server unavailable');
        reader = response.body.getReader();
        const decoder = new FrameDecoder();
        const clock = new StreamClock();
        while (generation === group.generation) {
            const { value, done } = await reader.read();
            if (done) throw new Error('CCTV stream ended');
            receivedAt = performance.now();
            for (const { meta, jpeg } of decoder.push(value)) {
                if (clock.backlog(meta, receivedAt) > 1500) {
                    // Discard transient backlog without disconnecting every camera.
                    // Only a sustained backlog needs a fresh TCP connection.
                    behindSince ??= receivedAt;
                    if (receivedAt - behindSince > 8000) throw new Error('CCTV connection behind live video');
                    continue;
                }
                behindSince = null;
                const source = group.sources.get(String(meta.camera_id));
                if (!source) continue;
                if (meta.status !== 'live' || (Number.isFinite(meta.age_ms) && meta.age_ms > 1500)) {
                    source.pending = null;
                    source.frameEpoch++;
                    notify(source, meta.status !== 'live' && meta.status in messages ? meta.status : 'reconnecting');
                    continue;
                }
                source.lastFrameAt = receivedAt;
                const display = wantsImage(group, String(meta.camera_id), source);
                if (!display) notify(source, 'live');
                if (!jpeg.length || document.hidden || !display) continue;
                // At most one pending frame per camera. Slow clients drop old frames.
                source.pending = { jpeg, generation, frameEpoch: source.frameEpoch };
                void decodeLatest(group, source);
            }
        }
    } catch {
        if (generation === group.generation) {
            for (const source of group.sources.values()) notify(source, 'reconnecting');
        }
    } finally {
        clearInterval(watchdog);
        controller.abort();
        if (reader) { try { await reader.cancel(); } catch { /* already closed */ } }
        if (generation === group.generation && group.sources.size && !document.hidden) {
            group.retry = setTimeout(() => { void connect(group); }, 1500);
        }
    }
}

function schedule(group) {
    clearTimeout(group.changeTimer);
    group.changeTimer = setTimeout(() => {
        if (group.controller && !group.controller.signal.aborted && streamUrl(group).href === group.signature) return;
        void connect(group);
    }, 100);
}

let lifecycleBound = false;
export function subscribeCctv(src, canvas, listener) {
    const url = new URL(src, window.location.href);
    const id = url.pathname.match(/\/cctv\/stream\/(\d+)$/)?.[1];
    if (!id) { listener('offline', messages.offline); return () => {}; }
    const endpoint = new URL(url.pathname.replace(/\/stream\/\d+$/, '/live'), url.origin).href;
    let group = groups.get(endpoint);
    if (!group) {
        group = { endpoint, sources: new Map(), generation: 0, controller: null, dirty: new Set(), paint: null };
        groups.set(endpoint, group);
    }
    let source = group.sources.get(id);
    const isNew = !source;
    if (!source) {
        source = { subscribers: new Map(), bitmap: null, pending: null,
            decoding: false, status: 'connecting', lastFrameAt: 0, frameEpoch: 0, renderedFrames: 0 };
        group.sources.set(id, source);
    }
    source.subscribers.set(canvas, listener);
    let observer;
    if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const state = String(entry.isIntersecting);
                if (canvas.dataset.cctvVisible === state) continue;
                canvas.dataset.cctvVisible = state;
                if (!visible(source)) {
                    source.pending = null;
                    source.frameEpoch++;
                    source.bitmap?.close();
                    source.bitmap = null;
                } else draw(source, canvas);
                schedule(group);
            }
        });
        observer.observe(canvas);
    }
    listener(source.status, messages[source.status]);
    draw(source, canvas);
    if (isNew || canvas.dataset.fit === 'contain') schedule(group);
    if (!lifecycleBound) {
        lifecycleBound = true;
        document.addEventListener('visibilitychange', () => {
            for (const active of groups.values()) {
                if (document.hidden) stop(active); else schedule(active);
            }
        });
        window.addEventListener('pagehide', () => { for (const active of groups.values()) stop(active); });
        window.addEventListener('pageshow', () => { for (const active of groups.values()) schedule(active); });
    }
    return () => {
        observer?.disconnect();
        source.subscribers.delete(canvas);
        if (!source.subscribers.size) {
            source.bitmap?.close();
            source.bitmap = null;
            source.pending = null;
            group.sources.delete(id);
        }
        if (!group.sources.size) {
            clearTimeout(group.changeTimer);
            stop(group);
            groups.delete(endpoint);
            if (group.paint !== null) {
                if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(group.paint);
                else clearTimeout(group.paint);
                group.paint = null;
            }
            group.dirty.clear();
        } else if (!source.subscribers.size || canvas.dataset.fit === 'contain') schedule(group);
    };
}

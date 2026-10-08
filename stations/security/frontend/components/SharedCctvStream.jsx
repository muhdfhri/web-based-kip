import { useEffect, useRef, useState } from 'react';

// One HTTP MJPEG decoder per source, shared by grid cards and the modal.
const sources = new Map();

function subscribe(src, canvas, setFailed) {
    let source = sources.get(src);
    if (!source) {
        const image = new Image();
        source = { image, subscribers: new Map(), failed: false, timer: null, retry: null };
        sources.set(src, source);
        image.onerror = () => {
            source.failed = true;
            for (const listener of source.subscribers.values()) listener(true);
            if (!source.retry) source.retry = setTimeout(() => {
                source.retry = null;
                image.src = `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}`;
            }, 3000);
        };
        image.onload = () => {
            source.failed = false;
            for (const listener of source.subscribers.values()) listener(false);
        };
        source.timer = setInterval(() => {
            if (source.failed || !image.naturalWidth) return;
            for (const target of source.subscribers.keys()) {
                const width = Math.max(1, Math.round(target.clientWidth));
                const height = Math.max(1, Math.round(target.clientHeight));
                if (target.width !== width) target.width = width;
                if (target.height !== height) target.height = height;
                const scale = target.dataset.fit === 'contain'
                    ? Math.min(width / image.naturalWidth, height / image.naturalHeight)
                    : Math.max(width / image.naturalWidth, height / image.naturalHeight);
                const dw = image.naturalWidth * scale;
                const dh = image.naturalHeight * scale;
                const context = target.getContext('2d');
                context.clearRect(0, 0, width, height);
                context.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
            }
        }, 66);
        image.src = src;
    }
    source.subscribers.set(canvas, setFailed);
    setFailed(source.failed);
    return () => {
        source.subscribers.delete(canvas);
        if (source.subscribers.size === 0) {
            clearInterval(source.timer);
            clearTimeout(source.retry);
            source.image.onload = null;
            source.image.onerror = null;
            source.image.src = '';
            sources.delete(src);
        }
    };
}

export default function SharedCctvStream({ src, alt, style, fit = 'cover' }) {
    const canvasRef = useRef(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => subscribe(src, canvasRef.current, setFailed), [src]);
    return <>
        <canvas ref={canvasRef} role="img" aria-label={alt} data-fit={fit}
            style={{ ...style, display: failed ? 'none' : undefined }} />
        {failed && <span style={{ color: '#64748b', fontSize: 12 }}>Stream belum tersedia. Menghubungkan ulang…</span>}
    </>;
}
"""Shared, bounded RTSP readers. Each reader retains only the newest frame."""
import json
import logging
import math
import os
import re
import struct
import threading
import time

import cv2
import numpy as np
from config.database import get_db_general_connection

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
cv2.setNumThreads(1)
FPS = max(1, min(20, int(os.getenv("CCTV_PREVIEW_FPS", "15"))))
WIDTH = max(320, min(1280, int(os.getenv("CCTV_PREVIEW_WIDTH", "640"))))
QUALITY = max(40, min(90, int(os.getenv("CCTV_JPEG_QUALITY", "72"))))
TIMEOUT_MS = 5000
STALE_SECONDS = 4
IDLE_SECONDS = 30
_stream_managers = {}
_manager_lock = threading.Lock()


class FramePacer:
    """Keep a stable FPS deadline without queuing missed frames."""
    def __init__(self, fps):
        self.period = 1 / fps
        self.deadline = None

    def due(self, now):
        if self.deadline is None:
            self.deadline = now + self.period
            return True
        if now + 1e-9 < self.deadline:
            return False
        periods = max(1, math.floor((now - self.deadline + 1e-9) / self.period) + 1)
        self.deadline += periods * self.period
        return True


def get_camera_infos(camera_ids, active_only=True):
    if not camera_ids:
        return {}
    conn = get_db_general_connection()
    try:
        with conn.cursor() as cursor:
            placeholders = ','.join(['%s'] * len(camera_ids))
            cursor.execute(
                f"SELECT id, camera_code, camera_name, station_slug, location, rtsp_url, is_active "
                f"FROM public.cctv_cameras WHERE id IN ({placeholders})" +
                (" AND is_active = 1" if active_only else ""), tuple(camera_ids))
            return {row['id']: row for row in cursor.fetchall()}
    finally:
        conn.close()


def get_camera_info_by_id(camera_id):
    return get_camera_infos([camera_id], active_only=False).get(camera_id)


def preview_url(url):
    # Hikvision: channel *01 = main, *02 = substream. Preserve credentials/query.
    if os.getenv("CCTV_PREFER_SUBSTREAM", "true").lower() not in ('1', 'true', 'yes'):
        return url
    return re.sub(r'(/(?:ISAPI/)?Streaming/Channels/\d+)01(?=/|\?|$)',
                  r'\g<1>02', url, flags=re.IGNORECASE)


def create_status_frame_bytes(title="CAMERA", subtitle="Connecting to RTSP..."):
    img = np.full((360, 640, 3), (15, 23, 42), dtype=np.uint8)
    cv2.putText(img, title[:50], (25, 70), cv2.FONT_HERSHEY_SIMPLEX, .7, (255, 255, 255), 2)
    cv2.putText(img, subtitle[:65], (25, 180), cv2.FONT_HERSHEY_SIMPLEX, .5, (148, 163, 184), 1)
    ok, jpeg = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
    return jpeg.tobytes() if ok else b''


def encode_preview(frame, width):
    if frame.shape[1] > width:
        height = max(1, round(frame.shape[0] * width / frame.shape[1]))
        frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
    ok, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
    return jpeg.tobytes() if ok else b''



import subprocess

class FFmpegCapture:
    def __init__(self, source):
        self.width, self.height = 1280, 720
        self.frame_size = self.width * self.height * 3
        command = [
            'ffmpeg', '-hide_banner', '-loglevel', 'error',
            '-hwaccel', 'cuda',
            '-rtsp_transport', 'tcp',
            '-timeout', '5000000',
            '-i', source,
            '-vf', f'scale={self.width}:{self.height}',
            '-f', 'image2pipe',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-r', '15',
            '-'
        ]
        self.pipe = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=10**8)

    def isOpened(self):
        return self.pipe.poll() is None

    def read(self):
        raw_image = self.pipe.stdout.read(self.frame_size)
        if len(raw_image) != self.frame_size:
            return False, None
        frame = np.frombuffer(raw_image, dtype='uint8').reshape((self.height, self.width, 3))
        return True, frame

    def get(self, prop):
        return 15.0

    def release(self):
        try:
            self.pipe.kill()
            self.pipe.wait(timeout=2)
        except:
            pass

class CameraStreamManager:
    def __init__(self, camera_info, preview=False):
        self.camera_id = camera_info['id']
        self.camera_name = camera_info['camera_name'] or f'Camera {self.camera_id}'
        self.rtsp_url = camera_info['rtsp_url']
        self.preview = preview
        self.running = True
        self.lock = threading.Lock()
        self.latest_jpeg = None
        self.latest_frame = None
        self.sequence = 0
        self.last_frame_at = 0
        self.last_used = time.monotonic()
        self.detail_sequence = -1
        self.detail_jpeg = None
        self.source_shape = None
        self.source_fps = None
        self.source_kind = 'substream' if preview and preview_url(self.rtsp_url) != self.rtsp_url else 'main'
        self.thread = threading.Thread(target=self._update_loop, daemon=True,
                                       name=f"cctv-{self.camera_id}")
        self.thread.start()

    def _update_loop(self):
        source = preview_url(self.rtsp_url) if self.preview else self.rtsp_url
        failures = 0
        while self.running and time.monotonic() - self.last_used < IDLE_SECONDS:
            cap = None
            try:
                cap = FFmpegCapture(source)
                if not cap.isOpened():
                    raise RuntimeError('RTSP open timed out')
                self.source_fps = cap.get(cv2.CAP_PROP_FPS) or None
                pacer = FramePacer(FPS)
                connected_at = time.monotonic()
                while self.running and time.monotonic() - self.last_used < IDLE_SECONDS:
                    ok, frame = cap.read()
                    if not ok or frame is None:
                        raise RuntimeError('RTSP frame read failed')
                    now = time.monotonic()
                    # Drain at source FPS; encode only at preview FPS. Sleeping
                    # after read lets old frames accumulate in the decoder.
                    if not pacer.due(now):
                        continue
                    jpeg = encode_preview(frame, WIDTH)
                    if not jpeg:
                        continue
                    with self.lock:
                        self.latest_jpeg = jpeg
                        self.latest_frame = frame
                        self.sequence += 1
                        self.last_frame_at = now
                        self.source_shape = [frame.shape[1], frame.shape[0]]
                    if now - connected_at > 10:
                        failures = 0
            except Exception as error:
                failures += 1
                logging.warning('[CCTV] Camera %s: %s; reconnecting', self.camera_id,
                                type(error).__name__)
                if source != self.rtsp_url and failures >= 2:
                    source = self.rtsp_url
                    self.source_kind = 'main-fallback'
            finally:
                if cap is not None:
                    cap.release()
            if self.running:
                time.sleep(min(3, max(1, failures)))
        self.running = False
        with self.lock:
            self.latest_frame = self.latest_jpeg = self.detail_jpeg = None

    def get_packet(self, detail=False):
        self.last_used = time.monotonic()
        with self.lock:
            age = time.monotonic() - self.last_frame_at
            live = self.latest_jpeg is not None and age < STALE_SECONDS
            status = 'live' if live else ('connecting' if not self.sequence else 'reconnecting')
            meta = {'camera_id': self.camera_id, 'sequence': self.sequence,
                    'status': status, 'age_ms': round(age * 1000) if self.last_frame_at else None}
            jpeg = self.latest_jpeg if live else b''
            frame = self.latest_frame if live and detail else None
            sequence = self.sequence
            cached_detail = self.detail_jpeg if self.detail_sequence == sequence else None
        if frame is not None:
            jpeg = cached_detail or encode_preview(frame, 1280)
            with self.lock:
                self.detail_sequence, self.detail_jpeg = sequence, jpeg
        return meta, jpeg

    def get_latest_jpeg(self):
        meta, jpeg = self.get_packet(detail=True)
        return jpeg or create_status_frame_bytes(self.camera_name, meta['status'])

    def get_latest_frame_mat(self):
        self.last_used = time.monotonic()
        with self.lock:
            if time.monotonic() - self.last_frame_at >= STALE_SECONDS:
                return None
            return self.latest_frame.copy() if self.latest_frame is not None else None


def get_stream_manager(camera_id, preview=False, camera_info=None):
    info = camera_info or get_camera_info_by_id(camera_id)
    if not info or info.get('is_active', 1) != 1 or not info.get('rtsp_url'):
        raise ValueError(f'Active camera {camera_id} not found')
    key = (info['rtsp_url'], preview)
    with _manager_lock:
        for old_key, old in list(_stream_managers.items()):
            if not old.running:
                del _stream_managers[old_key]
        manager = _stream_managers.get(key)
        if manager is None:
            manager = CameraStreamManager(info, preview)
            _stream_managers[key] = manager
        manager.last_used = time.monotonic()
        return manager


def frame_packet(meta, jpeg=b''):
    header = json.dumps({**meta, 'length': len(jpeg), 'sent_ms': round(time.monotonic() * 1000)},
                        separators=(',', ':')).encode('utf-8')
    return struct.pack('!I', len(header)) + header + jpeg


def generate_combined_stream(camera_ids, camera_infos, focus_id=None):
    managers = {cid: get_stream_manager(cid, preview=True, camera_info=camera_infos[cid])
                for cid in camera_ids if cid in camera_infos}
    last_sent = {}
    refresh_at = time.monotonic() + 5
    while True:
        started = time.monotonic()
        if started >= refresh_at:
            # Preserve target functionality: saved URL/activation edits reach existing viewers.
            # A transient DB outage keeps the last configuration until the next retry.
            try:
                updated = get_camera_infos(camera_ids)
                for cid in camera_ids:
                    info = updated.get(cid)
                    manager = managers.get(cid)
                    if info is None:
                        managers.pop(cid, None)
                    elif manager is None or manager.rtsp_url != info['rtsp_url']:
                        managers[cid] = get_stream_manager(cid, preview=True, camera_info=info)
                        last_sent.pop(cid, None)
                camera_infos = updated
            except Exception:
                logging.warning('[CCTV] Configuration refresh unavailable; retrying')
            refresh_at = started + 5
        for cid in camera_ids:
            manager = managers.get(cid)
            # An idle reader can finish closing just as a new viewer arrives.
            # Replace it in-place so that one camera cannot stay disconnected.
            if manager is not None and not manager.running:
                manager = get_stream_manager(cid, preview=True, camera_info=camera_infos[cid])
                managers[cid] = manager
            if manager is None:
                meta, jpeg = {'camera_id': cid, 'status': 'offline', 'sequence': 0}, b''
            else:
                meta, jpeg = manager.get_packet(detail=cid == focus_id)
                meta['camera_id'] = cid  # aliases can share a reader
            previous = last_sent.get(cid)
            state = (meta['sequence'], meta['status'])
            if previous and previous[0] == state and started - previous[1] < 1:
                continue
            # Heartbeats carry status only, never recycled stale video frames.
            if previous and previous[0] == state:
                jpeg = b''
            last_sent[cid] = (state, started)
            yield frame_packet(meta, jpeg)
        # Poll faster than producers so unrelated camera phases do not halve FPS.
        # No extra JPEGs are sent unless a camera's frame sequence has changed.
        time.sleep(max(.002, 1 / (FPS * 2) - (time.monotonic() - started)))


def stream_diagnostics():
    with _manager_lock:
        managers = list(_stream_managers.values())
    return [{'camera_id': m.camera_id, 'preview': m.preview, 'running': m.running,
             'sequence': m.sequence, 'source': m.source_kind, 'resolution': m.source_shape,
             'source_fps': m.source_fps, 'target_fps': FPS,
             'age_ms': round((time.monotonic() - m.last_frame_at) * 1000) if m.last_frame_at else None}
            for m in managers]


def get_camera_status(camera_id):
    """Keep the target's status endpoint; inspecting status never opens RTSP."""
    info = get_camera_info_by_id(camera_id)
    if not info:
        return {'camera_id': camera_id, 'status': 'config_error', 'message': 'Camera not found'}
    if info['is_active'] != 1:
        return {'camera_id': camera_id, 'status': 'disabled', 'message': 'Camera disabled'}
    with _manager_lock:
        manager = _stream_managers.get((info['rtsp_url'], True))
    if manager is None:
        return {'camera_id': camera_id, 'status': 'connecting', 'message': 'No active capture'}
    with manager.lock:
        age = time.monotonic() - manager.last_frame_at
        status = 'live' if manager.latest_jpeg and age < STALE_SECONDS else 'reconnecting'
    return {'camera_id': camera_id, 'status': status, 'age_ms': round(age * 1000),
            'message': '' if status == 'live' else 'Waiting for camera'}


def generate_mjpeg_stream_by_id(camera_id=1):
    manager = get_stream_manager(camera_id, preview=True)
    while True:
        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + manager.get_latest_jpeg() + b'\r\n'
        time.sleep(1 / FPS)


def capture_single_snapshot(camera_id=1):
    manager = get_stream_manager(camera_id)
    frame = manager.get_latest_frame_mat()
    if frame is None:
        return manager.get_latest_jpeg()
    ok, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return jpeg.tobytes() if ok else manager.get_latest_jpeg()

"""Shared RTSP sources; native video decoding runs outside the Flask process."""
import atexit
import logging
import os
import queue
import re
import shutil
import signal
import subprocess
import threading
import time
from datetime import datetime, timezone

import cv2
import numpy as np
from config.database import get_db_general_connection

log = logging.getLogger(__name__)
_sources = {}
_pool_lock = threading.Lock()
FFMPEG = os.getenv('SECURITY_FFMPEG', 'ffmpeg')
STALE_SECONDS = 10
IDLE_SECONDS = 30


def get_camera_info_by_id(camera_id):
    conn = None
    try:
        conn = get_db_general_connection()
        with conn.cursor() as cursor:
            cursor.execute('SELECT id, camera_name, location, rtsp_url, is_active FROM cctv_cameras WHERE id = %s', (camera_id,))
            return cursor.fetchone()
    finally:
        if conn is not None:
            conn.close()


def _camera(camera_id):
    row = get_camera_info_by_id(camera_id)
    if not row:
        raise ValueError('Camera not found')
    if not row['is_active']:
        raise ValueError('Camera disabled')
    if not (row.get('rtsp_url') or '').strip().startswith(('rtsp://', 'rtsps://')):
        raise ValueError('Invalid RTSP configuration')
    return row


def create_status_frame_bytes(title='CAMERA', subtitle='Connecting to RTSP...'):
    image = np.zeros((360, 640, 3), np.uint8)
    image[:] = (15, 23, 42)
    cv2.putText(image, 'CAMERA: ' + title[:40], (25, 40), 0, .6, (255, 255, 255), 1)
    for i in range(0, min(len(subtitle), 180), 65):
        cv2.putText(image, subtitle[i:i+65], (25, 150 + (i//65)*30), 0, .45, (180, 180, 220), 1)
    cv2.putText(image, datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'), (25, 330), 0, .45, (150, 150, 150), 1)
    ok, jpeg = cv2.imencode('.jpg', image)
    return jpeg.tobytes() if ok else b''


def _safe_error(line):
    text = line.decode('utf-8', errors='replace') if isinstance(line, bytes) else line
    text = re.sub(r'rtsps?://\S+', '[RTSP source]', text)
    return text.strip()[:240]


def _jpeg_reader(pipe, frames):
    buffer = bytearray()
    while True:
        chunk = pipe.read(65536)
        if not chunk:
            return
        buffer.extend(chunk)
        while True:
            start = buffer.find(b'\xff\xd8')
            end = buffer.find(b'\xff\xd9', max(start, 0) + 2)
            if start < 0 or end < 0:
                break
            jpeg = bytes(buffer[start:end+2])
            del buffer[:end+2]
            try:
                frames.put_nowait(jpeg)
            except queue.Full:
                try:
                    frames.get_nowait()
                except queue.Empty:
                    pass
                try:
                    frames.put_nowait(jpeg)
                except queue.Full:
                    pass
        if len(buffer) > 16 * 1024 * 1024:
            buffer.clear()


class CameraStreamManager:
    def __init__(self, url):
        self.url = url
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.jpeg = None
        self.last_frame = 0.0
        self.last_access = time.monotonic()
        self.error = 'Connecting to RTSP'
        self.process = None
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _errors(self, pipe):
        for line in iter(pipe.readline, b''):
            if line.strip():
                message = _safe_error(line)
                with self.lock:
                    self.error = message
                log.warning('[CCTV FFmpeg] %s', message)

    def _dispose(self, process):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=2)

    def _run(self):
        delay = 3
        while not self.stop_event.is_set():
            with self.lock:
                if time.monotonic() - self.last_access > IDLE_SECONDS:
                    break
            process = None
            readers = []
            try:
                if not shutil.which(FFMPEG):
                    raise RuntimeError('FFmpeg executable missing; install ffmpeg on server')
                # No shell; do not print argv because the input may contain credentials.
                process = subprocess.Popen([FFMPEG, '-hide_banner', '-loglevel', 'error',
                    '-nostdin', '-threads', '1', '-rtsp_transport', 'tcp', '-i', self.url, '-an',
                    '-r', '15', '-c:v', 'mjpeg', '-threads', '1', '-q:v', '3', '-f', 'image2pipe', 'pipe:1'],
                    stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                self.process = process
                frames = queue.Queue(maxsize=2)
                readers = [threading.Thread(target=_jpeg_reader, args=(process.stdout, frames), daemon=True),
                           threading.Thread(target=self._errors, args=(process.stderr,), daemon=True)]
                for reader in readers:
                    reader.start()
                deadline = time.monotonic() + 20
                while not self.stop_event.is_set():
                    with self.lock:
                        if time.monotonic() - self.last_access > IDLE_SECONDS:
                            self.stop_event.set()
                            break
                    try:
                        frame = frames.get(timeout=.5)
                    except queue.Empty:
                        if process.poll() is not None:
                            break
                        if time.monotonic() > deadline:
                            with self.lock:
                                self.error = 'No video frame received (timeout)'
                            break
                        continue
                    with self.lock:
                        self.jpeg = frame
                        self.last_frame = time.time()
                        self.error = ''
                    deadline = time.monotonic() + STALE_SECONDS
                    delay = 3
            except Exception as exc:
                with self.lock:
                    self.error = 'Capture process failed: ' + type(exc).__name__
                    if isinstance(exc, RuntimeError):
                        self.error = str(exc)
                log.warning('[CCTV] %s', self.error)
            finally:
                if process is not None:
                    self._dispose(process)
                    for reader in readers:
                        reader.join(timeout=2)
                    process.stdout.close()
                    process.stderr.close()
                self.process = None
                with self.lock:
                    self.jpeg = None
                    self.last_frame = 0.0
                    if not self.error:
                        self.error = 'Stream disconnected'
            if self.stop_event.wait(delay):
                break
            delay = min(30, delay * 2)

    def touch(self):
        with self.lock:
            self.last_access = time.monotonic()

    def get_latest_jpeg(self, title='CAMERA'):
        self.touch()
        with self.lock:
            if self.jpeg and time.time() - self.last_frame < STALE_SECONDS:
                return self.jpeg
            error = self.error or 'Connecting to RTSP'
        return create_status_frame_bytes(title, error)

    def get_latest_frame_mat(self):
        self.touch()
        with self.lock:
            jpeg = self.jpeg if time.time() - self.last_frame < STALE_SECONDS else None
        return cv2.imdecode(np.frombuffer(jpeg, np.uint8), cv2.IMREAD_COLOR) if jpeg else None

    def status(self):
        with self.lock:
            live = bool(self.jpeg) and time.time() - self.last_frame < STALE_SECONDS
            return {'status': 'live' if live else 'offline', 'last_frame_at': self.last_frame or None,
                    'message': '' if live else self.error}

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=6)


def _manager(row):
    key = row['rtsp_url'].strip()
    with _pool_lock:
        for url, old in list(_sources.items()):
            if not old.thread.is_alive():
                del _sources[url]
        manager = _sources.get(key)
        if manager is None or manager.stop_event.is_set():
            if manager is not None and manager.thread.is_alive():
                # Never overlap capture processes for the same URL while it exits.
                raise RuntimeError('RTSP source is stopping; retry shortly')
            manager = CameraStreamManager(key)
            _sources[key] = manager
        manager.touch()
        return manager


def get_stream_manager(camera_id):
    return _manager(_camera(camera_id))


def generate_mjpeg_stream_by_id(camera_id=1):
    row = None
    manager = None
    refresh_at = 0
    while True:
        if time.monotonic() >= refresh_at:
            try:
                row = _camera(camera_id)
                manager = _manager(row)
            except Exception:
                manager = None
                row = None
            refresh_at = time.monotonic() + 5
        jpeg = manager.get_latest_jpeg(row['camera_name']) if manager else create_status_frame_bytes(
            'Camera #' + str(camera_id), 'Camera disabled, unavailable, or configuration error')
        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg + b'\r\n'
        time.sleep(1/15)


def capture_single_snapshot(camera_id=1):
    row = _camera(camera_id)
    return _manager(row).get_latest_jpeg(row['camera_name'])


def get_camera_status(camera_id):
    row = get_camera_info_by_id(camera_id)
    if not row:
        return {'camera_id': camera_id, 'status': 'config_error', 'message': 'Camera not found'}
    if not row['is_active']:
        return {'camera_id': camera_id, 'status': 'disabled', 'message': 'Camera disabled'}
    with _pool_lock:
        manager = _sources.get((row.get('rtsp_url') or '').strip())
    state = manager.status() if manager else {'status': 'connecting', 'message': 'No active capture'}
    return {'camera_id': camera_id, **state}


def shutdown_streams():
    with _pool_lock:
        managers = list(_sources.values())
        _sources.clear()
    for manager in managers:
        manager.stop()


atexit.register(shutdown_streams)


def _terminate(signum, frame):
    shutdown_streams()
    raise SystemExit(0)


if threading.current_thread() is threading.main_thread():
    signal.signal(signal.SIGTERM, _terminate)

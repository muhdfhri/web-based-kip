from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass

import cv2
import numpy as np


logger = logging.getLogger(__name__)
os.environ.setdefault(
    "OPENCV_FFMPEG_CAPTURE_OPTIONS",
    "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay",
)


def _status_jpeg(title: str, status: str) -> bytes:
    image = np.full((720, 1280, 3), (248, 250, 252), dtype=np.uint8)
    cv2.rectangle(image, (16, 16), (1264, 704), (226, 232, 240), 3)
    cv2.putText(image, title.upper(), (60, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (15, 23, 42), 3)
    cv2.putText(image, status, (60, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (100, 116, 139), 2)
    cv2.putText(
        image,
        time.strftime("%Y-%m-%d %H:%M:%S"),
        (60, 650),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (100, 116, 139),
        2,
    )
    success, encoded = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return encoded.tobytes() if success else b""


@dataclass(frozen=True)
class CameraRuntimeStatus:
    connected: bool
    last_frame_at: float | None
    error: str | None


class RtspCameraWorker:
    """One RTSP connection and one latest-frame buffer per configured line."""

    def __init__(self, line_no: int, camera_name: str, rtsp_url: str) -> None:
        self.line_no = line_no
        self.camera_name = camera_name
        self._rtsp_url = rtsp_url
        self._lock = threading.RLock()
        self._latest_frame = None
        self._latest_jpeg = _status_jpeg(camera_name, "Camera is initializing")
        self._connected = False
        self._last_frame_at = None
        self._error = None
        self._stop_event = threading.Event()
        self._restart_event = threading.Event()
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()

    def reconfigure(self, camera_name: str, rtsp_url: str) -> None:
        with self._lock:
            changed = self.camera_name != camera_name or self._rtsp_url != rtsp_url
            self.camera_name = camera_name
            self._rtsp_url = rtsp_url
        if changed:
            self._restart_event.set()

    def stop(self) -> None:
        self._stop_event.set()
        self._restart_event.set()
        self._thread.join(timeout=3)

    def latest_frame(self):
        with self._lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None

    def latest_jpeg(self) -> bytes:
        with self._lock:
            return self._latest_jpeg

    def status(self) -> CameraRuntimeStatus:
        with self._lock:
            return CameraRuntimeStatus(self._connected, self._last_frame_at, self._error)

    def _capture_loop(self) -> None:
        while not self._stop_event.is_set():
            with self._lock:
                url = self._rtsp_url
                name = self.camera_name

            if not url:
                self._set_offline("RTSP URL is not configured")
                self._restart_event.wait(timeout=2)
                self._restart_event.clear()
                continue

            capture = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if not capture.isOpened():
                self._set_offline("Unable to open RTSP camera")
                capture.release()
                self._restart_event.wait(timeout=3)
                self._restart_event.clear()
                continue

            logger.info("FFB camera connected for line %s", self.line_no)
            self._restart_event.clear()
            while not self._stop_event.is_set() and not self._restart_event.is_set():
                success, frame = capture.read()
                if not success or frame is None:
                    self._set_offline("Frame read failed; reconnecting")
                    break

                success, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
                if success:
                    with self._lock:
                        self._latest_frame = frame
                        self._latest_jpeg = encoded.tobytes()
                        self._connected = True
                        self._last_frame_at = time.time()
                        self._error = None
                time.sleep(0.005)

            capture.release()
            time.sleep(0.5)

    def _set_offline(self, error: str) -> None:
        with self._lock:
            self._connected = False
            self._error = error
            self._latest_jpeg = _status_jpeg(self.camera_name, error)


class RtspStreamRegistry:
    def __init__(self) -> None:
        self._workers: dict[int, RtspCameraWorker] = {}
        self._lock = threading.RLock()

    def sync(self, config: dict) -> None:
        active_lines = {
            int(item["line_no"]): item
            for item in config.get("lines", [])
            if item.get("enabled")
        }
        with self._lock:
            for line_no in set(self._workers) - set(active_lines):
                self._workers.pop(line_no).stop()
            for line_no, line_config in active_lines.items():
                camera = line_config["camera"]
                if line_no not in self._workers:
                    self._workers[line_no] = RtspCameraWorker(
                        line_no,
                        camera["camera_name"],
                        camera["rtsp_url"],
                    )
                else:
                    self._workers[line_no].reconfigure(
                        camera["camera_name"], camera["rtsp_url"]
                    )

    def get(self, line_no: int) -> RtspCameraWorker | None:
        with self._lock:
            return self._workers.get(line_no)

    def generate_mjpeg(self, line_no: int):
        while True:
            worker = self.get(line_no)
            jpeg = worker.latest_jpeg() if worker else _status_jpeg(
                f"Sterilizer Line {line_no}", "Camera is disabled"
            )
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
            time.sleep(1 / 20)

    def statuses(self) -> dict[int, dict]:
        with self._lock:
            output = {}
            for line_no, worker in self._workers.items():
                status = worker.status()
                output[line_no] = {
                    "connected": status.connected,
                    "last_frame_at": status.last_frame_at,
                    "error": status.error,
                }
            return output


rtsp_registry = RtspStreamRegistry()


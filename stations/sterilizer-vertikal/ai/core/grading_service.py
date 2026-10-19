from __future__ import annotations

import logging
import threading
import time

from config.settings import grading_config_store
from core.decision_engine import majority_engine
from core.detector import ffb_detector
from core.event_publisher import event_publisher
from core.rtsp_streamer import rtsp_registry
from database.repository import grading_repository


logger = logging.getLogger(__name__)


class GradingRuntime:
    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread = None
        self._last_publish: dict[int, float] = {}
        self._config = grading_config_store.load()
        self._config_lock = threading.RLock()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        ffb_detector.load()
        rtsp_registry.sync(self._config)
        self._thread = threading.Thread(target=self._run, daemon=True, name="ffb-grading-runtime")
        self._thread.start()

    def reload_config(self, config: dict) -> None:
        with self._config_lock:
            self._config = config
            rtsp_registry.sync(config)

    def config(self) -> dict:
        with self._config_lock:
            return self._config

    def status(self) -> dict:
        return {
            "runtime_running": bool(self._thread and self._thread.is_alive()),
            "model_ready": ffb_detector.ready,
            "model_version": ffb_detector.model_version,
            "model_error": ffb_detector.error,
            "database_ready": grading_repository.health(),
            "cameras": rtsp_registry.statuses(),
        }

    def _run(self) -> None:
        while not self._stop_event.is_set():
            with self._config_lock:
                config = self._config
            target_fps = max(0.2, float(config["inference"]["target_fps"]))
            started_at = time.monotonic()
            for line in config["lines"]:
                if not line.get("enabled"):
                    continue
                self._process_line(line, config)
            elapsed = time.monotonic() - started_at
            self._stop_event.wait(max(0.01, (1 / target_fps) - elapsed))

    def _process_line(self, line: dict, config: dict) -> None:
        line_no = int(line["line_no"])
        camera_code = line["camera"]["camera_code"]
        worker = rtsp_registry.get(line_no)
        frame = worker.latest_frame() if worker else None
        if frame is None:
            self._publish_unavailable(line_no, camera_code, "CAMERA_OFFLINE", config)
            return
        if not ffb_detector.ready:
            self._publish_unavailable(line_no, camera_code, "MODEL_OFFLINE", config)
            return

        try:
            detections = ffb_detector.detect(frame, config)
            majority_engine.add(line_no, detections)
            grading_repository.insert_detections(
                line_no, camera_code, detections, ffb_detector.model_version
            )

            now = time.monotonic()
            publish_interval = float(config["decision"]["publish_interval_seconds"])
            if now - self._last_publish.get(line_no, 0) < publish_interval:
                return

            decision = majority_engine.decide(
                line_no, camera_code, config, ffb_detector.model_version
            )
            grading_repository.publish_decision(decision)
            event_publisher.publish({"event": "ai_grading_decision", **decision})
            self._last_publish[line_no] = now
        except Exception:
            logger.exception("FFB grading loop failed for line %s", line_no)

    def _publish_unavailable(
        self, line_no: int, camera_code: str, status: str, config: dict
    ) -> None:
        now = time.monotonic()
        publish_interval = float(config["decision"]["publish_interval_seconds"])
        if now - self._last_publish.get(line_no, 0) < publish_interval:
            return
        try:
            grading_repository.publish_runtime_status(
                line_no, camera_code, status, ffb_detector.model_version
            )
            self._last_publish[line_no] = now
        except Exception:
            logger.exception("Unable to publish %s for line %s", status, line_no)


grading_runtime = GradingRuntime()

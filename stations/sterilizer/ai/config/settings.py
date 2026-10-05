from __future__ import annotations

import json
import os
import threading
from copy import deepcopy
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


AI_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(AI_ROOT / ".env")


class Settings:
    PORT = int(os.getenv("PORT", "4105"))
    FLASK_ENV = os.getenv("FLASK_ENV", "production")

    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "mewah_sterilizer_ai")

    REDIS_URL = os.getenv("REDIS_URL", "")
    REDIS_CHANNEL = os.getenv("REDIS_CHANNEL", "mewah:sterilizer:ai_grading")

    MODEL_PATH = str((AI_ROOT / os.getenv("MODEL_PATH", "models/ffb_ripeness.pt")).resolve())
    MODEL_DEVICE = os.getenv("MODEL_DEVICE", "cpu")


class GradingConfigStore:
    """Thread-safe JSON configuration with a runtime override file."""

    def __init__(self) -> None:
        self._default_path = AI_ROOT / "config" / "grading_config.json"
        self._runtime_path = AI_ROOT / "config" / "grading_config.runtime.json"
        self._lock = threading.RLock()

    def load(self) -> dict[str, Any]:
        with self._lock:
            source = self._runtime_path if self._runtime_path.exists() else self._default_path
            with source.open("r", encoding="utf-8") as handle:
                return json.load(handle)

    def save(self, config: dict[str, Any]) -> dict[str, Any]:
        self.validate(config)
        with self._lock:
            temporary_path = self._runtime_path.with_suffix(".tmp")
            with temporary_path.open("w", encoding="utf-8") as handle:
                json.dump(config, handle, indent=2, ensure_ascii=False)
            temporary_path.replace(self._runtime_path)
            return deepcopy(config)

    @staticmethod
    def validate(config: dict[str, Any]) -> None:
        categories = config.get("categories", {})
        required_categories = {"ripe", "unripe", "overripe"}
        if set(categories) != required_categories:
            raise ValueError("categories must contain exactly ripe, unripe, and overripe")

        lines = config.get("lines")
        if not isinstance(lines, list) or not lines:
            raise ValueError("at least one line configuration is required")

        line_numbers = set()
        for line in lines:
            line_number = int(line.get("line_no", 0))
            if line_number < 1 or line_number in line_numbers:
                raise ValueError("line_no must be unique and greater than zero")
            line_numbers.add(line_number)
            if line.get("enabled") and not line.get("camera", {}).get("rtsp_url"):
                raise ValueError(f"enabled line {line_number} requires camera.rtsp_url")

        decision = config.get("decision", {})
        if int(decision.get("window_seconds", 0)) < 1:
            raise ValueError("decision.window_seconds must be greater than zero")
        if int(decision.get("minimum_detections", 0)) < 1:
            raise ValueError("decision.minimum_detections must be greater than zero")

        recipes = config.get("recipes", {})
        if set(recipes) != required_categories:
            raise ValueError("recipes must contain exactly ripe, unripe, and overripe")


grading_config_store = GradingConfigStore()


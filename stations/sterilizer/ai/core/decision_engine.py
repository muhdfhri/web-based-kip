from __future__ import annotations

from collections import Counter, defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any


class MajorityDecisionEngine:
    """Rolling-window majority calculation, isolated from PLC write logic."""

    def __init__(self) -> None:
        self._events: dict[int, deque] = defaultdict(deque)
        self._lock = RLock()

    def add(self, line_no: int, detections: list[dict[str, Any]], observed_at=None) -> None:
        timestamp = observed_at or datetime.now(timezone.utc)
        with self._lock:
            for detection in detections:
                self._events[line_no].append((timestamp, detection["category"]))

    def decide(
        self,
        line_no: int,
        camera_code: str,
        config: dict[str, Any],
        model_version: str,
        now=None,
    ) -> dict[str, Any]:
        decision_config = config["decision"]
        current_time = now or datetime.now(timezone.utc)
        window_start = current_time - timedelta(seconds=int(decision_config["window_seconds"]))

        with self._lock:
            events = self._events[line_no]
            while events and events[0][0] < window_start:
                events.popleft()
            counts = Counter(category for _, category in events)

        category_counts = {
            "ripe": int(counts.get("ripe", 0)),
            "unripe": int(counts.get("unripe", 0)),
            "overripe": int(counts.get("overripe", 0)),
        }
        total = sum(category_counts.values())
        minimum = int(decision_config["minimum_detections"])

        if total < minimum:
            majority = "INSUFFICIENT_DATA"
            majority_percentage = 0.0
            recipe = {}
            status = "INSUFFICIENT_DATA"
        else:
            priority = decision_config["tie_break_priority"]
            majority_key = max(priority, key=lambda key: (category_counts[key], -priority.index(key)))
            majority = majority_key.upper()
            majority_percentage = round(category_counts[majority_key] / total * 100, 3)
            recipe = config["recipes"][majority_key]
            status = "READY"

        return {
            "line_no": line_no,
            "camera_code": camera_code,
            "window_started_at": window_start.replace(tzinfo=None),
            "window_ended_at": current_time.replace(tzinfo=None),
            "ripe_count": category_counts["ripe"],
            "unripe_count": category_counts["unripe"],
            "overripe_count": category_counts["overripe"],
            "total_count": total,
            "majority_category": majority,
            "majority_percentage": majority_percentage,
            "recommended_recipe_code": recipe.get("recipe_code"),
            "recommended_recipe_name": recipe.get("recipe_name"),
            "recipe_parameters": recipe.get("parameters"),
            "decision_status": status,
            "model_version": model_version,
        }


majority_engine = MajorityDecisionEngine()


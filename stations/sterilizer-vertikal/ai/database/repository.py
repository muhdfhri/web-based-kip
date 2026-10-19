from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

import pymysql
from pymysql.cursors import DictCursor

from config.settings import Settings


logger = logging.getLogger(__name__)


class GradingRepository:
    """Persistence boundary. AI writes; the Sterilizer service only needs the view."""

    def _connect(self):
        return pymysql.connect(
            host=Settings.DB_HOST,
            port=Settings.DB_PORT,
            user=Settings.DB_USER,
            password=Settings.DB_PASSWORD,
            database=Settings.DB_NAME,
            cursorclass=DictCursor,
            autocommit=True,
            connect_timeout=3,
        )

    def health(self) -> bool:
        try:
            with self._connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
            return True
        except Exception as error:
            logger.warning("AI grading database unavailable: %s", error)
            return False

    def insert_detections(
        self,
        line_no: int,
        camera_code: str,
        detections: Iterable[dict[str, Any]],
        model_version: str,
    ) -> None:
        rows = [
            (
                line_no,
                camera_code,
                item["category"].upper(),
                float(item["confidence"]),
                json.dumps(item.get("bounding_box")),
                model_version,
            )
            for item in detections
        ]
        if not rows:
            return

        sql = """
            INSERT INTO ai_grading_detections
              (line_no, camera_code, category, confidence, bounding_box_json, model_version)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.executemany(sql, rows)

    def publish_decision(self, decision: dict[str, Any]) -> None:
        history_sql = """
            INSERT INTO ai_grading_decision_history
              (line_no, camera_code, window_started_at, window_ended_at,
               ripe_count, unripe_count, overripe_count, total_count,
               majority_category, majority_percentage, recommended_recipe_code,
               recommended_recipe_name, recipe_parameters_json, model_version)
            VALUES
              (%(line_no)s, %(camera_code)s, %(window_started_at)s, %(window_ended_at)s,
               %(ripe_count)s, %(unripe_count)s, %(overripe_count)s, %(total_count)s,
               %(majority_category)s, %(majority_percentage)s, %(recommended_recipe_code)s,
               %(recommended_recipe_name)s, %(recipe_parameters_json)s, %(model_version)s)
        """
        result_sql = """
            INSERT INTO ai_grading_line_results
              (line_no, camera_code, window_started_at, window_ended_at,
               ripe_count, unripe_count, overripe_count, total_count,
               majority_category, majority_percentage, recommended_recipe_code,
               recommended_recipe_name, recipe_parameters_json, decision_status,
               model_version, result_version)
            VALUES
              (%(line_no)s, %(camera_code)s, %(window_started_at)s, %(window_ended_at)s,
               %(ripe_count)s, %(unripe_count)s, %(overripe_count)s, %(total_count)s,
               %(majority_category)s, %(majority_percentage)s, %(recommended_recipe_code)s,
               %(recommended_recipe_name)s, %(recipe_parameters_json)s, %(decision_status)s,
               %(model_version)s, 1)
            ON DUPLICATE KEY UPDATE
              camera_code = VALUES(camera_code),
              window_started_at = VALUES(window_started_at),
              window_ended_at = VALUES(window_ended_at),
              ripe_count = VALUES(ripe_count),
              unripe_count = VALUES(unripe_count),
              overripe_count = VALUES(overripe_count),
              total_count = VALUES(total_count),
              majority_category = VALUES(majority_category),
              majority_percentage = VALUES(majority_percentage),
              recommended_recipe_code = VALUES(recommended_recipe_code),
              recommended_recipe_name = VALUES(recommended_recipe_name),
              recipe_parameters_json = VALUES(recipe_parameters_json),
              decision_status = VALUES(decision_status),
              model_version = VALUES(model_version),
              result_version = result_version + 1
        """
        payload = dict(decision)
        payload["recipe_parameters_json"] = json.dumps(decision.get("recipe_parameters"))
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(history_sql, payload)
                cursor.execute(result_sql, payload)

    def publish_runtime_status(
        self,
        line_no: int,
        camera_code: str,
        status: str,
        model_version: str,
    ) -> None:
        """Invalidate a previously READY row when camera or model is unavailable."""
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        sql = """
            INSERT INTO ai_grading_line_results
              (line_no, camera_code, window_started_at, window_ended_at,
               majority_category, decision_status, model_version, result_version)
            VALUES (%s, %s, %s, %s, 'INSUFFICIENT_DATA', %s, %s, 1)
            ON DUPLICATE KEY UPDATE
              camera_code = VALUES(camera_code),
              window_ended_at = VALUES(window_ended_at),
              majority_category = 'INSUFFICIENT_DATA',
              majority_percentage = 0,
              recommended_recipe_code = NULL,
              recommended_recipe_name = NULL,
              recipe_parameters_json = NULL,
              decision_status = VALUES(decision_status),
              model_version = VALUES(model_version),
              result_version = result_version + 1
        """
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (line_no, camera_code, now, now, status, model_version))

    def get_current_result(self, line_no: int) -> dict[str, Any] | None:
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT * FROM ai_grading_line_results WHERE line_no = %s",
                    (line_no,),
                )
                row = cursor.fetchone()
        return self._serialize(row)

    def get_stats(self, line_no: int, period: str) -> dict[str, int]:
        period_hours = {"DAY": 24, "WEEK": 24 * 7, "MONTH": 24 * 30}
        since = datetime.now(timezone.utc) - timedelta(hours=period_hours.get(period, 24))
        sql = """
            SELECT category, COUNT(*) AS count
            FROM ai_grading_detections
            WHERE line_no = %s AND detected_at >= %s
            GROUP BY category
        """
        counts = {"ripe": 0, "unripe": 0, "overripe": 0}
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, (line_no, since.replace(tzinfo=None)))
                for row in cursor.fetchall():
                    counts[row["category"].lower()] = int(row["count"])
        return counts

    def get_metrics(self, line_no: int, period: str) -> dict[str, float]:
        period_hours = {"DAY": 24, "WEEK": 24 * 7, "MONTH": 24 * 30}
        since = datetime.now(timezone.utc) - timedelta(hours=period_hours.get(period, 24))
        one_minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
        sql = """
            SELECT
              COALESCE(AVG(CASE WHEN detected_at >= %s THEN confidence END), 0) AS average_confidence,
              COALESCE(SUM(CASE WHEN detected_at >= %s THEN 1 ELSE 0 END), 0) AS detections_per_minute
            FROM ai_grading_detections
            WHERE line_no = %s AND detected_at >= %s
        """
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql,
                    (
                        since.replace(tzinfo=None),
                        one_minute_ago.replace(tzinfo=None),
                        line_no,
                        since.replace(tzinfo=None),
                    ),
                )
                row = cursor.fetchone() or {}
        return {
            "average_confidence": round(float(row.get("average_confidence") or 0) * 100, 2),
            "detections_per_minute": int(row.get("detections_per_minute") or 0),
        }

    @staticmethod
    def _serialize(row: dict[str, Any] | None) -> dict[str, Any] | None:
        if row is None:
            return None
        output = dict(row)
        for key, value in output.items():
            if isinstance(value, datetime):
                output[key] = value.isoformat()
        recipe_json = output.pop("recipe_parameters_json", None)
        output["recipe_parameters"] = json.loads(recipe_json) if recipe_json else None
        for key, value in list(output.items()):
            if hasattr(value, "__float__") and not isinstance(value, (int, float)):
                output[key] = float(value)
        return output


grading_repository = GradingRepository()

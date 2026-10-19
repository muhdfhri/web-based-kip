from __future__ import annotations

from copy import deepcopy

from flask import Blueprint, Response, jsonify, request

from config.settings import grading_config_store
from core.grading_service import grading_runtime
from core.rtsp_streamer import rtsp_registry
from database.repository import grading_repository


api_blueprint = Blueprint("sterilizer_ai_grading", __name__, url_prefix="/api/sterilizer-ai")


def _public_config(config: dict) -> dict:
    public = deepcopy(config)
    for line in public.get("lines", []):
        url = line.get("camera", {}).get("rtsp_url", "")
        line["camera"]["rtsp_configured"] = bool(url)
        line["camera"]["rtsp_url"] = "***configured***" if url else ""
    return public


@api_blueprint.get("/health")
def health():
    return jsonify({"service": "sterilizer-ai-grading", **grading_runtime.status()})


@api_blueprint.get("/stream")
def stream():
    line_no = request.args.get("line_no", default=1, type=int)
    return Response(
        rtsp_registry.generate_mjpeg(line_no),
        mimetype="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@api_blueprint.get("/snapshot")
def snapshot():
    line_no = request.args.get("line_no", default=1, type=int)
    worker = rtsp_registry.get(line_no)
    if worker is None:
        return jsonify({"success": False, "message": "line camera is disabled"}), 404
    return Response(worker.latest_jpeg(), mimetype="image/jpeg")


@api_blueprint.get("/stats")
def stats():
    line_no = request.args.get("line_no", default=1, type=int)
    period = request.args.get("period", default="DAY").upper()
    if period not in {"DAY", "WEEK", "MONTH"}:
        return jsonify({"success": False, "message": "invalid period"}), 400
    try:
        return jsonify({
            "success": True,
            "line_no": line_no,
            "period": period,
            "counts": grading_repository.get_stats(line_no, period),
            "metrics": grading_repository.get_metrics(line_no, period),
        })
    except Exception as error:
        return jsonify({
            "success": False,
            "message": str(error),
            "line_no": line_no,
            "period": period,
            "counts": {"ripe": 0, "unripe": 0, "overripe": 0},
            "metrics": {"average_confidence": 0, "detections_per_minute": 0},
        })


@api_blueprint.get("/current")
def current():
    line_no = request.args.get("line_no", default=1, type=int)
    try:
        result = grading_repository.get_current_result(line_no)
        return jsonify({"success": True, "data": result})
    except Exception as error:
        return jsonify({"success": False, "message": str(error), "data": None})


@api_blueprint.get("/config")
def get_config():
    return jsonify({"success": True, "data": _public_config(grading_runtime.config())})


@api_blueprint.put("/config")
def update_config():
    payload = request.get_json(silent=True) or {}
    try:
        existing = grading_runtime.config()
        # Masked values mean the caller did not change the stored RTSP credential.
        for incoming_line in payload.get("lines", []):
            if incoming_line.get("camera", {}).get("rtsp_url") == "***configured***":
                line_no = int(incoming_line["line_no"])
                existing_line = next(item for item in existing["lines"] if int(item["line_no"]) == line_no)
                incoming_line["camera"]["rtsp_url"] = existing_line["camera"]["rtsp_url"]
        saved = grading_config_store.save(payload)
        grading_runtime.reload_config(saved)
        return jsonify({"success": True, "data": _public_config(saved)})
    except (ValueError, KeyError, StopIteration) as error:
        return jsonify({"success": False, "message": str(error)}), 400

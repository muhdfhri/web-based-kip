from flask import Blueprint, Response, jsonify, request
from core.rtsp_streamer import (generate_mjpeg_stream_by_id, capture_single_snapshot,
                               get_camera_status, get_camera_info_by_id)

stream_bp = Blueprint('stream_bp', __name__)


def _id():
    value = int(request.args.get('camera_id', '1'))
    if value <= 0:
        raise ValueError('Invalid camera_id')
    return value


@stream_bp.route('/api/security-ai/stream')
def get_video_stream():
    try:
        camera_id = _id()
        row = get_camera_info_by_id(camera_id)
        if not row:
            return jsonify(success=False, message='Camera not found'), 404
        if not row['is_active']:
            return jsonify(success=False, message='Camera disabled'), 409
    except ValueError:
        return jsonify(success=False, message='Invalid camera_id'), 400
    except Exception:
        return jsonify(success=False, message='Camera database unavailable'), 503
    response = Response(generate_mjpeg_stream_by_id(camera_id),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['X-Accel-Buffering'] = 'no'
    return response


@stream_bp.route('/api/security-ai/status')
def get_status():
    try:
        if 'camera_id' in request.args:
            data = get_camera_status(_id())
        else:
            # Existing cameras only, without starting any capture process.
            from config.database import get_db_general_connection
            conn = get_db_general_connection()
            try:
                with conn.cursor() as cursor:
                    cursor.execute('SELECT id FROM cctv_cameras ORDER BY id')
                    ids = [row['id'] for row in cursor.fetchall()]
            finally:
                conn.close()
            data = [get_camera_status(camera_id) for camera_id in ids]
        return jsonify(success=True, data=data)
    except ValueError:
        return jsonify(success=False, message='Invalid camera_id'), 400
    except Exception:
        return jsonify(success=False, message='Camera database unavailable'), 503


@stream_bp.route('/api/security-ai/snapshot')
def get_snapshot():
    try:
        return Response(capture_single_snapshot(_id()), mimetype='image/jpeg')
    except ValueError:
        return jsonify(success=False, message='Invalid, missing or disabled camera'), 400
    except Exception:
        return jsonify(success=False, message='Camera unavailable'), 503

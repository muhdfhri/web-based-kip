# ═══════════════════════════════════════════════════════════════════════
# REST API ROUTES: VIDEO STREAMING & SNAPSHOT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

from flask import Blueprint, Response, jsonify, request
from core.rtsp_streamer import generate_mjpeg_stream_by_id, capture_single_snapshot

stream_bp = Blueprint('stream_bp', __name__)

@stream_bp.route('/api/security-ai/stream', methods=['GET'])
def get_video_stream():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: ENDPOINT MJPEG STREAM UNTUK TAB CCTV FEED FRONTEND
    
    Penggunaan di React UI:
    <img src="/api/security-ai/stream?camera_id=1" />
    """
    camera_id = request.args.get('camera_id', type=int, default=1)
    
    response = Response(
        generate_mjpeg_stream_by_id(camera_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['X-Accel-Buffering'] = 'no'
    return response

@stream_bp.route('/api/security-ai/snapshot', methods=['GET'])
def get_snapshot():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: ENDPOINT TANGKAP 1 FOTO SNAPSHOT SINGLE FRAME
    """
    camera_id = request.args.get('camera_id', type=int, default=1)
    snapshot_bytes = capture_single_snapshot(camera_id)
    
    return Response(
        snapshot_bytes,
        mimetype='image/jpeg'
    )

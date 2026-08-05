# ═══════════════════════════════════════════════════════════════════════
# REST API ROUTES: CCTV CONFIGURATIONS & SETTINGS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

from flask import Blueprint, jsonify, request
from config.database import get_db_ai_connection

config_bp = Blueprint('config_bp', __name__)

@config_bp.route('/api/security-ai/config/cameras', methods=['GET'])
def get_cctv_configs():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: MENGAMBIL DAFTAR LINK RTSP MENTAH KAMERA CCTV DARI DATABASE AI
    """
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_cctv_configs WHERE is_active = 1")
            cameras = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": cameras})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@config_bp.route('/api/security-ai/config/cameras', methods=['POST'])
def add_or_update_cctv_config():
    """
    // ISI DISINI UNTUK LOGIC A I U E O: MENAMBAH ATAU MENGUBAH TARGET LINK RTSP MENTAH KETIKA OPERATOR MENGINPUT DI SISI "UMUM"
    """
    data = request.json or {}
    camera_code = data.get('camera_code')
    camera_name = data.get('camera_name', 'CCTV Pos Security')
    station_slug = data.get('station_slug', 'security')
    rtsp_url = data.get('rtsp_url')
    
    if not camera_code or not rtsp_url:
        return jsonify({"success": False, "message": "camera_code dan rtsp_url wajib diisi"}), 400
        
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO security_ai_cctv_configs (camera_code, camera_name, station_slug, rtsp_url)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    camera_name = VALUES(camera_name),
                    station_slug = VALUES(station_slug),
                    rtsp_url = VALUES(rtsp_url)
            """
            cursor.execute(sql, (camera_code, camera_name, station_slug, rtsp_url))
        conn.close()
        return jsonify({"success": True, "message": "Konfigurasi kamera RTSP berhasil diperbarui"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

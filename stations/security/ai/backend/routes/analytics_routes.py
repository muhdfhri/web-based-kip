# ═══════════════════════════════════════════════════════════════════════
# REST API ROUTES: AI ANALYTICS FOR 5 VISION FEATURES & RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════════════════

from flask import Blueprint, jsonify, request
from config.database import get_db_ai_connection

analytics_bp = Blueprint('analytics_bp', __name__)

@analytics_bp.route('/api/security-ai/analytics/apd', methods=['GET'])
def get_apd_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI APD"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_apd_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/fire', methods=['GET'])
def get_fire_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI FIRE"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_fire_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/human', methods=['GET'])
def get_human_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI HUMAN TRESPASSER"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_human_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/lpr', methods=['GET'])
def get_lpr_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI LPR OCR PLAT NOMOR"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_lpr_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/analytics/oildispatch', methods=['GET'])
def get_oildispatch_analytics():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET LOG TELEMETRI OIL DISPATCHING"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_oildispatch_logs ORDER BY id DESC LIMIT 50")
            logs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": logs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@analytics_bp.route('/api/security-ai/recommendations', methods=['GET'])
def get_ai_recommendations():
    """// ISI DISINI UNTUK LOGIC A I U E O: GET DAFTAR REKOMENDASI KEPUTUSAN AI (DSS)"""
    try:
        conn = get_db_ai_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM security_ai_recommendations ORDER BY id DESC LIMIT 20")
            recs = cursor.fetchall()
        conn.close()
        return jsonify({"success": True, "data": recs})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

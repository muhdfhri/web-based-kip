# ═══════════════════════════════════════════════════════════════════════
# CORE MODULE: HIGH-PERFORMANCE THREADED RTSP STREAMER (ZERO-LATENCY)
# ═══════════════════════════════════════════════════════════════════════

import os
import time
import threading
import logging
import cv2
import numpy as np
from config.settings import Config
from config.database import get_db_general_connection

logging.basicConfig(level=logging.INFO)

# Optimize FFmpeg capture options for low delay and zero buffering
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"

def get_camera_info_by_id(camera_id):
    """
    Membaca camera_name, location, dan rtsp_url mentah dari database `mewah_security.cctv_cameras`
    """
    try:
        conn = get_db_general_connection()
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, camera_name, location, rtsp_url FROM cctv_cameras WHERE id = %s AND is_active = 1", 
                (camera_id,)
            )
            result = cursor.fetchone()
        conn.close()
        return result
    except Exception as e:
        logging.error(f"[ThreadedRTSP] Error reading cctv_cameras table: {e}")
        return None

def create_status_frame_bytes(title="LIVE CAMERA", subtitle="Connecting to RTSP..."):
    """
    Membuat valid JPEG image frame sintetis menggunakan OpenCV sebagai fallback
    sehingga tag <img> pada Web Browser TIDAK PERNAH error atau blank.
    """
    height, width = 360, 640
    img = np.zeros((height, width, 3), np.uint8)
    img[:] = (15, 23, 42) # Hex #0f172a (Dark Slate)
    
    cv2.rectangle(img, (10, 10), (width - 10, height - 10), (51, 65, 85), 2)
    cv2.circle(img, (30, 35), 8, (0, 255, 0), -1) # Green Live dot
    
    timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC")
    cv2.putText(img, f"LIVE: {title.upper()}", (48, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    cv2.putText(img, f"STATUS: {subtitle}", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (148, 163, 184), 1)
    cv2.putText(img, timestamp_str, (30, 330), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 116, 139), 1)
    
    ret, jpeg = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    return jpeg.tobytes() if ret else b''

class CameraStreamManager:
    """
    Class Background Worker Thread per Camera ID:
    - Hanya 1 Thread per kamera yang membuka koneksi RTSP ke IP Camera
    - Terus-menerus mengosongkan FFmpeg buffer agar video selalu Zero-Latency (Realtime)
    - Menyediakan shared JPEG buffer berkuantiitas tinggi untuk HTTP Web Stream & AI Vision
    """
    def __init__(self, camera_id):
        self.camera_id = camera_id
        self.running = True
        self.lock = threading.Lock()
        self.latest_jpeg = None
        self.latest_frame = None
        self.camera_name = f"Camera #{camera_id}"
        self.rtsp_url = Config.DEFAULT_RTSP_URL
        self.thread = threading.Thread(target=self._update_loop, daemon=True)
        self.thread.start()

    def _update_loop(self):
        logging.info(f"[ThreadedRTSP] Background Worker started for Camera ID {self.camera_id}")
        
        while self.running:
            # Re-sync info kamera dari DB setiap siklus reconnect
            cam_info = get_camera_info_by_id(self.camera_id)
            if cam_info:
                self.camera_name = cam_info['camera_name']
                self.rtsp_url = cam_info['rtsp_url']
            
            logging.info(f"[ThreadedRTSP] Opening VideoCapture for '{self.camera_name}' (URL: {self.rtsp_url[:45]}...)")
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            
            # Optimasi buffer size ke 1 frame untuk 0.0s delay
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not cap.isOpened():
                logging.warning(f"[ThreadedRTSP] Cannot open RTSP URL for Camera ID {self.camera_id}. Retrying in 3s...")
                with self.lock:
                    self.latest_jpeg = create_status_frame_bytes(self.camera_name, "RTSP Connecting...")
                time.sleep(3.0)
                continue

            last_read_time = time.time()
            
            while self.running and cap.isOpened():
                success, frame = cap.read()
                if not success or frame is None:
                    logging.warning(f"[ThreadedRTSP] Frame read failed for Camera ID {self.camera_id}. Reconnecting...")
                    break

                last_read_time = time.time()
                
                # Encode ke High Quality JPEG (Quality = 92)
                ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
                if ret:
                    jpeg_bytes = buffer.tobytes()
                    with self.lock:
                        self.latest_frame = frame
                        self.latest_jpeg = jpeg_bytes
                
                # Waktu jeda sangat minim (mengikuti native FPS camera)
                time.sleep(0.015)

            cap.release()
            time.sleep(1.0)

    def get_latest_jpeg(self):
        with self.lock:
            if self.latest_jpeg:
                return self.latest_jpeg
            return create_status_frame_bytes(self.camera_name, "Initializing Stream...")

    def get_latest_frame_mat(self):
        """
        Mengembalikan OpenCV Frame Matrix murni untuk diolah oleh AI Vision Detectors
        """
        with self.lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

# Singleton Pool Stream Manager per Camera ID
_stream_managers = {}
_manager_lock = threading.Lock()

def get_stream_manager(camera_id):
    with _manager_lock:
        if camera_id not in _stream_managers:
            _stream_managers[camera_id] = CameraStreamManager(camera_id)
        return _stream_managers[camera_id]

def generate_mjpeg_stream_by_id(camera_id=1):
    """
    Generator HTTP MJPEG Streamer:
    Mengambil frame JPEG dari Background Stream Manager secara instant tanpa blocking
    """
    manager = get_stream_manager(camera_id)
    
    while True:
        jpeg_bytes = manager.get_latest_jpeg()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes + b'\r\n')
        # Stream pada native frame rate (~25-30 FPS)
        time.sleep(0.033)

def capture_single_snapshot(camera_id=1):
    """
    Tangkap 1 snapshot foto resolusi tinggi
    """
    manager = get_stream_manager(camera_id)
    return manager.get_latest_jpeg()

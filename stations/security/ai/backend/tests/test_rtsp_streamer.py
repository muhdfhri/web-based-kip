import struct
import threading
import time
import unittest
from unittest.mock import patch
from core import rtsp_streamer as streams


class StreamRegressionTests(unittest.TestCase):
    def test_status_inspection_does_not_start_disabled_or_idle_camera(self):
        row = {'id': 1, 'is_active': 0, 'rtsp_url': 'rtsp://example/test'}
        with patch.object(streams, 'get_camera_info_by_id', return_value=row), \
                patch.object(streams, 'CameraStreamManager') as capture:
            self.assertEqual(streams.get_camera_status(1)['status'], 'disabled')
            row['is_active'] = 1
            self.assertEqual(streams.get_camera_status(1)['status'], 'connecting')
            capture.assert_not_called()

    def test_combined_stream_applies_saved_url_and_disabled_changes(self):
        import json
        clock = [0]
        infos = {cid: {'id': cid, 'rtsp_url': f'rtsp://example/old{cid}'} for cid in (1, 2)}
        updated = {2: {'id': 2, 'rtsp_url': 'rtsp://example/new2'}}
        class Reader:
            running = True
            def __init__(self, cid, info): self.cid, self.rtsp_url = cid, info['rtsp_url']
            def get_packet(self, detail=False):
                return {'camera_id': self.cid, 'sequence': 1, 'status': 'live'}, self.rtsp_url.encode()
        def decoded(data):
            size = struct.unpack('!I', data[:4])[0]
            return json.loads(data[4:4 + size]), data[4 + size:]
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kw: Reader(cid, kw['camera_info'])), \
                patch.object(streams, 'get_camera_infos', return_value=updated), \
                patch.object(streams.time, 'monotonic', side_effect=lambda: clock[0]), \
                patch.object(streams.time, 'sleep'):
            generator = streams.generate_combined_stream([1, 2], infos)
            next(generator); next(generator)
            clock[0] = 6
            self.assertEqual(decoded(next(generator))[0]['status'], 'offline')
            self.assertEqual(decoded(next(generator))[1], b'rtsp://example/new2')
            generator.close()

    def test_existing_stream_endpoint_validates_disabled_camera(self):
        from flask import Flask
        from routes.stream_routes import stream_bp
        app = Flask(__name__)
        app.register_blueprint(stream_bp)
        client = app.test_client()
        self.assertEqual(client.get('/api/security-ai/stream?camera_id=bad').status_code, 400)
        self.assertEqual(client.get('/api/security-ai/live?ids=1,-2').status_code, 400)
        with patch('routes.stream_routes.get_camera_info_by_id', return_value={'is_active': 0}):
            self.assertEqual(client.get('/api/security-ai/stream?camera_id=1').status_code, 409)

    def test_pacer_preserves_target_rate_for_19_and_20_fps_sources(self):
        for source_fps in (19, 20, 25, 30):
            pacer = streams.FramePacer(15)
            frames = sum(pacer.due(i / source_fps) for i in range(source_fps * 40))
            self.assertLessEqual(abs(frames - 600), 1, source_fps)

    def test_pacer_skips_missed_deadlines_after_a_stall(self):
        pacer = streams.FramePacer(15)
        self.assertTrue(pacer.due(0))
        self.assertTrue(pacer.due(10))
        self.assertFalse(pacer.due(10))
        self.assertFalse(pacer.due(10.01))
        self.assertLessEqual(pacer.deadline - 10, 1 / 15 + 1e-9)

    def test_snapshot_keeps_main_stream_resolution(self):
        import numpy as np
        frame = np.zeros((1440, 2560, 3), dtype=np.uint8)
        class Reader:
            def get_latest_frame_mat(self): return frame
        with patch.object(streams, 'get_stream_manager', return_value=Reader()):
            jpeg = streams.capture_single_snapshot(1)
        decoded = streams.cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), streams.cv2.IMREAD_COLOR)
        self.assertEqual(decoded.shape, frame.shape)

    def test_substream_preserves_channel_and_credentials(self):
        for channel in (1, 6, 10, 16):
            main = f'rtsp://user:pass@192.0.2.1/Streaming/Channels/{channel}01?foo=bar'
            self.assertEqual(streams.preview_url(main), main.replace(f'{channel}01?', f'{channel}02?'))
        self.assertEqual(streams.preview_url('rtsp://example/other'), 'rtsp://example/other')

    def test_stale_frame_is_not_reported_live_or_recycled(self):
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.lock = threading.Lock()
        manager.last_frame_at = time.monotonic() - 10
        manager.latest_jpeg = b'old-frame'
        manager.latest_frame = None
        manager.sequence = 9
        manager.detail_sequence = -1
        manager.detail_jpeg = None
        meta, jpeg = manager.get_packet()
        self.assertEqual(meta['status'], 'reconnecting')
        self.assertEqual(jpeg, b'')
        self.assertIsNone(manager.get_latest_frame_mat())

    def test_one_broken_camera_does_not_block_remaining_15(self):
        class Reader:
            running = True
            def __init__(self, cid): self.cid = cid
            def get_packet(self, detail=False):
                return {'camera_id': self.cid, 'sequence': 1, 'status': 'live'}, b'jpeg'
        ids = list(range(1, 17))
        infos = {cid: {'id': cid} for cid in ids if cid != 7}
        with patch.object(streams, 'get_stream_manager', side_effect=lambda cid, **kwargs: Reader(cid)):
            generator = streams.generate_combined_stream(ids, infos)
            import json
            received = []
            for _ in ids:
                data = next(generator)
                size = struct.unpack('!I', data[:4])[0]
                received.append(json.loads(data[4:4 + size]))
            generator.close()
        self.assertEqual([m['camera_id'] for m in received], ids)
        self.assertEqual(received[6]['status'], 'offline')
        self.assertEqual(sum(m['status'] == 'live' for m in received), 15)

    def test_reader_that_finishes_idle_shutdown_is_replaced(self):
        class Reader:
            def __init__(self, running): self.running = running
            def get_packet(self, detail=False):
                return {'camera_id': 1, 'sequence': 1, 'status': 'live'}, b'new'
        dead, replacement = Reader(False), Reader(True)
        with patch.object(streams, 'get_stream_manager', side_effect=[dead, replacement]) as lookup:
            generator = streams.generate_combined_stream([1], {1: {'id': 1}})
            self.assertTrue(next(generator).endswith(b'new'))
            self.assertEqual(lookup.call_count, 2)
            generator.close()

    def test_capture_released_after_failure_and_idle_reader_stops(self):
        class BrokenCapture:
            released = False
            def isOpened(self): return False
            def release(self): self.released = True
        capture = BrokenCapture()
        manager = streams.CameraStreamManager.__new__(streams.CameraStreamManager)
        manager.camera_id = 1
        manager.rtsp_url = 'rtsp://example/Streaming/Channels/101'
        manager.preview = True
        manager.running = True
        manager.last_used = time.monotonic()
        manager.lock = threading.Lock()
        manager.latest_frame = manager.latest_jpeg = manager.detail_jpeg = b'old'
        def expire(_): manager.last_used = time.monotonic() - 60
        with patch.object(streams.cv2, 'VideoCapture', return_value=capture), patch.object(streams.time, 'sleep', side_effect=expire):
            manager._update_loop()
        self.assertTrue(capture.released)
        self.assertFalse(manager.running)
        self.assertIsNone(manager.latest_jpeg)


if __name__ == '__main__':
    unittest.main()

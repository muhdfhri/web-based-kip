import re

with open('/home/mewah-group-pt-kip/IPOMAS/PC-SERVER/PROGRAM/MEWAH-KIP/stations/security/ai/backend/core/rtsp_streamer.py', 'r') as f:
    content = f.read()

ffmpeg_class = """
import subprocess

class FFmpegCapture:
    def __init__(self, source):
        self.width, self.height = 1280, 720
        self.frame_size = self.width * self.height * 3
        command = [
            'ffmpeg', '-hide_banner', '-loglevel', 'error',
            '-hwaccel', 'cuda',
            '-rtsp_transport', 'tcp',
            '-timeout', '5000000',
            '-i', source,
            '-vf', f'scale={self.width}:{self.height}',
            '-f', 'image2pipe',
            '-pix_fmt', 'bgr24',
            '-vcodec', 'rawvideo',
            '-r', '15',
            '-'
        ]
        self.pipe = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=10**8)

    def isOpened(self):
        return self.pipe.poll() is None

    def read(self):
        raw_image = self.pipe.stdout.read(self.frame_size)
        if len(raw_image) != self.frame_size:
            return False, None
        frame = np.frombuffer(raw_image, dtype='uint8').reshape((self.height, self.width, 3))
        return True, frame

    def get(self, prop):
        return 15.0

    def release(self):
        try:
            self.pipe.kill()
            self.pipe.wait(timeout=2)
        except:
            pass

"""

if 'class FFmpegCapture' not in content:
    content = content.replace("class CameraStreamManager:", ffmpeg_class + "class CameraStreamManager:")

old_cap = """                options = [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, TIMEOUT_MS,
                           cv2.CAP_PROP_READ_TIMEOUT_MSEC, TIMEOUT_MS]
                if hasattr(cv2, 'CAP_PROP_N_THREADS'):
                    options += [cv2.CAP_PROP_N_THREADS, 1]
                cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG, options)"""

new_cap = "                cap = FFmpegCapture(source)"

content = content.replace(old_cap, new_cap)

with open('/home/mewah-group-pt-kip/IPOMAS/PC-SERVER/PROGRAM/MEWAH-KIP/stations/security/ai/backend/core/rtsp_streamer.py', 'w') as f:
    f.write(content)

print("Patched successfully!")

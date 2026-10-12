"""Retired CCTV patch: the shared streamer already includes the supported capture path.

The old helper injected CUDA-only FFmpeg subprocesses and a fixed 15 FPS output.
Applying it to a deployment would restore the console/GPU/reconnect defects.
"""

if __name__ == "__main__":
    print("No patch required. Use the CCTV streamer shipped with this project and restart security-ai-service through PM2.")

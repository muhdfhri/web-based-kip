# CCTV live preview

The grid and fullscreen view share one binary HTTP connection at
`/api/security/cctv/live?ids=18,19,...`. The Security gateway forwards it to
`/api/security-ai/live` on port 4101. This avoids using one permanent HTTP/1.1
connection per camera and starving the page's ordinary API requests.

Each packet is a 4-byte big-endian JSON-header length, the UTF-8 JSON header,
then `length` JPEG bytes. Headers identify the camera, frame sequence, freshness,
and connection status. Offline channels have zero image bytes and do not block
other channels. Unchanged sequences send a status heartbeat once per second.

RTSP readers are shared by source URL and preview mode. Hikvision `*01` main
streams are read as `*02` substreams for preview, independently falling back to
the stored main URL if a channel's substream fails. Database URLs and NVR settings
are not modified. Snapshot/AI callers retain access to a main-stream reader.

Defaults: 640-pixel grid width, at most 15 encoded frames/second, JPEG quality 72,
one decoder thread per camera. Fullscreen requests up to 1280 pixels from the same
reader. Configure `CCTV_PREFER_SUBSTREAM`, `CCTV_PREVIEW_WIDTH`,
`CCTV_PREVIEW_FPS`, and `CCTV_JPEG_QUALITY` in the Python service environment.

Readers drain source frames without sleeping; only the latest frame is retained.
Encoding uses fixed monotonic deadlines rather than waiting a full interval after
each sampled frame. The transmitter polls at twice the target FPS so independent
camera phases do not unnecessarily discard frames at the transport layer.
The browser likewise keeps at most one pending JPEG per camera and closes replaced
ImageBitmaps. A slow renderer skips older frames instead of accumulating latency.
RTSP open/read timeout is 5 seconds, stale-frame threshold is 4 seconds, and idle
readers close after 30 seconds. Hidden tabs close their HTTP connection and resume
on visibility change. Page refresh/unmount aborts fetch and the gateway destroys
its upstream connection. Startup waits for each NVR channel's first decodable
frame; refreshing an already-active grid reuses the warmed readers.

Packets also include the server's monotonic send timestamp. The browser compares
clock deltas to detect a growing TCP backlog without requiring matching clocks.
If the connection falls more than 1.5 seconds behind its best observed transit
time, it reconnects to the newest frames. A single camera whose source frame is
older than 1.5 seconds is marked reconnecting without resetting healthy cameras.
This bounds accumulating delay; it does not measure absolute camera-to-screen
latency, including the camera's own encoding and fixed network transit time.

The target project's `/api/security-ai/status` endpoint is retained and never
opens a reader just to inspect status. Camera URLs/active flags are refreshed in
one database query every five seconds so saved CCTV edits reach existing viewers.
Temporary DB errors keep the last configuration and retry on the next poll.

For browser QA, each canvas exposes `data-cctv-rendered-frames`. Sampling the DOM
counter at two times measures actual rendered FPS without displaying diagnostic
details to users. `stream/status` includes source FPS and target FPS as well.

## Ubuntu server deployment

The default is a CPU/FFmpeg preview path; an installed NVIDIA GPU is not used
automatically. Keep the substream/shared-reader configuration when AI Grading and
AI Vision are enabled. GPU decoding needs a compatible driver and FFmpeg/OpenCV
integration and should be validated on the actual server before enabling it.
Run the soak test on Ubuntu with AI workloads active and sample rendered FPS on
the actual client browser. Use the measured `steadyFps`, `p95GapMs`, bandwidth,
process memory and restart counts to select a rate. These measurements from a
development PC are not a benchmark of the future i9-12900K server.

`GET /api/security/cctv/stream/status` reports existing readers, sequence numbers,
frame age, source type and source resolution, without RTSP credentials. Memory
restart limits for the Python service and Vite shell are 1 GB to avoid restarting
them during ordinary 16-camera use; the forwarding gateway has a 256 MB limit.
Keep one Python service instance on port 4101;
Windows can leave an old instance bound to the port after an interrupted restart.

Verification from the repository root:

```
node --test stations/security/frontend/components/cctvTransport.test.mjs
node stations/security/tools/check-cctv-live.mjs http://127.0.0.1:5173 390
```

From `stations/security/ai/backend`:

```
python -B -m unittest discover -s tests -v
```

The live check writes `stations/security/verification/cctv-live-verification.json`. It checks all active
channels, deliberate refreshes, continued JPEG delivery, and missing/stalled frames
over a period longer than five minutes. Use the browser to verify grid imagery and
fullscreen as well. It does not guarantee uptime under future NVR/network failures.

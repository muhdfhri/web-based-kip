# Sterilizer FFB AI Grading

Feature untuk CCTV pada FFB conveyor, klasifikasi kematangan buah, keputusan majority per line, dan rekomendasi resep Sterilizer.

Frontend berada di `stations/sterilizer/frontend/tabs/AiGrading`, sedangkan service Python AI yang mandiri berada di `stations/sterilizer/ai`. Keduanya terhubung melalui kontrak HTTP `/api/sterilizer-ai` pada port default `4105` dan database `mewah_sterilizer_ai`.

## Struktur

```text
stations/sterilizer/
├── frontend/
│   └── tabs/AiGrading/
│       ├── AiGradingTab.jsx      # UI: live stream, kategori, majority, resep
│       └── AiGradingTab.css
├── backend/                      # Backend SCADA/PLC Sterilizer yang sudah ada
├── database/                     # Database umum Sterilizer yang sudah ada
└── ai/                           # Service AI mandiri
    ├── README.md                 # Dokumentasi setup dan kontrak integrasi
    ├── app.py                    # Flask entry point, default port 4105
    ├── .env.example
    ├── requirements.txt
    ├── config/
    │   ├── settings.py
    │   └── grading_config.json   # Line, CCTV, threshold, window, recipe mapping
    ├── core/
    │   ├── rtsp_streamer.py      # Shared threaded RTSP buffer per line
    │   ├── detector.py           # Adapter model Ultralytics
    │   ├── decision_engine.py    # Rolling-window majority
    │   ├── grading_service.py    # Orkestrasi inference dan persistence
    │   └── event_publisher.py    # Optional Redis event
    ├── database/
    │   ├── schema.sql
    │   └── repository.py
    ├── routes/api.py
    ├── models/README.md
    └── tests/test_decision_engine.py
```

## Alur data

```text
CCTV FFB Conveyor Line N
        ↓ RTSP
RtspCameraWorker (satu koneksi per line)
        ↓ latest OpenCV frame
FFB Ripeness Model
        ↓ ripe / unripe / overripe
Rolling Window Majority
        ↓ recipe mapping
ai_grading_line_results
        ↓ read-only
Sterilizer process/backend
```

Service ini tidak menulis PLC. Sterilizer hanya membaca hasil yang berstatus `READY`, lalu proses terpisah dapat memvalidasi dan menerapkan resep ke PLC.

## Tabel antarmuka Sterilizer

Tabel utama yang harus dibaca Sterilizer adalah:

```sql
SELECT
  line_no,
  majority_category,
  majority_percentage,
  recommended_recipe_code,
  recommended_recipe_name,
  recipe_parameters_json,
  decision_status,
  result_version,
  updated_at
FROM mewah_sterilizer_ai.v_sterilizer_ai_recipe_input
WHERE line_no = 1
  AND decision_status = 'READY';
```

Aturan integrasi:

- AI adalah satu-satunya writer tabel `ai_grading_line_results`.
- Sterilizer adalah read-only consumer melalui view `v_sterilizer_ai_recipe_input`.
- Terapkan resep hanya ketika `decision_status = 'READY'`.
- Gunakan `result_version` untuk mendeteksi keputusan baru.
- Tolak hasil yang `updated_at`-nya sudah kedaluwarsa menurut aturan operasional.
- Nilai parameter contoh di `grading_config.json` wajib divalidasi engineer proses sebelum dipakai ke PLC fisik.

## Persiapan

1. Import database:

   ```powershell
   mysql -u root -p < stations/sterilizer/ai/database/schema.sql
   ```

2. Buat virtual environment dan install dependencies:

   ```powershell
   cd stations/sterilizer/ai
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Salin `.env.example` menjadi `.env`, lalu isi koneksi database.

4. Taruh bobot hasil training di `ai/models/ffb_ripeness.pt`.

5. Jalankan service secara langsung:

   ```powershell
   python app.py
   ```

   Atau jalankan melalui PM2 dari root proyek:

   ```powershell
   pm2 start ecosystem.config.cjs --only sterilizer-ai-service
   ```

6. Buka Sterilizer → AI Grading - FFB dalam config mode. Isi RTSP URL, aktifkan line, lalu tekan `Save & Reconnect`.

## Konfigurasi majority

Default di `grading_config.json`:

- rolling window: 60 detik;
- minimum: 10 deteksi;
- update hasil: 5 detik;
- tie-break deterministik: RIPE → UNRIPE → OVERRIPE;
- threshold confidence per kategori: 0.55.

Jika jumlah deteksi belum mencapai minimum, output selalu `INSUFFICIENT_DATA` dan tidak ada resep yang dilepas.

## Kontrak endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/sterilizer-ai/health` | Status runtime, model, DB, dan CCTV |
| GET | `/api/sterilizer-ai/stream?line_no=1` | MJPEG stream browser |
| GET | `/api/sterilizer-ai/snapshot?line_no=1` | JPEG terbaru |
| GET | `/api/sterilizer-ai/stats?line_no=1&period=DAY` | Statistik RIPE/UNRIPE/OVERRIPE |
| GET | `/api/sterilizer-ai/current?line_no=1` | Keputusan terbaru line |
| GET | `/api/sterilizer-ai/config` | Konfigurasi tanpa membocorkan RTSP credential |
| PUT | `/api/sterilizer-ai/config` | Simpan konfigurasi dan reconnect worker |

## Keamanan dan perilaku aman

- RTSP URL tidak pernah dikembalikan oleh endpoint GET configuration.
- Runtime override berisi credential dan diabaikan Git.
- Tidak ada synthetic/model-fake detection ketika bobot model belum tersedia.
- Kamera atau model offline tidak menghasilkan resep `READY` baru.
- Contoh ini belum menyediakan autentikasi API. Tambahkan middleware autentikasi/reverse proxy sebelum deployment produksi.
- Vite development proxy `/api/sterilizer-ai` ke port `4105` sudah tersedia. Reverse proxy server produksi tetap harus diarahkan ke port yang sama.

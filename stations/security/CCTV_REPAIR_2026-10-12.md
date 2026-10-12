# Analisis dan perbaikan CCTV — 12 Oktober 2026

Perubahan dibatasi pada CCTV Security, konfigurasi PM2 untuk worker CCTV,
helper patch CCTV lama, dan alat pengujian CCTV. Modul/stasiun lain tidak diedit.
Data kamera produksi, kredensial RTSP, dan pengaturan NVR tidak diganti.

## Temuan dan perbaikan

| Masalah | Temuan | Perbaikan |
| --- | --- | --- |
| Banyak terminal | Setiap reader memanggil FFmpeg melalui subprocess tanpa menyembunyikan console Windows. | Decoder FFmpeg dijalankan di dalam OpenCV. Launcher Python menggunakan `windowsHide: true`; log tetap masuk PM2. |
| Semua kamera reconnect | Browser memutus koneksi bersama begitu backlog melebihi 1,5 detik. Ada dua proses Python CCTV lama bersamaan. Pipe stderr FFmpeg juga tidak dibaca sehingga berisiko macet. | Backlog sementara dibuang; reconnect transport hanya untuk backlog berkepanjangan atau putus/stall nyata. Satu worker tersembunyi; duplicate port ditolak dan child dihentikan saat PM2 restart. Pipe subprocess dihapus. |
| Browser ditutup, CCTV berhenti | Reader berakhir setelah 30 detik tidak digunakan dan baru dibuat saat ada penonton. | Supervisor membuka semua URL kamera aktif saat layanan berjalan dan mempertahankan reader tanpa browser. RTSP terus dibaca; JPEG preview tanpa penonton dihasilkan 1 FPS untuk menghemat CPU. |
| FPS tetap 15 | FFmpeg memaksa output 15 FPS; getter FPS selalu mengembalikan 15. Batas aplikasi lama juga maksimal 20. | Batas/default aplikasi 30 FPS; source FPS dibaca dari decoder. Sumber yang lebih lambat tidak diberi frame duplikat untuk mengaku 30 FPS. |
| GPU/PC berat | CUDA dipaksa untuk setiap kamera; gambar dipaksa 1280×720 lalu diperkecil lagi. Semua tile terus didekode/digambar, termasuk di luar layar. | Decoder CPU satu thread per kamera, ukuran/aspek sumber dipertahankan. Tidak ada buffer pipe 100 MB. Canvas opaque meminta backing CPU; gambar hanya dikirim/didekode/digambar untuk tile terlihat. Fullscreen menghentikan gambar/render grid yang tertutup. |
| RTSP baru membutuhkan konfigurasi/refresh | Daftar kamera hanya dimuat sekali; kamera baru belum muncul di halaman terbuka. Kode otomatis dapat berbenturan dengan kode manual/impor. | Daftar dan supervisor refresh otomatis setiap 5 detik, ditambah event setelah penyimpanan. URL RTSP divalidasi/dirapikan. Kode otomatis mendapat suffix unik jika bentrok; kamera live memakai tabel master tanpa bergantung pada sinkronisasi konfigurasi AI kedua. |
| Masalah CCTV tambahan | Fallback URL menggunakan `localhost:3101`, salah untuk sebagian klien remote; snapshot pertama dari main reader baru dapat berupa placeholder. Helper patch lama dapat memasang kembali implementasi CUDA/15 FPS. | URL memakai origin aplikasi. Snapshot menunggu frame pertama hingga 5 detik dan mempertahankan resolusi main. Helper patch lama dipensiunkan. Kamera yang terus gagal menunjukkan `offline` sambil tetap mencoba pulih. |

## Hasil pengujian

- Backend Python: **16 tes lulus**, termasuk batas FPS, isolasi kamera rusak,
  lifecycle tanpa penonton, perubahan konfigurasi, alias URL, pelepasan capture,
  stale frame, dan snapshot pertama/resolusi main.
- Transport browser: **5 tes lulus**, termasuk paket terfragmentasi/besar,
  offscreen tanpa decoding, kembali setelah scroll, backlog sementara tanpa
  reconnect massal, kamera offline terisolasi, fullscreen/buka-tutup modal,
  putus koneksi nyata dan pelepasan resource.
- CRUD PostgreSQL: **1 tes integrasi lulus** pada database sementara yang dibuat
  dan dibersihkan oleh tes. Penambahan bersamaan, benturan kode impor, RTSP,
  pengubahan, deaktivasi, penghapusan dan payload sinkronisasi HTTP diperiksa.
  Penambahan hanya dengan RTSP juga lulus: nama/kode dibuat otomatis, stasiun
  default Security, dan kamera langsung aktif. Formulir tetap memiliki pilihan
  stasiun default ketika master stasiun belum tersedia.
- Build frontend: **lulus**. Peringatan ukuran bundle yang sudah ada tetap muncul.
- Uji streaming nyata **390 detik**: 47 kanal dipantau, 18 gambar terlihat dikirim,
  46 kanal tersedia tetap `live`, **0 pelanggaran**, dua kali koneksi dibuka ulang.
  Seluruh gambar terlihat kembali dalam 0,39 detik / 0,078 detik / 0,08 detik
  pada tiga sesi dengan reader sudah hangat.
- FPS JPEG yang diterima untuk 18 kanal: **13,63–18,36 FPS** pada PC ini.
  P95 jeda terburuk 154 ms; jeda maksimum 3,495 detik. Ini bukan jaminan semua
  kamera mencapai 30 FPS: sumber aktif melaporkan 20 FPS dan CPU/bandwidth
  membatasi throughput. Tes semua 47 gambar sekaligus sebelumnya menghasilkan
  5,69–7,63 FPS, sehingga pengiriman berdasarkan viewport memberi manfaat nyata.
- Tanpa penonton selama **42 detik**, semua 46 sumber tersedia tetap live/persisten,
  sequence bertambah **42–43 frame**, dan tidak ada tambahan reconnect pada
  kanal tersebut. RTSP tetap dibaca pada laju sumber; 1 FPS hanya untuk JPEG
  preview tanpa penonton. Ini melampaui ambang idle lama 30 detik.
- Snapshot main pada permintaan pertama: gambar asli **2560×1440**, berhasil
  dalam **1,28 detik**, bukan placeholder atau gambar yang dipaksa 1280×720.
- Grid dan fullscreen diverifikasi melalui halaman uji CCTV khusus dengan
  transport produksi. Counter render grid terbukti tidak bertambah saat
  fullscreen terbuka; hanya kamera fokus yang mengirim gambar pada laju penuh,
  dan grid kembali live setelah modal ditutup. Hasil gambar tersedia di folder
  `verification`.
- Worker preview tidak muncul dalam daftar aplikasi compute NVIDIA; decoder
  secara eksplisit menggunakan CPU. Tidak ada proses FFmpeg terpisah. Pengurangan
  penggunaan GPU tidak diukur sebagai persentase sebelum/sesudah; CPU tetap
  diperlukan untuk membaca/dekode seluruh kamera secara terus-menerus.

Artefak pengujian:

- `verification/cctv-final-warm-soak.json`
- `verification/cctv-background-verify.json`
- `verification/cctv-snapshot-verify.json`
- `verification/cctv-qa-grid-20261012.jpg`
- `verification/cctv-qa-fullscreen-20261012.jpg`

## E19/Boiler

NVR mengembalikan **404 Not Found** untuk main kanal 1901 dan sub kanal 1902.
Pengguna meminta kanal ini dibiarkan dahulu karena kemungkinan tidak connect
di NVR. URL/data kamera dipertahankan. Sumber ini menunjukkan offline, retry
otomatis tetap berjalan, dan kegagalannya tidak memutus kanal lain.

## Pengoperasian dan batas verifikasi

Layanan `security-station` dan `security-ai-service` sudah dijalankan dengan
konfigurasi CCTV baru. Restart yang tercatat selama pekerjaan adalah restart
deployment yang sengaja dilakukan. Pembaca berjalan selama layanan proyek aktif;
menutup browser tidak sama dengan menghentikan PM2/PC.

Cold start 47 sumber pada build OpenCV Windows ini dapat membutuhkan sekitar
satu menit karena pembukaan RTSP diserialisasi. Saat halaman dibuka kembali,
reader yang sudah hangat digunakan ulang. Fullscreen/penambahan kamera tidak
mengharuskan konfigurasi proses baru. Jalur snapshot/AI main tetap tersedia.

Perintah menyalakan `frontend-shell` bersama ditolak oleh pemeriksaan persetujuan
otomatis dengan pesan **blocked by policy**, tanpa rincian alasan tambahan.
Karena itu halaman utama pada port 5177 belum diuji hidup dengan kode baru;
build-nya lulus dan verifikasi visual dilakukan melalui alat CCTV khusus pada
port 5189. Alat uji tersebut dihentikan setelah verifikasi.

Untuk menyalakan frontend yang belum berjalan, dari root proyek:

```powershell
pm2 start ecosystem.config.cjs --only frontend-shell
```

Lalu muat ulang halaman utama agar memuat transport browser yang baru. Perintah
normal `pm2 start ecosystem.config.cjs` juga memakai launcher CCTV baru ketika
seluruh proyek dijalankan. Petunjuk teknis dan pengulangan tes tersedia di
`ai/backend/CCTV_STREAMING.md`.

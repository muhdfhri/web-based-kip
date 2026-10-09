# CCTV Feed — folder pengembangan dan deployment

Folder kerja mulai perubahan ini: `MEWAH-KIP-NEW`. CCTV menggunakan kode di folder
ini sendiri, tanpa import atau dependency path ke folder `MEWAH-KIP` lama.

## Database server yang diberikan

- `mewah_main`: layanan utama, akun, konfigurasi, alarm, maintenance, logsheet;
  tidak digunakan sebagai sumber link CCTV dan tidak diubah untuk migrasi CCTV.
- `mewah_security.public.cctv_cameras`: sumber resmi grid CCTV. `id` adalah
  PostgreSQL identity; `is_active` berupa integer 0/1; link berada di `rtsp_url`.
- `mewah_security_ai.public.security_ai_cctv_configs`: konfigurasi AI dengan
  `camera_code` unik dan `is_active` boolean. Data deteksi/ROI/history dipertahankan.

Dump server berisi 5 entri CCTV, semuanya menunjuk satu link/kanal yang sama.
Database AI berisi 15 konfigurasi dari beberapa stasiun; daftar AI tidak otomatis
menjadi daftar grid Security. Agar 16 kanal berbeda tampil di server, masukkan
16 URL kanal berbeda lewat pengaturan kamera, bukan menggandakan URL kanal 101.
URL dan data CCTV laptop tidak otomatis menimpa isi dump server.

## Perubahan yang dipindahkan

Satu koneksi biner untuk seluruh grid/modal, reader RTSP substream yang dibagi,
preview 640 px / target 15 FPS / JPEG quality 72, frame terbaru tanpa antrean tak
terbatas, deteksi delay bertambah, reconnect, dan status LIVE berdasarkan gambar
yang diterima. Snapshot utama tetap beresolusi asli. Perilaku tab tersembunyi dan
idle 30 detik tetap seperti versi sebelumnya; mode kamera selalu aktif belum ditambahkan.

CRUD CCTV memakai query PostgreSQL dan identity `RETURNING`, menyimpan waktu
pembuatan, serta menyinkronkan kode kamera yang tersimpan dan status integer→boolean.
Endpoint status dan pembaruan konfigurasi kamera yang sudah ada di target dipertahankan.

Koneksi umum Security (`src/config/db.js`, termasuk `mainPool`) dan seluruh route
patrol, queue, incident, logsheet dipertahankan. Dua file bersama mendapat perubahan
terbatas untuk integrasi CCTV: alias dependency di Vite, serta batas RAM proses dan
pilihan interpreter Python di PM2. Aplikasi lain tidak disalin dari folder lama.

## Menjalankan di laptop / Ubuntu

1. Gunakan folder ini sebagai working directory. Dependency Node dipasang dari
   lockfile yang sudah ada; Python dari `stations/security/ai/backend/requirements.txt`.
   Instalasi frontend saat ini memerlukan `npm ci --legacy-peer-deps` karena
   konflik React 18 dengan dependency 3D yang sudah ada; versi 3D tidak diubah.
2. Periksa `.env` di `main-service/backend`, `stations/security/backend`, dan
   `stations/security/ai/backend`. Main-service memerlukan `DB_NAME=mewah_main`
   dan kredensial yang valid untuk memuat daftar Station View. Gunakan template
   `.env.example` di masing-masing folder jika checkout baru belum mempunyai `.env`.
   Salinan `.env` untuk laptop sudah disiapkan dari dua layanan CCTV lama.
   Saat di-upload ke Ubuntu, gunakan password/IP PostgreSQL milik server.
   File `.env` tidak masuk Git. Template memakai PostgreSQL port 5432.
3. Gateway: `PORT=3101`, `DB_NAME=mewah_security`, `SECURITY_AI_HOST=127.0.0.1`,
   `SECURITY_AI_PORT=4101`. Python: `PORT=4101`, `FLASK_ENV=production`,
   `DB_NAME_GENERAL=mewah_security`, `DB_NAME_AI=mewah_security_ai`.
4. Setelah restore dump di server, jalankan sekali pada `mewah_security`:
   `psql -U postgres -d mewah_security -v ON_ERROR_STOP=1 -f stations/security/database/cctv_compatibility.sql`.
   Password mengikuti konfigurasi PostgreSQL server, jangan ditulis di command line.
5. Jalankan proses CCTV dari konfigurasi PM2 folder ini. Jika nama proses yang
   sama masih menunjuk checkout lama, hentikan/hapus **dua proses CCTV itu saja**
   dahulu, lalu `pm2 start ecosystem.config.cjs --only "security-station,security-ai-service"`.
   Frontend server harus dibangun/dijalankan dari checkout ini saat deployment.

SQL kompatibilitas hanya mengubah default timestamp CCTV dan penanganan error
fungsi trigger CCTV lama. Target/kredensial dblink milik server tetap dipertahankan.
Jika dblink gagal, perubahan kamera tetap tersimpan dan API CCTV melakukan sync
ke Python memakai `.env`. Kegagalan API sync dicatat di log; simpan ulang kamera
setelah layanan AI pulih. Perubahan langsung lewat SQL/DBeaver memerlukan dblink
yang valid agar AI ikut tersinkron—jalur API tidak berjalan untuk edit langsung.

Ketiga dump asli tidak diedit atau di-restore menimpa database operasional laptop.
Pengujian restore dan CRUD memakai database terpisah dengan awalan `cctv_verify_`.
Server Ubuntu belum diakses; SQL kompatibilitas disiapkan dan diuji di salinan dump.

## Verifikasi

Dari root folder ini:

```
node --test stations/security/frontend/components/cctvTransport.test.mjs
node stations/security/tools/check-cctv-live.mjs http://127.0.0.1:5173 390
```

Dari `stations/security/ai/backend`:

```
python -B -m unittest discover -s tests -v
```

Uji CRUD di `stations/security/backend/tests/cctv-postgres.test.mjs` menolak
database tanpa awalan `cctv_verify_`. Restore dump ke database uji terlebih dahulu
dan retarget fungsi dblink uji ke database AI uji, agar tidak menulis database asli.
Harness browser berada di `stations/security/verification`. Hasil JSON, audit,
   dan screenshot pengujian disimpan lokal dan tidak masuk Git.

Hasil 9 Oktober 2026: build produksi lulus; 11 uji Python, 3 uji transport,
dan 1 uji integrasi CRUD PostgreSQL lulus. Lima entri dari dump server tampil
dalam uji 60 detik. Uji tambahan 16 kanal berbeda berlangsung 390 detik tanpa
kamera terhenti; FPS nyata di browser 12,06–14,39. Audit byte file menunjukkan
1.109 file lama di luar perubahan yang ditentukan tetap sama; hash isi 52 tabel
di luar konfigurasi CCTV tetap sama. Proses dan tiga database uji sudah dibersihkan.

Query parameter dan hasil `RETURNING` dicocokkan dengan dokumentasi node-postgres
melalui Context7: https://node-postgres.com/features/queries dan
https://node-postgres.com/apis/result.

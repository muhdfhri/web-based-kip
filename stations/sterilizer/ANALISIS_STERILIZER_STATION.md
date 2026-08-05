# 📋 Laporan Analisis & Progress Komprehensif Station Sterilizer

**Tanggal Analisis & Update:** 30 Juli 2026  
**Lokasi Project:** `stations/sterilizer/`  
**Status:** Terisolasi Per-Station (Backend & Frontend Fully Operational & Verified)

---

## ⚙️ A. KONTROL & INTEGRASI BACKEND (`backend/`)

### 1. Apakah sudah ada PLC Integration?
* **STATUS: SUDAH ADA & AKTIF.**
* Di [server.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/server.js#L44-L50), service memanggil `startPlcCollector()` dari [plcCollector.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/plcCollector.js#L49).
* Integrasi PLC Siemens S7 menggunakan wrapper `Snap7ClientWrapper` ([snap7Client.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/snap7Client.js#L22)) berbasis `node-snap7`.
* `plcCollector.js` secara otomatis mem-poll data PLC setiap 200ms, meng-update cache realtime (`liveDataCache`), menyimpan ke database MySQL (`plc_tag_latest` & `plc_tag_values`), serta mem-publish data ke channel Redis (`REDIS_CHANNEL`). Jika driver Snap7 tidak terpasang, backend secara otomatis berjalan dalam mode fallback (`isMock = true`).

---

### 2. Apakah sudah ada Add Device dan Input Tag?
* **STATUS: SUDAH ADA.**
* Endpoint REST API telah tersedia lengkap di [plcConfigRoutes.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/routes/plcConfigRoutes.js):
  * **Add/Update Device (`POST /api/sterilizer/plc-config/devices`):** Menyimpan/mengubah `name`, `ip_address`, `rack`, `slot`, dan `enabled` ke tabel `plc_devices`.
  * **Input/Update Tag (`POST /api/sterilizer/plc-config/tags`):** Menyimpan/mengubah `plc_id`, `db_number`, `byte_offset`, `bit_offset`, `data_type`, `tag_name`, `access`, `enabled`, dan `node_id` ke tabel `plc_tags`.

---

### 3. Apakah sudah bisa Mapping Tag?
* **STATUS: SUDAH BISA & CASE-INSENSITIVE.**
* Tabel `station_tag_mappings` dibuat secara otomatis ([plcConfigRoutes.js:L16-L28](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/routes/plcConfigRoutes.js#L16-L28)) dengan skema: `station`, `equipment`, `signal_key`, dan `tag_id`.
* Route pendukung yang telah disesuaikan:
  * `GET /api/sterilizer/plc-config/station-mappings/:station` (Fetch mapping tag per station, case-insensitive `LOWER(m.station) = LOWER(?)`)
  * `POST /api/sterilizer/plc-config/station-mappings` (Save/Update mapping, mendukung single object maupun bulk `mappings: [...]`)
  * `DELETE /api/sterilizer/plc-config/station-mappings/:id` (Hapus mapping)

---

### 4. Untuk input tag apakah bisa memakai Memory (M) tanpa perlu DB secara otomatis?
* **STATUS: SUDAH BISA (Telah Diterapkan & Di-approve).**
* Backend `snap7Client.js` & `plcConfigRoutes.js` telah diperbarui dengan dukungan kolom `node_id` yang mengenali area Memory (`M`/`MK`), Input (`I`/`PE`), dan Output (`Q`/`PA`) via Snap7 `ReadArea` & `WriteArea`.
* Frontend `PlcConfigView.jsx` telah dilengkapi dropdown Memory Area (`DB`, `M`, `I`, `Q`) dan S7 Address Parser otomatis (seperti `M0.0`, `MW10`, `MD20`). DB Number secara otomatis diset ke `0` untuk tag berbasis Memory.

---

### 5. Apakah sudah bisa Read & Write?
* **Read:** **SUDAH BISA & AUTOMATIC.** `plcCollector.js` membaca tag secara periodik dari PLC via `client.readMultipleTags(tags)` setiap 200ms dan menyajikannya di endpoint `/api/sterilizer/monitor/realtime` & `/api/sterilizer/plc-config/tags-live`.
* **Write:** **SUDAH DUKUNG OPERASIONAL DUA JALUR.**
  * **Jalur Redis Subscriber:** Mendengarkan pesan Redis Subscriber di channel `pis:plc:command` ([plcCollector.js:L112](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/plcCollector.js#L112)) dan mencatat status di tabel `plc_commands`.
  * **Jalur HTTP REST API:** Controller `POST /api/sterilizer/plc-config/write` ([plcConfigRoutes.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/routes/plcConfigRoutes.js)) memanggil `writeTagDirect()` untuk mengeksekusi penulisan tag langsung secara instan.

---

### 6. Catatan Tambahan Backend:
* **Bypass Authentication:** Di [plcConfigRoutes.js:L6-L7](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/routes/plcConfigRoutes.js#L6-L7), middleware `requireAuth` dan `authorize` saat ini masih di-bypass (mode testing).
* **Threshold & Alert Event:** Backend sudah siap dengan fungsi `checkThreshold` ([plcCollector.js:L512](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/plcCollector.js#L512)) yang otomatis mencatat log peringatan ke tabel `station_event_logs` ketika ada parameter melebihi `warning_val` atau `danger_val`.

---

## 🎨 B. TAMPILAN & LOGIKA FRONTEND (`frontend/`)

### 1. Apakah sudah bisa klik Card jika Mode PLC Integration aktif?
* **STATUS: SUDAH BISA & DILENGKAPI INDIKATOR STYLING VISUAL (KHUSUS CARD).**
* Di [SterilizerStationPage.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/SterilizerStationPage.jsx#L827-L880), ketika `configMode = true` (PLC Integration Mode aktif):
  * **Card Sudah Di-mapping:** Menampilkan **Garis Neon Biru (`#3b82f6`)** dan glowing shadow biru.
  * **Card Belum Di-mapping:** Menampilkan **Garis Neon Merah (`#ef4444`)** dan glowing shadow merah sebagai penanda visual.
  * **Elemen Valve:** Dikecualikan secara khusus dari indikator outline merah/biru agar tampilan visual tidak berantakan.
  * **Mode Non-Aktif (`configMode = false`):** Seluruh garis penanda merah/biru disembunyikan total (`outline: "none"`).
* Saat equipment/card diklik dalam mode aktif, event handler `handleEquipmentClick` memicu fungsi pembuka modal configuration mapping (`handleTagEditRequest`).

---

### 2. Apakah setelah klik muncul Form untuk Mapping Tag?
* **STATUS: SUDAH BISA.**
* Komponen modal `<TagEditorModal />` ([SterilizerStationPage.jsx:L22-L329](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/SterilizerStationPage.jsx#L22-L329)) muncul via React Portal di atas layar.
* Form menyediakan elemen dropdown `<select>` berisi seluruh daftar tag yang tersedia (`availableTags`, di-fetch dari API `/api/sterilizer/plc-config/tags`) untuk setiap signal point equipment (misalnya `STATUS`, `START`, `STOP`, `MONITOR`, dll).

---

### 3. Apakah Mapping Tag bisa dilakukan & Pemisahan Display Status (`No Tag` vs `--`)?
* **STATUS: SUDAH BISA & SINKRON MENGIKUTI STANDAR SKL.**
* **Pemisahan Tampilan Status:**
  * **`No Tag`**: Tampil HANYA jika equipment/card tersebut **belum dipetakan/di-mapping** di database (`!tagId`).
  * **`--`**: Tampil jika equipment **SUDAH di-mapping**, namun PLC belum terkoneksi / data live belum tersedia dari backend.
* Error handling standar diproduksi secara bersih tanpa interrupting alert bawaan dev mode.

---

### 4. Apakah sudah ada Logic Flow dan Valve di Overview? (Rincian)
* **STATUS: SUDAH ADA & SANGAT DETAIL.**
* Di [OverviewTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx):
  * **28 Manual Valve Components:** Didefinisikan dalam `MANUAL_VALVES` ([OverviewTab.jsx:L283](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx#L283)) lengkap dengan posisi $(x, y)$, ukuran, dan rotasi.
  * **Status Valve Line 1 - 4:** Menggunakan SVG khusus (`CylinderDoorSVG`, `valveActuatorSvg`, `valvePositionerSvg`) serta helper `formatValveStatus()` untuk membaca status `"OPEN"` / `"CLOSE"`.
  * **Animasi Pipe Flow (Fluida):** Di-render menggunakan komponen `<LiquidSteamFlowSVG />` dengan animasi CSS (`liquid-flow--flowing`, `liquid-flow-glow`, `liquid-flow-aura`). Warna dan aliran pipa (Cyan/Blue/Steam) secara dinamis berubah aktif/standby tergantung kondisi terbukanya valve.

---

### 5. Apakah sudah ada Logic Flow dan Valve di Line 1-4? (Rincian)
* **STATUS: SUDAH ADA.**
* Pada [OverviewTab.jsx:L2175-L2300+](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx#L2175-L2300), terdapat blok `UNIFIED LINE VIEW` untuk tab `"line1"`, `"line2"`, `"line3"`, dan `"line4"`.
* Ketika tab individual line dipilih, tampilan beralih ke background line tunggal `sterilizerLineImageUrl`.
* Mengambil status valve spesifik line terkait (misal `st1_inlet`, `purge_safety_door_st1`, `relief_condensate_valve_st1`, `condensate_valve_st1`) via `getMappedValue()` dan merender animasi aliran fluida khusus pipa line tersebut (`<g className="som-line-flows">`).

---

### 6. Inheritance (Keterkaitan 1-to-1) Overview $\leftrightarrow$ Line 1-4
* **STATUS: SUDAH DITERAPKAN & DISERAGAMKAN FULL (1-to-1 Single Source Equipment ID & Valve Mapping).**
* **Penyelesaian:**
  * Array `TAG_MONITOR_CARDS` di [OverviewTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx#L344-L371) telah diseragamkan ID-nya agar menggunakan suffix line spesifik yang unik (`card_exhaust_steam_st1` s/d `st4`, `card_inlet_steam_1_st1` s/d `st4`, `condensate_st1` s/d `st4`, dll).
  * Pemetaan valve pada `UNIFIED LINE VIEW` untuk **Line 4** (`TEST_MANUAL_VALVE_26`, `27`, `28`) telah disinkronkan 100% dengan tab Overview.
  * Dengan penyeragaman ini, seluruh status valve, pipa flow, dan mapping card di tab **Overview** (Line 1 s/d Line 4) secara otomatis **ter-inherit 1-to-1** ke tab **Line 1–4**, dan sebaliknya.

---

### 7. Format Tampilan Satuan & Parameter di Card Monitor
* **STATUS: SUDAH DITERAPKAN SESUAI ARAHAN USER (BERSIH: HANYA VALUE + UNIT).**
* Komponen `<TagMonitorCardSVG />` di [SharedComponents.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/components/SharedComponents.jsx#L157-L275) dan array `TAG_MONITOR_CARDS` di [OverviewTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx#L344-L371) telah disesuaikan agar **teks label parameter (seperti `OPENING:`, `PRESS:`, `STATUS:`) dihapus / diisi string kosong (`""`)** pada seluruh card monitor di tab Overview Sterilizer PIS (kecuali card Summary yang memang memiliki baris data multi-parameter).
* Tampilan di dalam body card kini bersih dan fokus pada angka & satuan:
  * **Inlet Valves (Bukaan Modulasi):** Menampilkan **`-- %`** (saat di-mapping).
  * **Pressure Parameters (Tekanan):** Menampilkan **`-- Bar`** (saat di-mapping).
  * **Temperature Parameters (Suhu):** Menampilkan **`-- °C`** (saat di-mapping).
  * **Boolean / Digital Devices (Inlet Door, Outlet Door, Condensate, Exhaust):** Menampilkan **`OPEN`** / **`CLOSE`** (atau **`--`** jika PLC offline / **`no tag`** jika unmapped, tanpa satuan).
* Helper `renderCard()` memformat pemetaan card ini secara konsisten 1-to-1 di seluruh tab Overview maupun tab individual Line 1 s/d Line 4.

---

### 8. Integrasi Tab BPV Matang (Inherit dari SKL)
* **STATUS: SUDAH DITERAPKAN (FULL MATURED BPV TAB INTEGRATION).**
* File [BpvTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/BPV/BpvTab.jsx) dan [BpvTab.css](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/BPV/BpvTab.css) telah diselaraskan penuh dengan standar SKL:
  * **Canvas Equalization:** `viewBox="-400 10 2920 1260"` dan background image `BPV-PT-PIS.webp` (`width="2600"`, `x="-230"`).
  * **Zero Dependency Conflict & Production Clean:** Seluruh 11 alur flow SVG serta logic valve telah tertanam sempurna di [BpvTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/BPV/BpvTab.jsx). Tombol dan overlay Flow Builder telah dibersihkan secara rapi untuk keselarasan produksi.
  * **Fully Mapped & Animated:** Jalur Alur Pipa BPV serta **Logic Dinamis Valve (Make-Up Valve: `Flowing` vs `Standby Pulsing`, Blow-Off Valve: `Flowing` saja saat > 0.5)** telah terpasang sempurna di dalam komponen [BpvTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/BPV/BpvTab.jsx). Seluruh status BPV (`bpv_status`), positioner valve (`bpv_makeup_valve`, `bpv_blowoff_valve`), monitor card (`blr_pres`, `bpv_pres`), dan indikator outline dev mode (`getDeveloperStyle`) terintegrasi 100%.

---

### 9. Integrasi Tab Trend SCADA Matang (Presisi 1-to-1 dengan SKL)
* **STATUS: SUDAH DITERAPKAN & TUNTAS 100% (FULL MATURED TREND TAB INTEGRATION).**
* File [TrendTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Trend/TrendTab.jsx) dan [TrendTab.css](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Trend/TrendTab.css) telah diselaraskan penuh dengan standar SKL:
  * **Sumbu X-Axis & Interval 5 Jam:** 
    * Menggunakan rentang waktu 5 jam (300 menit) yang terbagi dalam 10 segmen interval @ 30 menit (11 label jam presisi dari `09:07` hingga `14:07`).
    * Resolusi penggambaran titik grafik real-time presisi per detik (18.000 titik data per 5 jam).
  * **Presisi Sumbu Y-Axis:**
    * Skala Y-Axis disajikan lega dengan 9 interval kelipatan `0.5 BAR` (`4.0` s/d `0.0`).
    * Angka `0.0` Y-Axis mendarat presisi 100% sejajar di garis dasar X-Axis (garis jam timestamp).
  * **Penyelesaian Bentrokan CSS & Tampilan Card Footer:**
    * Mengisolasi class CSS bentrok di `OverviewTab.css` (`.som-overview-...`) agar tidak mengganggu `TrendTab.css`.
    * Card summary footer di bagian bawah tampil sejajar horizontal (5 kolom) dengan layout ringkas KIRI (Pressure) & KANAN (Temp), serta resolusi pembacaan tag suhu (`st1_temp` s/d `st4_temp` & `bpv_temp`) mengecek key `MONITOR` dan `TEMP`.
  * **Dukungan Backend & Offline Fallback:**
    * Controller backend `/api/sterilizer/monitor/historical` ([monitorRoutes.js](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/backend/src/routes/monitorRoutes.js#L20-L40)) telah disesuaikan untuk mendukung parameter `2H`, `5H`, `8H`, dan `D`. Ketika PLC offline / tidak ada tag, backend merespon bersih tanpa error `400 Bad Request`.

---

### 10. Standarisasi Tampilan "No Tag" & Pola Hibrida PLC/Simulation (WebSocket SCADA Speed)
* **STATUS: SUDAH DITERAPKAN & DIVERIFIKASI.**

#### A. Standarisasi Tampilan & Warna "No Tag"
1. **[SharedComponents.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/components/SharedComponents.jsx)**
   * **Nama File:** `SharedComponents.jsx`
   * **Path Absolute:** `d:\Cari Kerja\PT Premier engineering\MEWAH-PIS-FIX\MEWAH-PIS\stations\sterilizer\frontend\components\SharedComponents.jsx`
   * **Line Numbers:** Line `106` (`IpomasMonitorCardSVG`), Line `170` (`TagMonitorCardSVG`), Line `310–325` (`SterilizerStatusPanelSVG` $\rightarrow$ `Row`).
   * **Perubahan Kode:** Menambahkan pengecekan `isNoTag` (`"No Tag"`, `"no tag"`, `"--"`). Warna teks dipaksa menjadi **abu-abu default (`#94a3b8`)** dan style *italic*, mencegah teks `"No Tag"` tampil berwarna merah (`#ef4444`).
2. **[OverviewTab.css](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.css)**
   * **Nama File:** `OverviewTab.css`
   * **Path Absolute:** `d:\Cari Kerja\PT Premier engineering\MEWAH-PIS-FIX\MEWAH-PIS\stations\sterilizer\frontend\tabs\Overview\OverviewTab.css`
   * **Line Numbers:** Line `1585–1597` (`.som-premium-subcard-warning-header`).
   * **Perubahan Kode:** Mengubah warna teks judul `HIGH TEMP` dari merah (`#ef4444`) menjadi **slate grey (`#475569`)**, `background: #f1f5f9`, dan `border-bottom: 1px solid #e2e8f0` agar selaras dengan header subcard lainnya.
3. **[OverviewTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx)**
   * **Nama File:** `OverviewTab.jsx`
   * **Path Absolute:** `d:\Cari Kerja\PT Premier engineering\MEWAH-PIS-FIX\MEWAH-PIS\stations\sterilizer\frontend\tabs\Overview\OverviewTab.jsx`
   * **Line Numbers:** Line `150–295` (`DataRow` & `HIGH TEMP` subcard pada `SettingValveModulateSVG`).
   * **Perubahan Kode:** Pelepasan class CSS berwarna merah saat `isNoTag === true` dan penerapan style warna abu-abu `#94a3b8`.

#### B. Pola Hibrida Data (PLC Primary $\rightarrow$ Variable Fallback)
1. **[OverviewTab.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/tabs/Overview/OverviewTab.jsx)**
   * **Nama File:** `OverviewTab.jsx`
   * **Path Absolute:** `d:\Cari Kerja\PT Premier engineering\MEWAH-PIS-FIX\MEWAH-PIS\stations\sterilizer\frontend\tabs\Overview\OverviewTab.jsx`
   * **Line Numbers & Perubahan Kode:**
     * **Line 2184–2193:** Penambahan helper `getSmartValveValue(valveId, fallbackTestVar)` untuk memprioritaskan data PLC (`getMappedValue`) terlebih dahulu, dan jatuh ke variabel testing jika PLC offline/`No Tag`.
     * **Line 2383–2555:** Pembaruan logika variabel `valveVal` pada percabangan aliran animasi pipa (`LiquidSteamFlowSVG`) untuk Line View 1–4.
     * **Line 3915–3975:** Pembaruan mapping 28 Manual Valve (`MANUAL_VALVES.map`) menggunakan `getSmartValveValue()`.
   * **Dampak Operasional:** 
     * **Saat Dev/Testing (PLC Offline):** Membaca variabel `TEST_MANUAL_VALVE_*` & `TEST_*_DOOR_*`.
     * **Saat Deployment PC Existing (PLC Online):** Secara otomatis membaca data **PLC nyata** tanpa perlu perubahan kode ulang.

#### C. Kecepatan Real-Time Data Pipeline (WebSocket SCADA Speed)
1. **[SterilizerStationPage.jsx](file:///d:/Cari%20Kerja/PT%20Premier%20engineering/MEWAH-PIS-FIX/MEWAH-PIS/stations/sterilizer/frontend/SterilizerStationPage.jsx)**
   * **Nama File:** `SterilizerStationPage.jsx`
   * **Path Absolute:** `d:\Cari Kerja\PT Premier engineering\MEWAH-PIS-FIX\MEWAH-PIS\stations\sterilizer\frontend\SterilizerStationPage.jsx`
   * **Line Numbers:** Line `374–379` (`usePlcStore` & `initSocket`), Line `417–420` (`getMappedValue`).
   * **Verifikasi Kode:** Data live diprioritaskan diambil dari Zustand Store terpusat (`tags[tagObj.tag_name].value`) yang didukung koneksi **WebSocket Stream Connection**, menjamin perubahan nilai PLC di-push secara instan dalam milidetik setara HMI / SCADA.

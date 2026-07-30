-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION: mewah_security
-- Replace security with the station slug (e.g. sterilizer, threshing)
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `mewah_security`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mewah_security`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON mewah_security.* TO 'kip_station_user'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- 1. Threshold Settings (Alarm Limits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `threshold_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parameter_key` VARCHAR(100) NOT NULL UNIQUE, -- e.g. STERI_press, STERI_temp
  `lower_val` DOUBLE DEFAULT 0,
  `warning_val` DOUBLE DEFAULT 50,
  `danger_val` DOUBLE DEFAULT 80,
  `unit` VARCHAR(20) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. Logsheet Entries (Manual input via form, JSON field for flexibility)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logsheet_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift` ENUM('1','2','3') NOT NULL,
  `log_date` DATE NOT NULL,
  `operator_id` INT NOT NULL,
  `operator_name` VARCHAR(100) NOT NULL,
  `data_json` JSON NOT NULL, -- Flexible parameters per station
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_date_shift` (`log_date`, `shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. Station Event / Alarm Logs (Specific to this station)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `station_event_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tag_name` VARCHAR(150) NOT NULL,
  `old_value` VARCHAR(255) DEFAULT NULL,
  `new_value` VARCHAR(255) DEFAULT NULL,
  `quality` VARCHAR(50) DEFAULT 'GOOD',
  `severity` ENUM('INFO','WARNING','ALARM') DEFAULT 'INFO',
  `source` VARCHAR(50) DEFAULT 'PLC',
  `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `shift` VARCHAR(10) DEFAULT NULL,
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. CCTV Cameras (Dynamic RTSP links for monitoring)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cctv_cameras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `camera_name` VARCHAR(100) NOT NULL,
  `location` VARCHAR(100) DEFAULT NULL,
  `rtsp_url` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table `security_guards_status`
--

CREATE TABLE `security_guards_status` (
  `id` int NOT NULL,
  `user_id` int UNSIGNED NOT NULL COMMENT 'FK → mewah_auth.users.id',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama pendek tampilan, e.g. AHMAD',
  `fullName` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama lengkap satpam',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Security Officer',
  `current_station_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'FK → security_stations.station_key',
  `status` enum('active','standby','sos') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standby',
  `color` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#00FF00' COMMENT 'Kode HEX warna marker UI, e.g. #00FF00',
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'Latitude GPS posisi terakhir',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Longitude GPS posisi terakhir',
  `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Status real-time satpam bertugas dan posisi map terakhir';

--
-- Dumping data for table `security_guards_status`
--

INSERT INTO `security_guards_status` (`id`, `user_id`, `name`, `fullName`, `position`, `current_station_key`, `status`, `color`, `latitude`, `longitude`, `last_update`) VALUES
(1, 7, 'SECURITY', 'security', 'security', 'main_gate', 'active', '#00FF00', '3.68272100', '98.70411740', '2026-07-17 07:25:46');

-- --------------------------------------------------------

--
-- Table structure for table `security_incidents`
--

CREATE TABLE `security_incidents` (
  `id` int NOT NULL,
  `incident_code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nomor unik otomatis: INC001, INC002...',
  `incident_type` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. Suspicious Activity, Equipment Damage, Trespassing',
  `location` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. Main Entrance, Boiler House',
  `reported_by` int UNSIGNED NOT NULL COMMENT 'FK → mewah_auth.users.id (Satpam)',
  `reported_by_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama Satpam pelapor (snapshot)',
  `reported_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('SUBMITTED','REVIEWED','RESOLVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUBMITTED',
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Deskripsi lengkap kejadian',
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path/URL foto bukti laporan',
  `resolved_at` timestamp NULL DEFAULT NULL COMMENT 'Tanggal diselesaikan',
  `resolved_by` int UNSIGNED DEFAULT NULL COMMENT 'FK → mewah_auth.users.id (Supervisor/Admin)',
  `resolved_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama penyelesai (snapshot)',
  `resolved_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Catatan solusi / penyelesaian',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Laporan insiden keamanan pabrik oleh satpam';

--
-- Dumping data for table `security_incidents`
--

INSERT INTO `security_incidents` (`id`, `incident_code`, `incident_type`, `location`, `reported_by`, `reported_by_name`, `reported_at`, `status`, `priority`, `description`, `photo_path`, `resolved_at`, `resolved_by`, `resolved_by_name`, `resolved_notes`, `created_at`, `updated_at`) VALUES
(1, 'INC001', 'wow', 'sterilizer', 7, 'security', '2026-07-07 04:38:28', 'SUBMITTED', 'MEDIUM', 'tes', NULL, NULL, NULL, NULL, NULL, '2026-07-07 04:38:28', '2026-07-07 04:38:28');

-- --------------------------------------------------------

--
-- Table structure for table `security_patrol_sessions`
--

CREATE TABLE `security_patrol_sessions` (
  `id` int NOT NULL,
  `session_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nomor unik otomatis: PS-YYYYMMDD-XXXX',
  `guard_id` int UNSIGNED NOT NULL COMMENT 'FK → mewah_auth.users.id (Satpam pelaksana)',
  `guard_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama Satpam (snapshot)',
  `shift` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Morning Shift, Pagi, Siang, Malam, dll',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','completed','abandoned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sesi patroli satpam keliling pabrik';

--
-- Dumping data for table `security_patrol_sessions`
--

INSERT INTO `security_patrol_sessions` (`id`, `session_code`, `guard_id`, `guard_name`, `shift`, `started_at`, `completed_at`, `status`, `created_at`, `updated_at`) VALUES
(1, 'PS-20260711-0001', 7, 'security', 'Morning Shift', '2026-07-11 02:10:27', '2026-07-17 02:52:13', 'completed', '2026-07-11 02:10:27', '2026-07-17 02:52:13'),
(2, 'PS-20260717-0001', 7, 'security', 'Morning Shift', '2026-07-17 02:52:17', '2026-07-17 02:55:45', 'completed', '2026-07-17 02:52:17', '2026-07-17 02:55:45'),
(3, 'PS-20260717-0002', 7, 'security', 'Morning Shift', '2026-07-17 03:40:26', '2026-07-17 03:40:33', 'completed', '2026-07-17 03:40:26', '2026-07-17 03:40:33'),
(4, 'PS-20260717-0003', 7, 'security', 'Morning Shift', '2026-07-17 03:47:53', '2026-07-17 03:48:02', 'completed', '2026-07-17 03:47:53', '2026-07-17 03:48:02'),
(5, 'PS-20260717-0004', 7, 'security', 'Morning Shift', '2026-07-17 04:03:29', '2026-07-17 04:03:50', 'completed', '2026-07-17 04:03:29', '2026-07-17 04:03:50'),
(6, 'PS-20260717-0005', 7, 'security', 'Morning Shift', '2026-07-17 04:05:17', '2026-07-17 04:05:26', 'completed', '2026-07-17 04:05:17', '2026-07-17 04:05:26'),
(7, 'PS-20260717-0006', 7, 'security', 'Morning Shift', '2026-07-17 04:17:02', '2026-07-17 04:17:36', 'completed', '2026-07-17 04:17:02', '2026-07-17 04:17:36'),
(8, 'PS-20260717-0007', 7, 'security', 'Morning Shift', '2026-07-17 04:17:38', '2026-07-17 04:18:24', 'completed', '2026-07-17 04:17:38', '2026-07-17 04:18:24'),
(9, 'PS-20260717-0008', 7, 'security', 'Morning Shift', '2026-07-17 04:18:36', '2026-07-17 04:20:07', 'completed', '2026-07-17 04:18:36', '2026-07-17 04:20:07'),
(10, 'PS-20260717-0009', 7, 'security', 'Morning Shift', '2026-07-17 04:20:20', '2026-07-17 04:22:32', 'completed', '2026-07-17 04:20:20', '2026-07-17 04:22:32'),
(11, 'PS-20260717-0010', 7, 'security', 'Morning Shift', '2026-07-17 04:24:55', '2026-07-17 04:25:46', 'completed', '2026-07-17 04:24:55', '2026-07-17 04:25:46'),
(12, 'PS-20260717-0011', 7, 'security', 'Morning Shift', '2026-07-17 04:25:47', '2026-07-17 04:26:27', 'completed', '2026-07-17 04:25:47', '2026-07-17 04:26:27'),
(13, 'PS-20260717-0012', 7, 'security', 'Morning Shift', '2026-07-17 04:26:28', '2026-07-17 04:28:16', 'completed', '2026-07-17 04:26:28', '2026-07-17 04:28:16'),
(14, 'PS-20260717-0013', 7, 'security', 'Morning Shift', '2026-07-17 04:30:30', '2026-07-17 04:31:53', 'completed', '2026-07-17 04:30:30', '2026-07-17 04:31:53'),
(15, 'PS-20260717-0014', 7, 'security', 'Morning Shift', '2026-07-17 04:31:55', '2026-07-17 04:34:40', 'completed', '2026-07-17 04:31:55', '2026-07-17 04:34:40'),
(16, 'PS-20260717-0015', 7, 'security', 'Morning Shift', '2026-07-17 04:42:02', '2026-07-17 04:44:39', 'completed', '2026-07-17 04:42:02', '2026-07-17 04:44:39'),
(17, 'PS-20260717-0016', 7, 'security', 'Morning Shift', '2026-07-17 04:46:38', '2026-07-17 04:51:52', 'completed', '2026-07-17 04:46:38', '2026-07-17 04:51:52'),
(18, 'PS-20260717-0017', 7, 'security', 'Morning Shift', '2026-07-17 05:02:56', '2026-07-17 06:46:21', 'completed', '2026-07-17 05:02:56', '2026-07-17 06:46:21'),
(19, 'PS-20260717-0018', 7, 'security', 'Morning Shift', '2026-07-17 06:55:54', '2026-07-17 06:57:14', 'completed', '2026-07-17 06:55:54', '2026-07-17 06:57:14'),
(20, 'PS-20260717-0019', 7, 'security', 'Morning Shift', '2026-07-17 06:58:13', '2026-07-17 07:03:50', 'completed', '2026-07-17 06:58:13', '2026-07-17 07:03:50'),
(21, 'PS-20260717-0020', 7, 'security', 'Morning Shift', '2026-07-17 07:04:29', '2026-07-17 07:08:16', 'completed', '2026-07-17 07:04:29', '2026-07-17 07:08:16'),
(22, 'PS-20260717-0021', 7, 'security', 'Morning Shift', '2026-07-17 07:14:31', '2026-07-17 07:20:15', 'completed', '2026-07-17 07:14:31', '2026-07-17 07:20:15'),
(23, 'PS-20260717-0022', 7, 'security', 'Morning Shift', '2026-07-17 07:21:10', NULL, 'active', '2026-07-17 07:21:10', '2026-07-17 07:21:10');

-- --------------------------------------------------------

--
-- Table structure for table `security_queue_classifications`
--

CREATE TABLE `security_queue_classifications` (
  `id` int NOT NULL,
  `code` char(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Prefix nomor antrian: U, M, C, K, S',
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'e.g. FFB Umum, FFB Mitra',
  `requires_grading` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 jika klasifikasi ini wajib melalui grading',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master klasifikasi jenis angkutan';

--
-- Dumping data for table `security_queue_classifications`
--

INSERT INTO `security_queue_classifications` (`id`, `code`, `label`, `requires_grading`, `sort_order`, `is_active`) VALUES
(1, 'U', 'FFB Umum', 1, 1, 1),
(2, 'M', 'FFB Mitra', 1, 2, 1),
(3, 'C', 'Crude Palm Oil', 0, 3, 1),
(4, 'K', 'Palm Kernel', 0, 4, 1),
(5, 'S', 'Palm Kernel Shell', 0, 5, 1);

-- --------------------------------------------------------

--
-- Table structure for table `security_queue_counters`
--

CREATE TABLE `security_queue_counters` (
  `id` int NOT NULL,
  `queue_date` date NOT NULL,
  `classification_code` char(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_sequence` int NOT NULL DEFAULT '0' COMMENT 'Terakhir dikeluarkan (buat generate nomor baru)',
  `current_sequence` int NOT NULL DEFAULT '0' COMMENT 'Sedang dilayani (Nomor Sekarang di ticket board)',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Counter nomor antrian per tanggal per klasifikasi';

--
-- Dumping data for table `security_queue_counters`
--

INSERT INTO `security_queue_counters` (`id`, `queue_date`, `classification_code`, `last_sequence`, `current_sequence`, `updated_at`) VALUES
(1, '2026-07-02', 'U', 3, 0, '2026-07-02 08:58:27'),
(3, '2026-07-02', 'M', 1, 0, '2026-07-02 07:14:18'),
(5, '2026-07-06', 'C', 1, 0, '2026-07-06 06:57:34'),
(7, '2026-07-06', 'S', 2, 0, '2026-07-06 15:28:07'),
(16, '2026-07-07', 'K', 1, 0, '2026-07-07 03:31:03'),
(20, '2026-07-07', 'U', 2, 0, '2026-07-07 09:15:36');

-- --------------------------------------------------------

--
-- Table structure for table `security_session_checkpoints`
--

CREATE TABLE `security_session_checkpoints` (
  `id` int NOT NULL,
  `session_id` int NOT NULL COMMENT 'FK → security_patrol_sessions.id',
  `checkpoint_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `station_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama stasiun checkpoint (snapshot)',
  `status` enum('pending','verified','secure') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verified_at` timestamp NULL DEFAULT NULL COMMENT 'Waktu verifikasi dilakukan',
  `verified_by` int UNSIGNED DEFAULT NULL COMMENT 'FK → mewah_auth.users.id (Satpam)',
  `verified_by_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama Satpam verifikator (snapshot)',
  `verification_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL/Path foto verifikasi',
  `verification_notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Catatan temuan saat cek stasiun',
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'GPS Lat saat submit verifikasi',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'GPS Lng saat submit verifikasi',
  `gps_accuracy` decimal(5,2) DEFAULT NULL COMMENT 'Akurasi GPS (meter)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar status verifikasi checkpoint per sesi patroli';

--
-- Dumping data for table `security_session_checkpoints`
--

INSERT INTO `security_session_checkpoints` (`id`, `session_id`, `checkpoint_code`, `station_name`, `status`, `verified_at`, `verified_by`, `verified_by_name`, `verification_photo`, `verification_notes`, `latitude`, `longitude`, `gps_accuracy`, `created_at`, `updated_at`) VALUES
(1, 1, 'CP-01', 'Main Gate', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(2, 1, 'CP-02', 'Boiler House', 'verified', '2026-07-11 02:10:43', 7, 'security', NULL, 'Ada masalah ni', '3.68412000', '98.70420000', NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:43'),
(3, 1, 'CP-03', 'Sterilizer', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(4, 1, 'CP-04', 'Loading Ramp', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(5, 1, 'CP-05', 'Engine Room', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(6, 1, 'CP-07', 'Water Treatment', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(7, 1, 'CP-08', 'Kernel Station', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(8, 1, 'CP-09', 'Clarification', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(9, 1, 'CP-14', 'PT Premier Enggineering Indonesia', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-11 02:10:27', '2026-07-11 02:10:27'),
(10, 8, 'DCP-1784261883580', 'tangki', 'verified', '2026-07-17 04:18:07', 7, 'security', 'http://192.168.0.184:3200/uploads/img-1784261884815-963793426.jpg', 'tangki', '3.68229200', '98.70377200', NULL, '2026-07-17 04:18:07', '2026-07-17 04:18:07'),
(11, 22, 'DCP-1784272493522', 'PREMIER', 'verified', '2026-07-17 07:14:59', 7, 'security', 'http://192.168.0.184:3200/uploads/img-1784272495511-55529804.jpg', 'Checkpoint: PREMIER', '3.68186356', '98.70402975', NULL, '2026-07-17 07:14:59', '2026-07-17 07:14:59'),
(12, 23, 'DCP-1784272930427', 'Tes', 'verified', '2026-07-17 07:22:15', 7, 'security', 'http://192.168.0.184:3200/uploads/img-1784272932381-382703495.jpg', 'Checkpoint: Tes', '3.68281290', '98.70418010', NULL, '2026-07-17 07:22:15', '2026-07-17 07:22:15');

-- --------------------------------------------------------

--
-- Table structure for table `security_stations`
--

CREATE TABLE `security_stations` (
  `id` int NOT NULL,
  `station_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Key untuk frontend, e.g. main_gate, boiler_house',
  `checkpoint_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Kode checkpoint e.g. CP-01, CP-02 (NULL jika bukan checkpoint patroli utama)',
  `label` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama tampilan stasiun',
  `operator_station` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama stasiun operator (sesuai appStations) yang bertanggung jawab atas checkpoint ini. NULL = tidak ada operator terkait.',
  `normalized_x` decimal(5,4) NOT NULL COMMENT 'Koordinat X pada kanvas peta (0.0000 s/d 1.0000)',
  `normalized_y` decimal(5,4) NOT NULL COMMENT 'Koordinat Y pada kanvas peta (0.0000 s/d 1.0000)',
  `latitude` decimal(10,8) DEFAULT NULL COMMENT 'Koordinat GPS Latitude',
  `longitude` decimal(11,8) DEFAULT NULL COMMENT 'Koordinat GPS Longitude',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = aktif digunakan, 0 = dinonaktifkan',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar stasiun dan titik checkpoint patroli satpam';

--
-- Dumping data for table `security_stations`
--

INSERT INTO `security_stations` (`id`, `station_key`, `checkpoint_code`, `label`, `operator_station`, `normalized_x`, `normalized_y`, `latitude`, `longitude`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'main_gate', 'CP-01', 'Main Gate', NULL, '0.0720', '0.9000', '3.68229200', '98.70377200', 1, '2026-06-26 03:12:38', '2026-06-26 04:56:43'),
(2, 'boiler_house', 'CP-02', 'Boiler House', 'Boiler House', '0.3520', '0.4400', '3.68412000', '98.70420000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(3, 'sterilizer', 'CP-03', 'Sterilizer', 'Sterilizer Station', '0.7800', '0.5300', '3.68350000', '98.70510000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(4, 'loading_ramp', 'CP-04', 'Loading Ramp', 'Loading Ramp', '0.6900', '0.6400', '3.68380000', '98.70490000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(5, 'engine_room', 'CP-05', 'Engine Room', 'Engine Room', '0.2450', '0.5600', '3.68430000', '98.70410000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(7, 'water_treatment', 'CP-07', 'Water Treatment', 'Raw Water Treatment', '0.6500', '0.4600', '3.68390000', '98.70470000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(8, 'kernel_station', 'CP-08', 'Kernel Station', 'Kernel Plant', '0.3520', '0.5600', '3.68420000', '98.70440000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(9, 'clarification', 'CP-09', 'Clarification', 'Oil Clarification Room', '0.4800', '0.5600', '3.68405000', '98.70450000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(15, 'grading_ramp', NULL, 'Grading Ramp', 'Grading Ramp', '0.5020', '0.8800', '3.68395000', '98.70455000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(17, 'threshing', NULL, 'Threshing Station', 'Threshing Station', '0.5200', '0.4400', '3.68402000', '98.70458000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(18, 'efb_plant', NULL, 'EFB Plant', 'EFB Plant', '0.6100', '0.4400', '3.68392000', '98.70478000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(19, 'press_station', NULL, 'Press Station', 'Press Station', '0.4200', '0.4800', '3.68415000', '98.70435000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(20, 'anaerobic_pond', NULL, 'Anaerobic Pond', 'Effluent Treatment', '0.7800', '0.3200', '3.68340000', '98.70520000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(21, 'aerobic_pond', NULL, 'Aerobic Pond', 'Effluent Treatment', '0.8500', '0.3200', '3.68320000', '98.70535000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(22, 'effluent', NULL, 'Final Discharge', 'Effluent Treatment', '0.9200', '0.3200', '3.68305000', '98.70548000', 1, '2026-06-26 03:12:38', '2026-07-10 07:21:37'),
(24, 'pt_premier_enggineering', 'CP-14', 'PT Premier Enggineering Indonesia', NULL, '0.2342', '0.8760', '3.68164330', '98.70421860', 1, '2026-06-26 04:43:10', '2026-06-26 04:43:10');

-- --------------------------------------------------------

--
-- Table structure for table `security_truck_queues`
--

CREATE TABLE `security_truck_queues` (
  `id` int NOT NULL,
  `queue_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Kode antrian unik (contoh: Q-20260626-001)',
  `classification_code` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'U' COMMENT 'FK -> security_queue_classifications.code',
  `queue_date` date NOT NULL COMMENT 'Tanggal pembuatan antrian',
  `sequence_number` int NOT NULL COMMENT 'Nomor urut antrian harian',
  `driver_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama lengkap sopir',
  `no_sim` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nomor SIM sopir',
  `license_plate` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nomor polisi kendaraan',
  `no_do` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nomor Delivery Order / Surat Jalan',
  `transporter_company` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama perusahaan/vendor angkutan',
  `perusahaan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PERUSAHAAN pada form, bisa beda dari transporter_company',
  `driver_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path file foto sopir/truk dari kamera',
  `status` enum('WAITING','WEIGH_IN','GRADING','PENDING','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `check_in_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu truk didaftarkan oleh satpam',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Catatan tambahan dari satpam',
  `pending_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Diisi saat status berubah jadi PENDING',
  `registered_by` int UNSIGNED NOT NULL COMMENT 'ID Satpam yang mendaftarkan',
  `registered_by_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama Satpam (snapshot)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Antrian truk yang didaftarkan oleh petugas keamanan';

--
-- Dumping data for table `security_truck_queues`
--

INSERT INTO `security_truck_queues` (`id`, `queue_code`, `classification_code`, `queue_date`, `sequence_number`, `driver_name`, `no_sim`, `license_plate`, `no_do`, `transporter_company`, `perusahaan`, `driver_photo`, `status`, `check_in_at`, `notes`, `pending_reason`, `registered_by`, `registered_by_name`, `created_at`, `updated_at`) VALUES
(1, 'U01', 'U', '2026-07-07', 1, 'Fahri', '12345', 'BK 0898 AKU', 'D0-214456', 'Tes', 'PT SKL', 'http://192.168.0.183:3200/uploads/img-1783407413738-530777651.jpg', 'COMPLETED', '2026-07-07 06:57:11', 'tes', NULL, 7, 'security', '2026-07-07 06:57:11', '2026-07-07 06:57:57'),
(2, 'U02', 'U', '2026-07-07', 2, 'Fahri', '1234567', 'BK 2356 AKU', 'D0-2016-2334', 'Ted', 'Tes', 'http://192.168.0.183:3200/uploads/img-1783415732143-264116749.jpg', 'WAITING', '2026-07-07 09:15:36', 'tes', NULL, 7, 'security', '2026-07-07 09:15:36', '2026-07-07 09:15:36');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `security_guards_status`
--
ALTER TABLE `security_guards_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sgs_user_id` (`user_id`),
  ADD KEY `idx_sgs_status` (`status`),
  ADD KEY `fk_sgs_station` (`current_station_key`);

--
-- Indexes for table `security_incidents`
--
ALTER TABLE `security_incidents`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_si_incident_code` (`incident_code`),
  ADD KEY `idx_si_status` (`status`),
  ADD KEY `idx_si_priority` (`priority`),
  ADD KEY `idx_si_reporter` (`reported_by`),
  ADD KEY `idx_si_reported_at` (`reported_at`);

--
-- Indexes for table `security_patrol_sessions`
--
ALTER TABLE `security_patrol_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sps_session_code` (`session_code`),
  ADD KEY `idx_sps_guard` (`guard_id`),
  ADD KEY `idx_sps_status` (`status`),
  ADD KEY `idx_sps_started` (`started_at`);

--
-- Indexes for table `security_queue_classifications`
--
ALTER TABLE `security_queue_classifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sqc_code` (`code`);

--
-- Indexes for table `security_queue_counters`
--
ALTER TABLE `security_queue_counters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sqcnt_date_class` (`queue_date`,`classification_code`),
  ADD KEY `fk_sqcnt_class` (`classification_code`);

--
-- Indexes for table `security_session_checkpoints`
--
ALTER TABLE `security_session_checkpoints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ssc_session` (`session_id`),
  ADD KEY `idx_ssc_code` (`checkpoint_code`),
  ADD KEY `idx_ssc_status` (`status`);

--
-- Indexes for table `security_stations`
--
ALTER TABLE `security_stations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ss_station_key` (`station_key`),
  ADD UNIQUE KEY `uq_ss_checkpoint_code` (`checkpoint_code`),
  ADD KEY `idx_ss_active` (`is_active`),
  ADD KEY `idx_ss_operator_station` (`operator_station`);

--
-- Indexes for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_security_queue_code` (`queue_code`),
  ADD UNIQUE KEY `uq_stq_date_class_seq` (`queue_date`,`classification_code`,`sequence_number`),
  ADD KEY `idx_queue_date_sequence` (`queue_date`,`sequence_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_license_plate` (`license_plate`),
  ADD KEY `idx_stq_classification` (`classification_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `security_guards_status`
--
ALTER TABLE `security_guards_status`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16614;

--
-- AUTO_INCREMENT for table `security_incidents`
--
ALTER TABLE `security_incidents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `security_patrol_sessions`
--
ALTER TABLE `security_patrol_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `security_queue_classifications`
--
ALTER TABLE `security_queue_classifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `security_queue_counters`
--
ALTER TABLE `security_queue_counters`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `security_session_checkpoints`
--
ALTER TABLE `security_session_checkpoints`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `security_stations`
--
ALTER TABLE `security_stations`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `security_guards_status`
--
ALTER TABLE `security_guards_status`
  ADD CONSTRAINT `fk_sgs_station` FOREIGN KEY (`current_station_key`) REFERENCES `security_stations` (`station_key`) ON DELETE SET NULL;

--
-- Constraints for table `security_queue_counters`
--
ALTER TABLE `security_queue_counters`
  ADD CONSTRAINT `fk_sqcnt_class` FOREIGN KEY (`classification_code`) REFERENCES `security_queue_classifications` (`code`);

--
-- Constraints for table `security_session_checkpoints`
--
ALTER TABLE `security_session_checkpoints`
  ADD CONSTRAINT `fk_ssc_session` FOREIGN KEY (`session_id`) REFERENCES `security_patrol_sessions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  ADD CONSTRAINT `fk_stq_classification` FOREIGN KEY (`classification_code`) REFERENCES `security_queue_classifications` (`code`);




SET FOREIGN_KEY_CHECKS = 1;


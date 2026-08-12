-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION AI: mewah_security_ai
-- ═══════════════════════════════════════════════════════════════════════
-- Database khusus terisolasi untuk Modul AI Stasiun Security.
-- Menampung log deteksi 5 fitur AI Vision (APD, FIRE, HUMAN, LPR, OILDISPATCH),
-- konfigurasi kamera RTSP, area ROI, dan telemetry.

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `mewah_security_ai`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mewah_security_ai`;

-- ── DB Users (Application-Level access khusus AI) ──
CREATE USER IF NOT EXISTS 'kip_ai_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON mewah_security_ai.* TO 'kip_ai_user'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- 1. CCTV RTSP Stream Configurations
--    Menyimpan link RTSP mentah dari kamera Hikvision/IP Cam per-stasiun
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_ai_cctv_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL UNIQUE,          -- e.g. CAM_SECURITY_01, CAM_STERILIZER_01
  `camera_name` VARCHAR(100) NOT NULL,                 -- e.g. Kamera Pos Security Utama
  `station_slug` VARCHAR(50) NOT NULL,                -- e.g. boiler_house, engine_room, kernel_plant, press, security, sterilizer, threshing
  `rtsp_url` VARCHAR(255) NOT NULL,                    -- e.g. rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/102
  `stream_fps` INT DEFAULT 15,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. Region of Interest (ROI) Configurations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_ai_roi_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `roi_name` VARCHAR(100) NOT NULL,
  `roi_type` VARCHAR(50) NOT NULL,                     -- e.g. APD_ZONE, FIRE_ZONE, HUMAN_ZONE, LPR_ZONE, OILDISPATCH_ZONE
  `coordinates_json` TEXT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────
-- 3. AI Detection Logs (General Master & Feature Specific)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_ai_detection_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL,                      -- e.g. APD, FIRE, HUMAN, LPR, OILDISPATCH
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `plate_no` VARCHAR(50) DEFAULT NULL,                 -- Deteksi plat mobil/truk (khusus LPR, NULL untuk kategori lain)
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi
  `confidence_score` FLOAT DEFAULT NULL,
  `bounding_box_json` JSON DEFAULT NULL,
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. Feature Specific Telemetry Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `security_ai_apd_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi APD
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_ai_fire_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi Fire/Smoke
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_ai_human_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi Human Trespasser
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_ai_lpr_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `plate_no` VARCHAR(50) DEFAULT NULL,                 -- Deteksi plat mobil/truk (khusus LPR)
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi LPR
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_ai_oildispatch_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `camera_code` VARCHAR(50) NOT NULL,
  `camera_name` VARCHAR(100) DEFAULT NULL,
  `station_slug` VARCHAR(50) NOT NULL,
  `detection_detail` VARCHAR(255) DEFAULT NULL,        -- Label/target detail hasil deteksi Oil Dispatch
  `snapshot_path` VARCHAR(255) DEFAULT NULL,          -- Path/URL view snapshot (.jpg)
  `detected_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`camera_code`) REFERENCES `security_ai_cctv_configs`(`camera_code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `security_ai_recommendations` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `station_slug` VARCHAR(50) NOT NULL,
  `recommendation_type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `action_payload_json` JSON DEFAULT NULL,
  `is_applied` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
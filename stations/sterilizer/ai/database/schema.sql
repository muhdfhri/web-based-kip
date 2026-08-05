CREATE DATABASE IF NOT EXISTS `mewah_sterilizer_ai`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `mewah_sterilizer_ai`;

-- Detailed inference output. This is an audit/history table, not the PLC interface.
CREATE TABLE IF NOT EXISTS `ai_grading_detections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `line_no` SMALLINT UNSIGNED NOT NULL,
  `camera_code` VARCHAR(64) NOT NULL,
  `category` ENUM('RIPE', 'UNRIPE', 'OVERRIPE') NOT NULL,
  `confidence` DECIMAL(6,5) NOT NULL,
  `bounding_box_json` JSON DEFAULT NULL,
  `model_version` VARCHAR(100) DEFAULT NULL,
  `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_grading_detection_line_time` (`line_no`, `detected_at`),
  KEY `idx_grading_detection_category_time` (`category`, `detected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historical decision windows used for reports and traceability.
CREATE TABLE IF NOT EXISTS `ai_grading_decision_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `line_no` SMALLINT UNSIGNED NOT NULL,
  `camera_code` VARCHAR(64) NOT NULL,
  `window_started_at` DATETIME(3) NOT NULL,
  `window_ended_at` DATETIME(3) NOT NULL,
  `ripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `unripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `overripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `majority_category` ENUM('RIPE', 'UNRIPE', 'OVERRIPE', 'INSUFFICIENT_DATA') NOT NULL,
  `majority_percentage` DECIMAL(6,3) NOT NULL DEFAULT 0,
  `recommended_recipe_code` VARCHAR(64) DEFAULT NULL,
  `recommended_recipe_name` VARCHAR(150) DEFAULT NULL,
  `recipe_parameters_json` JSON DEFAULT NULL,
  `model_version` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_grading_history_line_time` (`line_no`, `window_ended_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- READ INTERFACE FOR STERILIZER:
-- Exactly one latest result per line. Sterilizer reads this table; AI owns the writes.
CREATE TABLE IF NOT EXISTS `ai_grading_line_results` (
  `line_no` SMALLINT UNSIGNED NOT NULL,
  `camera_code` VARCHAR(64) NOT NULL,
  `window_started_at` DATETIME(3) NOT NULL,
  `window_ended_at` DATETIME(3) NOT NULL,
  `ripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `unripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `overripe_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `majority_category` ENUM('RIPE', 'UNRIPE', 'OVERRIPE', 'INSUFFICIENT_DATA') NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  `majority_percentage` DECIMAL(6,3) NOT NULL DEFAULT 0,
  `recommended_recipe_code` VARCHAR(64) DEFAULT NULL,
  `recommended_recipe_name` VARCHAR(150) DEFAULT NULL,
  `recipe_parameters_json` JSON DEFAULT NULL,
  `decision_status` ENUM('READY', 'INSUFFICIENT_DATA', 'CAMERA_OFFLINE', 'MODEL_OFFLINE') NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  `model_version` VARCHAR(100) DEFAULT NULL,
  `result_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`line_no`),
  KEY `idx_grading_result_status` (`decision_status`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Safe read-only query intended for the Sterilizer backend.
CREATE OR REPLACE VIEW `v_sterilizer_ai_recipe_input` AS
SELECT
  `line_no`,
  `majority_category`,
  `majority_percentage`,
  `recommended_recipe_code`,
  `recommended_recipe_name`,
  `recipe_parameters_json`,
  `decision_status`,
  `result_version`,
  `updated_at`
FROM `ai_grading_line_results`;


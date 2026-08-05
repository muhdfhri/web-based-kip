// ═══════════════════════════════════════════════════════════════════════
// MEWAH-KIP — PM2 Ecosystem Config
// ═══════════════════════════════════════════════════════════════════════
//
// PM2 adalah process manager untuk Node.js — jalankan SEMUA service
// sekaligus dengan SATU perintah, tanpa buka banyak terminal.
//
// INSTALL PM2:  npm install -g pm2
//
// PERINTAH:
//   pm2 start ecosystem.config.cjs        → start semua service
//   pm2 start ecosystem.config.cjs --only auth-service   → start 1 service
//   pm2 stop all                           → stop semua
//   pm2 restart all                        → restart semua
//   pm2 logs                               → lihat semua log
//   pm2 logs auth-service                  → log 1 service
//   pm2 monit                              → monitor CPU/RAM real-time
//   pm2 list                               → status semua service
//   pm2 save                               → simpan config untuk auto-start
//   pm2 startup                            → auto-start saat Windows boot
//
// TIPS UNTUK TIM:
//   Dev 1:  pm2 start ecosystem.config.cjs --only "auth-service,config-service"
//   Dev 2:  pm2 start ecosystem.config.cjs --only "realtime-service,station-service,snap7-collector"
//   Dev 3:  pm2 start ecosystem.config.cjs --only "maintenance-service,logsheet-service,grading-service,reporting-service"
// ═══════════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    // ─────────────────────────────────────────────────────────────
    // DEV 1 — Auth & Config
    // ─────────────────────────────────────────────────────────────
    {
      name: "main-service",
      script: "src/server.js",
      cwd: "./main-service/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/main-service.err.log",
      out_file: "./logs/main-service.out.log",
    },
    {
      name: "frontend-shell",
      script: "node_modules/vite/bin/vite.js",
      args: "--port 5177 --host 0.0.0.0",
      cwd: "./main-service/frontend",
      watch: false,
      autorestart: true,
      max_memory_restart: "250M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/frontend-shell.err.log",
      out_file: "./logs/frontend-shell.out.log",
    },

    // ─────────────────────────────────────────────────────────────
    // DEV 2 — Realtime & Station (PLC/OT Team)
    // ─────────────────────────────────────────────────────────────
    {
      name: "realtime-service",
      script: "src/server.js",
      cwd: "./services/realtime-service",
      watch: false,
      autorestart: true,
      max_memory_restart: "300M", // WebSocket service butuh lebih banyak RAM
      env: {
        NODE_ENV: "development",
        PORT: 3002,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/realtime-service.err.log",
      out_file: "./logs/realtime-service.out.log",
    },
    {
      name: "station-service",
      script: "src/server.js",
      cwd: "./services/station-service",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        PORT: 3003,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/station-service.err.log",
      out_file: "./logs/station-service.out.log",
    },
    {
      name: "security-station",
      script: "src/server.js",
      cwd: "./stations/security/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3101,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/security-station.err.log",
      out_file: "./logs/security-station.out.log",
    },
    {
      name: "security-ai-service",
      script: "app.py",
      interpreter: "python",
      cwd: "./stations/security/ai/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "500M",
      env: {
        PORT: 4101,
        FLASK_ENV: "production",
        DB_NAME_AI: "mewah_security_ai",
        REDIS_URL: "redis://127.0.0.1:6379"
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/security-ai.err.log",
      out_file: "./logs/security-ai.out.log",
    },
    /*
    {
      name: "weighbridge-station",
      script: "src/server.js",
      cwd: "./stations/weighbridge/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3102,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/weighbridge-station.err.log",
      out_file: "./logs/weighbridge-station.out.log",
    },
    {
      name: "grading-ramp-station",
      script: "src/server.js",
      cwd: "./stations/grading-ramp/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3103,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/grading-ramp-station.err.log",
      out_file: "./logs/grading-ramp-station.out.log",
    },
    {
      name: "loading-ramp-station",
      script: "src/server.js",
      cwd: "./stations/loading-ramp/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3104,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/loading-ramp-station.err.log",
      out_file: "./logs/loading-ramp-station.out.log",
    },
    */
    {
      name: "sterilizer-station",
      script: "src/server.js",
      cwd: "./stations/sterilizer/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        PORT: 3105,
        JWT_SECRET: "jwt_change_me_in_production",
        REDIS_URL: "redis://localhost:6379",
        TAG_PREFIX: "STERI_",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/sterilizer-station.err.log",
      out_file: "./logs/sterilizer-station.out.log",
    },
    {
      name: "threshing-station",
      script: "src/server.js",
      cwd: "./stations/threshing/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3106,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/threshing-station.err.log",
      out_file: "./logs/threshing-station.out.log",
    },
    /*
    {
      name: "efb-plant-station",
      script: "src/server.js",
      cwd: "./stations/efb-plant/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3107,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/efb-plant-station.err.log",
      out_file: "./logs/efb-plant-station.out.log",
    },
    */
    {
      name: "press-station",
      script: "src/server.js",
      cwd: "./stations/press/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3108,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/press-station.err.log",
      out_file: "./logs/press-station.out.log",
    },
    {
      name: "kernel-plant-station",
      script: "src/server.js",
      cwd: "./stations/kernel-plant/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3109,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/kernel-plant-station.err.log",
      out_file: "./logs/kernel-plant-station.out.log",
    },
    /*
    {
      name: "oil-clarification-station",
      script: "src/server.js",
      cwd: "./stations/oil-clarification/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3110,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/oil-clarification-station.err.log",
      out_file: "./logs/oil-clarification-station.out.log",
    },
    */
    {
      name: "boiler-house-station",
      script: "src/server.js",
      cwd: "./stations/boiler-house/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3111,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/boiler-house-station.err.log",
      out_file: "./logs/boiler-house-station.out.log",
    },
    {
      name: "engine-room-station",
      script: "src/server.js",
      cwd: "./stations/engine-room/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3112,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/engine-room-station.err.log",
      out_file: "./logs/engine-room-station.out.log",
    },
    /*
    {
      name: "raw-water-treatment-station",
      script: "src/server.js",
      cwd: "./stations/raw-water-treatment/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3113,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/raw-water-treatment-station.err.log",
      out_file: "./logs/raw-water-treatment-station.out.log",
    },
    {
      name: "daf-osr-station",
      script: "src/server.js",
      cwd: "./stations/daf-osr/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3114,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/daf-osr-station.err.log",
      out_file: "./logs/daf-osr-station.out.log",
    },
    {
      name: "cmrs-station",
      script: "src/server.js",
      cwd: "./stations/cmrs/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3115,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/cmrs-station.err.log",
      out_file: "./logs/cmrs-station.out.log",
    },
    {
      name: "effluent-treatment-station",
      script: "src/server.js",
      cwd: "./stations/effluent-treatment/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3116,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/effluent-treatment-station.err.log",
      out_file: "./logs/effluent-treatment-station.out.log",
    },
    */

    // ─────────────────────────────────────────────────────────────
    // DEV 3 — Maintenance, Logsheet, Grading, Reporting
    // ─────────────────────────────────────────────────────────────
    {
      name: "maintenance-service",
      script: "src/server.js",
      cwd: "./maintenance/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        PORT: 3200,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/maintenance-service.err.log",
      out_file: "./logs/maintenance-service.out.log",
    },
    {
      name: "alarm-service",
      script: "src/server.js",
      cwd: "./alarm/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        PORT: 3300,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/alarm-service.err.log",
      out_file: "./logs/alarm-service.out.log",
    },
    {
      name: "contacts-service",
      script: "src/server.js",
      cwd: "./contacts/backend",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3400,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/contacts-service.err.log",
      out_file: "./logs/contacts-service.out.log",
    },
    {
      name: "logsheet-service",
      script: "src/server.js",
      cwd: "./services/logsheet-service",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3005,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/logsheet-service.err.log",
      out_file: "./logs/logsheet-service.out.log",
    },
    {
      name: "grading-service",
      script: "src/server.js",
      cwd: "./services/grading-service",
      watch: false,
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "development",
        PORT: 3006,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/grading-service.err.log",
      out_file: "./logs/grading-service.out.log",
    },
    {
      name: "reporting-service",
      script: "src/server.js",
      cwd: "./services/reporting-service",
      watch: false,
      autorestart: true,
      max_memory_restart: "150M",
      env: {
        NODE_ENV: "development",
        PORT: 3007,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/reporting-service.err.log",
      out_file: "./logs/reporting-service.out.log",
    },
  ],
};

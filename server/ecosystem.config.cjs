// PM2 process manager configuration.
// Usage:
//   pm2 start ecosystem.config.cjs          # start / restart
//   pm2 save                                 # persist process list across reboots
//   pm2 startup                              # print the systemd/launchd command to enable autostart
//   pm2 logs ehr-api                         # tail logs
//   pm2 monit                                # live CPU/memory dashboard
module.exports = {
  apps: [
    {
      name: 'ehr-api',
      script: 'index.js',
      cwd: __dirname,

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,       // wait 3 s before restarting after a crash
      min_uptime: '10s',         // if it crashes in < 10 s, count as a failed restart

      // Clustering: use 'max' to spawn one worker per CPU core, or set a number
      instances: 1,              // single instance is fine for a small clinic
      exec_mode: 'fork',

      // Memory limit — restart the process if it exceeds 512 MB
      max_memory_restart: '512M',

      // Environment variables loaded from server/.env at runtime
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },

      // Log files (in addition to Winston file transport)
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown — give the app 10 s to finish in-flight requests
      kill_timeout: 10000,
      listen_timeout: 8000,

      // Watch mode: disabled in production (restart manually after deploys)
      watch: false,
    },
  ],
};

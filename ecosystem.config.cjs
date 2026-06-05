/**
 * PM2 Ecosystem Config — Clarity EHR
 * Ensures NODE_OPTIONS persists across restarts and reboots.
 */
module.exports = {
  apps: [
    {
      name: 'ehr-api',
      script: 'server/index.js',
      cwd: '/var/www/ehr',
      node_args: '--max-old-space-size=512',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '480M',   // PM2 restarts if heap exceeds 480MB
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'ehr-api-staging',
      script: 'server/index.js',
      cwd: '/var/www/ehr',
      node_args: '--max-old-space-size=256',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '240M',
      env: {
        NODE_ENV: 'staging',
        PORT: '5002',
      },
    },
  ],
};

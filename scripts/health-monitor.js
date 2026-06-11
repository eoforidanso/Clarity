#!/usr/bin/env node

/**
 * Health Monitor for Clarity EHR API
 * Checks server health every 5 minutes
 * Alerts if server is down or using too much memory/CPU
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CONFIG = {
  API_URL: 'http://localhost:5001',
  HEALTH_CHECK_PATH: '/api/health',
  CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  LOG_DIR: './logs',
  ALERT_LOG: './logs/alerts.log',
  MAX_MEMORY_MB: 900,
  MAX_CPU_PERCENT: 80,
  MAX_DOWN_COUNT: 2 // Alert after 2 consecutive failures
};

class HealthMonitor {
  constructor() {
    this.failureCount = 0;
    this.lastStatus = 'unknown';
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);

    // Log alerts to file
    if (level === 'ALERT' || level === 'ERROR') {
      fs.appendFileSync(CONFIG.ALERT_LOG, logEntry + '\n');
    }
  }

  async checkHealth() {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`${CONFIG.API_URL}${CONFIG.HEALTH_CHECK_PATH}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Status ${res.statusCode}`));
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(5000);
      });

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getProcessMetrics() {
    try {
      const output = execSync('pm2 jlist clarity-api', { encoding: 'utf8' });
      const processes = JSON.parse(output);

      if (processes.length === 0) {
        return { running: false };
      }

      const proc = processes[0];
      return {
        running: proc.pm2_env.status === 'online',
        memory_mb: Math.round(proc.monit.memory / 1024 / 1024),
        cpu_percent: proc.monit.cpu,
        uptime_seconds: proc.pm2_env.pm_uptime ? Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000) : 0,
        restarts: proc.pm2_env.restart_time || 0
      };
    } catch (error) {
      this.log(`Failed to get metrics: ${error.message}`, 'WARN');
      return { running: false };
    }
  }

  async monitor() {
    this.log('='.repeat(60));
    this.log('🔍 Health Check Started');

    const health = await this.checkHealth();
    const metrics = this.getProcessMetrics();

    // Check server status
    if (!health.success) {
      this.failureCount++;
      this.log(`❌ API Health Check FAILED: ${health.error}`, 'ERROR');

      if (this.failureCount >= CONFIG.MAX_DOWN_COUNT) {
        this.log(`🚨 ALERT: Server has been down for ${this.failureCount} checks!`, 'ALERT');
        this.restartServer();
      }
    } else {
      if (this.failureCount > 0) {
        this.log(`✅ Server recovered after ${this.failureCount} failures`, 'INFO');
      }
      this.failureCount = 0;
      this.log(`✅ API Health Check PASSED`, 'INFO');
    }

    // Check process status
    if (!metrics.running) {
      this.log(`❌ ALERT: clarity-api process is not running!`, 'ALERT');
      this.restartServer();
    } else {
      this.log(`✅ Process Running (PID monitoring)`, 'INFO');
    }

    // Check memory usage
    if (metrics.memory_mb > CONFIG.MAX_MEMORY_MB) {
      this.log(`⚠️ ALERT: High Memory Usage: ${metrics.memory_mb}MB (limit: ${CONFIG.MAX_MEMORY_MB}MB)`, 'ALERT');
      this.log('Consider restarting or increasing memory limit', 'WARN');
    } else if (metrics.memory_mb) {
      this.log(`📊 Memory: ${metrics.memory_mb}MB (OK)`, 'INFO');
    }

    // Check CPU usage
    if (metrics.cpu_percent > CONFIG.MAX_CPU_PERCENT) {
      this.log(`⚠️ ALERT: High CPU Usage: ${metrics.cpu_percent}% (limit: ${CONFIG.MAX_CPU_PERCENT}%)`, 'ALERT');
    } else if (metrics.cpu_percent !== undefined) {
      this.log(`📊 CPU: ${metrics.cpu_percent}% (OK)`, 'INFO');
    }

    // Log uptime
    if (metrics.uptime_seconds !== undefined) {
      const hours = Math.floor(metrics.uptime_seconds / 3600);
      const minutes = Math.floor((metrics.uptime_seconds % 3600) / 60);
      this.log(`⏱️ Uptime: ${hours}h ${minutes}m (Restarts: ${metrics.restarts})`, 'INFO');
    }

    this.log('Health Check Complete\n');
  }

  restartServer() {
    this.log('🔄 Attempting to restart clarity-api...', 'ALERT');
    try {
      execSync('pm2 restart clarity-api');
      this.log('✅ Server restart initiated', 'INFO');
    } catch (error) {
      this.log(`❌ Failed to restart server: ${error.message}`, 'ERROR');
    }
  }

  start() {
    this.log('✨ Health Monitor Started');
    this.log(`Check interval: ${CONFIG.CHECK_INTERVAL / 1000 / 60} minutes`);
    this.log(`Memory threshold: ${CONFIG.MAX_MEMORY_MB}MB`);
    this.log(`CPU threshold: ${CONFIG.MAX_CPU_PERCENT}%`);
    this.log('---');

    // Run first check immediately
    this.monitor();

    // Schedule recurring checks
    setInterval(() => this.monitor(), CONFIG.CHECK_INTERVAL);
  }
}

// Start monitor
const monitor = new HealthMonitor();
monitor.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  monitor.log('Monitor shutting down...', 'INFO');
  process.exit(0);
});

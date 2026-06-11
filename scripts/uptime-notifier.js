#!/usr/bin/env node

/**
 * Uptime Tracker & Reboot Notifier
 * Monitors server uptime and sends notifications on restarts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const UPTIME_FILE = './logs/uptime.json';
const REBOOT_LOG = './logs/reboots.log';
const LOGS_DIR = './logs';

class UptimeTracker {
  constructor() {
    this.ensureLogDir();
    this.loadUptimeData();
  }

  ensureLogDir() {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
  }

  loadUptimeData() {
    try {
      if (fs.existsSync(UPTIME_FILE)) {
        const data = JSON.parse(fs.readFileSync(UPTIME_FILE, 'utf8'));
        this.lastCheck = data.lastCheck;
        this.startTime = data.startTime;
        this.restartCount = data.restartCount || 0;
        this.totalUptime = data.totalUptime || 0;
        this.lastRestartTime = data.lastRestartTime;
      } else {
        this.startTime = Date.now();
        this.lastCheck = Date.now();
        this.restartCount = 0;
        this.totalUptime = 0;
        this.lastRestartTime = null;
      }
    } catch (error) {
      console.error('[UptimeTracker] Error loading data:', error.message);
      this.startTime = Date.now();
      this.lastCheck = Date.now();
      this.restartCount = 0;
      this.totalUptime = 0;
      this.lastRestartTime = null;
    }
  }

  saveUptimeData() {
    const data = {
      startTime: this.startTime,
      lastCheck: Date.now(),
      restartCount: this.restartCount,
      totalUptime: this.totalUptime,
      lastRestartTime: this.lastRestartTime,
      lastSaved: new Date().toISOString()
    };

    fs.writeFileSync(UPTIME_FILE, JSON.stringify(data, null, 2));
  }

  getProcessMetrics() {
    try {
      const output = execSync('pm2 jlist clarity-api', { encoding: 'utf8' });
      const processes = JSON.parse(output);

      if (processes.length === 0) {
        return null;
      }

      const proc = processes[0];
      return {
        pid: proc.pid,
        running: proc.pm2_env.status === 'online',
        uptime_ms: proc.pm2_env.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
        restart_count: proc.pm2_env.restart_time || 0,
        memory_mb: Math.round(proc.monit.memory / 1024 / 1024),
        cpu_percent: proc.monit.cpu
      };
    } catch (error) {
      return null;
    }
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  checkForRestart() {
    const metrics = this.getProcessMetrics();

    if (!metrics) {
      this.log('⚠️ Could not get process metrics', 'WARN');
      return;
    }

    // Check if process restarted (new PID or restart count increased)
    if (metrics.restart_count > this.restartCount) {
      const restartCount = metrics.restart_count - this.restartCount;

      this.log(`🔄 SERVER RESTART DETECTED! Restart count: ${metrics.restart_count}`, 'ALERT');

      // Log the reboot
      const rebootEntry = {
        timestamp: new Date().toISOString(),
        restartCount: metrics.restart_count,
        newPID: metrics.pid,
        previousRestarts: this.restartCount,
        totalRestarts: metrics.restart_count
      };

      fs.appendFileSync(REBOOT_LOG, JSON.stringify(rebootEntry) + '\n');

      this.restartCount = metrics.restart_count;
      this.lastRestartTime = Date.now();

      // Send notifications
      this.sendNotifications(metrics, restartCount);
    }
  }

  sendNotifications(metrics, restartCount) {
    const timestamp = new Date().toISOString();
    const message = `🔄 Server Restart Alert\n\nTimestamp: ${timestamp}\nRestart #${metrics.restart_count}\nNew PID: ${metrics.pid}\nMemory: ${metrics.memory_mb}MB\nCPU: ${metrics.cpu_percent}%`;

    this.log(message, 'ALERT');

    // Optional: Send email notification (requires setup)
    // this.sendEmailNotification(message);

    // Optional: Send SMS notification (requires Twilio setup)
    // this.sendSMSNotification(message);
  }

  sendEmailNotification(message) {
    // To implement: Use Resend or Nodemailer
    // Example for future:
    /*
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: 'alerts@clarity-ehr.com',
      to: process.env.ALERT_EMAIL,
      subject: '🔄 Clarity Server Restarted',
      text: message
    });
    */
    this.log('📧 [Email notification would be sent here]', 'INFO');
  }

  sendSMSNotification(message) {
    // To implement: Use Twilio
    // Example for future:
    /*
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.ALERT_PHONE
    });
    */
    this.log('📱 [SMS notification would be sent here]', 'INFO');
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);

    // Log alerts to file
    if (level === 'ALERT') {
      fs.appendFileSync(REBOOT_LOG, logEntry + '\n');
    }
  }

  printStats() {
    const metrics = this.getProcessMetrics();

    if (!metrics) {
      console.log('⚠️ Cannot get metrics');
      return;
    }

    const uptimeMs = metrics.uptime_ms;
    const formattedUptime = this.formatUptime(uptimeMs);

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 UPTIME & RESTART STATISTICS');
    console.log('═══════════════════════════════════════════════');
    console.log(`Current Uptime:      ${formattedUptime}`);
    console.log(`Restarts (Session):  ${metrics.restart_count}`);
    console.log(`Current PID:         ${metrics.pid}`);
    console.log(`Memory:              ${metrics.memory_mb} MB`);
    console.log(`CPU:                 ${metrics.cpu_percent}%`);
    console.log(`Status:              ${metrics.running ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

    if (this.lastRestartTime) {
      const timeSinceRestart = Date.now() - this.lastRestartTime;
      console.log(`Last Restart:        ${this.formatUptime(timeSinceRestart)} ago`);
    }

    console.log('═══════════════════════════════════════════════');
    console.log('');
  }

  monitor() {
    this.checkForRestart();
    this.saveUptimeData();
  }

  start() {
    this.log('✨ Uptime Tracker Started');
    this.printStats();

    // Run checks every minute
    setInterval(() => {
      this.monitor();
    }, 60 * 1000);

    // Print stats every 5 minutes
    setInterval(() => {
      this.printStats();
    }, 5 * 60 * 1000);
  }

  getUptimeJSON() {
    const metrics = this.getProcessMetrics();
    if (!metrics) return null;

    return {
      timestamp: new Date().toISOString(),
      uptime: this.formatUptime(metrics.uptime_ms),
      uptime_ms: metrics.uptime_ms,
      uptime_seconds: Math.floor(metrics.uptime_ms / 1000),
      restarts: metrics.restart_count,
      pid: metrics.pid,
      memory_mb: metrics.memory_mb,
      cpu_percent: metrics.cpu_percent,
      status: metrics.running ? 'online' : 'offline'
    };
  }
}

// Export for API usage
export { UptimeTracker };

// Start if run directly
const tracker = new UptimeTracker();
tracker.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
  tracker.log('Uptime tracker shutting down...', 'INFO');
  tracker.saveUptimeData();
  process.exit(0);
});

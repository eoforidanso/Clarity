import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPTIME_FILE = path.join(__dirname, '../..', 'logs/uptime.json');
const REBOOT_LOG = path.join(__dirname, '../..', 'logs/reboots.log');

import { validateResponse } from '../middleware/validateResponse.js';
import { AnyResponseSchema } from '../schemas/responseSchemas.js';

const router = express.Router();
router.use(validateResponse(AnyResponseSchema));

/**
 * GET /api/uptime
 * Returns current uptime and restart statistics
 */
router.get('/', (req, res) => {
  try {
    const metrics = getProcessMetrics();

    if (!metrics) {
      return res.status(503).json({
        error: 'Could not get process metrics',
        status: 'unavailable'
      });
    }

    const uptime = {
      timestamp: new Date().toISOString(),
      uptime: formatUptime(metrics.uptime_ms),
      uptime_seconds: Math.floor(metrics.uptime_ms / 1000),
      uptime_ms: metrics.uptime_ms,
      restarts_this_session: metrics.restart_count,
      current_pid: metrics.pid,
      memory_mb: metrics.memory_mb,
      cpu_percent: metrics.cpu_percent,
      status: metrics.running ? 'online' : 'offline',
      server_time: new Date().toISOString()
    };

    res.json(uptime);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/uptime/history
 * Returns reboot history
 */
router.get('/history', (req, res) => {
  try {
    if (!fs.existsSync(REBOOT_LOG)) {
      return res.json({ reboots: [], total: 0 });
    }

    const lines = fs.readFileSync(REBOOT_LOG, 'utf8').split('\n').filter(Boolean);
    const reboots = lines.map(line => {
      try {
        // Try to parse as JSON
        if (line.startsWith('{')) {
          return JSON.parse(line);
        }
        // Otherwise return as log entry
        return { raw: line };
      } catch {
        return { raw: line };
      }
    });

    res.json({
      total_reboots: reboots.length,
      last_reboot: reboots[reboots.length - 1] || null,
      reboots: reboots.reverse().slice(0, 50) // Last 50 reboots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/uptime/stats
 * Returns uptime statistics
 */
router.get('/stats', (req, res) => {
  try {
    const metrics = getProcessMetrics();

    if (!metrics) {
      return res.status(503).json({
        error: 'Could not get process metrics'
      });
    }

    const stats = {
      timestamp: new Date().toISOString(),
      current_uptime: {
        formatted: formatUptime(metrics.uptime_ms),
        seconds: Math.floor(metrics.uptime_ms / 1000),
        ms: metrics.uptime_ms
      },
      process: {
        pid: metrics.pid,
        memory_mb: metrics.memory_mb,
        memory_percent: Math.round((metrics.memory_mb / 1024) * 100 * 10) / 10, // % of 1GB
        cpu_percent: metrics.cpu_percent,
        status: metrics.running ? 'online' : 'offline'
      },
      restarts: {
        this_session: metrics.restart_count,
        threshold_warning: metrics.restart_count > 5 ? '⚠️ High restart count' : '✅ Normal'
      },
      health: {
        memory_ok: metrics.memory_mb < 900,
        cpu_ok: metrics.cpu_percent < 80,
        running: metrics.running,
        overall: metrics.running && metrics.memory_mb < 900 && metrics.cpu_percent < 80 ? '✅ Healthy' : '⚠️ Check issues'
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/uptime/dashboard
 * Returns HTML dashboard (for browser viewing)
 */
router.get('/dashboard', (req, res) => {
  try {
    const metrics = getProcessMetrics();

    if (!metrics) {
      return res.status(503).send('Metrics unavailable');
    }

    const uptime = formatUptime(metrics.uptime_ms);
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Clarity EHR - Server Uptime Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; }
    h1 { margin-bottom: 30px; color: #60a5fa; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; }
    .card h3 { color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .card .value { font-size: 32px; font-weight: bold; color: #60a5fa; }
    .card .subtext { font-size: 12px; color: #64748b; margin-top: 8px; }
    .status { display: flex; gap: 10px; align-items: center; margin-top: 8px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
    .status-dot.offline { background: #ef4444; }
    .alert { background: #7c2d12; border: 1px solid #ea580c; border-radius: 8px; padding: 12px; margin-bottom: 20px; color: #fed7aa; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
    .auto-refresh { color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖥️ Clarity EHR Server Dashboard</h1>

    <div class="auto-refresh">
      Auto-refreshing every 10 seconds...
    </div>

    <div class="stats">
      <div class="card">
        <h3>⏱️ Current Uptime</h3>
        <div class="value">${uptime}</div>
        <div class="subtext">${metrics.uptime_ms} ms</div>
      </div>

      <div class="card">
        <h3>🔄 Restarts (Session)</h3>
        <div class="value">${metrics.restart_count}</div>
        <div class="subtext">Total restarts</div>
      </div>

      <div class="card">
        <h3>💾 Memory Usage</h3>
        <div class="value">${metrics.memory_mb} MB</div>
        <div class="subtext">Limit: 1000 MB</div>
        <div class="status">
          <div class="status-dot${metrics.memory_mb > 900 ? '.offline' : ''}"></div>
          <span>${metrics.memory_mb > 900 ? '⚠️ High' : '✅ Normal'}</span>
        </div>
      </div>

      <div class="card">
        <h3>⚡ CPU Usage</h3>
        <div class="value">${metrics.cpu_percent}%</div>
        <div class="subtext">Threshold: 80%</div>
        <div class="status">
          <div class="status-dot${metrics.cpu_percent > 80 ? '.offline' : ''}"></div>
          <span>${metrics.cpu_percent > 80 ? '⚠️ High' : '✅ Normal'}</span>
        </div>
      </div>

      <div class="card">
        <h3>🔌 Status</h3>
        <div class="value">${metrics.running ? '🟢 ONLINE' : '🔴 OFFLINE'}</div>
        <div class="subtext">Process ID: ${metrics.pid}</div>
      </div>

      <div class="card">
        <h3>🕐 Server Time</h3>
        <div class="value">${new Date().toLocaleTimeString()}</div>
        <div class="subtext">${new Date().toLocaleDateString()}</div>
      </div>
    </div>

    ${metrics.memory_mb > 900 || metrics.cpu_percent > 80 ? `
      <div class="alert">
        ⚠️ <strong>Alert:</strong> ${metrics.memory_mb > 900 ? 'High memory usage detected!' : ''} ${metrics.cpu_percent > 80 ? 'High CPU usage detected!' : ''}
      </div>
    ` : ''}

    <div class="footer">
      Last updated: ${new Date().toISOString()} | <a href="/api/uptime" style="color: #60a5fa; text-decoration: none;">JSON API</a>
    </div>
  </div>

  <script>
    setInterval(() => location.reload(), 10000);
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Error loading dashboard');
  }
});

// Helper functions
function getProcessMetrics() {
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

function formatUptime(ms) {
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

export default router;

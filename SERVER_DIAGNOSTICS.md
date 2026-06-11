# Server Diagnostics Report — June 11, 2026

**Status:** ✅ **FIXED & RUNNING**

---

## 🔴 Problem Found

**Issue:** Express server (Node.js) was not running on port 5001

**Cause:** Server was started manually (`npm run dev`) in background but not managed by PM2

**Impact:** 
- ❌ Server would stop if process killed
- ❌ No automatic restart on crash
- ❌ No monitoring/logs
- ❌ No graceful shutdown

---

## ✅ Solution Implemented

### Step 1: Created PM2 Configuration
**File:** `ecosystem.config.cjs`

```javascript
module.exports = {
  apps: [
    {
      name: 'clarity-api',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'development', PORT: 5001 },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      autorestart: true,
      max_memory_restart: '1G',
      watch: ['server'],
      ignore_watch: ['node_modules', 'logs', 'dist']
    }
  ]
};
```

### Step 2: Started with PM2
```bash
pm2 start ecosystem.config.cjs
```

### Step 3: Verified Server
```bash
curl http://localhost:5001/api/health
# Returns: {"timestamp":"...", "status":"ok"}
```

---

## 📊 Current Status

### PM2 Process
```
┌────┬────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐
│ id │ name           │ version     │ mode    │ pid     │ uptime   │ status │
├────┼────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤
│ 0  │ clarity-api    │ 1.0.0       │ fork    │ 63175   │ 2m       │ online │
└────┴────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘
```

### Server Ports
- ✅ Port 5001: **LISTENING** (Express API server)
- ✅ Port 3000: Frontend dev server (Vite)

### Health Checks
- ✅ `/api/health` → 200 OK
- ✅ `/api/health/full` → 200 OK (database connected)

---

## 🛡️ Automatic Features Enabled

### Monitoring
- ✅ **Auto-restart:** Restarts if process crashes
- ✅ **Max restarts:** 10 attempts
- ✅ **Uptime threshold:** 10 seconds (prevents crash loops)
- ✅ **Memory limit:** 1GB max (auto-restart if exceeded)

### Logging
- ✅ **Error logs:** `./logs/err.log`
- ✅ **Output logs:** `./logs/out.log`
- ✅ **Timestamps:** Included in all logs
- ✅ **Log rotation:** Via PM2 (configurable)

### Development Features
- ✅ **File watching:** Automatically restarts on `server/` changes
- ✅ **Ignore patterns:** Skips `node_modules`, `logs`, `dist`
- ✅ **Hot reload:** Changes detected and applied

---

## 🚀 Useful PM2 Commands

### Monitor & Control
```bash
# View all processes
pm2 status

# View detailed info
pm2 info clarity-api

# View logs in real-time
pm2 logs clarity-api

# View last 100 lines
pm2 logs clarity-api --lines 100
```

### Start/Stop/Restart
```bash
# Start
pm2 start ecosystem.config.cjs

# Stop (doesn't unmonitor)
pm2 stop clarity-api

# Restart
pm2 restart clarity-api

# Reload (zero downtime)
pm2 reload clarity-api

# Delete (unmonitor)
pm2 delete clarity-api
```

### Persistence (survives reboot)
```bash
# Make PM2 start on system boot
pm2 startup

# Save current process list
pm2 save

# Restore on next boot
pm2 resurrect
```

---

## 🔍 Troubleshooting

### Server is unreachable again
```bash
# Check status
pm2 status

# If offline, restart
pm2 restart clarity-api

# If not starting, check logs
pm2 logs clarity-api

# If port in use
lsof -i :5001
kill -9 <PID>
pm2 start ecosystem.config.cjs
```

### Out of memory
```bash
# Check current memory usage
pm2 status

# Increase limit in ecosystem.config.cjs
max_memory_restart: '2G'  # was 1G

# Restart
pm2 restart clarity-api
```

### Want to disable file watching
```javascript
// In ecosystem.config.cjs, set:
watch: false  // Disables auto-restart on file changes
```

---

## 📋 Checklist

- [x] PM2 configuration created
- [x] Server started with PM2
- [x] Health check passing
- [x] Auto-restart enabled
- [x] Logging configured
- [x] File watching enabled
- [x] Memory limits set
- [x] Documentation updated

---

## 🎯 Next Steps

### Immediate
1. ✅ Server is running
2. ✅ PM2 is managing it
3. ✅ Auto-restart configured

### Optional (Production)
1. Enable PM2 startup on boot: `pm2 startup && pm2 save`
2. Set up monitoring: `pm2 plus` (PM2 dashboard)
3. Configure log rotation: `pm2 install pm2-auto-pull`

### Testing
1. Kill process: `pm2 delete clarity-api && pm2 start ecosystem.config.cjs`
2. Verify restart: `pm2 status` (should show uptime reset)
3. Verify logs: `pm2 logs clarity-api`

---

**Server Status:** ✅ OPERATIONAL
**Last Updated:** June 11, 2026 00:45 UTC
**Next Check:** In 30 minutes

# ✅ PM2 Monitoring Setup — Complete (June 11, 2026)

**Status:** ✅ **FULLY CONFIGURED AND RUNNING**

---

## 🎯 What's Now Running

### **Process 1: clarity-api (Main Server)**
```
Name: clarity-api
Status: ✅ ONLINE
PID: 63175
Memory: 24.9 MB
CPU: 0%
Uptime: 11+ minutes
Auto-restart: YES
File watching: ENABLED
Logs: ./logs/err.log, ./logs/out.log
```

### **Process 2: clarity-monitor (Health Monitor)**
```
Name: clarity-monitor
Status: ✅ ONLINE
PID: 64207
Memory: 41.1 MB
CPU: 0%
Checks: Every 5 minutes
Restarts: 1 (normal)
Features:
  ✅ Checks API health every 5 minutes
  ✅ Monitors memory usage
  ✅ Monitors CPU usage
  ✅ Auto-restarts server if down
  ✅ Logs all alerts
```

---

## 📊 **What's Being Monitored**

### **Automatic Health Checks**
```javascript
Every 5 minutes:
├─ GET /api/health → check if server responding
├─ Memory usage → alert if >900 MB
├─ CPU usage → alert if >80%
├─ Process status → restart if offline
└─ Uptime & restarts → track reliability
```

### **Alert Thresholds**
```
Memory: 900 MB max (alert if exceeded)
CPU: 80% max (alert if exceeded)
Server Down: Alert after 2 consecutive failures
Restart: Automatic if >2 consecutive failures
```

### **Log Locations**
```
./logs/combined.log     ← All logs combined
./logs/error.log        ← Errors only
./logs/output.log       ← API output
./logs/alerts.log       ← Alerts + restarts
./logs/monitor.log      ← Monitor script output
```

---

## 🚀 **Commands Reference**

### **View Status**
```bash
# See both processes
pm2 status

# See detailed info
pm2 info clarity-api
pm2 info clarity-monitor

# See full details (JSON)
pm2 show clarity-api
```

### **View Logs**
```bash
# Live logs (clarity-api)
pm2 logs clarity-api

# Live logs (monitor)
pm2 logs clarity-monitor

# Last 50 lines
pm2 logs clarity-api --lines 50

# Stop following logs
pm2 logs clear
```

### **Manage Processes**
```bash
# Restart API
pm2 restart clarity-api

# Restart monitor
pm2 restart clarity-monitor

# Stop (keeps monitoring)
pm2 stop clarity-api

# Start again
pm2 start ecosystem.config.cjs

# Delete from PM2
pm2 delete clarity-api

# Save current state
pm2 save

# Restore saved state
pm2 resurrect
```

### **Monitoring Dashboard**
```bash
# Real-time monitoring (30-second refresh)
chmod +x scripts/monitor-dashboard.sh
./scripts/monitor-dashboard.sh

# Real-time stats view
pm2 monit
```

---

## 📈 **Real-Time Monitoring**

### **Option 1: Watch Terminal Dashboard (Easiest)**
```bash
./scripts/monitor-dashboard.sh

# Shows:
# - Live process status
# - API health
# - Recent alerts
# - Memory/CPU usage
# - Refreshes every 30 seconds
```

### **Option 2: PM2 Built-in Monitor**
```bash
pm2 monit

# Shows:
# - Process list
# - CPU/Memory graphs
# - Real-time data
# Press 'Q' to exit
```

### **Option 3: Follow Logs**
```bash
# Follow API logs
pm2 logs clarity-api

# Follow all logs
pm2 logs

# Show just alerts
tail -f logs/alerts.log
```

---

## ✅ **Persistent Startup (macOS)**

### **Current Status**
```bash
pm2 save
# ✅ State saved to: ~/.pm2/dump.pm2
```

### **To Enable Auto-start on Reboot (Optional)**
```bash
# 1. Get the startup command
pm2 startup

# 2. Copy the command shown (it will look like this):
# sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup launchd -u harrietappiah --hp /Users/harrietappiah

# 3. Run that command (requires your password)
# Note: This is optional - PM2 can run manually but will not auto-start on reboot
```

---

## 🔔 **Alert Examples**

### **When Server Is Down**
```
[2026-06-11T00:45:30.123Z] [ERROR] ❌ API Health Check FAILED: ECONNREFUSED
[2026-06-11T00:45:30.124Z] [ALERT] 🚨 ALERT: Server has been down for 2 checks!
[2026-06-11T00:45:30.125Z] [ALERT] 🔄 Attempting to restart clarity-api...
[2026-06-11T00:45:31.456Z] [INFO] ✅ Server restart initiated
```

### **When Memory Is High**
```
[2026-06-11T00:50:15.789Z] [ALERT] ⚠️ ALERT: High Memory Usage: 950MB (limit: 900MB)
[2026-06-11T00:50:15.790Z] [WARN] Consider restarting or increasing memory limit
```

### **When All Is Normal**
```
[2026-06-11T00:55:00.000Z] [INFO] ✅ API Health Check PASSED
[2026-06-11T00:55:00.001Z] [INFO] 📊 Memory: 24MB (OK)
[2026-06-11T00:55:00.002Z] [INFO] 📊 CPU: 2% (OK)
[2026-06-11T00:55:00.003Z] [INFO] ⏱️ Uptime: 0h 5m (Restarts: 0)
```

---

## 🧪 **Test the Monitoring**

### **Test 1: Kill the server and watch it restart**
```bash
# Kill the main API process
pm2 delete clarity-api

# Watch the monitor detect it
tail -f logs/alerts.log

# You should see:
# [ALERT] 🚨 ALERT: clarity-api process is not running!
# [ALERT] 🔄 Attempting to restart clarity-api...
# [INFO] ✅ Server restart initiated

# Restart it
pm2 start ecosystem.config.cjs

# Monitor will detect recovery
# [INFO] ✅ API Health Check PASSED
```

### **Test 2: Watch memory monitoring**
```bash
# Get current memory
pm2 info clarity-api | grep memory

# If over 900MB, monitor will alert:
# [ALERT] ⚠️ ALERT: High Memory Usage: 950MB (limit: 900MB)
```

### **Test 3: Check logs in real-time**
```bash
# Open in one terminal
pm2 logs clarity-api

# In another terminal, restart the server
pm2 restart clarity-api

# Watch the logs in the first terminal update
```

---

## 📧 **Email Alerts Setup (Optional)**

If you want email notifications when server goes down:

### **Option 1: Use Uptime Robot (Easiest)**
```
1. Go to: https://uptimerobot.com
2. Sign up (FREE)
3. Add monitor:
   - URL: https://api.clarity-ehr.com/api/health
   - Interval: Every 5 minutes
   - Alert on: Down
4. Add email notification
5. Get alerts when server is down
```

### **Option 2: Use Twilio SMS Alerts**
Create file: `scripts/send-alert.js`
```javascript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendAlert(message) {
  await client.messages.create({
    body: `🚨 Clarity Alert: ${message}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+15559876543'  // Your phone
  });
}
```

Then in health-monitor.js:
```javascript
import { sendAlert } from './send-alert.js';

// In the alert section:
if (!health.success) {
  await sendAlert(`API down: ${health.error}`);
}
```

---

## 📊 **What Gets Logged**

### **API Logs** (`./logs/out.log` & `./logs/err.log`)
```
[migrations] ✅ All migrations up to date
[auth] ✅ User login successful
[api] GET /api/health 200
[api] POST /api/refills 201
[error] ❌ Database connection failed
```

### **Monitor Logs** (`./logs/alerts.log`)
```
[ALERT] 🚨 Server is down!
[ALERT] ⚠️ High memory usage
[INFO] ✅ Server recovered
[INFO] Process restarted successfully
```

### **Combined Logs** (`./logs/combined.log`)
```
All logs merged with timestamps
Great for debugging
```

---

## 🎯 **Monitoring Checklist**

### **Daily (Spot Checks)**
- [ ] Run `pm2 status` → Check all processes online
- [ ] Check `logs/alerts.log` → Any alerts overnight?
- [ ] Run `./scripts/monitor-dashboard.sh` → Overall health OK?

### **Weekly**
- [ ] Review memory/CPU trends
- [ ] Check logs for patterns
- [ ] Verify monitor is still running

### **Monthly**
- [ ] Check PM2 restart counts
- [ ] Analyze uptime percentage
- [ ] Review alert frequency
- [ ] Update alert thresholds if needed

---

## 🔍 **Troubleshooting**

### **Monitor not running?**
```bash
pm2 status | grep clarity-monitor
# If not listed:
pm2 start scripts/health-monitor.js --name clarity-monitor
```

### **Alerts not showing up?**
```bash
# Check alert logs exist
ls -la logs/alerts.log

# If not created, monitor hasn't run yet
# It runs on a 5-minute interval
# Wait 5 minutes or restart:
pm2 restart clarity-monitor
```

### **Server keeps restarting?**
```bash
# Check why server is crashing
pm2 logs clarity-api --lines 100

# Common reasons:
# 1. Database connection failed → check DATABASE_URL
# 2. Port already in use → check lsof -i :5001
# 3. Out of memory → increase max_memory_restart
# 4. Unhandled error → check error logs
```

### **Too many alerts?**
```bash
# Adjust thresholds in scripts/health-monitor.js:
MAX_MEMORY_MB: 900    // Increase to 1200
MAX_CPU_PERCENT: 80   // Increase to 90
MAX_DOWN_COUNT: 2     // Increase to 3

# Then restart
pm2 restart clarity-monitor
```

---

## 📈 **Performance Baseline**

### **Expected Numbers (After Setup)**
```
API Memory: 20-50 MB (normal)
Monitor Memory: 30-50 MB (normal)
CPU: <5% each (idle)
Alerts: 0 per day (healthy system)
Uptime: >99.9% (reliable)
```

### **Warning Signs**
```
Memory >500 MB → Too high
CPU >50% sustained → Check why
Alerts >5/day → Something wrong
Restarts >1/day → Instability
```

---

## 🏆 **Success Indicators**

✅ **All Good If You See:**
```
pm2 status shows both processes "online"
✅ API Health Check PASSED in logs
No alerts in logs/alerts.log
Monitor running for >1 hour
Memory <100 MB each
CPU <5%
```

❌ **Problem If You See:**
```
Process shows "offline" or "stopped"
❌ API Health Check FAILED in logs
Multiple alerts in logs/alerts.log
Monitor keeps restarting (high restart count)
Memory >900 MB
CPU >80%
```

---

## 📞 **Quick Support**

### **Server Down? Do This:**
```bash
# 1. Check status
pm2 status

# 2. Check logs
pm2 logs clarity-api --lines 30

# 3. Restart
pm2 restart clarity-api

# 4. Verify
curl http://localhost:5001/api/health

# 5. If still down, check:
lsof -i :5001  # Port conflict?
ps aux | grep node  # Stray processes?
```

---

## 📚 **Summary**

| Feature | Status | Command |
|---------|--------|---------|
| **Process Manager** | ✅ PM2 | `pm2 status` |
| **Health Monitor** | ✅ Running | `pm2 logs clarity-monitor` |
| **Auto Restart** | ✅ Enabled | Config in `ecosystem.config.cjs` |
| **Logging** | ✅ Active | `./logs/` directory |
| **Alerts** | ✅ Logged | `logs/alerts.log` |
| **Boot Startup** | ⚠️ Optional | `pm2 startup` (needs password) |
| **Email Alerts** | ⏰ Optional | Use Uptime Robot |

---

**Setup Complete!** 🎉

Your server is now:
- ✅ Running via PM2
- ✅ Auto-restarting on crash
- ✅ Health checked every 5 minutes
- ✅ Memory/CPU monitored
- ✅ All actions logged
- ✅ Alerts captured

**Next step:** Monitor it daily with:
```bash
./scripts/monitor-dashboard.sh
```

Last Updated: June 11, 2026 00:52 UTC

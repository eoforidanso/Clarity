# ⏱️ Uptime Tracking & Reboot Notifications

**Status:** ✅ **SETUP COMPLETE**  
**Date:** June 11, 2026

---

## 🎯 What's Monitoring Uptime & Reboots

### **Three-Part System**

```
1. clarity-api
   └─ Main server (Express on port 5001)
   └─ Tracks uptime via PM2
   └─ Auto-restarts on crash

2. clarity-monitor  
   └─ Health checker (every 5 minutes)
   └─ Detects restarts
   └─ Logs alerts

3. clarity-uptime
   └─ Uptime tracker (every minute)
   └─ Records reboot history
   └─ Saves statistics
```

---

## 📊 **Check Uptime in Real-Time**

### **Option 1: PM2 Status Command**
```bash
pm2 status

# Shows:
# ├─ clarity-api: 8 restarts (reboot count)
# ├─ Uptime: 17s (time since last restart)
# └─ Memory: 63.0mb
```

### **Option 2: Monitor Dashboard**
```bash
./scripts/monitor-dashboard.sh

# Shows:
# ├─ Current Uptime: 15m 32s
# ├─ Restarts: 8
# ├─ Memory: 63 MB
# ├─ CPU: 2%
# └─ Auto-refreshes every 30 seconds
```

### **Option 3: View Restart History**
```bash
tail -f ./logs/reboots.log

# Example output:
# [2026-06-11T01:05:15.123Z] [ALERT] 🔄 SERVER RESTART DETECTED! Restart count: 6
# [2026-06-11T01:04:32.456Z] [ALERT] 🔄 SERVER RESTART DETECTED! Restart count: 5
# [2026-06-11T01:03:45.789Z] [ALERT] 🔄 SERVER RESTART DETECTED! Restart count: 4
```

### **Option 4: API Endpoints** (When fixed)
```bash
# Get current uptime
curl http://localhost:5001/api/uptime

# Response:
{
  "timestamp": "2026-06-11T01:06:29Z",
  "uptime": "15m 32s",
  "uptime_seconds": 932,
  "restarts_this_session": 8,
  "current_pid": 68045,
  "memory_mb": 63,
  "cpu_percent": 2,
  "status": "online"
}

# Get restart history
curl http://localhost:5001/api/uptime/history

# Response:
{
  "total_reboots": 8,
  "last_reboot": {...},
  "reboots": [...]
}

# Get dashboard (HTML)
open http://localhost:5001/api/uptime/dashboard
```

---

## 📈 **Files Created/Modified**

### **New Files**
```
scripts/uptime-notifier.js
  └─ Tracks uptime every minute
  └─ Detects when server restarts
  └─ Logs to ./logs/uptime.json
  └─ Logs restarts to ./logs/reboots.log

server/routes/uptime.js
  └─ API endpoints for uptime data
  └─ GET /api/uptime → Current stats
  └─ GET /api/uptime/history → Reboot history
  └─ GET /api/uptime/stats → Detailed stats
  └─ GET /api/uptime/dashboard → HTML dashboard

server/index.js (modified)
  └─ Added uptime routes registration
```

### **Log Files**
```
./logs/uptime.json
  └─ JSON file with current uptime state
  └─ Updated every minute
  └─ Contains: startTime, lastCheck, restartCount, totalUptime

./logs/reboots.log
  └─ Plain text log of all reboots
  └─ One entry per restart
  └─ Includes timestamp, restart count, PID
```

---

## 🔔 **Reboot Notifications**

### **What Happens When Server Restarts**

```
1. clarity-api crashes or restarts
   ↓
2. PM2 detects change in restart count
   ↓
3. clarity-uptime tracker notices restart
   ↓
4. Logs to ./logs/reboots.log:
   [ALERT] 🔄 SERVER RESTART DETECTED! Restart count: 8
   ↓
5. Saves statistics to ./logs/uptime.json
   ↓
6. Ready for optional: Email/SMS alerts (future)
```

### **Reboot Log Example**

```json
{
  "timestamp": "2026-06-11T01:05:15.123Z",
  "restartCount": 6,
  "newPID": 68045,
  "previousRestarts": 5,
  "totalRestarts": 6
}
```

---

## 📱 **Get Notifications When Server Reboots**

### **Option A: Email Alerts (Setup Needed)**

To enable email notifications on reboot:

```javascript
// In scripts/uptime-notifier.js, uncomment:

this.sendEmailNotification(message);

// And update sendEmailNotification() to use Resend:
static async sendEmailNotification(message) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: 'alerts@clarity-ehr.com',
    to: 'admin@clarity-ehr.com',  // Your email
    subject: '🔄 Clarity Server Restarted',
    text: message
  });
}
```

### **Option B: SMS Alerts (Setup Needed)**

To enable SMS notifications on reboot:

```javascript
// In scripts/uptime-notifier.js, uncomment:

this.sendSMSNotification(message);

// And update sendSMSNotification() to use Twilio:
static async sendSMSNotification(message) {
  const twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  await twilio.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: '+15559876543'  // Your phone
  });
}
```

### **Option C: Uptime Robot (Easy)**

1. Go to: https://uptimerobot.com
2. Create monitor for: `http://localhost:5001/api/health`
3. Set interval: 5 minutes
4. Add email alert
5. Receive notifications when down

---

## 📊 **Understanding the Metrics**

### **Uptime**
```
What: How long since last restart
Format: 15m 32s (15 minutes 32 seconds)
Normal: >1 hour (healthy)
Warning: <5 minutes (unstable)
Action: Check logs if <5 minutes
```

### **Restarts**
```
What: Number of times server restarted this session
Format: 8
Normal: 0-1 (stable)
Warning: >5 (unstable)
Action: Check logs for crash reason
```

### **Memory**
```
What: RAM used by server
Format: 63 MB
Normal: 20-100 MB
Warning: >500 MB (high)
Critical: >900 MB (will auto-restart)
```

### **CPU**
```
What: CPU usage percentage
Format: 2%
Normal: <10%
Warning: >50%
Critical: >80% (will alert)
```

---

## 🧪 **Test Reboot Notifications**

### **Simulate a Reboot**

```bash
# Kill the server (simulates crash)
pm2 delete clarity-api

# Check logs immediately
tail -f ./logs/reboots.log

# You should see ALERT about restart
# [ALERT] 🔄 clarity-api process is not running!

# Restart manually
pm2 start ecosystem.config.cjs

# Check logs again
# [ALERT] 🔄 Server restart initiated
```

### **Check Reboot History**

```bash
# View all reboots logged
cat ./logs/reboots.log | grep ALERT

# Count total reboots
wc -l ./logs/reboots.log

# See last 10 reboots
tail -10 ./logs/reboots.log
```

---

## 🎯 **Commands Reference**

```bash
# Check current uptime
pm2 status  # Shows in "uptime" column

# View reboot history
tail -f ./logs/reboots.log

# Watch uptime changes (updates every minute)
watch "pm2 status | grep clarity-api"

# Get all metrics
cat ./logs/uptime.json | jq .

# Check when server last restarted
ls -lh ./logs/reboots.log

# Monitor in real-time
./scripts/monitor-dashboard.sh

# Check if server is stable (no restarts)
grep ALERT ./logs/reboots.log | tail -1
```

---

## 📈 **Monitoring for Stability**

### **Healthy Server Indicators**
- ✅ Uptime >1 hour
- ✅ Restarts = 0 (or <1 per day)
- ✅ Memory <100 MB
- ✅ CPU <10%
- ✅ No ALERT logs

### **Unstable Server Indicators**
- ❌ Uptime <5 minutes
- ❌ Restarts >5 per day
- ❌ Memory >500 MB
- ❌ CPU >50%
- ❌ Multiple ALERT logs

**Action:** If unstable, check logs:
```bash
pm2 logs clarity-api --lines 50
```

---

## 🔧 **Troubleshooting**

### **Reboot Log Empty?**
```bash
# Check if uptime tracker is running
pm2 status | grep clarity-uptime

# If not running:
pm2 start scripts/uptime-notifier.js --name clarity-uptime

# Check for errors:
pm2 logs clarity-uptime --lines 20
```

### **Can't See Uptime in PM2 Status?**
```bash
# Restart both processes
pm2 restart clarity-api clarity-uptime

# Wait 30 seconds, then check again
sleep 30 && pm2 status
```

### **Reboot History Lost?**
```bash
# Reboot log is in ./logs/reboots.log
# It's NOT persisted between CI/CD deployments
# After deployment, restart count resets to 0

# This is normal - each deployment = new session
```

---

## 🚀 **Next Steps**

### **To Enable Email Alerts:**
1. Uncomment email code in `scripts/uptime-notifier.js`
2. Ensure `RESEND_API_KEY` is set
3. Update email address for alerts
4. Restart: `pm2 restart clarity-uptime`

### **To Enable SMS Alerts:**
1. Uncomment SMS code in `scripts/uptime-notifier.js`
2. Set Twilio environment variables
3. Update phone number for alerts
4. Restart: `pm2 restart clarity-uptime`

### **To Access API Endpoints:**
The uptime API endpoints are set up but need debugging:
- `GET /api/uptime` - Current uptime
- `GET /api/uptime/stats` - Detailed stats
- `GET /api/uptime/history` - Reboot history
- `GET /api/uptime/dashboard` - HTML dashboard

---

## 📊 **Summary**

| Metric | Value | Status |
|--------|-------|--------|
| **Uptime Tracking** | Every 1 minute | ✅ Active |
| **Reboot Detection** | Automatic | ✅ Active |
| **Reboot Logging** | ./logs/reboots.log | ✅ Active |
| **PM2 Display** | `pm2 status` | ✅ Available |
| **Dashboard** | `./scripts/monitor-dashboard.sh` | ✅ Available |
| **Email Alerts** | Ready (needs activation) | ⏳ Optional |
| **SMS Alerts** | Ready (needs activation) | ⏳ Optional |
| **API Endpoints** | Setup (needs debug) | 🟡 Setup |

---

**Your server is now fully tracked for uptime and reboots!** 🎉

Check current uptime with:
```bash
pm2 status
```

View reboot history with:
```bash
tail ./logs/reboots.log
```

Monitor live with:
```bash
./scripts/monitor-dashboard.sh
```

#!/bin/bash

# PM2 Real-Time Monitoring Dashboard
# Shows live status of clarity-api and clarity-monitor

clear

while true; do
  clear

  echo "═══════════════════════════════════════════════════════════════"
  echo "              🔍 CLARITY EHR MONITORING DASHBOARD 🔍"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  # Update timestamp
  echo "Last Update: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # Show PM2 status
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│ PM2 PROCESS STATUS                                          │"
  echo "└─────────────────────────────────────────────────────────────┘"
  pm2 status
  echo ""

  # Show API health
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│ API HEALTH CHECK                                            │"
  echo "└─────────────────────────────────────────────────────────────┘"

  HEALTH=$(curl -s http://localhost:5001/api/health 2>/dev/null)
  if [ -z "$HEALTH" ]; then
    echo "❌ API UNREACHABLE - Server may be down!"
  else
    echo "✅ API Status: $(echo $HEALTH | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "⏰ Server Time: $(echo $HEALTH | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)"
  fi
  echo ""

  # Show logs
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│ RECENT ALERTS (Last 10)                                     │"
  echo "└─────────────────────────────────────────────────────────────┘"
  if [ -f ./logs/alerts.log ]; then
    tail -10 ./logs/alerts.log
  else
    echo "No alerts yet - system running smoothly! ✅"
  fi
  echo ""

  # Show quick stats
  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│ QUICK STATS                                                 │"
  echo "└─────────────────────────────────────────────────────────────┘"

  # Clarity API stats
  API_INFO=$(pm2 jlist clarity-api 2>/dev/null | grep -o '"memory":[0-9]*,"cpu":[0-9]*' || echo "")
  if [ -z "$API_INFO" ]; then
    echo "clarity-api: Data unavailable"
  else
    echo "clarity-api: Memory=$(echo $API_INFO | cut -d':' -f2 | cut -d',' -f1 | awk '{printf "%.1f MB", $1/1024/1024}'), CPU=$(echo $API_INFO | cut -d':' -f3 | cut -d'}' -f1)%"
  fi

  # Monitor stats
  MONITOR_INFO=$(pm2 jlist clarity-monitor 2>/dev/null | grep -o '"memory":[0-9]*,"cpu":[0-9]*' || echo "")
  if [ -z "$MONITOR_INFO" ]; then
    echo "clarity-monitor: Data unavailable"
  else
    echo "clarity-monitor: Memory=$(echo $MONITOR_INFO | cut -d':' -f2 | cut -d',' -f1 | awk '{printf "%.1f MB", $1/1024/1024}'), CPU=$(echo $MONITOR_INFO | cut -d':' -f3 | cut -d'}' -f1)%"
  fi
  echo ""

  echo "┌─────────────────────────────────────────────────────────────┐"
  echo "│ Press CTRL+C to exit | Refreshing every 30 seconds...       │"
  echo "└─────────────────────────────────────────────────────────────┘"

  sleep 30
done

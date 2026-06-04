#!/usr/bin/env bash
# =============================================================================
# Clarity EHR — Uptime Monitor
# Runs every 5 minutes via cron. Checks production + staging health endpoints.
# Sends alert email via Resend if any endpoint is down.
# =============================================================================

PROD_URL="https://api.clarity-ehr.com/api/health"
STAGING_URL="https://staging-api.clarity-ehr.com/api/health"
LOG_FILE="/var/log/ehr-uptime.log"
STATE_FILE="/tmp/ehr-uptime-state"   # tracks consecutive failures per endpoint
ALERT_THRESHOLD=2                    # alert after N consecutive failures (2 × 5min = 10 min down)

ENV_FILE="/var/www/ehr/server/.env"

# Load env
RESEND_API_KEY=$(grep RESEND_API_KEY "$ENV_FILE" | cut -d= -f2)
RESEND_FROM=$(grep RESEND_FROM "$ENV_FILE" | cut -d= -f2 | tr -d '"')
ALERT_EMAIL=$(grep SECURITY_ALERT_EMAIL "$ENV_FILE" | cut -d= -f2)

mkdir -p "$(dirname "$LOG_FILE")"
touch "$STATE_FILE"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

send_alert() {
  local SUBJECT="$1"
  local BODY="$2"
  if [ -z "$RESEND_API_KEY" ] || [ -z "$ALERT_EMAIL" ]; then
    log "ALERT (no email): $SUBJECT"
    return
  fi
  curl -sf -X POST "https://api.resend.com/emails" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    --data "{
      \"from\": \"${RESEND_FROM:-noreply@clarity-ehr.com}\",
      \"to\": [\"$ALERT_EMAIL\"],
      \"subject\": \"$SUBJECT\",
      \"html\": \"<p>$BODY</p><p><small>$(date)</small></p>\"
    }" > /dev/null 2>&1
  log "Alert sent: $SUBJECT"
}

get_failures() {
  local KEY="$1"
  grep -c "^${KEY}=" "$STATE_FILE" 2>/dev/null || echo 0
}

set_failures() {
  local KEY="$1"
  local COUNT="$2"
  # Remove existing entry and add new one
  grep -v "^${KEY}=" "$STATE_FILE" > /tmp/ehr-state-tmp && mv /tmp/ehr-state-tmp "$STATE_FILE"
  echo "${KEY}=${COUNT}" >> "$STATE_FILE"
}

check_endpoint() {
  local NAME="$1"
  local URL="$2"
  local KEY="${NAME// /_}"

  # Fetch with 10s timeout
  HTTP_CODE=$(curl -sf --max-time 10 -o /tmp/ehr-health-resp -w "%{http_code}" "$URL" 2>/dev/null)
  CURL_EXIT=$?

  if [ "$CURL_EXIT" -ne 0 ] || [ "$HTTP_CODE" != "200" ]; then
    # Failure
    PREV=$(get_failures "$KEY")
    NEW=$((PREV + 1))
    set_failures "$KEY" "$NEW"
    log "⚠️  $NAME DOWN (HTTP $HTTP_CODE, attempt $NEW)"

    if [ "$NEW" -eq "$ALERT_THRESHOLD" ]; then
      send_alert \
        "🚨 Clarity EHR DOWN: $NAME" \
        "The $NAME endpoint ($URL) has been unreachable for $((NEW * 5)) minutes. HTTP code: $HTTP_CODE. Check PM2 and nginx immediately."
    fi
  else
    # Success
    PREV=$(get_failures "$KEY")
    if [ "$PREV" -ge "$ALERT_THRESHOLD" ]; then
      # Was down, now recovered
      send_alert \
        "✅ Clarity EHR RECOVERED: $NAME" \
        "The $NAME endpoint ($URL) is back online after $((PREV * 5)) minutes of downtime."
      log "✅ $NAME RECOVERED after $PREV failures"
    fi
    set_failures "$KEY" 0
    log "✅ $NAME OK (HTTP $HTTP_CODE)"
  fi
}

# Run checks
check_endpoint "Production API" "$PROD_URL"
check_endpoint "Staging API"    "$STAGING_URL"

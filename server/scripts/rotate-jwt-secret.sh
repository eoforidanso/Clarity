#!/bin/bash
# Clarity EHR — JWT Secret Rotation
# Run this whenever a secret compromise is suspected or on a 90-day schedule.
# Effect: all existing sessions are immediately invalidated (everyone logs out).

set -euo pipefail

ENV_FILE="${ENV_FILE:-/var/www/ehr/server/.env}"
LOG="/var/log/clarity-security.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [jwt-rotate] $*" | tee -a "$LOG"; }

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"; exit 1
fi

# Generate new 128-char hex secret
NEW_SECRET=$(openssl rand -hex 64)

# Backup current env
cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d_%H%M%S)"

# Replace JWT_SECRET
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" "$ENV_FILE"

log "JWT_SECRET rotated (${#NEW_SECRET} chars). All sessions invalidated."

# Restart API to pick up new secret
pm2 restart ehr-api --update-env
log "ehr-api restarted with new secret."

# Invalidate all active sessions in DB (force re-login for everyone)
DB_PATH="${DB_PATH:-/var/www/ehr/server/db/ehr.db}"
sqlite3 "$DB_PATH" "UPDATE sessions SET is_active = 0;" 2>/dev/null && \
  log "All DB sessions invalidated." || log "WARNING: Could not invalidate DB sessions"

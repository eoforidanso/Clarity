#!/usr/bin/env bash
# =============================================================================
# Clarity EHR — Disaster Recovery Runbook
# =============================================================================
# Usage:
#   bash disaster-recovery.sh <command>
#
# Commands:
#   status          — print current system health
#   backup          — manual DB backup to /var/backups/ehr/
#   restore <file>  — restore DB from a backup file
#   rotate-jwt      — rotate JWT_SECRET + restart API (logs everyone out)
#   revoke-sessions — kill all active sessions (emergency lockdown)
#   rollback        — restart API from last known good PM2 snapshot
#   full-restart    — nginx + PM2 full restart
#   check-ssl       — verify TLS certs expiry
#
# Runbook for common incidents:
#   1. Suspected breach          → rotate-jwt → revoke-sessions → backup
#   2. DB corruption             → backup → restore <latest>
#   3. Server unresponsive       → full-restart
#   4. SSL cert expired          → check-ssl (then renew via Cloudflare dashboard)
# =============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/ehr"
DB_HOST="private-db-pgsql-nyc2-72777-do-user-37382402-0.a.db.ondigitalocean.com"
DB_PORT="25060"
DB_USER="doadmin"
DB_NAME="ehrdb"
ENV_FILE="/var/www/ehr/server/.env"
PM2_APP="ehr-api"
STAGING_APP="ehr-api-staging"
LOG_FILE="/var/log/ehr-dr.log"

# Load DB password from env
DB_PASS=$(grep DATABASE_URL "$ENV_FILE" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
die() { log "ERROR: $*"; exit 1; }

mkdir -p "$BACKUP_DIR"

# =============================================================================
case "${1:-help}" in

# ── STATUS ────────────────────────────────────────────────────────────────────
status)
  log "=== Clarity EHR System Status ==="
  echo ""
  echo "── PM2 Processes ──────────────────────────"
  pm2 list
  echo ""
  echo "── API Health ─────────────────────────────"
  curl -sf http://127.0.0.1:5001/api/health && echo " ← production ✅" || echo " ← production ❌"
  curl -sf http://127.0.0.1:5002/api/health && echo " ← staging ✅"    || echo " ← staging ❌"
  echo ""
  echo "── Nginx Status ───────────────────────────"
  systemctl is-active nginx && echo "nginx: running ✅" || echo "nginx: DOWN ❌"
  echo ""
  echo "── DB Connections ─────────────────────────"
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "SELECT COUNT(*) AS active_sessions FROM sessions WHERE is_active=1;" 2>/dev/null || echo "DB unreachable ❌"
  echo ""
  echo "── Disk Usage ─────────────────────────────"
  df -h /var/www/ehr /var/backups 2>/dev/null || df -h /
  echo ""
  echo "── Last 5 Errors ──────────────────────────"
  pm2 logs "$PM2_APP" --lines 5 --nostream 2>/dev/null | grep -i error | tail -5 || echo "No errors"
  ;;

# ── BACKUP ────────────────────────────────────────────────────────────────────
backup)
  TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
  BACKUP_FILE="$BACKUP_DIR/ehrdb_${TIMESTAMP}.sql.gz"
  log "Starting backup → $BACKUP_FILE"
  PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "Backup complete: $BACKUP_FILE ($SIZE)"
  # Keep last 30 backups
  ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f
  log "Retention: kept latest 30 backups"
  echo "$BACKUP_FILE"
  ;;

# ── RESTORE ───────────────────────────────────────────────────────────────────
restore)
  FILE="${2:-}"
  [ -z "$FILE" ] && die "Usage: $0 restore <backup_file.sql.gz>"
  [ -f "$FILE" ] || die "File not found: $FILE"
  log "⚠️  RESTORING from $FILE — this will overwrite ehrdb"
  read -r -p "Are you sure? Type 'yes' to continue: " CONFIRM
  [ "$CONFIRM" = "yes" ] || die "Aborted"
  log "Stopping API…"
  pm2 stop "$PM2_APP" "$STAGING_APP" 2>/dev/null || true
  log "Restoring database…"
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null
  gunzip -c "$FILE" | PGPASSWORD="$DB_PASS" psql \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null
  log "Restarting API…"
  pm2 start "$PM2_APP" "$STAGING_APP"
  sleep 5
  curl -sf http://127.0.0.1:5001/api/health && log "Restore complete ✅" || die "API not healthy after restore"
  ;;

# ── ROTATE JWT ────────────────────────────────────────────────────────────────
rotate-jwt)
  log "Rotating JWT_SECRET…"
  NEW_SECRET=$(openssl rand -hex 64)
  # Update .env
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$NEW_SECRET|" "$ENV_FILE"
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=$NEW_SECRET|" /var/www/ehr/server-staging/.env.staging
  log "JWT_SECRET rotated"
  # Revoke all sessions first (old tokens are now invalid anyway)
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "UPDATE sessions SET is_active=0 WHERE is_active=1;" 2>/dev/null
  log "All sessions revoked"
  # Restart
  pm2 restart "$PM2_APP" "$STAGING_APP" --update-env
  sleep 8
  curl -sf http://127.0.0.1:5001/api/health && log "API restarted with new JWT_SECRET ✅" || die "API not healthy"
  log "⚠️  All users have been logged out. New secret is in $ENV_FILE"
  ;;

# ── REVOKE SESSIONS ───────────────────────────────────────────────────────────
revoke-sessions)
  log "Revoking ALL active sessions (emergency lockdown)…"
  RESULT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "UPDATE sessions SET is_active=0 WHERE is_active=1 RETURNING id;" 2>/dev/null | grep -c '^\s*[a-f0-9-]' || echo 0)
  log "Revoked sessions: $RESULT — all users logged out ✅"
  ;;

# ── ROLLBACK ──────────────────────────────────────────────────────────────────
rollback)
  log "Rolling back API to last PM2 snapshot…"
  pm2 resurrect 2>/dev/null || pm2 start /root/.pm2/dump.pm2
  sleep 5
  curl -sf http://127.0.0.1:5001/api/health && log "Rollback complete ✅" || die "API not healthy after rollback"
  ;;

# ── FULL RESTART ──────────────────────────────────────────────────────────────
full-restart)
  log "Full restart: nginx + PM2…"
  nginx -t && systemctl reload nginx && log "Nginx reloaded ✅"
  pm2 restart "$PM2_APP" "$STAGING_APP" --update-env
  sleep 8
  curl -sf http://127.0.0.1:5001/api/health && log "Production ✅" || log "Production ❌"
  curl -sf http://127.0.0.1:5002/api/health && log "Staging ✅"    || log "Staging ❌"
  ;;

# ── CHECK SSL ─────────────────────────────────────────────────────────────────
check-ssl)
  log "Checking TLS certificate expiry…"
  for DOMAIN in app.clarity-ehr.com api.clarity-ehr.com staging-api.clarity-ehr.com; do
    EXPIRY=$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
      DAYS=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))
      if [ "$DAYS" -lt 14 ]; then
        log "⚠️  $DOMAIN expires in $DAYS days ($EXPIRY) — RENEW NOW"
      else
        log "✅  $DOMAIN expires in $DAYS days ($EXPIRY)"
      fi
    else
      log "❌  $DOMAIN — could not retrieve cert"
    fi
  done
  ;;

# ── HELP ──────────────────────────────────────────────────────────────────────
help|*)
  echo ""
  echo "Clarity EHR — Disaster Recovery Runbook"
  echo ""
  echo "Usage: bash disaster-recovery.sh <command>"
  echo ""
  echo "Commands:"
  echo "  status           Print system health"
  echo "  backup           Manual DB backup to $BACKUP_DIR"
  echo "  restore <file>   Restore DB from backup"
  echo "  rotate-jwt       Rotate JWT secret + logout everyone"
  echo "  revoke-sessions  Emergency: kill all active sessions"
  echo "  rollback         Restart from last PM2 snapshot"
  echo "  full-restart     Reload nginx + restart PM2"
  echo "  check-ssl        Check TLS cert expiry for all domains"
  echo ""
  echo "Common incident runbooks:"
  echo "  Suspected breach:  rotate-jwt → revoke-sessions → backup"
  echo "  DB corruption:     backup → restore <latest>"
  echo "  Server down:       full-restart"
  echo "  Cert expired:      check-ssl → renew at dash.cloudflare.com"
  echo ""
  ;;

esac

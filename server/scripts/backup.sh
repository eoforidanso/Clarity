#!/bin/bash
# Clarity EHR — Automated SQLite Backup
# Runs via cron: 0 2 * * * /var/www/ehr/server/scripts/backup.sh
# Keeps 30 daily backups, 12 weekly backups (3 months retention)

set -euo pipefail

DB_PATH="${DB_PATH:-/var/www/ehr/server/db/ehr.db}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/ehr/backups}"
LOG_FILE="/var/log/clarity-backup.log"
KEEP_DAILY=30
KEEP_WEEKLY=12

NOW=$(date '+%Y-%m-%d_%H-%M-%S')
DAY_OF_WEEK=$(date '+%u')  # 1=Mon … 7=Sun
DAILY_FILE="$BACKUP_DIR/daily/ehr-$NOW.db"
WEEKLY_FILE="$BACKUP_DIR/weekly/ehr-week-$(date '+%Y-W%V').db"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# ── Ensure directories exist ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# ── Integrity check before backup ────────────────────────────────────────────
if ! sqlite3 "$DB_PATH" "PRAGMA integrity_check;" | grep -q "^ok$"; then
  log "ERROR: DB integrity check failed — skipping backup"
  exit 1
fi

# ── Hot backup using SQLite .backup API (safe during writes) ─────────────────
sqlite3 "$DB_PATH" ".backup '$DAILY_FILE'"
BACKUP_SIZE=$(du -sh "$DAILY_FILE" | cut -f1)
log "Daily backup: $DAILY_FILE ($BACKUP_SIZE)"

# ── Weekly backup on Sunday ───────────────────────────────────────────────────
if [ "$DAY_OF_WEEK" = "7" ]; then
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  log "Weekly backup: $WEEKLY_FILE"
fi

# ── Rotate old backups ────────────────────────────────────────────────────────
find "$BACKUP_DIR/daily"  -name "*.db" -mtime +${KEEP_DAILY}  -delete
find "$BACKUP_DIR/weekly" -name "*.db" -mtime +$((KEEP_WEEKLY * 7)) -delete
log "Rotation complete — daily kept: $KEEP_DAILY days, weekly: $KEEP_WEEKLY weeks"

# ── Verify the backup is readable ─────────────────────────────────────────────
RECORD_COUNT=$(sqlite3 "$DAILY_FILE" "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "ERROR")
if [ "$RECORD_COUNT" = "ERROR" ]; then
  log "ERROR: Backup file is not readable"
  exit 1
fi
log "Backup verified — users table: $RECORD_COUNT records"

log "Backup complete"

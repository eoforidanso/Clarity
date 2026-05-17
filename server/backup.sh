#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# EHR Database Backup Script
# Copies the SQLite WAL database to a timestamped local archive, then uploads
# to an S3 bucket if AWS CLI is configured.
#
# Usage:
#   chmod +x backup.sh
#   ./backup.sh                      # manual run
#   crontab -e                       # add cron entry (see below)
#
# Recommended cron (runs daily at 2:00 AM):
#   0 2 * * * /path/to/server/backup.sh >> /path/to/server/logs/backup.log 2>&1
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="${SCRIPT_DIR}/db/ehr.db"
BACKUP_DIR="${SCRIPT_DIR}/backups"
S3_BUCKET="${EHR_BACKUP_BUCKET:-}"   # set in environment: export EHR_BACKUP_BUCKET=s3://your-bucket/backups
RETENTION_DAYS=30

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="${BACKUP_DIR}/ehr-${DATE}.db"

mkdir -p "$BACKUP_DIR"
mkdir -p "${SCRIPT_DIR}/logs"

echo "[${DATE}] Starting backup..."

# ── Sanity check ────────────────────────────────────────────────────────────
if [[ ! -f "$DB_PATH" ]]; then
  echo "[ERROR] Database file not found: $DB_PATH"
  exit 1
fi

# ── SQLite backup (uses SQLite's .backup which is safe while the DB is live) ─
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
echo "[OK] Local backup created: ${BACKUP_FILE} ($(du -sh "$BACKUP_FILE" | cut -f1))"

# ── Compress ────────────────────────────────────────────────────────────────
gzip -f "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"
echo "[OK] Compressed: ${BACKUP_FILE}"

# ── Upload to S3 (optional) ─────────────────────────────────────────────────
if [[ -n "$S3_BUCKET" ]]; then
  if command -v aws &>/dev/null; then
    aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}/ehr-${DATE}.db.gz" \
      --storage-class STANDARD_IA \
      --sse aws:kms
    echo "[OK] Uploaded to S3: ${S3_BUCKET}/ehr-${DATE}.db.gz"
  else
    echo "[WARN] AWS CLI not found — skipping S3 upload. Install with: pip install awscli"
  fi
else
  echo "[INFO] EHR_BACKUP_BUCKET not set — skipping S3 upload (local backup only)"
fi

# ── Prune old local backups ──────────────────────────────────────────────────
find "$BACKUP_DIR" -name "ehr-*.db.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[OK] Pruned backups older than ${RETENTION_DAYS} days"

echo "[DONE] Backup complete: ${BACKUP_FILE}"

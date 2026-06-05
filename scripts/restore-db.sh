#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Clarity EHR — Database Restore
#
# Usage:
#   ./restore-db.sh                        # restore latest backup
#   ./restore-db.sh clarity_ehr_20260605.sql.gz  # restore specific file
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ENV_FILE="/var/www/ehr/server/.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

for var in DATABASE_URL SPACES_KEY SPACES_SECRET SPACES_BUCKET SPACES_REGION SPACES_ENDPOINT; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: $var is not set"; exit 1
  fi
done

BACKUP_DIR="/tmp/ehr-restore"
mkdir -p "$BACKUP_DIR"

# ── Find which file to restore ────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  FILENAME="$1"
else
  echo "[restore] Finding latest backup..."
  FILENAME=$(
    AWS_ACCESS_KEY_ID="$SPACES_KEY" \
    AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
    aws s3 ls "s3://${SPACES_BUCKET}/db-backups/" \
      --endpoint-url "$SPACES_ENDPOINT" \
      --region "$SPACES_REGION" \
    | sort | tail -1 | awk '{print $4}'
  )
fi

if [ -z "$FILENAME" ]; then
  echo "[restore] No backups found"; exit 1
fi

echo "[restore] Restoring from: $FILENAME"
read -p "⚠️  This will OVERWRITE the current database. Continue? [y/N] " confirm
[ "$confirm" = "y" ] || { echo "Aborted."; exit 0; }

# ── Download ──────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID="$SPACES_KEY" \
AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
aws s3 cp "s3://${SPACES_BUCKET}/db-backups/${FILENAME}" "${BACKUP_DIR}/${FILENAME}" \
  --endpoint-url "$SPACES_ENDPOINT" \
  --region "$SPACES_REGION"

echo "[restore] Downloaded. Restoring..."

# ── Stop API to prevent writes during restore ─────────────────────────────────
pm2 stop ehr-api 2>/dev/null || true

# ── Restore ───────────────────────────────────────────────────────────────────
gunzip -c "${BACKUP_DIR}/${FILENAME}" | psql "$DATABASE_URL"

# ── Restart API ───────────────────────────────────────────────────────────────
pm2 start ehr-api 2>/dev/null || true

rm -f "${BACKUP_DIR}/${FILENAME}"
echo "[restore] Done. API restarted."

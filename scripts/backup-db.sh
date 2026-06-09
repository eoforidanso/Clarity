#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Clarity EHR — PostgreSQL Automated Backup
#
# What it does:
#   1. pg_dump the production DB
#   2. gzip compress
#   3. Upload to DO Spaces (S3-compatible)
#   4. Delete local copy
#   5. Prune backups older than RETAIN_DAYS
#
# Required env vars (set in /etc/environment or server .env):
#   DATABASE_URL           — postgres connection string
#   SPACES_KEY             — DO Spaces access key
#   SPACES_SECRET          — DO Spaces secret key
#   SPACES_BUCKET          — e.g. clarity-ehr-backups
#   SPACES_REGION          — e.g. nyc3
#   SPACES_ENDPOINT        — e.g. https://nyc3.digitaloceanspaces.com
#
# Schedule (crontab -e):
#   0 2 * * * /var/www/ehr/scripts/backup-db.sh >> /var/log/ehr-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Load env from server .env if not already set ─────────────────────────────
ENV_FILE="/var/www/ehr/server/.env"
if [ -f "$ENV_FILE" ]; then
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
fi

# ── Config ────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/ehr-backups"
FILENAME="clarity_ehr_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
S3_PATH="s3://${SPACES_BUCKET}/db-backups/${FILENAME}"

# ── Validate ──────────────────────────────────────────────────────────────────
for var in DATABASE_URL SPACES_KEY SPACES_SECRET SPACES_BUCKET SPACES_REGION SPACES_ENDPOINT; do
  if [ -z "${!var:-}" ]; then
    echo "[backup] ERROR: $var is not set"
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup at $(date)"

# ── Dump ──────────────────────────────────────────────────────────────────────
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  --clean \
  --if-exists \
  | gzip > "$FILEPATH"

SIZE=$(du -sh "$FILEPATH" | cut -f1)
echo "[backup] Dump complete: $FILENAME ($SIZE)"

# ── Upload to DO Spaces ───────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID="$SPACES_KEY" \
AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
aws s3 cp "$FILEPATH" "$S3_PATH" \
  --endpoint-url "$SPACES_ENDPOINT" \
  --region "$SPACES_REGION" \
  --storage-class STANDARD \
  --quiet

echo "[backup] Uploaded to $S3_PATH"

# ── Clean up local file ───────────────────────────────────────────────────────
rm -f "$FILEPATH"

# ── Prune old backups from Spaces ─────────────────────────────────────────────
CUTOFF=$(date -d "-${RETAIN_DAYS} days" +"%Y-%m-%dT%H:%M:%S" 2>/dev/null \
         || date -v "-${RETAIN_DAYS}d" +"%Y-%m-%dT%H:%M:%S")  # macOS fallback

AWS_ACCESS_KEY_ID="$SPACES_KEY" \
AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
aws s3 ls "s3://${SPACES_BUCKET}/db-backups/" \
  --endpoint-url "$SPACES_ENDPOINT" \
  --region "$SPACES_REGION" \
| while read -r date time size fname; do
    FILE_DATE="${date}T${time}"
    if [[ "$FILE_DATE" < "$CUTOFF" ]]; then
      AWS_ACCESS_KEY_ID="$SPACES_KEY" \
      AWS_SECRET_ACCESS_KEY="$SPACES_SECRET" \
      aws s3 rm "s3://${SPACES_BUCKET}/db-backups/${fname}" \
        --endpoint-url "$SPACES_ENDPOINT" \
        --region "$SPACES_REGION" \
        --quiet
      echo "[backup] Pruned old backup: $fname"
    fi
  done

echo "[backup] Done at $(date)"

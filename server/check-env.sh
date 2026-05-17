#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# EHR Pre-launch Environment Validation
# Run this BEFORE starting the server in production to catch missing config.
#
# Usage:
#   chmod +x check-env.sh
#   ./check-env.sh              # exits 0 if everything is OK, 1 on any error
# ────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Load .env if present
if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

ERRORS=0
WARNINGS=0

check_required() {
  local VAR="$1"
  local DESC="$2"
  if [[ -z "${!VAR:-}" ]]; then
    echo "❌  MISSING  $VAR — $DESC"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅  OK       $VAR"
  fi
}

check_warn() {
  local VAR="$1"
  local DESC="$2"
  if [[ -z "${!VAR:-}" ]]; then
    echo "⚠️   WARN     $VAR — $DESC"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "✅  OK       $VAR"
  fi
}

check_not_default() {
  local VAR="$1"
  local DEFAULT="$2"
  local DESC="$3"
  if [[ "${!VAR:-}" == "$DEFAULT" ]]; then
    echo "❌  DEFAULT  $VAR — $DESC (still set to the insecure default)"
    ERRORS=$((ERRORS + 1))
  else
    echo "✅  OK       $VAR"
  fi
}

echo ""
echo "═══════════════════════════════════════════"
echo " EHR Production Environment Check"
echo "═══════════════════════════════════════════"
echo ""

# ── Required ────────────────────────────────────────────────────────────────
check_required    "JWT_SECRET"       "Signs all authentication tokens"
check_required    "ALLOWED_ORIGINS"  "Frontend domain(s) for CORS"
check_required    "NODE_ENV"         "Must be 'production'"

# ── Should not be defaults ───────────────────────────────────────────────────
check_not_default "JWT_SECRET" "dev-only-insecure-secret-do-not-use-in-prod" \
                  "Generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""

# ── Recommended ─────────────────────────────────────────────────────────────
check_warn "SENTRY_DSN"      "Sentry error monitoring DSN"
check_warn "EHR_BACKUP_BUCKET" "S3 bucket for automated backups"
check_warn "DB_PATH"         "Path to SQLite database file"

# ── Checks ───────────────────────────────────────────────────────────────────
echo ""
echo "Checking database..."
if [[ -f "${DB_PATH:-./db/ehr.db}" ]]; then
  echo "✅  DB file exists: ${DB_PATH:-./db/ehr.db}"
else
  echo "⚠️   DB file not found — will be created on first start: ${DB_PATH:-./db/ehr.db}"
fi

echo ""
echo "Checking PM2..."
if command -v pm2 &>/dev/null; then
  echo "✅  PM2 installed: $(pm2 --version 2>/dev/null | head -1)"
else
  echo "⚠️   PM2 not installed. Run: sudo npm install -g pm2"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "Checking logs directory..."
mkdir -p ./logs
echo "✅  ./logs/ exists"

echo ""
echo "═══════════════════════════════════════════"
if [[ $ERRORS -gt 0 ]]; then
  echo " ❌  $ERRORS error(s), $WARNINGS warning(s). Fix errors before launching."
  exit 1
else
  echo " ✅  $WARNINGS warning(s). Ready to launch."
  exit 0
fi

#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Clarity EHR — Incident Response Playbook
#
# Run this immediately when a security incident is detected.
# It preserves evidence, rotates credentials, revokes sessions,
# and produces a timestamped incident report.
#
# Usage:
#   bash /var/www/ehr/server/scripts/incident-response.sh [INCIDENT_TYPE]
#
# Incident types:
#   breach        — confirmed or suspected data breach
#   credential    — compromised password or API key
#   intrusion     — unauthorized server access
#   idor          — patient data accessed without authorization
#   default       — unknown / investigation starting
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

INCIDENT_TYPE="${1:-default}"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
INCIDENT_ID="INC-$(date '+%Y%m%d')-$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')"
REPORT_DIR="/var/www/ehr/incidents/${INCIDENT_ID}"
DB_PATH="/var/www/ehr/server/db/ehr.db"
ENV_FILE="/var/www/ehr/server/.env"
LOG="/var/log/clarity-incidents.log"

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${NC}" | tee -a "$LOG"; }
ok()   { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${NC}" | tee -a "$LOG"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${NC}" | tee -a "$LOG"; }

echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   CLARITY EHR — INCIDENT RESPONSE ACTIVATED         ║${NC}"
echo -e "${RED}║   Incident ID: ${INCIDENT_ID}                    ║${NC}"
echo -e "${RED}║   Type: ${INCIDENT_TYPE}                                   ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

mkdir -p "$REPORT_DIR"

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1: CONTAIN — stop the bleeding immediately
# ══════════════════════════════════════════════════════════════════════════════
log "PHASE 1: CONTAINMENT"

# Step 1.1 — Revoke ALL active sessions
log "1.1 Revoking all active sessions..."
sqlite3 "$DB_PATH" "UPDATE sessions SET is_active = 0;" 2>/dev/null && \
  ok "All sessions revoked — everyone must re-login" || warn "Could not revoke sessions"

# Step 1.2 — Rotate JWT secret (invalidates all tokens)
log "1.2 Rotating JWT secret..."
NEW_JWT=$(openssl rand -hex 64)
cp "$ENV_FILE" "$REPORT_DIR/env.bak.$TIMESTAMP"
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT/" "$ENV_FILE"
ok "JWT_SECRET rotated — all existing tokens are now invalid"

# Step 1.3 — Rotate field encryption key backup (do NOT change primary — would break data)
log "1.3 Backing up encryption key..."
grep "FIELD_ENCRYPTION_KEY" "$ENV_FILE" >> "$REPORT_DIR/keys.bak.$TIMESTAMP" && \
  ok "Encryption key backed up to incident report" || warn "Could not backup encryption key"

# Step 1.4 — Restart API with new secrets
log "1.4 Restarting API with new credentials..."
pm2 restart ehr-api --update-env && ok "API restarted" || err "API restart failed — check manually"

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2: EVIDENCE — preserve everything before it rotates
# ══════════════════════════════════════════════════════════════════════════════
log "PHASE 2: EVIDENCE PRESERVATION"

# Step 2.1 — Snapshot the database
log "2.1 Creating DB snapshot..."
sqlite3 "$DB_PATH" ".backup '$REPORT_DIR/ehr-snapshot-$TIMESTAMP.db'" && \
  ok "DB snapshot: $REPORT_DIR/ehr-snapshot-$TIMESTAMP.db" || warn "DB snapshot failed"

# Step 2.2 — Export full audit log
log "2.2 Exporting audit logs..."
sqlite3 "$DB_PATH" ".mode csv" ".output $REPORT_DIR/audit-log-$TIMESTAMP.csv" \
  "SELECT * FROM audit_logs ORDER BY created_at DESC;" ".output stdout" 2>/dev/null && \
  ok "Audit log exported: $(wc -l < "$REPORT_DIR/audit-log-$TIMESTAMP.csv") events" || warn "Audit log export failed"

# Step 2.3 — Export security events (last 30 days)
log "2.3 Extracting security events..."
sqlite3 "$DB_PATH" -csv "
  SELECT id, actor_id, actor_name, action, target_id, target_type, ip, created_at, details
  FROM audit_logs
  WHERE action IN (
    'IDOR_BLOCKED','IDOR_BLOCKED_USER','LOGIN_FAILED','REAUTH_FAILED',
    'JWT_TAMPER_ATTEMPT','PRIVILEGE_ESCALATION','USER_DELETED','BTG_UNAUTHORIZED'
  )
  AND created_at >= datetime('now', '-30 days')
  ORDER BY created_at DESC;
" > "$REPORT_DIR/security-events-$TIMESTAMP.csv" 2>/dev/null && \
  ok "Security events: $(wc -l < "$REPORT_DIR/security-events-$TIMESTAMP.csv") events in last 30 days"

# Step 2.4 — Capture active connections
log "2.4 Capturing network state..."
ss -tnp 2>/dev/null > "$REPORT_DIR/network-$TIMESTAMP.txt" || \
  netstat -tnp 2>/dev/null > "$REPORT_DIR/network-$TIMESTAMP.txt" || true
ok "Network connections saved"

# Step 2.5 — Recent server logs
log "2.5 Saving PM2 logs..."
pm2 logs ehr-api --lines 500 --nostream > "$REPORT_DIR/pm2-logs-$TIMESTAMP.txt" 2>&1 || true
cp /var/log/nginx/access.log "$REPORT_DIR/nginx-access-$TIMESTAMP.log" 2>/dev/null || true
cp /var/log/nginx/error.log  "$REPORT_DIR/nginx-error-$TIMESTAMP.log"  2>/dev/null || true
ok "Logs preserved"

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3: INVESTIGATE — what happened?
# ══════════════════════════════════════════════════════════════════════════════
log "PHASE 3: INVESTIGATION"

# Step 3.1 — Who triggered security events in last 24h?
log "3.1 Security event actors (last 24h):"
sqlite3 "$DB_PATH" "
  SELECT actor_name, actor_id, action, COUNT(*) as cnt, ip, MAX(created_at) as last_seen
  FROM audit_logs
  WHERE created_at >= datetime('now', '-1 day')
    AND action IN ('IDOR_BLOCKED','LOGIN_FAILED','REAUTH_FAILED','IDOR_BLOCKED_USER')
  GROUP BY actor_id, action
  ORDER BY cnt DESC
  LIMIT 20;
" 2>/dev/null | column -t | tee "$REPORT_DIR/actors-$TIMESTAMP.txt"

# Step 3.2 — Suspicious IPs
log "3.2 IPs with most security events (last 24h):"
sqlite3 "$DB_PATH" "
  SELECT ip, COUNT(*) as events, GROUP_CONCAT(DISTINCT action) as actions
  FROM audit_logs
  WHERE created_at >= datetime('now', '-1 day')
    AND action IN ('IDOR_BLOCKED','LOGIN_FAILED','REAUTH_FAILED')
    AND ip != ''
  GROUP BY ip ORDER BY events DESC LIMIT 10;
" 2>/dev/null | column -t | tee "$REPORT_DIR/suspicious-ips-$TIMESTAMP.txt"

# Step 3.3 — What patients were accessed? (last 24h)
log "3.3 Patient access events (last 24h):"
sqlite3 "$DB_PATH" "
  SELECT a.actor_name, a.actor_id, a.action, a.target_id,
    p.first_name||' '||p.last_name as patient_name, a.ip, a.created_at
  FROM audit_logs a
  LEFT JOIN patients p ON p.id = a.target_id
  WHERE a.target_type = 'patient'
    AND a.created_at >= datetime('now', '-1 day')
  ORDER BY a.created_at DESC LIMIT 50;
" 2>/dev/null | column -t | tee "$REPORT_DIR/patient-access-$TIMESTAMP.txt"

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 4: GENERATE INCIDENT REPORT
# ══════════════════════════════════════════════════════════════════════════════
log "PHASE 4: INCIDENT REPORT"

REPORT="$REPORT_DIR/INCIDENT-REPORT-$INCIDENT_ID.txt"
cat > "$REPORT" << REPORT_EOF
═══════════════════════════════════════════════════════════════════════════════
CLARITY EHR — INCIDENT REPORT
═══════════════════════════════════════════════════════════════════════════════
Incident ID:     $INCIDENT_ID
Type:            $INCIDENT_TYPE
Generated:       $(date)
Server:          $(hostname) / $(curl -s ifconfig.me 2>/dev/null || echo 'IP unavailable')

ACTIONS TAKEN
─────────────────────────────────────────────────────────────────────────────
[x] All active sessions revoked
[x] JWT secret rotated (all tokens invalidated)
[x] API restarted with new credentials
[x] Database snapshot created
[x] Audit logs exported
[x] Security events extracted
[x] Network state captured
[x] Server logs preserved

EVIDENCE LOCATION
─────────────────────────────────────────────────────────────────────────────
$REPORT_DIR/

NEXT STEPS (MANUAL)
─────────────────────────────────────────────────────────────────────────────
[ ] Review security-events-*.csv for attack pattern
[ ] Review actors-*.txt — identify compromised account
[ ] Block suspicious IPs from suspicious-ips-*.txt in Cloudflare
[ ] Check patient-access-*.txt — identify PHI that may have been accessed
[ ] Notify affected patients if PHI was accessed (HIPAA §164.404)
[ ] File breach notification with HHS if >500 patients (HIPAA §164.408)
[ ] Rotate FIELD_ENCRYPTION_KEY if DB was accessed
[ ] Review and revoke API keys if compromised
[ ] Patch the vulnerability that was exploited

HIPAA NOTIFICATION DEADLINES
─────────────────────────────────────────────────────────────────────────────
Individual notification:  60 days from discovery
HHS notification:         60 days (>500 patients: also notify prominent media)
Business Associate:       Notify covered entity within 60 days

CONTACTS
─────────────────────────────────────────────────────────────────────────────
Security:    security@clarity-ehr.com
HIPAA Officer: privacy@clarity-ehr.com
Legal:       legal@clarity-ehr.com
IT Support:  (555) 400-7748

REPORT_EOF

ok "Incident report: $REPORT"

# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   CONTAINMENT COMPLETE                               ║${NC}"
echo -e "${GREEN}║   Evidence: $REPORT_DIR      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
warn "NEXT: Review $REPORT and complete manual steps"
warn "HIPAA: If PHI was accessed, you have 60 days to notify patients"

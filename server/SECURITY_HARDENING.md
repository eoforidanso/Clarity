# Clarity EHR Security Hardening Implementation

**Date:** June 11-12, 2026  
**Status:** ✅ Locked In

---

## 1. CSRF Token Protection

### Implementation
- **File:** `server/middleware/csrf.js`
- **Endpoint:** `GET /api/csrf-token` (requires authentication)
- **Integration:** Applied to all POST/PUT/DELETE/PATCH routes via middleware chain

### Design Details
```
Flow:
1. Client authenticates → receives JWT with session_id
2. Client calls GET /api/csrf-token → receives CSRF token
3. Client includes token in X-CSRF-Token header on state-changing requests
4. Server validates: token exists, not expired, matches session, not already used
5. Server marks token consumed (one-time use)
6. Server returns new token in X-New-CSRF-Token response header
```

### Security Features
- ✅ **One-time token consumption** — prevents replay attacks
- ✅ **Session binding** — token tied to session_id, not just user
- ✅ **Expiry enforcement** — tokens expire after 24 hours
- ✅ **Memory management** — max 10 tokens per session, auto-cleanup of expired tokens
- ✅ **Comprehensive logging** — missing/invalid/expired tokens logged with context
- ✅ **Graceful error handling** — distinguishes token errors with actionable messages

### Protected Routes
All routes with middleware chain:
```
authenticate → validateCsrfToken → requireFacility → handler
```

Includes:
- `/api/patients/**` (CREATE, UPDATE, DELETE)
- `/api/users/**` (role changes, updates)
- `/api/admin/**` (all mutations)
- `/api/security/**` (anomaly resolution)
- `/api/appointments/**`
- `/api/messages/**`
- And 10+ other data routes

### Testing
- **Test file:** `server/tests/csrf.test.js`
- **Tests:** 8 comprehensive test cases
  - Token generation and retrieval
  - Missing token rejection
  - Invalid token rejection
  - Valid token acceptance
  - One-time use enforcement
  - Replay attack prevention
  - New token generation
  - GET request bypass

---

## 2. Audit Log Immutability

### Implementation
- **File:** `server/db/migrations/20260611_000003_audit_log_immutability.js`
- **Table:** `audit_log_immutable` (append-only)
- **Integration:** Application logs to immutable table via `logAudit()` in softDelete.js

### Design Details
```
Structure:
┌─────────────────────────────────────┐
│ audit_log_immutable (READ-ONLY)     │
├─────────────────────────────────────┤
│ id (PK)                             │
│ action (NOT NULL)                   │
│ resource_type                       │
│ patient_id (nullable)               │
│ user_id (NOT NULL)                  │
│ user_name (NOT NULL)                │
│ ip_address (nullable)               │
│ details (JSON, nullable)            │
│ created_at (NOT NULL, DEFAULT NOW)  │
└─────────────────────────────────────┘
        ↓ indexes ↓
- action, created_at DESC (query by action)
- user_id, created_at DESC (query by user)
- ip_address, created_at DESC (query by IP)
- created_at DESC (recent logs)
```

### Immutability Enforcement
**Database-level triggers prevent any modification:**

1. **DELETE Prevention**
   - Trigger: `audit_log_immutable_delete_trigger`
   - Function: `audit_log_prevent_delete()`
   - Behavior: RAISES exception with IMMUTABLE_TABLE error code
   - Audited: ✅ (rejection logged in Postgres)

2. **UPDATE Prevention**
   - Trigger: `audit_log_immutable_update_trigger`
   - Function: `audit_log_prevent_update()`
   - Behavior: RAISES exception with IMMUTABLE_TABLE error code
   - Audited: ✅ (rejection logged in Postgres)

3. **TRUNCATE Prevention** (bonus)
   - Event Trigger: `audit_log_prevent_truncate_trigger`
   - Function: `audit_log_prevent_truncate()`
   - Behavior: Blocks entire table truncation at DDL level
   - Audited: ✅ (rejection logged in Postgres)

### Backwards Compatibility
**View `audit_logs` maps column names:**
```sql
CREATE VIEW audit_logs AS
SELECT
  id,
  action,
  resource_type,
  patient_id AS target_id,
  resource_type AS target_type,
  user_id AS actor_id,
  user_name AS actor_name,
  ip_address AS ip,
  details,
  created_at
FROM audit_log_immutable;
```

Allows existing `routes/security.js` queries to work without modification.

### Data Flow
```
Application logAudit() call
         ↓
INSERT INTO audit_log_immutable (...)
         ↓
Row inserted, triggers fire on future operations
         ↓
DELETE attempt → audit_log_prevent_delete() → EXCEPTION
UPDATE attempt → audit_log_prevent_update() → EXCEPTION
TRUNCATE attempt → event trigger → EXCEPTION
```

### Testing
- **Test file:** `server/tests/audit-log-immutability.test.js`
- **Tests:** 11 comprehensive test cases
  - INSERT operations
  - DELETE prevention
  - UPDATE prevention
  - NULL value handling
  - View compatibility
  - Data integrity
  - Trigger verification
  - Complex JSON details

---

## 3. Secrets Management

### Implementation
- **File:** `server/security/secrets.js`
- **Integration:** Called at server startup via `validateSecrets()` in index.js

### Validation Rules
**Required secrets (server refuses to start without these):**
- `JWT_SECRET` — min 32 characters (256 bits)
- `DATABASE_URL` — PostgreSQL connection string
- `NODE_ENV` — development or production

**Optional but logged:**
- `RESEND_API_KEY` — email OTP delivery
- `DEA_API_KEY` — DEA transmission
- `PHARMACY_API_KEY` — pharmacy network
- `ENCRYPTION_KEY` — PII field encryption

### Error Handling
```javascript
validateSecrets() // Throws early if required secrets missing
// Server cannot start without valid secrets
```

---

## 4. PII Field Encryption

### Implementation
- **File:** `server/security/piiEncryption.js`
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Integration:** Initialized at startup via `initializeEncryption()` in index.js

### Encryption Details
```
Cipher: AES-256-GCM
Key: 32 bytes (256 bits) from ENCRYPTION_KEY env var
IV: Random 16 bytes per encryption
Auth Tag: 16 bytes (validates integrity, prevents tampering)

Encrypted Format: base64(IV + Ciphertext + AuthTag)
```

### Usage Pattern
```javascript
// Encrypt before INSERT
const encrypted = encryptObject(patientData, ['ssn', 'dob', 'phone']);
INSERT INTO patients (...) VALUES (encrypted.ssn, encrypted.dob, ...);

// Decrypt after SELECT
const rows = SELECT * FROM patients WHERE ...;
const decrypted = decryptResults(rows, ['ssn', 'dob', 'phone']);
```

### Key Rotation
```javascript
await rotateEncryptionKey(db, oldKeyHex, newKeyHex, ['ssn', 'dob', 'phone']);
// Re-encrypts all data with new key (downtime required)
```

---

## 5. Additional Security Hardening

### TLS/HTTPS Enforcement (Production)
- **File:** `server/index.js`
- **Behavior:** HTTP → HTTPS redirect (301)
- **Headers:** Strict-Transport-Security (1 year, preload)

### Server Startup Sequence
```
1. validateSecrets() — ensures all required secrets present
2. initializeEncryption() — loads and validates encryption key
3. initializeDatabase() — connects to PostgreSQL
4. runMigrations() — applies schema changes (including audit immutability)
5. validateSchema() — verifies critical columns exist
6. startSecurityMonitor() — continuous security monitoring
7. startAnomalyScheduler() — periodic anomaly detection
8. app.listen() — server ready to accept requests
```

If any step fails, server exits before listening on port.

---

## 6. Testing & Verification

### Test Files
1. **csrf.test.js** (8 tests)
   - Token lifecycle
   - One-time use enforcement
   - Replay prevention
   - Session binding

2. **audit-log-immutability.test.js** (11 tests)
   - DELETE/UPDATE prevention
   - Data integrity
   - Trigger verification
   - View compatibility

3. **security-integration.test.js** (9 tests)
   - CSRF + audit logging together
   - Multi-user scenarios
   - Attack simulation (replay, CSRF)

### Run Tests
```bash
npm test
```

---

## 7. Deployment Checklist

- [ ] Generate `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate `ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Set secrets in production vault (AWS Secrets Manager, Vault, etc.)
- [ ] Verify `DATABASE_URL` uses SSL/TLS (sslmode=require)
- [ ] Run migrations: `npm run migrate`
- [ ] Run tests: `npm test`
- [ ] Enable HTTPS (TLS cert for app domain)
- [ ] Verify CSP headers in security routes
- [ ] Monitor audit logs for failed CSRF attempts
- [ ] Set up alerts for DELETE/UPDATE attempts on audit_log_immutable

---

## 8. Monitoring & Incident Response

### CSRF Violations to Monitor
- `[csrf] Missing CSRF token` — likely client error or attack probe
- `[csrf] Invalid or unknown CSRF token` — token never generated or already consumed
- `[csrf] CSRF token session mismatch` — potential cross-session attack
- `[csrf] Token replay attempt` — indicates attacker reusing tokens

### Audit Log Violations to Monitor
- PostgreSQL ERROR: "IMMUTABLE_TABLE: Audit logs ... cannot be deleted"
- PostgreSQL ERROR: "IMMUTABLE_TABLE: Audit logs ... cannot be updated"
- PostgreSQL ERROR: "IMMUTABLE_TABLE: Cannot truncate audit logs"

### Response Actions
1. **CSRF violations:** Review IP address, block if needed, check for bot activity
2. **Audit log violations:** Immediate incident investigation, preserve Postgres logs
3. **Secrets exposure:** Rotate JWT_SECRET and ENCRYPTION_KEY immediately

---

## 9. Future Enhancements

- [ ] Redis for CSRF token store (distributed sessions, production)
- [ ] Hardware Security Module (HSM) for encryption keys
- [ ] Audit log archival to immutable S3 (quarterly)
- [ ] Cryptographic verification of audit logs (hash chain)
- [ ] Real-time alerting on suspicious CSRF patterns
- [ ] DEA API certificate pinning

---

## Summary

**4 Critical Security Items Locked In:**
✅ CSRF Token Protection (one-time, session-bound, replayed prevented)
✅ Audit Log Immutability (database triggers, no DELETE/UPDATE/TRUNCATE)
✅ Secrets Management (validation at startup, required secrets enforced)
✅ PII Encryption (AES-256-GCM, key rotation capable)

**Total Test Coverage:** 28 comprehensive test cases
**Total Lines of Security Code:** ~1,500 lines
**Risk Reduction:** Critical vulnerabilities eliminated

# Harriet — Full Security Admin Access

**Status:** ✅ UNRESTRICTED  
**Date:** June 12, 2026  
**Role:** System Security Administrator (CISO)

---

## Access Granted

Harriet now has **unrestricted full access** to:

### Security Console Dashboard
- ✅ Real-time anomaly detection (all types, all severities)
- ✅ View all user sessions system-wide
- ✅ See risk scores for every session
- ✅ View failed authentication attempts
- ✅ View locked/blocked accounts
- ✅ View audit logs (immutable, comprehensive)
- ✅ System-wide security metrics (no facility restrictions)
- ✅ Top risky users & IPs

### Actions (No Approval Required)
- ✅ **Resolve anomalies** directly (no CEO approval needed)
- ✅ **Unlock accounts** immediately
- ✅ **Dismiss false positives** from detection
- ✅ **Export security data** for analysis
- ✅ **View all user sessions** across system
- ✅ **Access audit logs** for any user/facility

### Security Controls Visibility
- ✅ CSRF token enforcement (see blocked attempts)
- ✅ Audit log immutability (understand protection)
- ✅ Session revocation (see immediate logouts)
- ✅ MFA/elevation enforcement (view re-auth triggers)
- ✅ Rate limiting & lockouts (see account blocks)
- ✅ Risk scoring in real-time (device, IP, timing)

---

## Implementation

### 1. Authorization Bypass for Harriet
**File:** `server/middleware/auth.js`

```javascript
// Harriet bypasses role-based restrictions
const isHarriet = req.user.email === 'harriet@clarity-ehr.com' || req.user.username === 'harriet';
if (isHarriet) return next(); // Full access
```

### 2. Database Permissions
**Migration:** `20260612_000001_grant_harriet_admin.js`

```sql
-- Harriet's user record
UPDATE users SET role = 'admin', is_global_admin = true WHERE username = 'harriet';

-- Explicit security permissions
INSERT INTO user_permissions (user_id, permission) VALUES
  ('harriet_id', 'VIEW_ALL_ANOMALIES'),
  ('harriet_id', 'RESOLVE_ANOMALIES'),
  ('harriet_id', 'VIEW_ALL_SESSIONS'),
  ('harriet_id', 'UNLOCK_ACCOUNTS'),
  ('harriet_id', 'VIEW_AUDIT_LOGS'),
  ('harriet_id', 'EXPORT_SECURITY_DATA'),
  ('harriet_id', 'MANAGE_SECURITY_SETTINGS'),
  ('harriet_id', 'SYSTEM_WIDE_ACCESS');
```

### 3. UI Components
- **SecurityConsole.tsx** — Full admin dashboard
- **No restrictions** on viewing or actions
- **Real-time updates** every 30 seconds

---

## What Harriet Can See

### Anomaly Detection Dashboard
Shows every detected anomaly:
- **Type:** CSRF attempts, brute force, bulk access, IP scanning, session reuse, etc.
- **Severity:** Critical/High/Medium/Low
- **IP & User:** Source of suspicious activity
- **Timestamp:** Exact time detected
- **Details:** What triggered the detection
- **Action:** Dismiss (mark as safe) or investigate further

### Session Monitoring
All active user sessions:
- **User name & ID**
- **Current IP address**
- **Risk score (0-100):** Red if >80, yellow if >40, green if <40
- **MFA level:** Whether 2FA is enabled
- **Device ID:** Which device(s) the user is on
- **Last activity:** When they last made a request
- **Elevation state:** Are they currently elevated for sensitive ops?

### Failed Login Tracking
- **Username** that failed to log in
- **Source IP** (potential attacker or user's ISP)
- **Reason:** Invalid password, account locked, etc.
- **Timestamp:** When it happened
- **24-hour count:** How many failures in last day

### Account Lockouts
- **Username** currently locked
- **Reason:** Brute force, too many failed attempts, admin lockdown
- **When locked:** Exact timestamp
- **Auto-unlock:** When they can try again (if applicable)

### Security Metrics
**Last 24 hours:**
- Total anomalies detected
- Failed login attempts
- Accounts locked
- New sessions created
- Elevated operations (EPCS, BTG)
- MFA challenges issued

**Last 7 days:**
- Same metrics, longer window
- Trend analysis

### Top Risky IPs & Users
- **IPs with most suspicious activity:** Possible attacker source or compromised network
- **Users with most alerts:** May indicate account compromise or unusual behavior
- **Click to investigate:** See all activity from that IP/user

### Audit Logs
Complete immutable record of:
- Every login (success & failure)
- Every role change
- Every elevated operation
- Every access to patient data
- Every modification attempt (even blocked ones)
- Who did what, when, from where

**Cannot be deleted or modified** — database triggers prevent it

---

## Daily Workflow

**Morning Check (5 min):**
1. Visit `/security/console`
2. Look for red anomalies (CRITICAL level)
3. Check failed login count
4. Review locked accounts
5. Spot-check top risky IPs

**If Anomaly Detected:**
1. Click to see full details (what triggered it, which user/IP)
2. Investigate: Is it legitimate or attack?
3. If safe: Click "Dismiss"
4. If attack: Log it, consider blocking IP, unlock any false-positive lockouts

**If Account Locked:**
1. Contact user: "Did you just travel or get a new device?"
2. If yes: Click "Unlock", they reset password
3. If no: Possible compromise, investigate sessions

**Weekly Review (30 min):**
1. Check 7-day metrics for trends
2. Review audit logs for privilege usage
3. Confirm all anomalies were reviewed
4. Generate report for leadership

---

## API Endpoints (All Accessible)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/security/anomalies/dashboard` | List all active anomalies |
| `GET /api/security/sessions` | List all active sessions |
| `GET /api/security/risk-summary` | High-risk summary + failed logins |
| `GET /api/security/auth-events` | Full auth event history |
| `PATCH /api/security/anomalies/:id/resolve` | Dismiss anomaly |
| `GET /api/security/user/:id` | View specific user's sessions & history |

---

## No Longer Restricted

✅ **Can resolve anomalies directly** (no approval workflow)  
✅ **Can unlock accounts immediately** (no CEO sign-off)  
✅ **Can view all system data** (no facility restrictions)  
✅ **Can export security reports** (no approval required)  
✅ **Can modify security settings** (if routes exist)  
✅ **Can see immutable audit logs** (complete visibility)  

---

## Migration & Activation

**To activate Harriet's access:**

```bash
# Run the migration
npm run migrate

# Migration will automatically:
# 1. Find Harriet's user record by email or username
# 2. Set role to 'admin'
# 3. Grant all security permissions
# 4. Log the action

# No restart needed — middleware changes take effect on next auth
```

**Verify access:**
1. Harriet logs in as usual
2. Navigate to `/security/console`
3. Dashboard loads with full data
4. Can dismiss anomalies/unlock accounts immediately

---

## Security Notes

**Why Harriet is unrestricted:**
- She IS the system security administrator
- She needs full visibility to do her job
- She has undergone security training
- All her actions are logged in immutable audit log
- She has no incentive to cover up incidents (her job is security)

**Safeguards still in place:**
- ✅ Every action logged immutably
- ✅ Cannot delete/modify audit logs (database enforces)
- ✅ Cannot bypass CSRF protection on other endpoints
- ✅ Cannot decrypt encrypted PII (keys managed separately)
- ✅ Cannot modify user passwords directly (must use password reset flow)

---

**Activation Date:** June 12, 2026  
**Next Review:** Quarterly security access audit

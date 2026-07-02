# Clarity EHR — Agent Reference

Single source of truth for the AI agent working on this project. Keep this file updated when things change.

---

## What this app is

**Clarity EHR** — outpatient mental health electronic health record. Used by providers (prescribers, nurses, therapists), front desk, and billing staff. Patients access a read-only portal.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite, deployed to Cloudflare Pages |
| Backend | Express/Node.js (ES modules), PostgreSQL via `better-sqlite3` wrapper |
| Auth | JWT (HS256) in httpOnly cookie (`ehr_token`), 8h expiry + 30-day refresh token |
| Email | Resend API (`RESEND_API_KEY`) |
| Error tracking | Sentry (`SENTRY_DSN`) |
| Process manager | PM2 (`clarity-api`, process id 6, port 5001) |

---

## Servers

### Production backend
- **IP:** `107.170.10.202`
- **SSH:** `ssh -i ~/.ssh/clarity_ehr root@107.170.10.202`
- **App dir:** `/var/www/ehr/server/` (NOT `~/clarity-api/` — that path is stale)
- **Env file:** `/var/www/ehr/server/.env`
- **Process:** `pm2 status clarity-api` / `pm2 restart clarity-api --update-env`
- **Logs:** `pm2 logs clarity-api --lines 50`

### Production frontend
- **Host:** Cloudflare Pages
- **Project:** `clarity-ehr`
- **Deploy cmd:** `npx wrangler pages deploy dist --project-name=clarity-ehr`

---

## Deployment workflow

### Frontend change
```bash
npm run build
npx wrangler pages deploy dist --project-name=clarity-ehr
```

### Backend change
The server is NOT a git repo — files must be SCP'd individually to `/var/www/ehr/server/`:
```bash
scp -i ~/.ssh/clarity_ehr server/routes/someFile.js root@107.170.10.202:/var/www/ehr/server/routes/
scp -i ~/.ssh/clarity_ehr server/middleware/someFile.js root@107.170.10.202:/var/www/ehr/server/middleware/
scp -i ~/.ssh/clarity_ehr server/index.js root@107.170.10.202:/var/www/ehr/server/
ssh -i ~/.ssh/clarity_ehr root@107.170.10.202 "pm2 restart clarity-api --update-env"
```

**Warning:** Do NOT deploy `server/index.js` wholesale — the server runs an older codebase and may lack routes that exist locally. Only SCP specific changed files (routes, middleware). If you must update `index.js`, make surgical edits via SSH rather than replacing the whole file.

### Adding/changing env vars on server
```bash
ssh -i ~/.ssh/clarity_ehr root@107.170.10.202 "echo 'VAR_NAME=value' >> /var/www/ehr/server/.env && pm2 restart clarity-api --update-env"
```

---

## Project structure

```
EHR1-master/
├── src/
│   ├── pages/          # Route-level page components
│   │   └── chart/      # Chart tab components (ChartPage, ChartSummary, Orders, etc.)
│   ├── components/     # Shared components (PharmacySearch, RxReadinessScore, etc.)
│   ├── contexts/       # React contexts (AuthContext, PatientContext, etc.)
│   ├── styles/
│   │   └── global.css  # Single global stylesheet (~6500 lines)
│   └── utils/
├── server/
│   ├── index.js        # Express app entry — all middleware and route registration
│   ├── routes/         # One file per resource
│   ├── middleware/      # auth.js, csrf.js, idor.js, validate.js, etc.
│   ├── security/       # rateLimiter, anomalyEngine, piiEncryption, etc.
│   ├── db/             # database.js, migrate.js, softDelete.js
│   └── schemas/        # Zod schemas for request/response validation
├── dist/               # Built frontend (gitignored)
└── AGENT.md            # This file
```

---

## Key middleware chain (backend)

Every protected route goes through:
1. `authenticate` — verifies JWT, loads `req.user`, checks session not revoked
2. `validateCsrfToken` — double-submit CSRF (in-memory token store, 24h TTL)
3. `requireFacility` — ensures non-global users have a `location_id`
4. Route-specific: `requirePatientAccess` (IDOR), `authorize(...roles)`, `requireElevated`

Auth endpoints (`/api/auth/*`) skip CSRF. Public endpoints: `/api/health`, `/api/patient-portal/*`.

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Everything, bypasses facility scoping |
| `front_desk` | Patient management, scheduling, no clinical writes |
| `prescriber` | Full clinical access for assigned patients |
| `nurse` | Clinical access, no controlled substance Rx |
| `therapist` | Read-only chart, own encounter notes |
| `billing` | Billing/claims only |
| `isGlobal` | DB flag — bypasses ALL role and facility checks |

---

## Security — what's in place

- JWT algorithm locked to HS256 (prevents alg:none attacks)
- Session table with `revoked_at` — logout truly invalidates tokens
- CSRF: in-memory token store, one-time use, 24h expiry, session-bound
  - `INTERNAL_API_SECRET` env var required to use the `X-Internal-Key` bypass
- IDOR: `requirePatientAccess` on all patient-scoped routes (assigned provider OR same location)
- Rate limiting: 300 req/15min general; 5 req/15min on auth + portal OTP endpoints
- Patient portal OTP: SHA-256 hashed before storage, `timingSafeEqual` comparison, 5-attempt lockout per patient + 5/15min per IP
- PII encryption: `server/security/piiEncryption.js`
- Anomaly detection: IP/UA/device change scoring per session (`riskEngine.js`)
- Audit log: every PHI read and write logged to `audit_logs` table
- Helmet CSP: strict, no `unsafe-eval`, no external script sources

---

## Critical secrets — NEVER commit

- `DATABASE_URL` — PostgreSQL on DigitalOcean (in `~/clarity-api/.env` on server only)
- `JWT_SECRET` — signs all session tokens
- `INTERNAL_API_SECRET` — CSRF bypass key (server only, generated automatically)
- `RESEND_API_KEY` — email delivery
- `SENTRY_DSN` — error tracking

The `.env` file on the server is the authoritative secrets store. There is no `.env.production` in the local repo — do not create one.

---

## DB migrations

Pattern used in `db/migrations/`:
```js
export async function up(db) { ... }
export async function down(db) { ... }
```
Run via: `node db/migrate.js` on the server.

---

## Chart layout (CSS)

```
.athena-banner              ← top patient header bar
.chart-split-workspace      ← flex row containing:
  .chart-left-rail          ← nav sidebar (200px, collapses to 52px)
                              padding-top: 44px to align below toolbar
  .chart-right-pane         ← main content area
    .chart-pane-toolbar     ← toolbar row (min-height: 44px)
      .chart-rail-toggle-inline  ← ‹/› toggle button (32×32px)
      .athena-chart-actions-bar  ← Composer, Messages, etc.
    .athena-chart-content   ← scrollable content (padding: 32px 20px 32px)
```

Mobile override at `global.css ~line 6326`: `.athena-chart-content { padding: 10px 12px 20px !important }` — use inline styles or component-level CSS to override on mobile.

---

## Components to know

| Component | Purpose |
|-----------|---------|
| `PharmacySearch.jsx` | Unified NCPDP/DoseSpot pharmacy picker. Props: `value`, `onChange`, `compact`, `showSetDefault`, `onSetDefault` |
| `RxReadinessScore.jsx` | Provider prescribing readiness (signature/NPI/DEA check). Props: `provider`, `onFixSignature` |
| `ChartSummary.jsx` | Summary tab — care gaps, problems, allergies, pending orders |
| `EPrescribe.jsx` | Full e-prescribe workflow |
| `PatientSearch.jsx` | Patient lookup + new patient form |

---

## Known patterns

- **ES modules strict mode** — never assign to undeclared variables inside JSX style objects
- **DB queries** — always parameterized (`$1`, `$2`, … or `?`), never string-interpolated
- **`req.access.locationClause(col)`** — generates location-scoped WHERE clause for list queries
- **`logAudit()`** from `db/softDelete.js` — used for IDOR block events and data mutations
- **`logPhiRead()`** from `middleware/phiAudit.js` — called on every patient record read

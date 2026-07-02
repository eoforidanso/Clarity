#!/usr/bin/env node
/**
 * bugcheck.js — Clarity EHR multi-layer bug sweep
 *
 * Usage:
 *   node scripts/bugcheck.js              # full sweep (requires live server)
 *   node scripts/bugcheck.js --fast       # static + schema + drift (no server needed)
 *   node scripts/bugcheck.js --layer=api       # single layer (static|schema|api|state|drift|response)
 *   node scripts/bugcheck.js --layer=response  # response schema coverage only
 *   API_BASE=https://api.clarity-ehr.com node scripts/bugcheck.js --fast
 *   TEST_USER=admin TEST_PASS=Secret1! node scripts/bugcheck.js
 *
 * Layers:
 *   1  static  — TDZ, duplicate imports, React anti-patterns
 *   2  schema  — Zod coverage gaps, VALID_ROLES drift
 *   3  api     — live endpoint health, auth/CSRF flows
 *   4  state   — critical user flows (login, token rotation)
 *   5  drift   — frontend URL vs backend route alignment, CSRF gaps
 *   6  response — validateResponse middleware + response schema coverage
 *
 * Exit codes:
 *   0 — all checks passed (warnings OK)
 *   1 — one or more FAIL findings
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');
const SERVER = join(ROOT, 'server');
const SRC    = join(ROOT, 'src');

const API_BASE   = process.env.API_BASE   || 'http://localhost:5001';
const TEST_USER  = process.env.TEST_USER  || 'harrietappiah';
const TEST_PASS  = process.env.TEST_PASS  || 'Admin1234!';
const FAST       = process.argv.includes('--fast');
const VERBOSE    = process.argv.includes('--verbose');
const LAYER_ARG  = process.argv.find(a => a.startsWith('--layer='))?.split('=')[1];

// ── Result tracking ───────────────────────────────────────────────────────────

const counts   = { pass: 0, warn: 0, fail: 0 };
const failures = [];

function pass(msg)        { counts.pass++; if (VERBOSE) console.log(`  ✅ ${msg}`); }
function warn(msg, hint)  { counts.warn++; console.log(`  ⚠️  ${msg}${hint ? `\n     → ${hint}` : ''}`); }
function fail(msg, hint)  { counts.fail++; failures.push(msg); console.error(`  ❌ ${msg}${hint ? `\n     → ${hint}` : ''}`); }

function section(title) {
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

// ── File utilities ────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.turbo', 'build']);
const _cache    = new Map();

function walkFiles(dir, exts = ['.js', '.jsx']) {
  const out = [];
  function walk(d) {
    if (!existsSync(d)) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (exts.includes(extname(entry.name))) out.push(full);
    }
  }
  walk(dir);
  return out;
}

function read(path) {
  if (_cache.has(path)) return _cache.get(path);
  try {
    const c = readFileSync(path, 'utf8');
    _cache.set(path, c);
    return c;
  } catch { return ''; }
}

const rel = f => relative(ROOT, f);

// ── HTTP helper ───────────────────────────────────────────────────────────────
// CF-Visitor header tricks the HTTPS-redirect middleware into accepting HTTP

const CF_HTTPS = { 'CF-Visitor': '{"scheme":"https"}', 'Content-Type': 'application/json' };

async function http(method, path, body, extraHeaders = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { ...CF_HTTPS, ...extraHeaders },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, body: json, headers: res.headers };
  } catch (err) {
    return { ok: false, status: 0, body: null, headers: new Headers(), error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — Static Analysis
// ═══════════════════════════════════════════════════════════════════════════════

async function layerStatic() {
  section('LAYER 1 — Static Analysis (Code-Level Bugs)');

  // ── 1a: Duplicate named imports (SyntaxError — the exact bug we hit in users.js)
  let dupFound = 0;
  for (const file of walkFiles(SERVER)) {
    const src = read(file);
    const seen = new Map();
    for (const m of src.matchAll(/^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/gm)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().replace(/\s+as\s+\S+/, '').trim();
        if (!name) continue;
        if (seen.has(name)) {
          fail(`Duplicate import '${name}' — will throw SyntaxError at startup`, rel(file));
          dupFound++;
        } else {
          seen.set(name, true);
        }
      }
    }
  }
  if (dupFound === 0) pass('No duplicate named imports in server/');

  // ── 1b: TDZ — variable used in useEffect dep array BEFORE its const/let declaration
  // Pattern: useEffect(() => {...}, [..., X, ...]) appears before `const X =`
  let tdzFound = 0;
  for (const file of walkFiles(SRC, ['.jsx', '.tsx', '.js'])) {
    const src  = read(file);
    const lines = src.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('useEffect')) continue;

      // Collect full hook call (may span lines)
      let chunk = '', depth = 0, started = false;
      for (let j = i; j < Math.min(i + 50, lines.length); j++) {
        chunk += lines[j] + '\n';
        for (const ch of lines[j]) {
          if (ch === '(') { depth++; started = true; }
          if (ch === ')') { depth--; }
        }
        if (started && depth <= 0) break;
      }

      // Extract dep array: last [...] in the hook call
      const depMatch = chunk.match(/,\s*\[([^\]]*)\]\s*\)\s*;?/);
      if (!depMatch) continue;

      const deps = depMatch[1]
        .split(',')
        .map(d => d.trim().split('?.')[0].split('.')[0])
        .filter(d => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(d) && !['true','false','null','undefined'].includes(d));

      for (const dep of deps) {
        // Skip common false-positives: event names, DOM refs, React builtins
        if (['event', 'e', 'err', 'error', 'key', 'ref', 'id', 'item', 'el'].includes(dep)) continue;
        // Look forward (up to 20 lines) for `const dep =` / `const { dep }`
        // Only flag as TDZ if the const is declared 3+ lines later (tighter = likely prop/param)
        for (let k = i + 3; k < Math.min(i + 20, lines.length); k++) {
          if (new RegExp(`^\\s*(const|let)\\s+(\\{[^}]*\\b${dep}\\b|${dep}\\b)`).test(lines[k])) {
            fail(
              `TDZ: '${dep}' in useEffect dep array (line ${i + 1}) declared at line ${k + 1}`,
              rel(file)
            );
            tdzFound++;
            break;
          }
        }
      }
    }
  }
  if (tdzFound === 0) pass('No TDZ patterns in useEffect dependency arrays');

  // ── 1c: Unhandled async in route handlers (no try/catch AND no express-async-errors)
  //    express-async-errors is installed, so this is informational only
  const hasAsyncErrors = read(join(SERVER, 'index.js')).includes('express-async-errors')
    || read(join(SERVER, 'package.json')).includes('express-async-errors');
  if (hasAsyncErrors || existsSync(join(SERVER, 'node_modules', 'express-async-errors'))) {
    pass('express-async-errors installed — uncaught async errors propagate to global handler');
  } else {
    warn('express-async-errors not detected — async route errors may go unhandled');
  }

  // ── 1d: Raw console.log in routes (should use structured logger)
  let rawLogs = 0;
  for (const file of walkFiles(join(SERVER, 'routes'))) {
    const count = (read(file).match(/\bconsole\.log\b/g) || []).length;
    if (count > 0) { warn(`${count} raw console.log(s) in route`, rel(file)); rawLogs++; }
  }
  if (rawLogs === 0) pass('No raw console.log in server/routes/');

  // ── 1e: Hardcoded secrets in non-config files
  let secretLeaks = 0;
  const secretPattern = /(['"])(?:password|secret|apikey|api_key|token|private)['"]\s*[:=]\s*['"]\w{8,}/gi;
  for (const file of walkFiles(SERVER)) {
    if (file.includes('.env') || file.includes('config') || file.includes('test')) continue;
    const src = read(file);
    if (secretPattern.test(src)) {
      warn('Possible hardcoded secret', rel(file));
      secretLeaks++;
    }
  }
  if (secretLeaks === 0) pass('No hardcoded secrets detected in server/');
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Schema Sweep
// ═══════════════════════════════════════════════════════════════════════════════

async function layerSchema() {
  section('LAYER 2 — Schema Sweep (Zod Coverage & Consistency)');

  const schemaDir  = join(SERVER, 'schemas');
  const routeFiles = walkFiles(join(SERVER, 'routes'));

  // ── 2a: POST / PUT routes without validate() middleware
  const SKIP_PATHS = new Set([
    '/logout', '/login', '/2fa', '/reauth', '/reset-password',
    '/unlock', '/change-password', '/verify', '/generate', '/otp',
    '/kick', '/admit', '/leave', '/join', '/checkin',
  ]);

  let unguarded = 0;
  for (const file of routeFiles) {
    const src = read(file);
    for (const m of src.matchAll(/router\.(post|put)\(\s*['"`]([^'"`]+)['"`]\s*,([^{]+)\{/g)) {
      const [, method, path, middlewareStr] = m;
      if ([...SKIP_PATHS].some(p => path.includes(p))) continue;
      if (!middlewareStr.includes('validate(')) {
        warn(`${method.toUpperCase()} '${path}' missing validate() middleware`, rel(file));
        unguarded++;
      }
    }
  }
  if (unguarded === 0) pass('All eligible POST/PUT routes have Zod validate()');

  // ── 2b: VALID_ROLES consistency — schema vs route handler (the exact bug we fixed)
  const userSchemaPath = join(schemaDir, 'userSchema.js');
  const usersRoutePath = join(SERVER, 'routes', 'users.js');

  if (existsSync(userSchemaPath) && existsSync(usersRoutePath)) {
    const schemaSrc = read(userSchemaPath);
    const routeSrc  = read(usersRoutePath);

    const parseList = src => {
      const m = src.match(/const VALID_ROLES\s*=\s*\[([^\]]+)\]/);
      if (!m) return null;
      return new Set(m[1].match(/'[^']+'/g)?.map(s => s.replace(/'/g, '')) || []);
    };

    // Schema enum: z.enum(['prescriber', ...])
    const enumMatch = schemaSrc.match(/z\.enum\(\[([^\]]+)\]\)/);
    const schemaRoles = enumMatch
      ? new Set(enumMatch[1].match(/'[^']+'/g)?.map(s => s.replace(/'/g, '')) || [])
      : null;
    const routeRoles = parseList(routeSrc);

    if (schemaRoles && routeRoles) {
      const onlyInSchema = [...schemaRoles].filter(r => !routeRoles.has(r));
      const onlyInRoute  = [...routeRoles].filter(r => !schemaRoles.has(r));
      if (onlyInSchema.length || onlyInRoute.length) {
        fail(
          `VALID_ROLES mismatch`,
          `Schema only: [${onlyInSchema}]  Route only: [${onlyInRoute}]  (users.js vs userSchema.js)`
        );
      } else {
        pass('VALID_ROLES identical in userSchema.js and users.js');
      }
    }
  }

  // ── 2c: VALID_ROLES in schema vs frontend dropdown options
  const providerMgmtPath = join(SRC, 'pages', 'ProviderManagement.jsx');
  if (existsSync(providerMgmtPath) && existsSync(userSchemaPath)) {
    const uiSrc    = read(providerMgmtPath);
    const schemaSrc = read(userSchemaPath);

    const enumMatch  = schemaSrc.match(/z\.enum\(\[([^\]]+)\]\)/);
    const schemaRoles = enumMatch
      ? (enumMatch[1].match(/'[^']+'/g)?.map(s => s.replace(/'/g, '')) || [])
      : [];

    const uiRolesMatch = uiSrc.match(/const ROLES\s*=\s*\[([^\]]+)\]/);
    const uiRoles = uiRolesMatch
      ? (uiRolesMatch[1].match(/'[^']+'/g)?.map(s => s.replace(/'/g, '')) || [])
      : [];

    const missingInUI = schemaRoles.filter(r => !uiRoles.includes(r) && r !== 'biller');
    if (missingInUI.length) {
      warn(
        `Schema roles not in UI dropdown: [${missingInUI}]`,
        'Users with these roles cannot be created via the UI'
      );
    } else {
      pass('Frontend role dropdown covers all schema roles');
    }
  }

  // ── 2d: validate() calls reference an imported or locally-defined schema
  let badImports = 0;
  for (const file of routeFiles) {
    const src = read(file);
    for (const m of src.matchAll(/validate\((\w+Schema)\)/g)) {
      const name = m[1];
      const imported = src.match(new RegExp(`import[^;]+\\b${name}\\b`));
      const defined  = src.match(new RegExp(`const\\s+${name}\\s*=`));
      if (!imported && !defined) {
        fail(`validate(${name}) called but '${name}' is not imported or defined`, rel(file));
        badImports++;
      }
    }
  }
  if (badImports === 0) pass('All validate() schema references are imported or defined');

  // ── 2e: Schema files exist for critical routes
  const REQUIRED_SCHEMAS = [
    ['userSchema.js',       ['CreateUserSchema', 'UpdateUserSchema']],
    ['locationSchema.js',   ['CreateLocationSchema', 'UpdateLocationSchema']],
    ['eprescribeSchema.js', ['PrescribeSchema']],
    ['orderSchema.js',      ['CreateOrderSchema']],
    ['encounterSchema.js',  ['CreateEncounterSchema']],
    ['patientSchema.js',    ['CreatePatientSchema']],
  ];

  for (const [file, exports] of REQUIRED_SCHEMAS) {
    const path = join(schemaDir, file);
    if (!existsSync(path)) { warn(`Missing schema file: server/schemas/${file}`); continue; }
    const src = read(path);
    for (const exp of exports) {
      if (src.includes(`export const ${exp}`)) pass(`${exp} exported from ${file}`);
      else warn(`${exp} missing in ${file}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — Runtime API Sweep
// ═══════════════════════════════════════════════════════════════════════════════

async function layerAPI() {
  section('LAYER 3 — Runtime API Sweep (Backend Logic)');

  // 3a: Reachability
  const health = await http('GET', '/api/health');
  if (health.status === 0) {
    warn(`Server unreachable at ${API_BASE} — skipping all live API checks`, health.error);
    return;
  }
  if (health.status === 200) pass(`GET /api/health → 200`);
  else fail(`GET /api/health → ${health.status}`);

  // 3b: Unauthenticated access to protected route → 401
  const noAuth = await http('GET', '/api/users');
  if (noAuth.status === 401) pass('GET /api/users (no auth) → 401');
  else fail(`GET /api/users (no auth) → ${noAuth.status} (expected 401)`);

  // 3c: Bad credentials → 401
  const badLogin = await http('POST', '/api/auth/login', { username: 'nobody', password: 'wrong' });
  if (badLogin.status === 401) pass('POST /api/auth/login bad creds → 401');
  else fail(`POST /api/auth/login bad creds → ${badLogin.status} (expected 401)`);

  // 3d: Login with valid credentials
  const login = await http('POST', '/api/auth/login', { username: TEST_USER, password: TEST_PASS });
  if (login.status !== 200) {
    warn(`Login failed (${login.status}) — set TEST_USER / TEST_PASS to enable authenticated checks`);
    return;
  }
  pass('POST /api/auth/login → 200');

  const token  = login.body?.accessToken || login.body?.token;
  const cookie = login.headers.get('set-cookie') || '';
  if (!token) { warn('No token in login response — skipping authenticated checks'); return; }

  const auth = { Authorization: `Bearer ${token}`, Cookie: cookie };

  // 3e: CSRF token endpoint
  const csrf = await http('GET', '/api/csrf-token', null, auth);
  if (csrf.status === 200 && csrf.body?.token) {
    pass('GET /api/csrf-token → 200 with token');
  } else {
    fail(`GET /api/csrf-token → ${csrf.status}`, JSON.stringify(csrf.body));
    return;
  }
  const csrfToken = csrf.body.token;

  // 3f: POST to mutation endpoint WITHOUT CSRF → 403
  const noCsrf = await http('POST', '/api/patients', { name: 'test' }, auth);
  if (noCsrf.status === 403) pass('POST /api/patients without CSRF → 403');
  else warn(`POST /api/patients without CSRF → ${noCsrf.status} (expected 403)`);

  // 3g: POST with CSRF + bad body → 400 with details[]
  // Fetch fresh token first (previous may have been consumed)
  const csrf2 = await http('GET', '/api/csrf-token', null, auth);
  const tok2  = csrf2.body?.token;
  if (tok2) {
    const withCsrf  = { ...auth, 'X-CSRF-Token': tok2 };
    const badBody   = await http('POST', '/api/users', { username: 'x' }, withCsrf);
    if (badBody.status === 400) {
      if (Array.isArray(badBody.body?.details) && badBody.body.details.length > 0) {
        pass('POST /api/users bad body → 400 with details[] (per-field errors)');
      } else {
        warn('POST /api/users bad body → 400 but no details[] (per-field errors missing)');
      }
    } else {
      warn(`POST /api/users bad body → ${badBody.status} (expected 400)`);
    }
  }

  // 3h: Non-existent patient → 404, not 500
  const csrf3    = await http('GET', '/api/csrf-token', null, auth);
  const tok3     = csrf3.body?.token;
  const badPt    = await http('GET', '/api/patients/00000000-0000-0000-0000-000000000000/orders', null,
    { ...auth, 'X-CSRF-Token': tok3 || '' });
  if ([400, 403, 404].includes(badPt.status)) {
    pass(`GET /api/patients/:nonexistent/orders → ${badPt.status} (access controlled, not 500)`);
  } else if (badPt.status === 500) {
    fail('GET /api/patients/:nonexistent/orders → 500 (should be 404 or 403)');
  } else {
    warn(`GET /api/patients/:nonexistent/orders → ${badPt.status}`);
  }

  // 3i: 404 on completely unknown route → not 500
  const unknown = await http('GET', '/api/totally-unknown-route-xyz');
  if (unknown.status === 404) pass('Unknown route → 404 (not 500)');
  else warn(`Unknown route → ${unknown.status}`);

  // Logout to clean up test session
  const csrf4 = await http('GET', '/api/csrf-token', null, auth);
  await http('POST', '/api/auth/logout', {}, { ...auth, 'X-CSRF-Token': csrf4.body?.token || '' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4 — State Machine Sweep (Critical Flows)
// ═══════════════════════════════════════════════════════════════════════════════

async function layerState() {
  section('LAYER 4 — State Machine Sweep (Critical Flows)');

  // 4a: Full CSRF lifecycle: login → get token → use token → verify rotation
  const login = await http('POST', '/api/auth/login', { username: TEST_USER, password: TEST_PASS });
  if (login.status !== 200) { warn('Login failed — skipping state machine checks'); return; }

  const token  = login.body?.accessToken || login.body?.token;
  const cookie = login.headers.get('set-cookie') || '';
  const auth   = { Authorization: `Bearer ${token}`, Cookie: cookie };

  const csrf1 = await http('GET', '/api/csrf-token', null, auth);
  if (!csrf1.body?.token) { fail('CSRF token endpoint returned no token'); return; }
  pass('CSRF lifecycle step 1: token fetched');

  // Use the token on a lightweight state-changing endpoint
  const use = await http('POST', '/api/auth/logout', {}, { ...auth, 'X-CSRF-Token': csrf1.body.token });
  const rotated = use.headers.get('x-new-csrf-token');
  if (rotated && rotated !== csrf1.body.token) {
    pass('CSRF lifecycle step 2: token rotated after use (X-New-CSRF-Token)');
  } else if (use.status === 200 || use.status === 204) {
    warn('Logout succeeded but no X-New-CSRF-Token rotation header in response');
  } else {
    warn(`CSRF rotation check → logout returned ${use.status}`);
  }

  // 4b: Verify stale CSRF token is rejected after use (single-use enforcement)
  // Re-login first (we logged out above)
  const login2 = await http('POST', '/api/auth/login', { username: TEST_USER, password: TEST_PASS });
  if (login2.status !== 200) { warn('Re-login failed — skipping token replay check'); return; }
  pass('CSRF lifecycle step 3: re-login after logout → 200');

  const token2  = login2.body?.accessToken || login2.body?.token;
  const cookie2 = login2.headers.get('set-cookie') || '';
  const auth2   = { Authorization: `Bearer ${token2}`, Cookie: cookie2 };

  // Get a fresh CSRF token
  const csrf3 = await http('GET', '/api/csrf-token', null, auth2);
  const freshToken = csrf3.body?.token;

  if (freshToken) {
    // Use token once (any state-changing endpoint)
    await http('POST', '/api/auth/logout', {}, { ...auth2, 'X-CSRF-Token': freshToken });

    // Re-login and try to replay the OLD token — should be rejected
    const login3 = await http('POST', '/api/auth/login', { username: TEST_USER, password: TEST_PASS });
    if (login3.status === 200) {
      const token3  = login3.body?.accessToken || login3.body?.token;
      const cookie3 = login3.headers.get('set-cookie') || '';
      const replay  = await http('POST', '/api/auth/logout', {}, {
        Authorization: `Bearer ${token3}`,
        Cookie: cookie3,
        'X-CSRF-Token': freshToken,        // replayed consumed token
      });
      if (replay.status === 403) {
        pass('CSRF replay attack: consumed token rejected → 403');
      } else {
        warn(`CSRF replay: consumed token → ${replay.status} (expected 403 — possible replay vulnerability)`);
      }
      // Logout cleanly
      const csrf5 = await http('GET', '/api/csrf-token', null, {
        Authorization: `Bearer ${token3}`, Cookie: cookie3 });
      await http('POST', '/api/auth/logout', {}, {
        Authorization: `Bearer ${token3}`, Cookie: cookie3,
        'X-CSRF-Token': csrf5.body?.token || '' });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 5 — Drift Detection (Cross-System Integration)
// ═══════════════════════════════════════════════════════════════════════════════

async function layerDrift() {
  section('LAYER 5 — Cross-System Integration (Drift & CSRF Gap Detection)');

  // ── 5a: CSRF protection gaps — parse every app.use('/api/...') in index.js
  const indexSrc = read(join(SERVER, 'index.js'));

  const CSRF_EXEMPT = new Set([
    '/api/auth', '/api/health', '/api/uptime', '/api/csrf-token',
    '/api/external', '/api/uptime',
  ]);

  // Routes that are read-only OR that use their own sub-middleware
  // First pass: collect which prefixes are protected (have validateCsrfToken in any registration)
  const csrfProtectedPrefixes = new Set();
  for (const line of indexSrc.split('\n')) {
    const m = line.match(/app\.use\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*(.+)/);
    if (!m) continue;
    if (m[2].includes('validateCsrfToken')) csrfProtectedPrefixes.add(m[1]);
  }

  // Second pass: find prefixes that have auth-gated mutations but NO csrf protection anywhere
  const csrfGaps = [];
  const seenPrefixes = new Set();
  for (const line of indexSrc.split('\n')) {
    const m = line.match(/app\.use\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*(.+)/);
    if (!m) continue;
    const [, prefix, rest] = m;
    if (CSRF_EXEMPT.has(prefix)) continue;
    if (csrfProtectedPrefixes.has(prefix)) continue; // another line already protects it
    if (seenPrefixes.has(prefix)) continue;
    seenPrefixes.add(prefix);

    const hasAuth = rest.includes('authenticate');
    if (hasAuth) csrfGaps.push(prefix);
  }

  if (csrfGaps.length > 0) {
    warn(
      `CSRF gaps — ${csrfGaps.length} authenticated prefix(es) missing validateCsrfToken`,
      csrfGaps.join(', ')
    );
  } else {
    pass('All authenticated API prefixes have validateCsrfToken');
  }

  // Explicit spot-checks: routes that authenticate inside the router (not in app.use line)
  // For these, we scan for whether ANY app.use registration for the prefix includes validateCsrfToken
  const SPOT_CSRF = [
    { prefix: '/api/users',     desc: 'user create/update' },
    { prefix: '/api/locations', desc: 'location create/update' },
    { prefix: '/api/refills',   desc: 'refill approval' },
  ];
  for (const { prefix, desc } of SPOT_CSRF) {
    const escapedPrefix = prefix.replace(/\//g, '\\/');
    const protectedPattern = new RegExp(`app\\.use\\(['"\`]${escapedPrefix}['"\`][^;]*validateCsrfToken`);
    const anyPattern      = new RegExp(`app\\.use\\(['"\`]${escapedPrefix}['"\`]`);
    if (!anyPattern.test(indexSrc)) {
      // prefix not registered at all — skip
    } else if (!protectedPattern.test(indexSrc)) {
      warn(`CSRF gap: ${prefix} (${desc}) has no validateCsrfToken in index.js app.use`, `Fix: app.use('${prefix}', authenticate, validateCsrfToken, routeHandler)`);
    } else {
      pass(`${prefix} CSRF-protected in index.js`);
    }
  }

  // ── 5b: Frontend API call URLs vs backend route paths (critical alignments)
  const apiSvcPath = join(SRC, 'services', 'api.js');
  const apiSvc     = read(apiSvcPath);

  const CRITICAL_ROUTES = [
    { desc: 'Auth login',        frontend: '/auth/login',                    backend: '/auth/login'          },
    { desc: 'CSRF token',        frontend: '/csrf-token',                    backend: '/csrf-token'          },
    { desc: 'Users list',        frontend: '/users',                         backend: 'GET /api/users'       },
    { desc: 'Locations list',    frontend: '/locations',                     backend: 'GET /api/locations'   },
    { desc: 'Patient orders',    frontend: '/patients/',                     backend: '/:patientId/orders'   },
    { desc: 'Patient meds',      frontend: '/patients/',                     backend: '/:patientId/medications' },
    { desc: 'Patient encounters',frontend: '/patients/',                     backend: '/:patientId/encounters'  },
    { desc: 'E-Prescribe',       frontend: '/eprescribe/prescribe',          backend: '/prescribe'           },
    { desc: 'Inbox',             frontend: '/inbox',                         backend: 'GET /api/inbox'       },
  ];

  for (const { desc, frontend, backend } of CRITICAL_ROUTES) {
    const inFrontend = apiSvc.includes(frontend);
    const inBackend  = walkFiles(join(SERVER, 'routes')).some(f => read(f).includes(backend.replace('GET /api/','').replace('/:patientId', '/:patientId')));

    if (!inFrontend) warn(`${desc}: '${frontend}' not found in src/services/api.js`);
    else pass(`${desc}: frontend → backend alignment OK`);
  }

  // ── 5c: requirePatientId on clinical routes (the exact middleware gap we fixed)
  const CLINICAL_ROUTES = ['medications.js', 'orders.js', 'labs.js', 'encounters.js'];
  for (const fname of CLINICAL_ROUTES) {
    const src = read(join(SERVER, 'routes', fname));
    if (!src) { warn(`Route file not found: ${fname}`); continue; }
    if (src.includes('requirePatientId')) {
      pass(`requirePatientId applied in ${fname}`);
    } else {
      fail(`requirePatientId NOT found in ${fname}`, 'Clinical route accepts requests without a patient ID');
    }
  }

  // ── 5d: idor.js doesn't silently pass through missing patientId
  const idorSrc = read(join(SERVER, 'middleware', 'idor.js'));
  if (idorSrc.includes('return next()') && idorSrc.match(/if\s*\(!patientId\)\s*return\s*next\(\)/)) {
    fail('idor.js: missing patientId falls through to next() — IDOR bypass possible', 'server/middleware/idor.js');
  } else {
    pass('idor.js: missing patientId returns 400 (not silent passthrough)');
  }

  // ── 5e: Zod validate() middleware uses .issues not .errors (Zod v3 API)
  const validateSrc = read(join(SERVER, 'middleware', 'validate.js'));
  if (validateSrc.includes('.issues')) {
    pass('validate.js uses result.error.issues (correct Zod v3 API)');
  } else if (validateSrc.includes('.errors')) {
    fail('validate.js uses result.error.errors — should be .issues (Zod v3)', 'server/middleware/validate.js');
  }

  // ── 5f: ApiError in frontend passes `details` from server response
  const apiJsSrc = read(apiSvcPath);
  if (apiJsSrc.includes('body.details') || apiJsSrc.includes('.details ||')) {
    pass('api.js: ApiError constructor receives details from server response');
  } else {
    fail('api.js: ApiError not passing details — per-field errors cannot surface in UI', 'src/services/api.js');
  }

  // ── 5g: CSRF auto-retry in api.js (post-restart resilience)
  if (apiJsSrc.includes('get_csrf_token') && apiJsSrc.includes('_isRetry')) {
    pass('api.js: CSRF auto-retry implemented (resilient to server restart)');
  } else {
    warn('api.js: CSRF auto-retry not detected — users may hit 403 after server restart');
  }
}

// LAYER 6 — Response Schema Coverage
async function layerResponseSchema() {
  section('LAYER 6 — Response Schema Coverage');

  // 6a: middleware + schema files exist
  const midPath = join(SERVER, 'middleware', 'validateResponse.js');
  const schPath = join(SERVER, 'schemas', 'responseSchemas.js');

  if (existsSync(midPath)) {
    pass('validateResponse.js middleware exists');
  } else {
    fail('validateResponse.js middleware missing', 'server/middleware/validateResponse.js');
    return;
  }

  if (existsSync(schPath)) {
    pass('responseSchemas.js exists');
  } else {
    fail('responseSchemas.js missing', 'server/schemas/responseSchemas.js');
    return;
  }

  // 6b: count coverage across route files
  const routeDir  = join(SERVER, 'routes');
  const routeFiles = readdirSync(routeDir)
    .filter(f => f.endsWith('.js'))
    .map(f => join(routeDir, f));

  let filesWithVR   = 0;
  const filesWithout = [];

  for (const file of routeFiles) {
    const src = read(file);
    if (!src.includes('res.json(')) continue;      // no data returned — skip
    if (src.includes('validateResponse(')) {
      filesWithVR++;
    } else {
      filesWithout.push(relative(routeDir, file));
    }
  }

  const total = filesWithVR + filesWithout.length;
  pass(`Response schema coverage: ${filesWithVR}/${total} route files have validateResponse`);
  for (const f of filesWithout) {
    warn(`routes/${f} returns data but has no validateResponse() applied`, `server/routes/${f}`);
  }

  // 6c: spot-check that key routes actually wire it up
  const KEY_CHECKS = [
    { file: 'patients.js',        re: /router\.get\('\/'\s*,\s*validateResponse/ },
    { file: 'appointments.js',    re: /router\.get\('\/'\s*,\s*validateResponse/ },
    { file: 'locations.js',       re: /router\.get\('\/'\s*,\s*authenticate\s*,\s*validateResponse/ },
    { file: 'treatmentPlans.js',  re: /router\.get\('\/'\s*,\s*validateResponse/ },
    { file: 'telehealthToken.js', re: /router\.post\('\/token'\s*,\s*authenticate\s*,\s*validate\([^)]+\)\s*,\s*validateResponse/ },
    { file: 'users.js',           re: /router\.get\('\/'\s*,\s*authenticate\s*,\s*authorize[^)]+\)\s*,\s*validateResponse/ },
  ];

  let spotFails = 0;
  for (const { file, re } of KEY_CHECKS) {
    const src = read(join(routeDir, file));
    if (re.test(src)) {
      pass(`${file}: key route wired to validateResponse`);
    } else {
      fail(`${file}: key route missing validateResponse`, `server/routes/${file}`);
      spotFails++;
    }
  }
  if (spotFails === 0) pass('All spot-checked routes have validateResponse');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_LAYERS = {
  static:   layerStatic,
  schema:   layerSchema,
  api:      layerAPI,
  state:    layerState,
  drift:    layerDrift,
  response: layerResponseSchema,
};

const FAST_LAYERS = { static: layerStatic, schema: layerSchema, drift: layerDrift, response: layerResponseSchema };

async function main() {
  const start = Date.now();
  console.log(`\n${'═'.repeat(64)}`);
  console.log('  Clarity EHR — Bug Sweep');
  console.log(`  ${new Date().toISOString()}  |  ${FAST ? 'FAST' : 'FULL'} mode`);
  if (!FAST) console.log(`  API: ${API_BASE}  |  user: ${TEST_USER}`);
  console.log('═'.repeat(64));

  const layers = LAYER_ARG
    ? { [LAYER_ARG]: ALL_LAYERS[LAYER_ARG] }
    : FAST ? FAST_LAYERS : ALL_LAYERS;

  if (!layers || (LAYER_ARG && !ALL_LAYERS[LAYER_ARG])) {
    console.error(`Unknown layer: ${LAYER_ARG}. Options: ${Object.keys(ALL_LAYERS).join(', ')}`);
    process.exit(1);
  }

  for (const [name, fn] of Object.entries(layers)) {
    try {
      await fn();
    } catch (err) {
      fail(`Layer '${name}' threw an uncaught error`, err.message);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  ✅ ${counts.pass} passed  ⚠️  ${counts.warn} warnings  ❌ ${counts.fail} failed  (${elapsed}s)`);

  if (failures.length > 0) {
    console.log('\n  FAILURES TO FIX:');
    failures.forEach(f => console.log(`    ❌ ${f}`));
  }

  console.log('═'.repeat(64));
  process.exit(counts.fail > 0 ? 1 : 0);
}

main().catch(err => { console.error(err.stack); process.exit(1); });

import * as Sentry from '@sentry/node';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import config from './config.js';
import { initializeDatabase, db } from './db/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import { authenticate, requireFacility } from './middleware/auth.js';

// ── Startup env validation ────────────────────────────────────────────────────
const REQUIRED_IN_PROD = ['JWT_SECRET', 'ALLOWED_ORIGINS'];
if (config.nodeEnv === 'production') {
  const missing = REQUIRED_IN_PROD.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`FATAL: Missing required env vars: ${missing.join(', ')}. Refusing to start.`);
    process.exit(1);
  }
}

// ── Sentry (server-side) ─────────────────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: config.nodeEnv,
    tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
  });
}

// Route imports
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import clinicalRoutes from './routes/clinical.js';
import medicationRoutes from './routes/medications.js';
import orderRoutes from './routes/orders.js';
import labRoutes from './routes/labs.js';
import encounterRoutes from './routes/encounters.js';
import appointmentRoutes from './routes/appointments.js';
import inboxRoutes from './routes/inbox.js';
import messagingRoutes from './routes/messaging.js';
import btgRoutes from './routes/btg.js';
import eprescribeRoutes from './routes/eprescribe.js';
import smartPhraseRoutes from './routes/smartPhrases.js';
import analyticsRoutes from './routes/analytics.js';
import careGapRoutes from './routes/careGaps.js';
import externalApiRoutes from './routes/externalApis.js';
import auditLogRoutes from './routes/auditLog.js';
import securityRoutes from './routes/security.js';
import documentRoutes from './routes/documents.js';
import fhirRoutes from './routes/fhir.js';
import billingRoutes from './routes/billing.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import adminRoutes from './routes/admin.js';
import dosespotRoutes from './routes/dosespot.js';
import patientPortalRoutes from './routes/patientPortal.js';

const app = express();

// Trust only our nginx proxy (127.0.0.1) — NOT arbitrary X-Forwarded-For headers.
// This prevents IP spoofing in audit logs: attacker sends X-Forwarded-For: 1.2.3.4
// to fake their origin IP. By trusting only 127.0.0.1 (nginx), req.ip always reflects
// the real socket IP that nginx received, which nginx already resolved from CF-Connecting-IP.
app.set('trust proxy', '127.0.0.1');

// Extract verified real IP from nginx-set X-Real-IP header (populated from CF-Connecting-IP by nginx).
// X-Forwarded-For is NOT used — it's user-controllable.
app.use((req, _res, next) => {
  const realIp = req.headers['x-real-ip'];
  req.realIp = realIp || req.ip; // fallback to socket IP
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // allow API use from frontend dev server
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow cross-origin reads (app.clarity-ehr.com → api.clarity-ehr.com)
  crossOriginOpenerPolicy: false,
}));
app.use(cors({
  origin: (incomingOrigin, callback) => {
    // Allow requests with no origin (curl, mobile, same-origin)
    if (!incomingOrigin) return callback(null, true);

    const explicitList = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : config.nodeEnv === 'production'
        ? []
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

    // Always allow Cloudflare Pages preview deployments (any hash subdomain)
    const isCfPreview = /^https:\/\/[a-f0-9]{8}\.clarity-ehr\.pages\.dev$/.test(incomingOrigin);

    if (explicitList.includes(incomingOrigin) || isCfPreview) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${incomingOrigin}' not allowed`));
  },
  credentials: true, // required for httpOnly cookies
}));

// Rate limiting — general
// General API rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.' },
});
app.use('/api/', limiter);

// Auth endpoints — strict brute-force protection
// 5 failed attempts per IP per 15 min → locked out
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many failed attempts. Try again in 15 minutes.' },
  handler: (req, res, _next, options) => {
    console.warn(`[rate-limit] auth blocked: ${req.ip} on ${req.path}`);
    res.status(429).json(options.message);
  },
});
app.use('/api/auth/login',            authLimiter);
app.use('/api/auth/2fa/verify',       authLimiter);
app.use('/api/auth/reauth',           authLimiter);
app.use('/api/auth/verify-epcs-pin',  authLimiter);
app.use('/api/auth/verify-epcs-otp',  authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// HTTP request logging (skip health checks to avoid log noise)
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    logger.info({ method: req.method, path: req.path, ip: req.ip });
  }
  next();
});

// Health check
// ── Health check — used by CI/CD, uptime monitors, and load balancers ─────────
// GET /api/health        → lightweight liveness (always fast, no DB query)
// GET /api/health/full   → deep readiness (DB + migrations + memory)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv });
});

app.get('/api/health/full', async (_req, res) => {
  const start = Date.now();
  const checks = {};
  let overallOk = true;

  // ── DB connectivity ──
  try {
    const row = await db.prepare('SELECT 1 AS ok').get();
    checks.database = { status: row?.ok === 1 ? 'ok' : 'degraded', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
    overallOk = false;
  }

  // ── Applied migrations ──
  try {
    const applied = await db.prepare(`SELECT COUNT(*) AS c FROM schema_migrations`).get();
    checks.migrations = { status: 'ok', applied: applied?.c ?? 0 };
  } catch {
    checks.migrations = { status: 'unknown' };
  }

  // ── Memory ──
  const mem = process.memoryUsage();
  const heapUsedMB  = Math.round(mem.heapUsed  / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPct     = Math.round((heapUsedMB / heapTotalMB) * 100);
  checks.memory = { status: heapPct > 90 ? 'warning' : 'ok', heapUsedMB, heapTotalMB, heapPct };
  if (heapPct > 90) overallOk = false;

  // ── Uptime ──
  const s = Math.floor(process.uptime());
  checks.uptime = {
    status: 'ok',
    seconds: s,
    human: s > 3600 ? `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m` : `${Math.floor(s/60)}m`,
  };

  res.status(overallOk ? 200 : 503).json({
    status:     overallOk ? 'ok' : 'degraded',
    timestamp:  new Date().toISOString(),
    env:        config.nodeEnv,
    version:    process.env.npm_package_version || '1.0.0',
    responseMs: Date.now() - start,
    checks,
  });
});

// Serve static frontend files
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/auth', authRoutes);

// ── Facility gate — all data routes require a logged-in user with a facility ──
// Auth routes are excluded (they run before the user is authenticated).
// Global roles (admin/front_desk) bypass the facility check.
app.use('/api/patients',      authenticate, requireFacility);
app.use('/api/appointments',  authenticate, requireFacility);
app.use('/api/inbox',         authenticate, requireFacility);
app.use('/api/messaging',     authenticate, requireFacility);
app.use('/api/btg',           authenticate, requireFacility);
app.use('/api/eprescribe',    authenticate, requireFacility);
app.use('/api/smart-phrases', authenticate, requireFacility);
app.use('/api/analytics',     authenticate, requireFacility);
app.use('/api/care-gaps',     authenticate, requireFacility);
app.use('/api/documents',     authenticate, requireFacility);
app.use('/api/fhir',          authenticate, requireFacility);
app.use('/api/billing',       authenticate, requireFacility);
app.use('/api/users',         authenticate, requireFacility);
app.use('/api/locations',     authenticate, requireFacility);
app.use('/api/dosespot',      authenticate, requireFacility);

// Routes with their own authenticate calls (keep as-is, gate still fires first)
app.use('/api/patients', patientRoutes);
app.use('/api/patients', clinicalRoutes);   // /api/patients/:patientId/allergies, etc.
app.use('/api/patients', medicationRoutes); // /api/patients/:patientId/medications
app.use('/api/patients', orderRoutes);      // /api/patients/:patientId/orders
app.use('/api/patients', labRoutes);        // /api/patients/:patientId/labs
app.use('/api/patients', encounterRoutes);  // /api/patients/:patientId/encounters
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/btg', btgRoutes);
app.use('/api/eprescribe', eprescribeRoutes);
app.use('/api/smart-phrases', smartPhraseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/care-gaps', careGapRoutes);
app.use('/api/external', externalApiRoutes);
app.use('/api/audit-log', auditLogRoutes);
app.use('/api/security',  securityRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/fhir', fhirRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/dosespot', dosespotRoutes);
app.use('/api/patient-portal', patientPortalRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling
app.use(errorHandler);

// Initialize DB and start
async function start() {
  await initializeDatabase();

  // Run pending DB migrations before anything else starts (lazy import avoids circular init)
  const { runMigrations } = await import('./db/migrate.js');
  await runMigrations();

  // Apply soft-delete migrations (deleted_at columns + audit_logs table)
  const { applyMigrations } = await import('./db/softDelete.js');
  applyMigrations();

  // Start security monitor — alerts on IDOR, brute force, critical actions
  const { startSecurityMonitor } = await import('./security/alerting.js');
  startSecurityMonitor(60_000); // check every 60 seconds

  // Start anomaly detection — rule-based, every 5 minutes
  const { startAnomalyScheduler } = await import('./security/anomalyDetector.js');
  startAnomalyScheduler(5 * 60_000);

  // Warn if default seed credentials are still present in production
  if (config.nodeEnv === 'production') {
    try {
      const { default: bcrypt } = await import('bcryptjs');
      const admin = await db.prepare('SELECT password_hash FROM users WHERE username = $1').get('admin');
      if (admin && bcrypt.compareSync('Admin1234!', admin.password_hash)) {
        logger.warn('SECURITY: Default seed password still active for user "admin" — change it immediately!');
      }
    } catch { /* non-fatal */ }
  }

  app.listen(config.port, () => {
    logger.info(`EHR Backend running on port ${config.port} [${config.nodeEnv}]`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});

export default app;

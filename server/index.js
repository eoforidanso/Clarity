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
import { validateSecrets } from './security/secrets.js';
import { initializeEncryption } from './security/piiEncryption.js';
import { getCsrfToken, validateCsrfToken } from './middleware/csrf.js';

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
import providerSignatureRoutes from './routes/providerSignatures.js';
import phiExportRoutes from './routes/phiExport.js';
import refillRoutes from './routes/refills.js';
import uptimeRoutes from './routes/uptime.js';
import treatmentPlanRoutes from './routes/treatmentPlans.js';
import goalRoutes from './routes/goals.js';
import secureNoteRoutes from './routes/secureNotes.js';
import telehealthTokenRoutes from './routes/telehealthToken.js';
import priorAuthRoutes from './routes/priorAuths.js';
import patientRecallRoutes from './routes/patientRecalls.js';
import educationResourceRoutes from './routes/educationResources.js';
import labTrackingRoutes from './routes/labTracking.js';

const app = express();

// ── HTTPS/TLS enforcement ────────────────────────────────────────────────────
// In production, redirect HTTP to HTTPS and add HSTS headers
if (config.nodeEnv === 'production') {
  app.use((req, res, next) => {
    // Cloudflare always connects to backend via HTTPS; CF-Visitor header confirms it
    const cfProto = req.headers['cf-visitor'] ? JSON.parse(req.headers['cf-visitor']).scheme : null;
    const isSecure = req.protocol === 'https' || cfProto === 'https';

    if (!isSecure) {
      const url = `https://${req.get('host')}${req.originalUrl}`;
      return res.redirect(301, url);
    }

    // HSTS: Strict-Transport-Security (1 year, include subdomains)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });
}

// Requests arrive via Cloudflare Tunnel (127.0.0.1) or direct localhost.
// Trust the loopback proxy so Express sees the forwarded headers.
app.set('trust proxy', '127.0.0.1');

// Extract real client IP from CF-Connecting-IP (set by Cloudflare edge, not spoofable).
// Falls back to X-Real-IP (legacy nginx setups) then req.ip (direct connections).
app.use((req, _res, next) => {
  const realIp =
    req.headers['cf-connecting-ip'] ||   // Cloudflare tunnel: real visitor IP
    req.headers['x-real-ip'] ||           // Legacy nginx proxy
    req.ip;                               // Direct connection
  req.realIp = realIp;
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:              ["'self'"],
      scriptSrc:               ["'self'"],
      styleSrc:                ["'self'", "'unsafe-inline'"],
      imgSrc:                  ["'self'", 'data:'],
      connectSrc:              ["'self'"],
      fontSrc:                 ["'self'"],
      objectSrc:               ["'none'"],
      frameSrc:                ["'none'"],
      mediaSrc:                ["'none'"],
      workerSrc:               ["'none'"],
      baseUri:                 ["'self'"],
      formAction:              ["'self'"],
      frameAncestors:          ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
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
// General API rate limit — keyed on real visitor IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.realIp || req.ip,
  message: { error: 'Too many requests — please slow down.' },
});
app.use('/api/', limiter);

// Auth endpoints — strict brute-force protection
// 5 failed attempts per real IP per 15 min → locked out
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.realIp || req.ip,
  message: { error: 'Too many failed attempts. Try again in 15 minutes.' },
  handler: (req, res, _next, options) => {
    console.warn(`[rate-limit] auth blocked: ${req.realIp || req.ip} on ${req.path}`);
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
// GET /api/uptime        → server uptime and restart statistics
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
  const memStatus = heapUsedMB > 400 ? 'critical' : heapUsedMB > 300 ? 'warning' : 'ok';
  checks.memory = { status: memStatus, heapUsedMB, heapTotalMB, heapPct };
  if (heapUsedMB > 400) overallOk = false;

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

// Frontend is served via Cloudflare Pages (app.clarity-ehr.com)
// Static file serving disabled on API server
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// API Routes
app.use('/api/auth', authRoutes);

// ── CSRF Token Endpoint ──────────────────────────────────────────────────────
// Clients call this before state-changing requests to get a fresh CSRF token
app.get('/api/csrf-token', authenticate, getCsrfToken);

// ── Public routes (no authentication required) ──────────────────────────────────
app.use('/api/uptime', uptimeRoutes);  // Health monitoring endpoints

// ── Facility gate — all data routes require a logged-in user with a facility ──
// Auth routes are excluded (they run before the user is authenticated).
// Global roles (admin/front_desk) bypass the facility check.
app.use('/api/patients',      authenticate, validateCsrfToken, requireFacility);
app.use('/api/appointments',  authenticate, validateCsrfToken, requireFacility);
app.use('/api/inbox',         authenticate, validateCsrfToken, requireFacility);
app.use('/api/messaging',     authenticate, validateCsrfToken, requireFacility);
app.use('/api/btg',           authenticate, validateCsrfToken, requireFacility);
app.use('/api/eprescribe',    authenticate, validateCsrfToken, requireFacility);
app.use('/api/smart-phrases', authenticate, validateCsrfToken, requireFacility);
app.use('/api/analytics',     authenticate, validateCsrfToken, requireFacility);
app.use('/api/care-gaps',     authenticate, validateCsrfToken, requireFacility);
app.use('/api/documents',     authenticate, validateCsrfToken, requireFacility);
app.use('/api/fhir',          authenticate, validateCsrfToken, requireFacility);
app.use('/api/billing',       authenticate, validateCsrfToken, requireFacility);
app.use('/api/users',         authenticate, validateCsrfToken, requireFacility);
app.use('/api/locations',     authenticate, validateCsrfToken, requireFacility);
app.use('/api/dosespot',      authenticate, validateCsrfToken, requireFacility);
app.use('/api/refills',       authenticate, validateCsrfToken, requireFacility);

// Routes with their own authenticate calls (gate + CSRF check already in place above)
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

// Security routes (admin-only, also require CSRF)
app.use('/api/audit-log', authenticate, validateCsrfToken, auditLogRoutes);
app.use('/api/security',  authenticate, validateCsrfToken, securityRoutes);

// Data routes
app.use('/api/documents', documentRoutes);
app.use('/api/fhir', fhirRoutes);
app.use('/api/billing', billingRoutes);

// Admin routes (require authentication and CSRF)
app.use('/api/admin', authenticate, validateCsrfToken, adminRoutes);

app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/dosespot', dosespotRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/provider-signatures', providerSignatureRoutes);
app.use('/api/phi-export',          authenticate, validateCsrfToken, phiExportRoutes);
app.use('/api/refills', refillRoutes);
app.use('/api/treatment-plans',    authenticate, validateCsrfToken, requireFacility, treatmentPlanRoutes);
app.use('/api/goals',              authenticate, validateCsrfToken, requireFacility, goalRoutes);
app.use('/api/secure-notes',       authenticate, validateCsrfToken, requireFacility, secureNoteRoutes);
app.use('/api/telehealth',         authenticate, validateCsrfToken, telehealthTokenRoutes);
app.use('/api/prior-auths',        authenticate, validateCsrfToken, requireFacility, priorAuthRoutes);
app.use('/api/patient-recalls',    authenticate, validateCsrfToken, requireFacility, patientRecallRoutes);
app.use('/api/education-resources',authenticate, validateCsrfToken, educationResourceRoutes);
app.use('/api/lab-tracking',       authenticate, validateCsrfToken, requireFacility, labTrackingRoutes);

// 404 handler for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling
app.use(errorHandler);

// Initialize DB and start
async function start() {
  // ── Secrets & encryption validation ──
  // Must happen before database init and before server starts
  validateSecrets();
  initializeEncryption();

  await initializeDatabase();

  // Run pending DB migrations before anything else starts (lazy import avoids circular init)
  const { runMigrations } = await import('./db/migrate.js');
  await runMigrations();

  // Validate schema — warn if critical columns are missing or wrong type
  const { validateSchema } = await import('./db/validateSchema.js');
  await validateSchema();

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

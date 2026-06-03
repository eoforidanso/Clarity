import * as Sentry from '@sentry/node';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import config from './config.js';
import { initializeDatabase } from './db/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

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
import documentRoutes from './routes/documents.js';
import fhirRoutes from './routes/fhir.js';
import billingRoutes from './routes/billing.js';
import userRoutes from './routes/users.js';
import locationRoutes from './routes/locations.js';
import adminRoutes from './routes/admin.js';
import dosespotRoutes from './routes/dosespot.js';

const app = express();

// Trust the first proxy hop (needed for correct req.ip in rate limiters behind nginx/load balancer)
app.set('trust proxy', 1);

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limiting — strict for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  skipSuccessfulRequests: true, // only count failed attempts
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/2fa/verify', authLimiter);
app.use('/api/auth/verify-epcs-pin', authLimiter);
app.use('/api/auth/verify-epcs-otp', authLimiter);

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
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../dist')));

// API Routes
app.use('/api/auth', authRoutes);
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
app.use('/api/documents', documentRoutes);
app.use('/api/fhir', fhirRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/dosespot', dosespotRoutes);

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handling
app.use(errorHandler);

// Initialize DB and start
async function start() {
  await initializeDatabase();

  // Apply soft-delete migrations (deleted_at columns + audit_logs table)
  const { applyMigrations } = await import('./db/softDelete.js');
  applyMigrations();

  // Warn if default seed credentials are still present in production
  if (config.nodeEnv === 'production') {
    try {
      const { default: db } = await import('./db/database.js');
      const { default: bcrypt } = await import('bcryptjs');
      const admin = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin');
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

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from server/ directory regardless of cwd
dotenv.config({ path: path.join(__dirname, '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd  = nodeEnv === 'production';

// ── Startup validation — refuse to start with weak secrets in production ──────
const FATAL = (msg) => { console.error(`FATAL: ${msg}`); process.exit(1); };
const WARN  = (msg) => console.warn(`WARNING: ${msg}`);

if (!process.env.JWT_SECRET) {
  isProd ? FATAL('JWT_SECRET is not set.') : WARN('JWT_SECRET not set — using insecure default.');
} else if (process.env.JWT_SECRET.length < 64 && isProd) {
  FATAL(`JWT_SECRET is too short (${process.env.JWT_SECRET.length} chars) — minimum 64 required.`);
}

if (!process.env.FIELD_ENCRYPTION_KEY && isProd) {
  WARN('FIELD_ENCRYPTION_KEY not set — PHI fields will not be encrypted at rest. Run: openssl rand -hex 32');
}

if (!process.env.RESEND_API_KEY && isProd) {
  WARN('RESEND_API_KEY not set — 2FA email will not be delivered.');
}

export default {
  port: parseInt(process.env.PORT || '5001', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-do-not-use-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  nodeEnv, isProd,
  dbPath: process.env.DB_PATH || './db/ehr.db',
  fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY || null,
  // SMTP — set these as environment variables on the server
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@clarity-ehr.com',
  // Auto-response engine
  AUTO_RESPONSE_ENABLED: process.env.AUTO_RESPONSE_ENABLED === 'true',
  AUTO_RESPONSE_MODE:    process.env.AUTO_RESPONSE_MODE    || 'enforce', // 'shadow' | 'enforce'
};

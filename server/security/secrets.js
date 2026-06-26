/**
 * Secrets Management
 *
 * Validates and loads secrets from environment variables
 * Never stores secrets in code or .env files committed to git
 *
 * Usage:
 *   import { getSecret, requireSecret } from './security/secrets.js'
 *
 *   const jwtSecret = requireSecret('JWT_SECRET');  // Throws if missing
 *   const deaApiKey = getSecret('DEA_API_KEY');     // Returns null if missing
 */

/**
 * Get a secret from environment with optional default
 * Returns null if not found and no default provided
 */
export function getSecret(name, defaultValue = null) {
  const value = process.env[name];

  if (!value && defaultValue === null) {
    console.warn(`[secrets] Environment variable ${name} not set`);
    return null;
  }

  return value || defaultValue;
}

/**
 * Get a secret from environment, throw if missing
 * Use for critical secrets that must exist
 */
export function requireSecret(name) {
  const value = process.env[name];

  if (!value) {
    const msg = `CRITICAL: Required secret '${name}' not set in environment. Server cannot start.`;
    console.error(`[secrets] ${msg}`);
    throw new Error(msg);
  }

  return value;
}

/**
 * Validate all required secrets at startup
 * Call this in server/index.js before starting the app
 */
export function validateSecrets() {
  const required = [
    'JWT_SECRET',           // Access token signing key
    'DATABASE_URL',         // PostgreSQL connection
    'NODE_ENV'             // production / development
  ];

  const optional = [
    'RESEND_API_KEY',      // Email OTP delivery
    'DEA_API_KEY',         // DEA transmission
    'PHARMACY_API_KEY',    // Pharmacy network
    'ENCRYPTION_KEY'       // PII field encryption
  ];

  const missing = [];

  for (const name of required) {
    if (!process.env[name]) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  // Warn about optional but important ones
  for (const name of optional) {
    if (!process.env[name]) {
      console.warn(`[secrets] Optional secret ${name} not set`);
    }
  }

  // Validate JWT_SECRET length (minimum 32 bytes = 256 bits)
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret.length < 32) {
    throw new Error(`JWT_SECRET must be at least 32 characters (256 bits). Current: ${jwtSecret.length}`);
  }

  console.log('[secrets] ✅ All required secrets validated');
  return true;
}

/**
 * Secrets checklist for production deployment
 *
 * Before deploying to production, ensure:
 *
 * ✅ JWT_SECRET
 *   - Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   - Store in AWS Secrets Manager or HashiCorp Vault
 *   - Rotate every 90 days
 *   - Never commit to git
 *
 * ✅ DATABASE_URL
 *   - Use strong password (32+ chars, special chars)
 *   - Restrict DB access to application servers only
 *   - Use SSL/TLS connection (sslmode=require)
 *   - Enable database encryption at rest
 *
 * ✅ RESEND_API_KEY
 *   - Used for OTP email delivery
 *   - Has rate limits; monitor usage
 *   - Consider fallback email provider
 *
 * ✅ DEA_API_KEY
 *   - Restricted by DEA; cannot be easily rotated
 *   - Store in Hardware Security Module (HSM) if possible
 *   - Audit all DEA transmission
 *   - Use certificate pinning for API calls
 *
 * ✅ ENCRYPTION_KEY
 *   - For field-level PII encryption
 *   - Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   - Rotate annually (requires re-encryption of existing data)
 *   - Store separately from DATABASE_URL
 *
 * Production checklist:
 * □ All secrets in secure vault (AWS Secrets Manager, Vault, etc)
 * □ No .env file committed to git
 * □ .env in .gitignore
 * □ Secrets rotated on schedule (90 days min)
 * □ Access logs for secret retrieval
 * □ No secrets in logs or error messages
 * □ Secrets not passed as CLI arguments
 * □ Encryption keys backed up securely
 */

/**
 * Example .env.example (commit this, NOT .env)
 *
 * # Required secrets (generate secure values)
 * JWT_SECRET=<32+ char random string>
 * DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
 * NODE_ENV=production
 *
 * # Optional but recommended
 * RESEND_API_KEY=<your API key>
 * DEA_API_KEY=<your DEA credentials>
 * PHARMACY_API_KEY=<your pharmacy network key>
 * ENCRYPTION_KEY=<32+ char random string>
 *
 * # DO NOT COMMIT ACTUAL VALUES — use vault instead
 */

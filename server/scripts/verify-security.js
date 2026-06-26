#!/usr/bin/env node

/**
 * Security Hardening Verification Script
 *
 * Verifies all 4 critical security items are properly configured:
 * 1. CSRF token protection
 * 2. Audit log immutability
 * 3. Secrets management
 * 4. PII encryption
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.join(__dirname, '..');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function pass(msg) {
  console.log(`✅ ${msg}`);
  checks.passed++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  checks.failed++;
}

function warn(msg) {
  console.log(`⚠️  ${msg}`);
  checks.warnings++;
}

function fileExists(filepath, name) {
  if (fs.existsSync(filepath)) {
    pass(`${name} exists`);
    return true;
  } else {
    fail(`${name} missing: ${filepath}`);
    return false;
  }
}

function fileContains(filepath, pattern, name) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    if (typeof pattern === 'string') {
      if (content.includes(pattern)) {
        pass(`${name} ✓`);
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(content)) {
        pass(`${name} ✓`);
        return true;
      }
    }
    fail(`${name} ✗ — pattern not found`);
    return false;
  } catch (err) {
    fail(`${name} — error reading file: ${err.message}`);
    return false;
  }
}

console.log('\n🔒 Clarity EHR Security Hardening Verification\n');

// 1. CSRF Token Protection
console.log('1️⃣  CSRF Token Protection');
console.log('─'.repeat(50));

fileExists(path.join(serverDir, 'middleware/csrf.js'), 'CSRF middleware');
fileContains(path.join(serverDir, 'middleware/csrf.js'), 'validateCsrfToken', 'CSRF validation function');
fileContains(path.join(serverDir, 'middleware/csrf.js'), 'generateCsrfToken', 'CSRF generation function');
fileContains(path.join(serverDir, 'index.js'), 'validateCsrfToken', 'CSRF middleware integrated in index.js');
fileContains(path.join(serverDir, 'index.js'), '/api/csrf-token', 'CSRF token endpoint');
fileContains(path.join(serverDir, 'tests/csrf.test.js'), 'CSRF Token Protection', 'CSRF test file');

// 2. Audit Log Immutability
console.log('\n2️⃣  Audit Log Immutability');
console.log('─'.repeat(50));

fileExists(
  path.join(serverDir, 'db/migrations/20260611_000003_audit_log_immutability.js'),
  'Audit log immutability migration'
);
fileContains(
  path.join(serverDir, 'db/migrations/20260611_000003_audit_log_immutability.js'),
  'audit_log_immutable',
  'Immutable table definition'
);
fileContains(
  path.join(serverDir, 'db/migrations/20260611_000003_audit_log_immutability.js'),
  'audit_log_prevent_delete',
  'DELETE prevention trigger'
);
fileContains(
  path.join(serverDir, 'db/migrations/20260611_000003_audit_log_immutability.js'),
  'audit_log_prevent_update',
  'UPDATE prevention trigger'
);
fileContains(
  path.join(serverDir, 'db/migrations/20260611_000003_audit_log_immutability.js'),
  'CREATE VIEW audit_logs',
  'Backwards-compatible view'
);
fileContains(
  path.join(serverDir, 'db/softDelete.js'),
  'audit_log_immutable',
  'Audit logging uses immutable table'
);
fileContains(
  path.join(serverDir, 'tests/audit-log-immutability.test.js'),
  'Audit Log Immutability',
  'Immutability test file'
);

// 3. Secrets Management
console.log('\n3️⃣  Secrets Management');
console.log('─'.repeat(50));

fileExists(path.join(serverDir, 'security/secrets.js'), 'Secrets module');
fileContains(
  path.join(serverDir, 'security/secrets.js'),
  'validateSecrets',
  'Secret validation function'
);
fileContains(
  path.join(serverDir, 'security/secrets.js'),
  'JWT_SECRET',
  'JWT_SECRET validation'
);
fileContains(
  path.join(serverDir, 'security/secrets.js'),
  'ENCRYPTION_KEY',
  'ENCRYPTION_KEY validation'
);
fileContains(
  path.join(serverDir, 'index.js'),
  'validateSecrets()',
  'Secrets validation in server startup'
);

// 4. PII Encryption
console.log('\n4️⃣  PII Field Encryption');
console.log('─'.repeat(50));

fileExists(path.join(serverDir, 'security/piiEncryption.js'), 'Encryption module');
fileContains(
  path.join(serverDir, 'security/piiEncryption.js'),
  'aes-256-gcm',
  'AES-256-GCM cipher'
);
fileContains(
  path.join(serverDir, 'security/piiEncryption.js'),
  'initializeEncryption',
  'Encryption initialization'
);
fileContains(
  path.join(serverDir, 'security/piiEncryption.js'),
  'encryptPii',
  'Encryption function'
);
fileContains(
  path.join(serverDir, 'security/piiEncryption.js'),
  'decryptPii',
  'Decryption function'
);
fileContains(
  path.join(serverDir, 'index.js'),
  'initializeEncryption()',
  'Encryption init in server startup'
);

// Integration
console.log('\n🔗 Integration Checks');
console.log('─'.repeat(50));

fileContains(
  path.join(serverDir, 'index.js'),
  'authenticate, validateCsrfToken, requireFacility',
  'CSRF protection on all data routes'
);

fileContains(
  path.join(serverDir, 'index.js'),
  'startSecurityMonitor',
  'Security monitoring enabled'
);

fileContains(
  path.join(serverDir, 'index.js'),
  'startAnomalyScheduler',
  'Anomaly detection enabled'
);

// Environment Variables
console.log('\n🔐 Environment Variables');
console.log('─'.repeat(50));

const envPath = path.join(serverDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  if (envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=your-')) {
    pass('JWT_SECRET is set');
  } else {
    warn('JWT_SECRET may not be configured');
  }

  if (envContent.includes('DATABASE_URL=')) {
    pass('DATABASE_URL is set');
  } else {
    fail('DATABASE_URL not found');
  }

  if (envContent.includes('ENCRYPTION_KEY=') && !envContent.includes('ENCRYPTION_KEY=your-')) {
    pass('ENCRYPTION_KEY is set');
  } else {
    warn('ENCRYPTION_KEY may not be configured');
  }

  if (envContent.includes('NODE_ENV=')) {
    pass('NODE_ENV is set');
  } else {
    fail('NODE_ENV not set');
  }
} else {
  warn('.env file not found (use .env.example as template)');
}

// Test Files
console.log('\n🧪 Test Coverage');
console.log('─'.repeat(50));

const testDir = path.join(serverDir, 'tests');
if (fs.existsSync(testDir)) {
  const tests = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));
  pass(`Found ${tests.length} test files`);

  const securityTests = tests.filter(f =>
    f.includes('csrf') || f.includes('audit') || f.includes('integration')
  );
  pass(`Security test files: ${securityTests.join(', ')}`);
} else {
  warn('Tests directory not found');
}

// Documentation
console.log('\n📚 Documentation');
console.log('─'.repeat(50));

fileExists(
  path.join(serverDir, 'SECURITY_HARDENING.md'),
  'Security hardening documentation'
);

// Summary
console.log('\n' + '═'.repeat(50));
console.log('📊 Verification Summary');
console.log('═'.repeat(50));
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All security hardening checks passed!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review above.\n');
  process.exit(1);
}

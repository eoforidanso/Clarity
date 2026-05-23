import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Convert SQLite-style SQL to PostgreSQL
function convertSql(sql) {
  let idx = 0;
  return sql
    .replace(/\?/g, () => `$${++idx}`)
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\("now"\)/gi, 'NOW()');
}

// Normalize args: support both .run(a, b, c) and .run([a, b, c])
function normalizeArgs(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

export const db = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      async run(...args) {
        const params = normalizeArgs(args);
        let finalSql = pgSql;
        // Auto-add RETURNING id for INSERT statements so lastInsertRowid works
        if (/^\s*INSERT/i.test(finalSql) && !/RETURNING/i.test(finalSql)) {
          finalSql += ' RETURNING id';
        }
        const result = await pool.query(finalSql, params);
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows?.[0]?.id ?? null,
        };
      },
      async get(...args) {
        const params = normalizeArgs(args);
        const result = await pool.query(pgSql, params);
        return result.rows[0] ?? null;
      },
      async all(...args) {
        const params = normalizeArgs(args);
        const result = await pool.query(pgSql, params);
        return result.rows;
      },
    };
  },

  async query(sql, params = []) {
    return pool.query(convertSql(sql), params);
  },

  async exec(sql) {
    await pool.query(sql);
  },

  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txDb = {
        prepare(sql) {
          const pgSql = convertSql(sql);
          return {
            async run(...args) {
              const params = normalizeArgs(args);
              let finalSql = pgSql;
              if (/^\s*INSERT/i.test(finalSql) && !/RETURNING/i.test(finalSql)) {
                finalSql += ' RETURNING id';
              }
              const r = await client.query(finalSql, params);
              return { changes: r.rowCount, lastInsertRowid: r.rows?.[0]?.id ?? null };
            },
            async get(...args) {
              const r = await client.query(pgSql, normalizeArgs(args));
              return r.rows[0] ?? null;
            },
            async all(...args) {
              const r = await client.query(pgSql, normalizeArgs(args));
              return r.rows;
            },
          };
        },
        async query(sql, params = []) {
          return client.query(convertSql(sql), params);
        },
      };
      const result = await fn(txDb);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  pool,
};

export async function initializeDatabase() {
  await pool.query(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('prescriber','nurse','front_desk','patient','therapist','admin')),
      credentials TEXT DEFAULT '',
      specialty TEXT DEFAULT '',
      npi TEXT DEFAULT '',
      dea_number TEXT DEFAULT '',
      email TEXT NOT NULL,
      epcs_pin_hash TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      must_change_password INTEGER DEFAULT 0,
      patient_id TEXT,
      location_id TEXT DEFAULT 'loc1',
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      mrn TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      dob TEXT NOT NULL,
      gender TEXT NOT NULL,
      pronouns TEXT DEFAULT '',
      ssn TEXT DEFAULT '',
      race TEXT DEFAULT '',
      ethnicity TEXT DEFAULT '',
      language TEXT DEFAULT 'English',
      marital_status TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      cell_phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address_street TEXT DEFAULT '',
      address_city TEXT DEFAULT '',
      address_state TEXT DEFAULT '',
      address_zip TEXT DEFAULT '',
      emergency_contact_name TEXT DEFAULT '',
      emergency_contact_relationship TEXT DEFAULT '',
      emergency_contact_phone TEXT DEFAULT '',
      insurance_primary_name TEXT DEFAULT '',
      insurance_primary_member_id TEXT DEFAULT '',
      insurance_primary_group_number TEXT DEFAULT '',
      insurance_primary_copay REAL DEFAULT 0,
      insurance_secondary_name TEXT,
      insurance_secondary_member_id TEXT,
      insurance_secondary_group_number TEXT,
      insurance_secondary_copay REAL,
      pcp TEXT DEFAULT '',
      assigned_provider TEXT,
      photo TEXT,
      is_btg INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_visit TEXT,
      next_appointment TEXT,
      flags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Allergies
    CREATE TABLE IF NOT EXISTS allergies (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      allergen TEXT NOT NULL,
      type TEXT NOT NULL,
      reaction TEXT DEFAULT '',
      severity TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      onset_date TEXT DEFAULT '',
      source TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Problem List
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      onset_date TEXT DEFAULT '',
      diagnosed_by TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Vital Signs
    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      bp TEXT DEFAULT '',
      hr INTEGER,
      rr INTEGER,
      temp REAL,
      spo2 REAL,
      weight REAL,
      height REAL,
      bmi REAL,
      pain INTEGER,
      taken_by TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Medications
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dose TEXT DEFAULT '',
      route TEXT DEFAULT 'Oral',
      frequency TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      prescriber TEXT DEFAULT '',
      status TEXT DEFAULT 'Active',
      refills_left INTEGER DEFAULT 0,
      is_controlled INTEGER DEFAULT 0,
      schedule TEXT,
      pharmacy TEXT DEFAULT '',
      last_filled TEXT DEFAULT '',
      sig TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Medication Rx History
    CREATE TABLE IF NOT EXISTS medication_rx_history (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      date TEXT NOT NULL,
      prescribed_by TEXT DEFAULT '',
      pharmacy TEXT DEFAULT '',
      qty INTEGER DEFAULT 0,
      refill_number INTEGER DEFAULT 0,
      type TEXT DEFAULT 'New Prescription',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'Pending',
      ordered_date TEXT DEFAULT '',
      ordered_by TEXT DEFAULT '',
      priority TEXT DEFAULT 'Routine',
      notes TEXT DEFAULT '',
      lab_facility TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Lab Results
    CREATE TABLE IF NOT EXISTS lab_results (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      order_date TEXT NOT NULL,
      result_date TEXT,
      ordered_by TEXT DEFAULT '',
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Lab Result Tests
    CREATE TABLE IF NOT EXISTS lab_result_tests (
      id TEXT PRIMARY KEY,
      lab_result_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE
    );

    -- Lab Result Components
    CREATE TABLE IF NOT EXISTS lab_result_components (
      id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      component TEXT NOT NULL,
      value TEXT DEFAULT '',
      unit TEXT DEFAULT '',
      range TEXT DEFAULT '',
      flag TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (test_id) REFERENCES lab_result_tests(id) ON DELETE CASCADE
    );

    -- Encounters
    CREATE TABLE IF NOT EXISTS encounters (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      provider TEXT DEFAULT '',
      provider_name TEXT DEFAULT '',
      credentials TEXT DEFAULT '',
      visit_type TEXT DEFAULT '',
      cpt_code TEXT DEFAULT '',
      icd_code TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      duration TEXT DEFAULT '',
      chief_complaint TEXT DEFAULT '',
      hpi TEXT DEFAULT '',
      interval_note TEXT DEFAULT '',
      mse TEXT DEFAULT '',
      assessment TEXT DEFAULT '',
      plan TEXT DEFAULT '',
      safety_si_level TEXT DEFAULT 'None',
      safety_hi_level TEXT DEFAULT 'None',
      safety_self_harm INTEGER DEFAULT 0,
      safety_substance_use INTEGER DEFAULT 0,
      safety_plan_updated INTEGER DEFAULT 0,
      safety_crisis_resources INTEGER DEFAULT 0,
      safety_notes TEXT DEFAULT '',
      follow_up TEXT DEFAULT '',
      disposition TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Assessment Scores
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      score INTEGER NOT NULL,
      interpretation TEXT DEFAULT '',
      date TEXT NOT NULL,
      administered_by TEXT DEFAULT '',
      answers TEXT DEFAULT '[]',
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Immunizations
    CREATE TABLE IF NOT EXISTS immunizations (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      vaccine TEXT NOT NULL,
      date TEXT NOT NULL,
      site TEXT DEFAULT '',
      route TEXT DEFAULT '',
      lot TEXT DEFAULT '',
      manufacturer TEXT DEFAULT '',
      administered_by TEXT DEFAULT '',
      next_due TEXT,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Appointments
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      patient_name TEXT DEFAULT '',
      provider TEXT DEFAULT '',
      provider_name TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      type TEXT DEFAULT 'Office Visit',
      status TEXT DEFAULT 'Scheduled',
      reason TEXT DEFAULT '',
      visit_type TEXT DEFAULT 'In-Person',
      room TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Blocked Days
    CREATE TABLE IF NOT EXISTS blocked_days (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      date TEXT NOT NULL,
      block_type TEXT DEFAULT 'full',
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW()
    );

    -- Inbox Messages
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      from_name TEXT NOT NULL,
      to_user TEXT NOT NULL,
      patient_id TEXT,
      patient_name TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      read INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'Normal',
      status TEXT DEFAULT 'Unread',
      urgent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Staff Messaging Channels
    CREATE TABLE IF NOT EXISTS staff_channels (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'channel',
      created_at TEXT DEFAULT NOW()
    );

    -- Staff Messages
    CREATE TABLE IF NOT EXISTS staff_messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT NOW(),
      reactions TEXT DEFAULT '{}',
      FOREIGN KEY (channel_id) REFERENCES staff_channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- BTG Audit Log
    CREATE TABLE IF NOT EXISTS btg_audit_log (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT DEFAULT '',
      accessed_by TEXT NOT NULL,
      accessed_by_name TEXT DEFAULT '',
      reason TEXT NOT NULL,
      timestamp TEXT DEFAULT NOW(),
      approved INTEGER DEFAULT 1,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- BTG Active Access
    CREATE TABLE IF NOT EXISTS btg_access (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      granted_at TEXT DEFAULT NOW(),
      expires_at TEXT
    );

    -- Smart Phrases
    CREATE TABLE IF NOT EXISTS smart_phrases (
      id TEXT PRIMARY KEY,
      trigger_text TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Clinical',
      content TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Medication Database (reference)
    CREATE TABLE IF NOT EXISTS medication_database (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      class TEXT DEFAULT '',
      doses TEXT DEFAULT '[]',
      routes TEXT DEFAULT '[]',
      is_controlled INTEGER DEFAULT 0,
      schedule TEXT DEFAULT ''
    );

    -- EPCS OTP tracking
    CREATE TABLE IF NOT EXISTS epcs_otps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Audit Log (HIPAA compliance)
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT NOW(),
      user_id TEXT,
      user_name TEXT DEFAULT '',
      user_role TEXT DEFAULT '',
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT DEFAULT '',
      patient_id TEXT DEFAULT '',
      patient_name TEXT DEFAULT '',
      details TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      session_id TEXT DEFAULT ''
    );

    -- Session Tracking
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT DEFAULT NOW(),
      expires_at TEXT NOT NULL,
      last_activity TEXT DEFAULT NOW(),
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- ========== REVENUE CYCLE MANAGEMENT TABLES ==========

    -- Insurance Verifications
    CREATE TABLE IF NOT EXISTS insurance_verifications (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      insurance_type TEXT NOT NULL CHECK(insurance_type IN ('primary', 'secondary')),
      verification_data TEXT NOT NULL, -- JSON with verification details
      verified_at TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );

    -- Claims Management
    CREATE TABLE IF NOT EXISTS claims (
      id SERIAL PRIMARY KEY,
      claim_number TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL,
      encounter_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_npi TEXT DEFAULT '',
      service_date TEXT NOT NULL,
      cpt_codes TEXT NOT NULL, -- JSON array of CPT codes with descriptions
      diagnoses TEXT NOT NULL, -- JSON array of ICD-10 codes
      total_charges REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Generated' CHECK(status IN ('Generated', 'Submitted', 'Processed', 'Paid', 'Denied', 'Appealed', 'Closed')),
      submission_date TEXT,
      submitted_by TEXT,
      paid_date TEXT,
      insurance_payment REAL DEFAULT 0,
      patient_payment REAL DEFAULT 0,
      adjustments REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      patient_responsibility REAL DEFAULT 0,
      denial_reason TEXT,
      denial_code TEXT,
      appeal_deadline TEXT,
      notes TEXT,
      created_at TEXT DEFAULT NOW(),
      created_by TEXT,
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (provider_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Payment Tracking
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      claim_id INTEGER NOT NULL,
      payment_type TEXT NOT NULL CHECK(payment_type IN ('insurance', 'patient', 'adjustment', 'refund')),
      payment_method TEXT DEFAULT '' CHECK(payment_method IN ('', 'check', 'eft', 'cash', 'card', 'wire', 'auto')),
      amount REAL NOT NULL,
      check_number TEXT,
      reference_number TEXT,
      adjustment_reason TEXT,
      adjustment_code TEXT,
      notes TEXT,
      payment_date TEXT NOT NULL,
      recorded_by TEXT NOT NULL,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );

    -- Practice Management Settings
    CREATE TABLE IF NOT EXISTS practice_settings (
      id SERIAL PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string' CHECK(setting_type IN ('string', 'number', 'boolean', 'json')),
      category TEXT DEFAULT 'general',
      description TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Fee Schedule Management
    CREATE TABLE IF NOT EXISTS fee_schedule (
      id SERIAL PRIMARY KEY,
      cpt_code TEXT NOT NULL,
      description TEXT NOT NULL,
      fee REAL NOT NULL,
      effective_date TEXT NOT NULL,
      end_date TEXT,
      insurance_type TEXT DEFAULT 'default',
      modifier TEXT DEFAULT '',
      units INTEGER DEFAULT 1,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      UNIQUE(cpt_code, insurance_type, modifier, effective_date)
    );

    -- Accounts Receivable Aging
    CREATE TABLE IF NOT EXISTS ar_aging (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      claim_id INTEGER NOT NULL,
      balance REAL NOT NULL,
      days_outstanding INTEGER NOT NULL,
      aging_bucket TEXT NOT NULL CHECK(aging_bucket IN ('0-30', '31-60', '61-90', '91-120', '120+')),
      last_payment_date TEXT,
      last_statement_date TEXT,
      follow_up_needed INTEGER DEFAULT 0,
      follow_up_date TEXT,
      assigned_to TEXT,
      notes TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Patient Statements
    CREATE TABLE IF NOT EXISTS patient_statements (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      statement_date TEXT NOT NULL,
      statement_number TEXT UNIQUE NOT NULL,
      balance_forward REAL DEFAULT 0,
      new_charges REAL DEFAULT 0,
      payments_credits REAL DEFAULT 0,
      current_balance REAL NOT NULL,
      aging_summary TEXT, -- JSON with aging bucket amounts
      claim_ids TEXT, -- JSON array of claim IDs included
      sent_method TEXT CHECK(sent_method IN ('mail', 'email', 'portal', 'print')),
      sent_date TEXT,
      delivered INTEGER DEFAULT 0,
      payment_due_date TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Denial Management
    CREATE TABLE IF NOT EXISTS denial_management (
      id SERIAL PRIMARY KEY,
      claim_id INTEGER NOT NULL,
      denial_code TEXT NOT NULL,
      denial_reason TEXT NOT NULL,
      denial_date TEXT NOT NULL,
      appeal_deadline TEXT,
      appeal_submitted INTEGER DEFAULT 0,
      appeal_date TEXT,
      appeal_outcome TEXT,
      corrective_action TEXT,
      status TEXT DEFAULT 'Open' CHECK(status IN ('Open', 'Working', 'Appealing', 'Resolved', 'Write-off')),
      assigned_to TEXT,
      priority TEXT DEFAULT 'Normal' CHECK(priority IN ('Low', 'Normal', 'High', 'Critical')),
      follow_up_date TEXT,
      resolution_notes TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Quality Measures Tracking
    CREATE TABLE IF NOT EXISTS quality_measures (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      measure_id TEXT NOT NULL, -- HEDIS, MIPS, etc.
      measure_name TEXT NOT NULL,
      measurement_period TEXT NOT NULL, -- '2026' for yearly measures
      numerator INTEGER DEFAULT 0, -- 1 if patient meets criteria
      denominator INTEGER DEFAULT 1, -- 1 if patient in eligible population  
      exclusion INTEGER DEFAULT 0, -- 1 if patient excluded
      exception INTEGER DEFAULT 0, -- 1 if patient has valid exception
      value_set_version TEXT,
      calculated_date TEXT NOT NULL,
      calculated_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (calculated_by) REFERENCES users(id),
      UNIQUE(patient_id, measure_id, measurement_period)
    );

    -- Payer Contracts
    CREATE TABLE IF NOT EXISTS payer_contracts (
      id SERIAL PRIMARY KEY,
      payer_name TEXT NOT NULL,
      contract_name TEXT NOT NULL,
      contract_type TEXT DEFAULT 'Fee Schedule' CHECK(contract_type IN ('Fee Schedule', 'Capitation', 'Bundled Payment', 'Value-Based')),
      effective_date TEXT NOT NULL,
      termination_date TEXT,
      fee_schedule_id INTEGER,
      capitation_rate REAL DEFAULT 0,
      risk_adjustment INTEGER DEFAULT 0,
      quality_bonuses TEXT, -- JSON array of quality bonus structures
      contract_terms TEXT, -- Full contract details in JSON
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Pending', 'Terminated', 'Suspended')),
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Revenue Analytics Cache
    CREATE TABLE IF NOT EXISTS revenue_analytics (
      id SERIAL PRIMARY KEY,
      period_type TEXT NOT NULL CHECK(period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      provider_id TEXT,
      metrics TEXT NOT NULL, -- JSON with calculated metrics
      calculated_at TEXT DEFAULT NOW(),
      UNIQUE(period_type, period_start, period_end, provider_id)
    );

    -- ========== ENHANCED BILLING FEATURES ==========
    
    -- Telehealth Billing
    CREATE TABLE IF NOT EXISTS telehealth_billing (
      id SERIAL PRIMARY KEY,
      session_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      session_duration INTEGER NOT NULL, -- in minutes
      session_type TEXT NOT NULL CHECK(session_type IN ('therapy', 'consultation', 'follow-up', 'psychiatric-eval')),
      platform_used TEXT, -- 'zoom', 'teams', 'doxy.me', 'simple-practice'
      base_amount REAL NOT NULL,
      technology_fee REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      billing_status TEXT DEFAULT 'pending' CHECK(billing_status IN ('pending', 'billed', 'paid', 'cancelled')),
      documentation_notes TEXT,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    -- Patient Statement Items (details for each statement)
    CREATE TABLE IF NOT EXISTS patient_statement_items (
      id SERIAL PRIMARY KEY,
      statement_id INTEGER NOT NULL,
      claim_id INTEGER,
      service_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (statement_id) REFERENCES patient_statements(id),
      FOREIGN KEY (claim_id) REFERENCES claims(id)
    );

    -- Appeal Tasks (workflow management for denied claims)
    CREATE TABLE IF NOT EXISTS appeal_tasks (
      id SERIAL PRIMARY KEY,
      denial_id INTEGER NOT NULL,
      task_type TEXT NOT NULL CHECK(task_type IN ('appeal_submission', 'peer_review', 'clinical_documentation', 'prior_auth')),
      assigned_to TEXT, -- user_id
      due_date TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      created_at TEXT DEFAULT NOW(),
      completed_at TEXT,
      FOREIGN KEY (denial_id) REFERENCES denial_management(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Patient Portal Access Log (security and audit trail)
    CREATE TABLE IF NOT EXISTS patient_portal_access_log (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      access_type TEXT NOT NULL CHECK(access_type IN ('login', 'view_statement', 'make_payment', 'view_billing_history', 'download_statement')),
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      success BOOLEAN DEFAULT TRUE,
      failure_reason TEXT,
      timestamp TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Payment Plans (for patients with high balances)
    CREATE TABLE IF NOT EXISTS payment_plans (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      monthly_payment REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'defaulted', 'cancelled')),
      setup_fee REAL DEFAULT 0,
      late_fee REAL DEFAULT 0,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Payment Plan Payments (scheduled installments)
    CREATE TABLE IF NOT EXISTS payment_plan_payments (
      id SERIAL PRIMARY KEY,
      payment_plan_id INTEGER NOT NULL,
      payment_id INTEGER,
      scheduled_date TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'paid', 'failed', 'skipped')),
      paid_date TEXT,
      attempt_count INTEGER DEFAULT 0,
      last_attempt_date TEXT,
      failure_reason TEXT,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );

    -- Billing Notifications (automated communications)
    CREATE TABLE IF NOT EXISTS billing_notifications (
      id SERIAL PRIMARY KEY,
      patient_id TEXT,
      provider_id TEXT,
      notification_type TEXT NOT NULL CHECK(notification_type IN ('payment_due', 'payment_received', 'claim_denied', 'statement_generated', 'payment_plan_setup', 'payment_failed')),
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'cancelled')),
      sent_at TEXT,
      delivery_method TEXT CHECK(delivery_method IN ('email', 'sms', 'portal', 'mail')),
      recipient_address TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    -- Billing Rules Engine (automated business rules)
    CREATE TABLE IF NOT EXISTS billing_rules (
      id SERIAL PRIMARY KEY,
      rule_name TEXT NOT NULL,
      rule_type TEXT NOT NULL CHECK(rule_type IN ('auto_billing', 'denial_prevention', 'payment_posting', 'statement_generation')),
      conditions TEXT NOT NULL, -- JSON with rule conditions
      actions TEXT NOT NULL, -- JSON with actions to take
      priority INTEGER DEFAULT 1,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_allergies_patient ON allergies(patient_id);
    CREATE INDEX IF NOT EXISTS idx_problems_patient ON problems(patient_id);
    CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vitals(patient_id);
    CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
    CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id);
    CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
    CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_immunizations_patient ON immunizations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider);
    CREATE INDEX IF NOT EXISTS idx_inbox_to_user ON inbox_messages(to_user);
    CREATE INDEX IF NOT EXISTS idx_staff_messages_channel ON staff_messages(channel_id);

    -- Direct Messages
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      sender_name TEXT DEFAULT '',
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT NOW(),
      reactions TEXT DEFAULT '{}',
      read INTEGER DEFAULT 0,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_dm_participants ON direct_messages(sender_id, recipient_id);
    CREATE INDEX IF NOT EXISTS idx_dm_timestamp ON direct_messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_btg_audit_patient ON btg_audit_log(patient_id);
    CREATE INDEX IF NOT EXISTS idx_rx_history_med ON medication_rx_history(medication_id);
    CREATE INDEX IF NOT EXISTS idx_lab_tests_result ON lab_result_tests(lab_result_id);
    CREATE INDEX IF NOT EXISTS idx_lab_components_test ON lab_result_components(test_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_log(patient_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

    -- Billing & Revenue Cycle Indexes
    CREATE INDEX IF NOT EXISTS idx_insurance_verif_patient ON insurance_verifications(patient_id);
    CREATE INDEX IF NOT EXISTS idx_claims_patient ON claims(patient_id);
    CREATE INDEX IF NOT EXISTS idx_claims_provider ON claims(provider_id);
    CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
    CREATE INDEX IF NOT EXISTS idx_claims_service_date ON claims(service_date);
    CREATE INDEX IF NOT EXISTS idx_claims_number ON claims(claim_number);
    CREATE INDEX IF NOT EXISTS idx_payments_claim ON payments(claim_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_ar_aging_patient ON ar_aging(patient_id);
    CREATE INDEX IF NOT EXISTS idx_ar_aging_bucket ON ar_aging(aging_bucket);
    CREATE INDEX IF NOT EXISTS idx_ar_aging_followup ON ar_aging(follow_up_needed);
    CREATE INDEX IF NOT EXISTS idx_statements_patient ON patient_statements(patient_id);
    CREATE INDEX IF NOT EXISTS idx_statements_date ON patient_statements(statement_date);
    CREATE INDEX IF NOT EXISTS idx_denials_claim ON denial_management(claim_id);
    CREATE INDEX IF NOT EXISTS idx_denials_status ON denial_management(status);
    CREATE INDEX IF NOT EXISTS idx_denials_assigned ON denial_management(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_quality_measures_patient ON quality_measures(patient_id);
    CREATE INDEX IF NOT EXISTS idx_quality_measures_period ON quality_measures(measurement_period);
    CREATE INDEX IF NOT EXISTS idx_payer_contracts_name ON payer_contracts(payer_name);
    CREATE INDEX IF NOT EXISTS idx_payer_contracts_status ON payer_contracts(status);
    CREATE INDEX IF NOT EXISTS idx_revenue_analytics_period ON revenue_analytics(period_type, period_start, period_end);
    
    -- Enhanced Billing Feature Indexes
    CREATE INDEX IF NOT EXISTS idx_telehealth_billing_patient ON telehealth_billing(patient_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_billing_provider ON telehealth_billing(provider_id);
    CREATE INDEX IF NOT EXISTS idx_telehealth_billing_status ON telehealth_billing(billing_status);
    CREATE INDEX IF NOT EXISTS idx_telehealth_billing_date ON telehealth_billing(created_at);
    CREATE INDEX IF NOT EXISTS idx_telehealth_billing_session ON telehealth_billing(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_patient_statement_items_statement ON patient_statement_items(statement_id);
    CREATE INDEX IF NOT EXISTS idx_patient_statement_items_claim ON patient_statement_items(claim_id);
    CREATE INDEX IF NOT EXISTS idx_patient_statement_items_service_date ON patient_statement_items(service_date);
    
    CREATE INDEX IF NOT EXISTS idx_appeal_tasks_denial ON appeal_tasks(denial_id);
    CREATE INDEX IF NOT EXISTS idx_appeal_tasks_status ON appeal_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_appeal_tasks_assigned ON appeal_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_appeal_tasks_due_date ON appeal_tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_appeal_tasks_priority ON appeal_tasks(priority);
    
    CREATE INDEX IF NOT EXISTS idx_portal_access_patient ON patient_portal_access_log(patient_id);
    CREATE INDEX IF NOT EXISTS idx_portal_access_type ON patient_portal_access_log(access_type);
    CREATE INDEX IF NOT EXISTS idx_portal_access_timestamp ON patient_portal_access_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_portal_access_session ON patient_portal_access_log(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_payment_plans_patient ON payment_plans(patient_id);
    CREATE INDEX IF NOT EXISTS idx_payment_plans_status ON payment_plans(status);
    CREATE INDEX IF NOT EXISTS idx_payment_plans_dates ON payment_plans(start_date, end_date);
    
    CREATE INDEX IF NOT EXISTS idx_payment_plan_payments_plan ON payment_plan_payments(payment_plan_id);
    CREATE INDEX IF NOT EXISTS idx_payment_plan_payments_status ON payment_plan_payments(status);
    CREATE INDEX IF NOT EXISTS idx_payment_plan_payments_scheduled_date ON payment_plan_payments(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_payment_plan_payments_payment ON payment_plan_payments(payment_id);
    
    CREATE INDEX IF NOT EXISTS idx_billing_notifications_patient ON billing_notifications(patient_id);
    CREATE INDEX IF NOT EXISTS idx_billing_notifications_provider ON billing_notifications(provider_id);
    CREATE INDEX IF NOT EXISTS idx_billing_notifications_status ON billing_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_billing_notifications_type ON billing_notifications(notification_type);
    CREATE INDEX IF NOT EXISTS idx_billing_notifications_created ON billing_notifications(created_at);
    
    CREATE INDEX IF NOT EXISTS idx_billing_rules_type ON billing_rules(rule_type);
    CREATE INDEX IF NOT EXISTS idx_billing_rules_enabled ON billing_rules(enabled);
    CREATE INDEX IF NOT EXISTS idx_billing_rules_priority ON billing_rules(priority);

    -- ========== CLINIC LOCATIONS ==========
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      fax TEXT NOT NULL DEFAULT '',
      hours TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'Satellite' CHECK(type IN ('Primary','Satellite','Virtual')),
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive')),
      npi TEXT NOT NULL DEFAULT '',
      tax_id TEXT NOT NULL DEFAULT '',
      place_of_service TEXT NOT NULL DEFAULT '11 — Office',
      rooms INTEGER NOT NULL DEFAULT 0,
      telehealth INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT NOW(),
      updated_at TEXT DEFAULT NOW()
    );

    -- Seed default locations if none exist
    INSERT INTO locations (id, name, short_name, address, phone, fax, hours, type, status, npi, tax_id, place_of_service, rooms, telehealth, sort_order) VALUES
      ('loc-apmg', 'Advanced Practice Medical Group', 'Rolling Meadows', '2280 Hicks Rd Suite 508, Rolling Meadows, IL 60008', '(847) 371-5200', '', '', 'Primary',   'Active', '', '', '11 — Office', 0, 1, 0),
      ('loc1', 'Clarity — Main Office',      'Main Office',   '200 N Michigan Ave, Suite 1500, Chicago, IL 60601', '(312) 555-0199', '(312) 555-0200', 'Mon–Fri 8:00 AM – 6:00 PM',          'Primary',  'Active', '1234567890', '12-3456789', '11 — Office',       8, 1, 1),
      ('loc2', 'Clarity — West Loop',         'West Loop',     '311 W Randolph St, Suite 800, Chicago, IL 60606',   '(312) 555-0210', '(312) 555-0211', 'Mon, Wed, Fri 9:00 AM – 5:00 PM',    'Satellite', 'Active', '1234567891', '12-3456789', '11 — Office',       5, 1, 2),
      ('loc3', 'Clarity — Evanston',          'Evanston',      '1603 Orrington Ave, Suite 300, Evanston, IL 60201', '(847) 555-0130', '(847) 555-0131', 'Tue, Thu 9:00 AM – 5:00 PM',         'Satellite', 'Active', '1234567892', '12-3456790', '11 — Office',       3, 1, 3),
      ('loc4', 'Clarity — Telehealth Only',   'Telehealth',    'Virtual — No Physical Location',                    '(312) 555-0250', '—',              'Mon–Sat 7:00 AM – 9:00 PM',          'Virtual',  'Active', '',           '12-3456789', '02 — Telehealth',   0, 1, 4)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Safe column additions (idempotent — ignored if column already exists)
  const columnMigrations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires TEXT DEFAULT NULL`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_attempts INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'loc1'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS dosespot_user_id TEXT DEFAULT NULL`,
    `ALTER TABLE patients ADD COLUMN IF NOT EXISTS dosespot_patient_id TEXT DEFAULT NULL`,
    // Encounter signing — prevents edits after a note is signed/locked
    `ALTER TABLE encounters ADD COLUMN IF NOT EXISTS is_signed INTEGER DEFAULT 0`,
    `ALTER TABLE encounters ADD COLUMN IF NOT EXISTS signed_by TEXT DEFAULT ''`,
    `ALTER TABLE encounters ADD COLUMN IF NOT EXISTS signed_at TEXT DEFAULT NULL`,
    // Appointment location tracking for multi-site scheduling
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'loc1'`,
  ];
  for (const m of columnMigrations) {
    await pool.query(m);
  }

  // Expand role CHECK constraint to include 'admin' (idempotent)
  await pool.query(`
    DO $$ BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK(role IN ('prescriber','nurse','front_desk','patient','therapist','admin'));
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  // Ensure Harriet (system admin) exists with the correct role
  await pool.query(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, epcs_pin_hash, two_factor_enabled, must_change_password, location_id)
    VALUES ('u5', 'harriet', '$2a$10$Qq3HXdNpQ2.V5P.IqR8adesFPK9JYYkTBUHCu2gIsMVV6vHJ8Xy8i', 'Harriet', 'Appiah', 'admin', '', '', '', '', 'harriet@clarity.health', NULL, TRUE, 0, 'loc1')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', username = EXCLUDED.username, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, must_change_password = 0;
  `);

  // Ensure Emmanuel (APMG prescriber) exists
  await pool.query(`
    INSERT INTO users (id, username, password_hash, first_name, last_name, role, credentials, specialty, npi, dea_number, email, epcs_pin_hash, two_factor_enabled, must_change_password, location_id)
    VALUES ('u9', 'dr.emmanuel', '$2a$10$Qq3HXdNpQ2.V5P.IqR8adesFPK9JYYkTBUHCu2gIsMVV6vHJ8Xy8i', 'Emmanuel', 'Oforidanso', 'prescriber', 'NP', 'Psychiatric Mental Health', '1376299933', 'MO7223857', 'emmanuel@clarity.health', NULL, TRUE, 1, 'loc-apmg')
    ON CONFLICT (id) DO UPDATE SET location_id = 'loc-apmg';
  `);

  console.log('PostgreSQL schema initialized');
}

export default db;

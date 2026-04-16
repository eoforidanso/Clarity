import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', config.dbPath);

// Ensure the db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let SQL;
let rawDb;
let inTransaction = false;

// Save database to disk
function save() {
  const data = rawDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Auto-save on process exit
process.on('exit', () => { if (rawDb) save(); });
process.on('SIGINT', () => { if (rawDb) save(); process.exit(); });
process.on('SIGTERM', () => { if (rawDb) save(); process.exit(); });

// ─── better-sqlite3 compatible wrapper ───────────────
class PreparedStatement {
  constructor(database, sql) {
    this._db = database;
    this._sql = sql;
  }

  _bindParams(params) {
    // better-sqlite3 passes params as spread args: .get(a, b, c)
    // sql.js expects an array: stmt.bind([a, b, c])
    return params;
  }

  all(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(this._bindParams(params));
    const results = [];
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
      results.push(row);
    }
    stmt.free();
    return results;
  }

  get(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length > 0) stmt.bind(this._bindParams(params));
    let row = undefined;
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      row = {};
      for (let i = 0; i < cols.length; i++) row[cols[i]] = vals[i];
    }
    stmt.free();
    return row;
  }

  run(...params) {
    this._db.run(this._sql, this._bindParams(params));
    if (!inTransaction) save();
    return {
      changes: this._db.getRowsModified(),
      lastInsertRowid: 0,
    };
  }
}

// Wrapper object that mimics better-sqlite3 database
const db = {
  prepare(sql) {
    return new PreparedStatement(rawDb, sql);
  },

  exec(sql) {
    rawDb.run(sql);
    save();
  },

  pragma(expr) {
    rawDb.run(`PRAGMA ${expr}`);
  },

  transaction(fn) {
    return (...args) => {
      inTransaction = true;
      rawDb.run('BEGIN');
      try {
        const result = fn(...args);
        rawDb.run('COMMIT');
        inTransaction = false;
        save();
        return result;
      } catch (e) {
        try { rawDb.run('ROLLBACK'); } catch (_) { /* no active txn */ }
        inTransaction = false;
        throw e;
      }
    };
  },
};

export async function initializeDatabase() {
  SQL = await initSqlJs();

  // Load existing DB from disk, or create fresh
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(buffer);
  } else {
    rawDb = new SQL.Database();
  }

  rawDb.run('PRAGMA foreign_keys = ON');

  rawDb.run(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT DEFAULT '',
      role TEXT NOT NULL CHECK(role IN ('prescriber','nurse','front_desk','patient','therapist')),
      credentials TEXT DEFAULT '',
      specialty TEXT DEFAULT '',
      npi TEXT DEFAULT '',
      dea_number TEXT DEFAULT '',
      email TEXT NOT NULL,
      epcs_pin_hash TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      patient_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Lab Result Tests
    CREATE TABLE IF NOT EXISTS lab_result_tests (
      id TEXT PRIMARY KEY,
      lab_result_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Blocked Days
    CREATE TABLE IF NOT EXISTS blocked_days (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      date TEXT NOT NULL,
      block_type TEXT DEFAULT 'full',
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Staff Messaging Channels
    CREATE TABLE IF NOT EXISTS staff_channels (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'channel',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Staff Messages
    CREATE TABLE IF NOT EXISTS staff_messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now')),
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
      timestamp TEXT DEFAULT (datetime('now')),
      approved INTEGER DEFAULT 1,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- BTG Active Access
    CREATE TABLE IF NOT EXISTS btg_access (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      granted_at TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Audit Log (HIPAA compliance)
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT (datetime('now')),
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
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      last_activity TEXT DEFAULT (datetime('now')),
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- ========== REVENUE CYCLE MANAGEMENT TABLES ==========

    -- Insurance Verifications
    CREATE TABLE IF NOT EXISTS insurance_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      insurance_type TEXT NOT NULL CHECK(insurance_type IN ('primary', 'secondary')),
      verification_data TEXT NOT NULL, -- JSON with verification details
      verified_at TEXT NOT NULL,
      verified_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );

    -- Claims Management
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (encounter_id) REFERENCES encounters(id),
      FOREIGN KEY (provider_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Payment Tracking
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );

    -- Practice Management Settings
    CREATE TABLE IF NOT EXISTS practice_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string' CHECK(setting_type IN ('string', 'number', 'boolean', 'json')),
      category TEXT DEFAULT 'general',
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Fee Schedule Management
    CREATE TABLE IF NOT EXISTS fee_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpt_code TEXT NOT NULL,
      description TEXT NOT NULL,
      fee REAL NOT NULL,
      effective_date TEXT NOT NULL,
      end_date TEXT,
      insurance_type TEXT DEFAULT 'default',
      modifier TEXT DEFAULT '',
      units INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(cpt_code, insurance_type, modifier, effective_date)
    );

    -- Accounts Receivable Aging
    CREATE TABLE IF NOT EXISTS ar_aging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Patient Statements
    CREATE TABLE IF NOT EXISTS patient_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- Denial Management
    CREATE TABLE IF NOT EXISTS denial_management (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (claim_id) REFERENCES claims(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Quality Measures Tracking
    CREATE TABLE IF NOT EXISTS quality_measures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (calculated_by) REFERENCES users(id),
      UNIQUE(patient_id, measure_id, measurement_period)
    );

    -- Payer Contracts
    CREATE TABLE IF NOT EXISTS payer_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Revenue Analytics Cache
    CREATE TABLE IF NOT EXISTS revenue_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_type TEXT NOT NULL CHECK(period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      provider_id TEXT,
      metrics TEXT NOT NULL, -- JSON with calculated metrics
      calculated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(period_type, period_start, period_end, provider_id)
    );

    -- ========== ENHANCED BILLING FEATURES ==========
    
    -- Telehealth Billing
    CREATE TABLE IF NOT EXISTS telehealth_billing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    -- Patient Statement Items (details for each statement)
    CREATE TABLE IF NOT EXISTS patient_statement_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_id INTEGER NOT NULL,
      claim_id INTEGER,
      service_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (statement_id) REFERENCES patient_statements(id),
      FOREIGN KEY (claim_id) REFERENCES claims(id)
    );

    -- Appeal Tasks (workflow management for denied claims)
    CREATE TABLE IF NOT EXISTS appeal_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      denial_id INTEGER NOT NULL,
      task_type TEXT NOT NULL CHECK(task_type IN ('appeal_submission', 'peer_review', 'clinical_documentation', 'prior_auth')),
      assigned_to TEXT, -- user_id
      due_date TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
      notes TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (denial_id) REFERENCES denial_management(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    );

    -- Patient Portal Access Log (security and audit trail)
    CREATE TABLE IF NOT EXISTS patient_portal_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      access_type TEXT NOT NULL CHECK(access_type IN ('login', 'view_statement', 'make_payment', 'view_billing_history', 'download_statement')),
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      success BOOLEAN DEFAULT 1,
      failure_reason TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Payment Plans (for patients with high balances)
    CREATE TABLE IF NOT EXISTS payment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      monthly_payment REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'defaulted', 'cancelled')),
      setup_fee REAL DEFAULT 0,
      late_fee REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    -- Payment Plan Payments (scheduled installments)
    CREATE TABLE IF NOT EXISTS payment_plan_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_plan_id INTEGER NOT NULL,
      payment_id INTEGER,
      scheduled_date TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'paid', 'failed', 'skipped')),
      paid_date TEXT,
      attempt_count INTEGER DEFAULT 0,
      last_attempt_date TEXT,
      failure_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id),
      FOREIGN KEY (payment_id) REFERENCES payments(id)
    );

    -- Billing Notifications (automated communications)
    CREATE TABLE IF NOT EXISTS billing_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT,
      provider_id TEXT,
      notification_type TEXT NOT NULL CHECK(notification_type IN ('payment_due', 'payment_received', 'claim_denied', 'statement_generated', 'payment_plan_setup', 'payment_failed')),
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'cancelled')),
      sent_at TEXT,
      delivery_method TEXT CHECK(delivery_method IN ('email', 'sms', 'portal', 'mail')),
      recipient_address TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    -- Billing Rules Engine (automated business rules)
    CREATE TABLE IF NOT EXISTS billing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name TEXT NOT NULL,
      rule_type TEXT NOT NULL CHECK(rule_type IN ('auto_billing', 'denial_prevention', 'payment_posting', 'statement_generation')),
      conditions TEXT NOT NULL, -- JSON with rule conditions
      actions TEXT NOT NULL, -- JSON with actions to take
      priority INTEGER DEFAULT 1,
      enabled BOOLEAN DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
  `);

  save();
  console.log('Database schema initialized');
}

export default db;

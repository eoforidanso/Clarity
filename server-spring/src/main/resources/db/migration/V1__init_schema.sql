-- =====================================================
-- Clarity EHR — PostgreSQL Schema (V1)
-- Migrated from SQLite / sql.js
-- =====================================================

-- ─── USERS ───────────────────────────────────────────
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) DEFAULT '',
    role VARCHAR(20) NOT NULL CHECK (role IN ('prescriber','nurse','front_desk','patient','therapist')),
    credentials VARCHAR(100) DEFAULT '',
    specialty VARCHAR(100) DEFAULT '',
    npi VARCHAR(20) DEFAULT '',
    dea_number VARCHAR(20) DEFAULT '',
    email VARCHAR(255) NOT NULL,
    epcs_pin_hash VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    patient_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── PATIENTS ────────────────────────────────────────
CREATE TABLE patients (
    id VARCHAR(36) PRIMARY KEY,
    mrn VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    pronouns VARCHAR(30) DEFAULT '',
    ssn VARCHAR(11) DEFAULT '',
    race VARCHAR(50) DEFAULT '',
    ethnicity VARCHAR(50) DEFAULT '',
    language VARCHAR(30) DEFAULT 'English',
    marital_status VARCHAR(20) DEFAULT '',
    phone VARCHAR(20) DEFAULT '',
    cell_phone VARCHAR(20) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    address_street VARCHAR(255) DEFAULT '',
    address_city VARCHAR(100) DEFAULT '',
    address_state VARCHAR(2) DEFAULT '',
    address_zip VARCHAR(10) DEFAULT '',
    emergency_contact_name VARCHAR(100) DEFAULT '',
    emergency_contact_relationship VARCHAR(50) DEFAULT '',
    emergency_contact_phone VARCHAR(20) DEFAULT '',
    insurance_primary_name VARCHAR(100) DEFAULT '',
    insurance_primary_member_id VARCHAR(50) DEFAULT '',
    insurance_primary_group_number VARCHAR(50) DEFAULT '',
    insurance_primary_copay NUMERIC(10,2) DEFAULT 0,
    insurance_secondary_name VARCHAR(100),
    insurance_secondary_member_id VARCHAR(50),
    insurance_secondary_group_number VARCHAR(50),
    insurance_secondary_copay NUMERIC(10,2),
    pcp VARCHAR(100) DEFAULT '',
    assigned_provider VARCHAR(36),
    photo TEXT,
    is_btg BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_visit DATE,
    next_appointment DATE,
    flags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ALLERGIES ───────────────────────────────────────
CREATE TABLE allergies (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    allergen VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    reaction VARCHAR(255) DEFAULT '',
    severity VARCHAR(20) DEFAULT '',
    status VARCHAR(20) DEFAULT 'Active',
    onset_date VARCHAR(20) DEFAULT '',
    source VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── PROBLEM LIST ────────────────────────────────────
CREATE TABLE problems (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    code VARCHAR(20) NOT NULL,
    description VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    onset_date VARCHAR(20) DEFAULT '',
    diagnosed_by VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── VITAL SIGNS ─────────────────────────────────────
CREATE TABLE vitals (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL,
    bp VARCHAR(10) DEFAULT '',
    hr INTEGER,
    rr INTEGER,
    temp NUMERIC(5,2),
    spo2 NUMERIC(5,2),
    weight NUMERIC(6,2),
    height NUMERIC(6,2),
    bmi NUMERIC(5,2),
    pain INTEGER,
    taken_by VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── MEDICATIONS ─────────────────────────────────────
CREATE TABLE medications (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    name VARCHAR(255) NOT NULL,
    dose VARCHAR(100) DEFAULT '',
    route VARCHAR(50) DEFAULT 'Oral',
    frequency VARCHAR(100) DEFAULT '',
    start_date VARCHAR(20) DEFAULT '',
    prescriber VARCHAR(100) DEFAULT '',
    status VARCHAR(20) DEFAULT 'Active',
    refills_left INTEGER DEFAULT 0,
    is_controlled BOOLEAN DEFAULT FALSE,
    schedule VARCHAR(10),
    pharmacy VARCHAR(255) DEFAULT '',
    last_filled VARCHAR(20) DEFAULT '',
    sig VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── MEDICATION RX HISTORY ───────────────────────────
CREATE TABLE medication_rx_history (
    id VARCHAR(36) PRIMARY KEY,
    medication_id VARCHAR(36) NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    prescribed_by VARCHAR(100) DEFAULT '',
    pharmacy VARCHAR(255) DEFAULT '',
    qty INTEGER DEFAULT 0,
    refill_number INTEGER DEFAULT 0,
    type VARCHAR(50) DEFAULT 'New Prescription',
    note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── ORDERS ──────────────────────────────────────────
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    type VARCHAR(50) NOT NULL,
    description VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    ordered_date VARCHAR(20) DEFAULT '',
    ordered_by VARCHAR(100) DEFAULT '',
    priority VARCHAR(20) DEFAULT 'Routine',
    notes TEXT DEFAULT '',
    lab_facility VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── LAB RESULTS ─────────────────────────────────────
CREATE TABLE lab_results (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    order_date DATE NOT NULL,
    result_date DATE,
    ordered_by VARCHAR(100) DEFAULT '',
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lab_result_tests (
    id VARCHAR(36) PRIMARY KEY,
    lab_result_id VARCHAR(36) NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lab_result_components (
    id VARCHAR(36) PRIMARY KEY,
    test_id VARCHAR(36) NOT NULL REFERENCES lab_result_tests(id) ON DELETE CASCADE,
    component VARCHAR(255) NOT NULL,
    value VARCHAR(50) DEFAULT '',
    unit VARCHAR(30) DEFAULT '',
    range VARCHAR(50) DEFAULT '',
    flag VARCHAR(10) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── ENCOUNTERS ──────────────────────────────────────
CREATE TABLE encounters (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    date DATE NOT NULL,
    time VARCHAR(10) DEFAULT '',
    provider VARCHAR(36) DEFAULT '',
    provider_name VARCHAR(100) DEFAULT '',
    credentials VARCHAR(50) DEFAULT '',
    visit_type VARCHAR(50) DEFAULT '',
    cpt_code VARCHAR(10) DEFAULT '',
    icd_code VARCHAR(10) DEFAULT '',
    reason VARCHAR(500) DEFAULT '',
    duration VARCHAR(20) DEFAULT '',
    chief_complaint TEXT DEFAULT '',
    hpi TEXT DEFAULT '',
    interval_note TEXT DEFAULT '',
    mse TEXT DEFAULT '',
    assessment TEXT DEFAULT '',
    plan TEXT DEFAULT '',
    safety_si_level VARCHAR(20) DEFAULT 'None',
    safety_hi_level VARCHAR(20) DEFAULT 'None',
    safety_self_harm BOOLEAN DEFAULT FALSE,
    safety_substance_use BOOLEAN DEFAULT FALSE,
    safety_plan_updated BOOLEAN DEFAULT FALSE,
    safety_crisis_resources BOOLEAN DEFAULT FALSE,
    safety_notes TEXT DEFAULT '',
    follow_up VARCHAR(255) DEFAULT '',
    disposition VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ASSESSMENTS ─────────────────────────────────────
CREATE TABLE assessments (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    tool VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    interpretation VARCHAR(100) DEFAULT '',
    date DATE NOT NULL,
    administered_by VARCHAR(100) DEFAULT '',
    answers JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── IMMUNIZATIONS ───────────────────────────────────
CREATE TABLE immunizations (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    vaccine VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    site VARCHAR(50) DEFAULT '',
    route VARCHAR(50) DEFAULT '',
    lot VARCHAR(50) DEFAULT '',
    manufacturer VARCHAR(100) DEFAULT '',
    administered_by VARCHAR(100) DEFAULT '',
    next_due DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── APPOINTMENTS ────────────────────────────────────
CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36),
    patient_name VARCHAR(200) DEFAULT '',
    provider VARCHAR(36) DEFAULT '',
    provider_name VARCHAR(100) DEFAULT '',
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL,
    duration INTEGER DEFAULT 30,
    type VARCHAR(50) DEFAULT 'Office Visit',
    status VARCHAR(20) DEFAULT 'Scheduled',
    reason VARCHAR(500) DEFAULT '',
    visit_type VARCHAR(20) DEFAULT 'In-Person',
    room VARCHAR(20) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── BLOCKED DAYS ────────────────────────────────────
CREATE TABLE blocked_days (
    id VARCHAR(36) PRIMARY KEY,
    provider VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    block_type VARCHAR(20) DEFAULT 'full',
    reason VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── INBOX MESSAGES ──────────────────────────────────
CREATE TABLE inbox_messages (
    id VARCHAR(36) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    from_name VARCHAR(200) NOT NULL,
    to_user VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36),
    patient_name VARCHAR(200) DEFAULT '',
    subject VARCHAR(500) DEFAULT '',
    body TEXT DEFAULT '',
    date DATE NOT NULL,
    time VARCHAR(10) DEFAULT '',
    read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(10) DEFAULT 'Normal',
    status VARCHAR(20) DEFAULT 'Unread',
    urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── STAFF MESSAGING ─────────────────────────────────
CREATE TABLE staff_channels (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'channel',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE staff_messages (
    id VARCHAR(36) PRIMARY KEY,
    channel_id VARCHAR(36) NOT NULL REFERENCES staff_channels(id),
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    user_name VARCHAR(100) DEFAULT '',
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    reactions JSONB DEFAULT '{}'
);

-- ─── BTG (BREAK THE GLASS) ──────────────────────────
CREATE TABLE btg_audit_log (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    patient_name VARCHAR(200) DEFAULT '',
    accessed_by VARCHAR(36) NOT NULL,
    accessed_by_name VARCHAR(200) DEFAULT '',
    reason TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    approved BOOLEAN DEFAULT TRUE
);

CREATE TABLE btg_access (
    id VARCHAR(36) PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ─── SMART PHRASES ───────────────────────────────────
CREATE TABLE smart_phrases (
    id VARCHAR(36) PRIMARY KEY,
    trigger_text VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) DEFAULT 'Clinical',
    content TEXT NOT NULL,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── MEDICATION DATABASE (REFERENCE) ─────────────────
CREATE TABLE medication_database (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class VARCHAR(100) DEFAULT '',
    doses JSONB DEFAULT '[]',
    routes JSONB DEFAULT '[]',
    is_controlled BOOLEAN DEFAULT FALSE,
    schedule VARCHAR(10) DEFAULT ''
);

-- ─── EPCS OTP TRACKING ──────────────────────────────
CREATE TABLE epcs_otps (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── AUDIT LOG (HIPAA) ──────────────────────────────
CREATE TABLE audit_log (
    id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(36),
    user_name VARCHAR(200) DEFAULT '',
    user_role VARCHAR(20) DEFAULT '',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(36) DEFAULT '',
    patient_id VARCHAR(36) DEFAULT '',
    patient_name VARCHAR(200) DEFAULT '',
    details TEXT DEFAULT '',
    ip_address VARCHAR(50) DEFAULT '',
    user_agent TEXT DEFAULT '',
    session_id VARCHAR(36) DEFAULT ''
);

-- ─── SESSIONS ────────────────────────────────────────
CREATE TABLE sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50) DEFAULT '',
    user_agent TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ═══════════ REVENUE CYCLE MANAGEMENT ════════════════

CREATE TABLE insurance_verifications (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    insurance_type VARCHAR(10) NOT NULL CHECK (insurance_type IN ('primary','secondary')),
    verification_data JSONB NOT NULL,
    verified_at TIMESTAMP NOT NULL,
    verified_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    encounter_id VARCHAR(36) NOT NULL REFERENCES encounters(id),
    provider_id VARCHAR(36) NOT NULL REFERENCES users(id),
    provider_npi VARCHAR(20) DEFAULT '',
    service_date DATE NOT NULL,
    cpt_codes JSONB NOT NULL,
    diagnoses JSONB NOT NULL,
    total_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Generated' CHECK (status IN ('Generated','Submitted','Processed','Paid','Denied','Appealed','Closed')),
    submission_date DATE,
    submitted_by VARCHAR(36),
    paid_date DATE,
    insurance_payment NUMERIC(12,2) DEFAULT 0,
    patient_payment NUMERIC(12,2) DEFAULT 0,
    adjustments NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    patient_responsibility NUMERIC(12,2) DEFAULT 0,
    denial_reason TEXT,
    denial_code VARCHAR(20),
    appeal_deadline DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('insurance','patient','adjustment','refund')),
    payment_method VARCHAR(10) DEFAULT '' CHECK (payment_method IN ('','check','eft','cash','card','wire','auto')),
    amount NUMERIC(12,2) NOT NULL,
    check_number VARCHAR(50),
    reference_number VARCHAR(50),
    adjustment_reason TEXT,
    adjustment_code VARCHAR(20),
    notes TEXT,
    payment_date DATE NOT NULL,
    recorded_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE practice_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(10) DEFAULT 'string' CHECK (setting_type IN ('string','number','boolean','json')),
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fee_schedule (
    id SERIAL PRIMARY KEY,
    cpt_code VARCHAR(10) NOT NULL,
    description VARCHAR(500) NOT NULL,
    fee NUMERIC(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    insurance_type VARCHAR(50) DEFAULT 'default',
    modifier VARCHAR(10) DEFAULT '',
    units INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (cpt_code, insurance_type, modifier, effective_date)
);

CREATE TABLE ar_aging (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    balance NUMERIC(12,2) NOT NULL,
    days_outstanding INTEGER NOT NULL,
    aging_bucket VARCHAR(10) NOT NULL CHECK (aging_bucket IN ('0-30','31-60','61-90','91-120','120+')),
    last_payment_date DATE,
    last_statement_date DATE,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    assigned_to VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patient_statements (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    statement_date DATE NOT NULL,
    statement_number VARCHAR(50) UNIQUE NOT NULL,
    balance_forward NUMERIC(12,2) DEFAULT 0,
    new_charges NUMERIC(12,2) DEFAULT 0,
    payments_credits NUMERIC(12,2) DEFAULT 0,
    current_balance NUMERIC(12,2) NOT NULL,
    aging_summary JSONB,
    claim_ids JSONB,
    sent_method VARCHAR(10) CHECK (sent_method IN ('mail','email','portal','print')),
    sent_date DATE,
    delivered BOOLEAN DEFAULT FALSE,
    payment_due_date DATE,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE denial_management (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER NOT NULL REFERENCES claims(id),
    denial_code VARCHAR(20) NOT NULL,
    denial_reason TEXT NOT NULL,
    denial_date DATE NOT NULL,
    appeal_deadline DATE,
    appeal_submitted BOOLEAN DEFAULT FALSE,
    appeal_date DATE,
    appeal_outcome TEXT,
    corrective_action TEXT,
    status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open','Working','Appealing','Resolved','Write-off')),
    assigned_to VARCHAR(36),
    priority VARCHAR(10) DEFAULT 'Normal' CHECK (priority IN ('Low','Normal','High','Critical')),
    follow_up_date DATE,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quality_measures (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    measure_id VARCHAR(50) NOT NULL,
    measure_name VARCHAR(200) NOT NULL,
    measurement_period VARCHAR(10) NOT NULL,
    numerator INTEGER DEFAULT 0,
    denominator INTEGER DEFAULT 1,
    exclusion INTEGER DEFAULT 0,
    exception INTEGER DEFAULT 0,
    value_set_version VARCHAR(20),
    calculated_date DATE NOT NULL,
    calculated_by VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (patient_id, measure_id, measurement_period)
);

CREATE TABLE payer_contracts (
    id SERIAL PRIMARY KEY,
    payer_name VARCHAR(200) NOT NULL,
    contract_name VARCHAR(200) NOT NULL,
    contract_type VARCHAR(20) DEFAULT 'Fee Schedule' CHECK (contract_type IN ('Fee Schedule','Capitation','Bundled Payment','Value-Based')),
    effective_date DATE NOT NULL,
    termination_date DATE,
    fee_schedule_id INTEGER,
    capitation_rate NUMERIC(10,2) DEFAULT 0,
    risk_adjustment BOOLEAN DEFAULT FALSE,
    quality_bonuses JSONB,
    contract_terms JSONB,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Pending','Terminated','Suspended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE revenue_analytics (
    id SERIAL PRIMARY KEY,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily','weekly','monthly','quarterly','yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    provider_id VARCHAR(36),
    metrics JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (period_type, period_start, period_end, provider_id)
);

CREATE TABLE telehealth_billing (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    provider_id VARCHAR(36) NOT NULL REFERENCES users(id),
    session_duration INTEGER NOT NULL,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('therapy','consultation','follow-up','psychiatric-eval')),
    platform_used VARCHAR(50),
    base_amount NUMERIC(10,2) NOT NULL,
    technology_fee NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    billing_status VARCHAR(20) DEFAULT 'pending' CHECK (billing_status IN ('pending','billed','paid','cancelled')),
    documentation_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE patient_statement_items (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER NOT NULL REFERENCES patient_statements(id),
    claim_id INTEGER,
    service_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE appeal_tasks (
    id SERIAL PRIMARY KEY,
    denial_id INTEGER NOT NULL REFERENCES denial_management(id),
    task_type VARCHAR(30) NOT NULL CHECK (task_type IN ('appeal_submission','peer_review','clinical_documentation','prior_auth')),
    assigned_to VARCHAR(36),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
    notes TEXT,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE patient_portal_access_log (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    access_type VARCHAR(30) NOT NULL CHECK (access_type IN ('login','view_statement','make_payment','view_billing_history','download_statement')),
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(36),
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_plans (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id),
    total_amount NUMERIC(12,2) NOT NULL,
    monthly_payment NUMERIC(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','defaulted','cancelled')),
    setup_fee NUMERIC(10,2) DEFAULT 0,
    late_fee NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_plan_payments (
    id SERIAL PRIMARY KEY,
    payment_plan_id INTEGER NOT NULL REFERENCES payment_plans(id),
    payment_id INTEGER REFERENCES payments(id),
    scheduled_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','paid','failed','skipped')),
    paid_date DATE,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_date DATE,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE billing_notifications (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(36),
    provider_id VARCHAR(36),
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('payment_due','payment_received','claim_denied','statement_generated','payment_plan_setup','payment_failed')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
    sent_at TIMESTAMP,
    delivery_method VARCHAR(10) CHECK (delivery_method IN ('email','sms','portal','mail')),
    recipient_address VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE billing_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN ('auto_billing','denial_prevention','payment_posting','statement_generation')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    priority INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════ INDEXES ═════════════════════════════════

CREATE INDEX idx_allergies_patient ON allergies(patient_id);
CREATE INDEX idx_problems_patient ON problems(patient_id);
CREATE INDEX idx_vitals_patient ON vitals(patient_id);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_lab_results_patient ON lab_results(patient_id);
CREATE INDEX idx_encounters_patient ON encounters(patient_id);
CREATE INDEX idx_assessments_patient ON assessments(patient_id);
CREATE INDEX idx_immunizations_patient ON immunizations(patient_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_provider ON appointments(provider);
CREATE INDEX idx_inbox_to_user ON inbox_messages(to_user);
CREATE INDEX idx_staff_messages_channel ON staff_messages(channel_id);
CREATE INDEX idx_btg_audit_patient ON btg_audit_log(patient_id);
CREATE INDEX idx_rx_history_med ON medication_rx_history(medication_id);
CREATE INDEX idx_lab_tests_result ON lab_result_tests(lab_result_id);
CREATE INDEX idx_lab_components_test ON lab_result_components(test_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_patient ON audit_log(patient_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_claims_patient ON claims(patient_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_service_date ON claims(service_date);
CREATE INDEX idx_payments_claim ON payments(claim_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_ar_aging_patient ON ar_aging(patient_id);
CREATE INDEX idx_ar_aging_bucket ON ar_aging(aging_bucket);
CREATE INDEX idx_statements_patient ON patient_statements(patient_id);
CREATE INDEX idx_denials_claim ON denial_management(claim_id);
CREATE INDEX idx_denials_status ON denial_management(status);
CREATE INDEX idx_telehealth_billing_patient ON telehealth_billing(patient_id);
CREATE INDEX idx_payment_plans_patient ON payment_plans(patient_id);
CREATE INDEX idx_portal_access_patient ON patient_portal_access_log(patient_id);
CREATE INDEX idx_billing_notifications_patient ON billing_notifications(patient_id);
CREATE INDEX idx_billing_rules_type ON billing_rules(rule_type);

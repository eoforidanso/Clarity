export async function up(db) {
  // Refills table - core refill tracking
  await db.exec(`
    CREATE TABLE IF NOT EXISTS refills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id INTEGER NOT NULL,
      medication_id INTEGER,
      medication_name VARCHAR(255) NOT NULL,
      dose VARCHAR(100),
      frequency VARCHAR(100),
      pharmacy_id INTEGER,
      pharmacy_name VARCHAR(255),
      pharmacy_phone VARCHAR(20),
      pharmacy_email VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      days_remaining INTEGER,
      refills_remaining INTEGER,
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      queued_at TIMESTAMP,
      sent_at TIMESTAMP,
      filled_at TIMESTAMP,
      notes TEXT,
      audit_trail JSONB DEFAULT '[]'::jsonb,
      insurance_verified_at TIMESTAMP,
      copay_amount NUMERIC(10, 2),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE INDEX idx_refills_patient_id ON refills(patient_id);
    CREATE INDEX idx_refills_status ON refills(status);
    CREATE INDEX idx_refills_created_at ON refills(created_at DESC);
    CREATE INDEX idx_refills_deleted_at ON refills(deleted_at);
  `);

  // Refill notifications table - tracks delivery status
  await db.exec(`
    CREATE TABLE IF NOT EXISTS refill_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      refill_id UUID NOT NULL,
      type VARCHAR(20) NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      external_id VARCHAR(255),
      error_message TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMP,
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      FOREIGN KEY (refill_id) REFERENCES refills(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_notifications_refill_id ON refill_notifications(refill_id);
    CREATE INDEX idx_notifications_status ON refill_notifications(status);
    CREATE INDEX idx_notifications_type ON refill_notifications(type);
  `);

  // Insurance eligibility cache table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS insurance_eligibility_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id INTEGER NOT NULL,
      insurance_name VARCHAR(255),
      member_id VARCHAR(100),
      group_number VARCHAR(100),
      is_eligible BOOLEAN DEFAULT true,
      coverage_type VARCHAR(50),
      copay_amount NUMERIC(10, 2),
      deductible NUMERIC(10, 2),
      out_of_pocket NUMERIC(10, 2),
      checked_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      error_details TEXT,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    CREATE INDEX idx_eligibility_patient_id ON insurance_eligibility_cache(patient_id);
    CREATE INDEX idx_eligibility_expires_at ON insurance_eligibility_cache(expires_at);
  `);
}

export async function down(db) {
  await db.exec(`
    DROP TABLE IF EXISTS refill_notifications CASCADE;
    DROP TABLE IF EXISTS insurance_eligibility_cache CASCADE;
    DROP TABLE IF EXISTS refills CASCADE;
  `);
}

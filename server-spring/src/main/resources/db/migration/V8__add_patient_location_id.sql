-- Add location_id column to patients table for location-based access control
ALTER TABLE patients ADD COLUMN IF NOT EXISTS location_id VARCHAR(255) NULL;

-- Create index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_patients_location_id ON patients(location_id);
CREATE INDEX IF NOT EXISTS idx_patients_location_active ON patients(location_id, is_active);

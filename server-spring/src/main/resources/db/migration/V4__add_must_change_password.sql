-- =====================================================
-- Add must_change_password support
-- Sets dr.chris's password to Welcome2026 with force-change flag
-- =====================================================

-- Column may already exist if Hibernate DDL auto created it; ensure it exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='must_change_password'
  ) THEN
    ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
  END IF;
END $$;

-- Set dr.chris's temporary password (Welcome2026) and require change on first login
UPDATE users
SET password_hash = '$2a$10$QML5B3VBAbIqPjKd8fcs2uyw3vJDsHKWb5lImqDlViVmgRCXgYGCy',
    must_change_password = 1
WHERE username = 'dr.chris';

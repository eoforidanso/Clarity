-- =====================================================
-- Convert must_change_password to BOOLEAN to match JPA entity
-- =====================================================

ALTER TABLE users
  ALTER COLUMN must_change_password DROP DEFAULT,
  ALTER COLUMN must_change_password TYPE BOOLEAN USING (must_change_password <> 0),
  ALTER COLUMN must_change_password SET DEFAULT FALSE;

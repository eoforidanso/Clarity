-- =====================================================
-- Fix password hashes for all seed users
-- Correct bcrypt hash for 'Pass123!' (10 rounds)
-- =====================================================

UPDATE users
SET password_hash = '$2a$10$KXAFHjKR//3NdvLvRsz3yO97MXPEtMK3wDT1clWdX/1ntWygEzWN2'
WHERE password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

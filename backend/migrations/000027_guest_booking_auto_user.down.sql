-- DOWN: cannot safely revert user creation or client_user_id links —
-- created users may already have OTP sessions, invites, etc.
-- This migration is intentionally irreversible.
SELECT 1;

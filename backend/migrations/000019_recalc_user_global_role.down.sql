-- +migrate Down

DROP TRIGGER IF EXISTS master_profiles_recalc_role ON master_profiles;
DROP TRIGGER IF EXISTS salon_members_recalc_role ON salon_members;

DROP FUNCTION IF EXISTS trg_recalc_global_role_from_mp();
DROP FUNCTION IF EXISTS trg_recalc_global_role_from_sm();
DROP FUNCTION IF EXISTS recalc_user_global_role(uuid);

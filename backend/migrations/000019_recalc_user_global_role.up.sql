-- +migrate Up

CREATE OR REPLACE FUNCTION recalc_user_global_role(target_user_id uuid) RETURNS void AS $$
DECLARE
  is_admin       boolean;
  is_salon_owner boolean;
  is_master      boolean;
  new_role       global_role;
BEGIN
  SELECT global_role = 'admin'
    INTO is_admin
  FROM users
  WHERE id = target_user_id;

  IF is_admin THEN
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM salon_members
    WHERE user_id = target_user_id
      AND role = 'owner'
  ) INTO is_salon_owner;

  SELECT EXISTS(
    SELECT 1
    FROM master_profiles
    WHERE user_id = target_user_id
  ) INTO is_master;

  new_role := CASE
    WHEN is_salon_owner THEN 'salon_owner'::global_role
    WHEN is_master THEN 'master'::global_role
    ELSE 'client'::global_role
  END;

  UPDATE users
  SET global_role = new_role
  WHERE id = target_user_id
    AND global_role <> new_role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_global_role_from_sm() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_user_global_role(OLD.user_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    PERFORM recalc_user_global_role(OLD.user_id);
  END IF;

  PERFORM recalc_user_global_role(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_global_role_from_mp() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM recalc_user_global_role(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id AND OLD.user_id IS NOT NULL THEN
    PERFORM recalc_user_global_role(OLD.user_id);
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    PERFORM recalc_user_global_role(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS salon_members_recalc_role ON salon_members;
CREATE TRIGGER salon_members_recalc_role
AFTER INSERT OR UPDATE OR DELETE ON salon_members
FOR EACH ROW EXECUTE FUNCTION trg_recalc_global_role_from_sm();

DROP TRIGGER IF EXISTS master_profiles_recalc_role ON master_profiles;
CREATE TRIGGER master_profiles_recalc_role
AFTER INSERT OR UPDATE OR DELETE ON master_profiles
FOR EACH ROW EXECUTE FUNCTION trg_recalc_global_role_from_mp();

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM users WHERE deleted_at IS NULL LOOP
    PERFORM recalc_user_global_role(r.id);
  END LOOP;
END $$;

ALTER TYPE salon_member_role ADD VALUE IF NOT EXISTS 'receptionist';

CREATE TYPE salon_member_invite_status AS ENUM (
    'pending', 'accepted', 'declined', 'expired'
);

CREATE TABLE salon_member_invites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id    uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    phone_e164  text NOT NULL,
    role        salon_member_role NOT NULL,
    status      salon_member_invite_status NOT NULL DEFAULT 'pending',
    invited_by  uuid NOT NULL REFERENCES users(id),
    user_id     uuid REFERENCES users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

    CONSTRAINT no_owner_invite CHECK (role <> 'owner')
);

CREATE INDEX idx_smi_salon_status ON salon_member_invites(salon_id, status);
CREATE INDEX idx_smi_phone_pending ON salon_member_invites(phone_e164, status)
    WHERE status = 'pending';
CREATE INDEX idx_smi_user_pending ON salon_member_invites(user_id, status)
    WHERE status = 'pending' AND user_id IS NOT NULL;

CREATE TABLE salon_clients (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id      UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    phone_e164    TEXT,
    display_name  TEXT NOT NULL,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_salon_client_user   ON salon_clients(salon_id, user_id)    WHERE user_id   IS NOT NULL;
CREATE UNIQUE INDEX uniq_salon_client_phone  ON salon_clients(salon_id, phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE salon_client_tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id   UUID REFERENCES salons(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (salon_id, name)
);

CREATE TABLE salon_client_tag_assignments (
    salon_client_id UUID NOT NULL REFERENCES salon_clients(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES salon_client_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (salon_client_id, tag_id)
);

ALTER TABLE appointments ADD COLUMN salon_client_id UUID REFERENCES salon_clients(id) ON DELETE SET NULL;

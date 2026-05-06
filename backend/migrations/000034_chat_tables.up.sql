BEGIN;

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('external', 'internal', 'inquiry')),
    appointment_id UUID NULL REFERENCES appointments(id) ON DELETE CASCADE,
    salon_id UUID NULL REFERENCES salons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'readonly', 'archived')),
    locked_until_first_reply BOOLEAN NOT NULL DEFAULT FALSE,
    access_token UUID NOT NULL DEFAULT gen_random_uuid(),
    readonly_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_rooms_external_has_appointment CHECK (
        type <> 'external' OR appointment_id IS NOT NULL
    ),
    CONSTRAINT chat_rooms_internal_has_salon CHECK (
        type <> 'internal' OR salon_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX chat_rooms_external_appt_uniq
    ON chat_rooms(appointment_id)
    WHERE type = 'external';

CREATE UNIQUE INDEX chat_rooms_access_token_uniq ON chat_rooms(access_token);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('guest', 'master', 'owner', 'receptionist', 'system')),
    body TEXT NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_messages_system_has_no_sender CHECK (
        (is_system = TRUE AND sender_user_id IS NULL AND sender_role = 'system')
        OR (is_system = FALSE)
    )
);

CREATE INDEX chat_messages_room_created_idx ON chat_messages(room_id, created_at DESC);

CREATE TABLE chat_message_reads (
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX chat_message_reads_user_idx ON chat_message_reads(user_id);

COMMIT;

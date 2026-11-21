CREATE TABLE app_user (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(80) NOT NULL
        CHECK (username <> '' AND username = btrim(username)),
    password_hash text NOT NULL CHECK (password_hash <> ''),
    role varchar(16) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'OPERATOR')),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX app_user_username_unique ON app_user (lower(username));

ALTER TABLE stay
    ADD COLUMN entered_by_user_id bigint REFERENCES app_user (id),
    ADD COLUMN exited_by_user_id bigint REFERENCES app_user (id),
    ADD CONSTRAINT stay_exit_actor_requires_exit
        CHECK (exited_by_user_id IS NULL OR exited_at IS NOT NULL);

CREATE TABLE login_event (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    username_attempted text NOT NULL,
    user_id bigint REFERENCES app_user (id),
    successful boolean NOT NULL,
    CHECK (NOT successful OR user_id IS NOT NULL)
);

CREATE INDEX login_event_occurred_at_idx ON login_event (occurred_at DESC, id DESC);

CREATE TABLE audit_event (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id bigint NOT NULL REFERENCES app_user (id),
    action varchar(64) NOT NULL CHECK (btrim(action) <> ''),
    target_user_id bigint REFERENCES app_user (id),
    target_stay_id bigint REFERENCES stay (id),
    CHECK (num_nonnulls(target_user_id, target_stay_id) = 1)
);

CREATE INDEX audit_event_occurred_at_idx ON audit_event (occurred_at DESC, id DESC);

CREATE TABLE parking_config (
    id boolean PRIMARY KEY DEFAULT true CHECK (id),
    capacity integer NOT NULL CHECK (capacity > 0),
    hourly_rate numeric(10, 2) NOT NULL CHECK (hourly_rate > 0)
);

INSERT INTO parking_config (capacity, hourly_rate) VALUES (12, 25.00);

CREATE TABLE stay (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate varchar(10) NOT NULL,
    entered_at timestamptz NOT NULL,
    exited_at timestamptz,
    hourly_rate numeric(10, 2) NOT NULL CHECK (hourly_rate > 0),
    amount numeric(16, 2),
    CHECK ((exited_at IS NULL AND amount IS NULL)
        OR (exited_at IS NOT NULL AND exited_at >= entered_at
            AND amount IS NOT NULL AND amount >= hourly_rate))
);

CREATE UNIQUE INDEX stay_active_plate ON stay (plate) WHERE exited_at IS NULL;

CREATE EXTENSION pg_cron;

CREATE TABLE cron_log (
    id serial PRIMARY KEY,
    message text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert a row every 10 seconds
SELECT cron.schedule('heartbeat', '10 seconds', $$
    INSERT INTO cron_log (message)
    VALUES ('Heartbeat #' || (SELECT COALESCE(MAX(id), 0) + 1 FROM cron_log))
$$);

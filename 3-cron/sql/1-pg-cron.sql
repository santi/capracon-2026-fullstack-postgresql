


        CREATE EXTENSION pg_cron;

        CREATE TABLE cron_log (
            id serial PRIMARY KEY,
            message text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        -- Schedule a task — runs every 10 seconds
        SELECT cron.schedule('heartbeat', '10 seconds', $$
            INSERT INTO cron_log (message)
            VALUES ('Heartbeat #' || (SELECT MAX(id) + 1 FROM cron_log))
        $$);




-- Check what's scheduled
SELECT jobid, jobname, schedule, command FROM cron.job;

-- See the last 10 entries
SELECT id, message, created_at FROM cron_log ORDER BY id DESC LIMIT 10;

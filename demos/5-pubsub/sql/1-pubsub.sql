
LISTEN events;

SELECT pg_notify('events', 'Hello from PostgreSQL!');

-- Automatic heartbeat with pg_cron
SELECT cron.schedule('heartbeat', '5 seconds', $$
    SELECT pg_notify('events', 'heartbeat')
$$);

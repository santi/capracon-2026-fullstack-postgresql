CREATE EXTENSION pg_cron;

-- Heartbeat: notify all listeners every 5 seconds
SELECT cron.schedule('heartbeat', '5 seconds', $$
    SELECT pg_notify('events', 'heartbeat')
$$);

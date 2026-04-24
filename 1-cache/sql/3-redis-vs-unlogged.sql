-- Redis vs PostgreSQL UNLOGGED table
-- Both are ephemeral — data lost on crash. That's fine for a cache.
-- But one requires running a separate service, the other is just a table.

-- Redis (pseudocode):
--   SET leaderboard '{"items": [...]}' EX 60
--   GET leaderboard

-- PostgreSQL unlogged table:
INSERT INTO cache_unlogged (key, value, expires_at)
VALUES ('leaderboard', '{"items": []}', now() + interval '60 seconds')
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at;

SELECT value FROM cache_unlogged WHERE key = 'leaderboard';

-- Cleanup expired entries (run on a schedule, or check on read)
DELETE FROM cache_unlogged WHERE expires_at < now();

-- What you trade:
--   Redis:    ~0.2ms reads, ~0.2ms writes, separate process, separate protocol
--   PG cache: ~0.2ms reads, ~0.3ms writes, same database, same connection
--
-- What you gain:
--   One less service to run, monitor, and keep alive.
--   Cache lives next to your data — no serialization round-trip.
--   Transactions work: you can cache inside the same transaction as a write.

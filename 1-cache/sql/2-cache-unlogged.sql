CREATE UNLOGGED TABLE IF NOT EXISTS cache_unlogged (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds'
);




-- Skriv en verdi til cache
INSERT INTO cache_unlogged (key, value, expires_at)
VALUES ('leaderboard', '{"items": []}', now() + interval '60 seconds')
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at;




-- Les en verdi fra cache
SELECT value FROM cache_logged WHERE key = 'leaderboard';

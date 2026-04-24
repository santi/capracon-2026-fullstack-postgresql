CREATE TABLE IF NOT EXISTS cache_logged (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds'
);




-- Skriv en verdi til cache
INSERT INTO cache_logged (key, value, expires_at)
VALUES ('leaderboard', '{"items": []}', now() + interval '60 seconds')
ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        expires_at = EXCLUDED.expires_at;




-- Les en verdi fra cache
SELECT value FROM cache_logged WHERE key = 'leaderboard';




-- Stort query som "kjøres" på hver fulle request
-- (10,000 questions, 100,000 votes)
SELECT q.id, q.title, u.username, t.title as talk_title,
       COUNT(v.id) as vote_count
FROM questions q
JOIN users u ON q.user_id = u.id
JOIN talks t ON q.talk_id = t.id
LEFT JOIN votes v ON v.question_id = q.id
GROUP BY q.id, q.title, u.username, t.title
ORDER BY vote_count DESC
LIMIT 10;



        CREATE UNLOGGED TABLE cache (
            key text PRIMARY KEY,
            value jsonb NOT NULL,
            expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds'
        );

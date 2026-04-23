-- Regular table (writes to WAL, crash-safe)
CREATE TABLE cache_logged (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds'
);

-- Unlogged table (skips WAL, faster writes, data lost on crash — like Redis!)
CREATE UNLOGGED TABLE cache_unlogged (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds'
);

-- ============================================================
-- Data for the "why cache?" benchmark:
-- A realistic schema with enough rows that the leaderboard
-- query does real work (joins + aggregation + sort).
-- ============================================================

CREATE TABLE users (
    id serial PRIMARY KEY,
    username text NOT NULL
);

CREATE TABLE talks (
    id serial PRIMARY KEY,
    title text NOT NULL,
    speaker text NOT NULL
);

CREATE TABLE questions (
    id serial PRIMARY KEY,
    user_id int REFERENCES users(id),
    talk_id int REFERENCES talks(id),
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE votes (
    id serial PRIMARY KEY,
    question_id int REFERENCES questions(id),
    user_id int REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_votes_question ON votes(question_id);

-- Seed: 500 users, 30 talks, 10,000 questions, 100,000 votes
INSERT INTO users (username)
SELECT 'user_' || i FROM generate_series(1, 500) i;

INSERT INTO talks (title, speaker)
SELECT 'Talk #' || i || ': ' || md5(i::text), 'Speaker ' || i
FROM generate_series(1, 30) i;

INSERT INTO questions (user_id, talk_id, title, body)
SELECT
    (random() * 499 + 1)::int,
    (random() * 29 + 1)::int,
    'Question ' || i || ': ' || md5(i::text),
    'This is the body of question ' || i || '. ' || repeat(md5(i::text), 3)
FROM generate_series(1, 10000) i;

INSERT INTO votes (question_id, user_id)
SELECT
    (random() * 9999 + 1)::int,
    (random() * 499 + 1)::int
FROM generate_series(1, 100000) i;

-- Pre-fill cache tables with 50k rows each so benchmarks
-- operate against realistic table sizes, not empty tables.
INSERT INTO cache_logged (key, value, expires_at)
SELECT
    'prefill:' || i,
    jsonb_build_object('id', i, 'data', repeat(md5(i::text), 5)),
    now() + interval '1 hour'
FROM generate_series(1, 50000) i;

INSERT INTO cache_unlogged (key, value, expires_at)
SELECT
    'prefill:' || i,
    jsonb_build_object('id', i, 'data', repeat(md5(i::text), 5)),
    now() + interval '1 hour'
FROM generate_series(1, 50000) i;

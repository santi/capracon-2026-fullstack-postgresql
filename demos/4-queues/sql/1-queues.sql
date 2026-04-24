CREATE TABLE jobs (
    id serial PRIMARY KEY,
    payload text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);



-- Enqueue a job
INSERT INTO jobs (payload) VALUES ('Send email to user_42');



BEGIN;

SELECT id, payload FROM jobs
ORDER BY created_at
LIMIT 10
FOR UPDATE
SKIP LOCKED;

-- ... do the work ...

DELETE FROM jobs WHERE id = :id;

COMMIT;

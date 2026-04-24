CREATE TABLE questions (
    id serial PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL,
    search_vector tsvector
);
-- Create a GIN index (like Elasticsearch's inverted index)
CREATE INDEX idx_search ON questions USING GIN(search_vector);




-- Implement auto-update on insert/update (title weighted higher than body)
CREATE OR REPLACE FUNCTION questions_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_search
    BEFORE INSERT OR UPDATE OF title, body ON questions
    FOR EACH ROW EXECUTE FUNCTION questions_search_trigger();





-- Search — "searching" matches "search", "databases" matches "database"
SELECT id, title,
       ts_rank(search_vector, websearch_to_tsquery('english', :search_phrase)) AS rank,
       ts_headline('english', body, websearch_to_tsquery('english', :search_phrase),
           'MaxFragments=2, MaxWords=30') AS headline
FROM questions
WHERE search_vector @@ websearch_to_tsquery('english', :search_phrase)
ORDER BY rank DESC
LIMIT 10;



-- What you get:
--   Stemming:    "searching" matches "search"
--   Ranking:     title matches score higher (weight A vs B)
--   Highlighting: ts_headline wraps matches in tags
--   Speed:       GIN index makes it fast on millions of rows
--
-- What you trade:
--   No fuzzy matching (typo tolerance)
--   No synonyms out of the box
--   No distributed search across shards
--
-- What you gain:
--   No separate service to run
--   Transactional consistency — search is always up to date
--   Same connection, same query language

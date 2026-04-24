
        CREATE SCHEMA api;
        CREATE ROLE anon NOLOGIN;
        GRANT USAGE ON SCHEMA api TO anon;

        -- Expose a view — becomes GET /talks
        CREATE VIEW api.talks AS SELECT * FROM talks;
        GRANT SELECT ON api.talks TO anon;


        -- Expose a function — becomes POST /rpc/post_to_notion
        CREATE FUNCTION api.post_to_notion(title text) RETURNS json AS $$
            // PL/V8: JavaScript running inside PostgreSQL
            if (!title || title.trim().length === 0) {
                return { error: 'Title cannot be empty' };
            }
            var result = plv8.execute("SELECT notion_post($1) as response", [title.trim()]);
            return result[0].response;
        $$ LANGUAGE plv8;

        GRANT EXECUTE ON FUNCTION api.post_to_notion(text) TO anon;


        -- GET  http://localhost:8090/talks
        -- POST http://localhost:8090/rpc/post_to_notion  { "title": "Hello!" }

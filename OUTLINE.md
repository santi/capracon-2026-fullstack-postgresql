# Fullstack PostgreSQL

## Premise

A typical web application uses PostgreSQL for the database — and then bolts on Redis for caching, Elasticsearch for search, RabbitMQ for queues, cron for scheduling, an Express/FastAPI backend for business logic, an auth service, and more. What if you didn't need any of that? What if PostgreSQL could be your *entire* stack?

This talk progressively replaces every layer of a web application with PostgreSQL features, extensions, and creative abuse. It starts with things that are genuinely useful in production, and escalates into territory that is technically impressive, deeply entertaining, and absolutely inadvisable. By the end, the only thing standing between the user and the database is a browser.

## The Demo App

A small but functional web app — built "normally" at the start, then progressively transformed during the talk until it runs entirely on PostgreSQL. The app should be something the audience can relate to and that exercises enough features to make each replacement meaningful.

**Candidate: A conference feedback/Q&A board for CapraCon itself.**
- Users can submit questions or feedback on talks
- Search through submissions
- Real-time updates when new submissions arrive
- Cached leaderboard / trending view
- Background jobs for notifications
- Auth so people can edit/delete their own submissions

This gives us: search, caching, pub/sub, queues, cron, auth, API, and business logic — everything we need to replace.

### Starting stack (before the talk begins)
- **Frontend:** Simple HTML/JS (stays throughout — we're replacing the *backend*, not the browser)
- **Backend:** Node.js / Express
- **Database:** PostgreSQL
- **Cache:** Redis
- **Search:** Elasticsearch
- **Queue:** Bull (Redis-backed)
- **Auth:** Express middleware + JWT

---

## Act 1: "This Is Actually Fine"

*Mood: Practical. The audience nods along. These are good ideas.*

### Replacing Elasticsearch → PostgreSQL Full-Text Search

PostgreSQL has a built-in full-text search engine that is genuinely good enough for most applications.

**Key concepts to show:**
- `tsvector` and `tsquery` — the fundamental types
- `to_tsvector('english', title || ' ' || body)` — building search documents
- GIN indexes for fast lookup
- `ts_rank()` for relevance scoring
- `ts_headline()` for highlighted snippets in results
- Phrase search with `<->` (adjacency operator)
- Weighted search: title matches rank higher than body matches (`setweight()`)

**In the demo:** Rip out Elasticsearch. Add a `search_vector` column with a GIN index. Show that search is fast, supports ranking, and handles the 95% case without a separate service.

**Production take:** This is genuinely good advice. You probably don't need Elasticsearch until you have millions of documents or need advanced analyzers.

### Replacing Redis → Unlogged Tables + JSONB

Redis is often used for two things: caching and ephemeral key-value storage. PostgreSQL can do both with unlogged tables.

**Key concepts to show:**
- `UNLOGGED` tables — not written to WAL, so much faster writes, but data lost on crash (just like Redis)
- JSONB values for flexible cached data
- TTL pattern: a `expires_at` timestamp column + `pg_cron` to periodically purge expired entries (or check on read)
- `ON CONFLICT DO UPDATE` for upsert (SET if exists)
- Compare latency: unlogged table reads are in the low milliseconds — not Redis-fast, but fast enough for many use cases

**In the demo:** Replace the Redis-backed trending/leaderboard cache with an unlogged table. Cache the computed leaderboard as a JSONB blob with a TTL. Show that the app still works.

**Production take:** If your cache is in the same data center as your database and you don't need sub-millisecond reads, this actually works. You lose Redis's data structures, but JSONB covers a lot of ground.

### Side note (brief mention, no live demo)

Mention that PostgreSQL can also replace:
- **MongoDB** → JSONB columns with GIN indexes (document store)
- **S3/file storage** → Large Objects or `bytea` columns
- **Pinecone/vector DBs** → `pgvector` extension
- **Key-value stores** → `hstore` or JSONB

Reference previous talks for details. The point: PostgreSQL is already more versatile than most people realize, and we're just getting started.

---

## Act 2: "Okay, This Is Getting Interesting"

*Mood: Intrigued. The audience leans forward. These work but feel like they shouldn't.*

### Replacing RabbitMQ/Bull → PostgreSQL Job Queue

The `SELECT ... FOR UPDATE SKIP LOCKED` pattern turns PostgreSQL into a surprisingly capable job queue.

**Key concepts to show:**
- A `jobs` table with `status`, `payload`, `locked_at`, `run_at`
- Worker query: `SELECT * FROM jobs WHERE status = 'pending' AND run_at <= now() FOR UPDATE SKIP LOCKED LIMIT 1`
- This is concurrency-safe — multiple workers can poll without conflicts
- `SKIP LOCKED` is the magic: it skips rows that another transaction has already claimed
- Retry logic: if a worker crashes, the transaction rolls back and the job becomes available again
- The `pgmq` extension as a more polished version of this pattern

**In the demo:** Replace Bull/Redis queue with a `jobs` table. Background jobs (e.g., "send notification when a new question is posted") now run through PostgreSQL.

**Production take:** This pattern is battle-tested at companies like Stripe (who used it for years). For moderate throughput, it's simpler and more reliable than running a separate message broker.

### Replacing WebSocket / Redis Pub/Sub → LISTEN/NOTIFY

PostgreSQL has a built-in pub/sub mechanism that most developers don't know about.

**Key concepts to show:**
- `NOTIFY channel, 'payload'` — send a message
- `LISTEN channel` — subscribe to messages
- Trigger-based notifications: automatically notify on INSERT/UPDATE
- Payload is limited to 8000 bytes (mention this constraint)
- Bridge to the frontend: a tiny Node.js script (~10 lines) that `LISTEN`s and forwards to WebSocket clients

**In the demo:** When someone submits a new question, a trigger fires `NOTIFY`. The bridge script pushes it to all connected browsers in real-time. No Redis pub/sub needed.

**Production take:** For low-to-moderate volume real-time features, this is perfectly fine. It doesn't scale to millions of subscribers, but for internal tools, dashboards, and small apps — great.

### Replacing Cron → pg_cron

Schedule recurring tasks inside the database itself.

**Key concepts to show:**
- `pg_cron` extension: `SELECT cron.schedule('clean-expired-cache', '*/5 * * * *', $$DELETE FROM cache WHERE expires_at < now()$$);`
- Can call functions, run queries, or even trigger HTTP requests (combined with `pg_net`)
- `cron.job_run_details` for monitoring execution history

**In the demo:** Schedule cache cleanup (purge expired entries from the unlogged cache table) and periodic leaderboard recalculation. No external cron daemon needed.

**Production take:** Legitimately useful. Simpler than managing external cron jobs for database-centric tasks.

---

## Act 3: "We've Gone Too Far, But We Can't Stop Now"

*Mood: Nervous laughter. The audience is impressed and slightly horrified.*

### Replacing Express → PostgREST

Eliminate the entire backend application. PostgREST generates a full REST API directly from your PostgreSQL schema.

**Key concepts to show:**
- Point PostgREST at a schema, get instant CRUD endpoints
- Filtering: `GET /questions?topic=eq.postgres&order=votes.desc`
- Embedding related data: `GET /questions?select=*,answers(*)`
- Views as API endpoints — create a view, get an endpoint
- RPC: expose PostgreSQL functions as POST endpoints (`/rpc/function_name`)

**In the demo:** Remove Express entirely. The frontend now talks directly to PostgREST. Show that all CRUD operations, search, and filtering still work.

**Production take:** PostgREST is actually production-grade software (used by Supabase under the hood). For CRUD-heavy apps, it's genuinely a viable architecture.

### Replacing Auth Middleware → PostgreSQL Roles + Row-Level Security

Let the database handle authentication and authorization.

**Key concepts to show:**
- PostgREST passes JWT claims as PostgreSQL session variables (`current_setting('request.jwt.claims')`)
- Create database roles: `anon` (unauthenticated) and `authenticated`
- Row-Level Security policies:
  ```sql
  CREATE POLICY own_questions ON questions
    USING (user_id = current_setting('request.jwt.claims')::json->>'sub');
  ```
- Users can only see/edit their own data — enforced at the database level, not the application level
- `GRANT` / `REVOKE` for endpoint-level access control

**In the demo:** Enable RLS. Show that users can only modify their own submissions. Try to access another user's data — blocked by the database itself.

**Production take:** RLS is powerful and underused. Even in traditional architectures, it's a solid defense-in-depth layer.

### Running JavaScript Inside PostgreSQL → PL/V8

This is where it gets unhinged. PL/V8 lets you write PostgreSQL functions in JavaScript (V8 engine).

**Key concepts to show:**
- Install PL/V8: `CREATE EXTENSION plv8;`
- Write JavaScript functions that run inside the database process
- Access to `plv8.execute()` for running SQL from JavaScript
- Full V8 engine: closures, promises (with caveats), JSON manipulation
- Example: a function that takes a submission, validates it, sanitizes HTML, computes a summary, and returns the result — all in JS, all inside PostgreSQL

**The funny bit:** You're literally running Node.js (well, V8) inside PostgreSQL. Show the audience a JavaScript function in a `CREATE FUNCTION` statement. Let the absurdity sink in.

**In the demo:** Move validation and business logic from the (now-deleted) Express app into PL/V8 functions. PostgREST calls these via `/rpc/submit_question`. The "backend" is now JavaScript functions living inside the database.

### Sending HTTP Requests from PostgreSQL → pg_net / PL/Python

PostgreSQL can make outbound HTTP calls.

**Key concepts to show:**
- `pg_net` extension: `SELECT net.http_post(url, headers, body)`
- Alternative: PL/Python with `import requests`
- Trigger-based: insert a row → trigger fires → HTTP request sent
- Use case: send a webhook/notification when something happens

**In the demo:** When a question gets 10 upvotes, a trigger calls a webhook (e.g., Slack notification). The database is now sending HTTP requests autonomously.

---

## Act 4: "The Final Boss"

*Mood: Pure chaos. The audience is laughing, clapping, or shaking their heads. This is the climax.*

### Serving Web Pages from PostgreSQL

The database generates and serves HTML.

**Key concepts to show:**
- PL/V8 functions that return `text` containing full HTML documents
- Template the HTML with JavaScript string interpolation
- Query data and inject it directly into the HTML inside the same function
- PostgREST serves the function output as a response (with appropriate content-type headers via response headers config)
- The entire "web application" is now: Browser → PostgREST → PostgreSQL functions → HTML

**In the demo:** Create a `/rpc/render_page` function that queries the questions table and returns a fully rendered HTML page. Open it in the browser. It works. The audience processes what just happened.

### Querying External Data → Foreign Data Wrappers

PostgreSQL can query external systems as if they were local tables.

**Key concepts to show:**
- `postgres_fdw` — query other PostgreSQL databases
- `file_fdw` — query CSV files as tables
- Community FDWs for REST APIs, Redis, MongoDB, etc.
- `CREATE FOREIGN TABLE stripe_customers ...` → `SELECT * FROM stripe_customers WHERE plan = 'pro'`

**In the demo:** Set up a foreign data wrapper to query some external data source. Show a single SQL query that joins local data with external data seamlessly.

### The Grand Finale: AI Inside PostgreSQL — Calling the Claude API

*"I put the agent inside of PostgreSQL, not the other way around."*

The punchline of the entire talk. PostgreSQL calls the Claude API to generate responses.

**Key concepts to show:**
- A PL/Python or PL/V8 function that calls the Anthropic API
- Takes a user's question as input, sends it to Claude along with relevant context from the database
- Returns Claude's response as text
- Triggered automatically: ask a question on the board → PostgreSQL queries for relevant context → calls Claude → stores and returns the AI-generated answer
- The database is now an autonomous AI agent

**In the demo:**
```sql
SELECT ask_claude('What are the best PostgreSQL extensions for search?');
```
Show this running live. The database calls the Claude API, gets a response, and returns it. Then show it wired into the app: submit a question, get an AI-generated answer, all processed inside PostgreSQL.

**The moment:** Zoom out and show the architecture diagram. The entire stack is: Browser → PostgREST → PostgreSQL. That's it. The database does search, caching, queuing, scheduling, auth, business logic, HTML rendering, and AI. "Fullstack PostgreSQL."

---

## Closing: What Should You Actually Do?

*Bring it back to earth. The audience has been on a ride — now give them practical takeaways.*

### Actually good ideas (use these in production)
- **Full-text search** — genuinely great for most apps, saves you running Elasticsearch
- **JSONB** — flexible document storage without MongoDB
- **Job queues with SKIP LOCKED** — simpler than a message broker for moderate throughput
- **Row-Level Security** — powerful security layer, even alongside traditional auth
- **pg_cron** — easier than external cron for database tasks
- **LISTEN/NOTIFY** — simple real-time features without Redis

### Cool but evaluate carefully
- **PostgREST** — legitimate for CRUD-heavy apps, powers Supabase
- **Unlogged tables for caching** — works if you don't need sub-ms latency
- **pgvector** — good enough for many AI/search use cases
- **Foreign Data Wrappers** — powerful for data integration, but can be surprising performance-wise

### Please don't do this (but now you know you can)
- Serving HTML from SQL functions
- Running your business logic in PL/V8 inside the database
- Calling external AI APIs from database triggers
- Making your database an autonomous agent

### The real takeaway
PostgreSQL is absurdly capable. Most teams reach for additional services too early. Before adding a new dependency to your stack, check if PostgreSQL already does what you need. Often, it does — and the solution is simpler, more reliable, and easier to operate than running another service.

But also: just because you *can* doesn't mean you *should*. The fact that PostgreSQL can serve HTML and call AI APIs is a testament to its extensibility — not a deployment guide.

---

## Talk Structure / Timing (rough)

| Section | Duration | Cumulative |
|---------|----------|------------|
| Intro & premise | 3 min | 3 min |
| Act 1: Search + Cache | 7 min | 10 min |
| Act 2: Queues + Pub/Sub + Cron | 8 min | 18 min |
| Act 3: API + Auth + PL/V8 + HTTP | 10 min | 28 min |
| Act 4: HTML + FDW + Claude API | 8 min | 36 min |
| Closing & takeaways | 4 min | 40 min |

Adjust based on actual talk slot. If shorter, compress Acts 1-2 and keep the finale intact — that's the payoff.

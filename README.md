# Fullstack PostgreSQL — CapraCon 2026

Demo material for the talk "Fullstack PostgreSQL" at CapraCon 2026, showing how PostgreSQL can replace Redis, Elasticsearch, cron, message queues, pub/sub, and even your application server.

Six self-contained demos, each with its own Docker Compose setup, runnable scripts, and SQL files to show on screen.

## Prerequisites

- Docker / Podman with Compose
- Node.js 18+
- `psql` (PostgreSQL client)

## Demos

| # | Topic | Replaces | Port |
|---|-------|----------|------|
| 1 | [Cache](1-cache/) | Redis | 5433 |
| 2 | [Search](2-search/) | Elasticsearch | 5434 |
| 3 | [Cron](3-cron/) | System cron / node-cron | 5435 |
| 4 | [Queues](4-queues/) | BullMQ / RabbitMQ | 5436 |
| 5 | [Pub/Sub](5-pubsub/) | Redis Pub/Sub / Kafka | 5437 |
| 6 | [HTTP + AI](6-http/) | Express + external APIs | 5438, 8090 |

### 1 — Cache: Redis vs PostgreSQL

Compare computing a leaderboard from scratch, caching in a regular table, caching in an UNLOGGED table, and using Redis. Three benchmarks showing that UNLOGGED tables are fast enough to replace Redis for most caching.

```bash
cd 1-cache
docker compose up -d && npm install
node 1-why-cache.js          # Why cache at all?
node 2-logged-vs-unlogged.js # WAL overhead
node 3-redis-vs-unlogged.js  # Head-to-head
docker compose down -v
```

### 2 — Search: Elasticsearch vs PostgreSQL

Interactive full-text search. Index and query with Elasticsearch, then do the same with `tsvector`, GIN indexes, `ts_rank`, and `ts_headline` — no extra service needed.

```bash
cd 2-search
docker compose up -d && npm install
node 1-elasticsearch.js "replication"
node 2-pg-search.js "replication"
docker compose down -v
```

### 3 — Cron: Scheduled tasks with pg_cron

A pg_cron job writes a heartbeat row every 10 seconds. A shell script watches the table refresh live.

```bash
cd 3-cron
docker compose up -d --build
# Wait ~30 seconds, then:
./demo.sh
```

### 4 — Queues: Pull-based job queues with SKIP LOCKED

Enqueue jobs, then run workers that claim them atomically with `SELECT FOR UPDATE SKIP LOCKED`. Run three workers in parallel — no duplicates, no conflicts.

```bash
cd 4-queues
docker compose up -d && npm install
node 1-enqueue.js 20
node 2-worker.js              # Single worker
./3-run-workers.sh             # Three workers in parallel
docker compose down -v
```

### 5 — Pub/Sub: LISTEN/NOTIFY

Open two terminals. One listens for events (including automatic heartbeats from pg_cron), the other sends messages.

```bash
cd 5-pubsub
docker compose up -d --build && npm install

# Terminal 1:
node 1-listen.js

# Terminal 2:
node 2-notify.js "Hello from CapraCon"
```

### 6 — HTTP, FDW, PostgREST, PL/V8, Claude AI

The grand finale. Read a CSV file as a SQL table (FDW), expose it as a REST API (PostgREST), validate with JavaScript inside PostgreSQL (PL/V8), call external APIs from SQL (PL/Python), and generate AI descriptions with Claude.

Requires a `.env` file with `NOTION_TOKEN`, `NOTION_DB_ID`, and `ANTHROPIC_API_KEY`.

```bash
cd 6-http
docker compose up -d --build

# FDW: CSV as a table
psql "postgresql://postgres:postgres@localhost:5438/demo" -c "SELECT * FROM talks;"

# PostgREST: REST API
curl http://localhost:8090/talks

# Notion: HTTP POST from SQL
curl -X POST http://localhost:8090/rpc/post_to_notion \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello from CapraCon!"}'

# Claude: AI-generated talk description
curl -X POST http://localhost:8090/rpc/describe_talk \
  -H "Content-Type: application/json" \
  -d '{"talk_id": 1}'
```

## Structure

Each demo folder follows the same pattern:

```
N-topic/
├── docker-compose.yml   # Services (each demo uses unique ports)
├── init.sql             # Schema, seed data, extensions
├── DEMO-NOTES.md        # Commands to run during the talk
├── sql/                 # SQL files to show on screen
└── *.js / *.sh          # Runnable demo scripts
```

## Cleanup

Stop all running demos:

```bash
for d in 1-cache 2-search 3-cron 4-queues 5-pubsub 6-http; do
  (cd "$d" && docker compose down -v 2>/dev/null)
done
```

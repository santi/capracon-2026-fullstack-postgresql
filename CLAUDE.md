# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Demo material for the conference talk "Fullstack PostgreSQL" at CapraCon 2026. Six self-contained demos, each replacing a traditional infrastructure component with PostgreSQL. Each demo runs independently with its own Docker Compose stack and unique ports.

## Running demos

Every demo follows the same pattern:

```bash
cd <N-topic>
docker compose up -d [--build]   # --build needed for demos with Dockerfiles (3, 5, 6)
npm install                       # only for demos with package.json (1, 2, 4, 5)
node <script>.js                  # or ./demo.sh for demo 3
docker compose down -v            # cleanup (removes volumes)
```

Demo 6 requires a `.env` file with `NOTION_TOKEN`, `NOTION_DB_ID`, and `ANTHROPIC_API_KEY`.

## Architecture

### Port allocation (no conflicts — all demos can run simultaneously)

| Demo | PG port | Extra |
|------|---------|-------|
| 1-cache | 5433 | Redis 6380 |
| 2-search | 5434 | Elasticsearch 9201 |
| 3-cron | 5435 | |
| 4-queues | 5436 | |
| 5-pubsub | 5437 | |
| 6-http | 5438 | nginx/PostgREST 8090 |

### Two kinds of SQL files

- **`init.sql`** — Runs automatically on container start (mounted into `/docker-entrypoint-initdb.d/`). Contains full schema, extensions, seed data, and function definitions.
- **`sql/*.sql`** — Presentation files to show on screen during the talk. Simplified, heavily commented versions of what's in init.sql. These are intentionally different — optimized for readability, not execution.

### Custom Dockerfiles

Demos 3, 5, and 6 have Dockerfiles that extend stock PostgreSQL images to add extensions:
- **3-cron, 5-pubsub**: `postgres:16` + `postgresql-16-cron` (requires `shared_preload_libraries` config)
- **6-http**: `sibedge/postgres-plv8:16.10-3.2.3-bookworm` + `postgresql-plpython3-16` + `ca-certificates`

All other demos use stock `postgres:16`.

### PostgREST pattern (demo 6)

nginx (port 8090) proxies to PostgREST (port 3000), which auto-generates a REST API from the `api` schema. Functions are exposed as RPC endpoints (`/rpc/function_name`). An `anon` role controls permissions via `GRANT`.

### Node.js conventions

- Plain scripts, no frameworks. All use the `pg` library with connection pools.
- `benchmark.js` in 1-cache is a shared module exporting `measure()`, `fmt()`, pool, and redis client.
- Scripts are numbered for execution order: `1-enqueue.js`, `2-worker.js`, `3-run-workers.sh`.

## Gotchas

- **Podman DNS**: Containers running under Podman may not resolve external hostnames. Demo 6 adds `dns: [8.8.8.8, 1.1.1.1]` and installs `ca-certificates` for SSL. The Notion API domain is `api.notion.com` (not `.so`).
- **Elasticsearch startup**: Takes ~30 seconds. The docker-compose healthcheck handles this, but interactive scripts may need to wait.
- **pg_cron requires `shared_preload_libraries`**: Must be set in `postgresql.conf` before the server starts — that's why it's configured in the Dockerfile, not init.sql.
- **PL/Python environment variables**: Functions in demo 6 access API keys via `os.environ[]`. These are passed through docker-compose.yml from the `.env` file.
- **Demo 6 uses `claude-haiku-4-5-20251001`**: The API key only has access to this model. Change the model ID in `init.sql` if a different model becomes available.

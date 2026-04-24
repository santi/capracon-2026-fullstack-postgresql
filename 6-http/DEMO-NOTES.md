# Demo Notes

## 6 — FDW, PostgREST, PL/V8, HTTP

Start the containers:

```bash
cd ~/projects/capracon-2026/demos/6-http
docker compose up -d --build
```

### FDW: CSV as a table

```bash
psql "postgresql://postgres:postgres@localhost:5438/demo" -c "SELECT * FROM talks;"
psql "postgresql://postgres:postgres@localhost:5438/demo" -c "SELECT t.title, t.speaker, t.room FROM talks t WHERE t.time = '10:00'"
```

SQL to show: `sql/1-fdw.sql`

### PostgREST: REST API from SQL

```bash
# GET talks
curl http://localhost:8090/talks

# POST to Notion (creates a page)
curl -X POST http://localhost:8090/rpc/post_to_notion \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello from CapraCon!"}'
```

SQL to show: `sql/2-postgrest.sql`

### PL/Python: HTTP from PostgreSQL

SQL to show: `sql/3-notion.sql`

### Claude API: AI-generated talk descriptions

```bash
# Describe a talk — merges FDW data with Claude
psql "postgresql://postgres:postgres@localhost:5438/demo" -c \
  "SELECT title, speaker, claude_describe(id) AS teaser FROM talks WHERE id = 1;"

# Via PostgREST
curl -X POST http://localhost:8090/rpc/describe_talk \
  -H "Content-Type: application/json" \
  -d '{"talk_id": 1}'
```

SQL to show: `sql/4-claude.sql`

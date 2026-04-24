# Demo Notes

## 2 — Search: Elasticsearch vs PostgreSQL

Start the containers:

```bash
cd ~/projects/capracon-2026/demos/2-search
docker compose up -d
npm install
```

Elasticsearch takes ~30 seconds to start. Wait for it:

```bash
docker compose logs -f elasticsearch
```

### Part 1: Elasticsearch

Shows how search works from Node.js with Elasticsearch: index documents, then query with ranking and highlighting.

```bash
node 1-elasticsearch.js
```

Code to show: `sql/1-elasticsearch.js`

### Part 2: PostgreSQL full-text search

Same search, same results. No separate service — just a column, an index, and a query.

```bash
node 2-pg-search.js
```

SQL to show: `sql/2-pg-search.sql`

### Cleanup

```bash
docker compose down -v
```

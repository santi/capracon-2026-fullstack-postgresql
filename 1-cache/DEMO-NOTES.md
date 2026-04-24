# Demo Notes

## 1 — Cache: Redis vs PostgreSQL

Start the containers:

```bash
cd ~/projects/capracon-2026/demos/1-cache
docker compose up -d
npm install
```

### Part 1

Sjekker performance med å cache en response i Redis fra databasen vår, versus å bygge den selv for hver request.

```bash
node 1-why-cache.js
```

SQL to show: `sql/1-cache-logged.sql`

### Part 2: Logged vs unlogged table

Same SQL, different table type. Unlogged skips the WAL — faster writes, same reads.

```bash
node 2-logged-vs-unlogged.js
```

SQL to show: `sql/2-cache-unlogged.sql`

### Part 3: Redis vs unlogged table

Head-to-head. Both are ephemeral. One requires a separate service.

```bash
node 3-redis-vs-unlogged.js
```

SQL to show: `sql/3-redis-vs-unlogged.sql`

### Cleanup

```bash
docker compose down -v
```

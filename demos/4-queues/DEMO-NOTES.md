# Demo Notes

## 4 — Pull-based queues with SKIP LOCKED

Start the container:

```bash
cd ~/projects/capracon-2026/demos/4-queues
docker compose up -d
npm install
```

### Step 1: Enqueue jobs

```bash
node 1-enqueue.js 20
```

### Step 2: Run 3 workers in parallel

Each worker claims jobs independently — no duplicates, no conflicts.

```bash
./3-run-workers.sh
```

SQL to show: `sql/1-queues.sql`

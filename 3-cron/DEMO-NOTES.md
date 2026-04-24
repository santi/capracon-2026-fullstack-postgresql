# Demo Notes

## 3 — Scheduled tasks with pg_cron

Start the container:

```bash
cd ~/projects/capracon-2026/demos/3-cron
docker compose up -d --build
```

A cron job inserts a row every 30 seconds. Wait a minute or two, then check:

```bash
./demo.sh
```

SQL to show: `sql/1-pg-cron.sql`

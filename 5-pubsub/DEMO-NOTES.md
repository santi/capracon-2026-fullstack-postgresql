# Demo Notes

## 5 — Pub/sub with LISTEN/NOTIFY

Start the container:

```bash
cd ~/projects/capracon-2026/demos/5-pubsub
docker compose up -d --build
npm install
```

### Terminal 1: Listen

Heartbeats appear automatically every 5 seconds.

```bash
node 1-listen.js
```

### Terminal 2: Send messages

```bash
node 2-notify.js "Hello from CapraCon"
```

SQL to show: `sql/1-pubsub.sql`

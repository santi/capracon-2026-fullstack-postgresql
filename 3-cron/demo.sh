#!/bin/bash
# Watch the cron_log table — refreshes every 1 second
while true; do
  clear
  psql "postgresql://postgres:postgres@localhost:5435/crontest" -c \
    "SELECT id, message, created_at FROM cron_log ORDER BY id DESC LIMIT 10;"
  sleep 1
done

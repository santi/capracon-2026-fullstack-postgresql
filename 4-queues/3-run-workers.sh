#!/bin/bash
# Run 3 workers in parallel and wait for all to finish
node 1-enqueue.js
node 2-worker.js Alice &
node 2-worker.js Bob &
node 2-worker.js Charlie &
wait
echo "  All workers finished."
echo
psql "postgresql://postgres:postgres@localhost:5436/queuetest" -c \
  "SELECT count(*) as remaining FROM jobs;"

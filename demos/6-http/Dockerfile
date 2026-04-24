FROM sibedge/postgres-plv8:16.10-3.2.3-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-plpython3-16 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

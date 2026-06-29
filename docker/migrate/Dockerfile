# One-shot migrator: waits for Postgres + Auth, then applies app SQL.
# Migrations are COPIED into the image (no bind mounts → Windows-safe).
FROM postgres:15-alpine

RUN apk add --no-cache bash curl

COPY supabase/migrations/ /migrations/
COPY docker/migrate/run.sh /usr/local/bin/run-migrations.sh
RUN chmod +x /usr/local/bin/run-migrations.sh

ENTRYPOINT ["/usr/local/bin/run-migrations.sh"]

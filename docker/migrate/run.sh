#!/usr/bin/env bash
# Apply application migrations after Auth has created the `auth` schema.
# Idempotent: each migration is recorded in public._app_migrations and skipped
# on subsequent runs, so this container can run on every `docker compose up`.
set -euo pipefail

: "${PGHOST:=db}"
: "${PGPORT:=5432}"
: "${PGUSER:=supabase_admin}"
: "${PGDATABASE:=postgres}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${AUTH_HEALTH_URL:=http://auth:9999/health}"

export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

echo "[migrate] waiting for postgres at $PGHOST:$PGPORT ..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -q; do sleep 2; done

echo "[migrate] waiting for auth at $AUTH_HEALTH_URL ..."
for _ in $(seq 1 120); do
  if curl -fsS "$AUTH_HEALTH_URL" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "[migrate] waiting for auth.users table ..."
for _ in $(seq 1 60); do
  if psql -tAc "SELECT to_regclass('auth.users') IS NOT NULL" | grep -q t; then break; fi
  sleep 2
done

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public._app_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
for f in /migrations/*.sql; do
  name="$(basename "$f")"
  already="$(psql -tAc "SELECT 1 FROM public._app_migrations WHERE filename='$name'")"
  if [ "$already" = "1" ]; then
    echo "[migrate] skip $name (already applied)"
    continue
  fi
  echo "[migrate] applying $name"
  psql -v ON_ERROR_STOP=1 -f "$f"
  psql -v ON_ERROR_STOP=1 -c "INSERT INTO public._app_migrations(filename) VALUES ('$name')"
done

echo "[migrate] done."

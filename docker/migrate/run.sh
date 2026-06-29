#!/usr/bin/env bash
# One-shot local migrator. It deliberately runs AFTER Auth + Storage are healthy,
# because the application schema references auth.users and storage.objects.
set -euo pipefail

: "${PGHOST:=db}"
: "${PGPORT:=5432}"
: "${PGUSER:=supabase_admin}"
: "${PGDATABASE:=postgres}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${AUTH_HEALTH_URL:=http://auth:9999/health}"
: "${STORAGE_HEALTH_URL:=http://storage:5000/status}"

export PGHOST PGPORT PGUSER PGDATABASE PGPASSWORD

wait_for_sql() {
  local label="$1"
  local sql="$2"
  local tries="${3:-120}"
  echo "[migrate] waiting for ${label} ..."
  for _ in $(seq 1 "$tries"); do
    if psql -v ON_ERROR_STOP=1 -tAc "$sql" 2>/dev/null | grep -q t; then
      return 0
    fi
    sleep 2
  done
  echo "[migrate] timed out waiting for ${label}" >&2
  exit 1
}

wait_for_http() {
  local label="$1"
  local url="$2"
  local tries="${3:-120}"
  echo "[migrate] waiting for ${label} at ${url} ..."
  for _ in $(seq 1 "$tries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "[migrate] timed out waiting for ${label}" >&2
  exit 1
}

echo "[migrate] waiting for PostgreSQL TCP + login at ${PGHOST}:${PGPORT} ..."
for _ in $(seq 1 120); do
  if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -q && psql -v ON_ERROR_STOP=1 -tAc 'SELECT true' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

wait_for_http "Auth" "$AUTH_HEALTH_URL" 120
wait_for_sql "auth.users" "SELECT to_regclass('auth.users') IS NOT NULL" 120

wait_for_http "Storage" "$STORAGE_HEALTH_URL" 120
wait_for_sql "storage.objects" "SELECT to_regclass('storage.objects') IS NOT NULL" 120

psql -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public._app_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Local buckets that were previously created in Supabase Cloud/storage tools.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('car-images', 'car-images', false, 52428800, ARRAY['image/png','image/jpeg','image/webp','image/gif']),
  ('payment-proofs', 'payment-proofs', false, 52428800, ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
SQL

shopt -s nullglob
for f in /migrations/*.sql; do
  name="$(basename "$f")"
  already="$(psql -tAc "SELECT 1 FROM public._app_migrations WHERE filename='${name}'")"
  if [ "$already" = "1" ]; then
    echo "[migrate] skip ${name} (already applied)"
    continue
  fi
  echo "[migrate] applying ${name}"
  psql -v ON_ERROR_STOP=1 -f "$f"
  psql -v ON_ERROR_STOP=1 -c "INSERT INTO public._app_migrations(filename) VALUES ('${name}')"
done

echo "[migrate] done."

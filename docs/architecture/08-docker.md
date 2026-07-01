# 08 — Docker

10 services in `docker-compose.yml`, project name `bidlik`.

## Startup DAG

```
db (postgres)  ─┬──────────────────────────────┐
                │                              │
inbucket ──────►│                              │
                ▼                              │
              auth                             │
                │                              │
              rest (waits db)                  │
              realtime (waits db)              │
              storage (waits db, auth, rest)   │
                │                              │
                ▼                              │
             migrate (waits auth, storage,     │
                       realtime healthy)       │
                │                              │
                ▼                              │
              meta (waits migrate completed)   │
                │                              │
                ▼                              │
             studio                            │
                │                              │
              ─►│◄─────────────────────────────┘
                ▼
              kong (waits auth, rest, realtime, storage, meta, studio healthy)
                │
                ▼
              app (waits kong healthy + migrate completed)
```

## Services

### `db` — Postgres 15.6 with Supabase extensions
- Image: **custom** `bidlik/postgres:local` built from
  `docker/db/Dockerfile` (extends `supabase/postgres:15.6.1.139`).
- Ports: `5432`.
- Command flags: `shared_preload_libraries=pg_cron,pg_stat_statements,pgaudit`,
  `cron.database_name=$POSTGRES_DB`, `wal_level=logical`,
  `max_replication_slots=10`, `max_wal_senders=10`.
- Volume: `db-data:/var/lib/postgresql/data`.
- Healthcheck: `psql` as `supabase_auth_admin` returning `1`.
- Init: `docker/db/init/00-bootstrap.sql` runs once via `initdb.d` to
  create roles (`supabase_admin`, `supabase_auth_admin`,
  `supabase_storage_admin`, `authenticator`, `anon`, `authenticated`,
  `service_role`), schemas (`auth`, `storage`, `_realtime`, `extensions`),
  extensions, and the `supabase_realtime` publication.

### `inbucket` — Dev SMTP + web UI
- Image: `inbucket/inbucket:3.0.4`.
- Ports: `9000` (web), `2500` (SMTP).
- Purpose: catches all outgoing mail so registration/password-reset can be
  tested offline. GoTrue points at `inbucket:2500`.

### `auth` — GoTrue v2.158.1
- Env: `GOTRUE_DB_DATABASE_URL` uses `supabase_auth_admin` credential,
  `GOTRUE_SITE_URL=http://localhost:8080`, `GOTRUE_URI_ALLOW_LIST=*`,
  `GOTRUE_JWT_SECRET=$JWT_SECRET`, `GOTRUE_JWT_EXP=3600`,
  `GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated`,
  `GOTRUE_MAILER_AUTOCONFIRM=true` (offline convenience),
  SMTP → `inbucket`.
- Health: `/health`.

### `rest` — PostgREST v12.2.3
- Env: `PGRST_DB_URI` as `authenticator`, `PGRST_DB_SCHEMAS=public,storage`,
  `PGRST_DB_ANON_ROLE=anon`, `PGRST_JWT_SECRET=$JWT_SECRET`.

### `realtime` — supabase/realtime v2.30.34
- Env: `DB_HOST=db`, `DB_USER=supabase_admin`, `DB_AFTER_CONNECT_QUERY=SET search_path TO _realtime`, `DB_ENC_KEY`, `API_JWT_SECRET`, `SECRET_KEY_BASE`, `TENANT_ID=realtime-dev`, `RUN_JANITOR=true`, `SEED_SELF_HOST=true`.
- Health: `/api/tenants/realtime-dev/health`.

### `storage` — storage-api v1.11.13
- Env: `POSTGREST_URL=http://rest:3000`, `DATABASE_URL` as `supabase_storage_admin`, `FILE_STORAGE_BACKEND_PATH=/var/lib/storage`, `FILE_SIZE_LIMIT=52428800` (50 MB), `ENABLE_IMAGE_TRANSFORMATION=false`.
- Volume: `storage-data:/var/lib/storage`.
- Health: `/status`.

### `migrate` — One-shot SQL migrator
- Image: **custom** `bidlik/migrate:local` from `docker/migrate/Dockerfile`
  (`postgres:15-alpine` + bash/curl); bakes `supabase/migrations/*.sql`
  into `/migrations`. Restart policy `no`.
- `run.sh`: waits Postgres → Auth `/health` → `auth.users` regclass →
  Storage `/status` → `storage.objects` regclass → seeds storage buckets
  → applies every unapplied SQL file, tracked in `public._app_migrations`.

### `meta` — postgres-meta v0.84.2
- Env: DB connection using `supabase_admin`.
- Depends on `migrate` completed successfully.

### `studio` — Supabase Studio 20241014-c083b3b
- Port: `3000`.
- Env: `STUDIO_PG_META_URL=http://meta:8080`, `SUPABASE_URL`,
  `SUPABASE_PUBLIC_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.

### `kong` — Kong 2.8 (declarative, DB-less)
- Image: **custom** `bidlik/kong:local` from `docker/kong-image/Dockerfile`.
- Port: `8000`.
- Env: `KONG_DATABASE=off`, `KONG_DECLARATIVE_CONFIG=/var/lib/kong/kong.yml`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
- Entrypoint: `kong-entrypoint.sh` `envsubst`s the API keys into
  `kong.yml.template` at boot.

### `app` — Frontend (Bun 1.3 + Vite dev server)
- Image: built from root `Dockerfile` (`oven/bun:1.3-alpine`), target `dev`.
- Port: `8080`.
- Env: `VITE_SUPABASE_URL=$API_EXTERNAL_URL` (browser-visible URL),
  `VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY`, `VITE_SUPABASE_PROJECT_ID=local`,
  `SUPABASE_URL=http://kong:8000` (server-visible URL used by TSS routes),
  `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Volumes

| Volume | Mounted in | Contents |
|--------|-----------|----------|
| `db-data` | `db` | Postgres data directory. |
| `storage-data` | `storage` | Uploaded files. |

## Ports (external)

| Container | Host port | Purpose |
|-----------|-----------|---------|
| `db` | 5432 | psql / Studio |
| `inbucket` | 9000 (web), 2500 (SMTP) | Mail preview |
| `studio` | 3000 | Admin UI |
| `kong` | 8000 | API gateway (auth/rest/realtime/storage) |
| `app` | 8080 | React app |

## Why each service exists

- `db` — the truth store; everything else is stateless.
- `inbucket` — makes password-reset/signup flows demoable offline.
- `auth` — issues JWTs; without it nobody can sign in.
- `rest` — turns Postgres tables + RPCs into HTTP.
- `realtime` — pushes DB changes to browsers for live bidding.
- `storage` — serves signed URLs for private buckets (car images, payment
  proofs).
- `migrate` — applies app SQL after Auth is up (schema depends on
  `auth.users`).
- `meta` — Studio needs a Postgres inspector API.
- `studio` — developer/admin GUI over the DB.
- `kong` — one origin `:8000` for all Supabase sub-services, injects the
  anon key by default and forwards user JWTs.
- `app` — serves the React UI + SSR + `/api/public/*`.

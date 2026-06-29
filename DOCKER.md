# Run Bidlik fully local with Docker

One command brings up the app **and** a complete self-hosted Supabase stack
(Postgres + Auth + Data API + Storage + Realtime + Studio) — no cloud account
needed.

## Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- ~4 GB free RAM

## Start

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d
```

First boot takes ~2 min (pulls images, runs migrations, installs deps).

| Service              | URL                              |
|----------------------|----------------------------------|
| App (TanStack Start) | http://localhost:8080            |
| Supabase Studio (DB) | http://localhost:3000            |
| Supabase API gateway | http://localhost:8000            |
| Captured emails      | http://localhost:9000 (Inbucket) |
| Postgres             | `localhost:5432` user `postgres` / pwd `postgres` |

## How it works
- `db` — `supabase/postgres` image with `pg_cron`, `pgcrypto`, `uuid-ossp` preloaded.
- `docker/db/init/00-roles.sql` creates the `anon`, `authenticated`, `service_role`, `authenticator`, and admin roles **before** the app's SQL runs.
- Everything in `supabase/migrations/` is auto-applied on first boot (Postgres `docker-entrypoint-initdb.d` runs them alphabetically once, on an empty data volume).
- `auth`, `rest`, `realtime`, `storage`, `meta`, `studio` are the standard Supabase self-host images, wired together by `kong` on port 8000.
- `inbucket` catches all outbound email locally so sign-up flows work offline.
- `app` runs `bun run dev` so HMR works; source is bind-mounted.

## Reset everything
```bash
docker compose --env-file .env.docker down -v
```
The `-v` drops the `db-data` and `storage-data` volumes; next `up` re-runs migrations on a clean DB.

## Common tasks

**Re-run migrations after editing SQL:** they only auto-run on an empty DB. Either `down -v && up -d`, or apply manually:
```bash
docker compose exec -T db psql -U postgres < supabase/migrations/<file>.sql
```

**Open a psql shell:**
```bash
docker compose exec db psql -U postgres
```

**Tail app logs:**
```bash
docker compose logs -f app
```

## Notes
- The bundled `ANON_KEY` / `SERVICE_ROLE_KEY` / `JWT_SECRET` are the well-known **Supabase demo keys**. Safe locally, never deploy them.
- The app reads `VITE_SUPABASE_URL=http://localhost:8000` so the browser talks to Kong directly.
- For a production image, add a second `FROM` stage in `Dockerfile` that runs `bun run build` against a Node target instead of the default Cloudflare one.

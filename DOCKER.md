# Run Bidlik fully offline with Docker

One command boots the app **and** a complete self-hosted Supabase stack
(Postgres + Auth + Data API + Storage + Realtime + Studio + Kong). No
hosted Supabase project, no cloud credentials, no internet required after
the initial image pulls.

## Prerequisites

You only need **Docker Desktop** (Windows / macOS) or **Docker Engine +
Compose v2** (Linux). ~4 GB free RAM. No Node, Bun or Supabase CLI on the
host.

## Start

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d
```

First boot takes ~3 min (image pulls, builds the Postgres + migrator
images, runs migrations, installs app deps). Subsequent `up -d` is seconds.

| Service            | URL                                              |
|--------------------|--------------------------------------------------|
| App                | http://localhost:8080                            |
| Supabase Studio    | http://localhost:3000                            |
| API gateway (Kong) | http://localhost:8000                            |
| Captured emails    | http://localhost:9000 (Inbucket SMTP on :2500)   |
| Postgres           | `localhost:5432` user `supabase_admin` / `postgres` |

Sign-up and sign-in work against the local Auth service. Confirmation
emails are captured by Inbucket — open http://localhost:9000 to read them
(autoconfirm is on by default, so no click is required).

## How it works

The boot sequence is enforced via Compose healthchecks:

1. **`db`** — built from `docker/db/Dockerfile` (extends `supabase/postgres`).
   `docker/db/init/00-roles.sql` is baked into the image and runs the first
   time the data volume is empty. It creates the `anon` / `authenticated` /
   `service_role` / `supabase_admin` / `supabase_auth_admin` /
   `supabase_storage_admin` roles, the `auth` / `storage` / `extensions` /
   `realtime` schemas, and the `pgcrypto` / `uuid-ossp` / `pg_cron`
   extensions. Healthcheck uses `pg_isready` without `-U` so it does not
   depend on a `postgres` login role existing.
2. **`auth`** (GoTrue) — connects as `supabase_auth_admin`, runs its own
   migrations, and creates `auth.users` and friends. Exposes
   `/health` on :9999.
3. **`migrate`** — one-shot container built from
   `docker/migrate/Dockerfile`. Application SQL is **copied** into the
   image (no bind mounts → works on Docker Desktop for Windows). It waits
   for Postgres and Auth to be healthy, waits for `auth.users` to exist,
   then applies every file from `supabase/migrations/` in lexical order.
   Each applied file is recorded in `public._app_migrations`, so reruns
   are idempotent.
4. **`rest` / `realtime` / `storage`** — depend on
   `migrate: service_completed_successfully`, so they only start once the
   schema is in place.
5. **`kong`** — fronts all Supabase services on port 8000. The app talks
   only to Kong; the browser hits `http://localhost:8000`.
6. **`app`** — runs `bun run dev`. Source is bind-mounted for HMR.

Migrations are baked into images instead of bind-mounted because Docker
Desktop on Windows does not support nested bind mounts inside
`/docker-entrypoint-initdb.d`.

## App configuration

The app receives these env vars from `docker-compose.yml` and does **not**
read the project's `.env` file when running under Docker:

| Var                            | Value                       |
|--------------------------------|-----------------------------|
| `VITE_SUPABASE_URL`            | `http://localhost:8000`     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| local `ANON_KEY`            |
| `SUPABASE_URL` (SSR)           | `http://kong:8000`          |
| `SUPABASE_PUBLISHABLE_KEY`     | local `ANON_KEY`            |
| `SUPABASE_SERVICE_ROLE_KEY`    | local `SERVICE_ROLE_KEY`    |

No hosted Supabase URL or key is used at runtime.

## Reset everything

```bash
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up -d --build
```

`-v` drops the Postgres and Storage volumes; the next `up` rebuilds and
re-applies everything from scratch.

## Common tasks

**Apply a newly added SQL file:** just bring the stack up. The migrator
re-runs on each `up` and skips files already recorded in
`public._app_migrations`. If you changed the migrator image:

```bash
docker compose --env-file .env.docker build migrate
docker compose --env-file .env.docker up -d migrate
```

**Open a psql shell:**

```bash
docker compose exec db psql -U supabase_admin -d postgres
```

**Tail app logs:**

```bash
docker compose logs -f app
```

## Notes

- The bundled `ANON_KEY` / `SERVICE_ROLE_KEY` / `JWT_SECRET` are the
  well-known Supabase demo values. Safe locally, never deploy them.
- For a production image, add a second `FROM` stage to `Dockerfile` that
  runs `bun run build` against a Node target instead of the Cloudflare
  worker target used in the cloud deployment.

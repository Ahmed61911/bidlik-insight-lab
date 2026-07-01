# 15 — Final Report

## 1. Current architecture (as-is)

```
                Browser (React 19 + TanStack Router/Query)
                       │            │
              supabase-js         WebSocket
                       │            │
                       ▼            ▼
                  Kong :8000  ─►  Realtime :4000
                   │  │  │
     ┌─────────────┘  │  └────────────┐
     ▼                ▼               ▼
  Auth :9999   PostgREST :3000   Storage :5000
     │                │               │
     └────────┬───────┴───────┬───────┘
              ▼               ▼
                Postgres 15 (RLS + RPCs + pg_cron)
                ▲
                │
  ┌─────────────┴─────────────┐
  │ App container (Bun/Vite)   │
  │  SSR + 5 x /api/public/*   │
  │  service-role for CMI +    │
  │  admin user create/delete  │
  └────────────────────────────┘
```

## 2. Target .NET 8 architecture (to-be)

```
        Browser (unchanged React 19 + TanStack Router/Query)
              │                   │
        fetch /api/*         SignalR /realtime
              │                   │
              ▼                   ▼
      ─────────────── ASP.NET Core 8 (Kestrel) ───────────────
      │ Controllers/ (Auctions, Bids, Offers, Cars, Payments,│
      │              Users, Experts, Notifications, Admin)   │
      │ MinimalApis  (/api/public/{seed-demo,cmi-*,webhooks})│
      │ SignalR Hub  (/realtime)                             │
      │ Middleware   (JwtBearer, Authorization policies,     │
      │               ExceptionHandler → ProblemDetails)     │
      │ Services/    (business logic)                        │
      │ Repositories/Dapper/  (RPC-shaped ops)               │
      │ Data/BidlicDbContext.cs (EF Core 8 + Npgsql)         │
      │ Hangfire     (AuctionTickerJob every 30 s)           │
      ────────────────────────────────────────────────────────
              │                                        │
              ▼                                        ▼
        PostgreSQL 15 (same schema)              MinIO / S3
```

## 3. Phased migration plan

| Phase | Weeks | Deliverable | Risk |
|-------|-------|-------------|------|
| **0. Baseline** | 1 | Freeze feature work; add Playwright + Vitest smoke tests against the current stack to lock the JSON contract. | Low |
| **1. Skeleton API** | 1–2 | `Bidlic.Api` project, `Program.cs`, JWT bearer wired to reuse existing `JWT_SECRET`, `/api/health`, first read-only controller (`GET /api/auctions`) hits the existing DB in parallel with PostgREST. | Low |
| **2. Read-only parity** | 2 | Move all GET endpoints (auctions, cars, events, bids-list, notifications, admin lists). Frontend still writes to PostgREST. | Medium |
| **3. Bid & offer engine** | 2–3 | `place_bid`, `submit_offer`, `tick_auctions` in Dapper; SignalR broadcast; disable PostgREST writes for those tables via extra RLS block or `REVOKE`. | **High** — the money loop. |
| **4. Payments + CMI** | 2 | `buyer_submit_payment`, admin payment CRUD, CMI init/callback. | High. |
| **5. Users, roles, admin** | 2 | Identity users; user migrator; admin user CRUD; expert workflow. | Medium. |
| **6. Realtime cutover** | 1 | Frontend swaps `src/lib/realtime.ts` to SignalR. Retire `realtime` container. | Medium. |
| **7. Storage cutover** | 1 | Replace signed-URL provider with MinIO/S3 pre-signed URLs. Retire `storage` container. | Medium. |
| **8. Retire Supabase stack** | 1 | Remove `auth`, `rest`, `realtime`, `storage`, `meta`, `studio`, `kong`, `migrate` from compose. Keep `db`. | Low if 1–7 are done. |
| **9. Cleanup** | 1 | Delete `supabase/`, `src/integrations/supabase/*`, `src/routes/api/public/*`, dead mock code. | Low. |

Total: **12–15 weeks** for a small team.

## 4. Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bid race conditions after moving out of a single PL/pgSQL transaction | Medium | Severe (money) | Use Dapper `FOR UPDATE`, load-test with k6, keep a rollback flag to route `place_bid` back to PostgREST. |
| Password hash format mismatch (bcrypt→PBKDF2) | High | Medium | Custom `IPasswordHasher` recognising `bcrypt$` for a grace period. |
| RLS gone → policy bug leaks data | Medium | Severe (PII) | Keep RLS on for the first 90 days post-cutover; add integration tests per policy. |
| SignalR fan-out cost at scale | Low | Medium | Use Redis backplane if >1 API instance. |
| CMI hash algorithm differences | Low | High | Port `computeCmiHash` verbatim; keep a shared test vector between TS and C# implementations. |
| Timezone drift (`timestamptz` → `DateTimeOffset`) | Medium | Medium | Configure `Npgsql.EnableLegacyTimestampBehavior = false`; store UTC only. |
| Frontend contract drift during phased rollout | Medium | Medium | Contract-tests suite from Phase 0; run against both stacks in CI. |

## 5. Difficulty per module

| Module | Difficulty | Notes |
|--------|-----------|-------|
| Auth (GoTrue → Identity) | 4 / 5 | User migration + password hash bridge. |
| Bid / offer engine | 5 / 5 | Concurrency + realtime + anti-snipe rule. |
| Auction lifecycle (`tick_auctions`) | 3 / 5 | Simple with Hangfire. |
| Payments (`buyer_submit_payment`, admin) | 3 / 5 | Straight EF Core. |
| CMI integration | 2 / 5 | Direct port of hashing logic. |
| Expert workflow | 2 / 5 | Straight EF Core. |
| Admin CRUD | 2 / 5 | Boilerplate. |
| Notifications | 2 / 5 | EF Core + SignalR. |
| Realtime | 3 / 5 | Contract mapping. |
| Storage | 2 / 5 | S3 pre-signed URLs. |
| Frontend | 1 / 5 | Only base URL + realtime transport change. |

## 6. Do NOT migrate

- Frontend UI (`src/routes/**`, `src/components/**`, `src/hooks/**`,
  `src/assets/**`, `src/styles.css`, `public/**`).
- Type declarations (regenerate from OpenAPI).
- Tailwind / shadcn / Radix setup.
- Vite / TSConfig / ESLint / Prettier configs.

## 7. Copy almost unchanged

- Domain models (`src/types/*.ts`) — regenerate as C# records with the
  same field spellings.
- `src/lib/cmi.ts` hashing algorithm → port line-by-line to C# using
  `HMACSHA512` and the same canonical field ordering.
- Postgres schema, enums, and indexes.

## 8. Require complete rewrite

- All PL/pgSQL RPCs → C# service methods.
- All RLS policies → C# authorization policies (or preserved).
- Supabase Realtime → SignalR.
- `docker/kong-image/*`, `docker/migrate/*`, `docker/db/init/*`.

## 9. Small-change files

- `src/integrations/supabase/client.ts` → new `src/lib/api/client.ts`
  with `fetch("/api/...")` and JWT header.
- `src/lib/auth.ts` — same store, calls `/api/auth/login` instead of
  `supabase.auth.signInWithPassword`.
- `src/lib/realtime.ts` — switch to `@microsoft/signalr`.

## 10. Overall strategy

1. **Ship contracts first.** Freeze DTOs in a shared package (OpenAPI
   spec + TS client generation). Any drift becomes a build error.
2. **Strangler pattern.** Add YARP (or an nginx snippet) that routes
   selected paths to the .NET API and the rest to Kong. Migrate a small
   endpoint (`GET /api/auctions`) first end-to-end to prove the pipe,
   then expand.
3. **Preserve the schema** for at least the first two phases so you can
   revert instantly if a service misbehaves.
4. **Dual-write during risky windows** (bids especially): the new .NET
   `place_bid` can also `INSERT` a "shadow bid" into a `bids_shadow`
   table for reconciliation, then be removed after burn-in.
5. **Delete aggressively at the end.** Once the Supabase stack is
   retired, purge `src/integrations/supabase/*`, `supabase/`,
   `docker/kong-image/*`, `docker/migrate/*` in one PR to avoid
   half-migrated confusion.
6. **Add tests up front.** Contract tests + a Playwright happy-path suite
   catch 90 % of regressions. The current repo has no tests — that is
   the biggest single risk to migration success.

## Closing table — final component fate

| Component | Fate | New location |
|-----------|------|--------------|
| React app | Kept | Unchanged |
| TanStack Router/Query | Kept | Unchanged |
| Tailwind + shadcn/ui | Kept | Unchanged |
| Supabase GoTrue | Replaced | ASP.NET Core Identity |
| PostgREST | Replaced | Controllers / MinimalApis |
| PL/pgSQL RPCs | Replaced | Services + Dapper |
| Supabase Realtime | Replaced | SignalR |
| Supabase Storage | Replaced | MinIO / S3 |
| Kong | Optional | YARP or none |
| pg_cron | Replaced | Hangfire |
| PostgreSQL | Kept | Same instance |
| Inbucket | Replaced (dev only) | Mailpit |
| Studio | Replaced | pgAdmin / custom admin UI |
| `.env` (Supabase keys) | Removed | `appsettings.json` + env vars |
| `/api/public/*` TSS routes | Replaced | ASP.NET endpoints |
| `docker/kong-image/*`, `docker/migrate/*` | Removed | – |

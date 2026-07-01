# 13 — .NET 8 Migration Blueprint

Scope: replace **the backend** (Auth, Data API, business logic, background
jobs, `/api/public/*` routes, CMI integration) with **ASP.NET Core 8**.
The React frontend, TanStack Router/Query, Tailwind, and shadcn/ui stay
untouched — only the base URL of `src/integrations/supabase/client.ts`
changes to point at the new API.

## Target architecture

```
Browser (unchanged React 19)
   │  fetch  https://api.bidlic.ma
   ▼
ASP.NET Core 8 (Kestrel)
   ├─ Controllers/*.cs   (feature areas: Auctions, Bids, Offers, Cars,
   │                     Payments, Users, Experts, Notifications)
   ├─ MinimalApis for /api/public/*  (webhooks, seed-demo)
   ├─ SignalR hub /realtime          (replaces Supabase Realtime)
   ├─ Middleware:
   │    UseAuthentication (JwtBearer, HS256, JWT_SECRET compatible)
   │    UseAuthorization  (policies: Admin, Expert, Vendeur, Acheteur)
   │    ExceptionHandlingMiddleware (renders JSON ProblemDetails)
   ├─ Services/*         (business logic)
   ├─ Repositories/*     (Dapper for RPC-shaped ops, EF Core for CRUD)
   └─ Data/BidlicDbContext.cs
        │
        ▼
   PostgreSQL 15 (unchanged schema; RLS optional)
   Hangfire (or hosted BackgroundService) → tick_auctions equivalent
   MinIO / S3 for file storage (car-images, payment-proofs)
   MailKit (SMTP) for outgoing mail
```

## Concept mapping

| Current | ASP.NET Core 8 |
|---------|---------------|
| Supabase GoTrue | ASP.NET Core Identity + `Microsoft.AspNetCore.Authentication.JwtBearer` (HS256 with the same `JWT_SECRET` if you want to keep issued tokens valid during cutover) |
| PostgREST auto-CRUD | Controllers + EF Core `DbContext` |
| PL/pgSQL RPCs (`place_bid`, `submit_offer`, `validate_auction`, `buyer_submit_payment`, `admin_*`) | Application services in `Services/` — Dapper transactions preserve `SELECT … FOR UPDATE` semantics |
| RLS policies | ASP.NET authorization filters + LINQ `.Where(x => x.OwnerId == userId)` **or** keep RLS in Postgres and connect via Dapper setting `SET LOCAL request.jwt.claims` |
| `handle_new_user` trigger | `UserService.CreateAsync` inside a DB transaction |
| `tick_auctions` + pg_cron | Hangfire recurring job **or** `IHostedService` with `PeriodicTimer(30s)` |
| Supabase Realtime | SignalR hub broadcasting after every mutation |
| Supabase Storage | MinIO (S3-compatible) via `AWSSDK.S3`; expose presigned URLs |
| `/api/public/cmi-*` TSS routes | ASP.NET Minimal API endpoints under `/api/public/*` |
| Kong gateway | Optional — YARP reverse proxy if fronting multiple services |
| Postgres.role permissions (`anon`, `authenticated`, `service_role`) | Authorization policies + a single "app" DB user; drop RLS unless you want defense-in-depth |

## Per-file TS → C# mapping

### Server / infrastructure

| Current | Target | Notes |
|---------|--------|-------|
| `src/start.ts` | `Program.cs` | Middleware pipeline, DI. |
| `src/server.ts` | `Program.cs` `app.UseExceptionHandler` + custom `ProblemDetailsWriter` | Same purpose (SSR error safety not needed — React runs client-side against the API). |
| `src/router.tsx`, `src/routeTree.gen.ts` | – | Frontend concern. Unchanged. |
| `src/integrations/supabase/client.ts` | `src/lib/api/client.ts` (rewrite to hit `/api`) | Only the transport changes. |
| `src/integrations/supabase/client.server.ts` | Deleted | Replaced by admin controllers on the .NET side. |
| `src/integrations/supabase/auth-middleware.ts` | Built-in JwtBearer middleware | – |
| `src/integrations/supabase/auth-attacher.ts` | `apiClient` (axios/fetch) interceptor that adds `Authorization: Bearer` from local session | Still frontend code. |
| `src/integrations/supabase/types.ts` | Auto-generated `Bidlic.Contracts/*.cs` DTOs (Nswag / OpenAPI + `swagger-typescript-api`) | Contract preserved end-to-end. |

### Server routes → Controllers / MinimalApis

| Current (`src/routes/api/public/*.ts`) | Target |
|---|---|
| `seed-demo.ts` | `Controllers/DevSeedController.cs` — `[HttpPost("/api/public/seed-demo")]`, `[Authorize(Policy="DevOnly")]` (or `[AllowAnonymous]` behind an env flag). Uses `UserManager<AppUser>`. |
| `admin-create-user.ts` | `Controllers/Admin/UsersController.cs.Create` — `[Authorize(Policy="Admin")]`. |
| `admin-delete-user.ts` | `Controllers/Admin/UsersController.cs.Delete`. |
| `cmi-init.ts` | `MinimalApi CmiEndpoints.MapInit` → `Services/CmiService.InitAsync`. |
| `cmi-callback.ts` | `MinimalApi CmiEndpoints.MapCallback` → `Services/CmiService.HandleCallbackAsync` (verifies HMAC with `System.Security.Cryptography.HMACSHA512`). |

### Business-logic service layer (new)

| RPC (PL/pgSQL) | Service method | ORM choice |
|----------------|----------------|-----------|
| `place_bid(auction, amount, is_auto)` | `AuctionService.PlaceBidAsync` | **Dapper** in a transaction (`SELECT ... FOR UPDATE`) — EF Core lacks first-class pessimistic locking on Npgsql. |
| `submit_offer(auction, amount)` | `AuctionService.SubmitOfferAsync` | Dapper (UPSERT + FOR UPDATE). |
| `validate_auction(auction, decision)` | `AdminAuctionService.ValidateAsync` | EF Core is fine — single-row update + fan-out inserts. |
| `buyer_submit_payment(...)` | `PaymentService.SubmitAsync` | EF Core. |
| `admin_upsert_payment`, `admin_set_payment_status`, `admin_delete_payment`, `admin_list_payments` | `PaymentsAdminService.*` | EF Core. |
| `admin_list_profiles / admin_get_profile / admin_set_user_active / admin_list_pending_users` | `UsersAdminService.*` | EF Core. |
| `assign_expert`, `submit_expert_report` | `ExpertService.*` | EF Core. |
| `list_auction_bids` | `BidsService.ListForAuctionAsync` | Dapper (custom projection with redaction). |
| `tick_auctions` | `AuctionTickerJob` (Hangfire recurring) | Dapper. |
| `has_role(user, role)` | `IUserContext.HasRole(role)` from JWT claims + `RoleManager` fallback. | – |
| `get_my_profile()` | `GET /api/me/profile` → `UserService.GetMineAsync`. | EF Core. |
| Triggers (`handle_new_user`, `notify_on_bid`, `notify_on_auction_status`, `stamp_auction_closure`, `ensure_expert_assignment`) | Move into the service methods that cause them, wrapped in a transaction with the primary write. | – |

### Frontend service layer (still TS)

Every file under `src/lib/supabase*.ts` becomes a thin `axios`/`fetch`
wrapper against the new REST controllers. **Method names and DTOs must
match exactly** so the routes/components need no changes.

| Current | Target |
|---------|--------|
| `src/lib/api.ts` | Unchanged interface. |
| `src/lib/supabaseApi.ts` | Rewritten to `fetch("/api/auctions/...")`. |
| `src/lib/supabaseAdminApi.ts` | Same, hitting `/api/admin/*`. |
| `src/lib/supabaseAcheteurStore.ts` | `/api/me/*`. |
| `src/lib/supabaseVendeurApi.ts` | `/api/vendeur/*`. |
| `src/lib/supabaseExpertApi.ts` | `/api/expert/*`. |
| `src/lib/supabaseAdminPaiements.ts` | `/api/admin/payments/*`. |
| `src/lib/realtime.ts` | SignalR client (`@microsoft/signalr`). |
| `src/lib/auth.ts` | Rewritten around `/api/auth/login` + JWT + `localStorage`. |
| `src/lib/cmi.ts` | Frontend can drop it — signing moves to `Services/CmiService.cs`. |

### Contracts that MUST remain byte-compatible

- JSON shapes returned by every `supabaseApi.*` method (auctions, bids,
  offers, cars, events, notifications, payments).
- Enum spellings (`scheduled`, `live`, `closed`, `validated`, `cancelled`;
  `acheteur`, `vendeur`, `expert`, `admin`; `ouverte`, `fermee`; etc.).
- Field names (`current_price`, `top_bidder_id`, `bid_count`,
  `payment_deadline`, `admin_validation_deadline`, `caution_validee`, …).
- JWT claim names (`sub`, `role`, `email`).

## Files that become obsolete

- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/routes/api/public/*.ts` (moved to .NET)
- `supabase/config.toml`
- All `supabase/migrations/*.sql` — replaced by EF Core migrations under
  `Data/Migrations/` (or reused verbatim if you keep the same schema —
  see 14).
- `docker/kong-image/*`, `docker/kong-entrypoint.sh`, `docker/kong.yml`
- `docker/migrate/*`
- `docker-compose.yml` services: `auth`, `rest`, `realtime`, `storage`,
  `meta`, `studio`, `kong`, `migrate`.

## Files with zero changes

- Everything under `src/components/**` (except: none — SignalR client
  swap is inside `src/lib/realtime.ts` only).
- Every `src/routes/**/*.tsx` UI file.
- `src/styles.css`, `src/assets/**`, `public/**`.
- `src/hooks/**`.
- `src/types/**` (may be regenerated from the .NET OpenAPI schema).
- `vite.config.ts`, `tsconfig.json` — unchanged.

## Environment variable diff

| Removed | Added |
|---------|-------|
| `ANON_KEY`, `SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_*`, `SUPABASE_PROJECT_ID`, all Kong ports/keys | `ConnectionStrings__Default` (Npgsql), `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpirationMinutes`, `Cors__AllowedOrigins`, `Storage__Endpoint`, `Storage__AccessKey`, `Storage__SecretKey`, `Storage__Buckets__CarImages`, `Storage__Buckets__PaymentProofs`, `Smtp__Host`, `Smtp__Port`, `Cmi__ClientId`, `Cmi__StoreKey`, `Cmi__GatewayUrl`, `AppOrigin` |
| Keep | `JWT_SECRET` becomes `Jwt__Secret`. `POSTGRES_*` collapse into `ConnectionStrings__Default`. |

Frontend keeps a single new var: `VITE_API_BASE_URL=https://api.bidlic.ma`.

## Docker diff

Before: 10 services. After: 4 core + optional dev tools.

```
services:
  db:              postgres:15 (or unchanged supabase/postgres image)
  api:             build ./backend (dotnet-sdk build → aspnet:8.0)
  minio:           minio/minio  (S3-compatible object storage)
  app:             existing bidlik app image (only VITE_API_BASE_URL changes)
  # optional:
  mailpit:         axllent/mailpit  (replaces inbucket)
  hangfire-ui:     bundled into api
```

## Authentication migration

Two options:

1. **Full Identity rebuild** (recommended long-term)
   - `Microsoft.AspNetCore.Identity.EntityFrameworkCore`.
   - Users migrate: run a one-off .NET Migrator that reads `auth.users`
     (still Postgres) and writes into `AspNetUsers` with the password
     hash converted (bcrypt → PBKDF2 requires a forced password reset;
     alternative: implement a custom `IPasswordHasher<AppUser>` that
     recognises `bcrypt$` prefixes for a grace period).
2. **Coexistence** (cheaper cutover)
   - Keep GoTrue for a few weeks; the .NET API validates GoTrue-issued
     JWTs (same HS256 secret). Migrate endpoint-by-endpoint. Retire
     GoTrue when Identity is complete.

Roles: seed `AppRole` enum with `acheteur|vendeur|expert|admin`,
policies:

```csharp
options.AddPolicy("Admin",    p => p.RequireRole("admin"));
options.AddPolicy("Expert",   p => p.RequireRole("expert","admin"));
options.AddPolicy("Vendeur",  p => p.RequireRole("vendeur","admin"));
options.AddPolicy("Acheteur", p => p.RequireRole("acheteur","admin"));
```

## Middleware migration

| Current | Target |
|---------|--------|
| `errorMiddleware` (`src/start.ts`) | `app.UseExceptionHandler("/error")` + `ProblemDetails` |
| `attachSupabaseAuth` (client-side) | Frontend `fetch` interceptor adding `Authorization` |
| GoTrue's own token refresh | `AuthController.Refresh` returning a rotated JWT |
| RLS as authorization | `[Authorize(Policy="…")]` + LINQ ownership filters |

## Database access layer

- **EF Core 8 + Npgsql** for CRUD and admin lists.
- **Dapper** in a shared `IDbTransaction` scope for:
  - `place_bid` (needs `FOR UPDATE`)
  - `submit_offer` (needs UPSERT + `FOR UPDATE`)
  - `tick_auctions` (bulk set-based updates)
  - `list_auction_bids` (redacted projection)
- Wrap both around the same `NpgsqlConnection` so a transaction can
  cover both.

## Configuration files

- `appsettings.json` + `appsettings.Development.json` replace `.env`
  (twelve-factor: read env in `Program.cs` via
  `builder.Configuration.AddEnvironmentVariables()`).
- Frontend: change `.env` to just `VITE_API_BASE_URL`.

## Deployment / CI

| Current (implicit) | Target |
|---|---|
| Docker Compose local, Lovable Cloud prod | `docker-compose.yml` local; production could be Kubernetes / Azure App Service / AWS ECS. |
| No CI in repo | Add `.github/workflows/backend.yml` (dotnet build/test/publish + docker push) and `.github/workflows/frontend.yml` (bun install/build). |
| No migrator | `dotnet ef database update` in a job on deploy. |

## Package managers change

- Backend: `bun` → `dotnet` + `NuGet`.
- Frontend: `bun` stays.

## Libraries removed

- All `@supabase/*`, `@radix-ui/react-toggle-group` — kept (frontend).
- Only `@supabase/supabase-js` is dropped on the server side; the client
  still uses it during a coexistence window if you keep GoTrue temporarily.

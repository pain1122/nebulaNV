# NebulaNV Local Setup

Last updated: 2026-02-21

## 1) Prerequisites

- Node.js `>=22`
- pnpm `10.17.1`
  - `corepack enable`
  - `corepack prepare pnpm@10.17.1 --activate`
- Docker Desktop (WSL2 backend on Windows)

## 2) Environment Files

Create env files from examples:

```powershell
Copy-Item .env.example .env
Copy-Item apps/auth-service/.env.example apps/auth-service/.env
Copy-Item apps/user-service/.env.example apps/user-service/.env
Copy-Item apps/product-service/.env.example apps/product-service/.env
Copy-Item apps/settings-service/.env.example apps/settings-service/.env
Copy-Item apps/blog-service/.env.example apps/blog-service/.env
Copy-Item apps/order-service/.env.example apps/order-service/.env
Copy-Item apps/taxonomy-service/.env.example apps/taxonomy-service/.env
Copy-Item apps/media-service/.env.example apps/media-service/.env
```

Root `.env` should define at least:

```ini
NODE_ENV=development
PUBLIC_MODE=OPEN

S2S_SECRET=changeme
S2S_SECRET_OLD=changeme
S2S_ALLOWED_SERVICES=auth-service,user-service,settings-service,blog-service,product-service,media-service,taxonomy-service,order-service
GATEWAY_HEADER=x-gateway-sign

USER_GRPC_URL=127.0.0.1:50051
AUTH_GRPC_URL=127.0.0.1:50052
PRODUCT_GRPC_URL=127.0.0.1:50053
SETTINGS_GRPC_URL=127.0.0.1:50054
BLOG_GRPC_URL=127.0.0.1:50055
ORDER_GRPC_URL=127.0.0.1:50056
TAXONOMY_GRPC_URL=127.0.0.1:50057
MEDIA_GRPC_URL=127.0.0.1:50058

USER_HTTP_PORT=3100
AUTH_HTTP_PORT=3001
PRODUCT_HTTP_PORT=3003
SETTINGS_HTTP_PORT=3010
BLOG_HTTP_PORT=3004
ORDER_HTTP_PORT=3005
TAXONOMY_HTTP_PORT=3006
MEDIA_HTTP_PORT=3007

JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
```

Auth service also needs redis env values in `apps/auth-service/.env`:

```ini
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 3) Install Dependencies

```bash
pnpm install
```

## 4) Start Infra Dependencies

Postgres (from repo compose):

```bash
docker compose up -d postgres
```

Redis (until compose is expanded with a redis service):

```bash
docker run -d --name nebula-redis -p 6379:6379 redis:7-alpine
```

## 5) Run Prisma Migrations

Run for each Prisma-backed service:

```bash
pnpm --filter ./apps/user-service prisma:migrate:dev
pnpm --filter ./apps/product-service prisma:migrate:dev
pnpm --filter ./apps/settings-service prisma:migrate:dev
pnpm --filter ./apps/blog-service prisma:migrate:dev
pnpm --filter ./apps/order-service prisma:migrate:dev
pnpm --filter ./apps/taxonomy-service prisma:migrate:dev
pnpm --filter ./apps/media-service prisma:migrate:dev
```

## 6) Run Services

Current compose stack is partial:

```bash
docker compose up -d --build
```

This currently starts:
- `postgres`
- `user-service`
- `auth-service`
- `product-service`
- `settings-service`

For full backend locally:

```bash
pnpm run dev:backend
```

Run web:

```bash
pnpm run dev:web
```

## 7) Verification

Baseline:

```bash
pnpm -w proto:gen
pnpm -w build
```

Targeted:

```bash
pnpm --filter web build
pnpm --filter @nebula/auth-service build
```

## 8) Known Limitations

- `docker-compose.yml` is still a partial backend stack.
- `media-service` does not expose an HTTP `/health` route yet.
- Auth integration/e2e tests currently need setup/readiness overhaul.


## Auth Ownership Boundary (P1-1)

- `auth-service` is the single source of truth for identity, roles, token issue/refresh/revocation.
- `media-service` is the policy decision point for media object access (upload/read/delete).
- Request payload `ownerId` is treated only as an admin override target, never as caller identity.
- Effective caller identity always comes from authenticated guard context (`req.user` / `resolveCtxUser`).
- Storage layer policies (Supabase/MinIO/S3) are defense-in-depth and do not replace app-level authorization.

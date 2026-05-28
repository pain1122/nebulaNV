# NebulaNV Local Setup

Last updated: 2026-05-28

Use this file for first-time setup. Use `docs/architecture/local-dev-and-docker-boot.md` for the deeper boot and Docker explanation.

## 1) Prerequisites

- Node.js `>=22`
- pnpm `10.17.1`
- Docker Desktop on Windows, preferably with the WSL2 backend

Enable pnpm through Corepack:

```powershell
corepack enable
corepack prepare pnpm@10.17.1 --activate
```

## 2) Install Dependencies

```powershell
pnpm install
```

## 3) Environment Files

Create local env files from examples:

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

Rules:

- Commit `.env.example` files.
- Never commit real `.env` files.
- Keep variable names consistent across root `.env`, service `.env`, Docker Compose, and tests.
- When a port changes, update `docs/architecture/local-dev-and-docker-boot.md` too.

## 4) Generate gRPC / Proto Clients

```powershell
pnpm -w proto:gen
```

Use the check form when you want to confirm generated files are current:

```powershell
pnpm -w proto:check
```

## 5) Start Infrastructure

Default Docker infrastructure includes Postgres, Redis, MinIO, and MinIO bucket initialization:

```powershell
docker compose up -d postgres redis minio minio-init
```

To start the default app stack too:

```powershell
docker compose up -d --build
```

To start the full backend Docker profile:

```powershell
docker compose --profile full up -d --build
```

## 6) Run Prisma Migrations

Run migrations per Prisma-backed service:

```powershell
pnpm --filter ./apps/user-service prisma:migrate:dev
pnpm --filter ./apps/product-service prisma:migrate:dev
pnpm --filter ./apps/settings-service prisma:migrate:dev
pnpm --filter ./apps/blog-service prisma:migrate:dev
pnpm --filter ./apps/order-service prisma:migrate:dev
pnpm --filter ./apps/taxonomy-service prisma:migrate:dev
pnpm --filter ./apps/media-service prisma:migrate:dev
```

If a service lacks the command, check that service's `package.json` before adding a root-level shortcut.

## 7) Run Backend Locally

```powershell
pnpm dev:backend
```

This starts all backend services through root `package.json` scripts.

Some services wait for dependency gRPC ports before starting. If the terminal looks quiet for a bit, check `docs/architecture/local-dev-and-docker-boot.md` before assuming it is stuck.

Current local startup dependency idea:

```txt
auth-service first
settings/user/media wait for auth
taxonomy waits for auth + settings
blog/product wait for auth + settings + taxonomy
order waits for auth + settings + product
```

## 8) Run Web

```powershell
pnpm run dev:web
```

## 9) Verification

Targeted checks are better while cleaning one service:

```powershell
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm --filter @nebula/media-service build
pnpm --filter @nebula/auth-service build
pnpm --filter web build
```

Broad checks when the workspace is ready:

```powershell
pnpm -w proto:gen
pnpm -w build
docker compose config
docker compose --profile full up -d --build
```

## 10) Useful Runtime Checks

Check if a gRPC port is open on Windows:

```powershell
netstat -ano | findstr :50052
netstat -ano | findstr :50053
```

Follow Docker logs for one service:

```powershell
docker compose logs -f product-service
```

## 11) Auth Ownership Boundary

- `auth-service` is the source of truth for identity, roles, token issue/refresh/revocation.
- Services should not trust caller-supplied identity fields as authenticated user identity.
- Effective caller identity comes from authenticated guard context.
- Storage policies are defense-in-depth and do not replace app-level authorization.

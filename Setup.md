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
pnpm backend:env
```

This inventory-backed command copies the root and nine backend runtime
examples only when their local `.env` files do not already exist. It never
overwrites existing local values.

Rules:

- Commit `.env.example` files.
- Never commit real `.env` files.
- Keep variable names consistent across root `.env`, service `.env`, Docker Compose, and tests.
- When a port changes, update `docs/architecture/local-dev-and-docker-boot.md` too.

## 4) Generate gRPC / Proto Clients

Normal backend source and Docker builds generate the ignored TypeScript
contracts automatically through `@nebula/protos`. Run the explicit command
when changing a `.proto` file or when you want to inspect the local output:

```powershell
pnpm -w proto:gen
```

Use the non-mutating check form to prove the pinned generator can produce the
complete expected contract inventory:

```powershell
pnpm -w proto:check
```

## 5) Start The Docker Backend

Use the supported complete boot command for a clean setup or after backend
source changes:

```powershell
pnpm backend:boot
```

It waits for PostgreSQL, Redis, and MinIO; verifies all seven databases; runs
migration deploy and status; applies the base seeds; builds the nine images
through the sequential inventory-backed Bake runner; starts the currently
defined nine Compose runtimes without rebuilding; waits for their readiness
endpoints; and applies the idempotent API demo seed.

When the databases and images are already prepared, restart the existing stack
without rebuilding:

```powershell
docker compose up -d --no-build
```

Check or stop the stack without deleting named volumes:

```powershell
pnpm backend:health
pnpm backend:down
```

## 6) Run Prisma Migrations

Run all Prisma-backed services sequentially in the repository-defined order:

```powershell
pnpm prisma:migrate:dev
pnpm prisma:migrate:status
```

For a deployed/non-development database, use `pnpm prisma:migrate:deploy`
instead of `prisma:migrate:dev`. The root inventory and runner stop at the first
failed service.

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
pnpm backend:health
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

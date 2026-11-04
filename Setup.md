# NebulaNV Local Setup

Last updated: 2026-11-03

Use this file for the local toolchain and backend entrypoints. The current
Seaweed selection also requires the prepared private storage setup described in
README.md; fresh-machine bootstrap acceptance remains B3-owned. Use
`docs/architecture/local-dev-and-docker-boot.md` for the deeper boot explanation.

## 1) Prerequisites

- Node.js `24.22.2` LTS, pinned in `.node-version` (compatible patch line: `>=24.22.2 <25`)
- pnpm `10.17.1`
- Docker Desktop on Windows, preferably with the WSL2 backend

On Windows with fnm installed, select the repository runtime for this shell and
enable the pinned package manager. This does not edit a PowerShell profile,
change fnm's default or replace the system Node installation:

```powershell
fnm install 24.22.2
fnm env --shell powershell | Out-String | Invoke-Expression
fnm use 24.22.2
corepack enable
corepack prepare pnpm@10.17.1 --activate
node --version
pnpm --version
```

Expected versions: `v24.22.2` and `10.17.1`. Select the same runtime in each
terminal used for native development. Node 24 retains bundled Corepack; do not
copy this bootstrap unchanged to Node 26, which needs a separate compatibility
and package-manager setup decision. D3 host/native/tooling checks pass on Windows;
the grouped D8 Linux image rollout and hosted evidence remain pending.

## 2) Install Dependencies

```powershell
pnpm install --frozen-lockfile
```

## 3) Environment Files

Create local env files from examples:

```powershell
pnpm backend:env
```

This inventory-backed command copies the root and inventory-owned backend runtime
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

It provisions the inventory-owned databases, migrations and base seeds, builds
backend images through the sequential inventory-backed Bake runner, starts the
selected Compose topology, checks readiness and applies the API demo seed.
For the prepared active storage selection, Seaweed and its initializer are the
S3 dependency; stopped MinIO data remains for rollback. Follow the current-focus
handoff when a grouped build is pending instead of rebuilding after every
dependency decision. A fresh clone needs the storage bootstrap described in
README.md; ordinary boot does not recreate the private selection files for it.

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

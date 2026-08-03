# Local Dev And Docker Boot

Last checked: 2026-07-13

This document explains how the backend starts locally and in Docker.

It intentionally avoids listing secret values. Environment variable names are safe to document; secret values are not.

## Service Port Map

Current service ports from app `.env` files:

| Service          | HTTP Port | gRPC Port |
| ---------------- | --------: | --------: |
| user-service     |      3100 |     50051 |
| auth-service     |      3001 |     50052 |
| product-service  |      3003 |     50053 |
| settings-service |      3010 |     50054 |
| blog-service     |      3004 |     50055 |
| order-service    |      3005 |     50056 |
| taxonomy-service |      3006 |     50057 |
| media-service    |      3007 |     50058 |

## Local Backend Startup

The root command is:

```powershell
pnpm dev:backend
```

It uses `concurrently` to start all backend services.

Each service is started through root `package.json` scripts:

```txt
dev:auth
dev:user
dev:settings
dev:taxonomy
dev:media
dev:blog
dev:product
dev:order
```

Most scripts use `wait-on tcp:127.0.0.1:<port>` so a service does not start before the dependency it needs is listening.

## Local Dependency Graph

Current intended local startup dependencies:

```txt
auth-service
|-- user-service
|-- settings-service
|-- media-service
|-- taxonomy-service
|   `-- depends on settings-service
|-- blog-service
|   |-- depends on settings-service
|   `-- depends on taxonomy-service
|-- product-service
|   |-- depends on settings-service
|   `-- depends on taxonomy-service
`-- order-service
    |-- depends on settings-service
    `-- depends on product-service
```

Operationally, the current local scripts wait on:

| Script         | Waits On                                                        |
| -------------- | --------------------------------------------------------------- |
| `dev:auth`     | nothing                                                         |
| `dev:user`     | auth gRPC `50052`                                               |
| `dev:settings` | auth gRPC `50052`                                               |
| `dev:taxonomy` | auth gRPC `50052`, settings gRPC `50054`                        |
| `dev:media`    | auth gRPC `50052`                                               |
| `dev:blog`     | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057` |
| `dev:product`  | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057` |
| `dev:order`    | auth gRPC `50052`, settings gRPC `50054`, product gRPC `50053`  |

## Why Startup Can Look Stuck

When running:

```powershell
pnpm dev:backend
```

the console may appear to pause at the first service:

```txt
@nebula/auth-service start
nest start
```

This usually means later services are waiting for dependency ports to open.

Once auth opens its gRPC port, the waiting services continue.

## Local Environment Variables

There are two main env layers:

- root `.env`
- per-service `apps/<service>/.env`

Root `.env` contains shared values such as:

- `NODE_ENV`
- `PUBLIC_MODE`
- `S2S_SIGNATURE_HEADER`
- `S2S_MAX_CLOCK_SKEW_MS`
- `S2S_REPLAY_STORE` and Redis connection settings
- `*_GRPC_URL`
- `*_HTTP_PORT`
- JWT settings
- MinIO settings

Per-service `.env` files usually contain:

- `SVC_NAME`
- `PORT`
- `GRPC_PORT`
- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- pairwise `S2S_OUTBOUND_KEYS`, `S2S_INBOUND_KEYS`, and `GATEWAY_INBOUND_KEYS`
- service-specific storage or Redis values

Do not document secret values. Document names, purpose, and expected format only.

## Local URL Convention

For local process mode, cross-service gRPC URLs use localhost:

```env
AUTH_GRPC_URL=127.0.0.1:50052
PRODUCT_GRPC_URL=127.0.0.1:50053
SETTINGS_GRPC_URL=127.0.0.1:50054
TAXONOMY_GRPC_URL=127.0.0.1:50057
```

For Docker mode, cross-service gRPC URLs use Docker service names:

```env
AUTH_GRPC_URL=auth-service:50052
PRODUCT_GRPC_URL=product-service:50053
SETTINGS_GRPC_URL=settings-service:50054
TAXONOMY_GRPC_URL=taxonomy-service:50057
```

Do not use `127.0.0.1` for service-to-service calls inside Docker containers. Inside a container, `127.0.0.1` means "this same container", not another service.

## Docker Compose

The main file is:

```txt
docker-compose.yml
```

Core infrastructure:

- `postgres`
- `redis`
- `minio`
- `minio-init`

The backend stack contains all eight app services:

- `user-service`
- `auth-service`
- `settings-service`
- `media-service`
- `taxonomy-service`
- `blog-service`
- `product-service`
- `order-service`

For a complete supported boot, run:

```powershell
pnpm backend:boot
```

The command extends the single inventory-backed provisioner. It waits for
healthy PostgreSQL, Redis, and MinIO; proves all seven expected databases exist;
completes MinIO bucket initialization; deploys and checks migrations; applies
all base seeds; builds the eight official Bake targets sequentially; starts
Compose with `--no-build`; waits for the eight HTTP readiness contracts; and
runs the idempotent API demo seed. `pnpm test:e2e:provision` is a compatibility
alias to the same workflow.

Plain Compose startup does not run migrations, seeds, or builds. Use it only to
restart an already-prepared database and existing images:

```powershell
docker compose up -d --no-build
```

Readiness can be checked without changing the stack. The down command removes
containers and the Compose network but deliberately omits `-v`, preserving the
PostgreSQL and MinIO named volumes:

```powershell
pnpm backend:health
pnpm backend:down
```

To follow one service:

```powershell
docker compose logs -f product-service
```

## Docker gRPC URLs

`docker-compose.yml` defines an internal gRPC map:

```yaml
x-internal-grpc:
  USER_GRPC_URL: user-service:50051
  AUTH_GRPC_URL: auth-service:50052
  PRODUCT_GRPC_URL: product-service:50053
  SETTINGS_GRPC_URL: settings-service:50054
  BLOG_GRPC_URL: blog-service:50055
  ORDER_GRPC_URL: order-service:50056
  TAXONOMY_GRPC_URL: taxonomy-service:50057
  MEDIA_GRPC_URL: media-service:50058
```

Services merge this map into their Docker environment. This keeps local `.env` URLs from leaking into container-to-container calls.

## Docker Database Names

Postgres starts with an init script:

```txt
scripts/db/init-multiple-dbs.sh
```

It creates:

- `nebula_users`
- `nebula_products`
- `nebula_settings`
- `nebula_blog`
- `nebula_order`
- `nebula_taxonomy`
- `nebula_media`

Each service should point its `DATABASE_URL` at its own database.

## Host Commands Against Docker Postgres

Per-service `.env` files are for local development, where the service process
runs on the host machine. Docker Compose overrides database URLs for container
runtime, where services reach Postgres through the Docker service name:

```txt
postgres:5432
```

Do not replace local service `.env` files with Docker-only URLs. If a host
PowerShell command needs to apply migrations or run tests against the Docker
Postgres instance, set temporary environment variables for that shell session.

Example for settings-service when Docker exposes Postgres as `15432:5432`:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/nebula_settings?schema=public"
$env:SHADOW_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/postgres?schema=nebula_settings_shadow"

pnpm --filter @nebula/settings-service prisma:migrate:deploy
pnpm --filter @nebula/settings-service test

Remove-Item Env:DATABASE_URL
Remove-Item Env:SHADOW_DATABASE_URL
```

Use this only for host-to-Docker maintenance commands. Containers should keep
using the Compose-provided `postgres:5432` URLs, and local development should
keep using the service `.env` URLs.

## Dockerfiles

All eight backend images use the shared multi-target Dockerfile:

```txt
docker/backend.Dockerfile
```

Compose selects one independent runtime target for each service:

- `user-service`
- `auth-service`
- `settings-service`
- `media-service`
- `taxonomy-service`
- `product-service`
- `blog-service`
- `order-service`

`docker-bake.hcl` defines the official target set. Normal tooling invokes those
targets sequentially in backend-inventory order. The first target commits the
shared build, dependency, and runtime-base layers; later targets can reuse those
completed layers instead of competing to materialize identical pnpm installs
and large copies. Do not use the grouped `docker buildx bake backend --load`
command for normal Docker Desktop builds.

The resulting images still share an identical, stable production-dependency
layer. Compiled universal internal packages are added afterward as small
synchronized overlays, so an internal source edit does not recreate that large
third-party layer. Each image contains all internal packages it needs plus only
its own service build and Prisma client, and remains independently runnable and
deployable. Licensed or tenant-specific feature modules must remain separate
images rather than being placed in this common foundation.

## Prisma Generation

The root `package.json` owns the backend inventory used by local tooling. It
records all eight backend packages, directories, Docker identities, ports, and
the seven Prisma database names. `scripts/backend.mjs` reads that inventory and
runs Prisma services sequentially in this fixed order:

```txt
user -> settings -> media -> taxonomy -> product -> blog -> order
```

Use the root commands instead of maintaining another service list:

```powershell
pnpm prisma:gen
pnpm prisma:migrate:dev
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
pnpm prisma:seed
pnpm backend:seed
pnpm db:push
```

The runner stops at the first failed service and identifies the operation,
service, and database name without printing database credentials. Service-local
Prisma commands remain available for focused work.

`pnpm prisma:seed` is the base-database seed. User-service owns the development
admin and normal-user records, settings-service owns its defaults, and media,
taxonomy, product, blog, and order currently own no base rows. The user seed
refuses to run when `NODE_ENV=production`.

After all services are ready, `pnpm backend:seed` logs in as the ordinary seeded
admin and creates one stable product and one published blog post through the
existing HTTP APIs. It omits the product category so product-service resolves
its initializer-owned default. Matching records are reported as existing and
are never updated. The command refuses production and never logs credentials or
tokens. Custom seed credentials must be supplied through `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASS` in the invoking environment.

When adding a service with Prisma, check:

- service package scripts
- root `nebula.backendServices` inventory
- Dockerfile Prisma generation
- Docker Compose `DATABASE_URL`
- Docker Compose init database list

## Clean Migration And Local Database Recovery

The inventory-backed database checks use temporary databases whose names
contain `_verify_`; they do not rewrite the seven normal development databases
or delete Docker volumes:

```powershell
pnpm db:verify:migrations
pnpm test:database-recovery
```

`db:verify:migrations` deploys and checks every service migration in the fixed
inventory order. `test:database-recovery` proves that custom-format PostgreSQL
dumps preserve binary values and that an intentional temporary migration
failure stops later services. It then recreates only the affected disposable
database and applies the real migrations. The invalid migration exists only in
an operating-system temporary copy of the Prisma tree.

Local maintenance backups cover the seven inventory-owned PostgreSQL databases.
The target directory must be explicit and must not already exist. It contains
one binary PostgreSQL custom-format dump per database plus `manifest.json`,
which records the exact service, database, file, format, and creation time.
Backups do not include Redis, MinIO objects, secrets, or Docker volumes.

Stop the eight backend services before backup or restore, but leave PostgreSQL
running:

```powershell
$backendServices = @(
  "user-service",
  "auth-service",
  "settings-service",
  "media-service",
  "taxonomy-service",
  "product-service",
  "blog-service",
  "order-service"
)

docker compose stop $backendServices

$backupDirectory = ".nebula-backups\local-maintenance"
pnpm run db:backup -- $backupDirectory
pnpm run db:restore -- $backupDirectory --confirm=RESTORE_LOCAL_DATABASES

pnpm prisma:migrate:status
docker compose up -d --no-build $backendServices
docker compose ps
pnpm backend:seed
```

Both maintenance commands refuse to run while a backend service is running.
Restore validates the manifest and every dump before changing a database, then
drops, recreates, and restores the seven canonical databases in inventory
order. The explicit confirmation token protects against accidental invocation;
restore remains destructive to those database contents. Never edit or delete
Prisma `_prisma_migrations` records manually. Recover a disposable development
database by recreating only that database and applying the repository's real
migrations; production recovery requires its own reviewed operational plan.

## Boot Troubleshooting

If `pnpm dev:backend` appears stuck:

1. Check which service is currently compiling.
2. Check whether a waiting port is open.
3. Confirm the service `.env` has the expected `GRPC_PORT`.
4. Confirm root `package.json` waits on the dependency port, not the wrong service.

Useful commands:

```powershell
netstat -ano | findstr :50052
netstat -ano | findstr :50053
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
```

If Docker services cannot talk to each other:

1. Check `docker compose ps`.
2. Check `docker compose logs -f <service>`.
3. Check whether the service uses Docker DNS names instead of `127.0.0.1`.
4. Check whether its declared Compose dependencies are healthy.

### Docker / WSL Clock Drift

S2S gRPC signatures are minute-windowed. If the Windows host clock and Docker
container clock drift apart, valid gRPC test metadata can fail with:

```txt
16 UNAUTHENTICATED: invalid_s2s_signature
```

Check host and container time:

```powershell
node -e "console.log(Date.now(), new Date().toISOString())"
docker compose exec -T user-service node -e "console.log(Date.now(), new Date().toISOString())"
```

The timestamps should be within a few seconds. If Docker is several minutes
behind or ahead, reset Docker Desktop and WSL from an Administrator PowerShell:

```powershell
docker compose down
Stop-Process -Name "Docker Desktop","com.docker.backend" -Force -ErrorAction SilentlyContinue
wsl --terminate docker-desktop
wsl --shutdown
Restart-Service LxssManager -Force
```

If Windows time sync reports no configured time source, configure it:

```powershell
Start-Service W32Time
w32tm /config /syncfromflags:manual /manualpeerlist:"time.windows.com,0x8 pool.ntp.org,0x8" /reliable:no /update
Restart-Service W32Time
w32tm /resync /rediscover /force
w32tm /query /status
w32tm /query /source
```

Then start Docker Desktop manually, wait until the engine is ready, and run:

```powershell
docker compose up -d
```

Verify the clocks again before running S2S/gRPC tests. Do not weaken the S2S
signature window as a workaround; fix Docker/WSL time sync instead.

## Change Checklist

When changing ports or boot order:

- Update root `.env`.
- Update the service `.env`.
- Update root `package.json` wait scripts.
- Update `docker-compose.yml` internal gRPC map.
- Update Dockerfile `EXPOSE` lines if needed.
- Update tests that hardcode fallback URLs.
- Update this document.

Ports are contracts. Treat them with the same paranoia as DTO field names.

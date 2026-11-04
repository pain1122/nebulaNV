# Local Dev And Docker Boot

Last checked: 2026-08-24

This document explains how the backend starts locally and in Docker.

It intentionally avoids listing secret values. Environment variable names are safe to document; secret values are not.

Nov 2 storage activation checkpoint: ordinary Compose commands now discover the
Seaweed selection from ignored root .env; image archive inventory uses that same
default discovery. Gateway/Media and Seaweed are now healthy; old MinIO remains
stopped for rollback. No temporary shell COMPOSE overrides are needed. Root env
contains file selection and public storage settings; scoped credentials enter
only Media through its private env file. Preserve stopped MinIO and its volume
for rollback. Use [the exact storage procedure](../../docker/seaweedfs/README.md#m5-persistent-activation)
for startup and guarded restoration instead of switching base files casually.

## Service Port Map

Current service ports from app `.env` files:

| Service                  | HTTP Port | gRPC Port |
| ------------------------ | --------: | --------: |
| user-service             |      3100 |     50051 |
| auth-service             |      3001 |     50052 |
| tenant-authority-service |      3011 |     50059 |
| product-service          |      3003 |     50053 |
| settings-service         |      3010 |     50054 |
| blog-service             |      3004 |     50055 |
| order-service            |      3005 |     50056 |
| taxonomy-service         |      3006 |     50057 |
| media-service            |      3007 |     50058 |
| gateway                  |      3002 |         - |

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
dev:tenant-authority
dev:settings
dev:taxonomy
dev:media
dev:blog
dev:product
dev:order
dev:gateway
```

Most scripts use `wait-on tcp:127.0.0.1:<port>` so a service does not start before the dependency it needs is listening.

## Selected native watch workflow

`pnpm dev:watch` is an opt-in development command. It uses cached serial builds
and direct Node process restarts; it does not build/export images. The full
`pnpm dev:backend` command above retains its existing behavior. Do not run the
two development launchers together.

Inspect the scope first:

```powershell
pnpm dev:watch order-service --plan
```

The plan derives native companion callers from source RPC references and Compose
startup dependencies. Selecting Order also selects Gateway; a Gateway left in
Docker would keep calling Docker's Order address. Selecting a heavily used
provider can include more native callers. The plan lists all selected native
services, containers to stop, shared producers and Docker dependencies. Review
that scope when service-to-service dependencies change; source planning is not
proof that existing images match the current source.
The first application trial is Order/Gateway. Native Media is explicitly blocked
while its scanner has only a private Docker listener; provider selections whose
caller closure includes Media report that limitation too. Keep Media in Docker
for this trial. This command does not publish scanner TCP or certify every
service's native infrastructure adapter.

For the initial Order/Gateway trial, use one terminal:

```powershell
docker compose up -d --no-build --wait user-service auth-service settings-service media-service taxonomy-service product-service blog-service
docker compose stop order-service gateway
pnpm db:status:order
```

If Order reports pending migrations, use the existing explicit
`pnpm db:migrate:order` preparation command and recheck status before continuing.
This is local development preparation; the watcher never applies migrations or
seeds. Keep existing DB credentials and native database/store endpoints in the
owning env files. Published PostgreSQL may use port 15432 on this workstation;
an old example's 5432 value is not evidence of the actual listener.

Then start the session and leave the terminal open:

```powershell
pnpm dev:watch order-service
```

Initial preparation builds only the native services and their shared producer
graph, generates clients only for native Prisma owners, and verifies runtime
imports. It can take time on its first run. `--plan` itself performs no builds,
process startup, environment-file parsing or Docker commands.

The explicit native network profile supplies inventory HTTP/gRPC bind ports,
loopback gRPC routes and the published Media render origin through child process
variables. Mode is development; a production shell is rejected. A Node preload
uses the established process > app `.env` > root `.env` expansion policy, then
sets local DATABASE_URL/SHADOW_DATABASE_URL ports to Compose's literal published
PostgreSQL port (currently 15432). Credentials, owning database, shadow schema
and URL options are preserved. A remote URL or wrong owning database is rejected,
never silently redirected. Env files are never rewritten. Other secrets and
store inputs retain the normal native precedence. The same Joi schema is checked
before runtime startup; diagnostics name invalid keys/types, not their values.
Declared store endpoints must be loopback inputs. Validation does not establish
connectivity or migration currency. The opt-in preload is verified on the pinned
Node 22 toolchain in its accepted live pilot. D3 now uses Node 24.22.2 via
`.node-version`; native imports, preload, filesystem/process tests and the full
watch regression suite pass on Windows. New Linux images/current-snapshot hosted
proofs remain D8/B5-owned. Production image startup does not use this preload.

Wait for `[dev-watch] ready: order-service, gateway` (ordering can vary after a
repair), then check from another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:3005/health/ready
Invoke-RestMethod http://127.0.0.1:3002/health/ready
```

App source saves rebuild/restart only their affected native consumers. Shared
source saves refresh required producers/injected copies before restarting native
consumers. Cached builds still receive explicit injected-output refresh. Authored
file hashes suppress duplicate save events; generated outputs, dependencies,
tests and caches do not trigger builds. Edits during a build are queued. Requests
may receive 503s while a provider restarts; wait for the next ready message.
Compiler errors keep affected consumers stopped; correcting a source file
retries the failed group. Root/app env edits restart consumers without compiling
already valid outputs. Manifest/lock, tooling, Prisma schema or migration edits
stop the session for explicit preparation/restart. New dependencies require the
normal frozen install/lock workflow; there is no automatic install or migration.

The first Order/Gateway pilot passed on 2026-10-28: native readiness, six F3
Gateway flows, Order-only and shared-consumer ready restarts, comment cleanup
and shutdown releasing the lock and HTTP listeners. This does not certify
every native service adapter or D2 payment/cancellation behavior. The owned
fixture tests separately check actual changed shared values and cached producer
restoration. [Pilot evidence](../reports/2026-10-27-selected-service-dev-workflow.md#pilot-closure---2026-10-28).

Ctrl+C stops only owned runtime/build processes and releases the workspace
session lock. A port conflict never kills its listener. The lock prevents two
watch sessions from updating the same shared outputs. After a crash/power loss,
inspect `.ci-evidence/backend-dev/session.lock`; remove that exact file only
after confirming its recorded process is no longer running. Do not run manual
build/clean/install commands concurrently with this session.

To return to the existing Docker stack, stop the native session first, then:

```powershell
docker compose up -d --no-build --wait order-service gateway
```

This restores the existing images; it does not update them from native edits.
Use the normal selected image build, integration and release gates when accepting
application changes. [Plan, impact trace and proof status](../reports/2026-10-27-selected-service-dev-workflow.md).

## Local Dependency Graph

Current intended local startup dependencies:

```txt
auth-service
|-- tenant-authority-service (database + Redis replay; no Auth dependency)
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

| Script                 | Waits On                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `dev:auth`             | nothing                                                                                                                          |
| `dev:tenant-authority` | authority database plus Redis for signed-RPC replay claims                                                                       |
| `dev:user`             | auth gRPC `50052`                                                                                                                |
| `dev:settings`         | auth gRPC `50052`                                                                                                                |
| `dev:taxonomy`         | auth gRPC `50052`, settings gRPC `50054`                                                                                         |
| `dev:media`            | auth gRPC `50052`                                                                                                                |
| `dev:blog`             | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057`                                                                  |
| `dev:product`          | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057`                                                                  |
| `dev:order`            | auth gRPC `50052`, settings gRPC `50054`, product gRPC `50053`                                                                   |
| `dev:gateway`          | no shell-level wait; startup validates all eight target addresses, registry, pairwise keys, Redis, and fixed Media render origin |

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

Gateway is the HTTP-only exception. Its app-local env contains
`GATEWAY_HTTP_PORT`, the eight required `*_GRPC_URL` targets,
`GATEWAY_OUTBOUND_KEYS`, `GATEWAY_APPLICATION_REGISTRY_JSON`, gateway Redis,
idempotency bounds, and `MEDIA_RENDER_HTTP_URL`; it has no database, inbound
S2S/replay, `PUBLIC_MODE`, or gRPC listener fields.

Native Gateway examples use `http://127.0.0.1:3007` for Media rendering. Local
Compose explicitly sets `http://media-service:3007` inside Gateway's container;
the native host variable must not override that internal address. Release uses
its separate production environment with the internal origin.

Do not document secret values. Document names, purpose, and expected format only.

The [runtime environment ownership contract](runtime-environment-ownership.md)
records actual native/local/release precedence and which file to edit. Its
Segment 4 review validates all eleven clean local/release schemas without
changing operator files or starting applications.

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
- `realm-auth-default-redis`
- `realm-auth-db-init`
- `minio`
- `minio-init`

Seaweed is active under the persistent local selection; MinIO is stopped with retained data. The opt-in Seaweed preparation and completed
container-recreation proof are documented in [the storage setup](../../docker/seaweedfs/README.md).
Boot reads the effective Media internal endpoint and its matching healthy
dependency before startup. An alongside Seaweed service does not change that
selection. The controlled M5 cutover reconciled objects and initializer
wiring, and M6 native feature/recovery proofs pass. Do not rerun a transfer or
full boot merely to repeat this accepted result.

The inventory-backed stack contains eleven backend runtimes:

- `user-service`
- `auth-service`
- `realm-auth-service` (default-realm R3 shadow; health only)
- `tenant-authority-service`
- `settings-service`
- `media-service`
- `taxonomy-service`
- `blog-service`
- `product-service`
- `order-service`
- `gateway`

For a complete supported boot, run:

```powershell
pnpm backend:boot
```

The command extends the single inventory-backed provisioner. It reads the rendered
storage configuration without printing secrets, then waits for healthy PostgreSQL,
legacy/default-realm Redis and the configured local object store (currently Seaweed).
It idempotently provisions
the Authority and default/operator Realm Auth databases/runtime logins; proves
all nine inventory databases exist; deploys and checks migrations; applies all base
seeds; builds the eleven official Bake targets sequentially; starts
Compose with `--no-build`, including bucket initialization through Media's declared
dependencies; waits for the eleven HTTP readiness contracts; and
runs the idempotent API demo seed. `pnpm test:e2e:provision` is a compatibility
alias to the same workflow.

The operator Realm Auth database/role is provisioned, but its service and Redis
are behind Compose profile `r3-shadow`. Generic boot does not migrate or seed
that second database yet. The R3 dual-store verifier is implemented; run it
before accepting imported state. Maintenance backup and restore include both
Realm Auth databases.

After a provisioned boot, the bounded public-client proof is:

```powershell
pnpm test:f3:live
```

It exercises the generated client through gateway 3002 for anonymous
storefront, authenticated storefront, authorized admin, registered mobile, and
disabled partner execution. It is development-only and prints no credentials
or tokens.

Plain Compose startup does not run migrations, seeds, or builds. Use it only to
restart an already-prepared database and existing images:

```powershell
docker compose up -d --no-build
```

Readiness can be checked without changing the stack. The down command removes
containers and the Compose network but deliberately omits `-v`, preserving the
PostgreSQL and selected Seaweed named volumes (retained MinIO is separate rollback data):

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
  TENANT_AUTHORITY_GRPC_URL: tenant-authority-service:50059
```

Services merge this map into their Docker environment. This keeps local `.env` URLs from leaking into container-to-container calls.

## Docker Database Names

Postgres starts with an init script:

```txt
scripts/db/init-multiple-dbs.sh
```

It creates:

- `nebula_users`
- `nebula_authority`
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

All eleven backend images use the shared multi-target Dockerfile:

```txt
docker/backend.Dockerfile
```

The Compose files and Bake graph select the nine hybrid runtime targets plus
the two HTTP-only Realm Auth shadow and gateway targets:

- `user-service`
- `auth-service`
- `realm-auth-service`
- `tenant-authority-service`
- `settings-service`
- `media-service`
- `taxonomy-service`
- `product-service`
- `blog-service`
- `order-service`
- `gateway`

`docker-bake.hcl` defines the official eleven-target set. Without service names,
normal tooling invokes that full inventory sequentially using one shared `all`
compilation scope. A partial request keeps the supplied order and stops on the
first failure:

```powershell
pnpm docker:build:backend order-service gateway --plan
pnpm docker:build:backend order-service gateway
.\scripts\docker\build-backend.ps1 -Services order-service,gateway -Plan
```

`--plan` / `-Plan` prints commands without contacting Docker or building images.
Every Compose target selects its own graph, including the operator Realm Auth
profile sharing its image. The inventory-backed runner gives every image in a
batch the same canonical selected union; a full request uses `all`. The first
image builds that union, and later sequential exports reuse identical compilation
and shared runtime inputs. Requested export order is preserved. Standalone
`docker compose build <service>` remains a leaf build.

Turbo pruning separates lockfile/policy fetch, frozen selected install, explicit
owner Prisma generation and source compilation. Only selected database owners
generate clients; Gateway and Auth have no owner schema. Restored shared outputs
refresh injected copies before dependent builds. Root tooling still declares
clients/grpc-auth/protos, so prune retains those source packages as well as the
app closure; this does not add sibling application compilation. The shared
production dependency layer remains unchanged. No real env enters build inputs.

Product/Order image, warm and isolation acceptance passed. The other services
and batch packaging now pass native build and offline image closure; unchanged
warm full batch passes at 111.1s (1m51.1s). CI host/BuildKit persistence and full
hosted acceptance now pass on `7035545`; see the
[Segment 3 exit proof](../reports/2026-10-27-build-cleanup-segment3-exit.md).
CI's MinIO inputs use an
approved checksum-pinned vendor prerelease cache and CI-only pull-never override;
local/release startup and existing volumes are unchanged. Hosted backend image,
integration, scan and sixteen-image archive acceptance pass. See the
[vendor-cache receipt](../reports/2026-10-26-minio-image-availability.md).
Actual builds report elapsed seconds and preserve caches unless explicitly asked
for a clean build. Keep automatic cache cleanup enabled; a cache target is not a
hard cap on total image/volume storage.

If a graph image fails, preserve its log before using the explicit legacy
fallback; do not disable frozen installs, runtime checks or add `--no-cache`:

```powershell
docker buildx bake product-service --load --set=product-service.args.BACKEND_BUILD_PIPELINE=legacy
```

No container recreation is necessary just to build/compare an image. Existing
running containers are unchanged until a separate deployment command is run.

Shared layers can be reused when their inputs and build arguments match. Do not
use the grouped `docker buildx bake backend --load` command for normal Docker
Desktop builds: parallel solves can compete to materialize large dependency trees.

The resulting images still share an identical, stable production-dependency
layer. Compiled universal internal packages are added afterward as small
synchronized overlays, so an internal source edit does not recreate that large
third-party layer. Each image contains all internal packages it needs plus only
its own service build and Prisma client, and remains independently runnable and
deployable. Licensed or tenant-specific feature modules must remain separate
images rather than being placed in this common foundation.

## Prisma Generation

The root `package.json` owns the backend inventory used by local tooling. It
records all eleven inventory-backed runtimes, their HTTP or HTTP/gRPC transport,
directories, Docker identities, ports, Compose admission, and the nine
Prisma database names. `scripts/backend.mjs` reads that one inventory, derives
the narrower views, and runs Prisma services sequentially in this fixed order:

```txt
user -> default Realm Auth -> authority -> settings -> media -> taxonomy -> product -> blog -> order
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

After all services are ready, `pnpm backend:seed` runs `pnpm demo:d1:seed` for
the Product showcase through Gateway, then preserves the existing minimal Blog
lookup/create through its internal HTTP compatibility API. The Product runner
uses its ownership journal to resume/verify fixtures, refuses drift and handles
Gateway rate limits with bounded waits. It keeps existing limits fixtures if
already loaded. Run `pnpm demo:d1:seed limits` explicitly for capacity examples.
The old minimal Product generator is retired; existing legacy rows are not
deleted. Base/setup seeds and service-owned taxonomy initialization remain
separate. Both demo paths refuse production; Product also requires a local
Gateway target. Custom seed credentials use `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASS`
in the invoking environment. Seeding can pause for scanner/derivative processing
or Gateway quotas; no additional Docker build is performed by this seed command.

When adding a service with Prisma, check:

- service package scripts
- root `nebula.backendServices` inventory
- Dockerfile Prisma generation
- Docker Compose `DATABASE_URL`
- Docker Compose init database list

## Clean Migration And Local Database Recovery

The inventory-backed database checks use temporary databases whose names
contain `_verify_`; they do not rewrite the nine inventory development databases
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

Local maintenance backups cover the nine inventory-owned PostgreSQL databases
plus the profiled operator Realm Auth database.
The target directory must be explicit and must not already exist. It contains
one binary PostgreSQL custom-format dump per database plus `manifest.json`,
which records the exact service, database, file, format, and creation time.
SQL backups do not include Redis, S3 objects, Seaweed filer metadata, secrets or Docker volumes; B4 owns the complete recovery package.

Stop the eleven inventory-backed runtimes and the profiled operator Realm Auth
runtime before backup or restore, but leave PostgreSQL running:

```powershell
$backendServices = @(
  "user-service",
  "auth-service",
  "realm-auth-service",
  "operator-realm-auth-service",
  "tenant-authority-service",
  "settings-service",
  "media-service",
  "taxonomy-service",
  "product-service",
  "blog-service",
  "order-service",
  "gateway"
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
drops, recreates, and restores the ten maintenance databases in manifest order.
The explicit confirmation token protects against accidental invocation;
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

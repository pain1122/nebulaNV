# Docker Configs

## Prisma 7 owner preparation (November 7)

Each migrated owner's `prisma.config.ts` joins selected schema generation and
legacy install inputs. Its CJS client compiles under `dist/generated/prisma`
and travels with the existing application dist copy. Generated source is excluded
from Docker/snapshot/cache inputs. Runtime checks require the new client/options
instead of accepting a stale legacy client. Product/Order/Media/Taxonomy/Settings/
Blog/User/Realm Auth installed host gates, including clean migration proofs,
pass. Realm DEFAULT/OPERATOR still share one image. Tenant Authority adds the
final config COPY; its candidate compilation/spec/tools types, strict lint/92
tests and native populated/seed/role/resolver/audit/rollback/cleanup pass. Root
CLI/client pins and final owner now match7.10.1 in source; offline lockfile-only
publication synchronization passes. Combined frozen install and installed final
reconciliation remain pending. BuildKit verifies all60 local COPY inputs and
the selected graph has no sibling application dependency (static graph check,
not an application image proof). Sibling source/schema test inputs do not enter the app graph.
Media's recovery helper selects legacy versus modern clients from the image manifest,
supporting existing images while refusing stale output in a modern image.
All nine prepared owner image acceptances remain D8 work. The maintenance report records exact
input cohorts and detailed evidence.

## Purpose

This file summarizes the Docker files an agent should check before changing backend boot, release packaging, image names, ports, or runtime env behavior.

For runtime input ownership and mode-specific precedence, see the
[environment contract](architecture/runtime-environment-ownership.md).

The optional runtime-packaging comparison is complete:
[measured results](reports/2026-10-27-runtime-packaging-comparison.md#completed-comparison-616d63fe-retain-the-accepted-shared-layer).
Retain the shared production dependency layer; smaller individual candidate
images increased the measured mixed-fleet archive by 46.3%. The prototype stays
opt-in with owned temporary contexts/tags. The accepted builder is unchanged.

For source iteration, the opt-in
[selected native watch workflow](architecture/local-dev-and-docker-boot.md#selected-native-watch-workflow)
keeps dependencies in Docker and moves the selected services plus required native
callers to host processes. It performs no Docker commands itself. Existing image
build, full-backend startup and release paths remain available and unchanged.

Use this as a map. Do not duplicate full deployment instructions here; detailed release flow lives in `deploy/README.md`.

## Main Files

- `docker-compose.yml`: local/dev backend stack with build blocks.
- `docker-bake.hcl`: official eleven-image backend target set.
- `docker-compose.release.yml`: release stack with prebuilt/preloaded images only.
- `docker/backend.Dockerfile`: shared multi-stage backend image builder.
- `.dockerignore`: root Docker build context filter.
- `scripts/docker/build-backend.ps1`: cached/clean PowerShell build entry point.
- `deploy/.env.production.example`: release env template.
- `deploy/README.md`: image-save/load release runbook.
- `scripts/docker/save-release-images.ps1`: saves release images into `deploy/nebula-images.tar`.
- `scripts/docker/load-release-images.ps1`: loads `deploy/nebula-images.tar`.
- `scripts/db/init-multiple-dbs.sh`: creates per-service Postgres databases on first volume init.
- `scripts/db/ensure-tenant-authority-db.sh`: idempotently provisions the dedicated
  authority database/runtime login for new or existing volumes.
- Root `package.json` field `nebula.backendServices`: tooling-owned backend
  runtime, transport, Compose admission, database, image, and port
  inventory. It derives eleven runtimes, nine HTTP/gRPC hybrids, and nine
  Prisma owners. Gateway is public HTTP-only; Realm Auth is a health-only HTTP
  shadow. Gateway/Auth have no Prisma database; tenant-authority-service owns
  a signed internal read transport.
- `scripts/backend.mjs`: inventory-backed provisioning, Prisma, development, database verification/recovery, release-image, and security-scan command source.

## Local Compose

File:

`docker-compose.yml`

Purpose:

- Builds backend service images from local source.
- The explicit base defines Postgres/Redis and legacy MinIO/init. Persistent local selection adds Seaweed/init and removes MinIO from ordinary startup.
- Starts backend services with local image tags.
- Uses root `.env` plus service-local `.env` files.
- Overrides database URLs to point at the Docker Postgres service.
- Overrides internal gRPC URLs to Docker service DNS names.
- Uses health-gated infrastructure and backend dependency startup.

Image names use:

```text
${NEBULA_IMAGE_PREFIX:-nebulanv-main}-<service>:${NEBULA_IMAGE_TAG:-latest}
```

Internal gRPC URLs use Docker DNS:

```text
user-service:50051
auth-service:50052
product-service:50053
settings-service:50054
blog-service:50055
order-service:50056
taxonomy-service:50057
media-service:50058
tenant-authority-service:50059
```

Host ports expose all nine hybrid HTTP/gRPC pairs, including authority ports
3011/50059, and gateway port 3002 for local tests and diagnosis.

## Release Compose

The explicit base file below retains the MinIO rollback model. Selected Seaweed
release configuration also merges the storage, bootstrap and selected-runtime
overlays; its boundary render passes, while the final B0 package/deployment
recipe remains B4/B5 work. A base-only example is not selected release acceptance.

File:

`docker-compose.release.yml`

Purpose:

- Runs prebuilt images only.
- Has no `build:` blocks.
- Reads deployment values from `deploy/.env.production`.
- Uses required env interpolation for production secrets.
- Keeps runtime state in Docker volumes.
- Uses the same Docker service DNS model for internal gRPC and database URLs.
- The explicit base publishes gateway port 3002 and MinIO data port 9000 only;
  the selected Seaweed overlay publishes its loopback data port 19000 instead.
- Keeps tenant-authority-service internal, gives it only its dedicated runtime
  database credential, and supplies S2S/Redis receiver configuration without
  publishing either authority port to the host.
- Keeps backend application ports, PostgreSQL, Redis, and MinIO console 9001
  private.
- Keeps seven hybrid services in `GATEWAY_ONLY`; media alone uses `OPEN` on the
  private network for its already-public render stream. Private media routes
  remain authenticated.

Start command:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml up -d --no-build
```

Release Compose is for deployment machines where the app should not build images or fetch npm dependencies.

## Backend Dockerfile

File:

`docker/backend.Dockerfile`

Purpose:

- Builds all backend services from one shared Dockerfile.
- Targets immutable official `node:24.22.2-bookworm` and
  `node:24.22.2-bookworm-slim` image-index digests for build and runtime stages,
  matching `.node-version` and both CI jobs. D3 Windows host proof passes; the
  grouped D8 Linux rebuild remains pending. Older images are not certified by this pin.
  This prevents sequential service targets from resolving different base bytes
  during one build. Updating either digest is an explicit dependency/security
  maintenance change followed by backend image and scan evidence.
- Enables pnpm through corepack.
- Caches Corepack's pinned pnpm download across sequential targets and retries
  preparation at most three times, so a transient registry reset does not
  immediately discard an otherwise reusable build graph.
- Verified on 2026-09-15 by all 55 backend-tooling tests, Dockerfile build
  validation, a complete sequential image build, and healthy startup of all
  eleven backend/ingress services.
- Uses `pnpm fetch` for dependency cache.
- Copies package manifests first for better Docker layer caching.
- Prunes the selected graph and separates fetch, frozen install, selected Prisma
  generation and compilation. Approved native install scripts remain enabled;
  workspace Prisma postinstall is replaced only in generated install manifests
  by explicit, selected-owner generation after install.
- Serializes build-stage dependency lifecycle scripts so the Prisma services do
  not open concurrent engine-download connections through Docker Desktop. This
  can make a cold install slower, while the dependency layer remains cached by
  the lockfile and manifests.
- Excludes host-generated proto TypeScript from the Docker context and regenerates it through the package-owned pinned toolchain before compiling `@nebula/protos`.
- Runs the same selected compilation union for each sequential image export in
  a requested batch, or `all` for a full-inventory request. Direct Compose/Bake
  targets default to their own graph; the explicit legacy override is diagnostic.
- Builds only declared shared prerequisites in dependency order, restores cached
  outputs and refreshes pnpm injected copies before consumers compile. This
  preserves runtime resolution when a cache hit skips pnpm's build hook. Root
  tooling source dependencies and shared production dependencies remain separate
  from selected application compilation.
- Uses a versioned Docker-only Turbo cache namespace so artifacts admitted by the runtime-import verifier are not mixed with older incompatible compiler output.
- Creates one production workspace dependency graph instead of per-runtime
  `pnpm deploy` trees.
- Keeps the large external production dependency layer keyed only by lockfiles and package manifests.
- Overlays compiled universal internal packages in separate small layers after dependency installation.
- Creates one runtime target per backend service.
- Verifies every declared internal package entry point while building each runtime target.
- Performs root-owned runtime setup once, then runs every service target as the
  built-in unprivileged `node` user.
- Keeps package managers in development/build stages but removes npm, npx,
  Corepack, pnpm, and Yarn from final runtime images; services start directly
  with Node and do not install packages after image creation.

The shared multi-target Dockerfile is the only backend image definition. The
obsolete root diagnostic Dockerfile and per-service Dockerfile copies were
removed; do not recreate them or maintain a parallel build path.

### Development And Runtime Optimization Boundary

The current Docker structure is deliberate. Preserve these decisions during
foundation development:

- Keep the full Debian/Node, pnpm, Prisma, compiler, test, shell, and debugging
  toolchain available on the host and in build stages.
- Keep final service images limited to compiled application artifacts and real
  production dependencies. Classifying a package as development-only must not
  remove it from normal local or build-stage installs.
- Retain the shared multi-target Dockerfile, inventory-backed sequential Bake
  runner, injected workspace packages, narrow Docker context, shared dependency
  layers, and non-root runtime. They intentionally minimize duplicate work,
  cache invalidation, image size, and Docker Desktop contention.
- Do not restore per-service Dockerfiles or grouped parallel local builds as a
  development shortcut. Individual services remain buildable through their
  existing shared Bake targets.
- Preserve Debian compatibility while the project foundations are still under
  development. A distroless/custom runtime, base-family replacement, or other
  restriction on runtime diagnosis is later release-hardening work and requires
  a separately reviewed compatibility need and explicit approval.

Development freedom and runtime minimization are separate concerns: removing an
unused tool from a final image is acceptable only when local development, build,
generation, testing, and diagnosis retain an owned path for that tool.

The common layers provide storage reuse, not a runtime dependency between
containers. Every image manifest contains its own copy of the required layer
references and remains independently pushable, pullable, savable, and runnable.
Only universal foundation packages belong in the internal-package overlay.
Tenant-specific or licensed feature implementations must use separate
module/service images and must not be added to that overlay.

This ordering is an integrity rule as well as a performance rule: compiled
first-party files must not be copied into `prod-deps` before `pnpm install`.
Doing so makes every shared-code edit recreate and reload the large production
dependency layer. `runtime-base` instead copies the stable dependency graph,
adds the allowed compiled package artifacts, and synchronizes those artifacts
into any prepared injected-workspace slots. A filtered production graph can
legitimately omit a slot for a package that a particular service does not use,
so slot absence is not itself an error. The same inventory-neutral loop copies
each shared package's installed production dependency links beside its compiled
output. Each runtime target then loads every internal dependency declared by
that service, catching missing entry points and transitive runtime packages
before the image is exported.

Runtime targets:

- `user-runtime`
- `auth-runtime`
- `settings-runtime`
- `media-runtime`
- `taxonomy-runtime`
- `product-runtime`
- `blog-runtime`
- `order-runtime`

Each runtime target exposes its HTTP and gRPC ports and runs:

```text
node dist/main.js
```

Each runtime target has an HTTP `/health/ready` Docker healthcheck. Readiness
returns HTTP `503` while a required local dependency is unavailable, so Docker
does not mark a degraded service healthy. `GET /health` remains a compatibility
alias, while `GET /health/live` reports process liveness only.

## Runtime Images

Runtime images are built from `docker/backend.Dockerfile` targets and tagged by Compose.

Current backend images:

- `nebulanv-main-user-service:latest`
- `nebulanv-main-auth-service:latest`
- `nebulanv-main-realm-auth-service:latest`
- `nebulanv-main-tenant-authority-service:latest`
- `nebulanv-main-settings-service:latest`
- `nebulanv-main-media-service:latest`
- `nebulanv-main-taxonomy-service:latest`
- `nebulanv-main-product-service:latest`
- `nebulanv-main-blog-service:latest`
- `nebulanv-main-order-service:latest`
- `nebulanv-main-gateway:latest`

The CI live job scans these exact local tags with pinned Trivy after the live
e2e suites and before Compose cleanup. `pnpm scan:images:backend` derives the
tags from the root inventory, scans all eleven even when an earlier image is
affected, and retains every `HIGH` or `CRITICAL` finding in the sanitized
evidence. During foundation development, application-package findings and
Debian OS findings with an available fixed version block the gate. Debian OS
findings without an available stable fix remain visible and are deferred to the
production-hardening backlog; scanner or report failures still block. The
command does not use `--ignore-unfixed`, rebuild, export, or upload an image.

Release archive also includes infrastructure images:

- `nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10` (pinned upstream/source recipe)
- `redis:7.4.12-bookworm` (digest pinned in Compose)
- The accepted SeaweedFS 4.51/go-jose 4.1.7 image.
- The digest-pinned Media scanner selected by Compose (fifteen unique selected
  references total, including eleven backends; initialization reuses Media).

The explicit legacy base adds MinIO/server-client instead of Seaweed and retains
sixteen references for rollback; ordinary selected archives do not include them.

D4 maintenance selects PostgreSQL 18.6 on Debian 13/Trixie with gosu 1.20,
and Redis 7.4.12 on supported Debian Bookworm. The published Redis Alpine
variant remains on Alpine 3.21 after its support end; the Redis engine branch
stays 7.4. The PostgreSQL vendor image is built from
`docker/postgres/security.Dockerfile`: exact official 18.6 base digest plus the
checksum/commit-pinned gosu source, compiled with pinned supported Go 1.26.10.
Only the helper is rebuilt; the database server and extensions remain upstream.
Build steps test patched parser code and actual UID/GID privilege switching.
Moby 0.4.1's published file-cap test fixture conflicts with its separate line
cap. The build applies the publisher's checksum/commit-pinned test-only fix in
an isolated module copy, runs the full parser suite and verifies every other
file unchanged. Runtime module bytes and checksum verification remain intact;
no test is skipped. The focused `helper-tests` build target can verify this
boundary without exporting the runtime image.
Native image scan, fresh database initialization, Prisma/seed and
session/replay acceptance remain pending in the
[maintenance report](reports/2026-10-31-dependency-maintenance-execution.md#d4-preparation---infrastructure-patch-boundaries-nov-3).
Do not treat source selection as a deployed upgrade. PostgreSQL 18 uses fresh
`pgdata18:/var/lib/postgresql` and inherited PGDATA `/var/lib/postgresql/18/docker`.
Salar permits discarding the seeded demo data; do not remount the old 17 cluster
as an 18 cluster. The old `pgdata` volume can be retired after fresh acceptance.
Retain Redis's existing anonymous `/data` volumes, scanner signatures and old image IDs.
Do not use `down -v`, `--renew-anon-volumes` or enable the dormant operator profile
for this patch. ClamAV 1.4.6 and accepted Seaweed inputs stay unchanged; scanner
signature freshness is a separate operational acceptance check.

### PostgreSQL 18 vendor image

Build the PostgreSQL vendor image before provisioning a fresh host or archiving
the selected stack (long execution belongs to Salar):

```powershell
docker buildx build --platform linux/amd64 --file docker/postgres/security.Dockerfile --tag nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10 --load --progress=plain docker/postgres
```

CI builds/loads this same recipe with an isolated bounded-writer cache and scans
it with the existing backend image policy before provisioning. Backend runtime
images are still a separate build; this adds no service or container. Release
archives discover the vendor image through effective Compose configuration.
The helper license, source commit, module versions, tests, binary metadata and
checksum are embedded under `/usr/share/nebula-vendor/gosu` (license separately
under `/usr/share/licenses/gosu`). The derivative image digest must be recorded
from the actual built/scanned artifact; no guessed canonical config digest.

**November 19, 2026 review:** PostgreSQL 19 GA is planned, subject to delay.
Recheck the final release, image/helper/compiler, Prisma/driver compatibility and
native migration/seed/runtime proofs. Retire the custom helper layer if a verified
official image satisfies the requirement. This is a review note, not an automatic
upgrade; [official schedule](https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/).

Nov 3 scanner refresh: both Compose defaults now select the official ClamAV
1.4.6 index `sha256:8ad6197396974726c35d017e50aaaaf4b91745726a04faec8480c203edd98052`.
Its Alpine 3.24.3 image passes the native HIGH/CRITICAL scan with zero findings;
the earlier image's three fixable package findings remain recorded. Running-image
replacement and fresh loaded definitions are still pending; the existing
signature volume/cooldown is preserved.

### Local Docker Hub mirrors

Salar's Windows Docker Desktop engine configuration at
`C:\Users\asus\.docker\daemon.json` selects Arvan then Liara:

```json
{
  "registry-mirrors": [
    "https://docker.arvancloud.ir",
    "https://docker-mirror.liara.ir"
  ]
}
```

This is the mirror fragment, not a replacement for the complete engine config.
Other settings, including enabled 40GB builder GC, are preserved. A private
before-change backup and the actual image metadata/blob probes are recorded in
the [maintenance execution report](reports/2026-10-31-dependency-maintenance-execution.md#docker-mirror-selection-and-local-configuration-preparation).
Both current Buildx builders use the integrated Docker driver; retain them and
their caches. The active engine now advertises both mirrors. After a timed-out
Desktop restart and partial restoration, direct starts recover sixteen healthy
containers and all eleven readiness probes with original IDs/images/mounts.
Native new-image pull/resolver checks remain pending. Future restarts stay
operator-owned and must verify each engine/service stage before proceeding.

These endpoints are documented by [Liara](https://docs.liara.ir/mirrors/docker/)
and [Arvan](https://www.arvancloud.ir/fa/dev/docker), with actual pinned Node,
PostgreSQL and ClamAV index/manifest/config hashes verified over normal HTTPS.
Full image-layer throughput is not benchmarked. Keep official image names and
immutable digests. No insecure-registry exception or logout is required.
Docker Hub mirrors do not redirect GHCR, Go/npm package downloads, apt/apk or
FreshClam signature requests. Standalone BuildKit builders, if later introduced,
need their own explicitly validated mirror settings.

## Selected Storage And Rollback Images

The selected local stack uses the accepted SeaweedFS 4.51/go-jose 4.1.7 image.
The complete selected archive has fifteen unique images: eleven backends plus
Postgres, Redis, the pinned scanner and Seaweed. Initialization reuses Media.
Keep the legacy MinIO pair only for the explicit retained rollback route:

- `minio/minio:latest` is the actual object storage server.
- `minio/mc:latest` is the MinIO client used by `minio-init` to create the media bucket.

`minio-init` is expected to exit after creating the bucket. It is not a long-running service.

## Database Model

For local databases that are already initialized and have their runtime roles
provisioned, use `pnpm db:prepare` to apply all nine owners' migrations, check
status and run base seeds. It reuses backend:boot's exact schema-owner connection
mapping and stops at the first failure, without building images or starting apps.
After the owner operations, it reruns the two existing client-only role
initializers so freshly created migration-history tables receive their intended
SELECT-only runtime grants. These clients reuse the local PostgreSQL image and
do not start dependencies or pull images.
Run it through the root pnpm script: plain Node or pnpm exec does not supply the
required npm_execpath lifecycle context on this Windows setup. Production mode
is refused. D1/D2 demo showcase seeds remain separate after application readiness.

Postgres service:

```text
nebulanv-vendor-postgres:18.6-gosu1.20-go1.26.10
```

Local host port:

```text
15432 -> 5432
```

Inside Docker, services connect to:

```text
postgres:5432
```

The init script creates:

- `nebula_users`
- `nebula_authority`
- `nebula_products`
- `nebula_settings`
- `nebula_blog`
- `nebula_order`
- `nebula_taxonomy`
- `nebula_media`

Important:

- `scripts/db/init-multiple-dbs.sh` runs only on first Postgres volume initialization.
- If the `pgdata18` volume already exists, changing the script will not recreate databases.
- The `tenant-authority-db-init` one-shot service closes that existing-volume gap only
  for the additive authority database/login. It never drops or recreates
  existing data and must complete before tenant-authority-service starts.
- Migrations are still a deliberate deployment step, not automatically solved by Compose.
- `nebula_authority_runtime` is a dedicated non-superuser login. It can connect
  only to `nebula_authority`; the inventory migration connection remains the
  schema owner. `AUTHORITY_DB_RUNTIME_PASSWORD` is required in release.
- `pnpm db:verify:migrations` and `pnpm test:database-recovery` operate only on guarded disposable `_verify_` databases.
- `pnpm db:backup` and `pnpm db:restore` cover nine inventory-owned databases
  plus the separate operator Realm Auth database (ten total). All eleven default
  backend runtimes and the optional operator shadow must be stopped.
- Restore requires `--confirm=RESTORE_LOCAL_DATABASES`; it never removes Docker volumes.
- These commands back up SQL only. Object bytes, Seaweed filer metadata and the
  private storage credential/configuration material need their own consistent
  recovery package; final acceptance belongs to the B4 release recovery gate.
- The canonical maintenance procedure and backup contents are documented in `docs/architecture/local-dev-and-docker-boot.md`.

## Media Storage Model

Persistent local Compose selection uses SeaweedFS through the generic s3 adapter.

Seaweed setup passes scoped S3 access, CORS and container recreation; the
302-object cutover and native processing/derivative/metadata/recovery acceptance
pass. Old MinIO is stopped with data retained for guarded rollback. Runtime tooling selects storage from the
effective Media internal endpoint plus its declared healthy dependency, never
from a container's mere existence. Release validation permits only the selected
store's data port and rejects management or unused-store publications. Use the selected storage/bootstrap/runtime overlays together; the bare
alongside fragment alone does not select Media or replace release acceptance.
Private scoped Media env enters only its own container. The complete recovery
package and current-snapshot hosted CI remain B4/B5.

Docker-internal media endpoint:

```text
http://seaweed:8333
```

Host/browser-facing media endpoint:

```text
http://127.0.0.1:19000
```

Media-service separates:

- `MEDIA_S3_INTERNAL_ENDPOINT`: container-to-selected-store access.
- `MEDIA_S3_PUBLIC_ENDPOINT`: signed URL endpoint visible to clients/tests.

Do not collapse these into one value unless the runtime environment actually uses one address for both internal and public access.

## Env Rules

Local Compose:

- Loads root `.env`, then the matching service-local `.env`; a service-local duplicate has higher `env_file` precedence.
- Applies explicit `environment` values after both env files.
- Keeps shared `HTTP_CORS_ORIGINS` in root `.env`; the shared Compose environment mapping injects that root value into all nine hybrid services.
- Overrides Docker-specific database URLs and internal service URLs in `environment`.

Release Compose:

- Uses `deploy/.env.production`.
- Does not use service-local `.env` files.
- Requires production secrets through env interpolation.
- Requires `HTTP_CORS_ORIGINS` from the deployment environment when direct browser origins are allowed.

Important env groups:

- Service identity: `SVC_NAME`
- Public behavior: `PUBLIC_MODE`
- S2S transport: `S2S_SIGNATURE_HEADER`, bounded clock skew, Redis replay settings
- Scoped trust: per-service `S2S_OUTBOUND_KEYS`, `S2S_INBOUND_KEYS`, and `GATEWAY_INBOUND_KEYS`
- User auth: JWT secrets
- Internal service registry: `*_GRPC_URL`
- Per-service database URLs
- Media S3-compatible storage settings
- Gateway public boundary: `GATEWAY_APPLICATION_REGISTRY_JSON`,
  `GATEWAY_OUTBOUND_KEYS`, `GATEWAY_REDIS_URL`, idempotency bounds,
  `GATEWAY_HTTP_PORT`, and fixed `MEDIA_RENDER_HTTP_URL`

Local Compose pins Gateway's Media render origin to `http://media-service:3007`.
The native `.env.example` origin uses loopback and is not a container target.

## Release Image Flow

Build images on a machine that can install dependencies:

```powershell
.\scripts\docker\build-backend.ps1
```

The script delegates to the inventory-backed runner in `scripts/backend.mjs`.
It invokes one official Bake target at a time and stops on the first failure.
The first target commits the shared build, production-dependency, and
runtime-base layers; the remaining targets reuse those layers and export one
image at a time. Normal builds preserve Docker, pnpm, and Turbo caches. `-Clean`
invalidates the first target's shared layers, then allows the remaining targets
to reuse the newly committed result.

This ordering is required for the supported Docker Desktop workflow. A grouped
`docker buildx bake backend --load` run on 2026-08-03 reached only 98 of 536
steps after about 700 seconds while separate service solves materialized the
same 1,029-package install and large runtime copies. The grouped run was stopped;
it is not the supported local build command. Final image export can still take
time, but sequential output identifies the exact target responsible.

The current-source 2026-08-22 `pnpm backend:boot` user gate completed all nine
sequential image targets, reached healthy/ready state for infrastructure and
all nine backend runtimes, and reported both idempotent demo records as
existing. Exact duration depends heavily on Docker layer and registry caches.

Save images:

```powershell
.\scripts\docker\save-release-images.ps1
```

The save script derives all runtime references from Compose, checks the eleven
backend inventory entries, and includes Postgres, Redis, Seaweed and the
pinned Media scanner: fifteen unique images in the persistent selected topology.
The explicit legacy base retains sixteen images including MinIO/client. The scanner is required for
release processing. Prefix/tag overrides are preserved; `-EnvFile` can supply the
image environment for another deployment. Local/release image expressions are
checked for exact parity. Use `-WhatIf` to verify the complete list without writing
an archive. Save uses a typed string array for Windows PowerShell compatibility.

Load images on deployment machine:

```powershell
.\scripts\docker\load-release-images.ps1
```

`-Input` remains supported as an alias for `-ArchivePath`; the internal variable
avoids PowerShell's automatic `$Input`. Explicit paths containing spaces are
validated through the actual wrapper before native archive execution.

Start release stack:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml up -d --no-build
```

## Agent Guardrails

- Do not add `build:` blocks to `docker-compose.release.yml`.
- Do not put real secrets in committed env files.
- Do not assume host URLs work inside containers.
- Do not assume Docker DNS names work from the host.
- Do not remove `minio/mc`; it is used by the one-shot bucket initializer.
- Do not replace `MEDIA_S3_PUBLIC_ENDPOINT` with `minio:9000`; signed URLs need a client-reachable host.
- Do not rely on Postgres init scripts after the volume already exists.
- Keep app containers stateless; persistent data belongs in external services or Docker volumes.
- Treat the shared/sequential/injected Docker build design as an intentional
  build-time and image-size optimization, not stale development scaffolding.
- Keep development and build tools available outside final runtime images; do
  not trade away the active development workflow merely to make a scanner green.
- Keep shared runtime content limited to universal foundation contracts, clients, configuration, and transport/security helpers.
- Keep proprietary licensed modules out of core service images unless that image is explicitly the purchased module artifact.
- Keep Compose release compatible with future Kubernetes expectations: env-driven config, externalized state, no app-local persistent files.
- Use PowerShell-safe commands in docs and scripts. Do not write Bash-style `&&` command chains in PowerShell examples.

## Verification Commands

Local Compose config check:

```powershell
docker compose config
```

Build local images:

```powershell
.\scripts\docker\build-backend.ps1
```

Cross-platform direct equivalent:

```powershell
pnpm docker:build:backend
```

Preview or build only selected targets:

```powershell
pnpm docker:build:backend order-service gateway --plan
pnpm docker:build:backend order-service gateway
.\scripts\docker\build-backend.ps1 -Services order-service,gateway -Plan
```

The plan makes no Docker calls. Selected builds stay sequential, report elapsed
seconds and stop on the first error. Omitting service names still selects the
full inventory with one shared full compilation. Partial-request application
compilation uses one canonical union of the selected applications and required
shared producers. All eleven targets use the accepted graph for selected
fetch/install/Prisma/compile; standalone Compose builds retain leaf selection.
Native isolation/closure and hosted acceptance pass in the
[ASAP cleanup](ASAP-BUILD-CLEANUP.md). The reusable production dependency layer
remains backend-wide; alternative packaging is a Segment 4 measured decision.

Deliberate cold build:

```powershell
.\scripts\docker\build-backend.ps1 -Clean
```

Start local stack:

```powershell
pnpm backend:boot
```

This is the supported complete workflow and includes the Bake image build,
migrations, migration status, base seeds, readiness, and API demo seed. For an
existing-database restart with already-built images, use:

```powershell
docker compose up -d --no-build
```

Check containers:

```powershell
docker compose ps -a
```

Check readiness or stop containers while preserving named volumes:

```powershell
pnpm backend:health
pnpm backend:down
```

Release config check:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml config
```

Release start without build:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml up -d --no-build
```

## CI build-cache boundary (2026-10-26)

The eleven-image shared-graph build and offline packaged imports pass locally;
unchanged warm full batch takes 111.1s with cached RUNs and unchanged app/config
bytes. CI now restores the host `.turbo/cache` in both jobs, saving only successful
main pushes with at most 1GiB. OS/architecture/policy/commit keys keep host cache
identity explicit. This is distinct from Docker's local Turbo/pnpm cache mounts.

Before broad suites or provisioning, quality also runs
`node scripts/check-backend-test-types.mjs`. It checks every live owner's test
and helper files with no emit or startup hooks; source-only build checks omit
those inputs. Shared package outputs and owner Prisma clients must already exist.

Only the live CI job loads `.github/backend-cache.hcl` using `BUILDX_BAKE_FILE`,
with the normal Compose/Bake files first. Independent per-image GHA v2 scopes
retain max-mode build layers; PRs import only and main pushes can export.
Pinned Buildx/BuildKit use a cleanup-enabled container builder. Local Compose/
Bake and the approved Desktop resource/cache budgets are unchanged. No new
registry credentials or paid repository cache allowance is configured.

Docker exports do not persist cache mounts across new builders. Actual host and
BuildKit cache round trips now pass across hosted runners. All eleven cached
exports took 101.5s; the final OS-patched image run took 151.7s. Existing quality,
F3/live, image scans, tracked-diff and
14-day allowlisted evidence gates remain. Successful live scans are followed by
`.ci-evidence/backend-tested-images.json`, which records image IDs/digests without
Config/env/labels. Detailed trace and local checks:
[CI cache receipt](reports/2026-10-26-build-cleanup-ci-cache.md).
Segment 3 is closed on `7035545`; the complete hosted workflow and sixteen-image
archive pass. [Exit proof](reports/2026-10-27-build-cleanup-segment3-exit.md).

### Published CI MinIO baseline (2026-10-27; retained history)

The following describes the older published workflow, not current local storage.
The prepared Seaweed workflow uses the verified durable vendor release and
selected fifteen-image topology; whole-snapshot hosted acceptance remains B5.
See [the transition receipt](reports/2026-10-28-seaweedfs-transition.md).

Upstream pulls currently fail. The live CI job downloads the approved
`vendor-minio-20250907` prerelease asset from `pain1122/nebulaNV`, verifies its
pinned SHA-256 before Docker load, then checks both recorded image identities.
`.github/minio-offline.yml` sets `pull_policy: never` for MinIO and its bucket-init
client only. Original image references, volume definitions, credentials inputs,
health checks and the sixteen-image release inventory are retained. This overlay
is CI-only; local and release startup do not inherit it automatically.

The archive is outside the source/build context and contains the two unchanged
linux/amd64 vendor images, without project env files or volumes. This preserves
the tested binaries; it is not an upstream maintenance or security update.
[Supply/provenance and validation receipt](reports/2026-10-26-minio-image-availability.md).

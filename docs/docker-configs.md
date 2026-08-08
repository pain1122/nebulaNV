# Docker Configs

## Purpose

This file summarizes the Docker files an agent should check before changing backend boot, release packaging, image names, ports, or runtime env behavior.

Use this as a map. Do not duplicate full deployment instructions here; detailed release flow lives in `deploy/README.md`.

## Main Files

- `docker-compose.yml`: local/dev backend stack with build blocks.
- `docker-bake.hcl`: official eight-image backend target set.
- `docker-compose.release.yml`: release stack with prebuilt/preloaded images only.
- `docker/backend.Dockerfile`: shared multi-stage backend image builder.
- `.dockerignore`: root Docker build context filter.
- `scripts/docker/build-backend.ps1`: cached/clean PowerShell build entry point.
- `deploy/.env.production.example`: release env template.
- `deploy/README.md`: image-save/load release runbook.
- `scripts/docker/save-release-images.ps1`: saves release images into `deploy/nebula-images.tar`.
- `scripts/docker/load-release-images.ps1`: loads `deploy/nebula-images.tar`.
- `scripts/db/init-multiple-dbs.sh`: creates per-service Postgres databases on first volume init.
- Root `package.json` field `nebula.backendServices`: tooling-owned backend package, database, image, and port inventory.
- `scripts/backend.mjs`: inventory-backed provisioning, Prisma, development, database verification/recovery, release-image, and security-scan command source.

## Local Compose

File:

`docker-compose.yml`

Purpose:

- Builds backend service images from local source.
- Starts local infrastructure: Postgres, Redis, MinIO, and MinIO bucket init.
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
```

Host ports expose the services for local tests and browser access.

## Release Compose

File:

`docker-compose.release.yml`

Purpose:

- Runs prebuilt images only.
- Has no `build:` blocks.
- Reads deployment values from `deploy/.env.production`.
- Uses required env interpolation for production secrets.
- Keeps runtime state in Docker volumes.
- Uses the same Docker service DNS model for internal gRPC and database URLs.

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
- Uses `node:22-bookworm` for build stages.
- Enables pnpm through corepack.
- Uses `pnpm fetch` for dependency cache.
- Copies package manifests first for better Docker layer caching.
- Copies Prisma schemas before install because workspace postinstall runs Prisma generation.
- Excludes host-generated proto TypeScript from the Docker context and regenerates it through the package-owned pinned toolchain before compiling `@nebula/protos`.
- Runs one shared backend build through Turbo.
- Builds the four small shared runtime packages before the cached Turbo service build. This refreshes pnpm's injected workspace copies even when Turbo would otherwise restore a shared-package build and skip its post-build synchronization hook.
- Uses a versioned Docker-only Turbo cache namespace so artifacts admitted by the runtime-import verifier are not mixed with older incompatible compiler output.
- Creates one production workspace dependency graph instead of eight sequential `pnpm deploy` trees.
- Keeps the large external production dependency layer keyed only by lockfiles and package manifests.
- Overlays compiled universal internal packages in separate small layers after dependency installation.
- Creates one runtime target per backend service.
- Verifies every declared internal package entry point while building each runtime target.
- Performs root-owned runtime setup once, then runs every service target as the
  built-in unprivileged `node` user.

The shared multi-target Dockerfile is the only backend image definition. The
obsolete root diagnostic Dockerfile and per-service Dockerfile copies were
removed; do not recreate them or maintain a parallel build path.

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
- `nebulanv-main-settings-service:latest`
- `nebulanv-main-media-service:latest`
- `nebulanv-main-taxonomy-service:latest`
- `nebulanv-main-product-service:latest`
- `nebulanv-main-blog-service:latest`
- `nebulanv-main-order-service:latest`

The CI live job scans these exact local tags with pinned Trivy after the live
e2e suites and before Compose cleanup. `pnpm scan:images:backend` derives the
tags from the root inventory, scans all eight even when an earlier image is
affected, and fails for any `HIGH` or `CRITICAL` OS or application-package
finding. It does not rebuild, export, or upload an image and does not ignore
unfixed findings.

Release archive also includes infrastructure images:

- `postgres:17`
- `redis:7-alpine`
- `minio/minio:latest`
- `minio/mc:latest`

## MinIO Images

Keep both MinIO images:

- `minio/minio:latest` is the actual object storage server.
- `minio/mc:latest` is the MinIO client used by `minio-init` to create the media bucket.

`minio-init` is expected to exit after creating the bucket. It is not a long-running service.

## Database Model

Postgres service:

```text
postgres:17
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
- `nebula_products`
- `nebula_settings`
- `nebula_blog`
- `nebula_order`
- `nebula_taxonomy`
- `nebula_media`

Important:

- `scripts/db/init-multiple-dbs.sh` runs only on first Postgres volume initialization.
- If the `pgdata` volume already exists, changing the script will not recreate databases.
- Migrations are still a deliberate deployment step, not automatically solved by Compose.
- `pnpm db:verify:migrations` and `pnpm test:database-recovery` operate only on guarded disposable `_verify_` databases.
- `pnpm db:backup` and `pnpm db:restore` cover the seven inventory-owned local databases and require all eight backend services to be stopped.
- Restore requires `--confirm=RESTORE_LOCAL_DATABASES`; it never removes Docker volumes.
- The canonical maintenance procedure and backup contents are documented in `docs/architecture/local-dev-and-docker-boot.md`.

## Media Storage Model

Local Compose uses MinIO as an S3-compatible backend.

Docker-internal media endpoint:

```text
http://minio:9000
```

Host/browser-facing media endpoint:

```text
http://127.0.0.1:9000
```

Media-service separates:

- `MEDIA_S3_INTERNAL_ENDPOINT`: container-to-MinIO access.
- `MEDIA_S3_PUBLIC_ENDPOINT`: signed URL endpoint visible to clients/tests.

Do not collapse these into one value unless the runtime environment actually uses one address for both internal and public access.

## Env Rules

Local Compose:

- Loads root `.env`, then the matching service-local `.env`; a service-local duplicate has higher `env_file` precedence.
- Applies explicit `environment` values after both env files.
- Keeps shared `HTTP_CORS_ORIGINS` in root `.env`; the shared Compose environment mapping injects that root value into all eight services.
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

The completed 2026-08-03 `pnpm backend:boot` user gate took roughly 30 minutes
with warm dependency content: all eight sequential image targets completed,
Compose reached healthy state for MinIO and every backend service, and the
idempotent API demo seed completed.

Save images:

```powershell
.\scripts\docker\save-release-images.ps1
```

The save script derives the eight backend image names from the root inventory;
the Postgres, Redis, and MinIO images remain explicit infrastructure entries.

Load images on deployment machine:

```powershell
.\scripts\docker\load-release-images.ps1
```

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

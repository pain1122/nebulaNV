
# Docker Configs

## Purpose

This file summarizes the Docker files an agent should check before changing backend boot, release packaging, image names, ports, or runtime env behavior.

Use this as a map. Do not duplicate full deployment instructions here; detailed release flow lives in `deploy/README.md`.

## Main Files

- `docker-compose.yml`: local/dev backend stack with build blocks.
- `docker-compose.release.yml`: release stack with prebuilt/preloaded images only.
- `docker/backend.Dockerfile`: shared multi-stage backend image builder.
- `.dockerignore`: root Docker build context filter.
- `deploy/.env.production.example`: release env template.
- `deploy/README.md`: image-save/load release runbook.
- `scripts/docker/save-release-images.ps1`: saves release images into `deploy/nebula-images.tar`.
- `scripts/docker/load-release-images.ps1`: loads `deploy/nebula-images.tar`.
- `scripts/db/init-multiple-dbs.sh`: creates per-service Postgres databases on first volume init.

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
- Runs one shared backend build through Turbo.
- Runs `pnpm deploy --prod` into `/out/<service>`.
- Creates one runtime target per backend service.

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

Each runtime target has an HTTP `/health` Docker healthcheck.

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

- Uses root `.env`.
- Uses service-local `.env`.
- Overrides Docker-specific database URLs and internal service URLs in `environment`.

Release Compose:

- Uses `deploy/.env.production`.
- Does not use service-local `.env` files.
- Requires production secrets through env interpolation.

Important env groups:

- Service identity: `SVC_NAME`
- Public behavior: `PUBLIC_MODE`
- S2S/auth: `GATEWAY_HEADER`, `GATEWAY_SECRET`, `S2S_SECRET`, JWT secrets
- Internal service registry: `*_GRPC_URL`
- Per-service database URLs
- Media S3-compatible storage settings

## Release Image Flow

Build images on a machine that can install dependencies:

```powershell
docker compose build
```

Save images:

```powershell
.\scripts\docker\save-release-images.ps1
```

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
- Keep Compose release compatible with future Kubernetes expectations: env-driven config, externalized state, no app-local persistent files.
- Use PowerShell-safe commands in docs and scripts. Do not write Bash-style `&&` command chains in PowerShell examples.

## Verification Commands

Local Compose config check:

```powershell
docker compose config
```

Build local images:

```powershell
docker compose --progress=plain build --provenance=false --sbom=false
```

Start local stack:

```powershell
docker compose up -d --force-recreate
```

Check containers:

```powershell
docker compose ps -a
```

Release config check:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml config
```

Release start without build:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml up -d --no-build
```

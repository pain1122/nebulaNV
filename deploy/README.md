# Nebula Docker Release Flow

This release path is for servers where you do not want Docker to build images or download npm dependencies.

The deployable package is:

- `docker-compose.release.yml`
- `deploy/.env.production`
- `deploy/nebula-images.tar`
- `scripts/db/init-multiple-dbs.sh`
- `scripts/db/ensure-tenant-authority-db.sh`

> F3 Batch 6 checkpoint: the nine-image inventory, gateway Compose runtime,
> release reachability boundary, and image-archive path are implemented and
> covered by rendered-Compose/tooling checks. Rebuild the images after source
> changes before starting a live release stack.

F3's generated-client and current-web compatibility gates are source/contract
checks. Before promoting a rebuilt release candidate, also run the bounded
`pnpm test:f3:live` flow against the provisioned development candidate and the
normal live/e2e lane. The final image scan must examine the same rebuilt images
that will be archived.

## 1. Build Images On A Machine With Internet

From the repository root:

```powershell
.\scripts\docker\build-backend.ps1
```

This is the supported Docker Desktop build path. It validates Compose, derives
the backend targets from the root inventory, and runs the official Bake targets
sequentially so expensive shared dependency/runtime layers are reused. Use
`-Pull` to refresh base images or `-Clean` to invalidate the first target's
shared layers deliberately.

## 2. Save Images Into One Archive

```powershell
.\scripts\docker\save-release-images.ps1
```

Verify the complete list and repository-root resolution without writing a tar:

```powershell
.\scripts\docker\save-release-images.ps1 -WhatIf
```

This creates:

```text
deploy/nebula-images.tar
```

It includes:

- The ten backend runtime images. The F3 archive contained nine; F4 adds the
  tenant-authority-service foundation image.
- `postgres:17`
- `redis:7-alpine`
- `minio/minio:latest`
- `minio/mc:latest`

## 3. Prepare Production Env

```powershell
Copy-Item deploy\.env.production.example deploy\.env.production
```

Edit `deploy/.env.production` and replace every `change-me-*` value with real secrets.

Important: keep `deploy/.env.production` private. Commit only `deploy/.env.production.example`.

## 4. Copy Files To The Server

Copy these files/folders to the server:

```text
docker-compose.release.yml
deploy/.env.production
deploy/nebula-images.tar
scripts/db/init-multiple-dbs.sh
scripts/db/ensure-tenant-authority-db.sh
```

Keep the same relative paths, or update the volume path in `docker-compose.release.yml`.

## 5. Load Images On The Server

```powershell
.\scripts\docker\load-release-images.ps1
```

Or directly:

```powershell
docker load -i deploy\nebula-images.tar
```

## 6. Start The Stack Without Building

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml up -d --no-build
```

Check status:

```powershell
docker compose --env-file deploy\.env.production -f docker-compose.release.yml ps -a
```

## Notes

- `docker-compose.release.yml` has no `build:` blocks. It runs only preloaded images.
- Release publishes the gateway API and bundled MinIO data endpoint only;
  authority and other backend HTTP/gRPC, PostgreSQL, Redis, and MinIO console
  ports remain private.
- Replace the example HTTPS application origins and every placeholder secret
  before deployment.
- `GATEWAY_APPLICATION_REGISTRY_JSON` is required deployment configuration in
  F3. Public client IDs are not secrets; records must still be reviewed for
  exact origins, fixed tenant/site/channel mapping, enabled state, and profile.
  F4 replaces this static adapter with persistent authority rather than making
  client-supplied context trusted.
- Runtime dependencies are inside the backend images because the shared
  `prod-deps` stage runs a frozen, filtered `pnpm install --prod --offline`
  before the compiled first-party artifacts are assembled into each image.
- Database data is stored in Docker volumes, not inside app images.
- `AUTHORITY_DB_RUNTIME_PASSWORD` provisions the dedicated non-superuser
  `nebula_authority_runtime` login on the first Postgres volume initialization.
  It is not the migration administrator password. Use a 32-128 character
  random value containing only letters, digits, `_`, and `-`; the same exact
  bytes are used for role provisioning and the Prisma URL.
- Migrations still need a proper deployment step. For now, run migrations deliberately before promoting a real production stack.
- If `POSTGRES_PASSWORD` contains URL-special characters, URL-encode it before
  using it in database URLs. Do not URL-encode
  `AUTHORITY_DB_RUNTIME_PASSWORD`; its contract is already URL-safe.

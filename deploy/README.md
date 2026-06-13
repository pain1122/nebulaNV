# Nebula Docker Release Flow

This release path is for servers where you do not want Docker to build images or download npm dependencies.

The deployable package is:

- `docker-compose.release.yml`
- `deploy/.env.production`
- `deploy/nebula-images.tar`
- `scripts/db/init-multiple-dbs.sh`

## 1. Build Images On A Machine With Internet

From the repository root:

```powershell
docker compose build
```

The normal `docker-compose.yml` has `build:` blocks and stable `image:` names. That means this command builds and tags the backend images.

## 2. Save Images Into One Archive

```powershell
.\scripts\docker\save-release-images.ps1
```

This creates:

```text
deploy/nebula-images.tar
```

It includes:

- The eight backend runtime images.
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
- Runtime dependencies are inside the backend images because `docker/backend.Dockerfile` uses `pnpm deploy --prod`.
- Database data is stored in Docker volumes, not inside app images.
- Migrations still need a proper deployment step. For now, run migrations deliberately before promoting a real production stack.
- If `POSTGRES_PASSWORD` contains URL-special characters, URL-encode it before using it in database URLs.

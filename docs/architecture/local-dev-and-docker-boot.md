# Local Dev And Docker Boot

Last checked: 2026-05-28

This document explains how the backend starts locally and in Docker.

It intentionally avoids listing secret values. Environment variable names are safe to document; secret values are not.

## Service Port Map

Current service ports from app `.env` files:

| Service | HTTP Port | gRPC Port |
| --- | ---: | ---: |
| user-service | 3100 | 50051 |
| auth-service | 3001 | 50052 |
| product-service | 3003 | 50053 |
| settings-service | 3010 | 50054 |
| blog-service | 3004 | 50055 |
| order-service | 3005 | 50056 |
| taxonomy-service | 3006 | 50057 |
| media-service | 3007 | 50058 |

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

| Script | Waits On |
| --- | --- |
| `dev:auth` | nothing |
| `dev:user` | auth gRPC `50052` |
| `dev:settings` | auth gRPC `50052` |
| `dev:taxonomy` | auth gRPC `50052`, settings gRPC `50054` |
| `dev:media` | auth gRPC `50052` |
| `dev:blog` | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057` |
| `dev:product` | auth gRPC `50052`, settings gRPC `50054`, taxonomy gRPC `50057` |
| `dev:order` | auth gRPC `50052`, settings gRPC `50054`, product gRPC `50053` |

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
- `S2S_SECRET`
- `S2S_ALLOWED_SERVICES`
- `GATEWAY_HEADER`
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
- `GATEWAY_SECRET`
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

Core app services without a `full` profile:

- `user-service`
- `auth-service`
- `settings-service`
- `media-service`

Services currently behind the `full` profile:

- `taxonomy-service`
- `blog-service`
- `product-service`
- `order-service`

To start the default stack:

```powershell
docker compose up -d --build
```

To include full-profile services:

```powershell
docker compose --profile full up -d --build
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

## Dockerfiles

There are two Dockerfile patterns.

Shared optimized backend Dockerfile:

```txt
docker/backend.Dockerfile
```

Currently used in compose by:

- `user-service`
- `auth-service`
- `settings-service`
- `media-service`

Per-service Dockerfiles:

```txt
apps/product-service/Dockerfile
apps/taxonomy-service/Dockerfile
apps/blog-service/Dockerfile
apps/order-service/Dockerfile
```

These build a single service and its workspace dependencies.

## Prisma Generation

Root scripts currently include Prisma commands for:

- user-service
- product-service
- settings-service

Some service Dockerfiles also run service-local Prisma generation.

When adding a service with Prisma, check:

- service package scripts
- root Prisma scripts
- Dockerfile Prisma generation
- Docker Compose `DATABASE_URL`
- Docker Compose init database list

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
4. Check whether the needed service is hidden behind the `full` profile.

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


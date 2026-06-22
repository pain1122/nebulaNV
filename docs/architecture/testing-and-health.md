# Testing And Health

Last reviewed: 2026-06-17

Purpose: define how NebulaNV proves each service is alive, connected, authorized correctly, and still honoring its HTTP/gRPC contract.

This is the quick operational map. Service-specific behavior lives in `docs/services/*.md`.

## Core Rule

Testing is part of the contract.

When behavior changes, update the matching tests in the same slice:

- HTTP route behavior.
- gRPC method behavior.
- auth/role behavior.
- S2S metadata/signature behavior.
- database behavior.
- Docker/runtime behavior.
- object storage behavior for media.

Do not weaken a test just to make it pass. First decide whether the code is wrong, the test is stale, the contract changed, or the environment is not ready.

## Standard Commands

Build one service:

```powershell
pnpm --filter @nebula/<service> build
```

Lint one service:

```powershell
pnpm --filter @nebula/<service> lint
```

Auto-fix simple lint/format issues:

```powershell
pnpm --filter @nebula/<service> lint:fix
```

Run one service's tests:

```powershell
pnpm --filter @nebula/<service> test -- --runInBand
```

Run one test file:

```powershell
pnpm --filter @nebula/<service> test -- test/path/file.spec.ts
```

Proto checks:

```powershell
pnpm -w proto:check
pnpm -w proto:gen
```

Docker smoke:

```powershell
docker compose config
docker compose up -d --build
docker compose ps -a
```

Targeted Docker rebuild/recreate:

```powershell
docker compose build <service>
docker compose up -d --force-recreate --no-deps <service>
docker compose ps <service>
docker compose logs --tail=100 <service>
```

If using `--no-deps`, verify required dependencies are already running.

## Test Layers

| Layer | Proves | Examples |
| --- | --- | --- |
| Build | TypeScript and generated imports line up | `pnpm --filter @nebula/auth-service build` |
| Lint | Formatting, unsafe typing, style drift | `pnpm --filter @nebula/media-service lint` |
| Unit/security | Guard, Redis/session, pure service behavior | Auth Redis/security specs |
| HTTP e2e | REST routes and role behavior | `test/http/*.e2e.spec.ts` |
| gRPC e2e | Service-to-service contract and status codes | `test/grpc/*.e2e.spec.ts` |
| Docker smoke | Runtime env, image, healthcheck, dependencies | `docker compose ps`, `/health` |

Current expectation: source lint errors should be fixed. Some test files may still have warning-level loose typing while contracts are being stabilized.

## Current HTTP Health Model

Every backend service exposes HTTP `/health`.

| Service | DB Check | Current Response Notes |
| --- | --- | --- |
| auth-service | No | `{ status: "ok", time }` |
| user-service | Yes | `SELECT 1`; returns `degraded` body on DB error |
| settings-service | No | `{ status: "ok", time }` |
| taxonomy-service | Yes | `SELECT 1`; returns `degraded` body on DB error |
| product-service | Yes | `SELECT 1`; returns `degraded` body on DB error |
| blog-service | Yes | `SELECT 1`; returns `degraded` body on DB error |
| order-service | Yes | `SELECT 1`; returns `degraded` body on DB error |
| media-service | No | `{ status: "ok", time }`; no S3/MinIO check yet |

Important: DB-aware health controllers currently return a JSON body with `status: "degraded"` when DB fails, but they do not necessarily return an HTTP error. Health scripts should inspect the JSON body, not only status code.

## Docker Healthchecks

`docker/backend.Dockerfile` defines runtime healthchecks for backend runtime targets.

| Runtime Target | Health URL |
| --- | --- |
| user-runtime | `http://localhost:3100/health` |
| auth-runtime | `http://localhost:3001/health` |
| settings-runtime | `http://localhost:3010/health` |
| media-runtime | `http://localhost:3007/health` |
| taxonomy-runtime | `http://localhost:3006/health` |
| product-runtime | `http://localhost:3003/health` |
| blog-runtime | `http://localhost:3004/health` |
| order-runtime | `http://localhost:3005/health` |

Infra healthchecks:

| Container | Healthcheck |
| --- | --- |
| postgres | `pg_isready -U postgres` |
| redis | `redis-cli ping` |
| minio | No direct compose healthcheck currently |
| minio-init | One-shot bucket setup; expected exit `0` |

## gRPC Readiness

Current proto-level `Ping` methods:

| Proto | Method |
| --- | --- |
| `media.proto` | `MediaService.Ping` |
| `order.proto` | `OrderService.Ping` |

Current setup behavior:

- Media-service setup checks open ports, HTTP `/health`, and gRPC `Ping`.
- Most other service setup files only check required ports.
- Port-open checks prove a socket is listening, not that the service can process a real gRPC method.

Target: every service should eventually have a cheap gRPC readiness method or standard readiness contract.

## Current Test Inventory

| Service | HTTP Tests | gRPC/Security Tests |
| --- | --- | --- |
| auth-service | `test/app.spec.ts`, auth HTTP/gRPC flow | Redis/security specs, JWT guard specs |
| user-service | `test/http/user.http.e2e.spec.ts` | `test/grpc/user.e2e.spec.ts` |
| settings-service | `test/http/settings.http.e2e.spec.ts` | `test/grpc/settings.e2e.spec.ts` |
| taxonomy-service | `test/http/taxonomy.http.e2e.spec.ts` | `test/grpc/taxonomy.e2e.spec.ts` |
| media-service | `test/http/media.http.e2e.spec.ts` | `test/grpc/media.e2e.spec.ts` |
| product-service | `test/http/product.http.e2e.spec.ts`, taxonomy HTTP | product/taxonomy gRPC |
| blog-service | `test/http/blog.http.e2e.spec.ts`, taxonomy HTTP | blog/taxonomy gRPC |
| order-service | `test/http/order.http.e2e.spec.ts` | `test/grpc/order.e2e.spec.ts` |

## Dependency Notes

| Service Tests | Usually Need |
| --- | --- |
| auth-service | user-service, Redis, Postgres |
| user-service | auth HTTP/gRPC, user-service HTTP/gRPC, Postgres |
| settings-service | auth HTTP, settings HTTP/gRPC, Postgres |
| taxonomy-service | auth HTTP, settings HTTP/gRPC, taxonomy runtime, Postgres |
| media-service | auth HTTP/gRPC, media HTTP/gRPC, MinIO/S3, Postgres |
| product-service | auth, settings, taxonomy, product runtime, Postgres |
| blog-service | auth, settings, taxonomy, blog runtime, Postgres |
| order-service | auth, settings, product, order runtime, Postgres |

Exact setup files live under each service's `test/setup/wait-for-services.ts`.

## Database Migration Pattern

Per-service Prisma commands usually look like:

```powershell
pnpm --filter @nebula/<service> prisma:migrate:deploy
pnpm --filter @nebula/<service> prisma:gen
```

When running host commands against Docker Postgres, temporarily override `DATABASE_URL` and `SHADOW_DATABASE_URL` in the shell. Do not permanently replace service-local `.env` files with Docker-only URLs.

See `docs/architecture/local-dev-and-docker-boot.md` for the full host-vs-container DB URL explanation.

## Search And Shell Reliability

Use `rg --files` before reading paths. Do not infer file paths from class names, proto names, or conceptual feature names.

PowerShell-safe patterns:

```powershell
rg --files apps\product-service | rg "taxonomy"
Get-Content -Raw apps\product-service\src\taxonomy\taxonomy.service.ts
```

Do not use Bash-style `&&` command chaining in PowerShell. Use separate commands or `;` only when sequential execution is safe.

Good:

```powershell
git add -A AI_CONTEXT.md docs
git status --short
```

Also acceptable when the first command does not need to gate the second:

```powershell
git add -A AI_CONTEXT.md docs; git status --short
```

Avoid shell glob assumptions that work in bash but fail in PowerShell.

Prefer explicit paths and repo searches over commands like:

```powershell
cat apps/*/src/**/*.ts
```

Exclude noise in large searches:

```powershell
rg -n --glob '!node_modules/**' --glob '!dist/**' --glob '!generated/**' --glob '!coverage/**' "pattern" apps packages docs
```

## Manual Verification Flow

For a service contract change:

1. Build the service.
2. Lint the service.
3. Run the service's focused test file.
4. Recreate the Docker container if Docker behavior changed.
5. Check `docker compose ps <service>`.
6. Check `/health` body, not only HTTP status.
7. Run HTTP and gRPC tests for that service.
8. Run dependent service tests if the contract is consumed elsewhere.

Example:

```powershell
pnpm --filter @nebula/user-service build
pnpm --filter @nebula/user-service lint
pnpm --filter @nebula/user-service test -- test/grpc/user.e2e.spec.ts
```

## Current Gaps

- Not every `/health` checks database connectivity.
- Media health does not yet check S3/MinIO/Supabase connectivity.
- Most services do not have gRPC `Ping` readiness.
- Some tests still use loose `any` and rely on lint warnings.
- Direct taxonomy-service write auth needs explicit launch review.
- Some setup files only wait on ports instead of real readiness methods.
- No single root smoke script yet verifies all HTTP health, gRPC readiness, DB, Redis, and object storage.

## Contract Change Checklist

When a contract changes:

- Update proto if gRPC changed.
- Regenerate proto outputs.
- Update DTOs if HTTP changed.
- Update service mapper/types.
- Update related service docs.
- Update HTTP tests.
- Update gRPC tests.
- Update Docker/env docs if ports or URLs changed.
- Verify dependent services that call the changed contract.

## Media-Specific Checklist

For media-service changes, verify:

- Public read behavior.
- Protected/strict read behavior.
- Signed URL TTL behavior.
- Upload presign behavior.
- Finalize behavior.
- S3/MinIO object path behavior.
- Public endpoint versus internal endpoint behavior.
- Admin filemanager route behavior.
- Future Supabase/AWS compatibility assumptions.

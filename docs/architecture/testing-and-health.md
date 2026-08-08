# Testing And Health

Last reviewed: 2026-08-08

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

Run the F2 backend-only quality commands:

```powershell
pnpm lint:backend
pnpm check-types:backend
pnpm build:backend
```

These commands derive the eight backend workspace filters and their package
dependencies from the root inventory. They deliberately exclude the postponed
`apps/web` prototype. The unqualified root commands remain available for work
that intentionally includes every workspace.

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

Container-free focused security tests:

```powershell
pnpm test:security
```

Provision and run the separate live integration/e2e lane:

```powershell
pnpm backend:boot
pnpm test:e2e
```

`pnpm test:e2e:provision` remains a compatibility alias for `backend:boot`.
The command delegates to `scripts/backend.mjs`; the same backend inventory
supplies its ordered migrations, database checks, base seeds, and eight
readiness URLs. It waits for healthy infrastructure and every expected
database, runs migration deploy and status, applies the base seeds, builds the
official Bake targets sequentially, starts Compose with `--no-build`, waits for
healthy responses, and runs the API demo seed. A separate backend build or seed
is therefore unnecessary immediately before provisioning.

`pnpm test:e2e` first runs the existing inventory-backed `build:backend`
command so a clean host workspace has the internal-package `dist` entry points
required by Jest. It then runs the service e2e scripts sequentially. Do not add
separate Jest aliases or maintain another shared-package list for this step.

CI uses the same backend-only lint, type, source-build, proto, focused security,
Compose-validation, `backend:boot`, and `test:e2e` entry points. The quality job
also fails if generation or verification changes tracked files.

## Backend Security Gates

F2 keeps the postponed `apps/web` prototype outside the backend gates. The
existing root backend inventory is also the source for dependency selection and
the eight image tags; do not maintain a second service or image list.

```powershell
pnpm scan:dependencies:backend
pnpm scan:source:backend
pnpm scan:images:backend
```

- `scan:dependencies:backend` runs the pnpm production audit, classifies every
  high/critical package-version finding as backend runtime, backend tooling, or
  deferred web, and fails for any backend-runtime finding. Optional Prisma CLI
  peers are tooling and are not misclassified as deployed runtime packages.
- `scan:source:backend` uses pinned Trivy to detect high/critical secrets and
  configuration defects. It excludes `apps/web`, materialized local env files,
  dependencies, generated/build output, coverage, and vendored frontend assets;
  tracked `.env.example` contracts remain in scope.
- `scan:images:backend` uses the same Trivy installation and inventory image
  tags to scan all eight previously built images. It does not rebuild, upload,
  ignore unfixed findings, or stop after the first affected image.

JSON output is written under ignored `.security-reports/`. Each command also
prints a bounded table/summary and exits nonzero when its gate fails. F2 has no
advisory allowlist: a backend-runtime `HIGH` or `CRITICAL` remains blocking
until a reviewed compatible patch is applied. CI pins Trivy `v0.73.0` through
the immutable `setup-trivy` action commit recorded in the workflow.

The dependency and source gates run in the quality job. Image scanning runs in
the live job after e2e tests and before the existing unconditional Compose
cleanup, so it examines the exact images that passed the live tests.

`pnpm backend:health` performs one read-only check of every `/health/ready`
contract. `pnpm backend:down` runs Compose down without `-v`, so local database
and MinIO volumes remain intact. CI remains responsible for removing its own
isolated volumes after the job.

Auth's normal `test` config excludes live `*.e2e.spec.ts` files; its `test:e2e` config selects the two live auth/user flows explicitly. User-service likewise uses a dedicated e2e config for its HTTP and gRPC live tests. Their focused unit/security commands therefore do not silently select live service tests.

Docker smoke:

```powershell
docker compose config
pnpm backend:health
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

| Layer         | Proves                                        | Examples                                   |
| ------------- | --------------------------------------------- | ------------------------------------------ |
| Build         | TypeScript and generated imports line up      | `pnpm --filter @nebula/auth-service build` |
| Lint          | Formatting, unsafe typing, style drift        | `pnpm --filter @nebula/media-service lint` |
| Unit/security | Guard, Redis/session, pure service behavior   | Auth Redis/security specs                  |
| HTTP e2e      | REST routes and role behavior                 | `test/http/*.e2e.spec.ts`                  |
| gRPC e2e      | Service-to-service contract and status codes  | `test/grpc/*.e2e.spec.ts`                  |
| Docker smoke  | Runtime env, image, healthcheck, dependencies | `docker compose ps`, `/health/ready`       |

Current expectation: backend source lint errors and warnings should be fixed.
The current warnings are confined to test fixtures and e2e response handling;
their warning-only unsafe-`any` cleanup is deferred rather than expanded into a
broad F2 test rewrite. This does not defer running the tests or accepting test
failures: focused security and live e2e failures remain blocking.

## HTTP Health Contract

Every backend service uses the shared `StandardHealthController` contract:

- `GET /health/live` reports process liveness and does not call dependencies.
- `GET /health/ready` reports required local dependency readiness.
- `GET /health` is a compatibility alias for readiness.
- Ready responses use HTTP `200` and `status: "ok"`.
- Degraded readiness uses HTTP `503` and `status: "degraded"`.
- Failed probes expose only `{ status: "error" }`; raw database, Redis, or
  storage errors are not returned.

The common response includes `service`, `time`, and a named `checks` object.
An optional dependency may report `skipped`; only `error` degrades readiness.

| Service          | Required readiness checks           |
| ---------------- | ----------------------------------- |
| auth-service     | auth Redis, S2S replay store        |
| user-service     | Postgres, S2S replay store          |
| settings-service | Postgres, S2S replay store          |
| taxonomy-service | Postgres, S2S replay store          |
| product-service  | Postgres, S2S replay store          |
| blog-service     | Postgres, S2S replay store          |
| order-service    | Postgres, S2S replay store          |
| media-service    | Postgres, storage, S2S replay store |

These probes reuse the clients owned by each Nest module. Health controllers
must not construct separate Prisma, Redis, or storage clients. Readiness does
not make synthetic domain calls to downstream services. Existing media and
order gRPC `Ping` methods remain available, but no new proto method is required
for the HTTP readiness contract.

## Docker Healthchecks

`docker/backend.Dockerfile` defines runtime healthchecks for backend runtime targets.

| Runtime Target   | Health URL                           |
| ---------------- | ------------------------------------ |
| user-runtime     | `http://localhost:3100/health/ready` |
| auth-runtime     | `http://localhost:3001/health/ready` |
| settings-runtime | `http://localhost:3010/health/ready` |
| media-runtime    | `http://localhost:3007/health/ready` |
| taxonomy-runtime | `http://localhost:3006/health/ready` |
| product-runtime  | `http://localhost:3003/health/ready` |
| blog-runtime     | `http://localhost:3004/health/ready` |
| order-runtime    | `http://localhost:3005/health/ready` |

Infra healthchecks:

| Container  | Healthcheck                              |
| ---------- | ---------------------------------------- |
| postgres   | `pg_isready -U postgres`                 |
| redis      | `redis-cli ping`                         |
| minio      | `GET /minio/health/ready` through `curl` |
| minio-init | One-shot bucket setup; expected exit `0` |

## gRPC Readiness

Current proto-level `Ping` methods:

| Proto         | Method              |
| ------------- | ------------------- |
| `media.proto` | `MediaService.Ping` |
| `order.proto` | `OrderService.Ping` |

Current setup behavior:

- Backend boot waits for healthy infrastructure and all expected databases
  before migrations, then waits for HTTP `/health/ready` on all eight services.
- Media-service setup checks open ports, HTTP `/health`, and gRPC `Ping`.
- Most other service setup files only check required ports.
- Port-open checks prove a socket is listening, not that the service can process a real gRPC method.

Adding a gRPC readiness method to every proto is a future consideration, not a
requirement of the current HTTP contract.

## Shutdown Contract

All eight bootstraps call `app.enableShutdownHooks()`. Nest therefore closes
the HTTP application and connected microservices when the process receives a
supported termination signal. Lifecycle-managed providers close the resources
they own:

- Prisma services disconnect through `OnModuleDestroy`.
- The auth Redis service and shared S2S replay store close their Redis clients.
- Media service destroys its lazily-created S3 clients.

Do not add Prisma `beforeExit` listeners or create health-only clients; those
would duplicate the application lifecycle.

## Current Test Inventory

| Service          | HTTP Tests                                          | gRPC/Security Tests                   |
| ---------------- | --------------------------------------------------- | ------------------------------------- |
| auth-service     | `test/app.spec.ts`, auth HTTP/gRPC flow             | Redis/security specs, JWT guard specs |
| user-service     | `test/http/user.http.e2e.spec.ts`                   | `test/grpc/user.e2e.spec.ts`          |
| settings-service | `test/http/settings.http.e2e.spec.ts`               | `test/grpc/settings.e2e.spec.ts`      |
| taxonomy-service | `test/http/taxonomy.http.e2e.spec.ts`               | `test/grpc/taxonomy.e2e.spec.ts`      |
| media-service    | `test/http/media.http.e2e.spec.ts`                  | `test/grpc/media.e2e.spec.ts`         |
| product-service  | `test/http/product.http.e2e.spec.ts`, taxonomy HTTP | product/taxonomy gRPC                 |
| blog-service     | `test/http/blog.http.e2e.spec.ts`, taxonomy HTTP    | blog/taxonomy gRPC                    |
| order-service    | `test/http/order.http.e2e.spec.ts`                  | `test/grpc/order.e2e.spec.ts`         |

## Dependency Notes

| Service Tests    | Usually Need                                              |
| ---------------- | --------------------------------------------------------- |
| auth-service     | user-service, Redis, Postgres                             |
| user-service     | auth HTTP/gRPC, user-service HTTP/gRPC, Postgres          |
| settings-service | auth HTTP, settings HTTP/gRPC, Postgres                   |
| taxonomy-service | auth HTTP, settings HTTP/gRPC, taxonomy runtime, Postgres |
| media-service    | auth HTTP/gRPC, media HTTP/gRPC, MinIO/S3, Postgres       |
| product-service  | auth, settings, taxonomy, product runtime, Postgres       |
| blog-service     | auth, settings, taxonomy, blog runtime, Postgres          |
| order-service    | auth, settings, product, order runtime, Postgres          |

Exact setup files live under each service's `test/setup/wait-for-services.ts`.

## Database Migration Pattern

For all seven Prisma services, use the sequential root commands:

```powershell
pnpm prisma:gen
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
```

To prove the same migrations from empty disposable databases and exercise the
local binary backup/failure-recovery policy, run:

```powershell
pnpm db:verify:migrations
pnpm test:database-recovery
```

These checks use `_verify_` databases and clean them up. The maintenance
backup/restore procedure for the normal local databases is documented in
`docs/architecture/local-dev-and-docker-boot.md`; do not edit Prisma migration
records to repair a failed database.

For focused diagnosis or repair, a service-local command remains valid:

```powershell
pnpm --filter @nebula/<service> prisma:migrate:deploy
```

When running host commands against Docker Postgres, temporarily override `DATABASE_URL` and `SHADOW_DATABASE_URL` in the shell. Do not permanently replace service-local `.env` files with Docker-only URLs.

See `docs/architecture/local-dev-and-docker-boot.md` for the full host-vs-container DB URL explanation.

Example for media-service Docker e2e:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public"
pnpm --filter @nebula/media-service prisma:migrate:deploy
pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/http/media.http.e2e.spec.ts --runInBand
pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/grpc/media.e2e.spec.ts --runInBand
```

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
6. Check `/health/ready` status and body.
7. Run HTTP and gRPC tests for that service.
8. Run dependent service tests if the contract is consumed elsewhere.

Example:

```powershell
pnpm --filter @nebula/user-service build
pnpm --filter @nebula/user-service lint
pnpm --filter @nebula/user-service test -- test/grpc/user.e2e.spec.ts
```

## Current Gaps

- Most services do not have gRPC `Ping` readiness.
- Some tests still use loose `any` and rely on lint warnings.
- Direct taxonomy-service write auth needs explicit launch review.
- Some setup files only wait on ports instead of real readiness methods.
- No single root smoke script yet verifies HTTP readiness and every gRPC
  dependency contract beyond the provisioning gate.

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

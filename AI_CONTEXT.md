# AI Context: NebulaNV

Last updated: 2026-06-22
Purpose: fast, safe handoff for AI/developer sessions without re-discovering the whole repo.

## 1. Collaboration Contract

- Salar is actively learning the project and wants explanations of syntax, type choices, and service boundaries.
- The assistant may inspect files freely and should explain findings in plain language.
- The assistant must not edit files unless Salar explicitly says `change it` or directly says to `change` a named file/task in an edit context.
- If Salar uses wording that sounds equivalent but does not include `change`, such as `do it`, `fix it`, `apply it`, `go ahead`, or `make it happen`, the assistant must ask: `Should I change it?`
- When not allowed to edit, give exact edit instructions, file paths, and reasoning.
- Before suggesting code changes, explain what problem the change solves and what contract it affects.

## 2. Absolute Safety Rules

- Never expose, print, or commit real `.env` secrets.
- Use `.env.example`, deployment examples, and docs for variable names only.
- Never delete user work unless Salar explicitly asks for that exact deletion.
- Never run destructive git commands such as `git reset --hard` or `git checkout --` unless explicitly requested.
- Always check `git status --short` before editing, committing, or discussing final workspace state.
- Avoid broad rewrites. Keep changes scoped to the named file/task.
- Do not change service contracts without checking the related DTO, controller, gRPC controller, proto, tests, and Prisma shape.
- Do not treat generated/build/vendor/log artifacts as source of truth.

## 3. Project Snapshot

- Stack: NestJS microservices plus Next.js web app in a pnpm monorepo.
- Backend apps: `auth-service`, `user-service`, `product-service`, `settings-service`, `taxonomy-service`, `order-service`, `blog-service`, `media-service`.
- Frontend app: `web`.
- Shared packages: `grpc-auth`, `clients`, `config`, `protos`.
- Runtime target: Node `>=22`, pnpm `10.17.1`.
- Default branch: `main`.
- GitHub remote: `origin` -> `https://github.com/pain1122/nebulaNV`.

## 4. Current Source Of Truth

- Product vision and long roadmap: `README.md`.
- Launch/business scope: `site essentials.md`.
- Execution board: `TODO.md`.
- Developer docs index: `docs/README.md`.
- Contract/boundary rules: `docs/architecture/contracts-and-boundaries.md`.
- Boot/runbook: `docs/architecture/local-dev-and-docker-boot.md`.
- Docker/Compose/release image map: `docs/docker-configs.md`.
- Shared package notes: `docs/packages/*.md`.
- Current focus file: `docs/current-focus.md`.
- Active report file: planned as `docs/reports/active-report.md`; until it exists, use latest files in `docs/reports/`.

## 5. How To Load Context For A Task

For any task, load context in this order:

1. `AI_CONTEXT.md`
2. `TODO.md` or `docs/current-focus.md` when it exists
3. `docs/README.md`
4. `docs/architecture/system-relationships.md` when it exists
5. `docs/architecture/contracts-and-boundaries.md` when changing DTO/proto/service/Prisma/mapper behavior
6. Relevant `docs/services/<service>.md`
7. Relevant `docs/packages/<package>.md` when package docs exist
8. `docs/docker-configs.md` when changing Compose, Dockerfiles, image release flow, env boundaries, or runtime URLs
9. Only then inspect source files

Use source files as final truth when docs and code disagree.

## 6. Anti-Noise Protocol

Before searching, decide the smallest useful search surface. Do not recursively scan the whole repo unless the task truly needs repo-wide discovery.

Default search policy:

- Start with docs and the named service/package.
- Search source before tests unless the task is specifically about tests.
- Search tests before implementation only when validating expected behavior.
- Never include generated, vendor, build, cache, or static asset folders in normal searches.

Always exclude these paths unless the user explicitly asks about them:

- `**/node_modules/**`
- `**/dist/**`
- `**/.next/**`
- `**/coverage/**`
- `**/prisma/generated/**`
- `apps/web/public/**`
- generated proto/build output
- Docker/image/export artifacts
- logs and local temp files

Preferred discovery command:

```powershell
rg --files apps packages docs `
  -g '!**/node_modules/**' `
  -g '!**/dist/**' `
  -g '!**/.next/**' `
  -g '!**/coverage/**' `
  -g '!**/prisma/generated/**' `
  -g '!apps/web/public/**'
```

Preferred text search pattern:

```powershell
rg -n 'SearchTerm|OtherTerm' apps packages docs `
  -g '!**/node_modules/**' `
  -g '!**/dist/**' `
  -g '!**/.next/**' `
  -g '!**/coverage/**' `
  -g '!**/prisma/generated/**' `
  -g '!apps/web/public/**'
```

When output is too large:

- Stop widening the search.
- Narrow by service, file type, or exact symbol.
- Prefer `rg --files | rg '<filename-or-folder>'` before reading files.
- Read selected files only, not whole directories.
- Summarize findings instead of dumping large output.

PowerShell rules:

- Prefer single quotes around search patterns.
- Do not use Bash-style command chaining such as `&&` in PowerShell. Use `;` only when sequential execution is safe, or run commands as separate tool calls.
- Avoid complicated nested quote regex in one command.
- Prefer simple repeated searches over one clever fragile command.
- Do not pass Unix-style globs like `apps/*/jest.config.ts` directly to `rg` in PowerShell; use `rg --files` and pipe/narrow, or use `Get-ChildItem`.
- Split searches into discovery, narrowing, then reading instead of one fragile command.
- For multiline Node scripts, use a PowerShell here-string:

```powershell
@'
console.log("safe multiline script")
'@ | node -
```

- If the content being written contains PowerShell here-string delimiters (`@'` or `'@`), do not wrap the whole write in a PowerShell here-string; use `apply_patch` or another safer write method.
- Do not mix PowerShell path enumeration with `cmd /c` for file operations.

## 7. Service Port Map

| Service          | HTTP |  gRPC |
| ---------------- | ---: | ----: |
| user-service     | 3100 | 50051 |
| auth-service     | 3001 | 50052 |
| product-service  | 3003 | 50053 |
| settings-service | 3010 | 50054 |
| blog-service     | 3004 | 50055 |
| order-service    | 3005 | 50056 |
| taxonomy-service | 3006 | 50057 |
| media-service    | 3007 | 50058 |

## 8. Critical Architecture Rules

- Auth-service owns token issuance, refresh, validation, logout/revocation behavior, and auth-facing gRPC methods.
- User-service owns users, profiles, roles, and user persistence.
- Settings-service may influence runtime app/business configuration, frontend/admin-managed defaults, SEO/site settings, and safe database-backed defaults.
- Settings-service must not define secrets, authentication policy, internal trust boundaries, role hierarchy, storage credentials, database URLs, or whether auth is required.
- Taxonomy-service owns taxonomy/category/tag/grouping records and taxonomy-specific CRUD.
- Media-service owns media policy, media metadata, access classes, signed URLs, and upload/read authorization.
- Object storage providers such as MinIO, Supabase Storage S3, and AWS S3 hold bytes; they are not the app privacy authority.
- Services should not import another service's Prisma client or query another service's database directly.
- Service-to-service communication should use explicit gRPC/client contracts.
- Source files should avoid unsafe `any`; test files may still have warning-level loose typing during stabilization.

## 9. Media Boundary Summary

- Current local object storage: MinIO.
- Planned compatible providers: Supabase Storage S3 mode and AWS S3.
- Admin filemanager is a public media-library lane restricted to `admin/root-admin`.
- Public filemanager assets live under `MEDIA_PUBLIC_FOLDER`, currently `uploads`.
- Public filemanager paths should be human-readable, such as `uploads/images/products/hero.webp`.
- Sensitive files must use feature-owned upload flows, not the general filemanager.
- `PROTECTED` and `STRICT` media should use opaque storage keys, owner/scope/business context in DB metadata, and short-lived read/render URLs.
- Storage path is not the security boundary; media-service policy checks are.
- Heavy processing workers are later work. Workers must not own media access policy.

## 10. Docker And Runtime Notes

- Docker service-to-service URLs use Docker DNS names such as `postgres:5432`, `auth-service:50052`, and `minio:9000`.
- Host tests and browser-facing URLs use exposed localhost ports such as `127.0.0.1:3007` or `127.0.0.1:9000`.
- Docker Postgres is exposed locally on host port `15432`.
- MinIO server container should stay running.
- `minio-init` is expected to exit with status `0` after creating/configuring the bucket.
- If a service was recreated with `--no-deps`, verify required dependencies are already running and healthy.
- Docker image release packaging exists through `docker-compose.release.yml`, `deploy/.env.production.example`, and `scripts/docker/*.ps1`.

## 11. Language Placement

- TypeScript/NestJS remains the request-path API layer for auth, users, settings, media policy, products, blog, taxonomy, and order flows.
- Go should start later as worker/state infrastructure after contracts are stable: media worker, showroom asset worker, streaming worker, state/search/audit style services.
- Rust is reserved for later performance-critical 3D/media/browser/mobile acceleration or security-sensitive components after worker boundaries are proven.
- Python is reserved for AI/ML, analytics, recommendations, tagging, or offline intelligence workflows where Python libraries are clearly better.

## 12. Verification Baseline

### Testing And Health Expectations

TL;DR:

- All backend services expose `/health`.
- Only some `/health` endpoints currently verify database connectivity.
- Media-service has the strongest readiness setup right now: HTTP `/health` plus gRPC `Ping`.
- Most test setup files still prove only that ports are open, not that real gRPC calls work.
- Full details live in `docs/architecture/testing-and-health.md`.

Testing is part of the service contract, not an afterthought.

For every service contract change, check the matching layer:

- HTTP behavior: route, auth requirement, role behavior, success shape, failure shape.
- gRPC behavior: method name, metadata requirements, S2S signature, role behavior, status codes.
- Database behavior: migrations applied, Prisma model shape matches service logic, service can connect to its own DB.
- S2S behavior: valid internal calls succeed, invalid/spoofed calls fail.
- Docker behavior: service starts healthy with Docker dependencies and exposed ports.

Preferred test types:

- Unit/security tests for guards, auth decisions, Redis/session rules, and pure service logic.
- HTTP e2e tests for public/admin/user-facing routes.
- gRPC e2e tests for service-to-service contracts.
- Smoke/health tests for `/health`, gRPC readiness, DB reachability, Redis, MinIO/S3, and S2S connectivity.

Do not weaken tests just to make them pass. If a test fails, first decide whether the code is wrong, the test is stale, or the contract intentionally changed.

Targeted commands:

```powershell
pnpm -w proto:gen
pnpm --filter @nebula/media-service build
pnpm --filter @nebula/media-service lint
pnpm --filter @nebula/media-service test -- --runInBand
```

Broader checks when ready:

```powershell
pnpm -w build
docker compose config
docker compose up -d --build
docker compose ps -a
```

Docker DB migration pattern for a service that uses Docker Postgres from the host:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/<db>?schema=public"
$env:SHADOW_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/postgres?schema=<shadow_schema>"
pnpm --filter @nebula/<service> prisma:migrate:deploy
Remove-Item Env:DATABASE_URL
Remove-Item Env:SHADOW_DATABASE_URL
```

## 13. Git Hygiene

- Avoid casual `git add .` unless Salar explicitly wants a full project upload.
- Stage intentionally by path during normal work.
- Commit and push only when Salar explicitly asks.
- Keep generated logs, build output, local envs, and secrets out of git.
- Do not delete old user notes, reports, or docs unless Salar names them directly.

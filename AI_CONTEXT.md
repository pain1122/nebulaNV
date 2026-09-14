# AI Context: NebulaNV

Last updated: 2026-09-08
Purpose: fast, safe handoff for AI/developer sessions without re-discovering the whole repo.

## 1. Collaboration Contract

- Salar is actively learning the project and wants explanations of syntax, type choices, and service boundaries.
- The assistant may inspect files freely and should explain findings in plain language.
- Updated workflow: the assistant runs small inspections, formatting, and focused
  checks directly and continues authorized edits. Leave heavy builds, full e2e,
  scans, and long verification sequences to Salar to avoid timeouts. Keep tool
  output and explanations brief; request summaries instead of full logs.
- This continuation authorizes implementation of the adopted roadmap. Fix
  confirmed implementation gaps without requesting special approval wording or
  treating them as new design choices. Consult Salar for changes to frozen
  requirements or scope, not routine implementation decisions.
- Before suggesting code changes, explain what problem the change solves and what contract it affects.

### Per-Batch Evidence Gate

Apply this gate at the start of every roadmap batch and to every checklist item
within that batch:

1. Start every item with an evidence ledger containing the exact checklist
   wording, directly applicable ADR clauses, current mechanisms, and required
   proof.
2. Every `missing` or `unresolved` claim must list the files and searches used
   to establish absence. Do not make a negative claim from memory.
3. Map every completion statement to implementation, test, database, or runtime
   evidence. Unsupported statements cannot appear in checked-item text.
4. Migration and seed items require a clean disposable-database execution using
   current source, not historical local state.
5. After completing a later stateful item, rerun earlier migration and seed
   verifiers. This checks whether the later item invalidated earlier evidence.
6. Use two completion passes:
   - implementation appears complete;
   - adversarial evaluation tries clean order, reruns, contradictions, partial
     state, rollback, and failure behavior.

   Only the second pass permits checking the item.

7. Run small source, formatting, and focused verification gates directly.
   Send heavy or long-running command sequences to Salar and request brief
   results. Full builds remain outside the active task unless authorized.

## 2. Safety Rules

- During the basic development and test phases, the assistant may create and
  edit ignored local `.env` files, including development-only credentials and
  signing values needed to run the selected work. Keep those values
  non-production, scoped to the local project, and out of tracked files and
  user-facing output.
- The direct-secret boundary begins with the production phase and applies to
  production and every later deployment phase. Do not create, replace, print,
  or commit production secret values; use the deployment secret owner or
  secret manager and document only variable names and required formats.
- Tracked `.env.example`, production examples, and documentation contain safe
  development placeholders or variable names, never deployable production
  credentials.
- Never delete user work unless Salar explicitly asks for that exact deletion.
- Never run destructive git commands such as `git reset --hard` or `git checkout --` unless explicitly requested.
- Always check `git status --short` before editing, committing, or discussing final workspace state.
- Avoid broad rewrites. Keep changes scoped to the named file/task.
- Do not change service contracts without checking the related DTO, controller, gRPC controller, proto, tests, and Prisma shape.
- Do not treat generated/build/vendor/log artifacts as source of truth.

### Failure-Oriented Design Review

Do not plan architecture or security from certainty that every layer will hold.
For each material boundary or design decision, explicitly review:

1. **Prevention:** what stops the failure under normal operation;
2. **Detection:** how the system or operator learns that it happened;
3. **Containment:** the maximum blast radius when the layer fails;
4. **Fail state:** whether failure is closed, safely degraded, or accidentally
   permissive;
5. **Recovery:** how configuration, keys, sessions, service, or data return to a
   trusted state;
6. **Common-mode failure:** whether apparently independent protections rely on
   the same component, credential, configuration, or authority;
7. **Evidence:** the focused denial, fault, recovery, or integration test that
   proves the claimed behavior;
8. **Residual risk:** what remains possible and which milestone owns it.

Apply this review to the structure as a whole, not only to individual input
checks. Never claim that a public client identifier, gateway decision, signed
workload assertion, network boundary, or role allowlist alone proves human
authorization. Preserve independent Auth and domain-service enforcement so a
gateway failure does not automatically defeat every layer. State plainly when
the current phase is safe only because a later capability, such as multi-site
operation, remains disabled until its isolation work is complete.

## 3. Project Snapshot

- Stack: NestJS microservices plus Next.js web app in a pnpm monorepo.
- Backend apps: HTTP-only `gateway` plus the hybrid `auth-service`,
  `tenant-authority-service`,
  `user-service`, `product-service`, `settings-service`, `taxonomy-service`,
  `order-service`, `blog-service`, and `media-service`.
- Frontend app: `web`.
- Shared packages: `grpc-auth`, `clients`, `config`, `protos`, `api-client`.
- Runtime target: Node `>=22`, pnpm `10.17.1`.
- Default branch: `main`.
- GitHub remote: `origin` -> `https://github.com/pain1122/nebulaNV`.

## 4. Current Source Of Truth

- Product vision and long roadmap: `README.md`.
- Launch/business scope: `site essentials.md`.
- Adopted execution roadmap: `TODO-ALTERNATIVE.md`.
- Original roadmap and safe comparison: `TODO.md`. Do not rewrite its order to
  match the alternative roadmap.
- Developer docs index: `docs/README.md`.
- Contract/boundary rules: `docs/architecture/contracts-and-boundaries.md`.
- Boot/runbook: `docs/architecture/local-dev-and-docker-boot.md`.
- Docker/Compose/release image map: `docs/docker-configs.md`.
- Shared package notes: `docs/packages/*.md`.
- Current focus file: `docs/current-focus.md`.
- Current backend-ecommerce roadmap correction:
  `docs/reports/2026-09-14-backend-ecommerce-roadmap-correction.md`.
- Partially superseded demo-first rebaseline:
  `docs/reports/2026-09-14-demo-first-roadmap-rebaseline.md`.
- Historical F7 source/migration inventory:
  `docs/reports/2026-09-14-f7-batch0-web-source-migration-inventory.md`.
- Current F4 depth audit:
  `docs/reports/2026-09-12-f4-implementation-depth-audit.md`.
- Archived paused F4 checklist:
  `docs/reports/2026-09-14-f4-paused-execution-checklist.md`.
- Original F4 authority audit:
  `docs/reports/2026-08-24-f4-authority-audit.md`.
- Completed F4 Batch 2 evidence:
  `docs/reports/2026-08-26-f4-batch2-exit-proof.md`.
- Historical/default-realm F4 Batch 3 item log:
  `docs/reports/2026-08-26-f4-batch3-execution-checklist.md`.
- Superseding F4 identity-realm decision:
  `docs/architecture/decisions/0014-f4-customer-identity-realms-and-federation.md`.
- Completed F4 Batch 1R record/migration freeze and adversarial reconciliation:
  `docs/architecture/decisions/0015-f4-identity-realm-record-and-migration-freeze.md`
  and `docs/reports/2026-08-31-f4-identity-realm-rebaseline.md`.
- Completed F3 evidence: `docs/reports/2026-08-22-f3-exit-proof.md` and
  `docs/reports/2026-08-24-f3-execution-checklist.md`.

### Active Milestone

- F3 External API Gateway is complete as of 2026-08-24.
- F4 is paused after the audited R0-R5 checkpoint at commit `3285c00`.
  Tenant Authority persistence, Realm Auth shadow/staged records, default-actor
  backfills, and 56 context-v3 receivers are preserved, but current Auth/User,
  the static gateway registry, and context v1/v2 remain the active path.
- F4 R6.1 onward, gateway Authority cutover, domain tenant/site migration,
  subordinate SSO, second-root isolation, invalidation, and final isolation
  evidence remain implementation gaps. Resume only at R6.1 after F9; do not
  activate a later F4 gate out of order.
- The F4 state is recorded in
  `docs/reports/2026-09-12-f4-implementation-depth-audit.md` and the archived
  `docs/reports/2026-09-14-f4-paused-execution-checklist.md`.
- D1 Default-Site Commerce Domain is the active phase. It audits and completes
  the Product/catalog backend, variants, governed Media references, Taxonomy,
  shop currency, gateway parity, deterministic data, migrations, and live
  evidence without frontend source changes.
- D2 then completes cart, idempotent demo checkout, immutable Order snapshots,
  stock/currency behavior, status transitions, concurrency, and rollback. D1
  and D2 close the frontend-independent B0 Backend Ecommerce Release.
- After B0 and after the user supplies the Vite admin, F7 imports it without a
  Next.js conversion and D3 proves the administration workflows. D4 storefront
  work starts only from concrete client requirements and is not a B0/P0 gate.
- The adopted sequence is
  `D1 -> D2 -> B0 -> F7 -> D3 -> P0 -> M2 -> F5 -> M5 -> M3S -> F8 -> F6 -> D5 -> AI0 -> M7 -> F9 -> F4`,
  with F7 waiting for the supplied admin. D4 is a separate non-gating
  storefront track that waits for client requirements. General M6 remains
  deferred.
- Every phase before resumed F4 is explicit default-site/single-realm
  compatibility work. It must preserve gateway/service ownership and accept no
  public tenant/site override, but it cannot claim multi-tenant isolation.
- M3S storage is a compatibility feature before F9. Media-service remains the
  policy authority, MinIO remains local storage, and only demonstrated
  S3-compatible operations/provider-neutral tests may be added. F9 selects and
  proves primary-cloud bucket/KMS/lifecycle/migration structure from measured
  product evidence.
- Untracked R6.1 Realm Auth experiment files remain outside the committed
  baseline. Do not edit, import, test, delete, or move them during D1/D2 without
  a separate user decision.

## 5. How To Load Context For A Task

For any task, load context in this order:

1. `AI_CONTEXT.md`
2. `TODO-ALTERNATIVE.md` and `docs/current-focus.md`
3. `TODO.md` only when comparing the original roadmap or checking historical
   completion
4. `docs/README.md`
5. `docs/architecture/system-relationships.md` when it exists
6. `docs/architecture/contracts-and-boundaries.md` when changing DTO/proto/service/Prisma/mapper behavior
7. Relevant `docs/services/<service>.md`
8. Relevant `docs/packages/<package>.md` when package docs exist
9. `docs/docker-configs.md` when changing Compose, Dockerfiles, image release flow, env boundaries, or runtime URLs
10. Only then inspect source files

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
| gateway          | 3002 |     - |
| user-service     | 3100 | 50051 |
| auth-service     | 3001 | 50052 |
| product-service  | 3003 | 50053 |
| settings-service | 3010 | 50054 |
| blog-service     | 3004 | 50055 |
| order-service    | 3005 | 50056 |
| taxonomy-service | 3006 | 50057 |
| media-service    | 3007 | 50058 |

## 8. Critical Architecture Rules

- Auth-service currently owns token issuance, refresh, validation,
  logout/revocation behavior, and auth-facing gRPC methods. The F4 target keeps
  that ownership per identity realm and adds realm issuer/audience,
  separate credential/session generations, durable active-session and legacy-
  bridge behavior, and federation. `meg1_` remains a separate Tenant Authority
  HMAC and is never an Auth generation fence. Gateway and Tenant Authority do
  not become identity issuers.
- User-service currently owns global users, profiles, free-string roles,
  password hashes, and user persistence. ADR-0014 treats that as the default-
  realm migration source: target profile ownership is realm-scoped, while the
  local password hash and both Auth generation fences move into the realm Auth
  consistency aggregate only after an additive verified migration.
- Tenant-authority-service owns tenant/site/application/membership plus public
  identity-realm/provider/trust/application-policy metadata. It never owns
  customer password hashes, raw sessions, provider secrets, or private realm
  signing keys.
- Human identity is authoritative only as `(identityRealmId, subjectId)`.
  Email, phone, name, public client ID, external claims, or a bare legacy UUID
  cannot link realms or grant a membership/role.
- F4 domain actor/owner migrations use explicit `identityRealmId` plus
  `subjectId` columns. The old UUID is default-realm backfill input only; do not
  substitute a per-service opaque-wrapper design.
- Realm credential/session migration preserves service database ownership:
  User and current Auth create bounded encrypted, HMAC-manifested artifacts for
  the exact Realm Auth importer under a fail-closed mutation barrier. No runner
  reads both owner stores directly, and no asynchronous copy becomes a second
  security authority.
- A direct parent relationship grants no SSO. An exact application identity
  policy and active federation trust may admit a licensed-root consumer only
  to that target application's `USER` baseline; personnel and higher roles
  remain explicit target grants. Premium is an F6 entitlement, not an admin
  role.
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

- All backend services expose dependency-free `/health/live`, explicit
  `/health/ready`, and a `/health` readiness compatibility alias.
- Readiness checks each service's required local database/Redis/storage
  dependencies and returns sanitized HTTP `503` responses while degraded.
- Docker and backend provisioning use `/health/ready`; existing media/order
  gRPC `Ping` methods remain separate.
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
- Smoke/health tests for `/health/ready`, gRPC readiness, DB reachability,
  Redis, MinIO/S3, and S2S connectivity.

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

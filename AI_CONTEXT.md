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
- Current F4 audit: `docs/reports/2026-08-24-f4-authority-audit.md`.
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
- F4 Tenant, Site, Channel, Application, And Identity-Realm Authority is active.
- F4 Batch 1's tenant/site/application/membership architecture and Batch 2
  implementation evidence remain preserved, but its platform-global
  identity/session clauses were superseded on 2026-08-31 by ADR-0014 after the
  product requirement was clarified as upper-enterprise customer-root identity
  isolation. Batch 1R closed on 2026-08-31 through ADR-0015 and the adversarial
  rebaseline report. Batch 3R R0 completed on 2026-09-01 with current-source
  documentation checks and both clean disposable Tenant Authority/role-seed
  verifiers; it changed no schema, runtime, data, deployment, or traffic. R1
  completed on 2026-09-05: Tenant Authority now persists the frozen inactive
  default/operator realms and local providers, four draft application
  policies, and five pending trusts from one reviewed manifest. Its schema,
  create-only development seed, audit/outbox evidence, clean migration/rerun,
  preserved role-seed regression, and no-runtime-consumer boundary passed both
  completion passes. R1 changes no traffic and adds no Auth/session/provider-
  secret runtime. R2 completed on 2026-09-08: nullable default-realm actor pairs
  and v2 evidence preserve legacy readers, IDs, epochs, `meg1_`, grants, and v1
  history. Four populated upgrades, two atomic rollback cases, earlier seed
  regressions, all eight service migration checks, 17 Authority suites
  (79 tests), 50 tooling tests, lint/types, and affected Prisma checks passed.
  Salar confirmed zero remaining verification databases. Both completion passes
  and the corrected pair-check/v1-return defects are in the R2 section of the
  Batch 3R execution report. `R3_REALM_AUTH_SHADOW` has an entry evidence ledger
  in that report. The legacy-family source gap is corrected with issued-version
  metadata and an atomic, non-mutating migration evidence reader. A shared Realm
  Auth service now has the durable shadow aggregate migration, fixed default and
  operator deployment tuples, separate DB roles/Redis placement, database-level
  session/generation denial in shadow, and an idempotent boundary/key-reference
  seed. The clean dual-store verifier and operator maintenance-backup coverage
  are implemented, and Salar's clean dual-store run passed on 2026-09-09. The
  bounded encrypted User/Auth exports, atomic default-realm importer, exact
  `lsb1_` derivation, and non-issuing login comparator are implemented in source;
  their first populated end-to-end verifier passed on 2026-09-09. Completion
  review added exact copied-graph rerun checks and controlled evidence-retaining
  shadow rollback; the expanded adversarial/stateful run passed. The second
  review added bounded retry for the exact Prisma serialization conflict and a
  simultaneous-import proof; its stateful rerun passed. The updated foundation,
  Authority, role-seed, R2, all-service migration, and zero-residue regressions
  then passed, closing R3 on 2026-09-09. Current User/Auth stays authoritative.
  R4_ADMIN_SPLIT_STAGED completed on 2026-09-12: the isolated operator store
  now supports one fixed provisioning subject and offline bcrypt recovery
  credential with exact rerun/no-use rollback checks, and Tenant Authority
  permits one active grant per exact `(membershipEpochId, role)`. Its clean
  verifier proved wrong-password and duplicate-role denial, distinct-role
  coexistence, unchanged customer authority, zero operator sessions/grants,
  and zero disposable database residue. R5_V3_RECEIVERS_DORMANT completed on
  2026-09-12 with an exact v3 carrier, 56 separate receiver paths, frozen
  legacy-proto parity, strict routing/no-propagation, and no active writer or
  new session. R6.1_DEFAULT_AUTH_SESSION is next.
  ADR-0015 R0-R11 must execute in order. Do not resume former Batch 3 item 5 or skip
  to a context writer. The selected target is one or more
  isolated identity realms per licensed root, a separate NebulaNV platform-
  operator realm, explicit default-deny subordinate application trust, prompt-
  free but audience-bound root SSO, optional subordinate/BYO realms, realm-
  qualified subjects, and no cross-license trust in F4. The legacy customer
  root UUID remains `TENANT_ADMIN` plus explicit `PARENT_MANAGER`; a distinct
  operator-realm subject receives `PLATFORM_ADMIN`. Legacy sessions get only a
  one-use upgrade into the verified presenting compatible default application.
  R1 seeds all default/operator realm, local-provider, policy, and trust records
  as non-admitting. Its production-refusing bootstrap seed must conflict rather
  than reset an evolved lifecycle/outbox state; R6 and later clean verifiers
  must version their expected post-activation state. R6 activates only the four
  default-application local-trust cohort; R4 stages no operator session, and R8
  alone activates the exact admin-web operator trust/session before the
  transactional grant swap.
- Batch 3 items 1 through 4 remain valid default-realm compatibility evidence.
  The general User seed creates only the bounded legacy root-admin/admin/user
  fixtures; a dedicated item-3 User seed creates
  the default-realm-migration-source editor identity after the original legacy
  snapshot is backfilled. The guarded `db:verify:f4-batch3-role-seeds` command proves the
  complete current-source order and adversarial reruns from clean disposable
  User and Authority databases, while `db:verify:tenant-authority` rechecks the
  earlier migration/seed evidence. Item 4 adds the internal typed actor/
  target/path resolver and the minimum strict context-v2
  `RESOLUTION/AUTHORITY` receiver prerequisite: live Auth user/session must
  match, undeclared routes reject v2, and resolution context cannot propagate.
  It adds no v2 writer, `AUTHORIZED` context, domain consumer, cache, or traffic
  cutover. Clean disposable evidence resolves every seeded exact role and
  denies a missing membership. Batch 3 item 5 authority invalidation/refresh is
  documented but paused; its evidence ledger confirms the scoped revision/
  outbox mechanism is selected instead of globally bumping Auth sessions.
  Implementation remains
  paused until ADR-0015 R11; its earlier Redis Pub/Sub versus Streams choice is
  not the next decision because the preceding realm/Auth/context gates now own
  the dependency. ADR-0015 assigns separate durable credential/session
  generations, a terminal legacy-session bridge, receiver-before-`sr2_`
  ordering, and drain/revoke-only rollback. It also replaces the split gateway
  login with one Realm Auth-owned atomic `Login`; one-use grants are only for
  root-application SSO through the digest-only, PKCE-bound `rsg1_`, and legacy
  upgrade uses only its durable bridge. The current implementation has
  hashed refresh tokens, atomic refresh rotation/replay containment,
  current/all-session logout, and live token-version/session checks. It lacks
  realm/issuer/audience/application binding, a durable active-session ledger,
  selected-other-session revocation, and password-change session invalidation.
  Password change currently updates only User's hash and is a confirmed defect
  under the new contract. Item 6 freshness/cache/outage semantics must remain
  separately testable after the realm mechanism is frozen. The dedicated
  tenant-authority runtime,
  persistence/read/mutation foundations, deterministic non-production seed,
  recovery proof, and healthy rebuilt container are verified. The static F3
  gateway registry remains traffic authority until the ordered Batch 4 adapter
  cutover.
- F3's gateway registry and signed tenant/site/application context are a
  validated single-site bridge, not persistent multi-tenant authority.
- Do not edit F6-F9, D4-D5/P1, M6-M7, or deferred SaaS roadmap scope for the
  realm design without Salar's consultation. The known required proposals are
  F6 premium/target intersection, F7/F8 SSO clients, F9 physical realm HA and
  capacity/failover proof, D4/D5/P1 cross-subordinate product proof, and realm-
  qualified future event/analytics actors. F3 remains frozen; its gateway,
  registry seam, S2S, typed clients, and independent domain checks are
  preserved.

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

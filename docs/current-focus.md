# Current Focus

Last updated: 2026-08-08

## Active Phase

F2 - Code Quality And Reproducibility.

The Formatting, Lint, Types, And Contracts and Standard Service Bootstrap
slices are complete. This file now tracks only the remaining F2 database,
runtime, CI, and reproducibility work.

`TODO.md` remains the execution board. This file expands its F2 items into
small reviewable batches; it must not become a second long-term roadmap or an
execution diary.

## Current Goal

Finish the remaining F2 requirements using existing service contracts and
tooling wherever possible. Remove confirmed stale paths, make database and
Docker workflows deterministic, and make local and CI verification use the
same backend commands.

## Evidence Snapshot

| Area                              | Classification                 | Current evidence                                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Standard Service Bootstrap        | complete                       | Shared validation, HTTP policy, error translation, health, shutdown, environment, logging, and guard-order checks are implemented and live-verified.                                                                                                                     |
| Root Prisma commands              | complete                       | One package-owned backend inventory drives sequential generate, development migration, deploy migration, status, seed, and push commands. Focused tooling tests pass, and the real generate, deploy, status, and seed commands passed against the development databases. |
| Ports and env examples            | complete                       | A tooling contract now locks the eight source defaults, Dockerfile health URLs, Compose/release ports, root/deployment examples, and service examples to the existing backend inventory.                                                                                 |
| Backend healthchecks              | implemented, live gate pending | All eight backend images, Postgres, Redis, and MinIO have healthchecks. Local and release application dependencies now require healthy services; the recreated-stack gate remains.                                                                                       |
| Provisioning                      | implemented, live gate pending | The consolidated backend tool waits for infrastructure and the seven databases, deploys and checks migrations, applies base seeds, builds inventory-owned Bake targets sequentially, starts with `--no-build`, waits for readiness, and applies the API demo seed.       |
| Demo seeds                        | complete                       | User/settings retain base ownership; product/blog base seeds perform no writes. The API demo seed uses the ordinary seeded admin, preserves initializer/service validation, refuses production, and was live-verified for create and safe-repeat behavior.               |
| Database recovery                 | complete                       | All seven schemas were deployed and checked on disposable databases. Binary dump/restore, intentional migration failure/stop/recovery, and a maintenance backup/restore of the seven development databases were live-verified.                                           |
| Legacy user refresh-token storage | complete                       | Active refresh sessions still use auth-service Redis session families. The unused single-value column, RPC, and response fields were removed; the migration, rebuilt services, migration status, and focused live tests were user-verified.                              |
| CI                                | partial implementation         | Hosted quality and Docker provisioning pass. Root `test:e2e` now uses `build:backend` to prepare clean-run host `dist`; hosted live confirmation, scans, and retained reports remain pending.                                                                            |

## Active Work Order

### Batch 0 - Bootstrap Documentation Closeout

- [x] Replace the completed Batch 1-8 execution log with this compact remaining-F2 tracker.
- [x] Document the shared HTTP validation contract and exact-origin CORS/security-header policy in the existing config package document.
- [x] Document the separate gRPC validation contract and the generated-interface limitation in the existing gRPC package document.
- [x] Verify initializer, error, health, shutdown, environment, logging, and guard behavior already has a durable documentation home; update only confirmed gaps.
- [x] Do not repeat shared bootstrap rules in all eight service documents.
- [x] Review the documentation-only diff before starting contract or database edits.

### Batch 1 - Remove Only The Legacy User Refresh-Token Storage Path

This is stale cleanup, not a redesign or removal of refresh tokens.

- [x] Confirm auth-service does not call `GrpcAuthService.setRefreshToken()` and does not read the user-service refresh-token response fields.
- [x] Preserve refresh JWT issuance, `/auth/refresh`, logout, Redis session families, token hashes, rotation, replay detection, revocation, token versions, and JWT refresh settings unchanged.
- [x] Remove the unused auth gRPC wrapper/proxy method and its type/log registration.
- [x] Remove the user-service `SetRefreshToken` controller/service path and its obsolete DTO/test coverage.
- [x] Remove `SetRefreshToken` and its request message from `user.proto`.
- [x] Remove only the unused `refreshToken` fields from the two user hash responses; reserve field number `5` and name `refreshToken` in both messages.
- [x] Remove the nullable `User.refreshToken` Prisma field through one reviewed migration.
- [x] Remove only the seed assignments that set that deleted column to `null`; keep the default admin and normal-user seed records.
- [x] Regenerate proto clients and update auth, user, and actor-context documentation.
- [x] Pass proto checking, Prisma generation, affected lint/type checks, shared config tests, focused auth security tests, and user-service unit tests.
- [x] User gate: rebuild the affected images, deploy and verify the migration, recreate the services, then run focused live auth/user tests.

### Batch 2 - One Backend Inventory And Deterministic Prisma Commands

- [x] Inventory every repeated eight-service/seven-database list in root scripts, provisioning, Docker verification, and wiring tests.
- [x] Add one tooling-owned backend inventory containing package, directory, database, Docker name/image, and HTTP/gRPC ports.
- [x] Make scripts consume that inventory; keep Compose and Bake declarative, then verify them against it instead of generating them from JavaScript.
- [x] Preserve the current migration order: user, settings, media, taxonomy, product, blog, order.
- [x] Route the existing root Prisma generate, development migration, deploy migration, and push commands through one sequential runner without changing their public script names.
- [x] Add root migration-status and all-service base-seed commands.
- [x] Stop on the first failed service and identify the service/database without logging connection credentials.
- [x] Add focused runner tests for command selection, deterministic order, failure stop, and sanitized errors.
- [x] User gate: run the real generate, deploy, migration-status, and seed commands against the development databases.
- [x] Mark the matching `TODO.md` items complete only after the user gate passes.

### Batch 3 - Deterministic Development Seed And Database Recovery

#### 3A. Seed Contract

- [x] Keep user-service and settings-service as owners of their base database seed data.
- [x] Keep taxonomy, media, and order seeds intentionally empty until their domains require base records.
- [x] Remove direct product/blog demo writes that compete with service-owned initialization and validation.
- [x] Refuse development/demo default credentials and demo data when `NODE_ENV=production`.
- [x] Add one idempotent backend demo seed that logs in as the normal seeded admin, reuses the product initializer defaults, and creates one stable product and one published blog post through existing HTTP APIs.
- [x] Do not create a default `root-admin`, bypass service APIs, log tokens/passwords, or overwrite an existing matching demo record.
- [x] Test first run, safe repeat, partial pre-existing data, dependency failure, and production refusal.

#### 3B. Clean Database, Backup, And Recovery

- [x] Prove all seven schemas reach the current state from migrations only on disposable databases.
- [x] Run migration status after deploy and fail on pending, failed, or divergent state.
- [x] Add binary-safe local Compose backup and restore commands that reuse the database inventory.
- [x] Require an explicit confirmation token for restore; never delete Docker volumes or operate on an unspecified target.
- [x] Document backup contents, restore ordering, maintenance expectations, and the rule never to edit Prisma migration records manually.
- [x] Test a backup/restore round trip on disposable data.
- [x] Test an intentional temporary migration failure, prove later steps stop, then recover by recreating only the disposable database and applying the real migrations.

### Batch 4 - Docker Readiness And Supported Local Workflows

- [x] Add a MinIO `/minio/health/ready` healthcheck to local and release Compose.
- [x] Make `minio-init` wait for MinIO health and make application dependencies wait for `service_healthy` rather than process start.
- [x] Extend the existing provisioner; do not create a competing boot orchestrator.
- [x] Make the provisioner wait for infrastructure and all expected databases before running migrations.
- [x] Build the existing inventory-owned Bake targets sequentially, start Compose with `--no-build`, wait for all eight `/health/ready` endpoints, then run the API demo seed.
- [x] Expose the same logic through `backend:boot` and keep `test:e2e:provision` as a compatibility alias.
- [x] Reuse the idempotent `backend:seed` command completed in Batch 3A.
- [x] Add read-only `backend:health` and non-destructive `backend:down` commands.
- [x] Add a contract check for inventory, source defaults, Dockerfile health URLs, Compose/release ports and dependencies, Bake targets, and `.env.example` files.
- [x] Remove stale `full` Docker-profile instructions from current setup/local-development documents; do not rewrite historical reports.
- [x] Document plain `docker compose up` as an existing-database restart, not the supported clean-database boot path.
- [x] Keep release migration execution as an explicit pre-start operator step; do not add a ninth migration image in F2.
- [x] Record gateway runtime under F3 and web/admin runtimes under F7; none gate F2.
- [x] User gate: run `pnpm backend:boot`, confirm all eight services plus MinIO are healthy, and confirm the final API demo seed succeeds.

### Batch 5 - Backend CI Parity, Scanning, And Artifacts

#### 5A. Quality And Live Lanes

- [x] Add backend-only lint, type-check, and source-build commands derived from the root inventory; their Turbo selection excludes the postponed `apps/web` prototype.
- [x] Make the quality lane run frozen install, backend lint/format enforcement, type checks, proto checks, focused security tests, backend build, Compose validation, and tracked-diff checks.
- [x] Do not run the broad root `pnpm format` command or introduce a repository-wide formatter rewrite; use existing lint plus targeted formatting corrections.
- [x] Make the live lane call the same `backend:boot` and `test:e2e` commands documented for local use.
- [x] Validate both local and release Compose configurations in CI.
- [x] Make ignored proto output reproducible from a clean checkout: one package-owned pinned generator serves local source builds and Docker, `proto:check` is non-mutating, and Turbo caches the generated package output.
- [x] Reuse the existing inventory-backed environment initializer for clean local/CI Compose validation; do not duplicate the root/eight-service example list in workflow shell code.
- [x] Make the root `test:e2e` command prepare the host-side internal-package outputs required by Jest on a clean checkout. Reuse the existing inventory-backed `build:backend` owner; do not add duplicate Jest aliases or another package list.
- [ ] Build the eight backend images once through the sequential inventory-backed Bake runner and reuse them for live tests and scans.
- [ ] User gate: the backend-only lint, type, proto, security, and source-build commands pass locally with no errors; observe the updated quality/live workflow in GitHub Actions.

#### 5B. Security Investigation And Gate

- [ ] Classify current high/critical findings as backend runtime, tooling-only, or deferred web-only before changing dependencies.
- [ ] Keep all `apps/web` dependency and image work deferred to F7.
- [ ] Remediate backend findings one direct dependency family at a time; inspect the parent path and patched version before each narrow update.
- [ ] Do not run blanket audit fixes, add unexplained overrides, ignore all unfixed findings, or combine unrelated major upgrades.
- [ ] Block CI on every unapproved backend runtime `HIGH` or `CRITICAL` dependency/image finding.
- [ ] If a backend high/critical finding has no safe patched path, leave the gate red and report it as a blocker rather than silently weakening policy.
- [ ] Add backend-only secret/config scanning without scanning ignored env files, generated output, `apps/web`, or vendored frontend assets.

#### 5C. Useful Evidence

- [ ] Retain dependency/image/secret scan reports, rendered Compose configurations, and Compose logs on failure.
- [ ] Do not upload secrets, local env files, database backups, Docker images, or oversized build caches as CI artifacts.
- [ ] Always run cleanup for the isolated CI Compose project and volumes.

### Batch 6 - F2 Exit Gate

- [ ] From a clean CI checkout, pass frozen install, lint, type checks, proto checks, focused security tests, and backend source build.
- [ ] On isolated fresh databases, pass migration deploy, migration status, base seed, service startup, API demo seed, readiness, and all live e2e suites without manual repair.
- [ ] Pass local/release Compose validation, all eight Bake image builds, and blocking backend high/critical scans.
- [ ] Prove the supported verification commands leave tracked source files unchanged.
- [ ] Ask the user to run the heavy local Bake/live verification and record the results.
- [ ] Update durable docs and `TODO.md` only with verified outcomes, then close F2.

## Guardrails

- Work only on the remaining F2 items above. Do not begin gateway, tenant/site/channel, worker, CDN, frontend, mobile, Kubernetes, or new feature work.
- `apps/web` is explicitly deferred to F7 and is not an F2 build, dependency, scan, Docker, or exit-gate target.
- Test suites remain required gates, but cleanup of warning-only unsafe-`any` findings inside test files is deferred; do not mass-edit tests or disable typed lint rules merely to report zero warnings.
- Before adding a helper, mapper, service list, migration loop, seed path, readiness probe, or CI command, search for the existing owner and extend it when equivalent.
- Do not merge product and blog domain logic. Their initializers and service behavior remain separately owned even when neutral tooling is shared.
- Do not redesign the active refresh-token policy. Only the unused user-service single-token storage path is scheduled for removal; Redis session-family behavior remains authoritative.
- No default `root-admin`, cross-service Prisma access, direct writes into another service database, fake actor, or duplicate public/internal contract.
- Keep each batch reviewable. Finish focused tests and review its diff before beginning the next batch.
- Do not run repository-wide autofix/format commands. Correct only files in the reviewed batch.
- Never hand-edit generated proto or Prisma client output.
- Preserve the existing dirty worktree and unrelated user changes. Do clean-checkout and destructive database verification only in isolated CI/disposable environments.
- Leave heavy Docker builds, image scans, clean-volume runs, and full live e2e commands to the user unless explicitly requested otherwise.
- Classify findings as confirmed defects, stale implementation/documentation, optional hardening, or future scaling work. Do not promote optional work into F2 without evidence and approval.

## Verification Baseline

- Standard Service Bootstrap Batches 1-8 are complete in `TODO.md`.
- Batch 8 service-wiring coverage passed 25/25.
- The final root lint run passed all 13 workspace tasks after narrow stale-lint corrections.
- All eight backend services were rebuilt and reported healthy; all shared live/readiness probes returned `status: "ok"`.
- Batch 2 tooling tests passed 8/8, and the root Prisma generate, deploy, migration-status, and seed commands completed successfully against the development databases.
- Batch 3A backend-tooling tests passed 13/13. The first live `backend:seed` run created one product and one published blog post; the second reported both as existing without overwriting them.
- Batch 3B backend-tooling tests passed 19/19. Clean migration deploy/status passed for all seven disposable databases; binary recovery and intentional migration-failure recovery passed; the seven-database maintenance backup/restore, post-restore migration status, service restart, and final seed all completed without errors.
- Batch 4 backend-tooling tests pass 23/23. Local and release Compose configurations parse. On 2026-08-03 the supported `pnpm backend:boot` workflow completed in roughly 30 minutes: all eight images built sequentially, all backend services plus MinIO became healthy, and the idempotent API demo seed reported its product and blog records as existing.
- Batch 5A tooling coverage passes 24/24. The root command contract now locks the `test:e2e` source-build prerequisite. A Turbo dry run selected the eight backend services and four shared package dependencies, with `apps/web` absent. Local and release Compose validation also passes; the updated live command still requires its hosted-run gate.
- The user ran `lint:backend`, `check-types:backend`, `proto:check`, `test:security`, and `build:backend`; all completed without errors. The 943 lint warnings are entirely under `test/**`: 942 are unsafe-`any` warnings from e2e fixtures/response handling and one is an unused test variable. Production `src/**` reports no warnings. Per scope, test-warning cleanup is deferred while actual test failures remain blocking.
- Hosted quality now passes frozen install, isolated proto generation, all backend lint/type tasks, focused security tests, backend source build, non-overwriting environment initialization, both Compose validations, and tracked-diff enforcement.
- Hosted live provisioning clean-builds all eight backend images and completes infrastructure startup, database inventory, migration deploy/status, base seed, service startup/readiness, and the API demo seed. The previous `pnpm test:e2e` failure occurred before most assertions because Jest resolves internal packages through `tsconfig.base.json` `dist` aliases and the fresh host workspace had not built those outputs. Docker/runtime provisioning was not the failing mechanism. The root command now invokes the existing inventory-backed source build prerequisite; the hosted rerun remains the proof gate.
- Active refresh-token rotation/replay/logout behavior is covered by the existing auth Redis security tests and remains unchanged by the planned legacy cleanup.
- The raw workspace production audit currently includes backend, tooling, and deferred web findings; its unclassified total must not be used as an F2 backend gate.

## Next Action

Review and push the narrow `test:e2e` prerequisite patch, then observe the
hosted quality/live rerun. Keep `apps/web` and test-warning cleanup excluded;
do not change Jest/package alias ownership or add another backend package list.

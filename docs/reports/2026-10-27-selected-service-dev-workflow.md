# Segment 4: selected-service development workflow

Status: accepted for the Order/Gateway pilot on 2026-10-28. Native startup,
all six F3 Gateway flows, source/shared-edit restarts and clean shutdown pass.
Scope: approved development convenience, not a production architecture change.

Adopted item: "Propose a selected-service watch/restart loop, preserving shared
package refresh and integration/release image gates." Proposal and tooling are
implemented and the first native application proof is complete.

## Current mechanism and desired outcomes

`scripts/backend.mjs` buildDevCommands/runBackendDev starts all eleven native
services using the root dev:\* scripts. All eleven apps already expose Nest
start:dev, but the root commands invoke start, and there is no coordinator for
shared injected workspace outputs. The accepted Docker builder already provides
selectedGraph and syncInjectedRuntime, including cached-output refresh. Preserve
that implementation and the existing full-backend command.

The desired outcome is a selected native development session with dependencies
remaining in Docker, without image exports on ordinary source edits. Builds must
refresh shared producers before consumers, stop affected consumers before output
changes, recover after a compile failure, and clean up only owned processes.
Image/CI/integration/release checks remain separate.

## Plan reviewed against the outcomes

1. Derive the selected build graph from the existing inventory/graph helper.
   Derive native companion callers from actual app source RPC-target references
   and Compose dependencies. A containerized caller still uses Docker DNS;
   moving its provider native without also moving the caller is incorrect.
   Order therefore includes Gateway. Print the resulting scope before running.
2. Use one coordinator, existing cached build commands, and direct Node runtime
   children. Serial rebuild/synchronization precedes consumer restart. Avoid
   parallel Nest and shared-library watchers writing partial outputs.
3. Watch authored source roots only, debounce events and compare content hashes.
   Ignore dist, generated clients/protos, caches, dependencies and tests. Queue
   edits arriving during a build. No repeated whole-repository polling on HDD.
4. Ordinary app changes restart that native app; shared changes restart affected
   native consumers. Stop them before build/overlay; a failed build leaves those
   consumers stopped until a successful edit, while unrelated apps continue.
5. Preserve app/root/process env loading for secrets and store configuration.
   A named native profile fixes service binds and RPC routes to inventory host
   ports and local DB URL ports to Compose's published PostgreSQL port, preserving
   credentials/database/options. Validate free ports and readiness, never kill unknown listeners or
   edit operator env files. Never automatically migrate, seed or stop containers.
   Manifest/lock/schema/tooling changes stop the session for explicit preparation.
6. Prove planning, queue/failure/shutdown and real pnpm injected output behavior
   with owned fixtures before handing over initial builds/live proof to Salar.
   First application proof is Order/Gateway; no Docker image rebuild is needed.

Improvements over the initial outline: automatic native caller scope prevents
broken Docker routes; one build owner prevents watcher races; bounded authored
roots/content checks prevent output loops and duplicate HDD work. The tradeoff
is a cached build/restart rather than in-process hot reload, and selected caller
companions may enlarge native scope. The plan command makes that cost visible.

## Before-edit exact consumer trace

| Owner/consumer path                                                                                                                                                                     | Action or preserved reason                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/backend-dev.mjs` (new)                                                                                                                                                         | Selection/caller plan, authored-input watcher, queued builds, native env profile, owned process lifecycle and readiness.                               |
| `scripts/backend-dev.test.mjs` (new)                                                                                                                                                    | Real inventory/routing, changes, failure/queue/shutdown and injected workspace fixture checks; no real DB/Compose startup.                             |
| `scripts/backend.mjs` loadBackendServices/backendServices/repositoryRoot                                                                                                                | Reuse inventory. Existing buildDevCommands/runBackendDev/CLI and full-backend scripts remain unchanged.                                                |
| `scripts/docker/backend-build-graph.mjs` selectedGraph/syncInjectedRuntime                                                                                                              | Reuse producer order and verified cache overlay. Keep Docker builds/CLI/tests unchanged; async dev commands use the same build policy.                 |
| `package.json` scripts                                                                                                                                                                  | Add explicit dev:watch and focused test aliases. No dependencies, versions or service inventory changes.                                               |
| `.github/workflows/ci.yml` quality                                                                                                                                                      | Add the focused dev-tooling test to existing quality coverage; no image targets/cache/security changes.                                                |
| `apps/order-service/src/{app.module,main,auth-client.module,settings-client.module,product-client.module,health.controller}.ts`                                                         | Inspect native env, outbound RPCs, readiness and shutdown; no app changes.                                                                             |
| `apps/gateway/src/{app.module,main,health.controller,gateway-readiness.service}.ts`, `apps/gateway/src/downstream/gateway-grpc-clients.module.ts`                                       | Inspect routing/readiness and native companion requirement. No Gateway contracts, policies or generated clients change.                                |
| `apps/*/src/config/env.validation.ts`, actual `apps/*/src` RPC references, `docker-compose.yml` depends_on                                                                              | Read-only sources for runtime caller closure and host port requirements across eleven services. No sibling application build dependency is introduced. |
| `packages/config/src/env.validation.ts`, runtime environment ownership document                                                                                                         | Preserve bind schema and precedence; document explicit native network overrides. Never print real env contents.                                        |
| `packages/{clients,grpc-auth,config,protos,migration-artifacts}/package.json`, `pnpm-workspace.yaml`, `.npmrc`, `turbo.json`                                                            | Preserve injected dependencies, package output files and existing cache settings. No dependency/lock/Turbo redesign.                                   |
| Selected app Prisma schema/generated client and native dependency assets                                                                                                                | Generate only native SQL owners at session startup. Do not migrate. Schema/manifest changes require explicit preparation and a new session.            |
| `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `docs/architecture/local-dev-and-docker-boot.md`, `docs/architecture/runtime-environment-ownership.md`, `docs/docker-configs.md` | Document selected workflow, outcome limits, handoff and restoration.                                                                                   |
| Accepted Dockerfile/Bake/release tooling, APIs/DTOs/proto contents/SQL/demo data                                                                                                        | Unchanged. No image rebuild, contract regeneration or migration is justified merely by this dev-tooling change.                                        |

Sources consulted: [Node 22 filesystem watch](https://nodejs.org/docs/latest-v22.x/api/fs.html#fswatchfilename-options-listener)
and [Turbo watch limitations](https://turborepo.dev/docs/reference/watch).
Built-in Turbo watch does not itself prove our injected-copy synchronization;
its documented output-loop/caching limitations support keeping the accepted
build/cache mechanism and adding a scoped coordinator.

## Evidence and handoff receipt

Preparation found a confirmed native network mismatch: Order's resolved DB URL
port differs from Compose's published PostgreSQL port, while both native Redis
ports match. A valid URI/schema alone did not establish correct routing. Before
handoff, extend the explicit native network profile to the published DB port,
preserving credentials/database/query and rejecting remote or wrong-owner URLs.
Do not rewrite operator env files or replace credentials with migration-admin
defaults. Derive the port from the existing literal Compose publication.

Additional before-edit consumers: `scripts/backend-dev-env.mjs` (new), a Node 22
ESM preload with top-level awaited Nest env loading/validation, normalizes the
local DB endpoint before the unchanged compiled main executes. The watcher uses
`node --import` so CommonJS main guards (including Gateway) remain correct.
`backend-dev.test.mjs` must verify precedence, URL credential/query preservation,
wrong-owner/remote rejection and no file mutation; docs must name the DB-port
override. This replaces the earlier inline validation-only probe. Existing
Compose ports, credentials, schemas and module startup logic remain unchanged.

## Implementation and preparation results

- Added `scripts/backend-dev.mjs`, `scripts/backend-dev-env.mjs` and the focused
  test file. Root aliases `dev:watch` and `test:backend-dev` are wired; CI runs
  the focused fixture tests. Existing full-backend launcher, app manifests,
  dependencies/lockfile, shared build helper, Docker/release and contracts are
  unchanged. Their consumer review results are preserved below.
- `pnpm dev:watch order-service --plan` reports Order plus Gateway, four shared
  producers, seven Docker backend dependencies and PostgreSQL port 15432. It
  does no build/startup/secret-file parsing. Actual source consumer paths are
  recorded in `.ci-evidence/backend-dev/caller-trace.json`.
- `pnpm test:backend-dev`: 15/15 pass, zero skips/failures. It exercises real fs
  watch/save/deletion and new authored directories, failure recovery, edits
  during build, process/port/session ownership, real Nest precedence/expansion,
  secret-safe diagnostics, URL credential/query/shadow preservation, and remote/
  wrong-owner rejection. Native subprocess tests verify awaited preload and
  CommonJS main guards. Real pnpm 10.17.1/Turbo fixtures check changed values
  and actual injected consumer output after a cached producer restore.
- The initial peer-free fixture legitimately resolved a direct workspace link.
  It was corrected to include distinct local peer contexts and an actual
  injected consumer; the original copy-location assertion was preserved, not
  removed. Authoring/install fixtures remain offline; their locks are generated
  by pnpm, with actual installation frozen and lifecycle scripts ignored.
- Existing backend orchestration tests: 83/83 pass. Existing graph/packaging
  checks: 23/23 pass. No skipped/failed checks in those final runs. Tool fixtures
  use CI/GitHub Actions environment settings. No broad app suite was rerun.
- `node scripts/check-backend-test-types.mjs`: all eight applicable live owners,
  125 test/helper files, zero errors. Gateway/Realm/Authority are not claimed as
  extra owners of that script's test:e2e-based selection. No app TypeScript or
  contract changes require a new preflight/contract generation run.
- Cached compiled-schema environment probes for current Order/Gateway pass.
  A preliminary 15s probe timed out during concurrent checks; a subsequent
  bounded retry passed. The final native preload check additionally confirms
  actual DB/shadow/Redis ports match Compose, without printing credentials.
  A fresh session rebuilds/revalidates before app startup; these probes are not
  running-image, database-connectivity or application-flow evidence.
- Native Media remains blocked because its scanner TCP listener is deliberately
  private in Compose. No port/security change is introduced. Order/Gateway keeps
  Media containerized. Other native provider cohorts are not live-certified by
  this first pilot; source-derived routing still needs actual runtime proof.

[Node 22.14 CLI documentation](https://github.com/nodejs/node/blob/v22.14.0/doc/api/cli.md#importmodule)
describes ESM preloading with `--import` and labels it experimental in that
version. This is restricted to the opt-in development command and tested on the
pinned runtime, including Windows-safe file URLs; no warning suppression or
production startup change is made.

## Mandatory handoff receipt

Requirement/finding: optional selected-service development workflow, plus a
confirmed native DB-port mismatch caught and corrected before handoff.

Changed files/consumer review: exact trace above, with additional preload noted
before that correction. CLI aliases and CI use the new test file. Full-backend
and accepted shared helpers are unchanged and their existing regressions pass.
No app source/schema/DTO/proto/client/OpenAPI/hash inventory/SQL/seed changes;
therefore no new contract preflight, migration proof or generated-client edits
are required. Accepted Docker COPY inputs are unchanged, so no image/context
rebuild is warranted merely for this tooling. Root script additions may change
the first host Turbo cache keys; no dependencies or lock resolutions changed.

Format/syntax/lint: all three new modules pass scoped ESLint and Node syntax;
changed files pass scoped Prettier and `git diff --check`. Final consumer review
confirms new aliases/CI coverage, unchanged release and application consumers,
and explicit native network overrides in both operator/environment documents.
Actual native application/DB/Gateway flow proof: PENDING SALAR. Startup must
confirm existing Docker dependency readiness and Order migration status. The
watcher applies no migration/seed and never starts/stops containers automatically.

Next named proof: follow the Order/Gateway sequence in the
[operator runbook](../architecture/local-dev-and-docker-boot.md#selected-native-watch-workflow).
It starts existing dependency images, stops the two container equivalents,
checks Order's migration status and runs `pnpm dev:watch order-service` in one
terminal. Once native readiness passes, verify app/shared edits and a Gateway
flow. Initial builds and Compose execution remain Salar-owned.

Known limits: this is a cached compiler/restart loop, not an incremental hot
reload or guaranteed latency improvement. No whole-repository polling; source
snapshots can still cost HDD I/O. Source consumer planning is not image/source
identity evidence; all-eleven native adapters are not certified. Scanner native
transport stays deferred. Image integration/release/D2 feature-specific proofs
remain separate. A forced crash may leave the guarded session lock for explicit
inspection/removal after the process is confirmed stopped.

Readiness: READY FOR OPERATOR-OWNED WATCH STARTUP. The implementation and cheap
prerequisites are complete; actual native startup, source/shared-edit restart
and Gateway-flow proof remain pending. No containers or application processes
were started/stopped by the agent for this handoff.

## Operator startup checkpoint - 2026-10-28

Salar supplied Order migration status showing three pending migrations:
`20261019000100_order_status_controls`, `20261024000100_order_cancellation`
and `20261024000200_demo_payment_attempts`. The status exit was a pending-migration
result, not a database connectivity failure. The handoff used the existing
`pnpm db:migrate:order` and `pnpm db:status:order` commands before startup;
their final migration stdout was not supplied, so exact deployment/rerun facts
are not independently certified here.

Salar then supplied `[dev-watch] ready: order-service, gateway` at 10:55 local
time, with both services' `service_ready` events and HTTP 200 readiness logs.
Actual native startup is now operator-reported passed. Existing preparation
checks remain valid; no implementation changed. Salar subsequently supplied all
six passing F3 results: Gateway readiness, anonymous and authenticated storefront,
authorized admin, registered mobile and disabled partner execution. Gateway
application compatibility for that suite is now operator-reported passed.
Salar supplied the two source-edit ready messages: adding a harmless comment in
`apps/order-service/src/main.ts` produced `ready: order-service`; the shared
`packages/clients/src/order.client.ts` edit produced
`ready: order-service, gateway`. Both actual restart scopes pass. Direct file
inspection confirms the temporary comments are still present; their removal and
subsequent ready events remain pending, followed by Ctrl+C and verification that
the session lock and selected HTTP listeners are released. This checkpoint does
not close D2 payment/cancellation runtime gates or certify all Docker containers.
No business logic or application contract was changed by these comment probes.

## Pilot closure - 2026-10-28

After the cleanup/shutdown handoff, Salar supplied `Test-Path` returning `False`
for `.ci-evidence/backend-dev/session.lock` and no listening connections for
ports 3002/3005. Agent inspection confirms both temporary `watch check` comments
are absent. The pilot acceptance is complete: startup, F3 application flows,
owner-only and shared-consumer restart scopes, and shutdown/lock/HTTP-port
release. Removal-save ready logs and a process-wide PID inventory were not
supplied; do not imply those additional observations. Earlier fixture tests
provide separate owned-process cleanup and shared-output correctness evidence.

The historical pending handoff/checkpoints above are superseded by this closure.
No implementation changed during acceptance; earlier focused tests remain valid.
Only evidence/status/runbook documents changed, with scoped formatting and diff
checks. No new app suites, preflight, image builds or CI runs are warranted for
those documentation updates. The current uncommitted tooling snapshot has not
been certified by a new hosted CI run. All-eleven native adapters, private
scanner access and D2 payment/cancellation feature proofs remain outside this
pilot's acceptance. Return to the preserved D2 Batch 3 deployment/runtime plan.

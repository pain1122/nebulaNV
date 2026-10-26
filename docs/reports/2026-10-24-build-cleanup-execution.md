# ASAP build cleanup execution

Date: 2026-10-24. Checklist: [ASAP cleanup](../ASAP-BUILD-CLEANUP.md).

## Slice 1 - selection and unused shared dependency

Before-edit finding: seven normal image targets and the operator Realm Auth
profile inherit `BACKEND_BUILD_SERVICE=all`. The runner's internal API accepts
selected services but its CLI/wrapper always request the full inventory. The
config package declares protocols without any authored source/test consumer.
These are confirmed scope defects/stale dependency metadata. Keep frozen installs,
sequential execution, bounded concurrency and injected runtime synchronization.

Working tree already contains extensive D1/D2/media implementation changes;
inspection included tracked and untracked status and scoped differences. Preserve
all prior work. No staging, commit, push, database or container mutation is planned.

### Before-edit impact table

| Changed owner        | Exact consumer paths                                                                                                                                                                                                                                                                                     | Action / preserved reason                                                                                               | Evidence                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Compose selectors    | `docker-compose.yml`, `docker-bake.hcl`, `docker/backend.Dockerfile`, `scripts/backend.test.mjs`                                                                                                                                                                                                         | Add all leaf selectors, including operator profile; preserve target names/tags/context and common runtime               | Source read; rendered configuration and inventory test pending                     |
| Runner selection     | `scripts/backend.mjs`, `scripts/backend.test.mjs`, `scripts/docker/build-backend.ps1`, `package.json`, `.github/workflows/ci.yml`                                                                                                                                                                        | Expose validated selection/plan/timing; root aliases and CI default all-service calls unchanged                         | Source read; focused tests pending                                                 |
| Config dependency    | `packages/config/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `packages/config/tsconfig.json`, `packages/config/src/index.ts`, `packages/config/src/env.validation.ts`, `packages/config/test/env-validation.spec.ts`, `packages/config/jest.config.ts`                                       | Remove unused declaration through lockfile generation; no schema/validator behavior change; preserve injection settings | Complete config authored TS/JSON/MJS scan found reference only in manifest         |
| Config consumers     | `apps/realm-auth-service/package.json`, `apps/order-service/package.json`, `apps/gateway/package.json`, `packages/config/test/health-wiring.spec.ts`, `packages/config/test/logging-wiring.spec.ts`, `packages/config/test/http-policy-wiring.spec.ts`, `packages/grpc-auth/test/service-wiring.spec.ts` | Keep actual config imports/health/logging/security behavior; inspect lockfile/runtime dependency effects                | Existing audit source trace and Turbo dry-run; follow-up checks pending            |
| Commands/docs        | `docs/architecture/local-dev-and-docker-boot.md`, `docs/docker-configs.md`, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `docs/reports/2026-10-24-backend-build-audit.md`, `deploy/README.md`                                                                                                  | Document new selection and limitations; release image loading stays unchanged                                           | Edits/review pending                                                               |
| Public contracts/SQL | `packages/protos/*.proto`, `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`, D2 migration/SQL/live drivers                                                                                                                                                          | Unchanged: no transport fields, route inventory or SQL behavior altered. Do not regenerate/rebaseline contract pins     | Existing passing evidence retained; preflight applicability reviewed after changes |

### Required checks and proof boundary

Run formatting, Node syntax, PowerShell parsing, focused backend tooling tests,
config types/tests, rendered Compose/Bake validation and a Turbo dry-run after
metadata changes. Lockfile changes must be pnpm-generated and narrowly reviewed;
do not hand-edit injected dependency snapshots. A metadata-only install is not
evidence of a runnable image. Pruned builds/cache restoration and standalone
runtime proofs belong to slice 2. Do not request an expensive image build merely
to demonstrate the selector change.

### Additional prerequisite failures found before handoff

The four inspected config wiring suites initially returned 54 passes and five
failures. None of the failing application/test files had been changed by this
slice. Classification and narrow correction, recorded before editing:

- Stale health assertion: Realm Auth is an HTTP-only shadow boundary with no
  shared auth guard. Do not add a protocol/security dependency merely to satisfy
  an unrelated decorator assertion. Preserve the assertion for guarded services;
  for Realm Auth explicitly assert absence of an auth guard and its two real
  readiness probes. Consumer paths: `packages/config/test/health-wiring.spec.ts`,
  `apps/realm-auth-service/src/app.module.ts`, `apps/realm-auth-service/src/health.controller.ts`.
- Stale Docker health count: Realm Auth's single HEALTHCHECK has two conditional
  URL literals. Count one HEALTHCHECK per exact inventory runtime stage, rather
  than counting URL text. Preserve coverage of all eleven stages and ready URLs.
  Consumers: the health wiring test and `docker/backend.Dockerfile` (unchanged).
- Existing policy integration gaps: `apps/realm-auth-service/src/prisma.service.ts`
  and `apps/tenant-authority-service/src/prisma.service.ts` lack the bounded
  `prisma_error` event sink already required by `packages/config/test/logging-wiring.spec.ts`.
  Apply the existing typed Prisma event configuration from Media; preserve lazy
  connection and disconnect behavior, never print event payloads or database URLs.
- Existing configuration integration gap: Authority's bootstrap already uses
  shared HTTP CORS policy but its Joi schema omits `httpPolicyEnvSchema`. Add the
  existing schema composition, preserving identity/database/key validation.
  Exact consumers: `apps/tenant-authority-service/src/config/env.validation.ts`,
  `apps/tenant-authority-service/src/main.ts`,
  `apps/tenant-authority-service/test/authority-foundation.spec.ts`,
  `packages/config/test/http-policy-wiring.spec.ts`, `packages/config/src/http-policy.ts`.

These are prerequisite consistency corrections, not tenant features or a new
logging/security architecture. Realm Auth/Authority types, scoped lint and actual
behavior checks must pass; their runtime source/image drift is newly pending.
Behavior consumers added before handoff:
`apps/realm-auth-service/test/prisma-logging.spec.ts` and
`apps/tenant-authority-service/test/prisma-logging.spec.ts` instantiate the actual
service class against an inert Prisma transport, require event-only error output,
deliver a sensitive error payload and assert that only the fixed marker reaches
the logger, and check disconnect. The Authority foundation control fixture also
proves exact-origin acceptance and wildcard rejection without weakening its
existing database/key validation assertions. No real database is involved.
Root MJS lint also found seven equivalent multi-space regex style findings in
the touched tooling test; normalize those patterns without changing matching.
Node globals must be explicitly supplied because root ESLint config supplies
Node globals for TypeScript files only. Prettier does not support PowerShell;
use its AST parser rather than installing a formatter or claiming that check passed.

Status: implementation/checks in progress; no broad/image handoff yet.

### Dry-run discrepancy and narrower task selection

After removing config's unused protocol edge, `config#build.dependencies` is
empty. However `--filter=@nebula/realm-auth-service...` still selects six tasks:
the three needed owners plus disconnected clients/grpc-auth/protos. With plain
`--filter=@nebula/realm-auth-service`, pinned Turbo selects exactly Realm Auth,
config and migration-artifacts; `^build` still supplies the actual prerequisites.
The trailing dependency selector traverses a broader package graph than this
task closure. Do not claim the edge removal alone eliminated that work.

The leaf Docker Turbo invocation now uses the plain package selector with the
existing `^build` relationship retained. Full-backend selection stays unchanged.
Root workspace dependency/global-cache coupling still requires review during
the graph pilot; the five forced shared builds remain explicitly pending too.
Actual read-only dry-run behavior is the evidence here, not a new unsupported
Turbo flag or a presumed upgrade requirement.

### Slice 1 result and handoff receipt

Implemented: every local Compose/Bake image target selects its own leaf app,
including the operator profile. Runner/PowerShell selection accepts an ordered
service list, validates the entire request, supports a no-Docker plan and reports
elapsed seconds. Partial requests retain sequential failure propagation and
caches. A deliberate full-inventory request overrides all runtime targets with
one common `all` compilation scope; it must not repeat eleven different compile
stages. A partial multi-image union remains slice 3, not a current capability.

Dependency metadata: pnpm 10.17.1 generated the config importer without protos.
Its first lockfile-only resolution also normalized unrelated frontend peer
entries. Retained only the generated config importer and restored the unchanged
baseline elsewhere; no injected snapshot was hand-authored. Final delta from
the pre-slice lockfile is exactly that three-line declaration removal, with no
package version change. Frozen offline lockfile-only validation passed in 874ms.
The initial resolver reported existing frontend deprecation/React peer warnings;
no frontend fix or dependency upgrade is included. Local node_modules was not
reinstalled; fresh install/injected runtime correctness remains a pilot proof.

Actual local results:

- Node syntax passed. MJS lint passed with explicit Node globals; seven regex
  space patterns were changed to equivalent quantifiers. PowerShell AST parse
  and actual selected-service `-Plan` execution passed without invoking Docker.
- Scoped lint passed for Realm Auth/Authority changed source and tests. Config's
  own project-service ESLint rejects test files outside its production tsconfig;
  the changed health test passed the root test lint config and ts-jest compilation.
  No ESLint config/rule or TypeScript production exclusion was weakened.
- Config, Realm Auth and Authority production type checks passed.
- Six focused backend-tooling tests passed: inventory/readiness, selection
  rejection, no-execution plan, full-scope reuse, operator selector and sequential
  failure/cache/timing behavior. These use inert subprocesses, not real builds.
- Four config wiring/env suites passed: 59/59. Three focused Realm Auth/Authority
  suites passed: 5/5, including real service constructors with mocked Prisma
  transport and valid/invalid HTTP origin control cases. No test was removed.
- `pnpm test:preflight` passed: OpenAPI/generated-client freshness plus four
  suites, 23/23 checks. No contract output or inventory pin changed in this slice.
- Rendered normal Compose and Bake each contain eleven correct leaf selectors;
  rendered `r3-shadow` operator profile selects Realm Auth. Captured only build
  metadata, never runtime secret values. No container mutation occurred.
- Corrected Realm Auth task dry-run selects exactly migration-artifacts, config
  and Realm Auth. The full/partial runner planning is separately tested. This
  is graph evidence, not compile duration or image isolation evidence.
- Formatting and repository-wide `git diff --check` passed. Git reports existing
  CRLF-to-LF notices for `.gitignore` and two proto files; no whitespace error.

After-edit impact review: the table above and additional prerequisite consumer
list are resolved for this slice. `package.json` command aliases, CI calls,
`docker-bake.hcl` target inventory and `deploy/README.md` release loading remain
compatible; Bake only gains an explanatory comment. Runtime env files, protocols,
OpenAPI/SDK generation, application schemas, D2 fixtures and SQL are unchanged.
`TODO-ALTERNATIVE.md` and current-focus now link the separate cleanup checklist.
The audit remains historical evidence with a link to this implementation record.

```text
Requirement/finding: remove accidental full-app selection and unused config edge.
Changed files/consumer trace: tables and prerequisite trace above; reviewed.
Format/syntax/lint/types: passed with the stated test-config/Node-global handling.
Focused behavior/contracts: 70 focused checks plus 23 preflight checks passed.
Actual SQL/runtime: no SQL change; fresh installation/images/live proofs pending.
Source/image drift: build inputs and Realm Auth/Authority policy sources changed;
  existing running images do not certify these changes. No rebuild requested yet.
Known limitations: full-backend install/source copies, forced shared prebuilds,
  root workspace/global-cache coupling and production packaging remain open.
Next broad command: none; prepare the Order graph pilot before spending build time.
Readiness: SLICE 1 CHEAP GATES PASSED; ORDER PILOT IMPLEMENTATION NEXT.
```

No measured speedup is claimed. No build/cache prune, Compose restart, actual
dependency install, WSL setting change, staging, commit, push or deployment ran.

### Acceptance scope clarification

Salar supplied another Product build duration: 1,339.1s (22m19s). This is an
operator-reported total, without a new per-stage breakdown. It confirms Product
must remain an explicit acceptance target; it does not establish a new cause.
The pilot is one reusable shared build path with paired Product/Order checks,
followed by all-service rollout and Gateway/Media-specific closure checks. It
is not an Order-only optimization or a separate Docker implementation per app.
The original Order-first receipt above records the earlier checkpoint; the live
checklist/current-focus now own this clarified scope. No new benchmark was run.

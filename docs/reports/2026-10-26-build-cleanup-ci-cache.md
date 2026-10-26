# Build cleanup - bounded CI caches

Date: 2026-10-26. Status: before-edit implementation trace; hosted proof pending.
Previous: [all-target build acceptance](2026-10-26-build-cleanup-segment3.md).

## Verified requirement and narrow approach

Local warm batch is now verified at 111.1s (1m51.1s) for all eleven images:
every RUN cached, zero Turbo misses, application manifests and config digests
unchanged from initial images (attestation/index identities can change). Raw log,
SHA-256 and per-image summary are retained in `.ci-evidence/build-graph-rollout/`
as `warm-build.log` and `warm-summary.json`. Prior native offline checks continue
to cover identical application/config bytes; do not repeat builds or DB proofs.

Confirmed CI gap: two ephemeral Ubuntu jobs retain pnpm dependency caches, but
neither host Turbo task cache nor Docker build layers persist explicitly between
runs. Existing quality -> live-e2e ordering and scans stay mandatory. Add host
Turbo restore to both jobs; save only successful main pushes with at most 1GiB
of `.turbo/cache`. Use per-image BuildKit GHA v2 scopes via CI-only Bake overlay,
read-only on PRs and export only on main pushes. Use a cleanup-enabled container
builder and official/Docker-documented pinned actions. No registry, new secret,
paid cache limit or Windows cache/resource change. Existing cache/provider
availability remains an accelerator, never acceptance evidence.

Narrower integration choice: `BUILDX_BAKE_FILE` adds the overlay only inside the
live GitHub job, preserving runner CLI and normal Compose/Bake defaults. Do not
edit `scripts/backend.mjs`, Dockerfile or package/lockfile merely to enable cache
flags: those would invalidate already verified image build inputs unnecessarily.
Per-target cache namespaces prevent one image overwriting another's final layers.
Host Turbo persistence and Docker layer persistence are separate. Docker cache
mounts (pnpm/Turbo) remain local to a builder, not part of exported layer cache;
this step does not falsely claim their cross-run persistence. Cache-mount transfer
or a persistent runner is a separate benchmark decision if measurements justify it.

Primary references checked:

- [Docker CI cache management](https://docs.docker.com/build/ci/github-actions/cache/):
  cache backend, GHA runtime exposure and cache-mount limitation.
- [Bake file environment](https://docs.docker.com/build/building/variables/#buildx_bake_file):
  supported since Buildx 0.26, explicit multi-file source order.
- [GitHub cache limits](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching):
  documented defaults 10GB per repository and seven days unused; repository policy
  may differ. This change does not alter repository policy or enable paid storage.
- Official action manifests and tag SHAs checked: actions/cache v6,
  docker/setup-buildx-action v4.3.0, Docker-documented GitHub runtime exposure v3.
  Pin exact SHAs and retain existing action pins; no blanket dependency upgrade.

## Before-edit owner / consumer impact table

| Owner / exact consumer                                                                                                                                                      | Action or unchanged/deferred reason                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`: quality and live-e2e                                                                                                                            | Add narrow host Turbo restore/save, fixed upload size guard, scoped CI Bake overlay, pinned container builder/runtime helper, tested-image identities. Preserve all quality/live/scan/tracked-diff/artifact/cleanup steps.      |
| New `.github/backend-cache.hcl`; `docker-bake.hcl`; `docker-compose.yml`                                                                                                    | Overlay exact eleven inventory targets with stable independent GHA v2 scopes. Existing default files unchanged. Validate actual local Bake merged output for read-only/writer modes and default local no-remote-cache behavior. |
| `scripts/backend.test.mjs` CI policy/artifact inventory                                                                                                                     | Parse actual workflow YAML with the installed ESLint js-yaml dependency. Assert two-stage gates, restored-only paths, writer restrictions, pins, overlay scope and exact retained evidence. No weakened old assertions.         |
| New `scripts/docker/record-image-identities.mjs` / focused tests                                                                                                            | Record only inventory image names, IDs and RepoDigests after passing live scans; exclude Config/env/labels. Test actual schema/redaction/failure behavior with injected Docker responses. No bootstrap or registry calls.       |
| `scripts/backend.mjs`, `scripts/docker/backend-build-graph.mjs`, `docker/backend.Dockerfile`, `.dockerignore`, root `package.json`/lockfile, generated/source/SQL contracts | Unchanged. CI-only files and tests are not Docker COPY inputs. Earlier all-image native/warm/runtime and contract/preflight evidence stays valid.                                                                               |
| `scripts/docker/check-build-context.mjs`, `scripts/docker/build-backend.ps1`, save/load scripts, `docker-compose.release.yml`                                               | Unchanged. No COPY/ignore edit, image tag/count or release packaging change. New builder must keep `--load` so Compose and image scans inspect the same loaded outputs.                                                         |
| `.ci-evidence/backend-tested-images.json`, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`, Docker/build guides                                | Exact allowlisted evidence addition with existing 14-day artifact policy; separate implemented local checks from unrun hosted cache round-trip. Preserve local warm metrics and pending D2 rollout.                             |

Cheap preparation: YAML parse/action input review; actual Bake render in both
cache modes plus no-overlay control; focused workflow/evidence tests; JS syntax,
Node-scoped lint, formatting/diff; shell syntax for fixed size guard. No hosted
cache credentials exist locally, so actual GHA cache upload/restore and full
hosted pipeline remain PENDING. Do not request another local image build: no
production build input is changed. Do not commit/push or trigger CI without user
authorization for that external write.

Before-edit refinement after inspecting runtime helper source: use the official
`actions/github-script` action to expose only `ACTIONS_RUNTIME_TOKEN` and
`ACTIONS_RESULTS_URL`, explicitly masking the token. The Docker-documented third
party helper iterates/logs all ACTIONS variables; broad exposure is unnecessary
for this new integration. No existing mechanism is being replaced. Pin the
reviewed official action SHA and verify the two names/runtime helper order in
policy tests. Pin CI Buildx to 0.28.0 (matching tested local minor) and BuildKit
0.24.0 to inspected official index digest
`sha256:6eceb8971ce4fceb3daca562832642706238b7eea72941fcf9896c93c3c4a53e`.
These are CI-only action/builder settings; no local builder switch is requested.

## Implemented changes and consumer review

The CI-only overlay gives all eleven targets distinct stable GHA v2 scopes and
max-mode layer exports, bounded to three minutes per best-effort export. PRs read
only; main pushes may write. The ordinary local Bake configuration has no remote
cache settings. The overlay changes neither target/context/Dockerfile/build args
nor image tags. Existing sequential runner/`--load` and all quality/live/scan gates
are unchanged. CI uses the inspected pinned Buildx/BuildKit and cleanup-enabled
container builder; the user's local builder, GC and resource settings are untouched.

Host Turbo restore uses OS/architecture + policy/lock hash + commit, with fallback
to the same policy prefix. Both jobs restore only `.turbo/cache`. Successful main
quality runs save only a missing commit key and only when the cache is present
and at most 1,073,741,824 bytes. No broad directory/node_modules/env caching,
repository cache-policy change, registry push or new long-lived secret is added.
Do not confuse GitHub's cache expiry/quota with 14-day evidence artifact retention.

Official github-script exposes only two required runtime fields and masks the
runtime token before exporting it. A focused execution test proves exact exports,
masking, absence of unrelated-secret exposure and clear failure for missing fields.
No real credential was printed or used in local rendering/tests.

New image evidence records schema/commit and exact inventory image references,
IDs and repository digests, without inspect Config, env or labels. The workflow
runs it after successful live image scans and retains its one allowlisted JSON
under the existing fourteen-day live evidence artifact. Local collector execution
is explicitly a read-only identity test, not hosted/live acceptance. Production
source, Dockerfile, runner, generated/API/SQL contracts and package/lock remain
unchanged. Every changed CI/test/evidence implementation file is outside literal
Docker COPY inputs, verified with the existing parser. No local rebuild is needed.

## Local verification

- Seven focused tooling/CI/evidence/runner tests pass, zero failures/skips. Real
  YAML parsing validates job ordering, action pins, writer restrictions, cache
  paths/keys, masked runtime script and exact artifact allowlist. Image evidence
  tests cover complete inventory, secret exclusion and missing/invalid image data.
- Actual Docker Bake renders pass for default local control, CI read-only and CI
  writer overlay: exactly eleven targets/scopes, correct GHA v2 flags and unchanged
  build args/tags/contexts. Retained `.ci-evidence/build-ci-cache/bake-cache-render.json`.
  No build/cache upload was run and no local builder was switched.
- Actual workflow Bash guard parses and executes on the installed Git Bash.
  Absent cache skips, small real directory saves, injected du results exactly at
  1GiB save and one byte over skip. No giant files are created. Tiny diagnostic
  fixtures/output remain under `.ci-evidence/build-ci-cache/`.
- Actual image collector inspects eleven current local images; writes only the
  allowlisted schema to `.ci-evidence/build-ci-cache/local-image-identities.json`.
  No containers are started by the collector; no Config/env is retained.
- JS syntax and scoped Node ESM lint pass; final format/diff gates are recorded
  before handoff. Existing producer/contract/SQL/native checks remain valid because
  their implementation/build inputs did not change.

```text
Requirement: persist host Turbo and Docker CI layers without altering accepted local builds.
Consumer trace: before-edit table and revisited exact owners above.
Cheap gates: seven focused tests, actual Bake read/write/control renders, Bash
  budget execution, credential-script masking tests, real identity collector,
  source syntax/Node lint and final formatting/diff/new-file whitespace pass.
Native/local evidence: unchanged eleven-image warm proof 111.1s and offline
  closure retained. No rerun/rebuild is justified for these CI-only changes.
Hosted status: actual GitHub cold-cache/warm-cache round trip and full pipeline
  execution PENDING; local rendering is not a hosted cache success claim.
Limitations: Docker cache mounts remain ephemeral between fresh hosted builders;
  host Turbo and layer caches are distinct. Provider eviction/throttling can
  reduce hits. Existing repository quota/expiry/billing policy is not changed.
Next validation: next authorized GitHub CI run followed by another comparable
  run; retain cache import/export/hit output, tested image identities and all
  existing quality/live/scan results. No commit/push/run triggered by the agent.
Readiness: READY FOR HOSTED CI VALIDATION; remote proof still pending.
```

## First hosted run - fixture preparation defects

Snapshot `60b678e` was pushed normally to main with explicit user authorization.
[Run 40320030037](https://github.com/pain1122/nebulaNV/actions/runs/40320030037)
passed frozen installation and all 79 backend tooling tests, then graph checks
passed 7/9. Union fixture failed pnpm's CI-default frozen lock: it adds a Product
workspace after creating the first lockfile without regenerating that fixture's
lock. The exact-once fixture recorded zero prototype compile headers under CI;
the capture helper reads stdout only, while Turbo's CI output may use stderr/ANSI.
No actual service build/image run failed at this checkpoint. No later step is
claimed green or bypassed.

Before-edit trace: `scripts/docker/backend-build-graph.test.mjs` fixture `run`,
union fixture's second install and producer log assertions; `pnpm test:build-graph`
invoked unchanged by CI quality; `scripts/docker/backend-build-graph.mjs` production
install/build logic and Dockerfile remain unchanged. Correct only owned temporary
fixture lock authoring (pnpm lockfile-only generation followed by explicit frozen
install) and normalize both output streams for assertions. Run fixture processes
with CI defaults locally to reproduce/guard platform differences. Preserve exact
producer counts, failure restoration and real pnpm/Turbo tests. No root lockfile,
package, service or schema edit. Fresh hosted rerun remains required after focused
checks; native image rebuild is unnecessary for this test-only correction.

Fixture correction is locally verified: the temporary union lock is authored by
pnpm lockfile-only generation, then installed with explicit frozen-lockfile.
The test runner now always uses CI=true and normalizes captured stdout + stderr
with Node's VT-control stripping before counting task headers. All nine real
pinned-tool tests pass (53.97s) with exact producer counts and no skipped checks;
syntax, scoped lint and formatting pass. Production frozen installs, source,
root lockfile and graph/build logic are unchanged. A new hosted run is required;
no remote success is inferred from this Windows check.

Second hosted run (`1b69388`, run 40320881055) confirms fixture lock authoring is
fixed, but both exact-count checks still see zero headers. Reproduced locally
with **both CI=true and GITHUB_ACTIONS=true**: Turbo emits
`::group::@nebula/protos:build` followed by unprefixed `cache miss`, rather than
`@nebula/protos:build: cache miss`. Capturing stderr/stripping ANSI alone was
insufficient; this is now a confirmed formatting cause, not an inferred cache miss.
Raw reproduction retained in `.ci-evidence/build-ci-cache/github-grouped-repro.log`.
Pinned Turbo help documents `--log-order=stream` and `--log-prefix=task`.

Before-edit extension: fixture `run` uses those explicit formatting flags only
for `turbo run`, preserving prune/install arguments and exact producer assertions;
its environment always simulates CI and GitHub Actions. No production command,
root lock, app or image changed. Add this observed environment-default case to
`docs/testing/pre-suite-checklist.md` Gate 3 so tooling checks cover hosted output
and lock-policy differences before another handoff. Keep full failed-output
diagnostics and verify real pinned-tool behavior before pushing the correction.

The exact GitHub-default reproduction now passes 9/9 (45.91s), no skipped tests.
Fixture Turbo run calls explicitly request stream/task-prefixed output; prune,
lock authoring and frozen install arguments remain unchanged. `CI=true` and
`GITHUB_ACTIONS=true` are both exercised even on Windows. Parser expectations,
real compilation and restored-artifact assertions remain strict. Added the
observed hosted-default check to the mandatory pre-suite preparation gate.
Scoped lint/syntax/format/diff pass before the next push; hosted acceptance is
still pending and the two failed runs remain recorded.

## Hosted dependency gate - confirmed blockers

Run 40321660634 (`f188118`) passed all 79 backend tooling checks, all nine graph
checks and the actual COPY-context probe. Its dependency gate correctly stopped
on ten high/critical advisories across seven runtime packages: grpc-js 1.14.4,
Nest microservices 11.1.28, body-parser 2.3.0, compression 1.8.1, Joi 18.0.1,
Multer 2.2.0 (four advisories), and proxy-addr 2.0.7. The downloaded allowlisted
report is retained under `.ci-evidence/build-ci-cache/hosted-f188118/`.

The local scanner reported zero with empty audit metadata. This is a confirmed
validation defect: `generateBackendDependencyReport` accepts an exit-1 JSON error
object as an empty advisory report. That local result is invalid evidence.
Validate the audit response before classifying it, preserving the runtime gate
and all advisory assertions. No advisory suppression or threshold change.

Before-edit consumer trace:

| Owner                                                    | Exact consumers inspected                                                                                                                                                                                                                                    | Action and validation                                                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/backend.mjs` audit response parsing             | `scripts/backend.test.mjs` dependency classification/report tests; root `scan:dependencies:backend`; `.github/workflows/ci.yml` quality gate                                                                                                                 | Reject error/missing/malformed reports before inventory or green report; regress failed registry responses and valid empty reports. CLI/CI command unchanged.                                                                     |
| Root/workspace dependency manifests and `pnpm-lock.yaml` | Root; `apps/{auth-service,blog-service,gateway,media-service,order-service,product-service,realm-auth-service,settings-service,taxonomy-service,tenant-authority-service,user-service}/package.json`; `packages/{clients,config,grpc-auth}/package.json`     | Keep aligned Nest 11/Joi versions; use same-major supported fixes and pnpm-authored lock. Exact versions/final resolution recorded after verification.                                                                            |
| Shared dependency/build consumers                        | `scripts/docker/backend-build-graph.mjs`, `scripts/docker/backend-build-graph.test.mjs`, `docker/backend.Dockerfile`, `scripts/backend.test.mjs` Joi alignment assertion, `packages/config/src`, `packages/grpc-auth/src`, Gateway transport/contract checks | No application or generated contract edits planned. Dependency changes invalidate image evidence for the new lock; focused checks/preflight first, hosted build/runtime gates pending. Preserve graph/cache and runtime policies. |

Authoritative sources checked before choosing patches: [Nest advisory](https://github.com/nestjs/nest/security/advisories/GHSA-m8vh-jmq9-5rjg),
[grpc-node releases](https://github.com/grpc/grpc-node/releases),
[Joi advisory](https://github.com/hapijs/joi/security/advisories/GHSA-6h2x-m376-mqjq),
[body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828),
[Multer releases](https://github.com/expressjs/multer/releases),
[compression advisory](https://github.com/advisories/GHSA-vc2v-76pw-4v95) and
[Express proxy dependency correction](https://github.com/expressjs/express/issues/7473).
Registry manifests confirm Nest 11.2.5 remains on Express 5.2.1 and pins Multer
2.2.0, so that transitive pin needs a scoped correction. Staying on the existing
major avoids a Nest 12 migration; application compatibility remains subject to
the existing tests. Unrelated deferred-web/tooling findings remain classified
under the established policy, not represented as fixed.

Correction and revisited consumers: all fifteen root/backend/shared manifests
align Nest runtime/testing/peers to 11.2.5 and Joi schema owners to exact 18.2.6;
grpc-js minimum is 1.14.6, compression minimum 1.8.2. Scoped overrides select
Nest platform's Multer 2.5.0 and Express's body-parser 2.4.0 / proxy-addr 2.0.8.
The pnpm-authored lock also brings required content-type 2.1.0, destroy 1.2.0,
and qs 6.16.1, and removes obsolete concat-stream/typedarray. No other package
versions changed. pnpm normalized two optional ESLint parser peer suffixes under
the unchanged Web importer; no Web manifest/runtime version changed. The existing
Web CKEditor/React peer warning remains visible and outside this backend patch.

Reviewed `packages/config/src/validation.ts`, `packages/grpc-auth/src/s2s.ts`,
`apps/gateway/src/main.ts`, `apps/gateway/src/order/order-api.dto.ts` and their
preflight contract consumers. Strict validation, signed metadata and Order enums
remain unchanged. No route, protobuf, generated OpenAPI/client, fixture or SQL
change is required by these same-major dependency updates. Hosted runtime suites
must still verify compatibility after installing the new lock.

The raw local audit error is ECONNRESET. pnpm registry requests also timed out
and fell back to stale package metadata. An owned temporary local bridge was
unsuccessful and stopped; it changed no registry policy or lock. Official TLS
registry metadata was refreshed in the local pnpm metadata cache; pinned pnpm
10.17.1 then authored the lock offline (33.2s), followed by a successful explicit
frozen-lockfile validation (889ms). No loopback registry/tarball references entered
the lock; no hand-edited lock data or production registry configuration change.

```text
Requirement: retain security gates while correcting audited backend dependencies
  and rejecting an audit transport error as an empty success.
Impact trace: before-edit table plus exact manifests/lock and revisited transport
  consumers above. Existing classification/threshold/approval policy unchanged.
Cheap checks: backend tooling 80/80; graph tests 9/9 (49.7s); preflight 4 suites,
  23 tests; scoped ESLint recommended/Node globals, JS syntax and formatting pass.
Lock: package-manager generation and frozen lock validation pass. No unexpected
  runtime version changes; unchanged Web parser peer suffix normalization noted.
Audit: subsequent actual pnpm audit returned valid metadata; scanner reports
  runtime=0, tooling=2, deferred-web=43. Old error-only zero report is invalidated.
Runtime caveat: local installed dependencies and images still precede this new
  lock. Local focused checks do not certify the newly patched runtime closure.
SQL: unchanged. Native metadata proof remains a separate hosted acceptance step.
Build decision: lock/manifests/backend tooling are Docker inputs; hosted image
  build/closure/integration/scans/archive and cache persistence remain pending.
Next proof: authorized main push runs fresh frozen install, quality/types/tests,
  then hosted build/runtime/security/archive gates. No gate weakened or skipped.
Readiness: READY FOR HOSTED PATCHED-DEPENDENCY VALIDATION; Segment 3 not closed.
```

## Hosted lint project coverage

Run 40324606740 (`d404575`) passed fresh frozen installation, all 80 tooling,
nine graph, COPY, dependency and proto freshness gates. Lint stopped on
`apps/media-service/test/utils/image.ts`: 21 Media test TypeScript files exceed
its fallback-project cap of 20. Existing warnings are separate from this parsing
error. Sibling review found the same confirmed coverage defect in Order (22 test
files / cap 20); Product has 27 / cap 32 and does not require this correction.

Before-edit trace: `apps/media-service/eslint.config.mjs` and
`apps/order-service/eslint.config.mjs` use type-aware Project Service but their
respective `tsconfig.json` files exclude tests. Add each owner's
`test/tsconfig.json` extending its production compiler options with noEmit and a
test include; remove test-file fallback allowances from those two ESLint configs.
This lets Project Service find the nearest real project without raising a cap,
disabling type-aware rules or excluding files. Media's single root processing-DB
Jest config allowance remains. See the supported
[parser/project-service configuration](https://typescript-eslint.io/packages/parser/).

Consumers: unchanged `apps/{media-service,order-service}/package.json` lint globs,
`apps/{media-service,order-service}/jest.config.ts`, their production
`tsconfig.json`/`tsconfig.build.json`, Media's `jest.processing-db.config.ts`, and
the failing Media `test/utils/image.ts`. Existing source/test rule severities
stay intact. New test configs are excluded from Docker by the existing
`**/test` rule; no application/SQL/transport/generated-contract changes. Run both
complete owner lint commands and inspect warnings/errors before the next push.

Actual owner lint results: Media exit 0, zero errors / 486 existing warnings;
Order exit 0, zero errors / 122 existing warnings. No rules/severities changed.
TypeScript config parsing confirms each complete test tree belongs to its new
noEmit project; production/Jest configs and compiler emission remain unchanged.
The mandatory preparation checklist now requires this project membership check
when adding tests, rather than discovering fallback overflow in broad CI.

Fresh-install hosted dependency artifact from `d404575` confirms runtime=0,
tooling=2, deferred-web=43. This is authoritative for the patched installation,
separate from the retained local older node_modules. No unrelated warning cleanup
or Web/tooling advisory remediation is claimed.

Handoff receipt: before-edit/revisited files above; both actual owner lint runs,
config inclusion/noEmit checks, syntax/format/diff pass. Prior preflight remains
valid: this lint-project correction changes no application/public contracts.
Hosted all-workspace lint/types/tests and downstream image/archive/cache gates
remain pending. READY FOR HOSTED LINT-PROJECT VALIDATION, not Segment 3 completion.

## Hosted shared security consumer inventory

Run 40325605728 (`60df304`) passed whole-backend lint and types. The container-free
security gate passed 131/133 assertions; two stale `packages/grpc-auth/test/service-wiring.spec.ts`
checks still described pre-D2 Order wiring. The status RPC now also requires a
user ID between its admin role and GrpcMethod decorators; customer methods grew
from seven to eight when the explicitly approved customer-started demo payment
operation was added. Neither failure establishes an authorization regression.

Before-edit trace: read that full wiring test, `packages/grpc-auth/jest.config.ts`
(no live startup), `apps/order-service/src/order/grpc/order-grpc.controller.ts`,
`apps/order-service/src/order/order.controller.ts`,
`apps/order-service/src/order/admin-order.controller.ts`,
`packages/protos/order.proto`, `packages/clients/src/order.client.ts`, and
`apps/gateway/test/r5-v3-receiver-inventory.spec.ts`. Preserve status RPC's dormant
V3 marker, exact admin/root-admin role and new RequireUserId; explicitly inventory
all eight customer RPC names with RequireUserId, all four admin RPC names, and
HTTP customer-start/admin-resolve policies. Add the new admin HTTP controller to
the existing root-admin inclusion check. No production decorator/policy changes.
The F4 post-R5 deferral inventory remains unchanged; these RPCs are not promoted
into dormant V3 coverage. Run focused wiring/security and mandatory preflight.

Result/receipt: shared security passes 13 suites / 134 tests (9.0s); preflight
passes four suites / 23 tests (4.6s). Exact role counts are retained and supported
by sorted explicit method inventories, required user context, both demo HTTP
policies, and root-admin inclusion. No snapshot/hash refresh, production edit or
authorization broadening. Format/diff and scoped typed lint pass. The initial
local direct ESLint config load could not resolve its root plugin from retained
older node_modules; the scoped check used the same installed Auth-owned pinned
TypeScript ESLint/Prettier plugins, recommended typed rules and spec tsconfig.
This is a local installation limitation; the preceding fresh hosted full lint
and types already passed with the current lock. No install/runtime claim is
inferred from it. The unchanged application build/SQL proofs and current-source
contract checks remain valid; full hosted pipeline acceptance remains pending.
READY FOR HOSTED SECURITY-CONSUMER VALIDATION; Segment 3 is still open.

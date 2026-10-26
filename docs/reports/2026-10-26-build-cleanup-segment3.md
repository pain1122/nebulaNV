# Build cleanup Segment 3 - all-target graph and batch compilation

Date: 2026-10-26. Status: all eleven native images and offline closures accepted;
unchanged warm full batch accepted at 111.1s; CI persistence implemented with
local checks, hosted validation and integration gates remain open.
Previous: [Product/Order acceptance](2026-10-26-build-graph-native-proof.md).

## Requirement and observed implementation

Extend the accepted graph to all eleven backend images and compile the requested
union once before sequential exports. Keep shared Debian bases, frozen pnpm,
approved native lifecycle scripts, generated clients, injection refresh, runtime
checks, non-root images and image-only release. Shared production dependencies
remain deliberately unchanged pending a separate packaging benchmark.

Confirmed unmet requirement: only Product/Order select graph; other nine select
legacy. The runner forces full inventory to legacy, and partial multi-image
requests get separate leaf selectors. `selectedGraph` already accepts comma lists
and `all`, deduplicates shared prerequisites and rejects sibling app dependencies.
The Dockerfile's current import verifier passes its entire selector as one path,
so a comma-list union would fail verification. Correct that consumer before rollout.
No sibling service implementation import was found; remote runtime dependencies
are not application build dependencies. Real env files remain context-excluded.

Narrow change: default graph, explicit graph on every Compose build target
(including operator Realm Auth sharing its image), canonical inventory-order batch
selector passed identically to every export. Full inventory uses `all`; single
service keeps its leaf. The first image produces shared compilation/runtime
layers; subsequent exports can reuse them. No grouped parallel Bake, forced
build, per-service Dockerfile, base change, contract split or runtime env redesign.

Official mechanisms checked: [Turbo prune](https://turborepo.dev/docs/reference/prune),
[Docker Bake argument overrides](https://docs.docker.com/build/bake/overrides/).
Pinned Turbo 2.5.8 and actual local Bake rendering will validate behavior rather
than assuming current documentation proves this pinned version.

## Before-edit dependency and consumer trace

Working tree: 308 entries, no staged changes; preserve all prior feature work.

| Owner / exact consumer paths                                                                                                                                              | Action or justified unchanged/deferred status                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker/backend.Dockerfile`, `docker-compose.yml`, `docker-bake.hcl`                                                                                                      | Graph default and explicit per-target choice; retain targets, healthchecks, non-root/shared layers and legacy diagnostic escape hatch. Update stale pilot comments.                                                                        |
| `scripts/backend.mjs` `buildBackendImages`, `scripts/backend.test.mjs`                                                                                                    | Canonical selected union for all exports, graph pipeline, plan output; preserve target order, first-error stop, clean/pull policy, timing and no-execution plan. Strengthen tests for same union and order independence.                   |
| `scripts/docker/backend-build-graph.mjs`, `scripts/docker/backend-build-graph.test.mjs`                                                                                   | Add selected runtime verifier dispatch; test real pinned pruning/frozen metadata for all eleven leaves plus representative union/full inventory. Check generator ownership, no-DB owners and special assets/package closures.              |
| `scripts/docker/verify-runtime-imports.mjs`                                                                                                                               | Keep actual checks; pass separate service arguments from validated graph, never a comma path. No relaxation of missing dist/schema-import checks.                                                                                          |
| `scripts/docker/build-backend.ps1`, root `package.json` aliases                                                                                                           | Wrapper already forwards selected services to same runner; alias unchanged, no root metadata/lockfile churn.                                                                                                                               |
| `scripts/docker/check-build-context.mjs`, `.dockerignore`, `.github/workflows/ci.yml` existing quality checks                                                             | No new context policy or COPY inputs planned. Actual scratch COPY probe remains required before image handoff; existing CI invokes amended graph tests. CI persistence is a separate remaining Segment 3 slice after native rollout proof. |
| `packages/config/test/health-wiring.spec.ts`, `scripts/backend.test.mjs` runtime inventory                                                                                | Preserve exact eleven runtime/health targets, declared package imports, Media Sharp execution, tenant proto resolution and production tool removal assertions.                                                                             |
| `apps/gateway/package.json`, `apps/auth-service/package.json`                                                                                                             | No Prisma owner/postinstall. Real prune must produce empty schema-owner list and no sibling app directory. Unchanged app sources.                                                                                                          |
| `apps/realm-auth-service/package.json`, `apps/user-service/package.json`, `apps/auth-service/package.json`, `packages/migration-artifacts/package.json`                   | Include migration-artifacts only where declared; Realm Auth uses config/artifacts without protos/clients. Verify pruned source, not universal-package assumptions.                                                                         |
| `apps/media-service/package.json`, `apps/media-service/nest-cli.json`, `apps/media-service/assets/fonts/OFL.txt`, `apps/media-service/assets/fonts/Vazirmatn-Regular.ttf` | Retain Sharp install lifecycle/build/runtime execution and bundled licensed font. Verify assets survive prune; native runtime check remains pending actual image.                                                                          |
| Remaining service manifests, Prisma schemas/generators and Nest/TS config                                                                                                 | Unchanged. Explicit generate only selected nine possible owners; sequential generator execution retained. Full build legitimately generates all nine; isolated leaf never does.                                                            |
| `docker-compose.release.yml`, `scripts/docker/save-release-images.ps1`, `scripts/docker/load-release-images.ps1`, `scripts/backend.mjs` `releaseImages`                   | Unchanged image-only release, image names/counts and standalone archives. Build runner changes compilation scope only. Native offline closure will validate images after operator build.                                                   |
| `docs/architecture/local-dev-and-docker-boot.md`, `docs/docker-configs.md`, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`                  | Update current selector/union instructions; historical audit/proof records remain dated evidence. Mark implementation separately from pending all-image native acceptance and later CI work.                                               |
| Gateway/protobuf/OpenAPI/generated SDK, DB SQL/migrations/seeders, D2 source/live fixtures                                                                                | No behavior or contract edits. Preserve previous preflight/SQL evidence; changes are build packaging only. Native build/runtime closure and pending D2 deployment/live proofs remain distinct.                                             |

## Planned cheap gates / native boundaries

- Actual pinned all-owner/union prune and frozen-lockfile metadata checks; no full
  install or compiler on host. Exercise union producer deduplication and verifier
  dispatch using focused fixtures, retain all original negative cache assertions.
- Scoped runner/inventory/CI/health preparation tests; syntax/lint/format/diff.
- Render Compose/Bake with only selected nonsecret build data; verify all eleven
  graph leaves plus operator profile and identical union args. Check release
  remains image-only. Actual scratch COPY probe and Docker definition check.
- Full native image build/export and native packaged Gateway/Media/all-owner
  checks remain operator-owned until cheap gates pass. No DB migrations, live
  bootstrap, cache pruning or container recreation is part of this handoff.
- CI Turbo/BuildKit persistence and native union cache timing acceptance remain
  open until their own trace/checks; do not mark Segment 3 complete early.

Focused discovery before native handoff: the new exact source inventory initially
assumed pruned packages equal the app dependency closure. Actual Turbo output
also retains root tooling's declared clients/grpc-auth/protos workspace deps.
This is existing root coupling documented in the original audit, not a new service
implementation import. The test now computes and requires the exact union of
root-declared tooling dependencies and app-declared prerequisites; it still rejects
unknown extra packages. Selected build tasks/runtime artifact collection remain
app-closure-only. Realm Auth's selected closure is config/migration-artifacts,
although root tooling source is also retained for frozen installation. Do not
claim all pruned sources are app-minimal. Changing root tooling ownership is the
separate optional packaging/package-boundary item, not silently folded into this
rollout. Real root package/lockfile and compiled app contracts remain unchanged.

Media fixture correction before handoff: the bundled files live under
`assets/fonts/`, as used by `apps/media-service/src/processing/derivative-policy.ts`
and `apps/media-service/test/image-recipes.unit.spec.ts`. Initial new assertions
used the assets root; corrected them to exact existing paths, preserving byte
equality and license checks. No Media source/asset repair was needed.

## Implementation and revisited impact table

All twelve Compose build definitions (eleven official images plus operator Realm
Auth alias) explicitly select graph. Dockerfile default is graph, while the
explicit legacy leaf override remains available for diagnosis. The sequential
runner computes one inventory-order selector for every requested image and
passes graph explicitly. Full inventory uses `all`. Caller order still determines
export order; reversed Product/Order/Gateway requests have identical compilation
scope. Pull/clean/stop-on-first-error/timing/plan semantics are preserved.

The new `verifySelectedRuntimeImports` dispatches separate validated service names
to the original verifier. The verifier itself is unchanged; real fixture tests
check single/batch/all dispatch and still reject forbidden relative package imports.
No public route, database schema, root manifest/lockfile or runtime env changed.

All traced consumers were revisited: runner and graph tests updated; default
pipeline/Compose selectors and Bake comments updated; runtime health/import/Sharp/
proto checks retained; existing PowerShell wrapper and package aliases forward
unchanged; release Compose and save/load inventory retain their existing image
names. Local development and Docker configuration docs now describe batch union
and the retained root-tooling/shared-production boundaries. Current-focus/TODO
separate prepared implementation from pending native rollout and CI persistence.
Historical Product/Order reports remain valid dated evidence, not all-image claims.

## Completed cheap gates

- `pnpm test:build-graph`: 9/9 pass, 41.66s. Actual pinned Turbo prunes all eleven
  leaves, Product/Order/Gateway union and `all`; every output passes actual pnpm
  frozen/offline lockfile-only validation. Exact selected app and explicit
  root-tooling package inventories are checked. Gateway/Auth have no schema
  owners; each other leaf has exactly its own generator; full inventory has nine.
  Media font/license bytes survive pruning. Existing cache/isolation/negative
  tests remain, plus real injected two-owner/shared-once compilation.
- Focused `scripts/backend.test.mjs` selections: 12 unique tests pass across two
  invocations (eight runner/inventory/CI tests, six wiring/boot/release tests with
  two overlaps). Includes canonical batch scope, requested export order, full
  graph scope, operator alias, no-execution plan, failure stop and clean/pull.
- Config's isolated `test/health-wiring.spec.ts`: 22/22 pass. Its Jest config has
  no integration startup; no containers or databases are started by this gate.
- Four changed JS modules pass syntax checks and final Node-scoped lint with zero
  errors/warnings. Build-critical files retain LF. No TypeScript source changed.
- Actual scratch BuildKit context probe: all 51 COPY inputs pass, no install/
  compiler/export. Actual Gateway union Docker definition check passes with no
  warnings. No COPY source or ignore policy was added.
- Actual all-profile Compose rendering: twelve explicit graph/leaf definitions.
  Actual native Bake rendering preserves comma-valued canonical union for all
  three Product/Order/Gateway targets. Runner full plan has eleven all/graph
  exports. Only build metadata was printed; env values were not exposed.
- Actual release Compose render against its example env remains image-only in
  every profile. Save/load scripts and image inventory are unchanged; native
  standalone image closure is pending the image build, not inferred from render.
- Existing public contract/preflight evidence retained: no Gateway/RPC/proto/
  OpenAPI/SDK contract/generator changes; this packaging correction adds no
  contract-validation scope. SQL/migrations/live application proofs are separate.

## Native rollout handoff receipt

```text
Requirement: all eleven targets use selected graph; batch compilation shared.
Changed files/consumer trace: before-edit table and revisited actions above.
Cheap gates: 9 graph regressions, 12 distinct backend tooling tests, 22 health
  wiring tests, syntax/Node lint, actual COPY probe, Bake check/render, local and
  release Compose render pass. Final formatting/diff and new-file whitespace pass.
Actual native evidence: Product/Order pilot remains recorded; all-image graph
  compilation/export, actual producer counts and packaged closure are PENDING.
Readiness: Docker info passes, seven CPUs and 14,065,840,128 bytes usable memory.
  This image-only proof needs engine readiness, not running app/DB/scanner APIs.
Source/image drift: defaults/runner/helper changed; request one full batch solve
  and eleven sequential exports. No forced build, app restart, SQL or seed command.
Next operator command: pnpm docker:build:backend (retain full log).
Expected: eleven images exit0; first image compiles all selected owners and each
  shared producer once; later images reuse the same compile layer. Full selection
  legitimately generates nine Prisma clients once. Runtime import/Media Sharp
  checks remain mandatory in image stages. Native post-build closure follows.
Known limitations: common production dependency layer/root tooling sources remain;
  all-image native performance, offline closure and CI cache persistence not yet
  accepted. Pending D2 native migration/deployment/live gates remain untouched.
Status: READY FOR ALL-IMAGE NATIVE BUILD; native acceptance remains pending.
```

```powershell
pnpm docker:build:backend *> backend-graph-rollout.log
$backendGraphExit = $LASTEXITCODE
Get-Content backend-graph-rollout.log -Tail 50
"exit_code=$backendGraphExit"
```

This intentionally requests the entire inventory once so each exported image
uses the same compilation inputs. Stop on failure and inspect the full retained
log; do not retry with force, prune cache or recreate application containers.

## Native image build result and offline closure preparation

Salar reports full runner exit 0. The retained `backend-graph-rollout.log` confirms
all eleven exports exit 0, first image 299.4s, following exports 29.8-43.2s.
First compilation has exactly one miss for each of five shared producers and
eleven applications. Nine owner Prisma generations run once; no legacy stage.
Every later image reuses fetch/install/generation/compile/verification/runtime
layers, with no executed Turbo miss. Runtime verifier reports eleven owners.
Timings here are the new all-service batch, not unchanged warm image results.

Before executing offline native checks, scope is temporary Docker containers
using the built image IDs, `--rm --read-only --network=none --pull=never`, no bind
mounts, application bootstrap, external messages, environment secrets, migrations,
seeds or network calls. Verify own app directory only, non-root user, main/env
schema, declared shared package loading, correct owner proto, generated Prisma
constructor and Debian native engine module for nine DB owners. Auth/Gateway must
have no own Prisma directory. Media additionally checks pinned font bytes/license
and real Sharp PNG/text rendering against its bundled font. These validate image
closure only; full application readiness and D2 live acceptance remain separate.
Record per-image digests/results locally; do not infer a pass from successful
image export or mocked transport tests. No implementation edit is required.

## All-target native rollout and packaged closure accepted

The agent parsed the full native log, checked exact inventory order, eleven
successful elapsed/exit records and absence of legacy stages, then asserted:
first solve has exactly sixteen cache misses (five shared packages + eleven apps),
all exactly once; nine selected owner generator entries, each once; subsequent
ten solves have zero generator/miss entries and cached fetch/install/Prisma/
compilation. Duplicate progress headers were deduplicated by step ID before
counting stage results. Runtime import verification reports eleven services.

| Image                                 | Native elapsed |
| ------------------------------------- | -------------: |
| User (first, produces the full graph) |         299.4s |
| Auth                                  |          38.2s |
| Realm Auth                            |          37.9s |
| Tenant Authority                      |          38.8s |
| Settings                              |          43.2s |
| Media                                 |          37.4s |
| Taxonomy                              |          41.7s |
| Product                               |          30.2s |
| Blog                                  |          38.4s |
| Order                                 |          29.8s |
| Gateway                               |          30.4s |

Aggregate logged image elapsed: 665.4s (11m05.4s), excluding the runner's small
outer overhead. First solve: pruning 14.9s, fetch 30.3s, development install 8.0s,
owner generation 42.9s, compilation RUN 82.0s, production install 21.8s. Stages can
overlap; do not sum them as independent wall time. Later 29.8-43.2s solves are
first per-image packaging/export, not fully warm per-image repeats. This is not
a cold empty-cache benchmark or a claim of a three-minute full build. The
previous single-Product baseline used different resource/cache conditions.

All eleven offline checks PASS, against image IDs matching the exact exported
manifest-list digests in the native log. Each container used read-only rootfs,
network disabled, no mounts, no secrets and no application bootstrap, then was
automatically removed. All run as UID 1000 and contain only their own app under
`/workspace/apps`; declared shared imports, main output and env-schema imports
load. Nine owners expose their Prisma constructor and successfully load the
Debian native query-engine module without a database connection. Auth/Gateway
have no own Prisma directory. Owner proto resolution passes where declared.
Realm Auth loads config/migration-artifacts without other app output.

Media additionally passes PNG encode/decode and real Pango text rendering using
the exact bundled font. Pinned font SHA-256 and OFL license existence pass. Its
stderr contains two `Fontconfig error: Cannot load default config file: File not
found` messages. Explicit bundled-font text output still renders with positive
dimensions and exit 0. Record as an observed nonblocking diagnostic; no functional
failure or need for a new image is inferred. Optional default Fontconfig cleanup
belongs to Media/runtime packaging; no optional repair is implemented here.

Retained evidence:

- `.ci-evidence/build-graph-rollout/native-build.log`: byte-identical full log.
- `.ci-evidence/build-graph-rollout/native-summary.json`: SHA-256 of log, exact
  per-image identities, generator/miss/stage counts and timings.
- `.ci-evidence/build-graph-rollout/offline-closure.json`: eleven actual image
  probe results, identities, elapsed times and preserved Media warning.

This closes all-target graph rollout/shared batch compilation and packaged
Gateway/Media closure. Existing containers were not recreated; these results do
not certify application readiness or pending D2 migration/deployment/live tests.
Release Compose/save/load inventories stay unchanged, but full integration/live
and CI persistence remain separate unchecked Segment 3 gates.

## Unchanged warm all-image handoff

No implementation or build-input edits follow the successful native build;
updates only affect excluded docs/evidence. Earlier 9 graph / 12 tooling / 22
health checks, actual context/Bake/Compose validation and all-image native/import
results remain valid. A fully warm all-image repeat is not yet measured. Repeat
the identical request with a different log filename, retaining first-build data:

```text
Requirement: measure unchanged warm all-eleven-image export, separate from first packaging.
Consumer/cheap preparation: unchanged implementation and build inputs; prior
  focused/context/definition/native gates preserved. Docs formatting/diff checked.
Actual native: all eleven build/export exit0; all eleven offline closures pass;
  exact image IDs verified; Media's nonblocking Fontconfig stderr retained.
Source/image drift: none after native build; no SQL/live/container recreation.
Next operator command: pnpm docker:build:backend, retain backend-graph-rollout-warm.log.
Expected: eleven exit0, generation/compile/runtime packaging steps cached;
  warm per-image/total timings recorded without promising a target duration.
Limits: readiness, D2 deployment/live integration and CI cache persistence pending.
Readiness: READY FOR UNCHANGED WARM ALL-IMAGE PROOF.
```

## Warm all-image result accepted

Salar reports exit 0; the agent verifies all eleven raw blocks: every RUN result
is CACHED, no compilation miss, application manifest/config digests match the
initial build exactly. Attestation/index digests may differ and are not application
byte drift. Per-image elapsed: User 15.5s, Auth 9.5s, Realm Auth 9.6s, Authority
9.8s, Settings 9.2s, Media 9.9s, Taxonomy 9.6s, Product 9.4s, Blog 9.8s, Order 9.6s,
Gateway 9.2s. Aggregate logged image elapsed 111.1s (1m51.1s). This measures an
unchanged warm batch, not a cold or modified-source build. CPU/RAM budget unchanged.
Raw evidence: `.ci-evidence/build-graph-rollout/warm-build.log` and
`warm-summary.json` (log SHA-256, per-image counts and unchanged config/app digests).
The existing offline probes cover these unchanged bytes and are not repeated.

Local all-target native/warm/packaging performance acceptance is complete.
[CI caching](2026-10-26-build-cleanup-ci-cache.md) is now implemented with local
policy/render checks; actual hosted round trip remains pending. D2 migration/
deployment/live and image-only release integration are still separate gates.

## Final Segment 3 release/archive trace (before editing)

Salar clarified that "Batch 3" means this build-cleanup Segment 3, not D2.
The short mistaken D2 preparation was reversed by undoing only the newly added
proof helper/caller/test and deleting its newly created unadopted report. The
original three payment-recipe tests pass again. No migration, application restart,
D2 feature source change or live test was run. The concurrently finishing existing
preflight passed four suites / 23 tests; it is contract evidence, not startup proof.

Confirmed release tooling defect: `scripts/docker/save-release-images.ps1` derives
eleven backend images but appends only four old infrastructure images. Both
Compose files now require the digest-pinned Media scanner; it is omitted from the
archive. A successful save could therefore fail offline release startup. Current
Docker docs also say the script has ten backend/fourteen total images (stale).

Narrow fix: derive the deduplicated runtime-image list from Compose's existing
image expressions, preserving prefix/tag/environment overrides and including all
profiles' shared-image aliases. Keep backend `releaseImages` API unchanged for
scans/identity evidence. Local/release Compose image-expression parity must be
asserted before using local rendering without release credentials. Actual tar
save/load stays a native operator proof; no volume or application startup change.

| Owner / exact consumer                                                                    | Action / unchanged reason                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `scripts/docker/release-image-inventory.mjs`                                          | Render local Compose image references only (no bootstrap/build); prefix/tag passed as child env; support explicit env file. Deduplicate refs and require all inventory backend images. Unit-test scanner/custom overrides and missing/failed renders. |
| `scripts/docker/save-release-images.ps1`                                                  | Call new inventory command instead of appending static infrastructure. Keep -WhatIf, Output, prefix/tag and existing `docker save` behavior; optional EnvFile controls image overrides.                                                               |
| `scripts/docker/load-release-images.ps1`                                                  | Unchanged native load command; syntax and existence guard retained. Native archive acceptance pending.                                                                                                                                                |
| `scripts/backend.test.mjs`, local/release Compose services' image expressions             | Exact same service/image expressions across all profiles; complete deduplicated archive includes five infrastructure images (scanner included). Preserve eleven backend scanner/tag inventory assertions.                                             |
| `scripts/backend.mjs` releaseImages, Dockerfile, build graph, package/lock/env files      | Unchanged; avoid invalidating accepted local images merely to correct archive tooling. New script is outside Docker COPY inputs.                                                                                                                      |
| `docs/docker-configs.md`, build guide, current-focus, adopted TODO, this checklist/report | Correct archive count/overrides and honest local/hosted/native proof statuses. No claim of complete Segment 3 before remaining named execution gates.                                                                                                 |

Cheap gates: focused inventory/parity/error tests, actual default/custom Compose
image rendering, PowerShell parser and actual -WhatIf (no archive write), syntax/
Node lint/format/diff. Actual full archive save/load and application integration
are long native proofs for Salar. Hosted cold/warm CI requires publication of the
prepared workflow/source; no commit or push has been authorized for this mixed
working tree by this correction. Prepare concrete local result first.

Final CI wiring review: the new policy/archive tests were in backend tooling but
CI did not invoke that suite. Added the existing `pnpm test:backend-tooling` alias
as an explicit quality step (no package changes). Full container-free run passes
77/79; both failures are the historical Product metadata verifier's guard requiring
its October 10 migration to be the last folder. Actual later October 14/19 Product
migrations invalidate that guard before mocked rollback/cleanup runs. Classification:
confirmed stale tooling, not a failing application migration or justification to
skip tests. Before-edit trace: `scripts/backend.mjs` `verifyProductMetadataUpgrade`
reads migration names -> `applySqlMigrations` baseline, native resolve/deploy/status;
`scripts/backend.test.mjs` two existing orchestration/cleanup tests and new baseline
exclusion assertions; root `db:verify:product:metadata:upgrade` alias (inspect actual
name before handoff), unchanged Product metadata SQL fixture/checks and native
Product migration files. No SQL/schema/owner code changes planned.

Narrow correction: require the exact metadata target to exist, split baseline at
its index, resolve only earlier migrations, then let native deploy apply the target
and later tails. Preserve exact rollback sentinel/column absence/gallery checks,
rereun/status and disposable cleanup. Earlier guard accepted every earlier folder;
do not introduce a looser missing-target rule. Actual populated native proof remains
a required operator gate after local tests. Root backend module is a Docker build
input, but this function is not invoked by image graph/packaging and isn't included
in final service images; no service source or build function changes. Prior app
image/warm/closure results remain their recorded facts; do not request rebuilding
all services merely to change this standalone historical verifier.

Native wrapper preparation caught two real PowerShell issues before archive handoff:
`@(... | ConvertFrom-Json)` produced one nested array under Windows PowerShell,
so the first save dry run reported one image. Changed to an explicitly typed
string array; repeated real -WhatIf reports all sixteen distinct references.
The existing load script also uses the automatic `$Input` variable as a parameter.
With Docker intercepted by a plain function, passing an existing archive filename
(including spaces) resolves to the current directory instead of that filename.
Confirmed before editing; no Docker import occurred. Narrow load fix: rename its
internal parameter to ArchivePath with alias Input, preserving existing CLI
compatibility. Consumers: `scripts/docker/load-release-images.ps1`, current docs'
-Input invocation and native actual wrapper-argument probe. Add guard tests for
alias/path existence behavior; syntax checks alone were insufficient. Keep file
existence and native error checks; do not change Docker load semantics.

## Publication authorized and remaining execution moved into CI

Salar explicitly authorized pushing the current project into main. Origin/main
and current HEAD both resolve to `f36b235`; a normal fast-forward publication is
possible. Current working tree includes the already prepared D2 snapshot and is
being committed as authorized. Five untracked raw build logs, local envs, caches
and generated proof/archive directories are excluded. No migration or application
restart was performed locally during this correction.

Final fixes/checks: archive inventory includes sixteen unique references with
stable ordering; actual default/custom prefix/tag/scanner rendering passes and
all sixteen default images are present locally. PowerShell parser and save
-WhatIf pass with sixteen separate arguments. Actual intercepted load calls with
spaces verify both -Input and -ArchivePath preserve the file path. Full backend
tooling now passes 79/79, zero skips, including its new CI invocation; no old
assertion was skipped. Historical metadata baseline resolution excludes later
stock/restoration migrations while preserving all rollback/audit assertions.

To avoid another local long-command cycle, the authorized hosted workflow now
runs the actual Product metadata populated upgrade proof after boot and a complete
sixteen-image Docker save -> load binary stream after existing live/image scans.
It compares every image ID before/after, with Bash pipefail so save or load errors
fail the gate. Streaming creates no giant tar or extra lingering containers.
Exact tested backend IDs are recorded afterward under the existing bounded
artifact policy. Existing F3, native e2e and image scans remain mandatory; D2
feature closure remains a separate milestone. Hosted cold/warm cache round trip,
archive stream and integration acceptance remain pending until their actual runs.

Readiness receipt: 79 tooling tests, actual Compose image renders, native
PowerShell parser/dry-run/argument handling and Node syntax/lint/format/diff must
pass before publication. No API/schema/source-contract edit; previous 23 preflight
checks and all-service image/warm closures remain recorded. Next action is the
authorized project snapshot commit/push and hosted CI monitoring; do not mark
Segment 3 complete early or request unnecessary local image rebuilds.

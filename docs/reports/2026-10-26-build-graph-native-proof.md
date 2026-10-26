# Product/Order graph native proof

Date: 2026-10-26. [Segment 2 implementation/trace](2026-10-24-build-cleanup-segment2.md).
Status: Segment 2 complete. Paired image builds, unchanged warm image proofs,
packaged import closures and all ten native modified-input cases pass. Heavy
builds were run by Salar; the agent verified their saved logs. Earlier pending
receipts below are historical checkpoints; the final acceptance records closure.

## Current conditions

Docker info succeeds with seven CPUs and 14,065,840,128 memory bytes (about
13.10 GiB usable). Five infrastructure containers are running and healthy;
application services are stopped. Earlier build timings used different CPU/RAM
and active-container conditions. Record the new budget with these timings;
do not attribute the entire difference to build-graph changes.

Existing relevant cheap gates remain valid: five graph regressions including
root-dependency/no-ignore exact-once producer checks, real frozen metadata and
injected output restoration; 51-input actual BuildKit context check; scoped
syntax/lint; inventory/health checks and 23 preflight checks. No subsequent
implementation change invalidated them. Resource edits and recovery changed
machine state only. Repeating unrelated suites is unnecessary.

Immediate checks on this turn: Docker API/resources and five infrastructure
health states pass; plan selects Product then Order sequentially; rendered Bake
selects graph/own-owner scopes for both; scoped diff whitespace check passes.
These checks do not constitute actual application health or image performance.

## Proof sequence

1. Product build with the corrected shared-hash policy, then Order's first graph
   build. Retain full logs and per-image elapsed results. The runner stops on
   first failure and retains caches. This is two selected solves, not the future
   segment 3 combined compilation graph.
2. After success, repeat the identical request without build-input edits to
   measure true warm layer reuse. Use a different log filename to retain evidence.
3. Complete native source/schema/unrelated/shared-contract isolation and both
   image closure proofs. Earlier Product offline closure remains recorded for
   its first image; updated images still need applicable acceptance evidence.

```text
Requirement: paired native acceptance of corrected Product/Order build path.
Consumer trace: segment 2 report; no implementation changes in this handoff.
Cheap gates: preserved relevant passes plus current Docker/plan/Bake/diff checks.
SQL/seed/runtime: no schema change or DB action; application readiness pending.
Source/image drift: Product predates the hash-policy fix; Order graph is unproved.
  Building images does not deploy/restart application containers.
Known limits: production dependency graph remains shared/backend-wide; other
  services/full-inventory producer intentionally remain legacy pending segment 3.
Next command: pnpm docker:build:backend product-service order-service
Expected: exit 0, both image exports/load and current require/import checks pass,
  each owner generates only its Prisma client, shared producers compile once per
  selected graph and subsequent visits hit cache. Inspect full logs for evidence.
Readiness: READY FOR PAIRED NATIVE GRAPH IMAGE PROOF; ACCEPTANCE STILL PENDING.
```

```powershell
pnpm docker:build:backend product-service order-service *> graph-builds.log
$graphBuildExit = $LASTEXITCODE
Get-Content graph-builds.log -Tail 40
"exit_code=$graphBuildExit"
```

No force/no-cache, WSL restart, full-backend build, database migration or Compose
recreation is needed for this proof. Heavy execution remains with Salar.

## First paired native results

Salar reports the sequential command exited 0. The local full `graph-builds.log`
confirms both owners and the corrected shared-cache behavior:

| Case                      |  Total elapsed |  Fetch | Dev install | Prisma generation | Compilation RUN | Production install |
| ------------------------- | -------------: | -----: | ----------: | ----------------: | --------------: | -----------------: |
| Product, corrected helper | 198.2s (3m18s) | cached |      cached |             31.8s |           64.2s |             cached |
| Order, first graph build  | 240.4s (4m00s) |  90.0s |        6.7s |             10.5s |           22.8s |              43.6s |

Product is a rebuild after the hash-policy correction; Order is its first graph
build. Neither is the unchanged warm benchmark. Stage elapsed times can overlap
and include waits. The seven-CPU/13.1 GiB budget and five-infrastructure-container
load differ from earlier baselines; avoid a single-cause speedup claim.

For each owner, protos/grpc-auth/clients/config have exactly one cache miss each.
Subsequent visits have three/two/one/one hits respectively, using the same
producer hashes. The repeated-compilation defect is now corrected in actual
Linux image builds, not only the fixture. Each build loaded one owner schema;
neither log contains the legacy compilation stage. Order's production-dependency
install ran even though Product reused it; retain that observation for the warm
and segment 3 shared-producer analysis rather than declaring full cross-target
cache reuse complete.

Order export/load took 9.5s. Its Prisma COPY/merge took 41.2s, including 38.7s
merging, and its final import check took 19.0s. These are measured remaining
assembly costs, not evidence that Prisma generation itself took those times.

Both current images also pass local offline/read-only/no-mount packaging probes:
only their own application directory is present; declared shared packages and
environment schema load; the generated Prisma client exports its constructor;
the owner's proto source resolves. Image identity matches the build logs:

- Product: `sha256:8e4174861a8bbb2dfc5cd3b95bd88eb344ca8f437544a6a7117b6525ba29d6db`.
- Order: `sha256:316ae4a7004dd6d8c8a482d02999e79096bc33b1259c69fd948b9f94d45ab3fe`.

These ephemeral probes started no application bootstrap or database operation;
running application health remains outside this packaging claim. Containers
were removed automatically; existing infrastructure/services were untouched.

## Unchanged warm handoff

No build-input file changes follow these successful builds. Updates are limited
to excluded documentation so the next identical request can measure actual
Docker layer reuse. Existing focused/context/preflight evidence remains valid;
no new implementation change calls for repeating those checks.

```text
Requirement: measure unchanged warm image builds for both accepted graph owners.
Consumer trace: segment 2 report; no implementation changes.
Cheap gates: preserved passing graph/context/lint/preflight and actual paired
  native compilation/export/import checks; inspect full graph-builds.log.
Native results: Product=198.2s exit0, Order=240.4s exit0; one compile per shared
  producer per graph, subsequent visits hit cache; one owner Prisma generation.
Runtime: image loading succeeded; application health/migration/live acceptance
  remains separate from image packaging checks.
Known limits: native source/schema/unrelated/shared-contract isolation still
  pending; broader rollout/production packaging/CI cache work remains segment 3.
Next command: pnpm docker:build:backend product-service order-service
Output: graph-builds-warm.log, retaining the first-run evidence.
Expected: both exit0, install/generation/compile RUNs cached rather than rerun.
Readiness: READY FOR UNCHANGED WARM BUILD PROOF; SEGMENT 2 EXIT STILL OPEN.
```

```powershell
pnpm docker:build:backend product-service order-service *> graph-builds-warm.log
$graphWarmExit = $LASTEXITCODE
Get-Content graph-builds-warm.log -Tail 40
"exit_code=$graphWarmExit"
```

Run this without editing build inputs, cache pruning, force flags, WSL restarts
or unrelated builds in between. No application container recreation is required.

## Unchanged warm results

Salar reports exit 0; local `graph-builds-warm.log` confirms Product 11.2s and
Order 9.4s. Each has 74 cached steps and zero executed Turbo cache-miss headers.
Pruner/tool install, fetch, development install, owner generation, compile and
production dependency install all reuse Docker layers. Order export takes 1.7s.
Application image manifests/configs are unchanged; attestation/index digests can
change on export. This closes the unchanged warm case, not source-change cases.

## Before-edit native isolation harness trace

The remaining checklist explicitly requires isolated owner source/schema edits,
unrelated Media edits and a shared contract edit. Prepare a bounded harness that
uses an owned snapshot under `.ci-evidence/build-graph-native/contexts`, never
edits working source, and tests the existing `graph-build` target only. Avoid
runtime packaging/export for each variant because packaged closure is already
proved and variants are nonsemantic comments, not feature changes.

| Owner                     | Exact consumers                                                                                                                                                                                                   | Required action / preserved reason                                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New harness               | `scripts/docker/benchmark-build-graph.mjs`, `scripts/docker/backend-build-graph.test.mjs`                                                                                                                         | Snapshot literal local COPY inputs, exclude private/dependency/generated trees, retain the real Docker ignore policy; test case planning and log acceptance before native handoff |
| Build selection           | `docker/backend.Dockerfile`, `scripts/docker/check-build-context.mjs`, `docker-compose.yml`                                                                                                                       | Reuse `graph-build`, native COPY discovery and existing graph args; no production build logic change                                                                              |
| Perturbed snapshot inputs | `apps/product-service/src/health.controller.ts`, `apps/order-service/src/health.controller.ts`, `apps/media-service/src/health.controller.ts`, both owner `prisma/schema.prisma`, `packages/protos/product.proto` | Append a comment only in owned context, restore between cases; no real schema/proto/source/hash-pin changes                                                                       |
| Evidence and policy       | this report, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `docs/testing/pre-suite-checklist.md`                                                                                                         | Preserve prior passes; mark warm complete and native variant checks pending; record preparation receipt before operator command                                                   |

Use two baseline graph solves, two isolated source cases, two unrelated-Media
solves, two schema cases and two shared-contract solves, sequentially. Assertions:
fetch/install stay cached in variants; unrelated source keeps generation/compile
cached; own source/schema edits do not execute shared producers; shared edits
rebuild each actual shared producer at most once and recompile the owner.
Logs/JSON summaries persist outside the temporary context. Check resolved cleanup
paths and retain primary failures. Preparation-only mode must run no Docker
builds. No new package command/lockfile/production input is needed for this tool.

## Native isolation preparation receipt

Implemented `scripts/docker/benchmark-build-graph.mjs`. Its snapshot preparation
passed against this actual checkout: 53 literal inputs including Dockerfile and
ignore policy, with no Docker command executed. It excludes private env files,
dependencies and generated outputs, uses only owned directories on the project
drive, and checks resolved cleanup targets before removing them. Working source
is never edited; only the disposable snapshot receives comment variants.

Seven graph tests pass, including new log-acceptance tests that reject unexpected
installs, missing owner compilation, sibling compilation and repeated shared
work, plus snapshot tests for credentials/output exclusion and untouched source.
Scoped lint, syntax, formatting and diff checks pass. No application contracts,
schemas, root package/lockfile, Dockerfile or generator behavior changed in this
harness step. Earlier context, preflight, image closure and warm results remain
valid. Native variants are still pending and must not be inferred from mock logs.

```text
Requirement: finish native source/schema/unrelated/shared-input isolation for both owners.
Consumer trace: before-edit table above; harness and focused tests reviewed.
Cheap gates: actual snapshot preparation passes (no Docker build); seven graph
  tests and scoped lint/syntax/format/diff pass. Existing public/SQL behavior unchanged.
Actual native evidence: paired images and unchanged warm cases pass; ten planned
  compile-stage solves remain operator-owned and pending.
Safety/restoration: owned context only; sequential solves; no image tags/export,
  container startup, DB connection/migration, source edit, cache prune or force flag.
Next command: node scripts/docker/benchmark-build-graph.mjs
Expected: ten named cases report ok, then all native isolation cases passed;
  summary.json status=passed and per-case logs in .ci-evidence/build-graph-native.
Readiness: READY FOR NATIVE MODIFIED-INPUT ISOLATION PROOF; SEGMENT 2 STILL OPEN.
```

```powershell
node scripts/docker/benchmark-build-graph.mjs
```

The command prints bounded progress and retains detailed logs automatically.
It stops on the first failed assertion/build, writes the available evidence and
removes its owned context. No production image is exported for comment variants.

## Native variant failure - cache retention investigation

Salar's run passed product-baseline (63.6s), order-baseline (106.3s), and
product-source (53.3s), then failed order-source: fetch ran for 36.7s instead of
remaining cached. Summary and all four logs are retained. The strict assertion
remains; no remaining schema/unrelated/shared case is claimed to have passed.

Read-only evidence:

- Order source's fetch-input COPY was CACHED but its fetch RUN was not; install
  and generation subsequently reran. Its owner compiled once, with no shared
  compilation miss. This is a dependency-layer cache failure, not an application
  compilation or schema-validation failure.
- A bounded metadata-only BuildKit probe exported actual pruned fetch/install/
  schema inputs for Order baseline and the same source-only comment. All 15
  files have identical bytes and file modes. Evidence:
  `.ci-evidence/build-graph-native/diagnostics/metadata-HWUU98/comparison.json`.
  The owned input context was removed; metadata/logs remain. No dependency fetch,
  application compiler, runtime export or DB operation was run by this probe.
- Active Docker builder GC targets 20GiB (`defaultKeepStorage: "20GB"`). Docker
  reports 22.24GB total build cache. Unshared/total cache policies can remove
  recent records when above their space budget; see
  [Docker GC documentation](https://docs.docker.com/build/cache/garbage-collection/).
  Current cache inventory contains the new Order fetch result, not an additional
  baseline fetch result. No explicit GC event was captured in the bounded backend
  log, so eviction of that exact result is a strong inference, not a proven event.
- Docker data VHD is verified on
  `D:/Salar/Docker/wsl/DockerDesktopWSL/disk/docker_data.vhdx` (44.99 GiB logical
  file length), with about 814.6GB free on D. C has about 39.6GB free; this is
  not a proposal to consume its remaining space.

Classification: confirmed cache-retention pressure; specific missed-layer
eviction remains inferred. The current GC mechanism is functioning within its
configured budget. Trial capacity tuning is optional, not a source/architecture
replacement or grounds to relax the proof. Raising retention to 40GB would
preserve GC and allow roughly 20GB more retained build data on D; it is not a
reservation or guarantee that all future working sets fit. An engine restart
may be needed to apply the budget. Leave CPU/RAM limits and source unchanged.

Concrete proposal, not applied:
`.ci-evidence/build-graph-native/daemon-cache-40GB.json`. It is parsed/verified
UTF-8 without BOM and differs from `C:/Users/asus/.docker/daemon.json` only in
`builder.gc.defaultKeepStorage`, 20GB -> 40GB. GC remains enabled. Seek Salar's
approval for the persistent disk-retention increase before applying this optional
capacity trial; prior 85% authorization was explicitly scoped to CPU/RAM.

Status: native isolation acceptance remains FAILED/PENDING at Order source;
metadata correctness is verified. No Docker cache was pruned, no daemon settings
changed and no broad rebuild/restart was launched during investigation.

## Approved bounded cache trial and container review

Salar approved the 40GB trial, permitting more if justified but explicitly
rejecting unchecked accumulation. Keep 40GB: the measured working set does not
justify more. This is optional capacity tuning, not a proven source defect fix.

Before-change dependency/impact trace:

| Owner / consumer                                                                              | Action and evidence                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C:/Users/asus/.docker/daemon.json` -> active Docker-driver BuildKit GC                       | Change only `builder.gc.defaultKeepStorage` from 20GB to 40GB; keep `enabled: true`, all other fields and CPU/RAM settings. Timestamped backup and parsed equality check required. Active budget is pending an operator-owned Desktop restart.                          |
| `.ci-evidence/build-graph-native/daemon-cache-40GB.json`                                      | Reviewed candidate; parse and compare against current settings before writing UTF-8 without BOM.                                                                                                                                                                        |
| `docker-compose.yml` current services / stopped container `nebulanv-main-authority-db-init-1` | Confirmed obsolete helper: project `nebulanv-main`, service `authority-db-init` absent from current all-profile inventory, exited 0 two months ago. Current helper is `tenant-authority-db-init`. Remove only this verified container, without force or volume removal. |
| Other 19 containers / all images and volumes                                                  | Unchanged. Eleven stopped applications await deployment, three completed helpers remain declared, five infrastructure services are healthy. No global prune.                                                                                                            |
| `scripts/docker/benchmark-build-graph.mjs` / `backend-build-graph.test.mjs`                   | Unchanged strict assertions. Preserve failed run's four logs/summary before next execution; rerun actual native acceptance after verifying active GC budget.                                                                                                            |
| `docs/current-focus.md`, this report                                                          | Record applied config separately from active engine budget and native proof acceptance.                                                                                                                                                                                 |
| Public contracts, generators, migration SQL, lockfiles and application source                 | Unchanged; previous focused/preflight evidence remains valid. No broad suite is required for this machine-setting edit.                                                                                                                                                 |

Inspection before mutation: 308 working-tree entries, no staged diff; preserve
existing work. Docker reports 20 containers (five running), 352.3kB total writable
layers; 20 images / 30.11GB, build cache 20.73GB. Logical image sizes include
shared layers and are not independent physical allocations. The retired helper
has bind and volume mounts; removing its container without `-v` preserves both.
40GB is a GC retention target, not a hard cap on all Docker storage. Image and
volume reclamation need separate ownership review; no scheduled global prune.

Preparation receipt: JSON parse, exact single-field delta, GC-enabled invariant,
backup and no-BOM output will be verified locally. Docker restart and native
modified-input acceptance remain operator-owned and pending. Source/image inputs
are unchanged; no rebuild beyond the already required proof is introduced.

Applied result and handoff:

- Changed only the approved JSON field to 40GB; GC stays enabled. Re-read parsed
  equality, unchanged-field comparison, no-BOM bytes and backup bytes all pass.
  Backup: `C:/Users/asus/.docker/daemon.before-cache-40GB-20261026-114134.json.bak`.
- Preserved failed summary and four logs byte-for-byte in
  `.ci-evidence/build-graph-native/failed-20GB-20261026-114134/` before any rerun.
- Rechecked exact container ID, exited-success state, project/service ownership
  and current Compose inventory immediately before `docker rm` of only
  `nebulanv-main-authority-db-init-1`. No `-v`, force or prune. Container count
  is now 19 with five running. Volumes/images/application containers unchanged.
- Active `docker buildx inspect` still reports 20GiB. The saved 40GB setting is
  not yet loaded: Desktop restart is necessary. CPU/RAM and source unchanged.
- Current-focus records the same distinction. No native acceptance pass claimed.

```text
Requirement/finding: approved bounded cache capacity trial; strict native proof pending.
Consumer trace: table above revisited; only daemon field, obsolete helper and docs changed.
Cheap gates: exact JSON delta/no BOM/backup equality/container ownership checks pass;
  report/focus Prettier check and scoped diff whitespace check pass.
Prior focused/preflight results remain valid: no implementation or contract edits.
Actual runtime: five infrastructure containers running; applications stopped.
Active cache policy: 20GiB pending restart; saved policy 40GB, GC enabled.
Next operator commands: docker desktop restart --timeout 180; docker buildx inspect.
Expected: engine running and main GC Reserved Space policies show 40GiB.
Then: node scripts/docker/benchmark-build-graph.mjs (unchanged strict ten-case proof).
Readiness: READY FOR RESTART/BUDGET VERIFICATION; NATIVE PROOF WAITS FOR ACTIVE 40GiB.
```

Restart follow-up: Salar's graceful Desktop restart timed out after 180s with
Windows processes remaining. Both WSL distributions were already stopped.
Scoped closure of verified leftover Desktop processes followed by a hidden fresh
launch restored Docker info and BuildKit. See the
[resource recovery log](2026-10-26-docker-resource-budget.md) for observed stages.
Active `docker buildx inspect` now shows running and 40GiB Reserved Space on
GC rules 1-3 (ephemeral rule 0: Max Used Space 5.527GiB). Seven CPUs and
14,065,840,128 memory bytes remain active. PostgreSQL and Redis are healthy;
MinIO/scanner are starting. This cache-only build proof needs engine readiness,
not application/DB/scanner readiness. No input/config change since the preparation
receipt; JSON, formatting and strict proof prerequisites remain valid.

Updated receipt: READY FOR NATIVE MODIFIED-INPUT ISOLATION PROOF. Run
`node scripts/docker/benchmark-build-graph.mjs`; ten named cases must pass. Engine
restart is complete; native proof acceptance remains operator-owned and pending.

## Repeated-run benchmark defect: valid Turbo result mistaken for stale build

Latest operator run: Product baseline 83.1s, Order baseline 118.5s; Product source
fails `owner must compile once` with no cache misses. Its fetch/install/Prisma
stages stay cached and compile RUN executes, restoring all Turbo outputs. The
previous archived run compiled Product hash `16b023d764629287`; latest source
log reports a hit for exactly `16b023d764629287`. The harness appends the identical
`// nebula-native-build-isolation-proof` each run. Therefore it reused an already
built input, while expecting a never-built input. Classification: confirmed
benchmark defect, not evidence of stale application output. This is distinct
from the earlier missing dependency-layer cache and does not prove that inferred
eviction event. The 40GiB trial's full acceptance remains pending.

[Turbo's official caching documentation](https://github.com/vercel/turborepo/blob/main/apps/docs/content/docs/crafting-your-repository/caching.mdx)
confirms matching task fingerprints restore cached files/logs. No cache clear or
force build is justified by this result.

Before-edit impact trace:

| Changed owner / consumer                                                                                                                                                      | Required action or unchanged reason                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/docker/benchmark-build-graph.mjs`: source/schema/shared/unrelated comment mutation in `runNativeProof`                                                               | Unique run UUID and case name in snapshot-only comment; record UUID in summary for reproducibility. Baseline inputs unchanged. Unique per-case marker prevents shared Product results from falsely satisfying/failing Order's required first compile. |
| Same file: `inspectProofLog`                                                                                                                                                  | Preserve every existing strict stage/cache/producer assertion; no acceptance relaxation.                                                                                                                                                              |
| `scripts/docker/backend-build-graph.test.mjs`: imports, actual pinned Turbo restore regression and native proof cases                                                         | Exercise marker uniqueness across runs/cases; reproduce repeated same-input hit, then require fresh-marker owner miss with shared producers still cached using the actual pinned tools.                                                               |
| `.github/workflows/ci.yml`: `pnpm test:build-graph`; root `package.json` alias                                                                                                | Unchanged commands discover amended existing test file; no package/lock metadata edit.                                                                                                                                                                |
| `scripts/docker/backend-build-graph.mjs`, `docker/backend.Dockerfile`, `docker-compose.yml`, `scripts/backend.mjs`, `.dockerignore`, `scripts/docker/check-build-context.mjs` | Unchanged; defect is disposable test input reuse, not build selection or installation. Existing production build inputs remain valid.                                                                                                                 |
| `.ci-evidence/build-graph-native/summary.json` and log consumers in this report / `docs/current-focus.md`                                                                     | Summary gains runId; manually preserve latest failure before rerun. Existing result/stage/miss fields retained. Search found no exact summary shape/hash pins.                                                                                        |
| Public Gateway/RPC/OpenAPI/SDK, SQL fixtures, seeders, service code                                                                                                           | Unchanged; prior contract/preflight/database evidence unaffected. No preflight rerun needed for a benchmark-only edit.                                                                                                                                |

Cheap gates before handoff: syntax, scoped lint/format/diff; actual pinned graph
regressions and prepare-only owned snapshot. Native ten-case rerun remains heavy
and operator-owned. No broad build will be handed over until these gates pass.

Implemented narrow harness correction: `modifiedProofInput` appends a fresh
UUID plus exact case name, only inside the owned context; `runNativeProof`
records that UUID in progress/success/failure summaries and console preparation.
Per-case identity also prevents Product shared-case cache entries from satisfying
Order's intentionally fresh shared case within one run. Baseline and installation
inputs remain unchanged; no forced builds, cache clearing or reduced assertions.

Revisited impact table: both direct source/test consumers updated; CI/root alias
unchanged and still discovers seven tests. The Dockerfile does not copy the
benchmark or its test, so this edit changes no production build inputs. Original
working source stays untouched by the proof. Existing strict negative acceptance
checks are preserved. Failure archived byte-for-byte at
`.ci-evidence/build-graph-native/failed-reused-marker-20261026-120634/`.

Local results:

- `pnpm test:build-graph`: 7/7 pass in 12.39s, including actual pinned prune,
  frozen metadata, injected cache restoration and the added repeat/fresh marker
  behavior. Same-input rerun produces no misses; fresh owner marker produces
  exactly one owner miss and zero shared producer misses.
- All eight comment variants across two run IDs are distinct, including the
  two owners editing the same shared proto; original bytes remain a prefix.
- Both changed modules pass `node --check`; scoped ESLint with Node ESM globals
  reports zero errors/warnings. Initial root-default lint lacked Node globals for
  `.mjs`; no lint rule was disabled to pass the proper Node scope.
- Source Prettier/whitespace and current-focus diff checks pass. Actual
  `--prepare-only` passes: 53 inputs, ten planned cases, no Docker build executed.

```text
Requirement/finding: repeatable benchmark incorrectly required a fresh compile
  for previously cached identical input; confirmed by equal historical task hash.
Changed files/consumer trace: table above revisited; benchmark/test/docs only.
Cheap gates: 7 pinned-tool checks, syntax, Node-scoped lint, formatting/whitespace,
  actual snapshot preparation pass. Existing contract/preflight evidence retained.
SQL/live/contracts: unchanged, inapplicable to this benchmark correction.
Source/image drift: no production inputs edited; no application image rebuild needed.
Limitations: full native ten-case proof remains pending, including original
  unresolved cache-isolation cases. No new native pass inferred from local tests.
Next broad command: node scripts/docker/benchmark-build-graph.mjs
Expected: ten cases pass; summary.status=passed with runId and per-case evidence.
Readiness: READY FOR CORRECTED NATIVE MODIFIED-INPUT ISOLATION PROOF.
```

## Segment 2 acceptance - all ten native cases passed

Salar supplied a complete passing run. The agent re-read summary and all ten raw
logs and independently reran `inspectProofLog` on every case, comparing exact
stage/miss results against summary. All match. Run ID:
`7b74b201-02d4-4e31-b9d3-5af5f79d6cc6`; summary status `passed`. Preserved
byte-for-byte in
`.ci-evidence/build-graph-native/passed-7b74b201-02d4-4e31-b9d3-5af5f79d6cc6/`.

| Compile-stage proof         | Product | Order | Observed acceptance                                                                                                                        |
| --------------------------- | ------: | ----: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline                    |   10.1s |  7.1s | Fetch/install/owner generation/compilation cached; no Turbo misses.                                                                        |
| Owner source edit           |   50.1s | 38.5s | Fetch/install/generation cached; owner compiles exactly once; shared producers restored.                                                   |
| Unrelated Media source edit |   29.0s | 27.8s | Fetch/install/generation/compilation cached; no Turbo misses. Pruning/context overhead remains.                                            |
| Owner schema edit           |   50.2s | 52.6s | Fetch/install cached; owner generation executes; owner compiles once; shared producers restored.                                           |
| Shared product.proto edit   |   40.3s | 39.5s | Fetch/install/generation cached; protos/grpc-auth/clients/config and selected owner each compile once; no sibling application compilation. |

These are ten sequential cache-only graph-build solves, total 345.2s (5m45.2s),
not ten exported images or a cold full-repository timing. No production image
tag or working source was changed. Source variants are fresh UUID/case comments,
not schema/contract behavior changes; they prove cache invalidation boundaries,
not migration/publication semantics. Existing image closure and unchanged warm
image results remain the separate packaging/export evidence. Hardware remains
seven CPUs/about 13.10GiB usable RAM; active GC target 40GiB with cleanup enabled.
This passing working set does not prove the precise historical eviction cause.

Conclusion: Segment 2 is closed for Product and Order. Native builds, unchanged
warm image builds, both packaged import closures and all modified-input isolation
cases have passing evidence. No broad rerun or new build is needed for this
acceptance. Public API/SQL/live behavior was not modified or newly certified.

Consumer/documentation closure: update `docs/ASAP-BUILD-CLEANUP.md` benchmark gate,
replace obsolete pending status in `docs/current-focus.md`, and update the
`TODO-ALTERNATIVE.md` interruption summary. Production build/contract files stay
unchanged; prior focused/preflight evidence remains valid. Documentation formatting
and scoped diff checks are the applicable final gates for this status-only update.

Remaining Segment 3 work stays open: all-target graph rollout, Product/Order/
Gateway union compilation, Gateway database-free and Media Sharp/assets closure,
full-inventory integration and image-only release/save/load alignment, CI cache
persistence/retention and targeted integration proofs. Other targets still use
legacy; no claim of an all-service performance fix or three-minute cold build.

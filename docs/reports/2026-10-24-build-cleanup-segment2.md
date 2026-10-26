# Build cleanup segment 2 - shared selected graph

Date: 2026-10-24. [Active checklist](../ASAP-BUILD-CLEANUP.md).
Status: implementation and cheap checks passed; first native Product build,
paired Order acceptance and image/runtime timings pending Salar.

## Requirement and verified mechanism

Product and Order both need a reusable selected build path, not separate
service-specific Dockerfiles. Preserve the existing production dependency layer,
runtime checks, signatures, generators, schemas and contracts. The confirmed
defects are global development install/schema generation, global source cache
invalidation and unconditional shared compilation.

Pinned Turbo 2.5.8 was run locally with `prune @nebula/order-service --docker`
into an owned temporary directory. It produced only Order plus clients, config,
grpc-auth and protos, with a pruned lockfile and workspace settings. It omitted
root `tsconfig.base.json`, so the preparation helper must copy that input
explicitly. No install or image build was run for this probe.

## Bounded implementation

1. Retain the existing pipeline as `legacy` while Product/Order select `graph`.
   One shared Dockerfile and runtime target inventory remain. Full-inventory
   runner requests explicitly retain the legacy shared producer until rollout.
2. A pinned Turbo pruning stage emits separate fetch policy/lock, install
   manifests, selected schemas and selected sources. Source changes can rerun
   pruning without changing downstream metadata/schema copies. Real env files
   remain excluded. Do not copy the Web application into the pruning stage.
3. Inherit the fetched virtual-store stage for development installation instead
   of recreating its package tree. Suppress only selected workspace Prisma
   postinstall commands in generated install manifests; preserve approved
   third-party/native lifecycle scripts. Explicit schema generation follows
   installation and precedes compilation.
4. Traverse actual selected workspace dependencies. Build shared packages through
   Turbo in dependency order, explicitly refresh their injected dist/proto copies
   after each result, then compile the selected application. Turbo cache hits must
   not skip this synchronization; retain dependency hashes and `^build` edges.
5. Collect only built shared runtime artifacts into the existing overlay layout.
   Keep the stable full-backend production dependency layer as the already-recorded
   packaging tradeoff; narrowing that production install is not part of this pilot.

This preserves working packaging while changing the confirmed build-input gaps.
Cost: one graph/helper implementation, selected-source/lock/schema/cache tests,
one temporary pipeline selector and a first-use pinned pruning-tool layer. No
database migration or public API change is necessary. No resource limit, watch
workflow, package split or new deployment service is introduced.

## Before-edit consumer trace

| Owner                         | Exact consumers                                                                                                                                                                                                                                                                                                                         | Action / preserved reason                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build pipeline and inputs     | `docker/backend.Dockerfile`, `docker-compose.yml`, `docker-bake.hcl`, `.dockerignore`, `scripts/backend.mjs`, `scripts/backend.test.mjs`, `scripts/docker/build-backend.ps1`                                                                                                                                                            | Add graph stages and Product/Order pipeline selectors; preserve legacy full-inventory path, image names, args, ports, sequential export and failure behavior  |
| New graph owner               | `scripts/docker/backend-build-graph.mjs`, `scripts/docker/backend-build-graph.test.mjs`                                                                                                                                                                                                                                                 | Add selection/prune/generation/cache synchronization/artifact preparation; test actual pinned pruning and pnpm/Turbo cache restoration in owned tiny fixtures |
| Runtime closure               | `scripts/docker/verify-runtime-imports.mjs`, every final runtime stage in `docker/backend.Dockerfile`, `apps/media-service/assets/`, `packages/protos/package.json`                                                                                                                                                                     | Preserve verifier execution, require checks, Media assets/native check and protocol source availability; fixture-proof artifact collection                    |
| Generation and injection      | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `turbo.json`, `packages/protos/turbo.json`, `packages/protos/scripts/generate.mjs`, `packages/protos/tsconfig.json`, `packages/clients/package.json`, `packages/grpc-auth/package.json`, `packages/migration-artifacts/package.json`, `packages/config/package.json` | Preserve actual dependency graph, overrides, frozen lockfile, output hashes and normal lifecycle configuration; no hand-authored generated snapshots          |
| Product inputs                | `apps/product-service/package.json`, `apps/product-service/prisma/schema.prisma`, `apps/product-service/tsconfig.json`, `apps/product-service/tsconfig.build.json`                                                                                                                                                                      | Generate only selected owner; preserve custom client path and engine targets; no schema/content change                                                        |
| Order inputs                  | `apps/order-service/package.json`, `apps/order-service/prisma/schema.prisma`, `apps/order-service/tsconfig.json`, `apps/order-service/tsconfig.build.json`                                                                                                                                                                              | Same selected-owner rule, no schema/content change                                                                                                            |
| Existing config/health checks | `packages/config/test/health-wiring.spec.ts`, `packages/grpc-auth/test/service-wiring.spec.ts`, `packages/config/test/env-validation.spec.ts`                                                                                                                                                                                           | Retain all runtime health/security/environment assertions; update obsolete structural build assertions with equivalent selected-scope/lifecycle checks        |
| Contracts/inventories         | Gateway OpenAPI, SDK generation and protobuf source files                                                                                                                                                                                                                                                                               | Unchanged; run existing preflight because generated protocol/runtime consumers are repackaged, never refresh pins to hide drift                               |
| CI/release/docs               | `.github/workflows/ci.yml`, `docker-compose.release.yml`, `scripts/docker/save-release-images.ps1`, `scripts/docker/load-release-images.ps1`, `deploy/README.md`, `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`                                     | No deployment/image inventory change; document graph pilot, pending timings and safe fallback; CI cache/promotion remains segment 3                           |

## Checks and boundary

Run Node syntax/lint, formatting, focused graph/tooling tests, actual pinned
pruning for Product/Order, actual tiny pnpm/Turbo injected-cache recovery proof,
and frozen generated-metadata validation. Render Compose/Bake selectors and run
preflight. No broad/image handoff while a cheap gate fails. Tiny fixture proofs
do not certify Linux Prisma engines, full image installation or runtime health.
Native image builds, timings, image load/closure and live proofs remain pending.

## Preparation failure caught locally

The first real frozen-metadata check exposed a confirmed pinned-tool defect:
Turbo 2.5.8 drops `settings.injectWorkspacePackages` from its pruned lockfile.
The upstream [issue](https://github.com/vercel/turborepo/issues/10584) documents
the same mismatch. The helper preserves the original lockfile settings block
verbatim after pruning; it does not invent dependency snapshots or resolve newer
versions. Frozen pnpm validation must still pass. No tool upgrade is required
for this narrow serialization correction. This is a recorded generator
compatibility step, not a hand-edited lockfile or a skipped frozen check.

The first tiny input-layer fixture also exposed Windows symlink-copy privilege
limitations after installing node_modules into the pruning input. Docker inputs
already exclude node_modules. The input-layer fixture now uses lockfile-only
preparation, matching that production boundary; the separate real injected-cache
proof retains an actual install. No test was skipped or OS-wide permission changed.

## Implemented path and consumer review

- `docker/backend.Dockerfile` now has a graph pruner, policy/lock-only fetch,
  development install inheriting the fetched virtual store, selected-schema
  generation and source/compile stages. Product and Order select this path in
  Compose/Bake. The original compilation path remains as the explicit `legacy`
  producer for other targets and full-inventory runner requests.
- `scripts/docker/backend-build-graph.mjs` owns dependency traversal, prune
  partitioning, explicit owner generation, cached shared compilation and bounded
  injected-output synchronization. It rejects a dependency on an unselected
  sibling application, unknown owners, cycles and injected targets outside the
  virtual store. It refreshes only compiled/runtime package files, not another
  application's source, database or credentials.
- Runtime artifact collection replaces the five fixed artifact COPYs with the
  actual selected shared closure. Existing injected overlays, non-root runtime,
  `require(p)`, environment-module verification, tenant proto resolve and Media
  Sharp/assets checks remain. The new fixture proves proto copying and removal
  of stale injected dist files; real image closure is still pending.
- The common production install reads metadata directly instead of depending
  on the legacy full-development fetch stage. Its full-backend dependency/layout
  tradeoff is preserved. It may fetch missing production package bytes on a cold
  store under frozen resolution; `--offline` was removed there to avoid a race
  with the separate graph fetch. No native generation/lifecycle was enabled in
  the production-only install. This shared layer may still be costly initially.
- `scripts/backend.mjs` preserves the legacy full-inventory producer explicitly;
  partial requests follow each Compose target's graph/legacy selection. Node
  tooling assertions were updated for the new artifact producer while keeping
  all runtime dependency/health/security checks. Dockerfile EOLs were normalized
  to the existing LF policy after a structural assertion caught CRLF output.
- `package.json` exposes `test:build-graph`; the quality CI job runs it after
  frozen installation. This is a container-free regression gate, not the later
  CI layer/output-cache or tested-image-promotion implementation.
- `.dockerignore`, root lockfile, workspace injection settings, global TS/Turbo
  configuration, proto generator/messages/pins and application source/schemas
  are unchanged by segment 2. Release tags/inventory/load-save behavior are
  preserved. Documentation/current-focus/checklist now describe the pilot and
  explicit legacy fallback. Earlier passing D2 SQL/contract evidence is retained.

## Actual checks and native handoff receipt

Local results after corrections:

- Four graph tests pass in about ten seconds. They invoke actual pinned Turbo
  pruning for both Product and Order, verify each generated install metadata
  with frozen offline pnpm, compare fetch/install/schema/source fingerprints,
  and run a tiny real pnpm/Turbo workspace through cache-hit shared producers
  plus a changed consumer. A subsequent shared source edit reaches the consumer
  as v2; stale injected files are removed. Cycle/sibling/unsafe-slot failures
  preserve unrelated fixture bytes. All recursive fixture cleanup checks its
  resolved owned temporary root before deletion.
- Six focused tooling/inventory/selection tests pass; 22 health wiring checks
  pass. Four additional affected command/inventory/CI policy checks pass.
- `pnpm test:preflight` passes freshness plus 23/23 contract/inventory checks.
- Node syntax, scoped MJS lint and root frozen offline lockfile-only validation
  pass. No repository-wide host install or real service compilation was launched;
  only the owned tiny fixture installed and built its stand-in packages.
- Rendered Bake selects `graph` for Product and Order with their own application
  scopes. BuildKit `product-service --call=check` completes with no warnings;
  this resolves/parses build definitions/base metadata without executing the
  install, generation or compiler RUNs. It is not a successful image build.

```text
Requirement/finding: selected development graph and trustworthy cached outputs.
Changed files and consumer impact: tables/review above; no public or SQL change.
Format/syntax/lint/types: JS syntax/lint, frozen metadata, formatting and scoped
  git diff --check pass; no TS source changes in this segment.
Focused behavior/contracts: real four-case graph proof, ten tooling, 22 health,
  and 23 preflight checks pass; mocked owner generation is orchestration only.
SQL/seed/runtime: no SQL change; actual Linux Prisma/image/runtime proof pending.
Source/image drift: Product/Order Docker inputs changed; existing images cannot
  certify this path. Building does not restart running services.
Known limitations: first-use tooling/dependency assembly cost; common production
  install still backend-wide; native warm/source/schema tests and Order image
  remain pending; other services/full inventory intentionally remain legacy.
Next broad command: pnpm docker:build:backend product-service
Why: first native install/generate/compile/package/load proof before repeating
  the same path for Order or requesting native cache/isolation benchmarks.
Expected summary: exit=0, only Product Prisma generation/application compilation,
  no legacy forced prebuild stage; retain per-stage log and elapsed time.
Readiness: READY FOR FIRST PRODUCT GRAPH IMAGE PROOF, NOT PERFORMANCE SIGN-OFF.
```

PowerShell operator handoff, preserving useful caches:

```powershell
pnpm docker:build:backend product-service *> product-graph-build.log
$productGraphExit = $LASTEXITCODE
Get-Content product-graph-build.log -Tail 35
"exit_code=$productGraphExit"
```

Do not add force/no-cache or restart containers for this build. After the first
native result, compare an unchanged warm build and run the paired Order proof,
then complete isolated source/schema/shared-contract and runtime acceptance.
Segment 2's last two checklist items remain open until that evidence exists.

## First native attempt - excluded COPY input

Salar reports Product exited 1 after 18.2s: graph-pruner COPY requested
`.gitignore`, but `.dockerignore` excludes that file. Installation/compilation
did not complete; the pruning-tool install and metadata COPY were cancelled.
This is a confirmed Dockerfile/preparation defect, not a service/container fault.
The agent's definition check did not exercise context COPY checksums, and host
pruning tests had access to `.gitignore` unlike the real Docker context.

Before-edit correction trace:

| Owner         | Consumers                                                                                                                          | Narrow correction/check                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pruner inputs | `docker/backend.Dockerfile`, `.dockerignore`, `scripts/docker/backend-build-graph.mjs`                                             | Remove unnecessary explicit `.gitignore` COPY; preserve Docker exclusions; helper already treats the file as optional                                                                       |
| Context gate  | new `scripts/docker/check-build-context.mjs`, `scripts/docker/backend-build-graph.test.mjs`, `docs/testing/pre-suite-checklist.md` | Extract every local COPY input and ask actual BuildKit to copy those inputs into a scratch/cache-only probe, without install/compiler RUNs; test extraction and missing-ignore-file pruning |
| CI consumer   | `.github/workflows/ci.yml`                                                                                                         | Run the actual context probe in quality after the graph tests; no release/publish or cache-provider change                                                                                  |
| Evidence      | this report, `docs/current-focus.md`                                                                                               | Record actual failure and new proof boundary before repeating the operator image build                                                                                                      |

No contract/source/SQL behavior changes. Preserve prior graph/cache/preflight
evidence except tests directly affected by the added context regression.

Correction receipt:

- Removed only `.gitignore` from the explicit local pruner COPY. `.dockerignore`
  still excludes VCS metadata and real env files. The helper's existing optional
  file handling is unchanged; the tiny pruning fixture now runs without that file.
- All five graph cases pass, including both actual pruned/frozen metadata checks,
  absent-ignore-file pruning, real injected cache recovery and input extraction.
  The two affected inventory/CI tests pass. Source syntax, scoped lint, formatting
  and diff checks pass; previous unaffected preflight/contract evidence is retained.
- Actual BuildKit context probe passes for all 51 unique local COPY sources in
  about three seconds on rerun. It has a single scratch COPY, no package installs,
  schema generation, application compile or image export. Temporary cleanup
  validates its resolved owned path and preserves primary errors if cleanup fails.
- CI quality and the mandatory preparation checklist now require this context
  probe after COPY/context changes. Stage-output COPYs still require the native
  image proof; this guard makes no claim to validate generated build outputs.
- Readiness: READY TO RETRY FIRST PRODUCT GRAPH IMAGE PROOF with the same cached
  command above. Product/Order performance/runtime acceptance remains pending;
  no container restart, cache deletion, forced build or database operation is needed.

## First successful Product graph image - remaining cache defect

Salar reports exit 0, elapsed 581.9s (9m41.9s); local log confirms the result.
Earlier supplied Product total was 1,339.1s, so this run is 56.5% shorter by
elapsed total. Different cache/source states prevent treating this as a
controlled speedup benchmark. Export/load took 71.0s; dev install 18.0s;
selected Prisma generation 18.6s; graph fetch 241.8s; production install 68.5s;
graph compilation RUN 55.9s. Steps can overlap; do not sum as a wall-clock split.
The image passed shared-package loading checks and loaded successfully. Only
Product's schema loaded; no legacy-build stage ran. No application health or
standalone container runtime proof has been supplied yet.

The full log also exposes a confirmed unmet cache requirement: protos builds
four times with different hashes across helper phases; grpc-auth and clients
also rebuild. The tiny passing cache fixture omitted the real root's workspace
dependencies and retained an ignore file absent from Docker. Before another
heavy handoff, strengthen `scripts/docker/backend-build-graph.test.mjs` to mirror
those inputs and require each shared producer to compile only once. Trace
`scripts/docker/backend-build-graph.mjs` shared ordering/output-ignore behavior,
`turbo.json` global dependencies and `package.json` root workspace dependencies.
Do not delete dependency hashes or disable task prerequisites to force a hit.
No protocol/schema/application behavior change is intended; existing passes
remain valid outside this cache-preparation gap. Warm/Order handoff temporarily
waits for the focused correction, rather than certifying the repeated work.

### Reproduced cache cause and correction

The real pinned-tool fixture now includes root workspace dependencies and starts
without `.gitignore`, matching the Docker path. Before correction it fails the
new exact assertion: protos compiles three times instead of once. Previously the
fixture's existing ignore file hid this global-hash feedback. Build outputs and
per-package `.turbo` logs enter hashes through root shared dependencies when those
files are not ignored.

`scripts/docker/backend-build-graph.mjs` now generates a build-only ignore policy
when the repository ignore file is absent. It excludes node_modules, dist, Turbo
logs, tsbuildinfo, proto generated output, Prisma generated clients and collected
runtime artifacts. Authored source/manifests/schema inputs and `^build` hashes
are preserved; no file is copied from the excluded Docker context. The policy is
created in the pruned full tree and ensured before task execution. Existing host
ignore files are preserved. Fetch/install/schema metadata do not change.

All five graph cases pass again. The strengthened fixture requires exactly one
cache miss per shared producer in the first pass, then checks cache restoration
before a changed consumer and propagation of v2 after a real shared-source edit.
Scoped lint, formatting and diff checks pass. Earlier context/preflight/health
evidence remains applicable: COPY paths, public contracts and runtime source
are unchanged. The new hash policy needs the next native build proof; the earlier
Product image remains the successful first-build baseline, not a warm benchmark.

### Product packaged closure and next handoff

Local inspection confirms image identity matches Salar's supplied manifest-list
digest `sha256:25eb2e2ab2160e12726214c546b6e0f8f4d8f5d83c6b099d5946ae5c44665390`.
An ephemeral `--pull=never --network none --read-only` Node probe with no mounts
passed: `/workspace/apps` contains only product-service; every declared internal
package loads, as do its environment schema and generated Prisma client; Product
proto source resolves. This proves packaged import closure without sibling source
or remote services. It does not start Product, connect to a DB, apply migrations
or establish application readiness. Existing service containers were not restarted.

```text
Requirement/finding: eliminate repeated shared compilation revealed by native log.
Consumer trace: graph helper, stronger root-dependency/no-ignore fixture, report,
  current-focus/checklist; no API, schema, compiler input or COPY-path changes.
Cheap gates: five graph tests, scoped MJS lint/format/diff pass. Real fixture
  reproduces failure before correction and exact once-per-producer behavior after.
Prior evidence retained: 51-input actual context probe, 23 preflight cases,
  first Product image/packaged closure. These do not certify the new native hash policy.
Native status: updated helper and first Order graph build pending; true unchanged
  warm/source/schema native benchmarks remain open for both owners.
Next broad command: pnpm docker:build:backend order-service
Why: paired owner acceptance and native once-per-shared-producer validation using
  the corrected common helper, reusing the already built production/tool layers.
Expected: exit 0, one Order Prisma generation; shared cache hits within phases,
  no legacy app compilation. Keep the full log for phase/cache analysis.
Readiness: READY FOR ORDER GRAPH IMAGE PROOF; WARM BENCHMARK STILL PENDING.
```

```powershell
pnpm docker:build:backend order-service *> order-graph-build.log
$orderGraphExit = $LASTEXITCODE
Get-Content order-graph-build.log -Tail 35
"exit_code=$orderGraphExit"
```

This is Order's first graph build, not an unchanged warm rerun. No force/no-cache
or container restart. Product will need a build with the corrected helper before
an unchanged repeat can serve as its final warm benchmark.

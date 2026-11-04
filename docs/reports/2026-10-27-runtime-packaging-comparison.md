# Segment 4: production runtime packaging comparison

Started: 2026-10-27. Status: comparison complete; retain the accepted shared
production dependency layout. The isolated per-service candidate is not adopted.
User approved planning and commencing the isolated comparison after the optional
optimization and shared-layer tradeoff were explained. This does not approve
replacing the accepted production layout without measured acceptance.

## Requirement and current mechanism

Classification: optional packaging optimization, not a confirmed runtime defect.
The accepted graph compiles selected services/shared producers once and refreshes
injected workspace outputs. `prod-deps` installs a frozen backend-wide production
graph from metadata. Final images share that large layer; each image remains
self-contained. Individual image size is not the fleet's physical disk usage.
Keep this path intact while comparing portable, per-service dependency output.

The candidate uses the pinned pnpm 10.17.1 deploy operation on the existing
metadata-only production stage, followed by an explicit overlay of the selected
built workspace outputs. Deployment precedes application-source artifact copies
so source-only edits need not repeat the dependency installation. Compilation
still uses the same full union; the runtime selector is a separate leaf.
This first experiment intentionally retains the shared production preparation;
it is not a claim that the backend-wide install itself has been eliminated.

[pnpm deployment documentation](https://pnpm.io/10.x/cli/deploy) describes isolated
portable dependencies, injected-workspace requirements and file selection.
[Docker guidance](https://pnpm.io/10.x/docker) uses deployment after workspace
builds. Our metadata-first variation must prove that overlaid compiled workspaces
and their portable dependency links are correct. The pinned CLI labels deploy
experimental; this remains a tested prototype, never a silent default migration.

## Execution plan

1. Inspect all eleven local image IDs, logical sizes and shared layer identities.
   Label existing local tags as unverified cache, not the current tested commit.
2. Add isolated benchmark generation. Preserve the accepted Dockerfile verbatim
   as a prefix; append candidate stages only in an owned source snapshot. Use
   Product, Gateway and Media as Prisma/no-Prisma/native-asset representatives.
3. Prove deploy/overlay behavior with real pinned pnpm fixtures, including stale
   compiled outputs, ignored lifecycle scripts and dependency portability.
4. Run syntax/lint/focused checks and actual scratch COPY-context validation on
   the generated snapshot before any heavy handoff.
5. Salar runs the bounded native comparison: eleven baseline exports, three
   baseline warm controls, three candidate initial exports and three candidate
   warm controls. Same inputs, compiler union, package manager, OS and concurrency.
   No forced rebuild/cache pruning/production tags or containers are changed.
6. Probe representative images offline/read-only, compare runtime metadata and
   measure logical sizes plus streamed archive bytes/shared layers. Archive
   measurements include paired pilots and a mixed fleet; the mixed fleet is not
   an all-eleven candidate forecast. No giant tar is retained.
7. Keep this checklist item open until results are reviewed. Before adoption,
   require all eleven candidate closures, image security gates, source-edit/cache
   regressions, archive identity and relevant live acceptance. A smaller single
   image alone does not justify losing useful shared layers or slower edits.

## Before-edit dependency and consumer trace

| Exact file / consumer                                                                                                                         | Planned action / preserved reason                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/backend.Dockerfile` prod-deps/runtime-base/eleven runtime targets                                                                     | Read as baseline and generate appended experiment in owned snapshot only. Real file/pins/targets/default remain unchanged.                                                                                        |
| `scripts/docker/backend-build-graph.mjs` selectedGraph/collectArtifacts/syncInjectedRuntime                                                   | Reuse actual graph/artifact identities. Preserve accepted compilation and injected-cache refresh; no new sibling application dependency.                                                                          |
| `scripts/docker/runtime-package-overlay.mjs` (new)                                                                                            | Standalone copy of only required compiled shared artifacts into portable pnpm slots, with version/path/symlink guards; never copy old dependency links into the deployment.                                       |
| `scripts/docker/benchmark-runtime-packaging.mjs` (new)                                                                                        | Validated generation, plan/inspection, owned snapshot/tags, bounded sequential runs, runtime/size/archive evidence and owned resource cleanup.                                                                    |
| `scripts/docker/runtime-packaging.test.mjs` (new)                                                                                             | Real pinned deploy fixture plus negative overlay/path/version, generation and plan/measurement checks. No Docker/native install in focused tests.                                                                 |
| `scripts/docker/verify-runtime-imports.mjs`                                                                                                   | Existing baseline verifier remains mandatory and unmodified. Candidate offline probes additionally verify packaged workspace loads, selected app only, Prisma native engine and Media Sharp/font assets.          |
| `scripts/docker/benchmark-build-graph.mjs` prepareSnapshot, `scripts/docker/check-build-context.mjs`                                          | Reuse existing source/context filtering; add the overlay input explicitly to the owned snapshot and check actual generated COPY inputs. No real env copied.                                                       |
| `scripts/docker/backend-build-graph.test.mjs`, `scripts/backend.test.mjs`                                                                     | Existing invariants remain applicable; no normal Dockerfile/Bake/runner behavior changed. Run only impacted existing checks if implementation requires a shared edit.                                             |
| `docker-bake.hcl`, `.github/backend-cache.hcl`, `scripts/backend.mjs`, `scripts/docker/build-backend.ps1`                                     | Unchanged: experiment has no default build selector. Accepted image and cache scopes stay intact.                                                                                                                 |
| `.github/workflows/ci.yml` quality graph-test invocation                                                                                      | Consumer review found an explicit single-file test command. Append the new focused packaging test file to this existing invocation; no native candidate builds, new jobs, cache scopes or release policy changes. |
| Three app manifests, `packages/{clients,grpc-auth,config,protos,migration-artifacts}/package.json`, `pnpm-workspace.yaml`, `.npmrc`, lockfile | Inspect/reuse actual versions, files, peers, injected synchronization and lifecycle policy; no metadata or handwritten lock changes.                                                                              |
| Prisma custom output, proto files, Media font/license assets                                                                                  | Preserve baseline copies. Prove filesystem/native loads instead of counting successful compilation as runtime evidence.                                                                                           |
| Release image inventory/save/load, image identity recorder/security policy                                                                    | No reference/inventory/policy changes. Candidate adoption/security/archive gates remain separate until all eleven are proven.                                                                                     |
| Current-focus, ASAP checklist, Docker documentation and this report                                                                           | Record experimental scope, runnable handoff and actual results/limits; do not mark comparison/adoption passed before measurement.                                                                                 |
| APIs/DTOs/proto source/generated contracts/SQL/env/seed data                                                                                  | Unchanged: no preflight/SQL/seed rerun required merely for this isolated packaging tooling.                                                                                                                       |

## Implementation and observed preparation

- Three new tooling files implement the generated stages, portable workspace
  overlay and focused fixtures. The repository Dockerfile remains unchanged.
- Real pnpm 10.17.1 deploy accepts the selected flags. The disposable fixture uses
  a package-manager-authored lock followed by frozen production install/deploy,
  ignores intentionally failing lifecycle hooks, omits dev-only dependencies,
  removes stale compiled/proto outputs, and loads after its workspace is deleted.
  This is portability evidence, not a Linux/native-package proof.
- Context preparation run `c0fac5bf-a3cd-43e0-a265-a92eb2b0559d` passed actual
  BuildKit checks for all 52 unique local COPY inputs. It performed no dependency
  install, compiler RUN or image export; its owned source snapshot was cleaned.
- Existing cached Product, Gateway and Media images pass the offline read-only
  probe: 309, 203 and 160 artifact files respectively. Prisma's Debian engine
  loads; Media renders PNG and bundled-font text. Media reports its existing
  Fontconfig default-configuration warning, retained explicitly. These cached
  images are not certified as the current source/candidate benchmark images.
- Native results will record exact source input hashes, source commit, image
  IDs/layers, first and warm timings, artifact hashes, warnings and archive byte
  counts under `.ci-evidence/runtime-packaging/<run-id>/`. First builds are
  cache-eligible, never described as cold builds. Normal completion/failures
  clean owned tags and snapshots; forced process termination can interrupt that
  cleanup. Existing automatic build-cache retention still applies.

## Operator proof and interpretation

From the repository PowerShell prompt, run:

```powershell
node scripts/docker/benchmark-runtime-packaging.mjs
```

This is the heavy command. It prints each of twenty sequential image exports and
then three paired offline/native probes and four streamed archive measurements.
It does not start the backend or require a running database, scanner or VPN for
application calls. Dependency/base-image fetching may still require network/VPN.
No archive file is retained. The two fleet archives measure eleven baseline
images versus eight baseline plus three candidate images, not eleven candidates.

Return the console result and the printed `evidence.json` path. On failure,
return the named step and its log tail; the evidence retains the first failure.
A passing run means comparison data is ready for review, not candidate adoption.
Prefer the existing layer if fleet duplication or warm-build cost offsets the
individual-image benefit. No three-minute performance promise is made.

## Mandatory handoff receipt

Requirement/finding: optional runtime packaging measurement; no confirmed defect
in the accepted shared production dependency mechanism.

Changed files and consumers: exact impact table above; normal Dockerfile, Bake,
manifests, lock, shared compiler/runtime verifier and application contracts remain
unchanged. Existing quality CI runs the added focused test file. Documentation
links this bounded experiment while keeping Segment 4 comparison open.

Format/syntax/lint/types and final focused results: all changed files pass scoped
Prettier; the three new modules pass Node syntax and scoped ESLint with no
warnings. `git diff --check` passes. The graph/packaging command passes 19/19
checks (nine existing graph checks and ten new packaging checks); backend tooling
passes 83/83. Both have zero skipped/failed checks. Pinned-tool fixtures run with
`CI=true` and `GITHUB_ACTIONS=true`. All 49 relative file links in the four changed
documentation files resolve. Final consumer review confirms the CI invocation
includes the new test file without changing image targets or cache policy.

Types: the three new files are Node JavaScript; syntax and scoped ESLint apply.
There are no changed TypeScript owners, contracts or test fixtures requiring new
application types, preflight, SQL/seed or broad live-suite runs; accepted prior
application gates remain valid. CI itself is not claimed run for these edits.

Actual runtime: existing-image probe checks above only. Candidate Linux deploy,
native dependencies, measured times/sizes/archive bytes are pending Salar's run.
Source/image drift: rebuild only owned benchmark refs from the captured snapshot;
do not reuse local `latest` tags as current evidence. No forced rebuild or prune.

Known deferrals: all-eleven candidate runtime closures, native source-edit cache
regressions, candidate security scans, save/load identity and relevant live
acceptance are required before adoption. The benchmark retains backend-wide
production preparation and does not claim reduced install fan-out.

Readiness: READY FOR NAMED PROOF -
`node scripts/docker/benchmark-runtime-packaging.mjs`.
Native comparison started and failed at a confirmed benchmark assertion defect;
no candidate benefit/adoption is claimed. The correction below supersedes the
earlier ready receipt until its checks pass.

## Native run c2f9b311: confirmed harness defect and correction trace

All eleven baseline exports succeeded. The run stopped on the first warm
Product export because `runComparison` compared the complete `imageEvidence`
object, including Docker Desktop's outer image-index ID. BuildKit's actual logs
show the same runnable manifest `sha256:c762767e571ca7722a559c932b4119fb253ace4a734c7477e86ffff04a5ba8d2`
and config `sha256:9d5a264c8da565ec91e0a208b20000c572176a26aa03b231ae2bdab0186c65f8`
in both exports, identical sixteen filesystem layers/runtime metadata/size, and
a changed attestation manifest plus enclosing index. The warm build's final
runtime RUN is cached and its layer export takes 0.0s. This is not evidence of
an application, image-content or container-health failure. Cleanup reports zero
errors. Candidate exports/probes/archive measurements were not reached.

[Docker's attestation storage specification](https://docs.docker.com/build/metadata/attestations/attestation-storage/)
places attestation manifests in the outer image index; its
[provenance documentation](https://docs.docker.com/build/metadata/attestations/slsa-provenance/)
includes build timestamps. Thus outer index identity is not the same requirement
as identical runnable-image content across separate build invocations. This
does not change the release requirement to preserve an exact tested image
through save/load.

Before-edit correction impact trace:

| Exact owner/consumer                                                                                                                          | Required correction or unchanged reason                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/docker/benchmark-runtime-packaging.mjs` imageEvidence/runComparison/warm assertion                                                   | Parse export identities, bind inspected ID to exported index/manifest/config, compare runnable manifest/config plus exact layers/runtime/size, retain both export identities and attestation variation in step evidence. Record the completed export even if a subsequent warm assertion fails. |
| `scripts/docker/runtime-packaging.test.mjs`                                                                                                   | Reproduce the actual two export logs, allow only proven provenance variation and reject changed config, runnable manifest, layer, runtime, size, malformed/ambiguous logs and unexplained index changes.                                                                                        |
| `scripts/docker/record-image-identities.mjs`, release save/load tooling                                                                       | Inspected; unchanged. Exact tested-ID preservation remains mandatory. This fix applies only to comparing separate benchmark exports.                                                                                                                                                            |
| `.github/workflows/ci.yml`, root package test command                                                                                         | Already invokes the focused packaging test; unchanged.                                                                                                                                                                                                                                          |
| `runtime-package-overlay.mjs`, candidate Dockerfile generator, graph builder/context helper, real Dockerfile/Bake/manifests/lock/env/APIs/SQL | Unchanged. Packaging, provenance defaults and security policy stay intact; do not disable attestations to satisfy the test.                                                                                                                                                                     |
| Current-focus, ASAP list and this receipt                                                                                                     | Record the actual failure and corrected readiness; comparison remains open. No final packaging result exists.                                                                                                                                                                                   |

Correction checks and renewed handoff:

- `pnpm test:build-graph scripts/docker/runtime-packaging.test.mjs`: 23/23 pass,
  zero skips/failures. The four new regressions cover actual recorded export
  digests, legitimate provenance changes, strict content/config/runtime/size
  failures, unrelated IDs and malformed/ambiguous exporter evidence. Existing
  pnpm fixtures still run with CI/GitHub Actions settings.
- Saved baseline/warm logs and the posted sixteen layer IDs/size replay through
  the corrected validator successfully. The original failed `evidence.json` is
  preserved; the separate `correction-log-replay.json` records this diagnostic.
  This is replay evidence, not a new image build or completion of warm timings.
- Scoped ESLint and Node syntax pass for both changed modules, with no warnings.
  Final formatting/whitespace and consumer review pass. The earlier 83 tooling
  checks remain applicable: their implementation/CI wiring was not changed by
  this correction.
- Actual Docker COPY inputs, generator, overlay, accepted Dockerfile and app
  contracts are unchanged, so earlier 52-input context validation and unchanged
  application/preflight/SQL/type evidence remain valid. No broad application,
  migration or live suite is needed for this assertion-only tooling correction.
- Current-focus and ASAP point to this corrected handoff. Candidate native
  deployment, runtime parity, security and archive/size evidence remain pending;
  exact release save/load identity checks and provenance remain enabled.

Readiness: READY FOR NAMED PROOF - rerun
`node scripts/docker/benchmark-runtime-packaging.mjs`.
It still performs twenty cache-eligible exports because the failed run cleaned
its owned tags/context, and the fleet archive comparison requires those refs.
Build cache was not pruned; normal image tags/services were not changed. Reuse
is expected where cache entries survive, without a timing guarantee. Heavy
execution remains Salar-owned.

## Completed comparison 616d63fe: retain the accepted shared layer

Salar ran the benchmark; local inspection of
`.ci-evidence/runtime-packaging/616d63fe-3fea-4216-9dc6-c98b0cf0061f/evidence.json`
and individual logs confirms `comparison-passed-review-required`. All twenty
exports, six warm identity comparisons, three paired offline/native/artifact
checks and four streamed archives passed. Source commit: `ba181dc`, plus authored
inputs recorded by the run's hashes. Cleanup has zero errors. Normal tags,
services and the real Dockerfile remain unchanged.

**Decision: retain the accepted shared dependency layer.** The optional
comparison task is complete; the candidate remains an opt-in prototype.

### Image size versus fleet sharing

| Image   | Baseline Docker-reported MiB | Candidate MiB | Individual reduction |
| ------- | ---------------------------: | ------------: | -------------------: |
| Product |                       185.45 |        163.13 |                12.0% |
| Gateway |                       166.76 |         94.99 |                43.0% |
| Media   |                       185.46 |        180.85 |                 2.5% |

Logical per-image sizes are not the fleet's physical disk usage. Actual streamed
`docker image save` measurements show the cost of reduced layer sharing:

| Image set                                           | Archive bytes |    MiB |
| --------------------------------------------------- | ------------: | -----: |
| Three baseline pilots                               |   214,287,872 | 204.36 |
| Three candidate pilots                              |   288,413,184 | 275.05 |
| Eleven baseline services                            |   351,620,096 | 335.33 |
| Eight baseline services plus three candidate pilots |   514,562,560 | 490.73 |

The pilot archive grows 34.6%; the measured mixed fleet grows **46.3%**
(155.39 MiB). This outweighs the individual-image savings for our bundled release
workflow. This is not an eleven-candidate forecast, registry-transfer benchmark
or physical-disk measurement. No archive file was retained.

### Timings and long steps

Eleven cache-eligible baseline exports total **176.382s**, about 2m56s. This is
not a cold build or total CI duration. All twenty exports total 1,893.634s,
excluding probes and archive streams.

| Pilot   | Cached baseline s | First candidate packaging/export s | Baseline warm s | Candidate warm s |
| ------- | ----------------: | ---------------------------------: | --------------: | ---------------: |
| Product |            12.736 |                            139.449 |          10.017 |          117.207 |
| Gateway |            12.707 |                            174.812 |          19.374 |           10.490 |
| Media   |            15.955 |                          1,226.314 |           9.965 |            9.624 |

Baseline dependencies were cached; candidate deployment layers were new. These
are not matched cold-build costs, and host/resource contention was not measured.

Media's accepted production install and graph compilation stayed cached. Its
new deploy took 506.6s, node_modules COPY/merge 436.3s, first-party require check
131.2s and export 99.2s. pnpm reported 251 reused packages, zero downloads.
Vertex times can overlap/include waits: these establish assembly/copy/export
delays, not a CPU profile or proof of an intrinsic 20-minute packaging cost.

Product's 117.2s warm outlier had cached deploy/install/compiler steps. Loading
the Dockerfile alone reports 69.8s; export took 1.4s. This is a Docker/host-side
wait, not a dependency reinstall or compilation miss. Logs cannot distinguish
memory pressure, storage stalls, daemon contention or other host activity.
Gateway and Media candidate warm exports finish in approximately ten seconds.
No architecture/resource-policy replacement is justified by this outlier alone.

### Runtime, closure and next work

Product, Gateway and Media pass unprivileged, network-disabled, read-only probes
and exact artifact-hash/runtime-metadata parity. Prisma's Debian engine loads;
Media's Sharp and bundled-font rendering work. Both baseline and candidate Media
emit the same two Fontconfig default-configuration warnings. They remain visible;
offline checks do not certify application startup or database/live behavior.

All six warm comparisons preserve runnable manifest, full config digest, layer
identities and runtime metadata while recording changed attestation/index IDs.
Release save/load still requires preservation of the exact tested image.

Current-focus, ASAP and the Docker map record this measured rejection. This
review changes documentation only. Existing 23 focused checks, 83 tooling checks
and context validation remain valid; no additional build/live suite is needed.
Changed documentation passes Prettier, `git diff --check` and all 49 relative
file-link checks, including the new decision-section links.
All-eleven candidate closures, candidate scans, native modified-input cache
proofs and save/load/live acceptance were not run. They become necessary only
if this rejected alternative is revived for adoption.

Next: propose a selected-service watch/restart workflow that preserves shared
producer refresh and integration/release image gates. Do not widen the package
architecture on an unmeasured fan-out claim.

Readiness: COMPARISON CLOSED - RETAIN CURRENT PACKAGING. No heavy command is
required for this decision.

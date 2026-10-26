# Backend build performance audit

Date: 2026-10-24. Requested by Salar before the next D2 image cycle.
Status: baseline audit, followed by the
[ASAP cleanup execution](2026-10-24-build-cleanup-execution.md).
Findings/timings below describe the inspected baseline; slice 1 now corrects
selection and one unused dependency. Pruned-build/runtime benchmarks remain open.

## Conclusion

There are confirmed build-scope and cache-boundary defects worth correcting.
Recent builds spend minutes materializing dependencies and assembling layers,
while their actual Turbo compilation takes seconds. More service count is not
the useful comparison: distinguish cached task execution, clean compilation,
dependency installation, image assembly and loading into Docker Desktop.

Keep the existing monorepo, pnpm/Turbo, single shared Dockerfile, pinned Debian
images, deterministic installs and runtime correctness checks. First isolate the
selected build graph and make its caches work correctly. A compiler/build-tool
replacement is not justified by the measured breakdown.

## Observed evidence

All timings below come from read-only local Buildx history/log inspection, not
an estimate or a new benchmark. Step elapsed times can include contention and
overlap; do not sum them as an exact wall-clock decomposition.

| Build           | Total elapsed | Dependency fetch | Development install | Production install | Compilation RUN |              Turbo task time | Export/load |
| --------------- | ------------: | ---------------: | ------------------: | -----------------: | --------------: | ---------------------------: | ----------: |
| Product, Oct 24 |       22m 15s |           422.2s |              355.1s |             103.7s |       about 55s |          22.472s, five tasks |       77.0s |
| Order, Oct 19   |       19m 37s |           356.8s |              335.7s |              97.0s |           51.5s |          21.114s, five tasks |       70.2s |
| Product, Oct 14 |       28m 10s |           479.5s |              562.0s |             115.5s |           68.2s |          28.782s, five tasks |       81.2s |
| Gateway, Oct 14 |        4m 20s |           cached |              cached |             cached |           86.8s | 17.742s, four of five cached |       15.8s |

Build refs, in that order:

- `desktop-linux/desktop-linux/lsk3eve9sbydjn2scorz9ku06`
- `desktop-linux/desktop-linux/lri1zlwm5x1il58vbc79s2ksx`
- `desktop-linux/desktop-linux/ykmw7ydww5zqir2j9hd8j7ibu`
- `desktop-linux/desktop-linux/40h1z692pdjidooavobqmsrlq`

The latest Product install reports 972 resolved, 971 reused, zero downloaded,
972 added. It was spending minutes assembling a dependency tree even with package
bytes cached. Its context transfer was only 746.52 kB in 2.6s. This particular
build does not support blaming a huge source upload or package downloads alone.
Individual Docker COPY steps also took tens of seconds, including small-input
steps; those timings suggest filesystem/snapshot/contention investigation, not
proof that those source files themselves are large.

The latest Order history record `y4ncfnvddi3y8xuth8jmtxzmm` ended after about 35s,
before compilation, with both Node metadata steps CANCELED. The available log
does not establish why it was cancelled. Keep it separate from source/compiler
failures and from the completed Order baseline above. No build was launched,
cancelled, pruned or restarted by this audit.

Machine observation:

- Windows: about 15.8 GiB usable RAM, about 5.5 GiB free at inspection;
  i7-1065G7, four physical/eight logical cores.
- `%USERPROFILE%\.wslconfig`: memory=4GB, processors=2. Docker reports two CPUs
  and 4,111,769,600 bytes (about 3.83 GiB).
- WSL: 1,024 MiB swap used out of 1,024 MiB. Swap-in/out counters both increased
  between observations. Paging is confirmed; its share of elapsed build time is
  not measured. Roughly 1.5 GiB RAM was reclaimable/available in one sample.
- Sixteen application/infrastructure containers share the VM with builds.
  Prior Oct 5 evidence independently recorded an OOM-killed scanner child process.
- Logical app image sizes are about 738–861 MB. These are not additive disk
  usage: the common dependency/base layers are shared across image manifests.

## Findings and classification

### 1. Incomplete service build selection — confirmed defect

Rendered Compose gives an explicit BACKEND_BUILD_SERVICE to Product, Order,
Gateway and Media only. Auth, Blog, Realm Auth, Settings, Taxonomy, Tenant
Authority and User retain Dockerfile default `all`. Building one of those seven
image targets can still compile all eleven applications. The Oct 5 fix was useful
but was not generalized across the inventory.

Correct every target through the existing inventory. Retain an explicit full
backend operation; choosing one runtime must not implicitly mean full compilation.

### 2. Selected compilation still installs everything — confirmed defect

`docker/backend.Dockerfile:73` filters the install across the full backend,
independent of BACKEND_BUILD_SERVICE. Nine schemas are copied before install;
all nine Prisma postinstalls run, including for a database-free Gateway image.
The production dependency graph is also the union of all backend dependencies.

Separate the selected application/package closure from the full-backend graph.
Runtime service dependencies such as Order calling Product do not imply compiling
the Product application into Order's image: the shared protocol/client packages
are the build dependencies. Real runtime integration remains a separate proof.

### 3. Fetch cache keyed by every manifest — confirmed defect

Before `pnpm fetch`, the Dockerfile copies root package.json, all service
manifests and the Web manifest. Changing a script in an unrelated package or
adding a root demo command invalidates that expensive Docker layer even when
dependency versions have not changed. The install still needs appropriate
manifests; fetching package bytes has a narrower boundary.

pnpm documents fetch as lockfile/workspace driven and describes its virtual-store
output. Our later stages copy metadata, not the fetched node_modules tree, and
materialize their own dependency trees. Investigate reusing the fetched tree
appropriately, alongside the persistent download store; do not blindly copy a
development dependency tree into a production image.
[pnpm 10 fetch](https://pnpm.io/10.x/cli/fetch).

### 4. All application source copied before selected compilation — confirmed defect

The shared build stage copies all eleven application trees before its selected
RUN. An unrelated application's source edit invalidates that Docker compilation
layer, which then reruns preparatory commands. Service-specific Turbo filtering
alone cannot prevent Docker from entering that layer.

Use a pruned selected graph with separate dependency metadata and source inputs.
This is the exact invalidation problem described by the official guide for our
installed Turbo 2.5.8. One shared Dockerfile can still implement this.
[Turbo 2.5.8 Docker guide](https://github.com/vercel/turborepo/blob/v2.5.8/docs/site/content/docs/guides/tools/docker.mdx).

### 5. Repeated shared compilation bypasses cache — confirmed defect with an existing integrity constraint

Five packages are built unconditionally before Turbo: protos, grpc-auth,
migration-artifacts, config and clients. Turbo then includes the selected
package dependencies again. Cold graphs can compile the same package twice;
warm graphs still pay for all five unconditional builds. Order's dry graph needs
four shared packages, not migration-artifacts. The Gateway log spends about 69s
before its cached/dependent Turbo run begins.

Those explicit builds were added for a real pnpm injected-dependency problem:
restoring Turbo outputs skips the pnpm build-script synchronization hook.
Simply deleting them risks stale/missing injected package outputs. Model cached
generation/build plus synchronization before dependent compilation, and test
the cache-hit producer/cache-miss consumer case. Choose the narrow implementation
after a pinned-pnpm proof; do not invent an unsupported pnpm synchronization CLI.

`packages/protos/turbo.json` already caches generated/** and dist/** correctly;
preserve that. Prisma generation must likewise be an explicit selected-schema
prerequisite, with correct generated output restoration, rather than an accidental
side effect of reinstalling the entire backend.

### 6. Schema edits invalidate dependency installation — confirmed defect

All schemas precede the build dependency install. A schema-only change forces a
new install layer even though package versions are unchanged. Separate dependency
materialization from selected Prisma generation. Preserve required native third-
party install scripts, especially Sharp and Prisma; a blanket ignore-scripts
change without explicit replacement generation/native checks is not acceptable.

### 7. Build task inputs are broader than compiler inputs — confirmed defect

Host Turbo dry-run includes 44 Gateway test inputs, 22 Order test inputs and
27 Product test inputs in build hashes, even though their compiler configurations
exclude tests. Shared client/config/security tests also invalidate builds. Docker
already excludes many tests, so this is not an explanation for every image miss.
Local and Docker build hashes also differ because their file sets differ.

Use reviewed build-specific inputs; preserve test inputs for test tasks and
preserve every real compiler/generator/configuration input. Root package.json
and the lockfile have special global hash behavior; do not promise that deleting
duplicate globalDependencies entries makes them disappear from Turbo's hash.
[Pinned Turbo configuration](https://github.com/vercel/turborepo/blob/v2.5.8/docs/site/content/docs/reference/configuration.mdx).

### 8. VM capacity limits and paging — confirmed constraint; resource tuning optional

Two CPUs/4GB is a tight shared budget for this stack, filesystem caches and build
processes. A trial of four virtual CPUs and a 6GB cap is reasonable on the observed
16GB host, subject to actual Windows headroom during the trial. It is a candidate,
not a proven optimum. Keep compile concurrency at one initially; compare two
only after measuring peak RAM and paging. More swap alone is not a speed fix.

Changing WSL settings requires a controlled restart after builds finish/cancel;
do not interrupt work or change the machine automatically during analysis.
[Docker WSL guidance](https://docs.docker.com/desktop/features/wsl/best-practices/).

### 9. Shared production graph makes all images broad — optional packaging optimization

The common graph deliberately preserves a reusable external dependency layer and
correct injected workspace resolution. It also puts unrelated production package
bytes into images. A service-specific `pnpm deploy --prod` packaging pilot could
reduce this, as documented by pnpm, but is not automatically faster: it can repeat
dependency assembly and sacrifice shared-layer savings across eleven images.

A narrower first correction retains the current stable production layer while
fixing install/compile input scope. Replace it only after side-by-side timing and
runtime closure checks prove a benefit. Cost: runtime paths/entry points, workspace
injection, Prisma engines, proto source files, Media assets and native Sharp need
verification; image scan/SBOM and release import/export consumers need review.
No data migration is necessary. This optional replacement needs a separate
evidence-backed adoption decision, not a blanket rewrite.
[pnpm deploy](https://pnpm.io/10.x/cli/deploy).

### 10. Windows filesystem is a workflow consideration — optional optimization

The checkout is on D:, not a native WSL Linux filesystem. Docker recommends
Linux-hosted source for Linux bind-mount/watch workflows. Our measured context
transfer was already small/fast, and compilation occurs inside the Linux build
stage, so moving the checkout cannot be claimed to cure the measured install
cost by itself. A future Linux dev checkout needs its own Linux dependencies,
generated clients and editor/terminal paths; Windows node_modules must not be reused.
[Docker filesystem guidance](https://docs.docker.com/desktop/features/wsl/use-wsl/).

### 11. CI cache reuse is incomplete — future scaling consideration

`.github/workflows/ci.yml` caches the host pnpm download store through setup-node,
but has no explicit Turbo output cache or exported BuildKit layer cache. Quality
and live-e2e run on separate runners. Host dependency caching does not populate a
Docker builder's package mount or transfer compiled outputs to another job.
Add platform/toolchain-keyed CI caches after local correctness; no external
cache service or artifact upload was enabled in this audit.
[Docker cache guidance](https://docs.docker.com/build/cache/optimize/).

### 12. Docker documentation overstates current optimization — stale documentation

`docs/docker-configs.md` describes four shared builds while the Dockerfile invokes
five, and contains older ten/eight-service inventories. Its rationale for
injection/non-root/Debian/shared external layers is valid; the blanket assertion
that the current arrangement minimizes work is contradicted by current timings
and incomplete scoping. Update it with the final implemented design/results.
The Oct 5 report's 3m19s Media result remains valid historical evidence, not a
current clean or all-service performance guarantee.

## Recommended target workflow

### A. Fix image builds first

1. Add selected-service-set planning/timing to the existing inventory-backed
   runner; no per-service hand-maintained Dockerfiles. Scope all eleven targets.
2. Use pinned Turbo's `prune --docker` for a selected service or union of selected
   services. Local CLI confirms these options exist in 2.5.8; no tool upgrade or
   new-version future flags are required. Explicitly preserve root tsconfig,
   pnpm configuration/overrides, generator scripts and required runtime assets.
3. Fetch/install only appropriate inputs. Reuse package bytes and dependency
   layers without reinstalling for ordinary source/schema edits. Do not include
   unrelated app/Web manifests ahead of a service's expensive dependency steps.
4. Run generation/build once through the selected dependency graph. Solve
   injected-output synchronization before removing the five forced prebuilds.
5. For the pending Product/Order/Gateway set, compile its union once, then export
   those three runtime targets sequentially. The same producer inputs/arguments
   must be shared by those targets; merely invoking three different scoped ARG
   solves reproduces preparatory work. Single-service edits retain a leaf path.
6. Keep the current production dependency layer for the first benchmark. Test
   narrower deployment packaging separately if assembly/export still dominates.

Pruning is recommended because adding compiler filters alone has already proved
insufficient: it leaves fetch/install, schema generation and source invalidation
global. Maintenance cost is a selected-graph preparation path, generated-input
and runtime-closure tests, plus matching tooling/docs. Application contracts,
database schema/data, image tags/ports and release startup behavior need not change.

### B. Stop using image assembly as the edit/run loop

Add a selected-service watch workflow after the image pilot. Keep infrastructure
and unchanged services running; recompile/restart active code without repackaging
an image after every source edit. Use existing inventory/client/auth configuration,
not a parallel set of weaker dev contracts. A Linux dev runner with named dependency
volumes or a Linux host process are alternatives to prove before adoption.
The current dev orchestrator starts all configured services and generally uses
start rather than a selected watch loop; it is not yet this proposed workflow.

Cost: watch behavior for shared injected workspaces/generated files, host/container
port conflicts, downstream addressing and readiness require an integration proof.
Docker images/native live tests remain mandatory milestone and release gates.
This workflow change is optional and should not block the immediate image fixes.

### C. Tune capacity and CI after work is isolated

Trial WSL4CPU/6GB with bounded compilation, then add CI output/layer cache reuse.
Remote Turbo caching, compiler replacement, bundling, distroless/Alpine conversion,
Nx migration and splitting the universal protocol package are not prerequisites.
They remain separate measured decisions if a bottleneck remains.

## Exact implementation impact / check plan

| Area                        | Paths and required review                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image graph and inputs      | `docker/backend.Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-bake.hcl`; preserve release targets, pinned bases, runtime user and source exclusions                                                                                                                                   |
| Orchestration               | `scripts/backend.mjs`, `scripts/docker/build-backend.ps1`, root `package.json`; selected set/union, sequential export, timing, failure propagation                                                                                                                                                  |
| Generation and package sync | `turbo.json`, `packages/protos/turbo.json`, `packages/protos/scripts/generate.mjs`, `pnpm-workspace.yaml`, `.npmrc`, selected package build scripts/Prisma schema output locations; preserve frozen-lockfile/injection compatibility                                                                |
| Runtime closure             | `scripts/docker/verify-runtime-imports.mjs`, package entry points/files manifests, `apps/media-service/assets/`, generated Prisma engine paths, `packages/protos/*.proto`; no missing imports after warm restore                                                                                    |
| Focused consumers           | `scripts/backend.test.mjs`, `packages/grpc-auth/test/service-wiring.spec.ts`, `packages/config/test/env-validation.spec.ts`, `health-wiring.spec.ts`, `logging-wiring.spec.ts`, `http-policy-wiring.spec.ts`; replace only obsolete structural expectations with equivalent behavior/closure checks |
| Contracts and runtime       | Existing `test:preflight`, native Order/Product checks, D2 payment and F3 live proofs; unchanged messages/hashes remain unchanged                                                                                                                                                                   |
| CI/release                  | `.github/workflows/ci.yml`, `docker-compose.release.yml`, `deploy/README.md`, save/load scripts, image security scans; CI cache work optional later, existing image inventory preserved                                                                                                             |
| Docs                        | `docs/docker-configs.md`, `docs/architecture/local-dev-and-docker-boot.md`, `docs/current-focus.md`, this report; correct stale counts/rationale after implementation                                                                                                                               |
| Machine settings            | `%USERPROFILE%\.wslconfig`; optional separate restart window, no automatic edit                                                                                                                                                                                                                     |

Benchmark acceptance, using controlled inputs and the same hardware:

| Case                                               | Required behavior                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Identical warm rerun                               | No fetch/install/generation/compilation reruns; retain cached outputs                                                               |
| Leaf Order source edit                             | Existing dependencies reused; Order compilation only, shared cached outputs correctly available                                     |
| Unrelated Media source edit while building Order   | Order dependency and compile stages remain cached                                                                                   |
| Order schema-only edit                             | Regenerate Order client and rebuild actual consumers; do not reinstall/regenerate the other eight owners                            |
| Shared proto edit                                  | Rebuild real dependent closure, regenerate correct contracts, preserve exact Gateway signing/codec/preflight behavior               |
| Cache-hit shared producer + cache-miss application | Dependent compilation and final runtime load current restored shared outputs; never stale injected copies                           |
| Three-image batch                                  | Build the selected union once, then produce all three independently loadable/runnable images                                        |
| Isolated cold baseline                             | Record download/link/generation/compile/export separately; preserve existing useful caches rather than pruning them for a benchmark |

Record task execution/cache counts, phase times, image size/unique layer changes,
peak RAM/paging and runtime imports/readiness. Wall-clock targets are provisional:
the immediate acceptance criterion is eliminating unnecessary work, followed by
measured warm/cold timings. No new sub-three-minute or optimal-build claim is made.

## Combined environment, shared-package and service-isolation trace

Follow-up requested by Salar: examine these together, including CI/release,
instead of treating each as an independent possible cause. This remains an
inspection, not authorization for an optional architecture replacement.

### What depends on what

The installed Turbo dry-run for Order and Realm Auth reports:

```text
Order build
  -> clients build -> grpc-auth build -> protos build
                   -> protos build
  -> grpc-auth build
  -> protos build
  -> config build -> protos build

Realm Auth build
  -> migration-artifacts build
  -> config build -> protos build
```

Repeated references here describe dependency edges; Turbo can deduplicate the
same task. Product application compilation is absent from Order's graph.
Order's runtime calls to Product are a separate network dependency. Checkout
integration needs Product available, but building Order should not require
compiling Product's application or loading its runtime image.

Reviewed all eleven backend `apps/*/package.json` files: their workspace
dependencies name shared packages, not another application package. A static
scan of their production `src/**/*.ts` literal imports/requires, plus shared
package source and root TypeScript entry points, found no cross-application
implementation imports. This is source/declaration evidence, not a fresh image
filesystem inspection or proof covering computed dynamic module specifiers.

`tsconfig.base.json` resolves shared packages through compiled `dist` entries,
so shared build ordering is legitimate. `turbo.json`'s `^build` captures this
ordering. Removing it would hide required declaration/runtime dependencies.

### Environment ownership and cache effects

- **Existing mechanism satisfies build separation:** `.dockerignore` excludes
  `.env` and `.env.*`. Real environment files are absent from the observed Turbo
  task inputs; `turbo.json` does not declare them as global dependencies or
  configure global environment hashes. No evidence links root `.env` edits to
  the measured image installation cost. Compose can interpolate variables into
  build configuration, so this is a statement about the inspected setup, not a
  universal claim that environment variables can never affect builds.
- **Runtime mechanism:** Compose `env_file`/`environment` supply process settings;
  Order/Gateway `ConfigModule.forRoot` also supports app-local then root files
  for host execution. Changing a runtime-only value requires the affected
  container/process to receive new configuration; it does not inherently need
  TypeScript compilation or image assembly. Compose evaluates multiple env files
  in order, with later files overriding earlier ones.
  [Docker environment configuration](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/).
- **Confirmed configuration duplication, optional cleanup:** root `.env` has
  42 variable names; Gateway's local file has 22, of which 21 also occur at root.
  Most other service files have no overlapping names in this checkout. Counts
  were inspected without printing values. This is an ownership/precedence and
  maintenance concern; no failing value was established, and removing the root
  fallback or moving secrets is not required to fix build times.
- **Optional runtime isolation hardening:** several local Compose services load
  the whole root environment, including settings owned by other components.
  The shared endpoint anchor likewise provides every service address. Being
  given an address does not make that service a compilation dependency. Explicit
  per-service runtime inputs would clarify ownership and reduce needless
  configuration exposure; preserve existing validators, host/container address
  overrides and signing-key behavior if this is adopted separately.
- **Confirmed host hash overreach:** Order/Realm Auth dry-run includes tracked
  `.env.example`, although their compiler does not consume it. Docker excludes
  these templates already. Review build-task inputs while retaining template
  coverage for configuration tests. Do not put every runtime variable into
  `globalEnv`: that would create unnecessary global invalidation.

### Shared package coupling

- **Stale dependency declaration:** `packages/config/package.json` declares
  `@nebula/protos`, but no other configuration package source, test or authored
  TS/JSON/MJS file references it. The package exports environment validation,
  HTTP policy, health, logging and validation. The dry-run confirms the otherwise
  unnecessary `config -> protos` edge also pulls protocols into Realm Auth's
  build closure. Narrow correction: remove this unused declaration and regenerate
  the frozen lockfile/injected dependency graph, then prove config consumers and
  runtime imports. Do not remove actual protocol dependencies from clients/auth.
- **Existing broad package boundary, optional later refinement:**
  `packages/protos/index.ts` exports all nine contracts; `packages/clients/index.ts`
  exports wrappers across the backend. Their consumers share package build/cache
  boundaries, so a changed contract can invalidate many dependent tasks. This is
  different from importing another service's business implementation. Splitting
  into contract-specific packages/tasks may reduce fan-out, but changes generation,
  imports, packaging and compatibility. First correct selected graphs and caching;
  adopt a split only if subsequent measurements justify that maintenance cost.
  Subpath imports alone do not create separate Turbo package/task boundaries.
- **Confirmed Docker coupling:** all five shared packages are rebuilt before
  Turbo, all are copied into the common runtime layer, and dependency installation
  covers the backend union. The runtime copies solve real injected-package
  correctness and shared-layer reuse requirements. Preserve those properties
  while fixing unnecessary work, rather than deleting the synchronization overlay.

### Container independence and CI/release boundary

The Dockerfile's final targets copy their own service `dist`/Prisma assets and
inherit packaged shared libraries. They do not copy another application's `dist`
or mount another application's filesystem to load those libraries. Sharing an
image layer does not require another container to be present: each image manifest
includes its required layers. Independent deployment still means configuring the
service's required databases, queues and remote APIs; it cannot make Checkout
work without its Product dependency.
[Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/).

The repository has standard foundations already: a frozen lockfile, pinned
toolchain/base images, multi-stage/non-root runtimes, quality and live CI jobs,
image scans and an image-only release Compose path. `deploy/README.md` documents
manual save/load deployment. Calling all of this nonstandard would obscure the
specific defects. The missing optimization is coherent selected-service inputs
and cache/artifact reuse across these paths:

- `quality` compiles host sources; `live-e2e` starts on another runner, installs
  dependencies again and builds images through `backend:boot`.
- Current CI retains reports but does not transfer compiled build outputs or
  explicitly persist/export Turbo/BuildKit caches between those jobs. A pnpm
  download-store cache does not provide either of those caches.
- The normal image runner iterates all eleven targets; mixed `all` and leaf
  build arguments also prevent one consistent shared compilation result. Local
  selected builds, full integration and release export need an explicit shared
  plan, without removing the full-integration validation path.

CI cache persistence and tested-image promotion are future workflow improvements,
not a prerequisite to correcting the local confirmed scope defects. Any promotion
path must retain the identity of the actual tested images; cached host `dist`
alone does not certify a Linux runtime image. No CI deployment or upload was added.

### Follow-up consumer trace and acceptance

| Owner / relationship | Exact inspected consumers                                                                                                                                                                                                                                                                                                 | Disposition                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime environment  | `.dockerignore`, `turbo.json`, `docker-compose.yml`, `docker-compose.release.yml`, `.env` and eleven backend app-local `.env` files (names/counts only), `apps/order-service/src/app.module.ts`, `apps/gateway/src/app.module.ts`, `packages/config/src/env.validation.ts`, `packages/config/test/env-validation.spec.ts` | Preserve runtime/build separation; ownership cleanup optional; no values changed                                                            |
| Shared build edges   | Eleven backend `apps/*/package.json` files, `tsconfig.base.json`, `packages/config/package.json`, `packages/config/tsconfig.json`, `packages/config/src/index.ts`, remaining config source/tests, `packages/protos/index.ts`, `packages/clients/index.ts`, `packages/grpc-auth/package.json`, `pnpm-workspace.yaml`       | Remove proven unused config edge during implementation; preserve real ordering and injection; package splitting deferred pending benchmarks |
| Runtime packaging    | `docker/backend.Dockerfile`, `scripts/docker/verify-runtime-imports.mjs`, backend production source import scan, shared production source/entry-point import scan                                                                                                                                                         | No direct cross-app implementation dependency found in inspected paths; fresh isolated image closure proof remains pending                  |
| CI and deployment    | `.github/workflows/ci.yml`, `scripts/backend.mjs` build runner/CLI, `scripts/docker/build-backend.ps1`, `docker-bake.hcl`, `deploy/README.md`, `docs/architecture/local-dev-and-docker-boot.md`                                                                                                                           | Preserve quality/live/scans/release behavior; correct input scope first; explicit cache/promotion design later                              |

Additional pilot acceptance: runtime-only env edits need no image rebuild; Order
can compile/package without Product application outputs; loading/running its
image requires no sibling source tree; a genuine contract change rebuilds its
actual dependent closure. Outage tests must still fail or recover according to
the existing runtime contracts. All these implementation/runtime proofs remain
pending; the audit ran only static inspection and a roughly two-second Turbo
dry-run, not compilation or container changes.

## Current boundary

The audit itself changed only documentation. It ran read-only history/resource/config
inspection and Turbo dry-run/help, consulted official documentation, and started
no builds or broad suites. Detailed implementation must follow the repository's
mandatory dependency/test preparation gate and produce a pilot handoff receipt.
Heavy image benchmarks and Compose/native/live execution remain with Salar.
The prepared D2 payment code/SQL evidence remains intact; this report does not
close its pending native deployment gates.

# ASAP build and development cleanup

Started: 2026-10-24. Owner: current backend work, before the next D2 image cycle.
Evidence: [measured build audit](reports/2026-10-24-backend-build-audit.md).
Execution receipts: [cleanup execution](reports/2026-10-24-build-cleanup-execution.md).

Goal: independently build/package the selected service and its actual shared
dependencies, reuse correct outputs, and stop paying image assembly costs for
unrelated edits. Preserve the prepared D2 work and its pending native/live gates.
Use the mandatory [preparation checklist](testing/pre-suite-checklist.md) for each
slice. Agent owns preparation/focused checks; Salar owns long builds/live proofs.
No routine forced builds, cache pruning or container/database resets.

## 1. Selection and dependency correction - now

- [x] Set the correct application build selector for every Compose/Bake target,
      including the deferred operator Realm Auth profile using the same code.
- [x] Let the existing build runner and PowerShell wrapper select services;
      retain explicit full-inventory behavior, sequential export and stop-on-error.
      Add a no-build plan preview and elapsed timing.
- [x] Remove the unused config-to-protos dependency using pnpm-generated lockfile
      updates; check config and affected consumers before any build handoff.
- [x] Verify rendered Compose/Bake selection and focused tooling/dependency
      checks. This closes selection only; broad install/copy work remains below.

## 2. Shared build path with Product and Order acceptance - main performance fix

- [x] Implement one reusable selected-service graph, first preparing both Product
      and Order with pinned Turbo pruning; preserve
      required generator scripts, global TypeScript/pnpm settings and runtime assets.
- [x] Separate lockfile-based fetch, selected dependency install, selected Prisma
      generation and application source layers. No full-backend dev install or
      nine-client generation on the Product/Order graph path. Segment 3's accepted
      rollout now applies this graph selection to every target.
- [x] Cache shared generation/compilation once and synchronize restored outputs
      before dependent compilation. Prove cached producer + changed consumer;
      retain current signing/runtime import checks and native dependency checks.

Implementation/cheap-gate evidence:
[segment 2 receipt](reports/2026-10-24-build-cleanup-segment2.md).
Segment 2 acceptance is complete as of 2026-10-26. Product/Order select the
accepted `graph` path. Segment 3 now selects graph for all targets and shared
batch scopes; native and hosted acceptance is complete below.

After the output-ignore correction, the paired native builds pass: Product
198.2s and Order 240.4s. Each shared producer compiles once per graph; later
visits hit cache. Both current images pass offline/no-mount packaged-import
closure checks. Unchanged warm builds pass at Product 11.2s / Order 9.4s, with
install/generation/compilation layers cached. All ten native modified-input cases
pass: both baselines, owner source/schema edits, unrelated Media edits and shared
contract edits. The agent verified each raw log against the passing summary;
these cache-only solves do not export images or certify application readiness.
[Oct 26 evidence](reports/2026-10-26-build-graph-native-proof.md).

- [x] Complete bounded Product and Order image/native benchmarks after cheap gates pass:
      warm rerun, each owner's isolated source edit, unrelated Media edit, each
      owner's schema edit and shared-contract
      edit. Record dependency/generation/compile/export times and memory limits.
- [x] Verify packaged Product and Order need no sibling application output or checkout;
      distinguish required remote runtime APIs from build dependencies.

<a id="3-generalize-and-align-integrationrelease"></a>

## 3. Generalize and align integration/release - closed 2026-10-27

All-target graph and canonical batch-union native build/export and all eleven
offline packaged closures pass (2026-10-26). Unchanged warm full batch passes
at 111.1s (1m51.1s), all RUNs cached and app/config bytes unchanged.
[native rollout receipt](reports/2026-10-26-build-cleanup-segment3.md).
The gates below include native acceptance, not just a configuration change.
Final tested implementation `7035545` passes the complete hosted quality and
live-e2e jobs, native boot/migrations/seeds, populated metadata upgrade, F3/live
suites, all eleven image scans and the sixteen-image identity-preserving archive
round trip. Eleven tested backend identities are recorded. Actual host Turbo and
BuildKit cache transfers/restoration pass across fresh runners. Cached exports
take 101.5s; final OS-patched exports take 151.7s. These are image-build timings,
not total CI duration. Runtime/package isolation and all quality gates remain.

82 tooling tests and 125 test/helper inputs pass. Existing optional Media DB
suite skips remain eleven tests; image reports retain 57 unfixed Debian findings
per image under the existing F9 policy, with zero blockers. D2-specific pending
local deployment/feature proofs remain owned by D2; automatic image publishing
and server deployment were not implemented. Chronological intermediate failures
are preserved in the linked reports.
[Exit proof](reports/2026-10-27-build-cleanup-segment3-exit.md),
[CI receipt](reports/2026-10-26-build-cleanup-ci-cache.md).

- [x] Extend the proven graph to all targets and Product/Order/Gateway union
      compilation, followed by sequential exports using identical producer inputs.
- [x] Verify Gateway's database-free build and Media's native Sharp/assets path
      before declaring the shared workflow ready for all eleven services.
- [x] Retain the full integration path and image-only release behavior. Check
      load/save tooling, runtime closures, inventory and relevant D2/F3 proofs.
- [x] Add explicit CI Turbo/BuildKit cache persistence with bounded retention;
      preserve quality/security gates and identify the actual tested images.
- [x] Update build/run documentation and current-focus from measured results;
      do not claim completion or a three-minute target without proof.

<a id="4-separate-decisions-after-the-pilot"></a>

## 4. Runtime configuration and development decisions - active

Salar authorized starting this segment on 2026-10-27. Its review/measurement
steps are active; optional replacements still require verified benefit and
compatibility review. They are not new D2 release blockers.

- [x] Review runtime env ownership/override rules and duplicated Gateway values;
      propose explicit per-service inputs while preserving host/container behavior.
      All eleven local/release schemas and native/Compose precedence probes pass;
      runtime tuning leaves the build specification unchanged. Preserve current
      behavior and document exact ownership. Correct the confirmed two-input
      Authority release wiring gap; both missing-input negatives fail closed.
      A broader local input-map migration remains optional. [Review receipt](reports/2026-10-27-build-cleanup-segment4-env-review.md),
      [ownership contract](architecture/runtime-environment-ownership.md).
- [ ] Compare per-service production packaging against today's reusable dependency
      layer; adopt only with measured size/time and complete runtime-closure proof.
- [ ] Propose a selected-service watch/restart loop, preserving shared package
      refresh and integration/release image gates.
- [x] Apply the separately approved WSL CPU/RAM trial: seven CPUs, 13,761 MB
      configured / about 13.10GiB usable. Retain bounded compiler concurrency;
      later tuning still requires measured host headroom/paging. The separately
      approved 40GiB build-cache target keeps automatic cleanup enabled.
- [ ] Split universal contract/client packages only if remaining measured fan-out
      justifies generation/import/compatibility maintenance costs.

Existing real `.env` files stay outside Docker build inputs. No application API,
database schema, tenant/cloud activation or real payment integration is part of
this cleanup.

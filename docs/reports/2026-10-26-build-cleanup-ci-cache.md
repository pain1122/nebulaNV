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

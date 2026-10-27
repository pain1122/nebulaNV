# Backend boot health connection correction

Requirement: finish build-cleanup Segment 3 hosted runtime acceptance without
weakening readiness, seed, security or image checks. User-owned long local
execution and the pending local D2 deployment gate remain separate.

## Finding and trace before implementation

Classification: confirmed orchestration transport defect, not a broken image or
an Auth availability defect. Run 40464082570 on `0c4ef44` passes quality, vendor
cache load, all native migrations, eleven image builds and D1 showcase seeding.
Failure is `demo_seed_auth_login_request_failed` immediately after the synchronous
showcase subprocess returns. Failure artifact shows Auth, Blog and Gateway
running/healthy and their original published ports intact.

`requestBackendHealth` consumes JSON but leaves a pooled keep-alive connection.
`seedBackendDemo` invokes a synchronous subprocess, then immediately performs
its Auth mutation on the same origin. While the parent event loop is blocked,
the server may close an idle health socket before the parent processes that
closure. A subsequent mutation can select that stale connection.

Observed local reproduction with the actual exported helpers: independent
Node HTTP child, 5s server keep-alive, allow health socket to become idle, block
the parent for 6.5s as the synchronous showcase command does. The next login
fails with the same helper error. Initial single-probe and no-idle-turn trials
did not fail; idle pooled state is necessary. This is narrower evidence than
claiming every boot or every fetch has this problem.

| Exact owner / consumer inspected                                                                                                   | Planned disposition                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/backend.mjs` requestBackendHealth/checkBackendHealth/waitForHealth                                                        | Health requests explicitly close their short-lived connections so they cannot be reused after a blocking child. Keep response body/service/status validation. |
| `scripts/backend.mjs` provisionBackend/seedBackendDemo/requestDemoJson/runPnpm/run                                                 | Preserve migration/build/readiness/seed order and synchronous command ownership. Do not retry login or Blog writes after uncertain transport results.         |
| `scripts/backend.test.mjs` backend boot order/read-only health/demo seed cases                                                     | Retain all assertions; add real Node child HTTP regression crossing the idle timeout and require one login mutation plus matching Blog lookup.                |
| `.github/workflows/ci.yml` Provision live integration services                                                                     | Unchanged; rerun normal boot and retain every later integration/scan/archive gate.                                                                            |
| `apps/auth-service/src/main.ts`, `auth/auth.module.ts`, `auth/auth.controller.ts`, `apps/blog-service/src/blog/blog.controller.ts` | Unchanged: routes, bindings and authorization already exist; artifacts show healthy services. No direct-service security bypass or new public route.          |
| `docker-compose.yml`, `package.json` backend inventory, `.env.example`, `scripts/demo/gateway.mjs`                                 | Unchanged: published ports and service identities match; D1 Gateway seed already passes; do not rebuild configuration around a socket race.                   |
| Gateway/protobuf/OpenAPI/generated client/SQL/fixtures                                                                             | Unchanged: no application contract, serializer, database or fixture change. Earlier preflight and SQL evidence remains applicable.                            |
| `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`, `docs/reports/2026-10-26-build-cleanup-ci-cache.md`  | Record image-supply success, new confirmed blocker and actual hosted results; Segment 3 remains open.                                                         |

## Post-change handoff receipt

The impact table above was revisited; every planned action is implemented or
retained for its stated unchanged reason. Only health request headers changed.
No public contract, generator, fixture, mutation behavior, database or runtime
service configuration changed.

Format/syntax/lint: Prettier, Node syntax and diff checks pass. Scoped ESLint
uses explicit standard Node runtime globals because the root JS configuration
only declares them for TypeScript; no rule disabled or lint configuration changed.

Focused behavior: the pre-change reproduction fails with the same login helper
error once an idle pooled socket crosses its timeout. The identical reproduction
passes after the fix. The new real HTTP-child regression passes after a 6.5s
synchronous child, with exactly one login mutation, an existing Blog lookup and
the probe's connection-close header. All 82 tooling tests pass with CI=true and
GITHUB_ACTIONS=true, preserving prior seed/order/health/security assertions.

Actual SQL/image evidence: earlier run 40464082570 completes native deployment,
eleven image exports and showcase verification; this correction is not yet
accepted by hosted boot. Local five-infrastructure health evidence remains;
eleven applications were not started/recreated. No DB change needs another SQL
proof. Preflight remains applicable because application contracts are unchanged.

Source/image drift: scripts/backend.mjs is a shared Docker build input, so the
normal hosted graph build is needed. Fetch/install/schema inputs are unchanged;
preserve imported caches and do not force a local rebuild. Keep vendor supply,
quality, migrations, all readiness checks, F3/e2e, scans and archive assertions.

Known limitations: this is the reproduced socket race, not a universal network
retry policy. Hosted runtime/scan/archive acceptance and fresh-builder cache
restore remain pending. D2 feature acceptance remains separate.

Next broad proof: normal CI after the authorized main push, using the same
vendor cache and existing gates. No heavy local command is requested.
Readiness: READY FOR HOSTED BOOT/INTEGRATION PROOF; Segment 3 remains open.

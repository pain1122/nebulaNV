# Hosted live-test type preparation

Classification: stale test fixture types and a confirmed preparation coverage
gap. Run 40467611468 (`5edbabc`) passes full quality, boot, native metadata upgrade
and F3. The next gate fails before executing Auth live tests: V1 helpers use the
union S2SActorAssertion, whose V2 member intentionally has no role. Source build
type checks exclude tests. Preserve active V1 compatibility and later V2/V3
boundaries; no security protocol migration is needed.

## Trace and plan before editing

| Exact owner / consumer inspected                                                                                                        | Required disposition                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/auth-service/test/grpc/helpers.ts` mdS2S/mdAuth, `test/e2e/auth.http-grpc.flow.e2e.spec.ts` verifiedGatewayActor                  | Explicit existing S2SLegacyActorAssertion and S2SSignedContextV1 fixture types; retain all verified role/session, denied caller and forged-actor assertions.                                                    |
| `apps/auth-service/test/grpc/auth.e2e.spec.ts`, `test/grpc/user.e2e.spec.ts`                                                            | Keep callers and wire behavior; type-check through the corrected helper.                                                                                                                                        |
| `packages/grpc-auth/src/s2s-context.ts`, `packages/grpc-auth/index.ts`, `test/gateway-context.fixture.ts`                               | Unchanged: versions intentionally have different actor shapes; production types must not be weakened for legacy tests.                                                                                          |
| `scripts/backend.mjs` backendServices, owner manifests and tsconfig.json files                                                          | Read existing inventory and test:e2e owners. Current check-types uses source-only tsconfig.build.json; add no-emit test preparation covering every test/helper before expensive hosted provisioning.            |
| Auth/User test Jest configs; Settings/Media/Taxonomy/Product/Blog/Order jest.config.ts                                                  | Keep actual test selection/setup unchanged. Preparation reads each owning tsconfig and explicitly includes test files, overriding inherited test exclusions; no startup hooks run.                              |
| `apps/media-service/test/http-helper.unit.spec.ts`                                                                                      | Keep transport cause assertion under the existing ES2021 lib via Object.assign instead of unsupported ErrorOptions constructor typing.                                                                          |
| `apps/media-service/test/http/media.http.e2e.spec.ts` uploadPublicMedia and both render cases                                           | Give existing finalization helper its id response type and validate id before returning; retain ready/byte/visibility checks and owned cleanup.                                                                 |
| `apps/media-service/test/media-product-reference.unit.spec.ts` controller metadata test                                                 | Narrow the unknown handler at runtime before reflection; retain exact access metadata assertions.                                                                                                               |
| Other seven live owners' tests/helpers                                                                                                  | Full preparation audit includes all 125 test/helper inputs. Their shared fixture imports are intentional; a no-emit repository root accommodates these imports without changing emitted application boundaries. |
| `.github/workflows/ci.yml`, `scripts/backend.test.mjs` CI policy                                                                        | Add a quality test-type gate after shared source types exist, before suites/provisioning. Retain every existing gate and require placement in policy test.                                                      |
| `docs/testing/pre-suite-checklist.md`, `docs/current-focus.md`, `docs/ASAP-BUILD-CLEANUP.md`, `TODO-ALTERNATIVE.md`, CI evidence report | Record required cheap type preparation and actual hosted acceptance separately from unexecuted live tests/scans/archive.                                                                                        |
| Runtime DTOs/protos/OpenAPI/generated files/SQL/seed payloads/Docker scopes                                                             | Unchanged: confirmed failure is test compilation, not a runtime contract or image defect. No API migration or skip/assertion removal.                                                                           |

Initial diagnostic audit: Auth has two actual type errors; Media has six actual
test type errors. Six owners also import the shared test fixture outside an
application rootDir; the preparation checker must use repository root with
noEmit rather than mistake these intentional test imports for production output.
User is clean. Remaining owners have no diagnostics apart from that audit-root
configuration issue. Raw receipt: `.ci-evidence/build-ci-cache/live-test-type-audit.json`.

## Preparation receipt after correction

All listed consumers were revisited. The Auth fixture still sends V1 context
and requires its verified user/role/session; the shared union and production
guards are unchanged. Media assertions, denied cases and cleanup are retained.
The first preparation pass caught the new upload helper type omitting displayName
and path used by duplicate-name assertions; those consumers were inspected and
the type completed before any hosted handoff. No assertions were deleted.

`scripts/check-backend-test-types.mjs` derives eight live owners from the existing
backend inventory and their test:e2e scripts; it checks all 125 test/helper inputs
using each owner's settings, noEmit and no incremental writes. It overrides only
test exclusions/rootDir so real shared test imports remain covered. Missing input
sets and every diagnostic fail the check. Application build roots/output remain
unchanged. CI runs it after source types and before security/broad suites; live
continues to depend on that complete quality job. The CI policy test enforces
placement and invocation. No package/lockfile change is needed.

Checks: all eight owners / 125 inputs have zero type diagnostics. Tooling passes
82/82. Preflight passes all four suites / 23 tests with generation freshness.
Focused Media helper/metadata regressions pass two suites / 14 tests. Scoped
lint has zero errors (Auth 32 and Media 255 existing warnings remain visible),
and the new checker/tooling lint passes with standard Node globals supplied to
the existing root JS config. Format/syntax/diff checks pass. No local app startup,
SQL mutation or broad live suite was performed by this preparation.

Hosted evidence retained: 5edbabc passes quality, vendor input, native boot,
metadata populated upgrade and F3. Eleven images total 289.1s, with fresh-builder
GHA imports restoring fetch and production-dependency layers. The helper source
change invalidated compilation inputs, so this is not an unchanged warm timing.
The live suite then stopped on the typed fixture errors before executing its
tests. Image scans and the sixteen-image round trip remain unexecuted.

Next proof: the authorized normal main CI run, with the new no-emit gate before
provisioning and every live/security/archive assertion retained. These are test
and CI changes; Docker application source inputs did not change in this slice.
Preserve native caches; no forced local build or container restart is needed.
Readiness: READY FOR HOSTED LIVE/SCAN/ARCHIVE PROOF; Segment 3 remains open.

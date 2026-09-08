# F3 Exit Proof

Date: 2026-08-22

Closed: 2026-08-24

Status: complete. All four original F3 exit outcomes are verified.

This report maps the F3 exit claims to their executable owners. It does not
turn future partner credentials, application attestation, distributed rate
storage/tracing, or F4 persistence into F3 requirements.

## Findings Closed During The Exit Audit

| Finding                                                                               | Classification                        | Evidence and correction                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product list calls through the gateway returned HTTP 400.                             | Confirmed defect                      | The gateway adapter manufactured empty optional protobuf values (`categoryId` and `status`), which the product service correctly rejected as an invalid UUID and enum. The adapter now sends sparse list requests, and its unit test prevents the public lifecycle fields from returning. A direct source gateway call and the complete live client flow pass. |
| Root `api:gen` and `api:check` were documented but absent.                            | Stale implementation/documentation    | Thin root aliases now compose the existing gateway OpenAPI and external-client generators/checkers. No second generator was introduced.                                                                                                                                                                                                                        |
| The first temporary source-gateway logout returned 503.                               | Live-test harness prerequisite        | The local lazy Redis connection had not run readiness before the first idempotent operation. The bounded live owner now requires `/health/ready` before client flows. Runtime readiness already performs the same connection check.                                                                                                                            |
| Local source scan initially could not start.                                          | Environment/tooling prerequisite      | Trivy 0.74.0 was installed. The unreachable Google mirror caused a recoverable checks-bundle fallback; the source scan completed with embedded checks and reported zero secrets and zero misconfigurations.                                                                                                                                                    |
| Auth session references could randomly violate the signed-context identifier grammar. | Confirmed defect                      | The old raw base64url HMAC could begin with `-` or `_`, while accepted identifiers must begin alphanumerically. The shared `deriveS2SSessionRef` owner now emits an `sr1_`-prefixed HMAC reference; shared security and Auth validation tests pass.                                                                                                            |
| Auth, Media, Order, and Product live fixtures retained pre-F3 assumptions.            | Stale implementation or documentation | Auth protected RPC fixtures now attach an actor derived through live `ValidateToken`; Media expects the documented affected-folder count; Order/Product explicitly create `ACTIVE` products before public reads or purchase. Focused regressions and the complete 284-test service e2e lane pass.                                                              |
| The first rebuilt-image scan found two fixable Node dependencies in every image.      | Confirmed defect                      | The shared pnpm image layer retained `deepmerge-ts 7.1.5` and `js-yaml 5.2.1`. Narrow owner-scoped overrides select patched 8.0.2 and 5.2.3. Prisma generation, gateway contracts, all nine rebuilds, and the second image scan pass without an advisory waiver.                                                                                               |
| Default Trivy database mirror access was unreliable.                                  | Environment/tooling prerequisite      | The inventory-backed image command now tries the official Docker Hub database distribution followed by GHCR. All nine reports were produced; scanner failure remains blocking.                                                                                                                                                                                 |

## Exit Outcome Matrix

| F3 outcome                                                 | Executable proof                                                                                                                                                                                                                                                                                                          | Current result                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| External consumers use one API authority.                  | `packages/api-client/test/client.test.mjs`, browser and React Native compile consumers, `apps/web/test/*`, and a static web/API-client scan for internal service URL keys and ports.                                                                                                                                      | Passed. Consumers configure one gateway base URL. Gateway-issued presigned storage/CDN URLs remain an explicit data-plane exception.                                                                                                                                                                                     |
| Release clients cannot reach internal control-plane ports. | `scripts/backend.test.mjs` plus `pnpm evidence:compose:backend` inspect rendered local and release Compose.                                                                                                                                                                                                               | Passed. Release publishes gateway `3002` and the selected MinIO data port `9000`; backend HTTP/gRPC, PostgreSQL, Redis, and MinIO console `9001` remain private. Local diagnostic ports remain published.                                                                                                                |
| Ordinary clients cannot author signed authority.           | `apps/gateway/test/http-bootstrap.spec.ts`, `trusted-request.spec.ts`, `auth-http.spec.ts`; `packages/grpc-auth/test/actor-context.security.spec.ts`, `s2s-context.security.spec.ts`, `s2s-propagation.security.spec.ts`, `s2s.guard.security.spec.ts`, and replay tests; `packages/clients/test/signing-policy.spec.ts`. | Passed. Raw/duplicate authority headers, altered bearer/actor state, mismatched origin/host identity, replays, and unsafe IDs fail closed. Nested calls preserve the causal request ID but receive fresh nonce/signature proof. Public client IDs remain copyable classification values, not authentication credentials. |
| Typed clients and documentation match runtime behavior.    | Gateway 41-suite contract lane, deterministic OpenAPI and client stale checks, external-client lint/type/runtime/browser/native checks, documentation audit, and the bounded live flow.                                                                                                                                   | Passed. The final health/live proof ran after all nine containers were recreated from the scanned image IDs.                                                                                                                                                                                                             |

## Live Client Profiles

`pnpm test:f3:live` is the bounded owner. It refuses production and prints no
credentials or tokens. Against the recreated, scanned gateway image it proved:

- gateway readiness;
- anonymous storefront product access;
- authenticated storefront login/profile/browser logout;
- authorized admin login/user-list/browser logout;
- registered mobile login/profile/token-body logout;
- disabled partner execution.

## Passing Source And Contract Gates

- `pnpm test:gateway:backend`: 41 suites, 172 tests, OpenAPI check.
- `pnpm test:shared:backend`: config 76 tests, grpc-auth 119 tests, clients 12 tests.
- `pnpm test:web:current`: 6 suites, 15 tests.
- `node --test scripts/backend.test.mjs`: 37 tests.
- `pnpm test:external-client`: stale checks, lint, types, five runtime tests,
  browser compilation, and React Native compilation.
- `pnpm proto:check` and `pnpm api:check`.
- `pnpm test:security`: grpc-auth 119, Auth 26, Media 30, Order 11 tests.
- `pnpm lint:backend`, `pnpm check-types:backend`, and `pnpm build:backend`.
- `pnpm evidence:compose:backend`.
- `pnpm test:e2e`: 284 tests across the participating service suites.
- `pnpm scan:dependencies:backend`: zero backend runtime/tooling findings and
  33 deferred web findings.
- `pnpm scan:source:backend`: zero secrets and zero misconfigurations.
- `pnpm scan:images:backend`: all nine images passed with zero blocking
  findings. It retained 288 visible Debian findings without an available fix
  for F9 production hardening.
- `pnpm backend:health`: all nine recreated runtimes reported `ok`.
- `pnpm test:f3:live` against the recreated gateway image on port `3002`.

Existing lint warnings remain non-blocking baseline warnings; this lane added no
lint errors.

## Closure Decision

The rebuilt tags were verified against the running container image IDs before
the final health/live run. Generated artifacts remained current, the complete
diff has no whitespace error, and the release exposure proof still matches the
route/client documentation. The four `TODO.md` F3 exit outcomes and both final
Batch 8 checklist items are therefore checked.

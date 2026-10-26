# D2 Batch 3 status controls

2026-10-19. Status controls implemented; local preparation and new owned SQL
proof passed. Existing longer Checkout compatibility proofs, application
deployment and native/image/live integration remain pending. Stock/payment
effects are the next Batch 3 slice. Images remain unchanged.

Confirmed gap: enum-only admin writes bypass prior state, concurrency, owner
replay and audit. Existing roles, signed context, snapshot mapping, Checkout
receipt replay and completed-attempt filtering work and will be preserved.

## Pinned scope and transition table

| Current                       | Target                                                   | Authority/effect in this slice                                                                                              |
| ----------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PENDING                       | PAID                                                     | Verified admin/root-admin, DEMO_NO_PAYMENT manual demo marker; never provider settlement. Version/key required.             |
| PAID                          | FULFILLED                                                | Same verified admin contract; version/key required.                                                                         |
| Any                           | Same status or any other manual edge                     | Conflict; no audit/version/effect. Same successful key/intent instead returns its original response.                        |
| PENDING or PAYMENT_PROCESSING | CANCELLED                                                | Requires the next Product-owned restoration/recovery slice; this generic operation rejects until connected.                 |
| Any                           | PAYMENT_PROCESSING, or processing result to PENDING/PAID | Requires a bound demo payment attempt; generic patch rejects. Approved uncertain/failure/retry policy remains Batch 3 work. |

No paid refund, terminal reopening, provider integration or unbacked status
scaffold is introduced. Existing legacy enum values remain readable.

Order gains version default 1 and one status-change table combining durable
successful-key replay with audit facts: previous/new status, versions, verified
actor/role, request correlation, time and original explicit reply. Uniqueness is
actor/key across target Orders; exact intent also binds target/status/version
and verified role. Same-key locking precedes replay lookup; conditional owner
update plus audit creation commit in one short local transaction. No remote
calls or success/no-op records. Retained successful replay bodies are bounded
by the existing snapshot size limit and number of permitted status changes.

New reads/replies carry version. Historical Checkout receipt JSON lacking it
must replay without adding a field or inventing version 1; current admin reads
provide the mutation token. New receipt replay preserves its originally saved
version even after later changes. Required expectedVersion is appended to native
and Gateway DTOs and optional protobuf fields to preserve field presence. Key
travels in HTTP header/signed RPC body. Actor authority comes only from guards'
verified native/signed context; no request actor fields are added.

## Exact dependency trace and decisions

| Owner/change           | Exact consumers                                                                                                                                                                                                                                                                                                            | Action                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version/audit schema   | `apps/order-service/prisma/schema.prisma`, new `prisma/migrations/20261019000100_order_status_controls/migration.sql`, generated Prisma client                                                                                                                                                                             | Add current version and atomic replay/audit row with exact constraints, regenerate. No applied migration rewrite.                                                                                                                                                                                                                                                               |
| Command execution      | `apps/order-service/src/order/order.service.ts`, new `order-status.ts`; `order.controller.ts`, `grpc/order-grpc.controller.ts`, `dto/order.dto.ts`                                                                                                                                                                         | Owner validates version/key/actor/transition; preserve missing/unfinished target semantics; native/RPC verified context and keys.                                                                                                                                                                                                                                               |
| Snapshot/Checkout      | `src/order/checkout-contract.ts`, `checkout-receipt.ts`, `checkout-coordinator.ts`, `checkout-receipt-retention.ts`; `test/utils/order.fixture.ts`, `checkout.fixture.ts`, `checkout-attempt.fixture.ts`, `checkout.unit.spec.ts`                                                                                          | Version from current row; optional original version on old replay. Inspect commit/replay callers and keep immutable response/retention semantics; add legacy/version codec regression.                                                                                                                                                                                          |
| Wire/signing           | `packages/protos/order.proto`, `packages/protos/generated/order.ts`, `packages/clients/src/order.client.ts`, `src/dormant-v3.client.ts`, `test/service-wrappers.spec.ts`, `test/dormant-v3-wrappers.spec.ts`                                                                                                               | Append optional Order version/command expectedVersion plus key. Existing typed wrappers/signatures use generated types; regenerate/build, verify signing includes new command fields. Dormant status remains guarded and requires the same command inputs; no activation/new receiver.                                                                                          |
| Gateway                | `apps/gateway/src/order/order-api.dto.ts`, `gateway-order-api.service.ts`, `gateway-order.controller.ts`, `contracts/inputs/order.inputs.ts`, `contracts/routes/order.routes.ts`                                                                                                                                           | Required expectedVersion body, header forwarding, explicit response version; admin reads require current version, old Checkout replies may omit it. Routes unchanged; input profile requires version.                                                                                                                                                                           |
| Owner tests            | `apps/order-service/test/order.http-validation.unit.spec.ts`, `order.error-translation.unit.spec.ts`, `resource-authorization.spec.ts`, `order-admin-read.unit.spec.ts`, new `order-status.unit.spec.ts`, `jest.unit.config.ts`, `test/http/order.http.e2e.spec.ts`, `test/grpc/order.e2e.spec.ts`, `test/grpc/helpers.ts` | Update all real command callers, valid fixture controls, missing target, actor denial, stale/invalid transitions, replay/audit/rollback and wire-presence assertions. Existing helpers sign generated definitions and need no transport replacement.                                                                                                                            |
| Gateway/SDK tests      | `apps/gateway/test/order-http.spec.ts`, `gateway-order-api.service.spec.ts`, `contracts/inputs/order.inputs.spec.ts`, `openapi-contract.spec.ts`, `r5-v3-receiver-inventory.spec.ts`; `packages/api-client/test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts`                                        | Keep counts (79/48/65/59/six deferrals), update only reviewed Order source pin; required version docs/typed callers and signed body/old replay absence tests.                                                                                                                                                                                                                   |
| Public artifacts       | `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`                                                                                                                                                                                                                                      | Existing generators; freshness/preflight before broad handoff.                                                                                                                                                                                                                                                                                                                  |
| SQL proofs             | `scripts/db/verify-d2-checkout.mjs`, `verify-d2-cart.mjs`, `verify-d2-coordination.mjs`, `verify-d2-order-reads.mjs`, new `verify-d2-order-status.mjs`, root `package.json`                                                                                                                                                | Existing current-runtime tails already apply all newer migrations. Coordination's direct status writes must adopt actor/key/version; replace unbacked processing probe with valid manual paid/replay. New owned proof covers populated preservation, injected rollback, real constraints, races, audit rollback, restart/cache-loss replay and old/new Checkout reply versions. |
| Live callers           | `packages/api-client/test/d2-checkout-live.mjs`, `d2-checkout-recovery.mjs`, `d2-checkout-recovery.test.mjs`, `d2-cart-live.mjs`, `f3-live-flows.mjs`, root/package command scripts                                                                                                                                        | Replace vocabulary-only processing/back-to-pending writes with required version/key valid transition and forbidden-processing proof. Existing recovery tests/helpers do not write status directly; preserve cleanup and receipt equality.                                                                                                                                       |
| Demo/Product/retention | `scripts/demo/runner.mjs`, `demo.test.mjs`, `apps/order-service/prisma/seed.ts`, Product stock service/schema/controllers, Order Checkout recovery/retention                                                                                                                                                               | Inspected. No status writer in D1 template; no Product/hold/finalized behavior changes here. Approved cancellation/payment effects explicitly pending next Batch 3 slice.                                                                                                                                                                                                       |
| Build/docs             | `docker/backend.Dockerfile`, `docker-compose.yml`, `docker-bake.hcl`, `scripts/backend.mjs`, `backend.test.mjs`, `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, Order/Gateway/API-client service docs                                                                                                                     | Existing scoped pinned migration/build lane covers new artifacts. No whole-stack/forced build; group expensive work after compatible effects are prepared. Update focus/receipt with actual results.                                                                                                                                                                            |

Applicable gate: inspect working/staged changes and new files, regenerate Prisma
and proto/SDK, scoped format/lint/types and focused real codecs/validators,
PostgreSQL populated/rollback/race controls, then preflight and final consumer
review. Broad/native/image/live remains pending and operator-owned. No passing
evidence is claimed by this before-edit checkpoint.

## Post-change impact review and observed results

The table above was recorded before edits. This section revisits every group.
The pre-existing dirty worktree had 251 status entries and no staged diff;
the entire tracked diff must not be attributed to this slice.

| Consumer group                                               | Final result or explicit unchanged/deferred reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order schema/migration/generated Prisma                      | Version defaults/backfills to 1 with a positive check; `OrderStatusChange` combines verified audit and successful owner replay. Actor/key and Order/version uniqueness, hashes, transition facts and exact response identity/version are constrained. New migration only; legacy facts/receipts preserved and no invented prior audit. Prisma generation passed. Shared application DB deployment not run.                                                                                                                                                                                                                                                                       |
| Owner command and transports                                 | New `order-status.ts`, `order.service.ts`, native controller/DTO and RPC controller updated. Key validation and actor/role checks precede DB. Verified actor/context is passed independently of body fields. Conditional version/status write plus audit/replay body commit together. Same-key lookup is actor-scoped and precedes current-row lookup. Current manual edges are pinned above; no unbacked cancellation/processing success.                                                                                                                                                                                                                                       |
| Snapshot and Checkout callers                                | `checkout-contract.ts`, `checkout-receipt.ts`, `test/utils/order.fixture.ts` updated. Existing explicit snapshot parser is shared for saved status replies. Original absent version remains absent; present original version is preserved. Checkout coordinator, attempt/Cart fixtures, recovery and retention need no semantic rewrite: new rows adopt schema default, immutable replies use the explicit serializer/parser, compaction semantics unchanged. All relevant unit cases pass.                                                                                                                                                                                      |
| Wire and signed wrappers                                     | Three appended fields: optional Order.version=17, optional command.expectedVersion=3 and command.idempotencyKey=4. No prior field/signature changed. Proto build/generation, shared-client build and isolated freshness pass. Actual generated and defaults:false receiver codecs preserve absent/zero distinction. Gateway status unit verifies signed version/key body. Signed/dormant wrapper suites pass 19 tests; existing dormant status requires the same inputs without activation.                                                                                                                                                                                      |
| Gateway/SDK artifacts and inventories                        | DTO/profile require expectedVersion; controller passes the complete validated command, service forwards header key and checks returned status/version. Current admin reads require version, Checkout history can omit it. `api:gen` and preflight freshness pass. Counts remain 79 routes / 48 profiles / 65 protected Gateway RPCs / 59 preserved R5 receivers / six named paused-F4 deferrals. Only the reviewed Order proto hash changed.                                                                                                                                                                                                                                     |
| Owner and Gateway focused checks                             | Unit-only Order config has no native startup hook: 10 suites / 144 tests passed, including Checkout/coordinator/recovery/Cart and new version/replay/audit cases. Gateway Order HTTP/service/input suites: 34 tests passed. Strict actor-field denial, invalid version/key, missing/unfinished/stale target and old reply absence assertions retained. Native fixtures explicitly compiled, but their live HTTP/RPC execution is pending.                                                                                                                                                                                                                                        |
| OpenAPI and typed SDK consumers                              | OpenAPI required command version and optional historical reply version are asserted. Existing Node tests and both browser/React Native compiler fixtures pass: 37 Node tests. Existing recovery assertions unchanged. Generated DTO declarations and typed status examples now require expectedVersion. `pnpm test:preflight`: 22 tests passed.                                                                                                                                                                                                                                                                                                                                  |
| New `scripts/db/verify-d2-order-status.mjs` and root command | Actual PostgreSQL/Prisma proof passed: pre-version populated rows/receipt preservation; exact first-error injected transactional upgrade rollback; version backfill; same-key race with one audit; different-key conditional race with one winner; actor/target/intent scope; forced audit-insert failure rolling back status/version; new-service-instance replay after later status change; historical Checkout version absence; forbidden and unfinished/missing target denial; exact SQLSTATE/constraint negatives after valid controls. One guarded disposable database was removed. Direct psql migration evidence is distinct from native Prisma deploy/history evidence. |
| Existing owner SQL proof scripts                             | `verify-d2-coordination.mjs` has both direct status calls updated to verified actor/key/version. The former processing-only vocabulary probe now performs supported manual PAID and preserves original PENDING Checkout replay. Its migration tail already applies current schema. `verify-d2-checkout.mjs`, `verify-d2-cart.mjs`, `verify-d2-order-reads.mjs` also apply their historical/current tails correctly and need no field-list rewrite. Longer Checkout/coordination reruns are the named operator-owned handoff, explicitly pending.                                                                                                                                 |
| D1 SQL fixtures/tooling                                      | Additionally inspected `scripts/db/d1-order-upgrade-fixture.sql`, `verify-d1-order-upgrade.sql`: named columns and current valid controls remain valid before/after a defaulted version field; their targeted currency assertions require no change. `scripts/backend.mjs`/`backend.test.mjs` enumerate migrations dynamically and retain the pinned database commands; no new backend dispatcher/build change is required.                                                                                                                                                                                                                                                      |
| Live/Demo/other consumers                                    | `d2-checkout-live.mjs` gets current admin version, valid PAID write, keyed replay, stale/processing denials, current customer read and original immutable Checkout replay. Both normal and recovery modes now require this new deployment; syntax/lint pass, runtime pending. Recovery helper/tests, Cart/F3 flows and D1 demo runner have no direct status writes; preserve existing cleanup and assertions. Order seed currently seeds nothing. Batch 4 owns reusable ecommerce fixtures.                                                                                                                                                                                      |
| Product/deferred behavior                                    | Product stock primitives/schema/controllers are unchanged; approved unpaid cancellation restoration and backed demo attempts remain Batch 3 work. No HELD compensation relabelled, no paid refunds or provider settlement added. Generic unsupported edges reject explicitly.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Build/docs                                                   | Existing scoped cached Order/Gateway build paths and migration commands cover these changes; no current image was rebuilt and no shared DB migrated. Current-focus, adopted TODO, Order/Gateway/API-client docs updated. Combined transition/effect and exit gates remain unchecked.                                                                                                                                                                                                                                                                                                                                                                                             |

Reviewed proto pin: removing only the three appended fields reproduces the
read-slice normalized hash
`baab329db8a8388b5e69955a48baeeb7eb748f291a5f9ca9132a0f0b9d5a8490`.
The new pin is
`838b56833d4d50953ffaf61c6596668bc6c1df181c41925edbec8664b840c5de`.
No other source pin, uniqueness/role assertion or receiver coverage was relaxed.

Preparation caught and corrected the input-profile assertion's sorted field
order and the injected SQL fault fixture's JavaScript replacement-string `$$`
handling (now a callback). Exact first-error assertions exposed the latter;
no unexpected SQL failure was accepted as a valid rollback test. Typed mock/lint
issues were corrected without disabling rules. Existing any-typing warnings in
older test code remain visible.

Final scoped native fixture lint also passed with no errors: gRPC fixture 52
warnings and HTTP fixture 51 warnings, matching the 103 previously recorded
any-typing warnings. New status source/tests have no lint errors; the new status
test warning was corrected rather than added to the baseline.

## Handoff receipt

```text
Requirement/finding: replace unrestricted enum patches with versioned, replayable,
  audited manual demo transitions; preserve working actor/Checkout mechanisms.
Changed files/consumer impact: exact before-edit map and final review above.
Format/syntax/lint/types: changed files formatted; diff --check passes (line-ending
  advisories only); scoped lint has no errors. Five earlier any-typing warnings
  remain in resource/error-translation tests. Native fixture warning totals are
  recorded separately; source and selected native HTTP/RPC fixtures typecheck.
  All four affected owner/client check-types pass.
Focused checks: Order unit-only 144; Gateway Order 34; signed/dormant wrappers 19;
  SDK/recovery 37 plus both platform compiler fixtures; preflight 22 passed.
  After type-only/lint fixture corrections, affected status/Checkout/error suites
  reran: 65 passed. Proto/OpenAPI/SDK generation, builds/freshness passed.
SQL evidence: db:verify:d2:status passed actual populated/rollback/constraint/race/
  replay/audit atomicity checks and removed its disposable DB. PostgreSQL accepts
  connections. Native Prisma migrate-deploy/history/rerun is NOT claimed.
Source/image drift: Order migration plus Order/Gateway source/contracts changed;
  current containers remain on previous images/schema. No image rebuild yet.
Known deferrals: cancellation restoration and demo payment-attempt effects,
  application migration, native/image/live proof, Batch 4 fixture/parity and D2/B0 exit.
Next broad commands: pnpm db:verify:d2:checkout; pnpm db:verify:d2:coordination.
  These exercise longer existing actual-DB Checkout/recovery compatibility with
  current schema/serializer and the corrected direct status callers. Both use
  owned disposable databases and preserve shared demo data. Expected: proof labels
  all ok and cleanup of one Checkout DB / two coordination DBs respectively.
Readiness: READY FOR NAMED CHECKOUT/COORDINATION DATABASE PROOFS.
  Operator-owned results pending. Group application migration/image/native/live
  work with the following compatible stock/payment slice.
```

## Operator checkpoint

Salar reports `db:verify:d2:checkout` and `db:verify:d2:coordination` completed
without errors after the handoff. No detailed counts/output were supplied;
recorded as operator-reported passes, distinct from the local proof above.
Proceed to the Product restoration slice. Shared deployment/image/live and
remaining Batch 3 cancellation/payment integration are still pending.

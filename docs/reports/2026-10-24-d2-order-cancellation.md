# D2 unpaid Order cancellation and recovery

2026-10-24. Source and focused preparation complete. Salar reports cancellation
and status SQL proofs finished successfully; shared migration/image/native
proofs remain pending. Initial trace below was recorded
before implementation.

Confirmed gap: the existing versioned/audited admin status command permits only
manual demo PAID/FULFILLED; Product's separately tested private restoration is
not bound to an Order command. Approved scope is explicit unpaid demo cancellation
with exactly-once restoration. No paid refund, fulfilled reversal or real payment
provider. Backed demo payment attempts remain the next distinct Batch 3 slice.

Keep the existing admin status route and request shape. Persist one cancellation
intent per Order, storing verified actor/key/version and the completed Checkout's
original Product intent/hash. Missing historical stock identity conflicts; do
not infer quantities or silently cancel older unprovable Orders. Serialize setup
against all status changes using the Order row lock. While restoration is
unresolved the Order stays PENDING, competing status commands are denied and no
successful cancellation reply is returned. Call Product outside the transaction;
commit CANCELLED, version increment, original audit/reply and cancellation
completion atomically only after a matching RESTORED response. Bounded leases
and delayed retries recover ambiguous calls/worker interruption through Product's
existing replay receipt. Deterministic missing stock targets remain pending for
reconciliation; no guessed refund, automatic replacement or early success.

| Owner/symbol                   | Exact affected consumers inspected                                                                                                                                                                                                                                                                                                                     | Action / reason                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cancellation persistence       | `apps/order-service/prisma/schema.prisma`, new `prisma/migrations/20261024000100_order_cancellation/migration.sql`, generated Prisma                                                                                                                                                                                                                   | Add private intent with Order/Checkout FKs, actor/key uniqueness, retry/lease/completion state. Preserve populated Order/receipt facts and prove constraints/rollback with real SQL.                                                                                                                                                                                                 |
| Status serialization/replay    | `src/order/order-status.ts`, `order.service.ts`, new `order-cancellation.ts`, `test/order-status.unit.spec.ts`, `test/order.error-translation.unit.spec.ts`                                                                                                                                                                                            | Reuse verified actor/key validation and completed status receipt; guard manual changes against an unresolved cancellation; same actor/key namespace and row lock. New coordinator for cancellation only.                                                                                                                                                                             |
| Signed downstream / transports | `src/order/grpc/order-grpc.controller.ts`, `order.controller.ts`, `test/resource-authorization.spec.ts`, `packages/clients/src/product.client.ts`, Product stock controller                                                                                                                                                                            | Preserve route/RPC/DTO. Forward existing verified downstream context for new Product restore call; native/background uses existing service signing. Private Product caller/response unchanged.                                                                                                                                                                                       |
| Recovery scheduler             | `src/order/checkout-recovery.ts`, `order.module.ts`, `test/checkout-recovery.unit.spec.ts`, `test/utils/checkout.fixture.ts`, `test/checkout-coordinator.unit.spec.ts`                                                                                                                                                                                 | Reuse scheduler but give cancellation its own bounded pass and independent error handling; don't alter existing Checkout recovery calls or require fake cancellation models in Checkout fixtures.                                                                                                                                                                                    |
| Focused tests                  | new `test/order-cancellation.unit.spec.ts`, `jest.unit.config.ts`, existing `jest.config.ts`, native `test/http/order.http.e2e.spec.ts`, `test/grpc/order.e2e.spec.ts`                                                                                                                                                                                 | Existing unit config has explicit match list and no native startup; add new suite. Preserve manual transition native fixtures; those do not invoke new cancellation. Update affected mocks and context assertion.                                                                                                                                                                    |
| Actual SQL proofs              | new `scripts/db/verify-d2-order-cancellation.mjs`, `verify-d2-order-status.mjs`, `verify-d2-order-reads.mjs`, `verify-d2-coordination.mjs`, `verify-d2-checkout.mjs`, root `package.json`                                                                                                                                                              | Add owned Order DB proof with clearly stubbed Product port for ambiguous-response/audit-failure recovery; existing current migration loaders include new table, pinned fixture baselines stay pinned. Product SQL proof already establishes actual stock atomicity separately. Native cross-service proof remains pending.                                                           |
| Public/generated compatibility | `packages/protos/order.proto`, `packages/clients/src/order.client.ts`, Gateway `src/order/`, `src/contracts/routes/order.routes.ts`, `src/contracts/inputs/order.inputs.ts`, `test/order-http.spec.ts`, `test/gateway-order-api.service.spec.ts`, `test/r5-v3-receiver-inventory.spec.ts`, API-client generated source and `test/d2-checkout-live.mjs` | No new public fields/RPC/routes/count/hash changes. Existing status validation already accepts CANCELLED and validates successful expectedVersion+1. Preflight required because affected RPC receiver/context and signed Product consumer change. Existing manual PAID/processing-denial live proof remains valid; new cancellation live integration deferred to grouped deployment. |
| Seeds/build/docs               | `scripts/demo/runner.mjs`, `docker/backend.Dockerfile`, `docker-compose.yml`, `docs/services/order-service.md`, `docs/current-focus.md`, `TODO-ALTERNATIVE.md`                                                                                                                                                                                         | No new demo profile/build configuration. Existing app-scoped image build covers new source/schema. Record runtime deployment pending and update actual feature limits after proof.                                                                                                                                                                                                   |

Working tree: 260 status entries, no staged diff. Preserve prior work. Salar's
supplied original-stock proof and ten configured health checks pass. No application
migrations/builds requested until preparation receipt; broad/long execution stays
with Salar. Public/native cancellation is not yet deployed.

## Post-change review and observed checks

| Traced area                   | Final disposition / result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema and migration          | Added `OrderCancellation`, restrictive Order/Checkout FKs, unique order/attempt/actor-key ownership and hash/role/version/lease constraints. No existing migration was rewritten. Prisma generation, formatting and schema validation pass. Application schema was not migrated.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Status and coordinator        | Reused actor/key normalization, transaction error mapping and immutable status reply validation. Both status setup paths take the Order row lock; unresolved cancellation blocks competing manual commands and actor/key reuse. Cancellation exclusively calls Restore, never HELD Cancel. Remote work is outside DB transactions; final status/audit/completion are atomic.                                                                                                                                                                                                                                                                                                                                                      |
| Service/transport             | Existing status service dispatch now routes CANCELLED through the coordinator. Signed receiver passes verified downstream context; native/background retains existing service signing. Focused tests exercise dispatch, native Product reply codec, correlation/actor and signed-context forwarding. No caller-controlled actor field added.                                                                                                                                                                                                                                                                                                                                                                                      |
| Recovery                      | Existing scheduler independently attempts Checkout and cancellation passes; one failure does not starve the other. Cancellation considers five due rows, uses existing two-minute lease and bounded retry delays. Claims/completion/retry bookkeeping use the lease token. Primary and retry-record errors are retained.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Existing owner tests/fixtures | Updated Order status and error-translation model mocks; extended receiver-context and scheduler assertions. Checkout-only fixture intentionally retains its throwing unexpected-Restore method and does not fake cancellation success. The low-level manual status helper still rejects CANCELLED by design; only the stock-backed coordinator may execute it.                                                                                                                                                                                                                                                                                                                                                                    |
| SQL drivers                   | New root `db:verify:d2:cancellation` command and owned disposable-DB driver prepared. Reviewed SQL against current migration requirements: exact seven-day Checkout receipt window, required OrderItem values, ORDER_COMMITTED payload and terminal attempt identity. Syntax, first-error regex control and scoped lint pass. Actual SQL execution is pending Salar, not represented by mock tests. Existing status/read/Checkout/coordination loaders already apply the migration tail; no pinned historical fixture assertion changed. Recheck status SQL because its transaction logic changed. Full coordination/Checkout native recovery remains grouped; original stock proof remains valid because Product did not change. |
| Public compatibility          | No proto, DTO, route/profile, generated SDK or OpenAPI changes required. Existing expectedVersion+1 response checks already cover CANCELLED. Preflight confirms exact counts/pins/freshness. No new F4 dormant receiver/activation; its existing deferred status remains explicit.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Native tests/helpers          | Inspected `test/grpc/helpers.ts`: existing signed context/Bearer construction supplies the required verified ingress. Native HTTP/gRPC fixtures still exercise PAID and missing targets; optional service context does not alter HTTP callers. They remain unchanged and native execution is pending grouped deployment.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Builds/seeds/docs             | No build target/environment/seed profile added; existing service-scoped builds include the new schema/source. Updated current-focus, adopted TODO and Order/Product service docs; earlier reports remain historical. No application image built in this slice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Locally observed final focused run: **5 suites, 55 tests passed**, including
14 cancellation tests. This covers real response codec, service dispatch,
verified context, success/audit/replay/changed intent, denied lifecycle/identity/
version/roles, held worker lease, remote failure/invalid response and local audit
failure. The actual rollback/concurrency/recovery claims await the SQL proof;
mocked transactions are not evidence of PostgreSQL rollback.

Order production types, Prisma validation and standalone Jest-config type check
pass. Scoped implementation/test lint has zero errors and four existing unsafe-any
warnings in the old error-translation test. Config syntax/types are checked via
TypeScript/Jest because it is outside the existing ESLint project-service scope;
no lint rule or coverage was disabled. New driver syntax/root lint pass. All
changed code/tests/driver/report formatting and `git diff --check` pass, with
existing CRLF advisories. Preflight: **4 suites, 22 tests passed**, including
OpenAPI/SDK freshness and inventories (79 routes/48 profiles/65 protected RPCs;
59 preserved R5, six explicit deferrals, four private Product stock RPCs).

Preparation caught and corrected a legacy receiver fixture missing verified
ingress, a no-await test callback and the exact seven-day SQL receipt fixture.
No assertion was weakened. Separate Product SQL proof and Salar's supplied stock
regression remain passing evidence; neither deploys this Order source.

## Operator checkpoint

Salar reports both `pnpm db:verify:d2:cancellation` and
`pnpm db:verify:d2:status` finished after the handoff. Record both as
operator-reported passes; detailed output/counts were not supplied. This closes
these two pending database commands, not application migration/image/native
cross-service deployment or the remaining demo payment-attempt implementation.

## Handoff receipt (historical preparation)

```text
Requirement/finding: unpaid Order cancellation lacked a durable binding to
the separately proved Product finalized-stock restoration.
Changed files and impact: initial exact trace and reviewed consumer table above.
Format/syntax/lint/types: pass; four existing test warnings. Prisma valid/generated.
Focused behavior/contracts: 5 suites / 55 tests; preflight 4 suites / 22 tests.
Actual SQL/runtime: original stock proof and ten configured health checks passed
(Salar-supplied output). New cancellation SQL and changed status SQL pending Salar.
The cancellation proof uses actual Order SQL and an explicitly stubbed Product
restoration port. It must not be described as a native cross-service restart test.
Source/image drift: source and new Order migration prepared; existing images
still run prior code. No build or application migration requested at this gate.
Limits/deferrals: no paid refunds/fulfilled reversal, no historical guessed stock
identity. Missing stock targets stay pending for reconciliation. Backed demo
payment attempts, grouped native/private-RPC/image/live proofs and F4 V3 remain open.
Next commands: pnpm db:verify:d2:cancellation; then pnpm db:verify:d2:status.
Why: real migration preservation/rollback/constraints, actor/key races, concurrent
paid-vs-cancel winner, lost remote reply, local audit rollback, expired lease and
fresh coordinator recovery; preserve existing manual status/audit semantics.
Expected: all named assertions and cleanup of each owned disposable database.
Readiness: READY FOR NAMED DATABASE PROOFS. No D2/Batch 3 closure claimed.
```

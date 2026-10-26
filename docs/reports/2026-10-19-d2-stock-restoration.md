# D2 Product restoration primitive

Started 2026-10-19; preparation completed on 2026-10-24. Salar reports
both Checkout/coordination compatibility commands passed without errors. No
shared schema/image deployment has been performed for Batch 3.

Requirement: restore finalized tracked deductions exactly once for the approved
unpaid demo Order cancellation. Confirmed gap: current Product cancel only
compensates HELD; finalization detaches live protective references while retaining
original IDs/quantities/tracking facts. Preserve that working mechanism.

This slice adds the Product-owned internal primitive first. Order's durable
cancellation command/recovery is the next integration slice; generic status
cancellation remains denied until connected. No successful Order cancellation
or payment effect is claimed by this primitive.

## Pinned behavior

- Private signed `ProductService.RestoreCheckoutStock`, Order-service caller
  only, accepts the existing intentId/hash identity. No client quantities,
  Product snapshots or cross-service database access.
- Require an existing matching FINALIZED intent with original lines. Record one
  `CheckoutStockRestoration` receipt per intent in the same transaction as the
  credits. Return existing CheckoutStockResponse with operation state RESTORED.
  Original intent state remains FINALIZED as the historical deduction fact.
- Lock the same intent key as reserve/finalize/HELD-cancel. Receipt replay
  succeeds before looking at current catalogue rows, even if later deleted.
- Credit only recorded tracked lines to their original base/variant rows.
  Original unmanaged lines never become a credit when current tracking changes.
  Tracked rows may be inactive/soft-deleted; no publication is implied. Missing
  tracked records, wrong parent/mode or counter overflow conflict atomically;
  never create replacements or partially credit an intent.
- Lock sorted Product parents as existing mutations do; conditional updates
  bound integer capacity and preserve original variant ownership. Advance each
  credited Product version when below its ceiling, preserving existing release
  behavior at the ceiling. No new live deletion guards or warehouse layer.
- Existing reserve/finalize retain their original historical reply; ordinary
  HELD cancel still rejects FINALIZED. Only the new private operation reports
  restoration, and its receipt prevents double credit across races/recreation.

## Before-edit consumer trace

| Owner/symbol               | Exact consumers                                                                                                                                                                                                                                                                       | Decision/check                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product receipt/schema     | `apps/product-service/prisma/schema.prisma`, new `prisma/migrations/20261019000100_finalized_stock_restoration/migration.sql`, generated Prisma                                                                                                                                       | Add one receipt keyed by intent with a restrictive intent FK; do not alter terminal enum or attach historical lines to live Product rows. Populated preservation/rollback/constraints require real SQL.                                                                                                             |
| Product owner/RPC          | `src/product/checkout-stock.service.ts`, `checkout-stock-contract.ts`, `grpc/checkout-stock-grpc.controller.ts`, `product.service.ts`                                                                                                                                                 | Add restoration using existing identity parser and intent transaction. Keep original reserve/finalize/cancel/deletion semantics. Controller has InternalOnly and exact Order caller guard.                                                                                                                          |
| Wire/shared client         | `packages/protos/product.proto`, generated Product source; `packages/clients/src/product.client.ts`, `src/dormant-v3.client.ts`, `test/service-wrappers.spec.ts`, `test/dormant-v3-wrappers.spec.ts`                                                                                  | One additive RPC and signed wrapper; response message unchanged. Explicit dormant Product method list already excludes internal stock methods. No new V3 receiver/activation.                                                                                                                                       |
| Exact inventory/freshness  | `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`, `docs/testing/pre-suite-checklist.md`, existing proto/OpenAPI/SDK generators                                                                                                                                                    | Four internal Product RPCs instead of three; Gateway counts stay 79/48/65, 59 R5/six deferrals unchanged. Reconstruct prior normalized Product hash before updating reviewed addition; preflight required. Public artifacts need no regeneration unless actual output changes.                                      |
| Raw callers/mocks          | `apps/gateway/test/gateway-product-api.service.spec.ts`, `apps/order-service/test/order.error-translation.unit.spec.ts`, `test/utils/checkout.fixture.ts`, `packages/clients/test/service-wrappers.spec.ts`; `apps/order-service/src/order/order.service.ts`, Gateway Product service | Expanded wrapper binds every method, so extend complete raw mock builders. Existing typed/direct service callers do not invoke restoration yet; preserve their assertions and recheck focused consumers.                                                                                                            |
| Unit/config                | `apps/product-service/test/checkout-stock.unit.spec.ts`, new `test/checkout-stock-restoration.unit.spec.ts`, existing `jest.unit.config.ts`, `jest.config.ts`, `test/jest.env.ts`                                                                                                     | Reuse existing unit-only config unchanged: main config has a global native startup hook. Cover state/hash/quantity authority, receipt replay, row/mode/overflow denial and all four RPC guard metadata. Keep original tests intact.                                                                                 |
| Actual DB drivers          | `scripts/db/verify-d2-stock.mjs`, new `verify-d2-stock-restoration.mjs`, `verify-d2-coordination.mjs`, `verify-d2-checkout.mjs`, root `package.json`                                                                                                                                  | Existing stock proof needs current migration tail before runtime work. New disposable proof checks upgrade rollback, original facts, actual credits/races/missing targets/overflow/atomic rollback/replay. Coordination loads all current migrations but does not invoke the new primitive until Order integration. |
| Other consumers/build/docs | `scripts/demo/runner.mjs`, Order Checkout/recovery/status code and fixtures, Product destructive-operation tests; `docker/backend.Dockerfile`, Compose/bake files, current-focus/TODO/Product/Order docs                                                                              | No Gateway/admin/seed operation added. No generic status cancellation enabled. Existing Product image scope covers new source/schema; grouped Product/Order/Gateway deployment remains pending. Record exact preparation results before broad handoff.                                                              |

Working tree already has 256 status entries and no staged diff. This is not a
clean checkout; preserve prior work. Checks were pending at this initial checkpoint.

## Implementation and consumer review (2026-10-24)

The confirmed defect is the missing finalized-stock compensation operation.
The existing HELD cancellation is retained. The new receipt and signed private
RPC implement the pinned behavior above; no public cancellation is enabled.

| Traced consumer                               | Final disposition and evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product schema/migration/generated Prisma     | Added the receipt with intent PK and restrictive FK. Prisma generation passed. Populated SQL preservation, migration transaction rollback and exact constraint checks passed in an owned disposable database. Shared application migration remains pending.                                                                                                                                                                                                                                       |
| Owner and controller                          | Added `restore`; existing identity parsing, advisory transaction lock and original HELD/finalize paths retained. Guard metadata and actual protobuf response codecs exercised in the two stock unit suites: 38 tests passed.                                                                                                                                                                                                                                                                      |
| Protobuf and signed wrapper                   | Regenerated protobuf and built shared clients. Wrapper now signs the fourth internal method; shared wrapper/dormant suites: 19 tests passed. No dormant V3 exposure added.                                                                                                                                                                                                                                                                                                                        |
| Inventory and generated public contracts      | Reviewed additive RPC and response comment. Removing those two changes reconstructs previous Product pin `53fa33c8e5cd93025acf189ae38f160e1483137ae46d6d0db4e50d2150746f11`; reviewed new pin is `75b20bb82fd4fd5a5195bea0d0e9e812d543cab1e2e344079719391774071db5`. Exact internal methods are four. Gateway route/profile/protected-RPC counts remain 79/48/65; 59 R5 receivers and six explicit deferrals remain distinct. Preflight: 22 tests passed, including generated contract freshness. |
| Raw mocks and Order fixture                   | Added complete raw bindings in Gateway Product, Order error translation, shared wrapper builders and `test/utils/checkout.fixture.ts`. Order fixture throws on unexpected restoration rather than fabricating success. Gateway Product: 20 tests passed; affected Order suites: 51 tests passed.                                                                                                                                                                                                  |
| Existing stock proof                          | Historical migration assertions remain pinned; current migration tail is applied before current-service execution. Syntax/lint pass. Full `pnpm db:verify:d2:stock` regression is pending operator execution.                                                                                                                                                                                                                                                                                     |
| Coordination/Checkout proofs                  | Current migration loaders already include the additive migration; these paths do not call restoration. Salar reported both compatibility commands passed without errors; no additional counts supplied.                                                                                                                                                                                                                                                                                           |
| Product deletion/selection/version consumers  | Existing guards and catalogue behavior unchanged. Restoration tests cover absent original rows, changed mode, wrong variant ownership, replacement IDs, counter capacity, soft deletion and the version ceiling. Product/Order/Gateway/client type checks pass.                                                                                                                                                                                                                                   |
| Seeders, public DTOs, routes, OpenAPI and SDK | Unchanged: no public operation or response shape is added. Existing generators/freshness checks pass. No demo cancellation/seed capability is claimed.                                                                                                                                                                                                                                                                                                                                            |
| Build and application deployment              | Existing Product build scope includes source/schema. No Docker build or shared application migration run for this slice; running images do not certify this source. Group deployment with Order cancellation integration.                                                                                                                                                                                                                                                                         |
| Documentation                                 | Product service, current-focus, adopted TODO and mandatory checklist describe the separate private primitive and pending Order binding. Order's existing documented cancellation/payment limitation remains accurate; no active Order caller was added.                                                                                                                                                                                                                                           |

## Observed proof and preparation

- Product focused unit suites: 38 tests; affected Order suites: 51; Gateway
  Product: 20; shared wrapper/dormant suites: 19. Real codec/guard checks are
  included. Product, Order, Gateway and shared-client type checks passed.
- `pnpm test:preflight`: 22 tests passed with protocol/OpenAPI/SDK freshness.
  Existing passing evidence was retained; the Oct 24 continuation changed no
  implementation after those results.
- `pnpm db:verify:d2:restoration` passed twice against actual PostgreSQL.
  Remote publication lookup alone is stubbed. Actual transactions establish
  concurrent one-credit/one-receipt behavior, original FINALIZED facts,
  replay through a fresh owner instance after catalogue deletion, original
  tracked/unmanaged authority, base/variant credits, soft deletion, version
  ceiling, absent/mismatched targets, overflow and multi-parent atomic rollback.
  A forced receipt-insert fault rolls back earlier credits; removing the fault
  permits a successful retry. Each run cleaned its one owned disposable DB.
- Upgrade proof preserved populated intent/line facts, proved explicit SQL
  transaction rollback with first error P0001, then deployed successfully.
  Valid control insertion preceded exact FK/PK/restrict-delete SQLSTATE checks.
  This does not claim native Prisma failed-migration recovery or process-restart
  integration coverage.
- Final scoped lint passed for both DB drivers, Product owner/controller/tests
  and affected Order fixture/tests. Order error-translation retains four
  pre-existing unsafe-any warnings; zero lint errors. No rule disabled.
- Prettier passed for changed source/test/client/driver/package files;
  `git diff --check` passed with existing CRLF-to-LF advisories only. Earlier
  codec typing, encoding/hash reconstruction and formatting failures were
  corrected before handoff; no assertion was weakened.

## Operator checkpoint (2026-10-24)

After cold Docker/WSL recovery Salar supplied all ten configured backend health
checks passing. `pnpm db:verify:d2:stock` passed populated preservation,
first-error rollback/exact constraints, same-key/recreated-owner replay,
no-oversell/multiline rollback, finalization/HELD cancellation/tombstones,
admin overwrite protections, variant/unmanaged/deleted-row compensation and
version ceiling. Its one owned disposable database was cleaned. This closes the
pending original-stock regression; native deployment/cross-service recovery are
still separate.

## Handoff receipt

```text
Requirement/finding: finalized deductions need exactly-once private compensation.
Changed files and consumer impact table: initial trace and reviewed table above.
Format/syntax/lint/types results: pass; four existing Order test lint warnings.
Focused contract/behavior results: Product 38, Order 51, Gateway 20, clients 19;
preflight 22, with real codecs and current generation/freshness.
Actual SQL evidence: restoration/upgrade/rollback/constraints/races pass;
existing stock regression pending Salar. Shared DB deployment remains pending.
Source/image drift: source/schema prepared; existing images were only restarted.
No build requested yet; group Product/Order/Gateway deployment after integration.
Known limitations: Order durable cancellation/recovery and backed payment
attempts remain open. Generic cancellation/processing status writes still deny.
Native RPC/deployment/live proofs and dormant F4 V3 activation remain separate.
Next broad command: pnpm db:verify:d2:stock
Purpose: preserve original HELD compensation/finalization/deletion protections
against the current migration tail; expect contract checks and owned DB cleanup.
Readiness: READY FOR NAMED DATABASE PROOF after PostgreSQL readiness is confirmed.
```

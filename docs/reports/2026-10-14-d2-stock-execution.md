# D2 Product stock intent execution

Started: 2026-10-14. Status: Product primitive owner proof passes; Salar reports
native Product verification passed. The later Order coordinator source/proof is
recorded in `2026-10-14-d2-checkout-coordination.md`; application deployment and
real RPC/live integration remain pending. The original handoff below is historical.

## Requirement and inspected mechanism

Confirmed gap: `apps/order-service/src/order/order.service.ts` checks current
stock but its local Order/receipt/Cart transaction has no Product stock write.
Completed receipt replay passed operator integration; it does not prove remote
stock effects. Product already owns quantities, versioned catalogue writes,
base/variant selection, discounts and signed service authorization. Preserve
those mechanisms. No warehouse, payment provider or general workflow platform.

## Pinned behavior

Implement a Product-owned intent, identified by an Order-generated UUID and a
canonical hash of currency plus sorted selection/quantity/version/SKU/options/
exact price facts. Reserve atomically validates and decrements all tracked
selections once; unmanaged inventory has no quantity effect. Same ID/hash
replays the stored state; changed facts conflict. Finalize makes the existing
decrement permanent; cancel restores held quantities once. Cancel before reserve
records a terminal tombstone so a delayed reserve cannot consume stock.

Held rows protect physical catalogue rows and reject absolute quantity,
tracking and selection-mode replacement. Soft deletion and price edits retain
recoverable physical rows; terminal operations detach protective references so
completed history does not permanently prevent catalogue deletion. Locks claim
intent first, then Product IDs in sorted order; no external call inside the SQL
transaction. Reuse the existing exact discount calculation.

Three signed internal RPCs accept only Order service; no public route or admin
privilege elevation. Existing 59 dormant R5 receivers and 63 Gateway-protected
RPC inventory stay unchanged: internal RPCs are a separately asserted inventory.
F4 owns their future context-v3 compatibility.

Before wiring customer checkout, Order must persist an attempt BEFORE the first
stock write. Recovery cancels abandoned pre-commit attempts and finalizes
committed purchases. An ambiguous commit is resolved from Order's own database
before compensation. Do not return a completed receipt while stock finalization
is pending. Do not let Product expire stock autonomously after Order commits.
That coordinator and actual cross-service outage/restart proofs remain pending;
the Product primitive alone must not close the combined Batch 2 gate.

## Consumer impact table, before implementation

| Owner/change                    | Exact consumer paths                                                                                                                                                                                                                                 | Required action / reason                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product intent/held line models | `apps/product-service/prisma/schema.prisma`; new `apps/product-service/prisma/migrations/20261014000100_checkout_stock_intents/migration.sql`; `apps/product-service/src/prisma.service.ts`                                                          | Add additive tables, constraints and protective relations; regenerate existing Prisma client; service uses existing client wiring.                                                                                                             |
| Product stock owner             | New `apps/product-service/src/product/checkout-stock.service.ts`, `checkout-stock-contract.ts`; `apps/product-service/src/product/product.module.ts`                                                                                                 | Validate/hash at owner; transactional state transitions; register service.                                                                                                                                                                     |
| Existing pricing                | `apps/product-service/src/product/product.service.ts`; new `apps/product-service/src/product/product-price.ts`; `apps/product-service/test/product-discount.unit.spec.ts`, `product-variants.unit.spec.ts`, `product-read-visibility.unit.spec.ts`   | Extract identical pure Decimal calculation; catalogue and stock use it; preserve assertions.                                                                                                                                                   |
| Stock overwrite protection      | `apps/product-service/src/product/product.service.ts`; `apps/product-service/test/product-inventory-concurrency.unit.spec.ts`, `product-variants.unit.spec.ts`, `product-destructive-operations.unit.spec.ts`                                        | Guard inventory/mode replacements and selected variant stock; physical deletion uses new FK; update affected mocks/assertions.                                                                                                                 |
| Private RPCs                    | `packages/protos/product.proto`; new `apps/product-service/src/product/grpc/checkout-stock-grpc.controller.ts`; `packages/protos/generated/product.ts`                                                                                               | Generate via existing generator, service-only Order caller; explicit codec and authorization assertions. Generated path verified in the existing generator.                                                                                    |
| Signed callers/canonical hash   | `packages/clients/src/product.client.ts`; new `packages/clients/src/checkout-stock.ts`; `packages/clients/index.ts`; `packages/clients/test/service-wrappers.spec.ts`                                                                                | Add three existing-style signed methods and canonical hash helper; preserve exact proxy inventory/signature tests.                                                                                                                             |
| Eager raw Product mocks         | `apps/order-service/test/order.error-translation.unit.spec.ts`; `apps/gateway/test/gateway-product-api.service.spec.ts`                                                                                                                              | Add all three raw methods; constructors bind every method even if caller does not invoke stock.                                                                                                                                                |
| Receiver/hash inventory         | `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`                                                                                                                                                                                                 | Review additive source before pinning Product hash; assert exact separate internal RPC inventory and signed Order-only receiver, preserve Gateway counts/legacy assertions.                                                                    |
| Product behavior / real SQL     | New `apps/product-service/test/checkout-stock.unit.spec.ts`; new `scripts/db/verify-d2-stock.mjs`; `apps/product-service/jest.unit.config.ts`; `package.json`                                                                                        | Focused tests, actual owned disposable PG proof, root named command; native migration proof explicitly separate. Existing wildcard unit config already includes new test.                                                                      |
| Existing history/seed/runtime   | `scripts/db/verify-d1-product-upgrade.sql`; `scripts/backend.mjs`; `scripts/backend.test.mjs`; `scripts/demo/runner.mjs`; `docker/backend.Dockerfile`; `docker-compose.yml`; `docker-compose.release.yml`                                            | Historical D1 migration window unchanged; additive tail must remain supported. Seeds do not invoke stock. Existing Prisma generation/copy and scoped Product build already include owner code/models. Review without unnecessary changes.      |
| External API                    | `apps/gateway/src/order/gateway-order-api.service.ts`; `apps/gateway/src/product/gateway-product-api.service.ts`; `apps/gateway/openapi/nebula-v1.openapi.json`; `packages/api-client/src/generated.ts`; `packages/api-client/test/d2-cart-live.mjs` | No external stock endpoint/response change. Freshness/preflight checks still apply; customer stock wiring and new checkout live proof belong to next coordinator slice.                                                                        |
| Order coordination/fixtures     | `apps/order-service/src/order/order.service.ts`, `cart-contract.ts`, `checkout-receipt-retention.ts`; `apps/order-service/prisma/schema.prisma`; `apps/order-service/test/checkout.unit.spec.ts`; `scripts/db/verify-d2-checkout.mjs`                | Explicitly pending next slice: durable pre-write intent, recovery, receipt readiness, Cart freeze, versioned quote and remote stock mocks/proofs. Do not invalidate already-passing local replay evidence by claiming it covers these effects. |
| Documentation                   | `docs/current-focus.md`; `TODO-ALTERNATIVE.md`; `docs/services/product-service.md`; `docs/services/order-service.md`; `docs/testing/pre-suite-checklist.md`                                                                                          | Track primitive and pending coordinator separately; document service-only operations and preserve no-production-payment boundary.                                                                                                              |

## Preparation and handoff receipt

## Post-change consumer review

The path table above is the exact before-edit map. The following review records
each mapped group after the changes; deferred rows are not completion claims.

| Changed owner/symbol                         | Consumer files (exact paths above)                                   | Update or preserved reason                                                                                                                                                                                                                                                                                                  | Check/result                                                                                                                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product intent/held line models              | Schema, migration, PrismaService                                     | Two additive tables and enum/relations; service wiring preserved; generated client refreshed                                                                                                                                                                                                                                | Prisma format/generate and Product types pass; actual PG upgrade fault rollback, populated preservation and exact constraints pass. Native deploy/rerun/status pending operator proof.                                         |
| CheckoutStockService / validation            | New owner files and ProductModule                                    | Registered internal owner; bounded 1..100 selections, UUID/hash, exact money, one-to-three options and existing SKU cap; claim intent then sorted parent versions                                                                                                                                                           | Focused behavior and actual Prisma state/concurrency tests pass; no remote IO inside transaction.                                                                                                                              |
| effectiveProductPrice                        | Product service/new helper; discount, variant, read-visibility tests | Existing Decimal calculation extracted without changing its conditions/rounding; catalogue and reservation share it. Read DTO shape unchanged                                                                                                                                                                               | Discount/variant regressions and owner types pass; existing read-visibility evidence preserved because helper behavior is identical.                                                                                           |
| Product update / mutateVariant               | Inventory, variants, destructive-operation tests                     | Product inventory/mode CAS adds no-held-lines predicate; variant stock checks holds after parent claim. Only affected mock/query assertion changed. Physical deletion already maps FK conflict                                                                                                                              | Focused owner regressions pass; actual PG proves overwrite denial, variant update rollback, soft-delete refund and terminal hard deletion.                                                                                     |
| Private RPCs                                 | Product proto, stock controller, generated Product                   | Existing generator writes `packages/protos/generated/product.ts` (verified generator path). Three Order-only internal receivers; no public route                                                                                                                                                                            | Actual request/response codecs and authorization metadata checks pass; isolated proto generation freshness passes.                                                                                                             |
| Signed clients/hash                          | Product client, helper, index, service wrapper tests                 | Three fixed generated RPC definitions/signatures, deterministic hash; exact proxy-key ordering updated without weakening equality                                                                                                                                                                                           | Shared-client TypeScript build and all nine wrapper tests pass; source/helper lint passes.                                                                                                                                     |
| Eager client mocks                           | Order error-translation test, Gateway Product mapper test            | Add all three bound raw methods; other behavior and assertions preserved                                                                                                                                                                                                                                                    | Order focused test: 9/9; Gateway Product mapper: 20/20.                                                                                                                                                                        |
| Receiver/hash inventory                      | R5 inventory test                                                    | Reviewed only four new messages and three private methods before changing normalized Product hash from `54f9ece19a683bae56e267f5e73eeb8e7966b1ba65b7933bad63e141f37e52e9` to `53fa33c8e5cd93025acf189ae38f160e1483137ae46d6d0db4e50d2150746f11`. Private receivers asserted separately; no broad exemption                  | Preflight 4 suites/21 tests passes: 77 routes, 47 profiles, 63 protected Gateway RPCs, 59 preserved R5 receivers and four Gateway post-R5 deferrals unchanged. Three internal receiver counterparts explicitly deferred to F4. |
| SQL proof/command/unit config                | New proof, root package script, existing unit config                 | Owned random-name DB, actual historical migrations and current Prisma; first-error rollback, valid controls before negatives, exact SQLSTATE/constraints; generated current fixture fields; no live demo rows targeted                                                                                                      | Script syntax and full actual SQL/Prisma proof pass; owned database dropped. Existing wildcard unit-only config includes the new suite without integration hooks.                                                              |
| Historical migration windows/runtime/seeders | Backend runner/tests, D1 SQL proof, demo runner, scoped Docker files | D1 runner pins only historical interval ending metadata, so additive later stock migration does not alter that claim. Current migration verification already enumerates all migrations. Seeders do not call stock; no new seed currency/discount rules. Existing generation/copy and Product build selector cover new files | Source review: no command, historical fixture, seeder or Docker changes required. Native clean Product proof pending. No rebuild requested until Order coordinator ready.                                                      |
| External API                                 | Gateway owners, OpenAPI, SDK and Cart live proof                     | No external DTO/route authority or generated API shape changes. Owners' implementation unchanged; only stale raw mock builders needed updates                                                                                                                                                                               | Gateway/Order types, OpenAPI/SDK freshness and preflight pass; prior passing live proofs preserved for existing behavior. No new stock live claim.                                                                             |
| Order coordinator                            | Order owner/schema/receipt retention, checkout unit and PG proof     | Explicit next slice: durable pre-write attempt, receipt readiness, Cart protection and leased recovery. Existing local receipt logic retained                                                                                                                                                                               | Pending; no cross-service atomicity, recovery, customer decrement or full Batch 2 completion claim.                                                                                                                            |
| Documentation                                | Current focus, adopted TODO, Product/Order service docs, checklist   | Current status and private-vs-Gateway inventory clarified. Stale service-doc deployment/replay claims corrected; earlier D1 gap list labelled historical                                                                                                                                                                    | Format/diff review; no roadmap expansion.                                                                                                                                                                                      |

Local focused results: stock/variant 2 suites/37 tests passed; the earlier
discount/inventory/destructive-operation subset (30 tests) also passed. No skips.
Source and new-stock test lint have no errors/new warnings. Variant test retains
three previously observed unsafe-matcher warnings; no new blanket disable.
The affected Order raw-client mock retains four existing unsafe-matcher warnings;
Gateway mapper/inventory and shared-client scoped lint have no warnings/errors.
Final stock request/response codec rerun passes all 28 stock tests; new test lint
has no warnings/errors. New stock source is not in the current running image.
Prisma prints its existing package.json configuration deprecation warning.

Actual Product SQL/Prisma result: populated preservation, deliberate first-error
upgrade rollback, exact check/FK controls, concurrent same-key once-only effects,
one winner between distinct intents at the same catalogue version, durable replay
in a new service instance after depletion, multi-selection failure rollback,
repeat finalize/cancel, late-reserve cancellation tombstone, base and variant
overwrite prevention, deleted variant refund, unmanaged stock, parent version
ceiling refund, terminal physical deletion and retained history all pass. One
owned disposable database was cleaned. Publication eligibility is deliberately
stubbed; this does not certify remote Settings/Taxonomy/Media or running RPCs.

```text
Requirement/finding: Product owns stock but completed Order replay has no stock effect.
Changed files and consumer impact: exact before-edit table and post-change review above.
Format/syntax/lint/types: scoped formatting, script syntax, Product/Order/Gateway types,
  shared-client build and reviewed source lint pass; baseline warnings remain visible.
Focused contract/behavior: owner regressions, actual request/response codecs,
  Order/Gateway eager mock consumers and signed wrapper equality/signatures pass.
  pnpm test:preflight passes 4 suites/21 tests; isolated proto freshness passes.
Actual SQL/runtime: Product-owned SQL/Prisma proof passes, including rollback/concurrency;
  remote eligibility stubbed. PostgreSQL accepts connections. Native migration pending.
Source/image drift: stock source changed; running Product image is not a stock proof.
  Do not rebuild yet: group Product/Order/Gateway once Order coordination is ready.
Limitations/deferrals: no customer stock wiring, Order recovery or real RPC/live proof;
  new private context-v3 receiver compatibility belongs to F4.
Next broad command: pnpm db:verify:product -- actual native clean deploy/rerun/status
  and existing Product database contracts in owned disposable databases.
Readiness: READY FOR NAMED NATIVE PRODUCT MIGRATION PROOF; Batch 2 stock remains open.
```

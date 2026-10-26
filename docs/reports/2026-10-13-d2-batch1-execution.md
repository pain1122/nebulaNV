# D2 Batch 1 execution evidence

Started 2026-10-13. Prerequisite: [resolved consumer trace and plan](2026-10-13-d2-batch1-file-trace-and-plan.md).
Status: Batch 1 closed. Salar reports all three builds, corrected Docker
deployment/rerun/status, health, Cart live proof and the complete shared
regression sequence passed. Exact broad suite counts/skips were not supplied;
the locally observed focused counts remain recorded separately below.

## Execution contract recorded before editing

Confirmed defects: product-only merging loses variant identity; number arithmetic
and the Product double response lose cents; read/write quantity updates lose
increments; expired populated carts cannot delete their restricted FK children.
Existing verified actor derivation, signed Product/Settings clients and currency
authority are retained. No cross-service SQL reads or caller prices are added.

Product's existing numeric response remains compatible. Add internal decimal
`effectivePriceAmount` strings to Product and ProductVariant, calculated before
conversion to double. Reproduction: Decimal('90071992547409.91').toNumber()
round-trips as '90071992547409.90'. Order-only Decimal math cannot recover that
lost cent. This requires coordinated Product/Order images; new Order fails closed
on missing exact amounts. No new RPC or activated dormant receiver is needed.

Cart accepts productId, optional variantId and integer quantity only. Selection
mode, SKU/options, price, currency, lifecycle and stock come from the existing
public Product authority. Quantity uses the existing int32 maximum 2147483647;
add checks combined quantity, update zero removes, negatives reject. Free prices
are valid. Monetary strings are fixed two decimals with Decimal(18,2) bounds.
Line totals and aggregate totals must fit that same range.

CartItem stores authoritative options and a server-derived base/variant key;
unique(cartId,selectionKey) prevents duplicate selections. Legacy base rows are
backfilled without deletion/merging; invalid or duplicate legacy rows fail the
additive migration explicitly. Widen the seven SQL money columns to their
existing declared Decimal(18,2) schema. Applied migrations remain unchanged.

Short transactions lock the verified owner's cart operations using a PostgreSQL
transaction advisory lock. Fetch remote authority before acquiring the lock;
reread owned state inside it. Expiry removes children before parents. Add,
update/remove, creation/expiry and existing checkout use the same lock. Cart
responses explicitly serialize dates, JSON, selections and decimal totals.

Checkout receives only the compatibility corrections needed by changed Cart
storage: exact arithmetic, expiry and shared locking. Variant checkout rejects
until Batch 2 stores complete immutable variant snapshots. Durable checkout
replay, stock consumption and order transitions remain under Batches 2/3.

## Impact table additions to the resolved trace

| Owner                         | Consumers/action                                                                                                                                                            | Validation status                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Product effective price       | packages/protos/product.proto, generated/product.ts, Product service DTO and focused exact-price codec regression; Gateway's explicit external Product mapper stays numeric | Source/codec/type checks pass; rebuilt Product authority proof pending.                                  |
| Cart selection/money/lifetime | Order schema/new migration, service/helper, HTTP DTO and gRPC controller, unit config/tests, Order proto/generated messages                                                 | Source/unit and actual Prisma-backed storage checks pass; native deployment/live pending.                |
| Cart API                      | Gateway order DTO/service/input profile, order input/HTTP/mapper tests, OpenAPI and generated SDK                                                                           | DTO/mapper/input/SDK and freshness checks pass; images/live pending.                                     |
| Historical D1 migration proof | scripts/backend.mjs historical target window must ignore later D2 migrations while rejecting unexpected migrations within its historical window                             | Five focused orchestration tests pass; historical D1 scope preserved.                                    |
| Wire inventory                | Gateway R5 test's Product/Order source pins updated only after reviewing additive field changes; RPC/path/profile counts and deferred inventory unchanged                   | Reviewed Product/Order pins and all four preflight suites pass; inventories unchanged.                   |
| Database/runtime proof        | New disposable populated upgrade/constraint/concurrency proof and Gateway-only Cart live proof; package commands and documentation                                          | Disposable populated SQL and actual owner/Prisma proof pass; native deployment and Gateway live pending. |

All exact prior consumer paths remain recorded in the prerequisite trace. New
paths and final changed/unchanged reasons will be recorded before handoff.

## Results and handoff receipt

See the final receipt below. Source and focused/disposable checks are complete;
operator Prisma deployment and image/integration/live proofs remain pending.

## Final consumer dispositions

This table revisits every exact existing path in the resolved trace and records
new implementation/consumer paths. Earlier unrelated dirty files remain owned
by the preceding checkpoints; they were not reset or staged.

| Exact path                                                                                    | Final disposition and evidence                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TODO-ALTERNATIVE.md`                                                                         | Updated current contract, pending proof state and explicit later-batch limitations.                                                                                                                                    |
| `apps/gateway/openapi/nebula-v1.openapi.json`                                                 | Regenerated by existing generators; freshness/codec/consumer type gates pass. No hand-edited generated artifacts.                                                                                                      |
| `apps/gateway/package.json`                                                                   | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `apps/gateway/src/contracts/gateway-api-route.decorator.ts`                                   | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/contracts/inputs/order.inputs.ts`                                           | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/gateway/src/contracts/routes/order.routes.ts`                                           | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/downstream/gateway-grpc-clients.module.ts`                                  | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/openapi/gateway-openapi.ts`                                                 | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/openapi/openapi-file.ts`                                                    | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/order/gateway-order-api.service.ts`                                         | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/gateway/src/order/gateway-order.controller.ts`                                          | Preserved routes, security/owner policies, DTO registration and defaults=true loader; additive Cart fields handled by updated DTO/mapper. No mechanism replacement needed.                                             |
| `apps/gateway/src/order/order-api.dto.ts`                                                     | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/gateway/test/contracts/input-profiles.aggregate.spec.ts`                                | Preserved existing role/route/schema/profile assertions; no extra route/RPC/profile. Focused Gateway and four preflight suites pass.                                                                                   |
| `apps/gateway/test/contracts/inputs/order.inputs.spec.ts`                                     | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/gateway/test/contracts/route-policy.aggregate.spec.ts`                                  | Preserved existing role/route/schema/profile assertions; no extra route/RPC/profile. Focused Gateway and four preflight suites pass.                                                                                   |
| `apps/gateway/test/gateway-order-api.service.spec.ts`                                         | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/gateway/test/openapi-contract.spec.ts`                                                  | Preserved existing role/route/schema/profile assertions; no extra route/RPC/profile. Focused Gateway and four preflight suites pass.                                                                                   |
| `apps/gateway/test/order-http.spec.ts`                                                        | Preserved existing role/route/schema/profile assertions; no extra route/RPC/profile. Focused Gateway and four preflight suites pass.                                                                                   |
| `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`                                          | Updated reviewed Product/Order pins only; preserves 59 dormant receivers, four existing deferrals, and no active v3 writer. Preflight passes.                                                                          |
| `apps/order-service/jest.config.ts`                                                           | Preserved integration readiness/configuration and production compilation boundary; use registered unit config for cheap preparation. Integration remains operator-owned.                                               |
| `apps/order-service/jest.unit.config.ts`                                                      | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/package.json`                                                             | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `apps/order-service/prisma/migrations/20261013000100_cart_selections_and_money/migration.sql` | Added: guarded base backfill, selection/quantity/price constraints, unique selection and seven money-column widenings; direct SQL/rollback proof passed; Prisma deployment pending.                                    |
| `apps/order-service/prisma/schema.prisma`                                                     | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/order-service/prisma/seed.ts`                                                           | Preserved intentionally empty base seeder; bounded Cart fixtures live in disposable/Gateway proofs.                                                                                                                    |
| `apps/order-service/src/app.module.ts`                                                        | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/health.controller.ts`                                                 | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/main.ts`                                                              | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/order/cart-contract.ts`                                               | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/order-service/src/order/dto/order.dto.ts`                                               | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/order-service/src/order/grpc/order-grpc.controller.ts`                                  | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/order-service/src/order/order.controller.ts`                                            | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/order/order.module.ts`                                                | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/order/order.service.ts`                                               | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/order-service/src/prisma.service.ts`                                                    | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/product-client.module.ts`                                             | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/src/settings-client.module.ts`                                            | Preserved owner derivation, bootstrap, target/loader configuration, module registration and Prisma/health wiring; pure helper needs no provider. Schema client regenerated; types pass.                                |
| `apps/order-service/test/cart-contract.unit.spec.ts`                                          | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/test/cart-mutations.unit.spec.ts`                                         | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/test/grpc/helpers.ts`                                                     | Preserved current full-message signing/loader/HTTP helper; actual defaults=true codec regression validates absent variant and empty arrays; no changed helper API.                                                     |
| `apps/order-service/test/grpc/order.e2e.spec.ts`                                              | Updated: assert explicit dates, empty options and exact line prices through both domain transports. Compiles/lints; rebuilt integration execution pending.                                                             |
| `apps/order-service/test/http/order.http.e2e.spec.ts`                                         | Updated: assert explicit dates, empty options and exact line prices through both domain transports. Compiles/lints; rebuilt integration execution pending.                                                             |
| `apps/order-service/test/jest.env.ts`                                                         | Preserved integration readiness/configuration and production compilation boundary; use registered unit config for cheap preparation. Integration remains operator-owned.                                               |
| `apps/order-service/test/order.error-translation.unit.spec.ts`                                | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/test/order.http-validation.unit.spec.ts`                                  | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/test/resource-authorization.spec.ts`                                      | Preserved verified actor/forged body and owner-query regression; existing tests pass with new Cart implementation.                                                                                                     |
| `apps/order-service/test/setup/wait-for-services.ts`                                          | Preserved integration readiness/configuration and production compilation boundary; use registered unit config for cheap preparation. Integration remains operator-owned.                                               |
| `apps/order-service/test/utils/cart.fixture.ts`                                               | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/order-service/test/utils/http.ts`                                                       | Preserved current full-message signing/loader/HTTP helper; actual defaults=true codec regression validates absent variant and empty arrays; no changed helper API.                                                     |
| `apps/order-service/tsconfig.build.json`                                                      | Preserved integration readiness/configuration and production compilation boundary; use registered unit config for cheap preparation. Integration remains operator-owned.                                               |
| `apps/order-service/tsconfig.json`                                                            | Preserved integration readiness/configuration and production compilation boundary; use registered unit config for cheap preparation. Integration remains operator-owned.                                               |
| `apps/product-service/src/product/grpc/product-grpc.controller.ts`                            | Preserved controller pass-through of Product DTO; new exact field serializes via updated proto. No request/RPC/security change.                                                                                        |
| `apps/product-service/src/product/product.service.ts`                                         | Updated owning implementation or transport propagation; scoped types/lint and focused behavior/contract checks recorded below.                                                                                         |
| `apps/product-service/test/product-discount.unit.spec.ts`                                     | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `apps/web/src/lib/gateway/product-adapter.ts`                                                 | Preserved: inspected adapters consume Product SDK, not Cart; public numeric Product contract is unchanged. Frontend work deferred.                                                                                     |
| `apps/web/src/lib/gateway/server-client.ts`                                                   | Preserved: inspected adapters consume Product SDK, not Cart; public numeric Product contract is unchanged. Frontend work deferred.                                                                                     |
| `docker-bake.hcl`                                                                             | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `docker-compose.yml`                                                                          | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `docker/backend.Dockerfile`                                                                   | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `docs/current-focus.md`                                                                       | Updated current contract, pending proof state and explicit later-batch limitations.                                                                                                                                    |
| `docs/packages/api-client.md`                                                                 | Updated current contract, pending proof state and explicit later-batch limitations.                                                                                                                                    |
| `docs/services/gateway.md`                                                                    | Updated current contract, pending proof state and explicit later-batch limitations.                                                                                                                                    |
| `docs/services/order-service.md`                                                              | Updated current contract, pending proof state and explicit later-batch limitations.                                                                                                                                    |
| `package.json`                                                                                | Registered only real new database/live proof commands; no dependency changes; lockfile unchanged.                                                                                                                      |
| `packages/api-client/package.json`                                                            | Registered only real new database/live proof commands; no dependency changes; lockfile unchanged.                                                                                                                      |
| `packages/api-client/scripts/generate-client.mjs`                                             | Preserved generator; existing additionalProperties support emits selectedOptions correctly; freshness and SDK checks pass.                                                                                             |
| `packages/api-client/src/generated.ts`                                                        | Regenerated by existing generators; freshness/codec/consumer type gates pass. No hand-edited generated artifacts.                                                                                                      |
| `packages/api-client/test/browser-consumer.ts`                                                | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `packages/api-client/test/client.test.mjs`                                                    | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `packages/api-client/test/d2-cart-live.mjs`                                                   | Added: real Gateway base/variant/free/discount/concurrency/denial checks and owned cleanup; syntax checked, runtime pending after deployment.                                                                          |
| `packages/api-client/test/f3-live-flows.mjs`                                                  | Preserved authentication/catalogue proof; no Cart assumptions. Rebuilt runtime regression is pending operator execution.                                                                                               |
| `packages/api-client/test/react-native-consumer.ts`                                           | Updated or added consumer/behavior coverage; registered in the actual unit config; focused checks recorded below.                                                                                                      |
| `packages/api-client/test/tsconfig.browser.json`                                              | Preserved platform compiler configuration; updated browser/RN fixtures and actual compilation pass.                                                                                                                    |
| `packages/api-client/test/tsconfig.react-native.json`                                         | Preserved platform compiler configuration; updated browser/RN fixtures and actual compilation pass.                                                                                                                    |
| `packages/clients/package.json`                                                               | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `packages/clients/src/dormant-v3.client.ts`                                                   | Preserved existing signed/dormant method binding and full-message serialization. Generated types propagate additions; client types and signing regressions pass.                                                       |
| `packages/clients/src/order.client.ts`                                                        | Preserved existing signed/dormant method binding and full-message serialization. Generated types propagate additions; client types and signing regressions pass.                                                       |
| `packages/clients/src/product.client.ts`                                                      | Preserved existing signed/dormant method binding and full-message serialization. Generated types propagate additions; client types and signing regressions pass.                                                       |
| `packages/clients/src/s2s-metadata.ts`                                                        | Preserved existing signed/dormant method binding and full-message serialization. Generated types propagate additions; client types and signing regressions pass.                                                       |
| `packages/clients/src/settings.client.ts`                                                     | Preserved existing signed/dormant method binding and full-message serialization. Generated types propagate additions; client types and signing regressions pass.                                                       |
| `packages/clients/test/dormant-v3-wrappers.spec.ts`                                           | Preserved signed/dormant binding/signature assertions; existing methods/messages remain. All 23 wrapper tests pass.                                                                                                    |
| `packages/clients/test/service-wrappers.spec.ts`                                              | Preserved signed/dormant binding/signature assertions; existing methods/messages remain. All 23 wrapper tests pass.                                                                                                    |
| `packages/clients/test/signing-policy.spec.ts`                                                | Preserved signed/dormant binding/signature assertions; existing methods/messages remain. All 23 wrapper tests pass.                                                                                                    |
| `packages/grpc-auth/src/tokens.ts`                                                            | Preserved targets, roles, verified actor and canonical signing mechanics; no changed RPC/receiver binding. Existing signed-client and inventory checks pass.                                                           |
| `packages/grpc-auth/test/service-wiring.spec.ts`                                              | Preserved targets, roles, verified actor and canonical signing mechanics; no changed RPC/receiver binding. Existing signed-client and inventory checks pass.                                                           |
| `packages/protos/generated/order.ts`                                                          | Regenerated by existing generators; freshness/codec/consumer type gates pass. No hand-edited generated artifacts.                                                                                                      |
| `packages/protos/generated/product.ts`                                                        | Regenerated by existing generators; freshness/codec/consumer type gates pass. No hand-edited generated artifacts.                                                                                                      |
| `packages/protos/index.ts`                                                                    | Preserved generator/export registration: same two message families and existing RPCs; all nine generated contracts pass isolated freshness.                                                                            |
| `packages/protos/order.proto`                                                                 | Updated additively; field numbers/RPC inventory retained; exact diff reviewed, actual codec tests and preflight pass.                                                                                                  |
| `packages/protos/package.json`                                                                | Preserved dependency/install/runtime import and selected build configuration; no new dependency/provider/module. Product, Order and Gateway images alone need rebuild.                                                 |
| `packages/protos/product.proto`                                                               | Updated additively; field numbers/RPC inventory retained; exact diff reviewed, actual codec tests and preflight pass.                                                                                                  |
| `packages/protos/scripts/generate.mjs`                                                        | Preserved generator/export registration: same two message families and existing RPCs; all nine generated contracts pass isolated freshness.                                                                            |
| `scripts/backend.mjs`                                                                         | Updated historical D1 migration window; five focused orchestration tests include missing/unexpected historical targets and later D2 acceptance.                                                                        |
| `scripts/backend.test.mjs`                                                                    | Updated historical D1 migration window; five focused orchestration tests include missing/unexpected historical targets and later D2 acceptance.                                                                        |
| `scripts/db/d1-order-upgrade-fixture.sql`                                                     | Preserved historical fixture/snapshot: staged before D2 fields under its historical migration window. D1 fixture is also exercised before new populated upgrade; F4 verifier stops at R2. Not a current-schema writer. |
| `scripts/db/d1-upgrade-snapshots.sql`                                                         | Preserved historical fixture/snapshot: staged before D2 fields under its historical migration window. D1 fixture is also exercised before new populated upgrade; F4 verifier stops at R2. Not a current-schema writer. |
| `scripts/db/f4-r2-order-fixture.sql`                                                          | Preserved historical fixture/snapshot: staged before D2 fields under its historical migration window. D1 fixture is also exercised before new populated upgrade; F4 verifier stops at R2. Not a current-schema writer. |
| `scripts/db/verify-d1-order-upgrade.sql`                                                      | Preserved historical fixture/snapshot: staged before D2 fields under its historical migration window. D1 fixture is also exercised before new populated upgrade; F4 verifier stops at R2. Not a current-schema writer. |
| `scripts/db/verify-d2-cart.mjs`                                                               | Added: disposable real SQL and actual Prisma-backed owner concurrency/overflow/removal, remote authority stubbed; passed and database cleaned.                                                                         |
| `scripts/db/verify-f4-r2-order.sql`                                                           | Preserved historical fixture/snapshot: staged before D2 fields under its historical migration window. D1 fixture is also exercised before new populated upgrade; F4 verifier stops at R2. Not a current-schema writer. |
| `scripts/demo/catalog.mjs`                                                                    | Preserved D1 catalogue/journal; no Cart consumer or new exact internal Product field consumption. Gateway Product numeric shape remains unchanged.                                                                     |
| `scripts/demo/demo.test.mjs`                                                                  | Preserved D1 catalogue/journal; no Cart consumer or new exact internal Product field consumption. Gateway Product numeric shape remains unchanged.                                                                     |
| `scripts/demo/runner.mjs`                                                                     | Preserved D1 catalogue/journal; no Cart consumer or new exact internal Product field consumption. Gateway Product numeric shape remains unchanged.                                                                     |

## Final preparation results - locally observed

- Order: 5 unit suites / 48 tests pass using jest.unit.config.ts, including
  authority, base/variant choices, stock, zero/free amounts, upper-range money,
  overflow rollback, explicit contention conflicts, UUID normalization, expiry,
  null-expiry adoption, and actual ts-proto/defaults=true loader codecs.
- Gateway: 3 focused suites / 14 tests pass for Order mapper, actual HTTP DTO
  variant/null/fraction/overflow behavior and input profiles. The new HTTP test's
  initial 201 expectation was corrected against the existing route's explicit
  successStatus=200; application status/policy was not changed.
- Product: focused discount/precision suite / 15 tests pass, including exact base
  and variant cents through real codecs, zero and discounts.
- Shared clients: all 3 focused wrapper suites / 23 tests pass; signed policy and
  dormant receivers remain intact.
- SDK: 16 tests pass; browser and React Native fixture compilation passes.
- test:preflight: freshness and 4 inventory suites / 20 tests pass. Paths/routes
  remain 77, input profiles 47 and protected RPCs 63; 59 preserved dormant
  receivers, existing four deferred RPCs and no activated writer are retained.
- proto:check: all nine contracts pass isolated generation freshness. Updated
  Order, Product, Gateway and shared client production type checks pass.
- Historical D1 proof preparation: 5 focused backend orchestration tests pass,
  including later-tail acceptance and rejection of missing/unexpected historical
  targets. This is orchestration evidence, not another D1 live database run.
- Scoped lint: zero errors. Changed owner helpers/mutations/new fixtures and
  changed Gateway/Product files have zero warnings. Existing Order integration
  tests retain 52 unsafe-any warnings each; the existing error-translation test
  retains four warnings. No coverage was removed/skipped to pass.
- JavaScript proof/client scripts pass syntax checks; changed text is formatted,
  schema uses Prisma format, git diff --check passes. CRLF-to-LF informational
  notices for existing .gitignore and Order proto are not whitespace failures.
- Exact trace review: 94 distinct existing files / 95 references including the
  checkout anchor; no file lacks a final disposition. New files are listed too.

## Database and runtime evidence

The read-only live Order audit found zero invalid legacy quantities/prices and
zero duplicate base selections before editing. No live migration was applied.

pnpm db:verify:d2:cart passes against an owned disposable PostgreSQL database:
legacy CartItem facts are preserved exactly; default base identity/options are
backfilled; legacy-invalid and duplicate migrations reject their exact first
errors; a deliberately failed D2 transaction rolls back every added column and
preserves the original row; valid base/variant controls precede exact negative
constraint checks; seven columns have precision 18/scale 2; upper-range cents
survive and overflow rejects; quantity range and uniqueness reject correctly;
advisory-locked read/write increments and creation races serialize correctly;
expiry cleanup satisfies the original restrictive FK.

It also loads the actual updated OrderService and generated Prisma client against
that database. Only remote Product/Settings are stubbed. Concurrent actual owner
adds merge into one row without losing increments, overflow rolls back persisted
facts, and concurrent update/removal cannot resurrect an item. The PostgreSQL
advisory query's text cast is exercised through Prisma, not just psql. The script
cleaned its one owned database, including on failure paths; it does not inspect
another service's database. This is stronger than mock evidence but is not a
running-image or actual Product/Settings authority proof.

SQL rollback here is explicit psql transaction evidence. It does not claim native
Prisma failed-migration recovery. Clean Prisma migrate-deploy/status and the
operator's populated deploy/rerun/status lane are still pending.

All eleven existing backend health checks pass immediately before handoff. These
are the preceding images, not proof that newly edited source is running.

## Mandatory handoff receipt

Requirement/finding: complete bounded Cart operations with verified ownership,
authoritative selections/prices/options/currency/stock, exact totals and safe
expiry/concurrent mutations. Eight additive wire fields and one additive Order
migration; no new RPC, authority service, dependency, provider or frontend work.

Changed files and consumers: the complete table above plus this report and the
updated planning report. Newly reviewed Product field52 / variant field13 are
exact internal amounts; Order CartItem fields8..10, Cart fields6..7 and add field4
are additive. Reviewed canonical source pins: Product
54f9ece19a683bae56e267f5e73eeb8e7966b1ba65b7933bad63e141f37e52e9;
Order 6783d0a3ddff9e1e0d44bc40b3b2924d293686124e70bd54f0a062a303f0e79b.
Other pins/counts/deferrals remain unchanged.

Format/syntax/lint/types: passed as scoped above; warnings remain explicit.
Focused behavior/contracts: passed with exact counts above.
Actual SQL/seed/runtime: populated SQL and actual Prisma-backed owner pass;
no new seeder is required. Existing healthy images pass baseline health only.
Prisma deployment, full domain integration and Gateway live proof are pending.

Source/image drift: new Product exact amounts and new Order/Cart schema/messages
require Product, Order and Gateway images. Existing Dockerfile selects one app's
compilation/dependency graph per BACKEND_BUILD_SERVICE and bounds Turbo
concurrency. Shared dependency installation/generation still covers the existing
workspace set. Build the three targets sequentially, preserving shared cache;
no force/no-cache/full-backend invocation is justified.

Limitations: read displays stored Cart facts until mutation/reconciliation;
checkout must still gain current revalidation/durable replay/stock effects and
complete immutable variant snapshots in Batch 2. Variant checkout intentionally
returns an explicit conflict. Raw Order response cleanup and transitions remain
Batch 3. No production payment, cloud/CDN, tenant or frontend activation.

Readiness: READY FOR NAMED OPERATOR PRISMA/DEPLOYMENT/LIVE PROOF. Image builds
are now reported successful. No known cheap preparation
failure remains. Current-focus and TODO feature boxes remain open until the
rebuilt live lane passes.

First operator stage (PowerShell; stop on the first failed command):

```powershell
pnpm db:verify:order
docker compose build product-service
docker compose build order-service
docker compose build gateway
```

Expected: clean four-migration Order deploy/status and three successful builds.
The actual live schema/process is untouched during this stage.

After those succeed, stop the old Order process before applying its new schema,
then deploy/rerun/status and restore the three affected images:

```powershell
docker compose stop order-service
pnpm db:migrate:order
pnpm db:migrate:order
pnpm db:status:order
docker compose up -d --no-build --wait --no-deps product-service order-service gateway
pnpm backend:health
pnpm test:d2:cart:live
```

The two deploys deliberately establish native rerun behavior. If migration fails,
retain its first error and stop this sequence; never mark it applied or rebuild
blindly. The stopped process is then a named recovery issue, not a live pass.
The Cart proof prints bounded labels and removes only its journalled product IDs
and corresponding cart items, preserves earlier customer items, uses current
Product versions and idempotency keys, and logs out both sessions (mobile refresh
token/browser cookie handled separately). It does not checkout/delete the user's
existing cart. Do not run conflicting integration suites concurrently with it.

After Cart runtime success, the required operator regression lane is full Order,
Product and Gateway integration suites plus affected D1 Product/variant/reference
and F3 live proofs. Their exact results are pending; previously passing D1/F5
history stays intact but is not substituted for this changed-image evidence.

## Operator build checkpoint - 2026-10-13

Salar reports all three requested builds succeeded. Build logs/counts/durations
were not supplied; this is operator-reported build evidence, not a live pass.
Clean pnpm db:verify:order success has not been explicitly reported; run it if it
has not already passed before deployment. Earlier focused preparation evidence
remains valid because no implementation changed after handoff.

Locally observed after the report:

- All 16 Compose containers are running and healthy.
- Each Product/Order/Gateway running container uses a different image ID from
  its newly built latest tag; all three require recreation.
- Live Order has exactly the three preceding migrations applied. The D2 Cart
  migration has not run; invalid legacy item and duplicate base selection counts
  remain zero. Inspection was read-only; the existing process/schema is intact.

Next handoff is the already-prepared stop/deploy/rerun/status/recreate/health/Cart
proof sequence above. Stop on the first failed command. The first native deploy
must succeed before its rerun and before launching new Order. The second deploy
verifies native idempotent migration rerun behavior, followed by schema status.
Deployment, rerun/status, runtime health, Cart proof and broad regressions remain
pending until their actual results arrive. Current-focus and TODO record this
checkpoint; no feature gate has been marked complete.

## Cart live failure and deployment command correction

Before editing the command: Salar reports native deploy/rerun/status, Compose
recreation and backend health succeeded, but the first orders_cart_get failed
with HTTP 500, requestId 225b2bc5-2692-4f9f-bb50-40211f673687. No proof products
were created before this failure; logout cleanup reported no additional error.

Confirmed defect in the handoff: direct package Prisma commands did not pin
the Docker database URL. The host Order .env points to localhost:5432; Docker
uses the existing shared backend runner's 127.0.0.1:15432 target. Docker's live
Order ledger still has only the three preceding migrations, and none of the new
CartItem columns exists. An actual Prisma read for the affected owner inside
Order returns P2022, column CartItem.variantId. A nonexistent-owner probe had
returned null successfully because Prisma did not need to query child rows.
Readiness alone did not exercise this populated Cart schema path.

The successful migration may have targeted the host 5432 instance (inference
from .env; its migration output/ledger was not provided). No rollback/deletion
of that separate database is authorized or necessary for this Docker correction.

Narrow correction: reuse databaseEnv, migrationVerificationServices and
runPrismaOperation to add explicitly scoped Docker database deploy/status CLI
commands for Order. Override inherited DATABASE_URL/SHADOW_DATABASE_URL in the
child environment, preserve the service .env for other development workflows,
and verify the exact selector/target in focused command tests. Application
source, schema, signed contracts, DTOs and images remain unchanged.

Impact before edit: scripts/backend.mjs (CLI/target environment),
scripts/backend.test.mjs (selector and environment regression), package.json
(real scoped commands), docs/services/order-service.md (deployment usage),
docs/current-focus.md, TODO-ALTERNATIVE.md and this receipt (actual proof state).
docker/backend.Dockerfile uses backend.mjs only during build checks; application
runtime files do not consume this operator CLI change. Existing image build
evidence remains valid. Gateway/proto/OpenAPI contracts do not change, so the
previous contract preflight remains valid rather than being repeated for docs.

Command checks, corrected deployment and Cart runtime rerun remain pending
until executed/reported below. Batch 1 feature gates stay open.

### Correction preparation and handoff receipt

Implemented root `db:migrate:order` / `db:status:order` commands through
runLocalDatabaseMigration. A specific supported selector is mandatory;
only deploy/status operations are allowed, production refuses before execution,
and the existing canonical databaseEnv pins both child URLs to Docker port 15432. The service .env and caller environment are not rewritten. This command
change supersedes the unpinned direct-package commands in the earlier handoff.

Locally observed: five focused Node tests pass, covering existing Prisma argument
selection/failure behavior plus overriding wrong inherited host URLs, the exact
Order service/database target, preserved caller environment/settings, rejected
missing/unknown scope and production, and surfaced execution failures. Node
syntax, formatting and scoped git diff --check pass. No TypeScript/proto/
Gateway contract changed; earlier types/codec/preflight checks remain applicable.

The actual corrected `pnpm db:status:order` command connected to nebula_order at
127.0.0.1:15432 and reported exactly the unapplied
20261013000100_cart_selections_and_money migration. Its exit 1 is expected pending
deployment, not a preparation failure. This proves the real CLI/environment
target, in addition to the mocked command tests. No live database was mutated.

Revisited consumer dispositions: backend.mjs CLI/environment and package command
registration updated; backend.test.mjs extended; Order documentation, focus,
TODO and this report corrected. The original runPrismaOperation interface,
general Prisma commands, databaseEnv target and selector registry are preserved;
only explicitly scoped new Docker commands pin their child environment. Other
runtime consumers, build targets, schemas/fixtures, seeded rows, generated
artifacts and application images are unchanged. This avoids invalidating the
operator's successful builds. Native deploy/rerun/status for Docker and Cart
runtime remain pending. The previous Cart read failure does not certify failure
of selection/pricing logic, since execution stopped at the missing column.

Readiness: READY FOR CORRECTED DOCKER DEPLOYMENT AND CART PROOF. The actual target
and focused prerequisites are verified; the pending migration is the named
deployment step. Salar runs the following sequentially, stopping on any error:

```powershell
docker compose stop order-service
pnpm db:migrate:order
pnpm db:migrate:order
pnpm db:status:order
docker compose up -d --no-build --wait --no-deps order-service
pnpm backend:health
pnpm test:d2:cart:live
```

Expected native result: first deploy applies the one new migration to port15432;
second deploy has no pending migration; status is up to date. Start Order only
after those succeed. Product/Gateway already use the built code and need no
rebuild for this operator command change. Required live/regression gates remain
open until results arrive; no database reset or seeder rewrite is part of this fix.

## Corrected deployment and Cart live checkpoint - 2026-10-13

Salar reports the complete corrected seven-command sequence went A-OK:
Order stop, pinned Docker deploy, second deploy, status, Order startup, backend
health and pnpm test:d2:cart:live. Detailed logs/durations were not supplied;
this is operator-reported deploy/rerun/health/live evidence, not invented counts.
The live script only exits successfully after all of its assertions and owned
fixture/session cleanup pass. No source changed after that run.

Locally observed afterwards: Docker's Order ledger has all four migrations
finished, including 20261013000100_cart_selections_and_money; all three new
CartItem fields exist. The actual pinned pnpm db:status:order command returns
success/up to date at 127.0.0.1:15432. All 16 Compose containers are healthy.
The seeded customer's Cart has zero items, so the sequential existing Order
integration fixture does not encounter or checkout pre-existing customer items.
These inspections/status checks were read-only. The previous migration-target
failure is resolved; no further rebuild/migration/Cart rerun is required without
a relevant new change or failure.

The four Batch 1 feature items are now checked off on their bounded evidence:
verified ownership and input boundaries; base/variant identities/options;
current Cart commercial validation; quantity/removal/exact totals and concurrent
local mutations. The broader TODO's validation at every authoritative boundary
remains unchecked because checkout revalidation belongs to Batch 2. Immutable
Order snapshots, durable replay and stock effects are still incomplete.

### Shared regression handoff receipt

Requirement: finish the previously planned full domain/Gateway and affected
D1/F3 regression lane against these rebuilt images before Batch 1 sign-off.
Changed files: evidence/current-focus/TODO only in this checkpoint. The prior
resolved consumer map, source lint/types, focused owner/codec/wrapper checks,
generated freshness and 20-test preflight remain valid; no implementation has
changed to invalidate them. Documentation formatting/diff checks pass.

Config/readiness preparation: inspected Order and Product jest.config.ts
(integration globalSetup waits for live services), Gateway jest.config.ts
(no integration startup hook), and the relevant fixtures. Current services are
healthy and the shared seeded Cart is empty. Keep suites/proofs sequential;
their fixture/session mutation/cleanup behavior remains distinct from unit
checks. The reference proof uses the existing ready-Media fixture toggle;
scanner/MinIO/Media are healthy. No new fixture or seeder rewrite is needed.

Actual SQL/runtime: corrected target deployment/rerun and Cart proof reported
passed; native target/status/schema and container state locally confirmed.
Source/image drift: none since the passing build/live sequence. No rebuild is
requested. Known limitations: existing Order unsafe-any lint warnings stay
recorded; Batch 2/3 behaviors remain explicitly deferred. Full regression suite
counts/skips and D1/F3 results are still pending, not inferred from Cart success.

Readiness: READY FOR NAMED SHARED REGRESSION PROOFS. No known cheap preparation
failure remains. Salar runs these sequentially, stopping on the first failure:

```powershell
pnpm --filter @nebula/order-service test:e2e
pnpm --filter @nebula/product-service test:e2e
pnpm --filter @nebula/gateway test
pnpm test:d1:product:live
pnpm test:d1:variants:live
$env:D1_READY_MEDIA_FIXTURE = '1'
pnpm test:d1:references:live
Remove-Item Env:D1_READY_MEDIA_FIXTURE
pnpm test:f3:live
```

If the reference proof fails, clear its temporary fixture environment variable
before stopping/reporting that error. Return the three suite/test summaries
(including skips/warnings) and the live proof outcomes. Passing prior checks are
preserved; broad suites remain operator-owned. After this lane passes, close
Batch 1 sign-off consistently and trace Batch 2's bounded checkout work before
implementation. This is completion of the original regression plan, not added
feature scope or an instruction to repeat the successful Cart/migration proof.

## Batch 1 sign-off - 2026-10-13

Salar reports "all green" for the final sequential regression block: full Order,
Product and Gateway suites; D1 Product, variants and ready-Media references;
and F3 live compatibility. This is operator-reported overall pass evidence.
Exact broad suite/test counts, durations, skips and warnings were not provided;
do not substitute earlier counts or claim zero skips/warnings. No source changed
after these results, so the prior focused type/codec/preflight and real database
evidence remain valid without another rebuild or proof cycle.

Batch 1 is closed: the four Cart feature items and shared regression sign-off
gate are complete in current-focus. The adopted TODO reflects completed Cart
operations/selections/totals, while its broader every-boundary commercial
validation requirement stays open for checkout in Batch 2. D2/B0 and later
batches are not closed. Stock effects, durable domain checkout replay, immutable
variant Order snapshots and completed checkout remain the next work.

Next preparation is recorded in
[the Batch 2 checkout trace and execution plan](2026-10-13-d2-batch2-file-trace-and-plan.md).
This checkpoint changes documentation only, not the passing application source,
schema, generated artifacts or runtime. Formatting/diff checks apply; no repeat
suite, container startup or build is requested merely for this sign-off.

# D2 Batch 1 file trace and execution plan - 2026-10-13

Status: file tracing and execution planning completed before implementation.
The planning task changed documentation only. Subsequent source implementation,
consumer dispositions and pending proofs are tracked in the
[execution receipt](2026-10-13-d2-batch1-execution.md); feature gates stay open.
Authority: current-focus's four Batch 1 items and TODO-ALTERNATIVE.md's D2 scope.
The [entry audit](2026-10-13-d2-entry-audit.md) contains the confirmed findings.

## Trace method and boundaries

Followed AddToCart/GetCart/UpdateCartItem/RemoveCartItem, their DTO/model/RPC
types, cart response mapping, Product commercial fields and quantity/money paths
with `rg` across apps, packages and scripts. Inspected direct callers, generated
ownership, exact tests/mock factories, fixed inventories, migration staging and
build inputs. The files below are reviewed consumers, not an instruction to
change every one. Implementation must record changed/unchanged reasons against
this map, including any newly introduced file or caller.

Reuse existing Cart routes, verified actors, Settings currency, Product public
visibility, signed clients and local Order transactions. Batch 1 checks stock;
it does not reserve/decrement it. Durable checkout, immutable Order snapshots
and order transitions remain Batches 2/3. No payment, frontend, F4 or inventory
platform work is introduced here.

## Main files and affected consumers

### O - Order owner

Expected owner edits:

- `apps/order-service/src/order/order.service.ts`: cart lookup/expiry,
  selection resolution, add/update/remove, precise money and mutation behavior.
- `apps/order-service/src/order/dto/order.dto.ts`: permitted selections and
  quantity validation; retain verified identity outside the request DTO.
- `apps/order-service/src/order/grpc/order-grpc.controller.ts`: carry permitted
  selection fields and enforce owning-boundary validation/explicit Cart replies.
- `apps/order-service/prisma/schema.prisma`: CartItem selection/option facts,
  selection uniqueness and declared money compatibility.
- New additive files under `apps/order-service/prisma/migrations/`, with names
  logged when written. Never modify an already applied migration.

Affected owner consumers to update or explicitly preserve:

- `apps/order-service/src/order/order.controller.ts`: same HTTP routes/owner
  resolution; adjust parameters only where the new DTO contract requires it.
- `apps/order-service/src/order/order.module.ts`: register a helper only if
  actually needed; no new general service/module layer is planned.
- `apps/order-service/src/main.ts`, `apps/order-service/src/app.module.ts`:
  preserve security/bootstrap; HTTP validation is not gRPC domain validation.
- `apps/order-service/src/product-client.module.ts`,
  `apps/order-service/src/settings-client.module.ts`: preserve targets/signing
  and current response loader configuration.
- `apps/order-service/src/order/order.service.ts#checkout`: affected consumer
  of changed CartItems even though checkout hardening belongs to Batch 2.
  An interim build must not silently checkout a variant as a base item or lose
  option facts; guard unsupported behavior until Batch 2 preserves it.
  If a money helper's return type changes, update this existing checkout math
  caller too; that compatibility edit does not certify Batch 2 replay/stock work.
- `apps/order-service/src/prisma.service.ts`,
  `apps/order-service/src/health.controller.ts`: inspect schema/client effects;
  change only if the final stored shape requires it.

### P - Existing Product and Settings authority

Inspected and intended to reuse without feature changes:

- `apps/product-service/src/product/product.service.ts` and
  `apps/product-service/src/product/grpc/product-grpc.controller.ts`:
  GetProduct/public visibility, BASE/VARIANT mode, variant membership/options,
  SKU, effectivePrice, availability, trackInventory and selected stock.
- `packages/protos/product.proto`,
  `packages/clients/src/product.client.ts`,
  `packages/clients/src/settings.client.ts`: consume existing contracts.
  The corrected Order Product mock already follows ProductProxy method keys.

Public variants may include active out-of-stock variants; do not confuse list
visibility with purchasability. With trackInventory=false, zero stock is not an
out-of-stock rule. Respect the inspected D1 behavior instead of inventing one.
Order's Product client loader uses defaults=true; keep legitimate zero/free
effective prices and omitted scalar defaults intact.

Decimal arithmetic in Order cannot recover precision already lost in an
upstream double. Validate the actual Product wire range/round trip before
claiming full-range exact pricing. Do not automatically add a new quote service
or redesign Product money encoding; record any demonstrated range gap and its
narrow compatibility correction before implementing it.

### W - Protocol, signed wrappers and generated output

Expected contract propagation:

- `packages/protos/order.proto`: additive CartItem/Cart/add-request fields,
  preserving current numbers and existing RPCs.
- `packages/protos/scripts/generate.mjs`,
  `packages/protos/generated/order.ts`, `packages/protos/index.ts`: generator
  owns emitted types/descriptors; review output and never hand-edit it.
- `packages/clients/src/order.client.ts`: current signed method bindings and
  updated request/reply types.
- `packages/clients/src/dormant-v3.client.ts`: same messages are consumed by
  preserved dormant Order receivers; update/check types without activating v3.
- `packages/clients/src/s2s-metadata.ts`,
  `packages/grpc-auth/src/tokens.ts`: inspect body-digest/target effects; preserve
  signing and identity mechanisms unless a concrete new mismatch is found.
- `packages/clients/test/service-wrappers.spec.ts`,
  `packages/clients/test/signing-policy.spec.ts`,
  `packages/clients/test/dormant-v3-wrappers.spec.ts`,
  `packages/grpc-auth/test/service-wiring.spec.ts`: check binding/signature and
  controller-policy assumptions against the changed messages.

### G - Gateway and external client

Expected Cart API consumers:

- `apps/gateway/src/order/order-api.dto.ts`,
  `apps/gateway/src/order/gateway-order-api.service.ts`,
  `apps/gateway/src/order/gateway-order.controller.ts`: permitted input fields,
  selected item facts and decimal-string totals; preserve explicit ownership
  checks, response DTOs and user/admin separation.
- `apps/gateway/src/contracts/inputs/order.inputs.ts`: allow only the newly
  permitted selection input, not client-supplied options, price or actor fields.
- `apps/gateway/src/contracts/routes/order.routes.ts`: existing routes should
  remain; do not add endpoints merely to expose a new request property.
- `apps/gateway/src/downstream/gateway-grpc-clients.module.ts`: preserve current
  defaults=true response loader. A focused actual-codec check confirmed empty
  Cart items materialize as []; a defaults=false diagnostic does not establish
  a current Gateway defect. Keep a real-codec regression for changed replies.
- `apps/gateway/src/contracts/gateway-api-route.decorator.ts`,
  `apps/gateway/src/openapi/gateway-openapi.ts`,
  `apps/gateway/src/openapi/openapi-file.ts`: inspect DTO/schema registration;
  change only when the emitted schema needs it.
- `apps/gateway/openapi/nebula-v1.openapi.json`,
  `packages/api-client/src/generated.ts`: regenerate with the existing commands.
- `packages/api-client/scripts/generate-client.mjs`: existing map/object support
  handles additionalProperties; review new selection schemas before changing
  the generator itself.
- `packages/api-client/test/client.test.mjs`,
  `packages/api-client/test/browser-consumer.ts`,
  `packages/api-client/test/react-native-consumer.ts`,
  `packages/api-client/test/tsconfig.browser.json`,
  `packages/api-client/test/tsconfig.react-native.json`: update/check callers and
  platform-neutral typing for new Cart facts.
- `apps/web/src/lib/gateway/server-client.ts`,
  `apps/web/src/lib/gateway/product-adapter.ts`: indirect SDK imports inspected;
  no Order/cart-specific caller was found. Preserve this compatibility client;
  no new frontend functionality is planned.

### T - Tests, fixtures and inventories

Existing consumers that must be revisited with their relevant item:

- `apps/order-service/test/resource-authorization.spec.ts`:
  preserve verified owner/caller-forgery cases.
- `apps/order-service/test/order.http-validation.unit.spec.ts` and
  `apps/order-service/test/order.error-translation.unit.spec.ts`:
  new quantity/selection boundaries and actual Product quote/mock shape.
- `apps/order-service/test/grpc/order.e2e.spec.ts`,
  `apps/order-service/test/grpc/helpers.ts`,
  `apps/order-service/test/http/order.http.e2e.spec.ts`,
  `apps/order-service/test/utils/http.ts`: update fixtures/payloads and check
  real HTTP/gRPC behavior, not just the Gateway DTO.
- `apps/order-service/jest.unit.config.ts`,
  `apps/order-service/jest.config.ts`,
  `apps/order-service/test/setup/wait-for-services.ts`,
  `apps/order-service/test/jest.env.ts`: use the existing unit config first;
  register new unit files in its exact testMatch list. Integration setup stays
  tied to ready services and is not bypassed accidentally.
- `apps/gateway/test/order-http.spec.ts`,
  `apps/gateway/test/gateway-order-api.service.spec.ts`,
  `apps/gateway/test/contracts/inputs/order.inputs.spec.ts`: update current
  mocks/expected inputs, authority denial and selected reply mapping.
- `apps/gateway/test/openapi-contract.spec.ts`,
  `apps/gateway/test/contracts/route-policy.aggregate.spec.ts`,
  `apps/gateway/test/contracts/input-profiles.aggregate.spec.ts`,
  `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`: explicit inventory/pin
  review before the full suite. Current 77 routes/47 profiles/63 protected RPCs
  should not change merely for additional Cart fields. Rebaseline an affected
  Order proto hash only after reviewing its approved diff; preserve other pins,
  existing receivers and the four already-deferred post-R5 RPCs.
- `scripts/demo/catalog.mjs`, `scripts/demo/runner.mjs`,
  `scripts/demo/demo.test.mjs`: reuse valid D1 Product fixtures; no existing Cart
  consumer was found. Add only required D2 proof fixtures without replacing
  the passing D1 catalogue/ownership journal.
- `packages/api-client/test/f3-live-flows.mjs`: retain compatibility proof;
  it does not currently prove Cart/checkout. Plan a separate minimal Cart live
  proof using the generated client, real configured currency, owned fixtures
  and idempotent cleanup. Record any new script/command path when implemented.

### D - Database proofs, builds and documentation

- `scripts/backend.mjs`, `scripts/backend.test.mjs`: the D1 verifier compares
  every migration at/after its first D1 target to a fixed list. A new D2 Order
  migration will currently trigger d1_upgrade_migration_set_changed_order.
  Preserve exact historical D1 checks, explicitly scope their covered interval,
  test rejection of unexpected historical changes, and give later D2 migrations
  their own current clean/populated/rollback evidence. Do not just drop the list
  assertion or count a new D2 migration as previously certified D1 work.
- `scripts/db/d1-order-upgrade-fixture.sql`,
  `scripts/db/verify-d1-order-upgrade.sql`,
  `scripts/db/d1-upgrade-snapshots.sql`,
  `scripts/db/f4-r2-order-fixture.sql`,
  `scripts/db/verify-f4-r2-order.sql`: historical/legacy fixtures must remain
  valid under additive Cart fields and money changes; check exact required
  fields/defaults/columns and preserve the appropriate historical scope.
- `apps/order-service/prisma/seed.ts`: intentionally empty base seeder; preserve
  it unless the bounded D2 fixture design actually requires an entrypoint change.
- `apps/order-service/package.json`, `packages/protos/package.json`,
  `packages/clients/package.json`, `apps/gateway/package.json`,
  `packages/api-client/package.json`, `package.json`: generator/type/test/proof
  commands and registration of any genuinely new unit/live/proof scripts.
- `apps/order-service/tsconfig.json`,
  `apps/order-service/tsconfig.build.json`: production type checks exclude tests;
  use the actual unit compiler path to check mock/fixture types too.
- `docker/backend.Dockerfile`, `docker-bake.hcl`, `docker-compose.yml`:
  generated Prisma/proto copying, shared imports and selected image scope.
  Plan Order/Gateway image changes only after preparation; rebuild another
  service only when its actual source/runtime contract changed. No blanket
  force/no-cache build or migration on the live demo during preparation.
- `docs/services/order-service.md`, `docs/services/gateway.md`,
  `docs/packages/api-client.md`, `docs/current-focus.md`,
  `TODO-ALTERNATIVE.md`: update current contracts, exact completion/evidence and
  deferred behavior, including the stale Order currency explanation.

## B1-01 Ownership and cart lifetime

Main files: O/service, HTTP/gRPC controllers and DTOs. Affected consumers:
G/input profiles and owner mapping; T/resource authorization, transport tests,
unit config; D/legacy fixture/command documentation.

Preserve the existing verified-owner mechanism. Validate mutation inputs at
the owner before writes; do not accept body/query authority. Fix expired
populated carts with child/parent cleanup in a short Order transaction while
retaining the existing restrictive FK. Do not let stale cleanup delete a cart
renewed by another mutation. Removal must still work for an owned item whose
Product was later hidden/deleted; it must not depend on a successful price lookup.

Required proof: forged actor fields, another user's item, invalid IDs/quantities,
expired empty/populated carts, expiry races and rollback/cleanup failure.

## B1-02 Base and variant selections

Main files: O/CartItem schema/service/DTOs and W/order.proto. Affected consumers:
W/signed and dormant wrappers/types; G/DTOs/mapper/input profile/SDK; T/all Cart
fixtures and response mocks; D/migrations/generators/legacy verifiers/builds.

Accept only Product ID, optional variant ID and quantity. Resolve mode,
membership, selected SKU/name/options and current price from Product authority.
BASE must not be silently treated as VARIANT, and VARIANT requires an eligible
selected child. Persist the minimum CartItem selection identity/option facts;
backfill legacy base rows without cross-service DB reads. Define a deterministic
unique cart-selection key that also works for base rows with nullable variant
identity; nullable uniqueness alone must not allow duplicate base selections.
Inspect legacy duplicate selections before imposing the constraint; do not
silently merge/delete rows or invent a cross-service backfill to obtain a pass.
OrderItem variant snapshots stay Batch 2; the existing checkout consumer must
not silently discard new Cart facts in an interim build.

Required proof: two variants stay distinct; same selection merges correctly;
wrong-parent/inactive/deleted/missing variant denial; options come from Product;
old base callers/rows still work; selected data survives actual codec round trips.

## B1-03 Current commercial validation

Main files: O/selection/price logic and existing P/Product/Settings consumers.
Affected consumers: T/quote mocks and error tests; W/response normalization;
G/selected reply mapping; D/money migration/constraint fixtures.

Use the selected base/variant effective price, retaining zero/free values;
respect lifecycle, selected availability, configured shop currency and parent
trackInventory semantics. Check the resulting combined quantity on add and
positive update against the selected stock; do not reserve/decrement here.
Use Decimal operations for stored/calculated money and align all seven existing
money columns with their declared Decimal(18,2) shape through an additive
migration. Validate producer round trips/range before asserting exactness.
Do not add coupon, tax, shipping or provider-specific pricing engines.

Required proof: base/variant overrides and discounts, legitimate zero prices,
fractional sums, supported range/overflow, changed currency, unavailable stock,
dependency failures and unchanged stored state after rejected operations.

## B1-04 Quantity mutations and deterministic totals

Main files: O/mutation/expiry/decimal logic and CartItem uniqueness. Affected
consumers: G/Cart quantity/total DTOs and mapper; W/Cart messages; T/unit and
real DB concurrency tests; D/fixtures/generated contracts/build consumers.

Define one quantity bound consistent with current int32/storage/Product limits
and use it across service/transports. Update zero removes an owned selection;
negative/overflow quantities reject. Add checks the combined quantity and
concurrent writes must not lose increments or create duplicate selections.
Fetch external authority before short local mutations; use guarded transactions
and the minimum concurrency fields/constraints needed, not a new coordination
platform. Define explicit decimal-string Cart totals in the existing response
contract; cover their zero/empty shape as well as populated carts.

Required proof: add/merge/update/remove, empty totals, monetary bounds,
concurrent add/update/removal, cart-creation races and real database enforcement.
Mocks alone do not establish PostgreSQL locking/uniqueness behavior.

## Execution order and handoff

1. Pin the intended Cart request/reply shape, scalar/default semantics,
   selection identity/legacy backfill, quantity bound and observable mutation
   conflict behavior against these traced files. Record any new paths/decisions.
2. Implement owner helpers and additive schema/migration changes with focused
   validation, quote, money, expiry and mutation tests. Correct proof staging
   and register tests before using broad configs.
3. Carry the same change through HTTP/gRPC, signed/dormant clients, Gateway,
   generated artifacts and every affected mock/inventory. Complete this within
   the batch; Batch 4 is not a place to defer consumer updates.
4. Run formatting/diff, scoped lint/types, the actual unit config, real-codec
   regressions, shared-wrapper tests, generated freshness and test:preflight.
   Execute changed SQL/fixtures against owned disposable PostgreSQL databases,
   with valid controls, exact negative errors and legacy/rerun/rollback evidence.
5. Record the mandatory handoff receipt. Only then delegate long populated/live
   proofs, affected image builds and broad integration suites. Verify restored
   readiness before Gateway-only Cart proof, then close only passed Batch 1 items.

Implementation/proof commands and new file names will be logged when prepared;
none are being handed off now. Today's scoped diagnostic verified existing
Gateway empty-list decoding with its actual defaults=true configuration.
Documentation checks only are appropriate for this trace/plan change; unchanged
runtime and passing Batch 0 evidence do not require another rebuild or full suite.

## Trace verification and current readiness

All 94 distinct existing files (95 references including the checkout anchor)
listed above resolve, and current-focus's four
item anchors resolve to this report. Formatting and diff checks pass. The
focused codec diagnostic confirms the existing defaults=true empty-list
behavior; it is not a Cart feature/live proof.

Changed files in this planning task: this report, docs/current-focus.md and the
adopted TODO's D2 progress/reference note. App, schema, protocol, generated files,
fixtures and running images are unchanged. The receipt is ready for bounded
Batch 1 implementation planning, not for new migration/image/live handoff.
Every feature and proof result remains pending until implemented and executed.

# D2 Batch 2 - Checkout file trace and execution plan

Prepared 2026-10-13 after [Batch 1 sign-off](2026-10-13-d2-batch1-execution.md#batch-1-sign-off---2026-10-13).
Status: current mechanisms inspected; implementation has not started.
Authority: current-focus's five Checkout requirements. No new frontend, payment,
warehouse, tenant, cloud/CDN or generic workflow platform is included.

## Findings and preserved mechanisms

Confirmed implementation gaps:

- Order checkout uses stored Cart facts, checks expiry/currency and creates an
  Order in a short local transaction. It does not re-read Product at checkout.
  Its temporary variant guard remains necessary while OrderItem lacks variant
  identity/options. Current SKU/name/quantity/prices are copied but snapshots
  cannot yet represent a complete variant purchase.
- Gateway's existing Redis idempotency cache already validates request hashes,
  leases and responses. Preserve it. Checkout's HTTP key is not forwarded by
  gateway-order-api.service.ts into CheckoutRequest; Order has no durable
  checkout receipt. A local Order transaction alone does not protect replay
  after gateway state loss or an ambiguous response.
- Product owns stock and has version-checked admin mutations. Those RPCs require
  admin/root-admin; a customer checkout must not impersonate an admin or call a
  raw stock-setting API. There is no Order-only durable stock operation in the
  current Product proto/client. Product hard-delete exists and must not erase
  stock needed by an unfinished checkout's compensation.
- The Order number generator has only four random decimal digits per day.
  Preserve historical numbers; choose a stable generated number once per new
  checkout attempt so a collision does not drive repeated remote stock effects.

Existing mechanisms satisfy their current scope and are retained: verified
Order ownership; Cart selection keys, exact price strings and Decimal totals;
Settings-backed currency; public Product eligibility; signed shared clients;
the per-owner Cart transaction lock; restrictive local FKs; Gateway route/retry
policies and Redis cache; current error envelopes and generated contracts.

There is already a signed service-only authorization pattern. Media's
ResolveProductReference uses Public, InternalOnly and
AllowedS2SCallers("product-service"); S2SGuard verifies and attaches caller kind
and identity, and rejects unlisted callers. The analogous Order-only Product
operation can reuse that mechanism. Do not replace auth or weaken admin writes.

This is required checkout completion, not an optional security/architecture
replacement. Durable service-local receipts are needed for the confirmed replay
and remote-write recovery gaps. An ordinary admin PATCH cannot enforce a
whole-checkout stock intent, acknowledge ambiguous delivery or cancel a late
request. Costs: additive owner migrations, internal signed RPC/messages, exact
consumer/inventory updates, and tested restart/recovery semantics. No cross-
service SQL transaction/reader or production-payment claim is justified.

## Main owners and exact affected consumers

| Slice                                      | Main files                                                                                                                                                                                                                            | Affected files and required action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current selection validation and snapshots | apps/order-service/src/order/order.service.ts; apps/order-service/src/order/cart-contract.ts; apps/order-service/prisma/schema.prisma                                                                                                 | OrderItem additions/additive migration; existing checkout, list/detail/status response consumers must use the same complete snapshot shape; do not remove the variant guard before that shape is supported.                                                                                                                                                                                                                                                                                                                                                                        |
| Domain replay and Cart coordination        | apps/order-service/src/order/order.service.ts; apps/order-service/src/order/order.controller.ts; apps/order-service/src/order/grpc/order-grpc.controller.ts; apps/order-service/src/order/dto/order.dto.ts                            | apps/gateway/src/order/gateway-order-api.service.ts; apps/gateway/src/order/order-api.dto.ts; apps/gateway/src/contracts/inputs/order.inputs.ts; apps/gateway/src/contracts/routes/order.routes.ts; apps/gateway/src/http/public-client-boundary.ts; apps/gateway/src/http/gateway-route-policy.ts; apps/gateway/src/state/gateway-idempotency.service.ts; apps/gateway/src/contracts/idempotency.ts. Forward the verified HTTP key, preserve cache/identity rules and define durable owner replay without trusting body authority.                                                |
| Product stock intent and rollback          | apps/product-service/src/product/product.service.ts; apps/product-service/src/product/grpc/product-grpc.controller.ts; apps/product-service/prisma/schema.prisma                                                                      | apps/product-service/src/product/product.module.ts; apps/product-service/src/prisma.service.ts; apps/product-service/src/product/dto/update-product.dto.ts; apps/product-service/src/product/dto/variant.dto.ts; apps/product-service/src/error.utils.ts; Product update/variant/delete/bulk paths must be reviewed for held-stock and version interactions. Keep decrement/restore under Product ownership.                                                                                                                                                                       |
| Service calls and wire contract            | packages/protos/order.proto; packages/protos/product.proto; packages/clients/src/order.client.ts; packages/clients/src/product.client.ts                                                                                              | packages/protos/generated/order.ts; packages/protos/generated/product.ts; packages/protos/scripts/generate.mjs; packages/protos/index.ts; packages/clients/src/dormant-v3.client.ts; packages/clients/src/s2s-metadata.ts; packages/grpc-auth/src/public.decorator.ts; packages/grpc-auth/src/s2s.guard.ts; packages/grpc-auth/src/grpc-token-auth.guard.ts; packages/grpc-auth/src/s2s-propagation.ts. Preserve signing and caller allowlists, regenerate rather than hand-edit, keep dormant activation separate.                                                                |
| External Order responses                   | apps/gateway/src/order/order-api.dto.ts; apps/gateway/src/order/gateway-order-api.service.ts                                                                                                                                          | apps/gateway/src/order/gateway-order.controller.ts; apps/gateway/src/openapi/gateway-openapi.ts; apps/gateway/openapi/nebula-v1.openapi.json; packages/api-client/src/generated.ts; packages/api-client/scripts/generate-client.mjs; packages/api-client/test/client.test.mjs; packages/api-client/test/browser-consumer.ts; packages/api-client/test/react-native-consumer.ts. Snapshots and demo labeling must survive actual codecs and all response paths.                                                                                                                     |
| Owner tests and fixtures                   | apps/order-service/test/cart-mutations.unit.spec.ts; apps/order-service/test/order.error-translation.unit.spec.ts; apps/order-service/test/resource-authorization.spec.ts; apps/order-service/test/order.http-validation.unit.spec.ts | apps/order-service/test/utils/cart.fixture.ts; apps/order-service/test/http/order.http.e2e.spec.ts; apps/order-service/test/grpc/order.e2e.spec.ts; apps/order-service/test/grpc/helpers.ts; apps/order-service/test/utils/http.ts; apps/order-service/jest.unit.config.ts; apps/order-service/jest.config.ts. Register focused checkout tests before execution; update temporary-guard expectations to the proven replacement behavior, not deleted assertions.                                                                                                                   |
| Product, Gateway and signing tests         | apps/product-service/test/product-inventory-concurrency.unit.spec.ts; apps/product-service/test/product-variants.unit.spec.ts; apps/product-service/test/product-discount.unit.spec.ts                                                | apps/product-service/test/product.grpc-validation.unit.spec.ts; apps/gateway/test/gateway-order-api.service.spec.ts; apps/gateway/test/order-http.spec.ts; apps/gateway/test/contracts/inputs/order.inputs.spec.ts; packages/clients/test/service-wrappers.spec.ts; packages/clients/test/signing-policy.spec.ts; packages/clients/test/dormant-v3-wrappers.spec.ts; packages/grpc-auth/test/service-wiring.spec.ts; packages/grpc-auth/test/s2s.guard.security.spec.ts. Extend mocks to actual ProductProxy keys; preserve denial, body/target signature and recovery assertions. |
| Inventories and generators                 | apps/gateway/test/openapi-contract.spec.ts; apps/gateway/test/contracts/route-policy.aggregate.spec.ts; apps/gateway/test/contracts/input-profiles.aggregate.spec.ts; apps/gateway/test/r5-v3-receiver-inventory.spec.ts              | Inspect precise proto/RPC/policy additions before pins/count changes. Preserve existing 59 dormant receivers and name any newly deferred counterpart under F4; never broadly exclude new methods or blindly rebaseline. pnpm test:preflight remains mandatory for affected contracts.                                                                                                                                                                                                                                                                                              |
| SQL/proof tooling and build consumers      | scripts/backend.mjs; scripts/backend.test.mjs; scripts/db/verify-d2-cart.mjs                                                                                                                                                          | scripts/db/d1-order-upgrade-fixture.sql; scripts/db/verify-d1-order-upgrade.sql; scripts/db/d1-upgrade-snapshots.sql; scripts/db/f4-r2-order-fixture.sql; scripts/db/verify-f4-r2-order.sql; apps/order-service/prisma/seed.ts; apps/order-service/package.json; apps/product-service/package.json; packages/api-client/package.json; package.json; docker/backend.Dockerfile; docker-compose.yml; docker-bake.hcl. Preserve historical windows, update current proofs for current generated clients, keep seeded data untouched, and use pinned Docker migration commands.        |
| Current documentation                      | docs/services/order-service.md; docs/services/product-service.md; docs/services/gateway.md; docs/packages/api-client.md                                                                                                               | docs/current-focus.md; TODO-ALTERNATIVE.md; active Batch 2 evidence. Record each consumer's changed/unchanged/deferred reason and real proof status before handoff.                                                                                                                                                                                                                                                                                                                                                                                                                |

New migration/helper/worker/test/proof paths will be named in the execution log
before their first edit. This table is an impact map, not a demand to rewrite
every file. Settings and Media authority remain unchanged. Existing web adapters
are Product consumers only; no frontend or Vite admin work is introduced.

## Execution order and behavior to pin

1. Revalidate through current Product/Settings authority and store complete
   immutable base/variant facts, using decimal amounts and explicit replies.
   Define price/currency/option/stock changes as deterministic conflicts;
   unavailable dependencies do not create an Order or clear the Cart. Quotes
   stay outside short local transactions; reread/check captured Cart facts under
   the existing owner lock. Do not claim this alone consumes or reserves stock.
2. Carry the existing key to the Order boundary. Bind a durable attempt to the
   verified owner, request intent and captured Cart. Same key returns the same
   result; changed intent conflicts; concurrent work cannot duplicate Orders.
   Pin replay/deadline/lease/retention rules before implementation against the
   current Gateway bounds: keys 16..128 ASCII characters, cache configurable
   60 seconds..7 days. Expiration must never silently permit a consumed key to
   purchase again. Cart edits during an unfinished attempt need an explicit
   conflict/continuation rule.
3. Implement only the internal Product stock intent needed by this checkout.
   The proposed bounded contract is reserve, finalize and release/cancel with
   one stable attempt identity and payload fingerprint. Reserve validates the
   owning price/version/lifecycle/selection and all tracked quantities before
   atomic effects; unmanaged stock stays unmanaged. Finalize/release replay
   safely. Cancel of an unseen operation must prevent a late reserve from
   consuming stock. Held local records must remain recoverable through catalogue
   deletion/tracking changes. Exact messages/hold representation and time bounds
   are pinned before edits, not assumed complete by this planning report.
4. Coordinate the two existing owner databases using durable local states and
   bounded recovery, not a distributed transaction claim. Known failed local
   work must restore stock once; an ambiguous commit must be read/reconciled
   before compensation. A lost lease must not release another attempt's stock.
   Persist response snapshots before acknowledging success. Reuse signed
   service-only calls for recovery; do not persist customer bearer tokens or
   give a customer an admin role. No broker/general workflow framework is needed.
5. Prove first-error migration rollback/populated preservation/native reruns,
   real database concurrency, unavailable/changed catalogue state, multi-line
   rollback, duplicate/replayed/expired keys, response loss and restart recovery.
   Include snapshots unaffected by later catalogue edits and explicit demo/no-
   production-payment output. Only then remove interim guards/close gates.

The above states and operation names describe the intended bounded correction,
not callable commands or implemented APIs. No new RPC or migration is certified.
Prior passing Cart/D1/F5 evidence remains valid until a relevant code change.

## Preparation checkpoint

Existing owner/controller/schema/stock-version and delete paths, Redis cache/
key policy, caller decorators/guards, signed context propagation, protocols,
response mappers, unit/integration configs and prior proof dependencies were
inspected. All 85 existing file paths in the impact map resolve (the inventory quantity
helpers live inside product.service.ts, not a separate contract file). Root
package/Bake/Compose paths resolve too. Newly discovered indirect consumers
are added rather than silently omitted before their implementation edits. Complete the mandatory pre-suite checklist again for each
implementation slice, record dispositions/results, and leave heavy executions
with Salar after its applicable cheap gates pass.

This checkpoint changes documentation only. It is ready for bounded Batch 2
implementation planning, not a build, migration or live checkout handoff.

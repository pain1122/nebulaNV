# D2 entry audit - 2026-10-13

Status: Batch 0 source/database audit complete. One stale test mock is corrected;
no business schema, service, transport, generated artifact or image changed.
D1/Core Media sign-off remains preserved. Batch 1 is next.

## Requirement and inspected entry state

Current-focus Batch 0 requires tracing Order schemas/migrations/transports,
Product/Settings calls, Gateway/client contracts, fixtures/tests and their
consumers; then classifying actual gaps without widening D2 scope.

Docker engine responds (28.4.0). PostgreSQL, Redis, MinIO and Media scanner are
running/healthy; the ten standard backend containers are exited. DEFAULT shadow
Realm Auth is also exited; the later health probe established that the standard
health runner requires restoring this existing container too. Backend/container/source
files already contain unrelated or earlier uncommitted work; preserve it.

Inspected startup consumers: docker-compose.yml Auth/Gateway dependencies and
existing service names, the current-focus guardrails and mandatory runtime
preparation checklist. No missing image/build error is observed. Use existing
images; do not initiate boot/provision/migration/seed/reset or shadow activation.

## Startup handoff receipt

- Requirement: bring the existing standard backend back up before D2 runtime checks.
- Source/config changes: none; current Compose is inspected, infrastructure is ready.
- Cheap checks: Docker responds; compact Compose status and startup dependencies inspected.
- Actual runtime proof: standard backend readiness is pending until startup/health passes.
- Rebuild decision: no rebuild needed for this startup; no source/image replacement proposed.
- Limits: Realm Auth/context v3 and shadow profiles remain deferred; do not claim their readiness.
- Named proof: `docker compose up -d --no-build --wait user-service auth-service tenant-authority-service settings-service media-service taxonomy-service product-service blog-service order-service gateway`, then `pnpm backend:health`.
- Readiness: READY FOR NAMED STARTUP PROOF. The wait may take minutes; operator-owned.

## Dependency trace

| Owner/requirement            | Exact consumer paths inspected                                                                                                                                                                                                                                          | Action when implementing D2                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart/order storage and money | apps/order-service/prisma/schema.prisma; migrations/20251119063447_init_order/migration.sql; migrations/20260905000100_default_actor_backfill/migration.sql; migrations/20260930000100_shop_currency_authority/migration.sql                                            | Add migrations for confirmed changes; preserve original migrations/actor compatibility; update real populated/denial/rerun fixtures           |
| Cart/checkout behavior       | apps/order-service/src/order/order.service.ts; dto/order.dto.ts; order.controller.ts; grpc/order-grpc.controller.ts; src/main.ts; src/app.module.ts; packages/grpc-auth/src/grpc-security.ts                                                                            | Keep verified context/roles and existing transactions; close service-boundary validation, selection, expiry/pricing and checkout gaps         |
| Product/Settings dependency  | apps/order-service/src/product-client.module.ts; settings-client.module.ts; packages/clients/src/product.client.ts; settings.client.ts; packages/protos/product.proto; apps/product-service/src/product/product.service.ts; grpc/product-grpc.controller.ts             | Reuse public visibility, effective-price, currency and validated Product mutation authority; update exact callers if adding owner contracts   |
| Order RPC/client             | packages/protos/order.proto; packages/protos/scripts/generate.mjs; packages/clients/src/order.client.ts; packages/clients/test/service-wrappers.spec.ts; signing-policy.spec.ts; dormant-v3-wrappers.spec.ts                                                            | Propagate selection/snapshot/checkout changes through generated types and signed wrappers; inspect all service bindings/mocks                 |
| Gateway API/policy           | apps/gateway/src/order/order-api.dto.ts; gateway-order-api.service.ts; gateway-order.controller.ts; src/contracts/routes/order.routes.ts; inputs/order.inputs.ts                                                                                                        | Update selected request/reply contracts and admin operations; preserve strict authority rejection and role/application policies               |
| Existing replay              | apps/gateway/src/state/gateway-idempotency.service.ts; contracts/idempotency.ts; http/gateway-route-policy.ts; test/idempotency.spec.ts; idempotency-http.spec.ts                                                                                                       | Preserve scoped Redis claim/hash/replay/conflict; inspect the commit/reply-loss gap before adding durable Order correlation                   |
| Owner tests/config           | apps/order-service/jest.config.ts; jest.unit.config.ts; test/setup/wait-for-services.ts; resource-authorization.spec.ts; order.http-validation.unit.spec.ts; order.error-translation.unit.spec.ts; grpc/order.e2e.spec.ts; grpc/helpers.ts; http/order.http.e2e.spec.ts | Use unit config for fast checks; update current mocks/fixtures and add meaningful quantity/expiry/selection/replay/rollback coverage          |
| Gateway tests/inventories    | apps/gateway/test/order-http.spec.ts; gateway-order-api.service.spec.ts; contracts/inputs/order.inputs.spec.ts; openapi-contract.spec.ts; contracts/route-policy.aggregate.spec.ts; contracts/input-profiles.aggregate.spec.ts; r5-v3-receiver-inventory.spec.ts        | Update exact routes/counts/pins only after inspecting approved changes; keep declared deferred F4 coverage explicit                           |
| External artifacts and proof | apps/gateway/openapi/nebula-v1.openapi.json; packages/api-client/src/generated.ts; scripts/generate-client.mjs; test/client.test.mjs; test/f3-live-flows.mjs; scripts/demo/runner.mjs; scripts/backend.mjs; scripts/db/verify-d1-order-upgrade.sql                      | Regenerate via existing commands; add bounded D2/B0 fixtures/live proof; revisit any migration-set assertion affected by new Order migrations |
| Build/docs handoff           | docker/backend.Dockerfile; docker-bake.hcl; package.json; docs/services/order-service.md; docs/current-focus.md; TODO-ALTERNATIVE.md                                                                                                                                    | Build only affected images/dependencies after preparation; update current behavior/docs without activating deferred scopes                    |

These grouped paths identify actual inspected consumers, not a promise to edit
every file. Each implementation batch must record its exact changed/unchanged
subset and revisit indirect consumers before handoff. Generated proto outputs
are owned by the inspected generator; do not edit them manually.

## Existing mechanisms to preserve

- HTTP/gRPC identity comes from guarded request/context, not request.userId;
  user reads filter by owner and ID. Resource authorization tests cover this.
- Gateway has explicit response DTO/mapping and strict input/role/application
  policies; selected admin status is separate from user cart/order routes.
- Cart creation/add and checkout consult Settings shop currency. D1 removed
  the database currency defaults; current applied migrations confirm this.
- Product's public GetProduct supplies D1 visibility/eligibility enforcement;
  Order must retain it while handling precise selections and checkout freshness.
- Order checkout has a local transaction creating order/items and clearing the
  cart. Gateway already has bounded Redis idempotency claim/hash/replay/conflict.
  Neither mechanism should be described as absent or casually replaced.

## Classified D2 findings and execution order

| Finding                                                                                   | Classification and evidence                                                                                                                                                                                                             | Owning batch/narrow direction                                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| No variant selection identity/options in CartItem, OrderItem or add request               | Confirmed implementation gap: schema, Order proto/DTOs, shared client and Gateway inputs expose productId/quantity only                                                                                                                 | Batch 1 selection; Batch 2 immutable variant snapshots                                                                               |
| Quantity update skips Product/stock/price validation; concurrent add uses read-plus-write | Confirmed implementation gap: service updateCartItem only changes quantity; addToCart reads existing.quantity then writes the sum; no cart/item version or atomic increment is implemented                                              | Batch 1 authoritative validation and deterministic mutation behavior                                                                 |
| gRPC quantity lacks domain validation                                                     | Confirmed defect: controller passes plain typed requests directly; no DTO validation pipe or service quantity bounds; HTTP decorators are not inherited by the gRPC setup                                                               | Batch 1 validate at the owning boundary while preserving verified identity                                                           |
| Expired populated cart deletion conflicts with FK; checkout ignores expiry                | Confirmed defect: getActiveCart deletes the parent without children; actual PostgreSQL CartItem_cartId_fkey is ON DELETE RESTRICT; checkout reads directly without expiry check                                                         | Batch 1 transaction-safe expiry cleanup; Batch 2 checkout freshness                                                                  |
| Cart stores base price rather than discounted effective price                             | Confirmed defect: fetchProductOrThrow copies raw.price; inspected Product response supplies price and effectivePrice separately                                                                                                         | Batch 1 correct commercial quote handling, including legitimate zero-price wire semantics                                            |
| Money schema and applied DB disagree                                                      | Confirmed defect: current schema specifies Decimal(18,2), but actual CartItem/Order/OrderItem money columns report precision 12/scale 2; checkout also uses Number arithmetic                                                           | Batch 1 align declared money storage and deterministic arithmetic; real upgrade/denial proof                                         |
| Checkout does not revalidate catalogue or change stock                                    | Confirmed implementation gap: checkout uses saved cart items and current shop currency only; no Product call/mutation in the transaction path                                                                                           | Batch 2 minimal authoritative stock contract, freshness and failure behavior; no general inventory platform                          |
| Replay is not tied durably to the committed Order                                         | Confirmed implementation gap: Gateway replay exists, but Order request/schema carry no checkout key/version/receipt; cart is read before its creation transaction; reply loss cannot resolve a committed order through an Order receipt | Batch 2 preserve Gateway replay and add only required durable checkout correlation/claim; test concurrency and interrupted responses |
| Snapshots omit variants/options                                                           | Confirmed implementation gap: base identity/name/SKU/price/quantity snapshots exist; schema and checkout copy no selected variant/options                                                                                               | Batch 2 extend existing snapshots, not a new order model                                                                             |
| Admin list/detail and controlled transitions absent                                       | Confirmed implementation gap: only admin status RPC/route exists; updateOrderStatusAdmin writes any accepted enum directly without expected version/transition/audit rules                                                              | Batch 3 bounded admin reads and transition/concurrency behavior                                                                      |
| Order gRPC returns Prisma-shaped values                                                   | Confirmed implementation gap: controller directly returns service Prisma rows; Gateway mapping already exists, so it is not missing everywhere                                                                                          | Batch 3 explicit owner serialization for money/date/JSON and reply contracts                                                         |
| Currency/TTL documentation is stale                                                       | Stale documentation: service doc says currency comes from Product and launch TTL should be six hours; actual code reads Settings currency and configured TTL with preserved 30-minute fallback                                          | Update with relevant batch; a six-hour policy is not an adopted D2 requirement                                                       |

No optional platform replacement is required by these findings. Broad inventory,
production payments, frontend, cloud/CDN and F4 stay deferred. Stock coordination
is a Batch 2 requirement whose exact failure/recovery contract must be inspected
and bounded before implementation; this audit makes no distributed atomicity claim.

## Local evidence and remaining runtime evidence

Read-only PostgreSQL inspection confirmed all three applied Order migrations,
the actual Decimal(12,2) money columns and restrictive CartItem foreign key.
It did not mutate records or certify new checkout behavior.

The corrected mock includes UpdateImageMetadata and satisfies the ProductProxy
method-key surface. All 3 unit suites/15 tests now pass. Changed-test lint passes
with zero errors and four existing nonblocking warnings. No broad integration,
live checkout, image build or migration execution has been performed here.

Initial container readiness and the operator's Realm Auth health failure are
recorded above. After restoring the existing DEFAULT shadow container, the local
`pnpm backend:health` passed all 11 checks. Compact Compose inspection reports
16 running containers, all healthy. The OPERATOR shadow profile stayed inactive;
no Gateway auth consumer, application schema or business fixture was activated
or replaced. Full backend startup/readiness is now proved for this restored state.

## Next implementation receipt

Batch 0's dependency trace and classifications are complete. Start Batch 1
against the mapped consumers, beginning with owning-boundary quantity/selection
validation, transaction-safe expiry and money/price compatibility. Preserve the
verified ownership and Settings currency paths. Required schema/proto changes
must update the exact consumers/inventories and generators, then run applicable
cheap/preflight gates and real disposable SQL checks before broad handoff.
No broad proof or image build is requested at this checkpoint. D2 features and
exit gates remain unchecked; 15 unit passes are baseline evidence, not D2 sign-off.

## Focused baseline preparation findings

Startup correction: the operator's full health command passed User/Auth, then
failed the stopped realm-auth-service. The initial command omitted a default
Compose service that the current health runner includes. Confirmed command
coverage defect, not failed D2 code: Compose defines this existing DEFAULT
deployment as health-only shadow infrastructure; the OPERATOR instance is a
separate r3-shadow profile. Restore only the already-created DEFAULT container
with `docker compose start realm-auth-service`, without profile activation,
rebuild, new auth consumers or migration/seed work. Its Redis/Postgres dependencies
already run healthy. Full readiness remains pending until that check passes.

The initial focused command mistakenly selected jest.config.ts, whose
globalSetup waits for live Order HTTP even when only unit files are selected.
The service was stopped; tests did not run. The existing jest.unit.config.ts
avoids that setup; use `pnpm --filter @nebula/order-service test:unit` for this
baseline. This is a command-selection error, not application failure.

That actual unit baseline found 8 failures/7 passes: Product client initialization
fails because productClientWith in order.error-translation.unit.spec.ts omits
UpdateImageMetadata. This is stale test implementation: the inspected current
packages/clients/src/product.client.ts binds that real method on initialization.
Logged before correction: add the missing mock member and make the mock satisfy
the ProductProxy method-key surface, preserving existing error/currency cases.
Consumers: this test helper, the shared ProductProxy interface/wrapper and the
unit Jest config. Runtime source, generated artifacts and images stay unchanged.
Rerun the actual unit config and focused lint after this narrow correction;
do not hand off broad integration tests while this known preparation failure exists.

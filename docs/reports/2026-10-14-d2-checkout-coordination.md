# D2 Order checkout coordination

Started: 2026-10-14. Status: source and focused SQL/Prisma/contract gates pass;
native Order verification operator-reported passed; application migrations
applied after command correction; corrected Checkout live operator-reported
passed; Cart/F3 are also operator-reported passed. Recovery preparation passes;
Salar reports corrected recovery and Cart live proofs passed on 2026-10-19.
Batch 2 is closed; Batch 3 Orders remains active next.

## Confirmed requirement and current implementation

`OrderService.checkout` already quotes through signed Product/Settings, locks
the owner Cart, commits Order/receipt/Cart removal together and replays completed
receipts. Product's reserve/finalize/cancel primitive has actual owner SQL/Prisma
proof and operator native verification. Confirmed implementation gap: Order
has no durable pre-write attempt or recovery for those remote effects. Preserve
the local receipt, exact-money serializers, owner locks and existing signed
clients. This is required D2 stock integration, not an architecture replacement.

## Pinned execution and failure behavior

- Persist a bounded, immutable quote and Product payload under the owner lock
  before reserving. Bind intent UUID, verified owner, key/note hashes, Cart ID/
  fingerprint and catalogue versions. Allocate the Order identity once.
- Permit one active attempt per owner. Freeze Cart mutations/expiry cleanup
  while active. Same-key concurrent callers wait boundedly for the original
  result; changed note conflicts. Cancelled keys remain consumed and require a
  new key. Completed pre-existing receipts with no attempt remain replayable.
- Reserve through the existing signed Order-to-Product wrapper. Commit Order,
  receipt, Cart removal and `ORDER_COMMITTED` atomically under the original owner
  lock. Finalize remotely, then mark `COMPLETED` and start the seven-day receipt
  replay window. Pending orders cannot be returned as completed purchases or
  have their admin status changed.
- Before commit, any failure transitions to `CANCELLING`, cancels remotely once
  and ends `CANCELLED`, leaving the Cart. Resolve an ambiguous transaction by
  reading Order's own attempt before compensation. If that read is unavailable,
  leave the attempt recoverable; never infer rollback from a socket exception.
- After commit, retry finalization; never refund committed stock. Expired
  `PREPARED` attempts cancel conservatively rather than silently placing a new
  purchase. Each step checks its persisted lease token before local changes.
  Product's cancel tombstone blocks a late reserve from a stale executor.
- Recovery uses current service identity and fresh signed metadata without
  storing JWTs. Lease 120 seconds, RPC deadline 10 seconds, same-key wait at most
  10 seconds, worker at most five attempts per five-second tick, bounded backoff.
  SQL transactions remain short; no remote call while holding owner locks.
- Terminal attempts retain key/intent/stock identity but clear redundant quote
  bodies. Receipt compaction skips unfinished attempts. Successful completion
  starts its replay window; original Order/response dates remain unchanged.
- No public endpoint or body/response schema expansion, real payment, generic
  workflow engine, warehouse rules or successful-order cancellation/restock
  policy. Batch 3 owns later admin transitions. Group native deploy/build/live
  proofs after mandatory preparation; no demo data erasure required.

## Exact consumer trace before implementation

Steering accepted during this slice: add `PAYMENT_PROCESSING` to Order status
contracts. Salar chose confirmed failed/customer-cancelled payment -> release
reservation and return Order to `PENDING`; retry revalidates commercial facts
and reserves again. Uncertain outcomes remain `PAYMENT_PROCESSING` for
reconciliation. Explicit Order cancellation is `CANCELLED`. Implementing real
payment attempts/provider callbacks and their reservation binding remains under
the corresponding payment/lifecycle work; this slice remains `DEMO_NO_PAYMENT`.
Its committed demo purchase finalizes stock, rather than pretending a provider
transaction exists. Batch 3 must not infer a confirmed failure from a generic
status patch or refund already-finalized stock through the HELD-only cancel RPC.

Additional exact consumers of the status addition: separate additive migration
`apps/order-service/prisma/migrations/20261014000200_order_payment_processing/migration.sql`,
`apps/order-service/src/order/dto/order.dto.ts`,
`apps/order-service/src/order/grpc/order-grpc.controller.ts`,
`apps/gateway/src/order/order-api.dto.ts`,
`apps/gateway/src/contracts/inputs/order.inputs.ts`,
`apps/gateway/test/contracts/inputs/order.inputs.spec.ts`,
`apps/gateway/test/gateway-order-api.service.spec.ts`,
`apps/order-service/test/order.http-validation.unit.spec.ts`,
`apps/gateway/openapi/nebula-v1.openapi.json`,
`packages/api-client/src/generated.ts`,
`packages/api-client/test/browser-consumer.ts`,
`packages/api-client/test/react-native-consumer.ts`,
`apps/gateway/test/openapi-contract.spec.ts` and service/current-focus docs.
RPC status is already a string; no protobuf layout/hash change is needed.
Regenerate OpenAPI/SDK and preserve exact enums, status rejection and snapshots.

| Changed owner/symbol                        | Consumer paths inspected / to update                                                                                                                                                                                                                                                                                                                                                                                                                  | Action or preserved reason                                                                                                                                                                                                               | Check/result |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Durable CheckoutAttempt                     | `apps/order-service/prisma/schema.prisma`; new `apps/order-service/prisma/migrations/20261014000100_checkout_attempts/migration.sql`; `apps/order-service/src/prisma.service.ts`                                                                                                                                                                                                                                                                      | Add enum/model, owner/key uniqueness, one-active-owner partial index, state/lease/hash/body constraints and local Order FK; regenerate existing client                                                                                   | Pending      |
| Coordinator/persisted quote                 | New `apps/order-service/src/order/checkout-coordinator.ts`, `checkout-attempt-contract.ts`; `apps/order-service/src/order/order.service.ts`, `checkout-contract.ts`, `cart-contract.ts`                                                                                                                                                                                                                                                               | Prepare versioned exact quote, use existing owner lock with explicit coordinator bypass of Cart freeze; no optional live fallback to old checkout                                                                                        | Pending      |
| Stock signing / RPC consumers               | `packages/clients/src/product.client.ts`, `checkout-stock.ts`, `s2s-metadata.ts`; `packages/grpc-auth/src/s2s-propagation.ts`; `apps/product-service/src/product/checkout-stock.service.ts`, `grpc/checkout-stock-grpc.controller.ts`; `packages/protos/product.proto`, `order.proto`                                                                                                                                                                 | Existing three private methods/signatures preserved; deadline and identity/state checks at Order callback; no protobuf changes expected                                                                                                  | Pending      |
| Worker/module/retention                     | New `apps/order-service/src/order/checkout-recovery.ts`; `apps/order-service/src/order/order.module.ts`, `checkout-receipt-retention.ts`, `checkout-receipt.ts`                                                                                                                                                                                                                                                                                       | Register bounded leased worker after application bootstrap; unfinished receipt excluded from compaction; legacy completed receipts retained                                                                                              | Pending      |
| Cart mutation/reads and order access/status | `apps/order-service/src/order/order.service.ts`; `apps/order-service/src/order/order.controller.ts`, `grpc/order-grpc.controller.ts`; `apps/order-service/src/order/dto/order.dto.ts`                                                                                                                                                                                                                                                                 | Guard edits and expired-Cart cleanup; hide unfinished orders and guard admin status while finalization pending. Verified owner and transport inputs unchanged                                                                            | Pending      |
| Unit fixtures/mocks/config                  | `apps/order-service/test/checkout.unit.spec.ts`, `cart-mutations.unit.spec.ts`, `order.error-translation.unit.spec.ts`, `resource-authorization.spec.ts`, `order.http-validation.unit.spec.ts`; `apps/order-service/test/utils/cart.fixture.ts`, `order.fixture.ts`; `apps/order-service/jest.unit.config.ts`; new `apps/order-service/test/checkout-coordinator.unit.spec.ts`, `checkout-recovery.unit.spec.ts`                                      | Update actual delegates/version/stock methods, preserve previous snapshot/money/replay/authorization assertions; exercise errors and recovery separately from real PG                                                                    | Pending      |
| Existing SQL/history proofs                 | `scripts/db/verify-d2-cart.mjs`, `verify-d2-checkout.mjs`; `scripts/db/d1-order-upgrade-fixture.sql`; `scripts/backend.mjs`, `backend.test.mjs`                                                                                                                                                                                                                                                                                                       | Historical rollback targets stay pinned. Current service drivers apply later migration tail and gain explicit stock stubs/version; existing failure/concurrency/retention assertions preserved. No cross-service proof claim from a stub | Pending      |
| New owner integration proof                 | New `scripts/db/verify-d2-coordination.mjs`; `package.json`                                                                                                                                                                                                                                                                                                                                                                                           | Actual Order and Product Prisma in two owned disposable DBs; RPC bridge deliberately stubbed; prove remote effects/compensation, ambiguous local commit, leases, restart and receipt retention; native proofs separate                   | Pending      |
| Gateway / external generated clients        | `apps/gateway/src/order/gateway-order-api.service.ts`, `order-api.dto.ts`; `apps/gateway/src/contracts/routes/order.routes.ts`, `inputs/order.inputs.ts`; `apps/gateway/test/gateway-order-api.service.spec.ts`, `order-http.spec.ts`, `contracts/inputs/order.inputs.spec.ts`, `r5-v3-receiver-inventory.spec.ts`; `apps/gateway/openapi/nebula-v1.openapi.json`; `packages/api-client/src/generated.ts`; `packages/api-client/test/client.test.mjs` | External contracts unchanged; existing 409/503 envelope/idempotency behavior reused; run mandatory preflight for use of private RPCs and freshness                                                                                       | Pending      |
| Integration/live callers                    | `apps/order-service/test/http/order.http.e2e.spec.ts`, `grpc/order.e2e.spec.ts`; `packages/api-client/test/d2-cart-live.mjs`, `f3-live-flows.mjs`; new `packages/api-client/test/d2-checkout-live.mjs`; `packages/api-client/package.json`; `package.json`                                                                                                                                                                                            | Preserve Cart/F3 compatibility; add named actual checkout base/variant/unmanaged stock/replay/owner-snapshot proof. Outage/restart transport proof recorded separately                                                                   | Pending      |
| Seeds/build/runtime                         | `apps/order-service/prisma/seed.ts`; `scripts/demo/runner.mjs`; `apps/order-service/src/config/env.validation.ts`; `docker-compose.yml`, `docker-compose.release.yml`, `docker/backend.Dockerfile`                                                                                                                                                                                                                                                    | No configurable new optional protocol, reset or broad image rebuild. Existing scoped Order/Product/Gateway build and runtime generation cover new modules. Complete ecommerce seeder remains existing Batch 4 task                       | Pending      |
| Documentation                               | `docs/current-focus.md`; `TODO-ALTERNATIVE.md`; `docs/services/order-service.md`, `product-service.md`; `docs/reports/2026-10-14-d2-stock-execution.md`                                                                                                                                                                                                                                                                                               | Update exact source/proof/deployment status and consumer results; combined Batch 2 gate stays open until actual integration proof                                                                                                        | Pending      |

## Initial preparation receipt

Preparation refinement: move the existing checkout service harness unchanged
into `apps/order-service/test/utils/checkout.fixture.ts` so both preserved
`checkout.unit.spec.ts` assertions and new recovery tests use one set of actual
delegate/version/stock mocks. The helper exposes those mocks for fault injection;
it does not claim real transactional/locking behavior. New helper and unit files
must be added to the explicit unit-only configuration/trace.

Not ready yet. No broad test/build/live command is requested by this initial
trace. Preserve earlier owner stock/local receipt results while extending their
current-driver consumers. Native migration and grouped image/RPC/live checks
remain explicitly operator-owned after applicable cheap gates pass.

## Post-change consumer review

The initial table is the before-edit trace; this review supersedes its pending
check column. Existing working mechanisms and assertions were retained. No
blanket skip, hash rebaseline, database erasure or forced image build was used.

| Changed owner/symbol                  | Consumer paths (exact map above)                                                                                                                                        | Update / preserved reason                                                                                                                                                                                                                                                            | Result                                                                                                                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CheckoutAttempt / OrderStatus         | Schema, two new migrations, PrismaService                                                                                                                               | Add attempt enum/model/constraints/partial unique/FK; add PAYMENT_PROCESSING after PENDING to match schema enum order; regenerate current Prisma client                                                                                                                              | Prisma format/generate/types pass; actual populated upgrade/forced first-error rollback, hash/body/lease/state/failure checks, active-owner and terminal-key uniqueness and terminal Order FK controls pass. Native deploy/rerun/status pending. |
| CheckoutCoordinator / persisted quote | Coordinator, attempt contract, OrderService, Cart contract                                                                                                              | Persist explicit quote and versions before reserve, check signed response identity/state, use current owner lock, fence leases, decide compensation from durable commit, clear terminal payloads                                                                                     | Eight Order unit suites/89 tests pass; real two-owner-database proof covers rollback, concurrency, ambiguous commit, worker takeover and late reserve.                                                                                           |
| Existing serializers/receipts         | checkout-contract.ts, checkout-receipt.ts                                                                                                                               | Existing exact-money/order snapshot/key normalization/receipt decoder retained; regenerated Prisma enum automatically admits PAYMENT_PROCESSING                                                                                                                                      | Existing codec/snapshot/receipt assertions pass; original response survives later catalogue and admin status edits. No proto/hash layout changes.                                                                                                |
| Signed private RPCs                   | Product client/helper, metadata/propagation, Product owner/controller and proto                                                                                         | Existing methods/credentials/caller allowlist unchanged; Order forwards verified ingress context and uses fresh service-only calls on recovery, with 10-second deadlines. JWTs are not persisted                                                                                     | Existing signed client tests/evidence retained; new real owners use a deliberately simulated RPC bridge. Actual S2S/runtime remains pending.                                                                                                     |
| Cart and Order reads/status           | Order service/controllers/DTOs, resource tests                                                                                                                          | Freeze writes/expired cleanup while active, retain read-only live Cart access; hide unfinished orders; atomically restrict admin updates to completed/legacy orders, preserving verified owner filters                                                                               | Unit authorization predicates remain exact; real Prisma proves frozen edits, hidden pending reads and admin denial. Transport inputs/owner extraction unchanged.                                                                                 |
| Recovery/retention/module             | New worker, OrderModule, receipt retention                                                                                                                              | Start after application bootstrap; no overlapping worker ticks, five candidates/5-second tick, 120-second lease, bounded backoff. Exclude unfinished receipts from selection AND compaction update                                                                                   | Focused scheduler/retention and two-database tests pass, including expiry while finalization is pending and window renewal on completion.                                                                                                        |
| Unit fixtures/configuration           | Existing checkout spec moved harness to utils/checkout.fixture.ts; new attempt fixture, coordinator/recovery specs; existing Cart/error/owner/status specs; unit config | One shared current model/client mock builder; add explicit test entries, version and stock methods. Preserve old assertions and label doubles as decisions, not concurrency proof                                                                                                    | 89/89 unit tests; no skips. New/changed source and helpers lint clean. Existing error fixtures retain four matcher warnings; resource authorization retains one.                                                                                 |
| Historical/current SQL drivers        | Cart and checkout proof scripts, unchanged historical fixture/backend runner/tests                                                                                      | Insert the legacy fixture at its actual pre-Cart schema boundary; retain historical rollback controls and apply later migrations before loading current service. Checkout driver gets explicit version and three stock stubs                                                         | Both updated Cart and checkout SQL/Prisma proofs pass and clean one owned DB each. Existing replay/owner/new-Cart/retention/rollback assertions retained; neither stubbed driver claims remote stock.                                            |
| New two-database proof/root command   | verify-d2-coordination.mjs, root package                                                                                                                                | Use current real Order and Product service logic and Prisma in two owned databases, with publication dependencies/transport stubbed. Guard production and disposable-name cleanup                                                                                                    | Actual proof passes, both DBs cleaned. Shared Product source/price logic exercised; no cross-service DB read added to production code.                                                                                                           |
| PAYMENT_PROCESSING / public contract  | Owner DTO/native enum and existing gRPC string adapter; Gateway DTO/mapper/profile; OpenAPI and generated SDK/browser/native consumers                                  | Status addition only; strict enum still rejects IN_PAYMENT_PROCESS. Regenerate artifacts; profile names/fields, routes, RPC signatures and signed scope unchanged                                                                                                                    | Owner/Gateway status tests pass; preflight 4 suites/21 tests passes, no pin/count changes. Order/Gateway/SDK types and browser/native consumers pass.                                                                                            |
| Prepared live/integration tests       | New d2-checkout-live.mjs, API-client/root scripts; existing Cart/F3 and native owner integration suites                                                                 | Require empty seeded Cart, validate owned selections, check base+variant stock once, immutable snapshots, owner denial and status vocabulary. Existing Gateway duplicate may return 409 IDEMPOTENCY_IN_PROGRESS; retry only that precise supported result after the winner completes | New proof syntax/lint passes; actual live execution pending new images. Existing native HTTP/gRPC test inputs already include keys/current selections and need no new body fields.                                                               |
| Cache/transport boundaries            | apps/gateway/src/http/gateway-route-policy.ts; existing idempotency HTTP tests and SDK client                                                                           | Preserve Gateway in-flight rejection and existing idempotency cache. New live proof permits only its named concurrent rejection, then requires exact successful replay and stock counters                                                                                            | Reviewed existing policy before handoff. Owner concurrency/restart is real SQL evidence; Redis-loss and service-outage/restart transport proofs remain separately pending.                                                                       |
| Seeds/config/build/deployment         | Empty Order seed, D1 demo runner, env schema, Compose release/local and backend Dockerfile                                                                              | No generic workflow configuration, new service, provider mode or seed reset. Existing scoped build args/copy/generation cover new modules. Ecommerce fixture completion remains Batch 4                                                                                              | Bake --print confirms exactly product-service/order-service/gateway selectors. No build run by agent; use normal cache sequentially after native gate.                                                                                           |
| Docs/roadmap                          | Focus, adopted TODO, Order/Product docs and prior stock report                                                                                                          | Record approved payment policy and distinguish vocabulary from payment attempt implementation; combined Batch 2 gates remain unchecked until runtime proof                                                                                                                           | Updated with actual pass/pending scopes; no production payment claim or provider integration added.                                                                                                                                              |

## Actual focused evidence

- Order unit-only config: 8 suites, 89 tests passed. Gateway Order mapper/input
  tests: 2 suites, 16 tests passed. Preflight: 4 suites, 21 tests passed, including
  OpenAPI/SDK freshness, 77 routes, 47 profiles, preserved 63 Gateway-protected
  RPCs/59 R5 receivers/four post-R5 Gateway deferrals and three separate private
  stock receivers. No source hash was blindly updated for a string status.
- Order/Gateway/SDK types pass; generated browser and React Native consumers
  accept PAYMENT_PROCESSING. Scoped new owner/helper/Gateway/SDK/live-proof lint
  has no errors/new warnings. Five known matcher warnings remain: four in Order
  error fixtures and one in resource authorization. SQL proof syntax/lint passes.
- Actual two-database proof: same-key concurrency and distinct-key one-owner
  winner, one stock effect, original result after a new service instance and
  new Cart, receipt-write rollback and compensation, reserve response loss,
  cancellation outage/recovery and Cart freeze, committed finalization outage,
  hidden pending orders/admin denial, pending receipt retention, completion-started
  replay window, ambiguous committed response, unavailable commit-decision read,
  expired lease/fenced old executor, reserve arriving after cancellation tombstone,
  variant/unmanaged inventory, status vocabulary and expired consumed key all pass.
  Original Order status/snapshots replay despite later PAYMENT_PROCESSING change.
- Pre-handoff fixtures caught and corrected internally: historical legacy Cart
  fixture cannot be inserted after selectionKey becomes required; it now inserts
  before its original Cart migration. A retry fixture cannot set leaseUntil on a
  null-token row; it now supplies/preserves a complete expired lease pair. Exact
  first-error checks and schema constraints were retained and the proof rerun.
- Current Cart and receipt proofs rerun successfully against their current-driver
  migration tails. Each cleaned its own disposable database. The two-database
  coordination proof cleaned both owned databases. No live demo database reset,
  application migration, image recreation or real payment was performed.

## Operator handoff receipt

Final review also covered publication disappearing between quote and reserve:
the reserve adapter now reports the existing deterministic 409 selection conflict
and compensates safely, preserving the Cart. New unit and real two-database race
cases pass. The final Order unit run is 8 suites/89 tests. The prepared live proof
also includes free, unmanaged merchandise to exercise omitted/default false/zero
wire values, in addition to tracked base/variant inventory. Its actual execution
remains pending deployment.

```text
Requirement/finding: connect proven stock owner to durable Order commit/recovery;
  add approved PAYMENT_PROCESSING vocabulary without fabricating provider events.
Changed paths/consumers: before-edit map and completed review above.
Cheap gates: format/diff, scoped lint/types, Order 89 tests, Gateway 16 tests,
  preflight 21 tests, generated browser/native consumers all pass.
Actual SQL: new populated migration rollback/constraint controls and real Order+
  Product Prisma coordination pass; updated Cart/receipt proofs pass.
Readiness: PostgreSQL accepts connections; current images are earlier source.
  New live proof is prepared, not executed against old images.
Known deferrals: native Order migration, application deployment, builds, actual
  signed RPC and live proofs pending. Redis-loss/outage/restart transport proof
  remains separate. Payment attempt/failure policy implementation belongs to
  Batch 3/adopted payment scope; current checkout is DEMO_NO_PAYMENT.
Next operator command: pnpm db:verify:order
Expected: clean native deploy/rerun/status and current database contracts pass;
  no exact counts/warnings are claimed before operator output.
Next grouped cycle after that pass: cached sequential Product/Order/Gateway
  builds, pinned Product+Order application migrations, recreation/readiness,
  native Order/Gateway suites and Checkout/Cart/F3 live integration proofs.
Readiness: READY FOR NAMED NATIVE ORDER MIGRATION PROOF.
```

## Native verification result and grouped deployment handoff

2026-10-14: Salar replied "done" to `pnpm db:verify:order`. Record this as
operator-reported native Order verification passed; exact output, counts and
warnings were not supplied. This verifies the disposable migration lane, not
deployment to the application database or rebuilt service behavior. The earlier
receipt above remains the historical handoff.

```text
Requirement and consumer trace: unchanged from the completed map above.
Changes since the preceding receipt: evidence/documentation only; no source,
  fixtures, generated contracts or test expectations changed.
Cheap gates and owner SQL evidence: preceding passing results remain applicable.
Native evidence: Product and Order verification operator-reported passed.
Build scope: bake print confirms product-service, order-service and gateway;
  run cached builds sequentially, without TURBO_FORCE or no-cache.
Application migrations: node scripts/backend.mjs database migrate-deploy product;
  pnpm db:migrate:order. Both use the existing pinned Docker database lane.
Recreation: docker compose up -d --no-build --wait --wait-timeout 300 --no-deps
  product-service order-service gateway; then pnpm backend:health.
Readiness: current source needs rebuilt images; health after recreation must
  pass before running live proofs. Do not treat earlier health as this result.
Broad proofs, operator-owned and pending:
  pnpm --filter @nebula/order-service test:e2e
  pnpm --filter @nebula/gateway test
  pnpm test:d2:checkout:live
  pnpm test:d2:cart:live
  pnpm test:f3:live
Fixture boundary: Checkout live requires an empty seeded customer Cart, cleans
  its owned Product/Cart/session records and retains demo Order/receipt history.
Failure handling: run sequentially; stop on the first failure and return its
  first meaningful error. Do not continue to live tests after failed readiness.
Remaining separate proofs: Redis cache loss and actual outage/restart transport;
  payment-attempt lifecycle remains Batch 3. Whole Batch 2 is still open.
Readiness: READY FOR NAMED CACHED BUILD, MIGRATION AND DEPLOYMENT HANDOFF.
```

## Runtime failure inspection

Salar supplied two failed live results: Checkout refused one existing customer
Cart item; Cart add returned 409. Direct inspection found all 16 containers
healthy, but `nebula_products` had only the ten pre-stock migrations and no
`CheckoutStockIntent`/`CheckoutStockLine` tables. PostgreSQL logs identify the
first error as missing `public.CheckoutStockIntent`. Order has one CANCELLING
attempt for the seeded customer, no Order committed, with repeated recovery
failures. This active attempt explains the Cart mutation conflict. Healthy
processes did not establish the required application schema state.

Classification: confirmed application deployment gap; no evidence that the
coordination contract needs weakening. Inspect the pinned migration selector,
apply the missing existing Product migration, let signed recovery finish, and
verify terminal state before touching any leftover test Cart item. Preserve the
attempt and its cancellation tombstone. Both live proofs remain failed/pending;
no unreported preceding broad suite is marked passed.

Inspected consumers: `scripts/backend.mjs` (`runLocalDatabaseMigration` and
dispatch); Product stock migration/schema/service; Order coordinator/recovery
and Cart guard; native HTTP/gRPC fixture callers; Gateway Checkout and Cart
live scripts. No implementation or generated contract changes at this point.

The previous direct `node` handoff was a confirmed command defect:
`pnpmInvocation` deliberately requires `npm_execpath`, which a pnpm package
script supplies; neither bare Node nor `pnpm exec node` supplies it here.
Reproduced `prisma_migrate-deploy_product-service_nebula_products_failed_to_start`
before any migration execution. Correct the handoff through root Product
deploy/status scripts, preserving the existing pinned selector.

Before-edit impact map: `package.json` adds Product shortcuts;
`scripts/backend.test.mjs` extends the existing inherited-URL protection test
to Product; `scripts/backend.mjs` is unchanged (its safety requirement works);
`docs/services/product-service.md`, `docs/current-focus.md` and this report
record correct usage and actual application state. Gateway/owner/RPC/schema/
OpenAPI/SDK/image consumers are unchanged: no behavior or contract is edited.
The native leftover Cart item is traced to `OrderSvc gRPC Product`; it is not
an arbitrary customer item. Remove it through the owner API only after recovery
is terminal, retaining Order attempts/receipts/stock history.

## Command correction and live rerun receipt

Actual correction: `pnpm db:migrate:product` applied migration
`20261014000100_checkout_stock_intents` to `nebula_products` at port 15432.
The repeat deploy reported no pending migrations; `pnpm db:status:product`
reported 11 migrations and an up-to-date schema. The existing Prisma package
configuration deprecation warning remains. Order's two new migrations are also
recorded finished in its application database.

The existing Order recovery worker then completed its signed Product call:
attempt `7b0afdf2-5851-4ab8-8056-db4933938931` and matching Product intent are
both CANCELLED, with no committed Order. No DB edits bypassed recovery. A
one-off Gateway cleanup logged in as the seeded customer, checked exact owner,
sole item ID, Product ID and quantity, removed only the traced native gRPC test
Cart item, verified an empty Cart and logged out its own session. Product and
Order history were retained. All 16 containers were observed healthy.

```text
Impact review: package scripts and Product/Order target-pinning test updated;
  documentation/current-focus/TODO corrected. Existing runner, owner behavior,
  generated contracts and image contents unchanged; no rebuild needed.
Checks: changed files formatted, Node syntax and diff checks pass. Three focused
  Docker migration command tests pass, including Product/Order inherited URL
  isolation. Actual pnpm script deploy/rerun/status exercised successfully.
Lint limitation: scripts/backend.test.mjs has 16 findings outside the edited
  migration test (regex spacing and missing Node globals); no finding occurs
  in the changed test. These are not concealed or expanded into unrelated work.
Preflight/types/contract evidence: prior passes remain applicable; no owner,
  Gateway, protobuf, OpenAPI or generated client code changed in this correction.
Proof status: failed live results retained; corrected full/live runs pending.
Next operator commands, sequential, stop at first failure:
  pnpm --filter @nebula/order-service test:e2e
  pnpm test:d2:checkout:live
  pnpm test:d2:cart:live
  pnpm test:f3:live
Reason: earlier native checkout attempted missing Product tables; rerun it and
  the named live paths against the now-migrated application, without rebuilding.
Readiness: READY FOR CORRECTED ORDER/CHECKOUT/CART/F3 INTEGRATION RERUN.
```

## Ownership probe fixture correction

Salar's corrected Checkout live run passed exact base/variant/free Order and
single stock consumption, then failed at an expected 404 with actual 403. The
probe used `admin-web-local`/admin credentials on a personal customer route.
`apps/gateway/src/contracts/routes/order.routes.ts` declares `orders.get` as
consumer-only with actor user; `route-policy.core.ts` preserves that application
boundary. `apps/gateway/test/order-http.spec.ts` already explicitly covers this
admin application denial. This is a confirmed live fixture defect, not an owner
authorization defect. Preserve admin denial and add an ordinary other customer
to test the existing ownership 404 rather than replacing its expectation.

Before-edit trace: `packages/api-client/test/d2-checkout-live.mjs` changes fixture
login, assertions and session cleanup; Auth registration/login/me/logout DTOs,
route manifests and generated operations were inspected for current bodies and
keys. `apps/order-service/src/order/order.controller.ts` and the existing owner
query remain unchanged. Root/package commands and Gateway/SDK/schema/protobuf
generation stay unchanged; no new operation or image build. Documentation here
and current-focus record rerun scope. A dedicated ordinary fixture account is
reused across runs; absent accounts are registered through Gateway only, without
password resets. There is no public User delete API, so this reusable identity
is retained; its newly opened refresh session is logged out during cleanup.

Post-change review: admin application 403 and distinct user 404 are both explicit
assertions, with `auth_me` verifying role user and a different owner ID. Existing
Order/stock/replay/status/cleanup assertions are retained. Other-customer refresh
cleanup participates in the same AggregateError; no logout failure is hidden.
Default reusable fixture is `d2-checkout-other@example.com`; optional credentials
are `D2_CHECKOUT_OTHER_USER_EMAIL` / `D2_CHECKOUT_OTHER_USER_PASS`. Login failure
other than 401 does not trigger registration. Existing account/password conflict
fails without password overwrite. No public account-deletion operation exists.

```text
Changed file/consumers: live fixture and current-focus/report only; audited route,
  Auth DTO/generated operations and Order owner boundary stay unchanged.
Cheap checks: Prettier, Node syntax, scoped ESLint and diff check pass.
Contracts: pnpm test:preflight passes, 4 suites/21 tests; artifacts fresh.
Focused actual live proof: reused an existing customer Order, registered/logged
  in the separate user through Gateway, verified role/user identity difference,
  other customer GET returned 404, admin application GET returned 403.
  All three probe sessions logged out; reusable ordinary identity retained.
SQL/image changes: none; no rebuild, migration or broader owner rerun needed
  solely for this fixture fix. Prior backend evidence retains its actual scope.
Full proof: operator-owned Checkout rerun remains pending; the earlier partial
  run is not promoted to a completed Checkout integration pass.
Next command: pnpm test:d2:checkout:live; stop on failure. Cart/F3 only after
  this passes, preserving any supplied passing regression evidence.
Readiness: READY FOR CORRECTED CHECKOUT LIVE PROOF.
```

## Corrected Checkout live result

Salar reports `pnpm test:d2:checkout:live` ran with no errors after the ownership
fixture correction. Record the full corrected Checkout integration as
operator-reported passed; exact stdout was not supplied. The script retains
stock-once, exact totals, base/variant/free selections, changed-intent conflict,
admin-application denial, other-customer ownership denial, replay/new-Cart
preservation, immutable snapshots, status vocabulary and owned cleanup checks.
This result does not certify deliberate Redis loss or service outage/restart.

No source or fixture changes follow this receipt. The passing preparation and
21-test preflight remain applicable. Current Cart/F3 regression results were
not supplied; if not already completed, the remaining commands are
`pnpm test:d2:cart:live` then `pnpm test:f3:live`, sequentially, stopping on any
failure. Do not repeat completed Checkout or image builds. Whole Batch 2 stays
open for the remaining named integration and failure/recovery evidence.

## Cart/F3 result and remaining recovery preparation

Salar reports both remaining commands passed: `pnpm test:d2:cart:live` and
`pnpm test:f3:live`. Exact stdout/counts were not supplied. Preserve these and
the corrected Checkout live pass; do not rerun them without a relevant change.

Before-edit requirement: prove completed receipt replay after loss of the exact
Gateway checkout cache entry and real dependency/process interruptions. Existing
owner SQL proofs exercise ambiguous commit, lease fencing and compensation,
but mock transport does not establish live restart recovery. Add an optional
`--recovery` mode to the existing owned Checkout fixture, not production hooks.

| Owner/symbol           | Exact consumers inspected                                                                                                                                                                                                | Decision                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout live fixture  | `packages/api-client/test/d2-checkout-live.mjs`; `packages/api-client/package.json`; root `package.json`                                                                                                                 | Add recovery helper/mode and named command; preserve normal proof and all existing assertions.                                                                                  |
| Recovery orchestration | New `packages/api-client/test/d2-checkout-recovery.mjs` and `.test.mjs`; existing `media-processing-recovery.mjs` and `.test.mjs`                                                                                        | Bounded Compose/read reconnects and restoration on partial failures; do not reuse Media fixtures or change Media proof.                                                         |
| Cached replay          | `apps/gateway/src/contracts/idempotency.ts`; `apps/gateway/src/state/gateway-idempotency.service.ts`; `gateway-redis.service.ts`; `apps/gateway/src/http/gateway-route-policy.ts`; `application/application-registry.ts` | Compute exact key through the running Gateway's own function/config and delete only the owned key, never flush Redis. Preserve actor/application scope.                         |
| Durable recovery       | `apps/order-service/src/order/order.service.ts`, `checkout-coordinator.ts`, `checkout-recovery.ts`, `checkout-receipt.ts`; Product `checkout-stock.service.ts` and stock migration                                       | Unchanged owners. Test-only SQL fault on FINALIZED update is scoped to an owned Product; retain committed intent/order/receipt and observe worker recovery after Order restart. |
| Contracts / evidence   | SDK generated operations, Gateway routes/Auth DTOs; `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, Order/Product service docs and this report                                                                           | No route/DTO/protobuf/OpenAPI changes or image rebuild. Update evidence and keep deliberate runtime execution operator-owned.                                                   |

Planned live controls: delete and confirm the exact completed cache entry;
replay during Product outage without another decrement; fresh checkout during
that outage must return 503 without creating an attempt or changing Cart.
Restore Product, then inject an owned finalization fault: reserve/local commit
succeed but checkout returns 503, hidden unfinished Order remains committed and
stock remains HELD. Stop Order, remove fault, recreate its existing image and
observe COMPLETED/FINALIZED plus one Order/receipt/decrement. Evict the failed
key's cache state and replay the same completed request. Temporary SQL fixtures
are test orchestration, never cross-service database reads in an API contract.
All deliberate stops/fault installation are marked for restoration before the
action; finally attempts every restoration and aggregates primary/cleanup errors.

## 2026-10-19 resumed preparation and handoff

User requested container restart and continuation. Docker was available with
five infrastructure containers healthy and the application containers stopped.
The installed Compose does not support `start --wait`; that command failed
without starting anything. The existing no-build `up --wait --no-deps` lane
successfully started the eleven application services through their declared
health dependencies. No images were rebuilt, databases reset or orphan init
containers removed. Final observation: all 16 active containers healthy,
`pnpm backend:health` all eleven service checks pass, Gateway readiness is 200,
seeded customer Cart is empty and no recovery test trigger is installed. The
readiness probe revoked its own mobile session.

Post-change consumer review: recovery helpers/mode and root/package named
commands are connected; `packages/api-client/package.json` includes the new
focused recovery test file in its normal test script. Existing client, Media
recovery, browser and React Native assertions remain intact. The additional
`scripts/db/verify-d2-checkout-recovery-fixture.mjs` applies real Product
migrations in a guarded disposable database, inserts valid controls, verifies
the exact P0001 finalization fault for the owned Product only, proves an
unrelated intent finalizes normally, removes the fault and proves finalization
then succeeds. Its actual proof passed and the owned database was dropped.
Early internal control inserts caught missing description/category fields;
these were supplied before the intended negative assertion was evaluated.
No missing-column failure was accepted as the intended fault.

Actual current runtime helper probe: primed a synthetic completed Redis value
with a random actor/key under the running Gateway's own configured mobile
application and key function. The actual eviction helper deleted exactly one
entry; its repeat returned zero. The synthetic entry had a TTL and finally
cleanup. No unrelated Redis entries or Auth/rate state were deleted. Both actual
Order-attempt and Product-intent inspection helpers returned null for the owned
random IDs as expected. This validates preparation helpers, not the deliberate
outage scenario.

The bounded completion poll now allows 150 seconds so an interrupted worker's
existing 120-second lease can expire plus a worker tick/RPC. A focused simulated
122-second recovery test proves that legitimate lease delay is accepted; the
owner lease and production recovery code were not altered. Only deliberate
post-restart reads reconnect, with bounded probes and preserved transport cause;
completed mutations replay only their original request/key after durable state
is established. HTTP recovery requests and SQL/Compose operations have bounds.

```text
Requirement: complete the named live cache-loss/outage/process-restart evidence
  for the implemented D2 coordinator, without new production hooks or images.
Affected paths/review: exact map above plus the dedicated disposable fixture
  verifier and normal package test-script consumer; current-focus, adopted TODO
  and Order/Product service docs updated. No route, policy, protobuf, generated
  contract, owner migration, production source or dependency change.
Cheap gates: formatting/diff, scoped ESLint, Node syntax and SDK/browser/native
  types pass. No new lint warnings. Existing CRLF notices remain visible.
Focused behavior: 27 client/Media/D2 recovery tests pass with no skips, including
  all 11 new D2 orchestration/restoration/read/lease tests.
Contract gate: pnpm test:preflight passes, four suites/21 tests; generated
  OpenAPI/client freshness passes. No inventory hashes/counts were changed.
SQL/runtime preparation: exact SQL fault controls pass in owned disposable DB;
  running-image cache-key helper and SQL inspectors pass; final backend health,
  16 container states, Gateway readiness and empty customer Cart verified.
Source/image decision: test-only edits; existing images contain the production
  functionality. No build or application migration needed for this command.
Pending proof, operator-owned: pnpm test:d2:checkout:recovery:live
Expected: existing Checkout checks plus four recovery checkpoints and owned
  cleanup pass; Product/Order end healthy, no temporary trigger remains, and
  one finalization/decrement per committed intent. Demo Order/receipt history
  and the reusable other-customer identity are retained.
Scope: deliberate Product outage and Order restart; removal of exact checkout
  cache entries, not wholesale Redis loss/Auth outage. Domain ambiguous commit,
  lease fencing and cancellation retain their separately scoped owner proofs.
Handoff: command deliberately stops/restores Product and Order, so Salar runs
  it. Preserve current normal Checkout/Cart/F3 passes; stop on a proof failure.
Readiness: READY FOR NAMED CHECKOUT RECOVERY LIVE PROOF. BATCH 2 STILL OPEN.
```

## Recovery run: missing quote-read deadlines (2026-10-19)

Salar's live recovery run passed the normal Checkout checkpoints and completed
owner replay after exact cache eviction while Product was stopped. The fresh
checkout then exceeded the fixture's 60-second HTTP bound instead of returning 503. Direct inspection confirms all sixteen containers restored and healthy,
no temporary finalization trigger installed and no active checkout attempts.
The reported failure is before the finalization fault/restart stage.

Confirmed defect: Order's `fetchProductOrThrow` and `getShopCurrency` use
unbounded `firstValueFrom` calls; `getCartTtlMs` has an intentional fallback but
also waits without a timeout. The shared signed client forwards optional native
CallOptions unchanged, and no default deadline is supplied on these reads.
Existing reserve/finalize/cancel already provide native deadlines and a local
10-second Observable timeout. Do not increase the live fixture timeout or alter
its required 503. Narrow correction: bound only Order's Product/Settings reads
using the existing 10-second budget, map elapsed/native deadline to dependency
unavailability and preserve all other error translations and TTL fallback.

Before-edit consumer map:

| Changed symbol                    | Exact inspected consumers                                                                                                                                                                                        | Action                                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order Product/Settings reads      | `apps/order-service/src/order/order.service.ts`; `src/product-client.module.ts`, `src/settings-client.module.ts`; Cart add/update/get/remove and `prepareCheckout`                                               | Add read deadline and cancelling Observable timeout; keep 30-minute TTL fallback. No mutation/receipt schema change.                                              |
| Signed call options/error mapping | `packages/clients/src/s2s-metadata.ts`, `product.client.ts`, `settings.client.ts`; `packages/grpc-auth/src/grpc-error.util.ts` and `s2s.ts`                                                                      | Preserve shared transport and global mappings. Apply read deadline policy locally in Order; existing stock RPC behavior unchanged.                                |
| Focused tests/fixtures            | `apps/order-service/test/checkout.unit.spec.ts`, `test/utils/checkout.fixture.ts`, `test/order.error-translation.unit.spec.ts`, `test/cart-mutations.unit.spec.ts`, `jest.unit.config.ts`                        | Add stalled-read unsubscribe/deadline/no-effect and native deadline regression checks; revisit signed metadata/options assertions and preserve existing fixtures. |
| External and live consumers       | Gateway `src/order/gateway-order-api.service.ts`, `src/contracts/routes/order.routes.ts`; SDK `test/d2-checkout-live.mjs`, `d2-checkout-recovery.mjs`, `.test.mjs`; existing Cart/coordination SQL proof drivers | Preserve required 503, signed authority, operation inventories and restoration checks. No DTO/proto/OpenAPI regeneration; rerun applicable contract preflight.    |
| Build/evidence                    | `docker-bake.hcl`/backend scope, root/package commands; current-focus/TODO, Order service doc and this report                                                                                                    | Only Order source/image changes. Cached Order build and live recovery rerun stay operator-owned after cheap gates; no migration, Product or Gateway rebuild.      |

Post-change review: all three read call sites pass native CallOptions and use
the local cancelling timeout helper. Native DEADLINE_EXCEEDED and local elapsed
timeout map to dependency-specific 503; the shared transport/mappings and stock
write helper are unchanged. Existing signed metadata and all Cart/checkout owner
unit regressions pass. Quote mocks in Cart/checkout/coordination SQL drivers
accept the extra optional arguments and return the same Observable facts; no
fixture/schema assertion change or repeated SQL migration proof is warranted.
No shared client generation, wire layout, route/profile count/hash, environment,
Docker build configuration or SDK change. The recovery fixture keeps its
60-second outer deadline and required 503; no assertion was weakened.

Five focused regression cases cover both stalled Product/Settings reads,
unsubscription on timeout, exact native deadlines, both native deadline errors,
no attempt/stock/local commit on quote failure and the bounded TTL fallback.
Internal preparation caught structuredClone rejecting Prisma Decimal objects;
the preservation assertion now compares the full serialized Cart before/after,
retaining date/amount/state facts without attempting to clone constructor code.
All passing evidence below is from the corrected tests.

```text
Finding: fresh checkout during Product outage waited beyond the fixture's
  60-second HTTP deadline; the three Order read paths lacked native/local bounds.
Changed owner/consumers: order.service.ts; checkout.unit.spec.ts and
  order.error-translation.unit.spec.ts; current-focus/TODO/Order docs/report.
  Exact unchanged/deferred consumers are reviewed above.
Cheap gates: Prettier, diff check, Order build types and scoped ESLint pass;
  four existing error-fixture warnings remain, with no new findings.
Focused behavior: all 8 Order unit suites / 94 tests pass, no skips.
Contract gate: pnpm test:preflight passes, four suites / 21 tests, artifacts fresh.
Existing database evidence: unchanged schema/transactions/SQL; previous owner
  proofs retained with their original mock-transport scope. No DB reset/migration.
Observed runtime: all sixteen services restored healthy; no active Order attempt
  and no scoped finalization trigger remain. Current image predates this fix.
Build scope: bake print confirms BACKEND_BUILD_SERVICE=order-service; cache
  retained. Do not build Product/Gateway or force a broad backend build.
Next operator sequence, stopping on first failure:
  docker buildx bake order-service --load
  docker compose up -d --no-build --wait --wait-timeout 300 --no-deps order-service
  pnpm backend:health
  pnpm test:d2:checkout:recovery:live
  pnpm test:d2:cart:live
Expected: fresh Product-outage checkout returns 503 before the outer abort,
  no attempt/stock effects; remaining recovery and affected Cart checks pass.
Limits: actual image/RPC outage rerun is pending; the partial recovery run is
  retained as partial evidence and does not close whole Batch 2.
Readiness: READY FOR NAMED ORDER-ONLY BUILD AND RECOVERY/CART LIVE PROOFS.
```

## Completed-replay socket reconnect preparation (2026-10-19)

Salar reports the Order build succeeded. The next recovery proof passed normal
Checkout/ownership/new-Cart checkpoints, then hit `TypeError: fetch failed`
with cause `UND_ERR_SOCKET` at the completed replay immediately after stopping
Product. This run did not reach the fresh-outage read-deadline assertion; it
does not invalidate or certify that fix. Inspection confirms sixteen containers
healthy after restoration. No server crash is established by this client error.

Confirmed fixture gap: completed purchases are explicitly replayable, but the
recovery runner sends these supported replays without bounded socket reconnect.
Its deliberate stop may outlive the HTTP connection; the exact reason the peer
closed is not established. Keep the SDK free of global mutation retries and
keep fresh failure assertions strict. Only retry the original Checkout key/body
after proving its Order attempt is COMPLETED, and only for the observed closed
socket transport failure. HTTP failures, deadline aborts, other transport causes
and incorrect successful responses must still fail immediately.

Before-edit impact trace: `packages/api-client/test/d2-checkout-recovery.mjs`
owns the three completed replay call sites and existing read reconnect;
`d2-checkout-recovery.test.mjs` owns orchestration/restoration regressions;
`d2-checkout-live.mjs` supplies separate raw request/unwrap adapters with a new
abort signal per request. SDK `src/client.ts` forwards the supplied key/body
and returns status/error without automatic retries. Existing Media reconnect
helpers are read-only and stay unchanged. Root/package commands and the normal
test script already include the D2 file; no inventory/count/hash, contract,
generated artifact, migration, production source or image change is needed.
Current-focus/TODO/Order docs and this report track the corrected handoff.

Post-change review: all three completed replays use the narrow helper. The first
reads the exact user/key's durable attempt before evicting cache; the other two
use the worker completion result already inspected after restart. All full
response/stock/Cart assertions remain. Maximum three attempts with 250ms waits,
same original key/body; only `fetch failed` with cause UND_ERR_SOCKET reconnects.
Native HTTP failures (including 409/503), deadline aborts, other network causes,
nonterminal evidence and wrong successful Order IDs fail without retry. Fresh
Product-outage and post-commit fault Checkout submissions still use raw request
once; no client SDK retry policy changed. Existing normal test script already
includes this file; package commands/schema/generated artifacts remain unchanged.

The added transport regression uses a real local HTTP server: it receives and
destroys the first SDK POST socket, then returns the expected Order on reconnect.
Both requests' original idempotency key and JSON body are checked. Additional
tests preserve the final cause on exhaustion, reject the wrong successful Order,
refuse nonterminal records and prove a fresh checkout socket error is not retried
while Product restoration is still attempted. These are focused transport and
orchestration evidence; they do not replace the full Docker recovery proof.

```text
Requirement/paths/consumer review: completed-replay socket gap and exact map
  above; recovery helper/test plus docs only. Production source unchanged.
Cheap gates: format, scoped ESLint, Node syntax and diff check pass.
Focused checks: 20 D2 recovery tests; combined client/Media/D2 run 36/36 pass,
  no skips, including the real local HTTP socket-close regression.
Contract gate: pnpm test:preflight passes, four suites/21 tests; artifacts fresh.
Runtime review: active Order image equals rebuilt latest image
  sha256:3266ace6daa7578baab0a9883831acc0cb5e9a2e3a7b0b9c7df53d48b4685128;
  deployed dist/order/order.service.js contains bounded readResponse helper.
  All sixteen containers healthy, all eleven backend health probes pass;
  no active attempts and no temporary finalization trigger remain.
Build decision: test-only correction; do not rebuild images or rerun migrations.
Next operator commands, sequential, stop on failure:
  pnpm test:d2:checkout:recovery:live
  pnpm test:d2:cart:live
Pending: full fresh-outage deadline/finalization/restart live checkpoints are
  not yet certified by the failed run; whole Batch 2 remains open.
Readiness: READY FOR COMPLETED-REPLAY RECONNECT AND RECOVERY/CART LIVE RERUN.
```

## Batch 2 closure (2026-10-19)

Salar reports both final commands passed: `pnpm test:d2:checkout:recovery:live`
and `pnpm test:d2:cart:live`. Exact stdout/counts were not supplied; record these
as operator-reported full passes, retaining the preceding failure/correction
receipts. The recovery script asserts normal Checkout behavior, completed owner
replay after exact cache eviction during Product outage, bounded fresh failure
with Cart/stock preserved, scoped post-commit finalization failure, hidden
unfinished Order/frozen Cart, worker recovery after Order restart, one Order/
receipt/decrement and durable same-key replay after a second cache eviction.
Its cleanup checks and restoration remain part of the reported pass.

Combined with the recorded actual owner SQL rollback/concurrency/lease proofs,
native migration/deployment evidence, 94 Order unit tests, 36 client/recovery
checks and 21 preflight checks, the remaining two Batch 2 feature items close.
These scoped cache-entry-loss and Product/Order tests do not claim wholesale
Redis/Auth outage coverage, production provider integration or D2/B0 release
completion. Batch 3 owns remaining user/admin reads, permitted transitions,
concurrency/audit and the already approved payment-attempt behavior. Batch 4
owns the consolidated contracts/migrations/fixtures/exit evidence. No repeated
build, migration or passing proof is requested without a relevant change.

Post-proof read-only check confirms all eleven backend health probes pass and
all sixteen active containers are healthy. Both residual checks return zero:
temporary finalization triggers and active PREPARED/ORDER_COMMITTED/CANCELLING
attempts. Current-focus and adopted TODO now check both remaining Batch 2
items complete and select Batch 3; D2/B0 exit gates remain unchecked. Only
evidence/documentation changed after this result; no extra suite is required.

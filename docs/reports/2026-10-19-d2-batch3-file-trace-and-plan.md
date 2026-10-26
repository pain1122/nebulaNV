# D2 Batch 3 - Order reads, transitions and stock effects

Date: 2026-10-19. Status: approach and before-edit consumer trace recorded;
implementation and proof pending. Batch 2 is closed. This report changes no
production behavior and requests no build or repeated passing suite.

## Verified baseline and findings

| Finding                                                                                                                                     | Classification and inspected evidence                                                                                                                                             | Treatment                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal Order reads already enforce verified ownership and hide unfinished Checkout attempts. Gateway also checks returned owner/ID.       | Working mechanism: Order `listOrdersForUser`/`getOrderForUser`, HTTP/gRPC user guards and Gateway `list`/`get`.                                                                   | Preserve these predicates and distinct application boundaries; prove cross-user denial again only when affected.                                                                      |
| Admin status mutation already has admin/root-admin authorization, but admin list/detail do not exist in the owner RPC or Gateway inventory. | Confirmed implementation gap for the adopted Batch 3 item. `order.proto`, `order.routes.ts` and Gateway tests expose status only; one test explicitly asserts no AdminListOrders. | Add separate admin reads, not a bypass flag on customer reads. Update the old absence assertion to cover the new protected surface.                                                   |
| Any enum-valid status can currently replace any other status.                                                                               | Confirmed gap: `updateOrderStatusAdmin` directly updates status; HTTP/gRPC validate enum, not prior state.                                                                        | Pin the transition table before coding; reject illegal reversal, terminal edits and unresolved-attempt conflicts.                                                                     |
| Order has no mutation version or transition audit history; status owner method receives only ID/status.                                     | Confirmed gap: Prisma Order fields and the two controllers/service call chain. Existing role guards work, but do not supply owner audit attribution.                              | Add optimistic concurrency and atomic owner audit facts; use verified actor/context, never body-supplied actor authority.                                                             |
| Gateway caches keyed status writes, but Order receives no status idempotency key.                                                           | Confirmed owner replay gap once transitions gain audit/stock effects: Gateway UpdateOrderStatus currently sends only ID/status.                                                   | Forward the validated key and retain an owner replay record bound to actor, target and exact intent; cache loss must not duplicate an effect/audit entry.                             |
| Checkout completes a stock intent as FINALIZED. Current Product cancellation restores only HELD intents and conflicts against FINALIZED.    | Confirmed mismatch with the newly approved unpaid-Order cancellation requirement; `CheckoutStockService.finish` and terminal reference detachment.                                | Preserve working Checkout compensation. Add the narrow Product-owned, idempotent restoration needed for committed Order cancellation; do not relabel FINALIZED as an unfinished hold. |
| PAYMENT_PROCESSING is accepted vocabulary, not an implemented payment attempt.                                                              | Confirmed implementation gap documented in Batch 2: generic admin patch currently has no attempt binding/result validation.                                                       | Implement the minimum demo attempt semantics required by the approved policy. Do not invent provider settlement or build real payment integration.                                    |

Gateway's configured protobuf loader uses defaults. Its Order list currently
maps `result.data` directly; verify real empty-list codecs under those actual
options before calling this a defect or changing fallback behavior. Existing
unpaginated customer reads are not a reason to expand this slice into search.

## Approved behavior and boundaries

- Personal reads remain restricted to the verified customer. Admin list/detail
  are separate protected APIs and never depend on an invented customer identity.
- New admin listing is bounded and deterministically ordered; reuse existing
  pagination conventions, with only useful status/customer filters.
- A stale mutation conflicts rather than overwriting a newer state. A repeated
  successful key/intent returns its original outcome without another audit or
  stock effect; changed intent with that key conflicts.
- Record previous/new status, verified actor, time, request/key correlation and
  Order version in the owner transaction. Keep commercial snapshots immutable.
- **User approved here:** explicitly cancelling an unpaid demo Order restores
  its already deducted stock exactly once. Concurrent repeats, lost responses
  and process restart must not double-credit it.
- **Previously approved:** a confirmed failed or customer-cancelled payment
  attempt releases its reservation and returns the Order to PENDING. Retrying
  revalidates current facts and reserves again. An uncertain result remains
  PAYMENT_PROCESSING until reconciled. Explicit Order cancellation is CANCELLED.
- Do not conflate payment-attempt cancellation with cancelling the Order. A
  generic status PATCH must not claim the required stock effect happened.
- Only unpaid cancellation has its stock policy approved. Do not silently add
  paid refunds/returns or allow a fulfilled Order to be reopened. Keep real
  provider integration, tenants, warehouse expansion and frontend work deferred.

## Execution order

1. **Read surface.** Preserve personal list/detail and completed-attempt filters;
   add admin list/detail end to end with bounded list input, deterministic
   ordering, empty-list codec checks and role/application denial tests.
2. **Transition contract and owner controls.** Pin every permitted edge and its
   authority/effect before implementation. Then add version checks, validated
   command input, durable replay and atomic audit history. No plain enum patch
   should bypass a required payment/stock operation. Preserve the existing
   explicit DEMO_NO_PAYMENT meaning of manual demo statuses.
3. **Required stock/payment effects.** Implement the approved unpaid cancellation
   restoration and minimal demo payment-attempt binding. Distinguish a held
   reservation from Checkout's finalized deduction. Use an explicit durable
   operation and Product-owned idempotent effects/recovery, following the working
   Batch 2 pattern without introducing a generic workflow service. Never return
   success for restored stock until its outcome is known. If the relevant
   Product/variant is gone, define a deterministic conflict/recovery result;
   do not fabricate replacement stock rows or silently claim restoration.
4. **One grouped integration handoff.** Finish all affected callers and cheap
   gates before selecting cached image targets. Exercise reads, valid/invalid
   transitions, races, replay/cache loss, actor spoofing, exactly-once restoration
   and failure recovery. Build only the final changed owners/Gateway and stop
   at a genuine broad/live/build boundary for Salar. Do not rerun closed Batch 2
   proofs unless this change touches their assumptions.

The read slice may be reviewed first; consolidate expensive migration/image/live
execution when compatible rather than deploying unfinished transition scaffolds.
Detailed transition/effect rows and exact migration models belong to the
corresponding implementation slice, before its edits, rather than speculative
foundation work now.

## Main files and affected consumers

| Area                             | Exact current paths and required review                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner reads/status/serialization | `apps/order-service/src/order/order.service.ts`, `order.controller.ts`, `grpc/order-grpc.controller.ts`, `dto/order.dto.ts`, `checkout-contract.ts`; preserve owner and completed-attempt predicates, add separate admin handlers and trusted actor/key forwarding.                                                                                                                                                                                                 |
| Owner state/migrations           | `apps/order-service/prisma/schema.prisma`, existing `prisma/migrations/20261014000100_checkout_attempts/migration.sql` and `20261014000200_order_payment_processing/migration.sql`; add new migrations only for the final version/audit/replay/required attempt state. Never rewrite applied migrations.                                                                                                                                                            |
| Checkout/recovery compatibility  | `apps/order-service/src/order/checkout-coordinator.ts`, `checkout-attempt-contract.ts`, `checkout-receipt.ts`, `checkout-receipt-retention.ts`, `checkout-recovery.ts`; original completed Checkout replies must remain immutable after status changes.                                                                                                                                                                                                             |
| Product stock owner              | `apps/product-service/src/product/checkout-stock.service.ts`, `checkout-stock-contract.ts`, `grpc/product-grpc.controller.ts`, `product.service.ts`, `prisma/schema.prisma`; preserve HELD compensation, terminal stock facts, version/variant/unmanaged semantics and deletion guards. Add only the operation needed for approved restoration.                                                                                                                     |
| Wire/shared clients              | `packages/protos/order.proto`, `product.proto`, `packages/protos/scripts/generate.mjs`, generated proto source; `packages/clients/src/order.client.ts`, `product.client.ts`, `checkout-stock.ts`; regenerate using existing generators, append wire fields deliberately and update signed bindings/mocks.                                                                                                                                                           |
| Dormant/active inventory         | `packages/clients/src/dormant-v3.client.ts`, `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`, `packages/clients/test/service-wrappers.spec.ts`, `dormant-v3-wrappers.spec.ts`; new admin RPCs must be explicitly inventoried, including named paused-F4 compatibility deferral if applicable. Preserve old R5 coverage and separately protected Order-only Product effects; no silent additions or activation.                                                 |
| Gateway surface/input            | `apps/gateway/src/order/gateway-order.controller.ts`, `gateway-order-api.service.ts`, `order-api.dto.ts`, `src/contracts/routes/order.routes.ts`, `src/contracts/inputs/order.inputs.ts`, `src/downstream/gateway-grpc-clients.module.ts`; add admin routes without changing personal route policy; keep strict unknown-field/authority denial.                                                                                                                     |
| Gateway/cache contracts          | `apps/gateway/src/contracts/idempotency.ts`, `src/http/gateway-route-policy.ts`, `src/state/gateway-idempotency.service.ts`; preserve existing keyed request hashing/in-flight semantics, forward owner keys rather than treating Redis as durable authority.                                                                                                                                                                                                       |
| Generated/public consumers       | `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`, `test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts`; regenerate with `pnpm api:gen`, inspect actual route/operation/field/count/hash changes and validate typed consumers.                                                                                                                                                                             |
| Owner tests/fixtures             | `apps/order-service/test/resource-authorization.spec.ts`, `order.http-validation.unit.spec.ts`, `order.error-translation.unit.spec.ts`, `checkout.unit.spec.ts`, `checkout-coordinator.unit.spec.ts`, `test/utils/order.fixture.ts`, `checkout.fixture.ts`, `checkout-attempt.fixture.ts`, `http/order.http.e2e.spec.ts`, `grpc/order.e2e.spec.ts`, `jest.unit.config.ts`; add transition/audit tests and update current callers rather than skipping old coverage. |
| Gateway tests/inventories        | `apps/gateway/test/order-http.spec.ts`, `gateway-order-api.service.spec.ts`, `contracts/inputs/order.inputs.spec.ts`, `contracts/route-policy.aggregate.spec.ts`, `contracts/input-profiles.aggregate.spec.ts`, `openapi-contract.spec.ts`, `r5-v3-receiver-inventory.spec.ts`; replace the obsolete no-admin-list assertion with explicit authorized/denied admin-read coverage, preserving personal isolation.                                                    |
| Existing proof drivers           | `scripts/db/verify-d2-coordination.mjs`, `verify-d2-checkout.mjs`, `verify-d2-cart.mjs`, `verify-d2-stock.mjs`; direct admin status calls and stored Order fixtures must adopt final version/actor/key requirements. Preserve SQL controls and clearly separate transport-stubbed owner proof from live evidence.                                                                                                                                                   |
| Live/demo callers                | `packages/api-client/test/d2-checkout-live.mjs`, `d2-checkout-recovery.mjs`, `d2-checkout-recovery.test.mjs`, `d2-cart-live.mjs`, `f3-live-flows.mjs`; migrate the processing-to-pending vocabulary-only probe to the final backed lifecycle. Inspect `scripts/demo/runner.mjs`, `demo.test.mjs`, `apps/order-service/prisma/seed.ts`; complete the reusable ecommerce template under Batch 4 without breaking D1 seeders.                                          |
| Commands/build/docs              | Root `package.json`, `apps/order-service/package.json`, `packages/api-client/package.json`, `docker-bake.hcl`, `docker/backend.Dockerfile`, `scripts/backend.mjs`, `backend.test.mjs`, current-focus/adopted TODO and Order/Product service docs; keep pinned database lane, finite scoped builds and documented heavy handoffs.                                                                                                                                    |

Before introducing an Order version field, explicitly handle old persisted
Checkout receipt JSON that contains no version. Fresh admin reads can return the
current version for concurrency, but replay must not silently rewrite the
original purchase response or default an absent field to a valid mutation token.
Keep field presence/codec and generated response mapping evidence separate from
the owning SQL migration's populated/backfill proof.

## Preparation and proof gate

For each slice, revisit this table with updated/unchanged/deferred decisions and
record concrete results in the execution report. Required cheap gates are
format/diff, scoped lint/types, owner/controller/codec/fixture checks, proto and
OpenAPI/client freshness and `pnpm test:preflight` before broad handoff. Real SQL
controls must first insert valid current rows, then assert exact faults/races and
rollback; preserve actor, money, optional/zero and collection semantics.

Planning-only receipt: inspected current implementation/config/tests and working
tree, recorded confirmed gaps, preserved mechanisms and the approved cancellation
decision. No schema, code, generated contract, test expectation or runtime change
has been made by this planning checkpoint. No new proof pass is claimed and no
build is ready yet. Heavy/native/broad/live execution remains with Salar.

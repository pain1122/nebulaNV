# D2 minimum demo payment attempts

2026-10-24. Before-edit evidence and execution boundary. Customer start and
admin outcome simulation/reconciliation are explicitly selected by Salar.
Cancellation and status SQL proofs have operator-reported passes; grouped
application migrations/images/native proofs are still pending.

## Verified mechanism and bounded approach

`CheckoutCoordinator.finish` finalizes the deduction before a COMPLETED
CheckoutAttempt is exposed. Its payload is compacted, but the intent ID/hash and
immutable Order selections remain. Product already supports Reserve, Finalize,
HELD Cancel and finalized Restore, with identity/hash replay. Neither the Order
schema nor its owner/Gateway currently implements a payment attempt. Vocabulary
alone is not a backed PAYMENT_PROCESSING transition.

Use the existing allocation for the first attempt. Do not deduct twice or return
it to general availability just to start a payment simulation. A confirmed first
failure/customer-cancelled attempt calls finalized Restore; a subsequent attempt
uses a fresh HELD intent through existing Reserve. Retry quotes must match the
immutable Order currency/price/SKU/options and current availability/stock; drift
conflicts instead of silently changing the purchased snapshot. Reuse Settings
shop currency, `cartQuote`, stock checks and signed Product methods.

| Attempt event                                      | Required effect and Order behavior                                                                                                                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First start                                        | Verify owner/authority, version and completed Checkout identity; keep its existing deduction. Persist the demo attempt and PAYMENT_PROCESSING together.                                                                                         |
| First confirmed failure/customer-cancelled attempt | Restore original finalized deduction exactly once, then return Order to PENDING. Order cancellation is a distinct operation.                                                                                                                    |
| Retry start                                        | Revalidate current selection against saved commercial facts, persist a fresh intent and reserve once; publish PAYMENT_PROCESSING only after the reservation is known. Ambiguous preparation remains recoverable and blocks competing mutations. |
| Retry confirmed failure/customer-cancelled attempt | Cancel the retry's HELD intent once, then return Order to PENDING.                                                                                                                                                                              |
| Confirmed demo success                             | First attempt already owns a finalized deduction; a retry finalizes its HELD intent. Commit PAID and audit/replay only after required stock effects are known. Label the result demo-only; no provider settlement is claimed.                   |
| Unknown outcome                                    | Stay PAYMENT_PROCESSING and retain the allocation until explicit reconciliation. Do not release stock or guess failure from a timeout.                                                                                                          |

New start/outcome commands must share Order row serialization with the existing
status/cancellation paths. Preparing/resolving attempts block explicit cancellation
and manual demo markers. Once an attempt has released stock, manual PAID cannot
bypass re-reservation. Successful replay returns its original response; new owner
reads show current state. Existing Checkout replay and its snapshots stay unchanged.
No new Product primitive, cross-service SQL or real payment integration is needed
for this bounded approach. A stock target missing during compensation remains a
reconciliation case, consistent with the already documented cancellation policy.

## Exact consumer trace for implementation

| Area                          | Inspected paths and required action                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order state/owner             | `apps/order-service/prisma/schema.prisma`; `src/order/order.service.ts`, `order-status.ts`, `order-cancellation.ts`, `checkout-recovery.ts`, `checkout-coordinator.ts`, `checkout-attempt-contract.ts`, `checkout-contract.ts`, `checkout-receipt.ts`, `cart-contract.ts`                                                                                 |
| Decision                      | Add dedicated persisted attempt/command facts and bounded recovery. Preserve original Checkout. Guard both existing mutation paths against active attempt work and released allocation. Reuse established money, quote, row-lock and replay validation; no generic workflow framework.                                                                    |
| Product boundary              | `apps/product-service/src/product/checkout-stock.service.ts`, `checkout-stock-contract.ts`, `grpc/checkout-stock-grpc.controller.ts`, `prisma/schema.prisma`; `packages/clients/src/product.client.ts`, `checkout-stock.ts`                                                                                                                               |
| Decision                      | Preserve all four operations/guards and their contracts. First attempt uses the original finalized identity; retries use a new validated reservation identity. Product owned SQL proof remains separate from native integration.                                                                                                                          |
| Transports/policies           | `apps/order-service/src/order/order.controller.ts`, `grpc/order-grpc.controller.ts`, `dto/order.dto.ts`; Gateway `src/order/gateway-order.controller.ts`, `gateway-order-api.service.ts`, `order-api.dto.ts`, `src/contracts/routes/order.routes.ts`, `src/contracts/inputs/order.inputs.ts`                                                              |
| Decision                      | Add explicit demo start/outcome operations, not unbacked enum patches. Verify actor from transport and Order ownership at the owner. Salar selected customer start and admin-only outcome simulation/reconciliation. Public endpoint work follows the owner SQL proof.                                                                                    |
| Protocol/shared clients       | `packages/protos/order.proto`, `scripts/generate.mjs`; `packages/clients/src/order.client.ts`, `dormant-v3.client.ts`, `test/service-wrappers.spec.ts`, `test/dormant-v3-wrappers.spec.ts`                                                                                                                                                                |
| Decision                      | Append bounded explicit attempt commands/responses, regenerate and update complete raw mocks. New RPCs need explicit dormant F4 deferral; do not manufacture V3 activation.                                                                                                                                                                               |
| Public generation/inventories | Gateway `openapi/nebula-v1.openapi.json`, `test/r5-v3-receiver-inventory.spec.ts`, `test/openapi-contract.spec.ts`, `test/contracts/route-policy.aggregate.spec.ts`, `test/contracts/input-profiles.aggregate.spec.ts`; `packages/api-client/src/generated.ts`, `test/client.test.mjs`, `browser-consumer.ts`, `react-native-consumer.ts`                 |
| Decision                      | Update exact routes/profiles/protected RPCs and reviewed Order proto pin only after inspecting the final additions. Preserve 59 R5 receiver assertions and four private Product methods. Run existing generators and mandatory preflight; no blind hash or count refresh.                                                                                 |
| Owner tests/helpers           | `apps/order-service/test/order-status.unit.spec.ts`, `order-cancellation.unit.spec.ts`, `resource-authorization.spec.ts`, `checkout-recovery.unit.spec.ts`, `utils/checkout.fixture.ts`, `utils/checkout-attempt.fixture.ts`, `utils/order.fixture.ts`, `grpc/helpers.ts`, `http/order.http.e2e.spec.ts`, `grpc/order.e2e.spec.ts`, `jest.unit.config.ts` |
| Decision                      | Add attempt tests and complete new model/method mocks only where called. Preserve Checkout-only unexpected-Restore protection. Exercise real codecs, actor/owner denial, initial-vs-retry effects, missing/changed selections, unknown outcomes, races and retry exhaustion. Unit-only config has no native startup hook.                                 |
| Gateway proof consumers       | `apps/gateway/test/order-http.spec.ts`, `gateway-order-api.service.spec.ts`, `test/contracts/inputs/order.inputs.spec.ts`; API client `test/d2-checkout-live.mjs`, `d2-checkout-recovery.mjs`, `d2-cart-live.mjs`, `f3-live-flows.mjs`                                                                                                                    |
| Decision                      | Test registered application/actor boundaries, forwarded owner keys and strict attempt DTOs. Existing generic PROCESSING denial stays; explicit backed operations get their own proof. Group native/live execution after preparation.                                                                                                                      |
| SQL/seeds/build/docs          | `scripts/db/verify-d2-order-cancellation.mjs`, `verify-d2-order-status.mjs`, `verify-d2-coordination.mjs`, `verify-d2-checkout.mjs`; `scripts/demo/runner.mjs`, `demo.test.mjs`; root `package.json`, `docker/backend.Dockerfile`, `docs/services/order-service.md`, `docs/current-focus.md`, `TODO-ALTERNATIVE.md`                                       |
| Decision                      | Add owned populated SQL/race/recovery proof with exact controls, preserving pinned historical fixtures. Current loaders include the migration tail. Existing scoped builds need no expansion. Demo ecommerce fixture extension remains Batch 4; no provider/client credentials or frontend work.                                                          |

First implementation/proof boundary: the Order-owned attempt lifecycle and its
actual SQL/stock-port proof. Add `src/order/demo-payment.ts`,
`demo-payment-contract.ts`, `test/demo-payment.unit.spec.ts`,
`prisma/migrations/20261024000200_demo_payment_attempts/migration.sql` and
`scripts/db/verify-d2-demo-payment.mjs`; wire service methods and independent
recovery, and guard existing cancellation/status consumers. Revisit their
already traced mocks and SQL drivers. No public PROCESSING enum bypass will be
enabled; explicit RPC/Gateway start/outcome routes follow after this owner proof.
The first step is not a deployed customer payment feature or Batch 3 closure.
It is now implemented and prepared as recorded below; full recovery SQL remains
the next operator proof.

Persist dedicated attempt facts and START/OUTCOME command replay/audit rather
than broadening the admin-only OrderStatusChange actor constraint to users.
UNKNOWN outcome keeps the current version/status/allocation; a later confirmed
outcome needs a new key. A rejected retry reservation cancels its fresh intent
before a FAILED attempt/PENDING reply; an ambiguous reserve remains recoverable.
An unsuccessful start cannot leave a late reservation without a cancellation
tombstone. Successful state changes advance the Order version. No saved Order
commercial item/total is rewritten.

Implement in four bounded steps: persist and validate start/stock identity;
bind explicit outcomes and recovery; connect signed/native/Gateway/generated
contracts and focused consumer checks; hand grouped SQL/image/native/live proofs
to Salar with an updated preparation receipt. This is not a build-ready receipt.

## Owner implementation and consumer review

- Added the additive attempt/command migration and regenerated Prisma. START is
  customer-only and owner-scoped; OUTCOME is admin/root-admin only. Commands
  persist hashes/correlation/original replies. UNKNOWN preserves current version
  and allocation; successful transitions advance Order version atomically.
- Added `demo-payment-contract.ts` (validated commands/replay/immutable retry
  selections) and `demo-payment.ts` (leases, existing Product effects and recovery).
  Order service binds its existing signed Product proxy and Settings/shop quote.
  First start performs no Product mutation; retry uses its own reservation ID.
- Updated manual status and explicit cancellation guards and their exact mocks
  in `test/order-status.unit.spec.ts`, `order-cancellation.unit.spec.ts` and
  `order.error-translation.unit.spec.ts`. Active work blocks competing mutations;
  manual PAID cannot bypass a released allocation. Existing admin-only status
  audit constraints and immutable Checkout bodies are unchanged.
- Extended the existing scheduler with an independent demo recovery pass and
  updated `test/checkout-recovery.unit.spec.ts`; original Checkout-only fixtures
  remain unchanged because their paths do not call demo recovery. Added the new
  focused suite to the existing unit config, preserving native startup separation.
- Product owner/schema/protobuf and all four private RPCs are unchanged. No new
  RPC, route/profile, public DTO, OpenAPI/SDK operation or dormant V3 activation
  exists yet. Public contracts/inventories remain 79/48/65, 59 preserved R5/six
  named deferrals and four internal Product stock RPCs. Freshness/preflight pass.
- New `scripts/db/verify-d2-demo-payment.mjs` invokes actual OrderService and
  Product catalogue/stock owners against two isolated owned PostgreSQL databases.
  Transport and external publication eligibility alone are stubbed. Existing
  status/cancellation/Checkout loaders already include the migration tail;
  existing pinned historical fixtures are preserved. The full new proof includes
  original manual paid/fulfilled and unpaid cancellation behavior through the
  new guards, avoiding unnecessary repeat deployments or broader old proofs.
- Seeders/native live tests/build configuration remain unchanged: no public demo
  operation is advertised yet. Customer/admin transport, typed/generated clients
  and their exact inventories follow after this owner proof. Updated current-focus,
  adopted TODO and Order service docs describe this pending boundary.

## Observed preparation

Focused run: **5 suites, 66 tests passed**, including demo authority/key/version/
replay, real Order codecs, exact retry commercial values and base/variant options,
cross-owner lookup before reserve, existing status/cancellation and recovery
guards. Order production types, scoped source/test lint and Prisma validation pass.
Four existing unsafe-any warnings remain in the old error-translation test; no
new lint errors/warnings or disabled rules. New driver syntax/root lint pass.
Preflight: **4 suites, 22 tests passed**, including public generation freshness.

Locally ran `node scripts/db/verify-d2-demo-payment.mjs --fixtures-only` against
actual PostgreSQL. It applied real Product/Order baselines, created a real
Checkout/finalized deduction through owners, injected and verified first-error
P0001 rollback of the populated payment migration (including enum/table absence),
then applied it and preserved existing Order/Checkout receipt facts. Valid control
rows precede exact stock/lease/failure/authority/input/response constraint failures.
The first demo attempt/command committed with no second deduction, release or
Product mutation; quantity remained 8 from the original 10 minus Checkout's 2.
Original start-key replay matched. An additional real variant Checkout control
also preserved the expected deducted quantity. The latest smoke run cleaned
**two owned disposable DBs**. Final review added an owner guard/test requiring
START version capacity for both processing and resolution (at most 2147483645);
OUTCOME may use version 2147483646. Future DTOs must preserve these distinct bounds.
This smoke does not certify the longer outage/race/recovery branches.

## Handoff receipt

```text
Requirement/finding: accepted PAYMENT_PROCESSING vocabulary had no attempt or
reservation/outcome binding. Salar selected customer start/admin demo outcomes.
Files/consumers: exact before-edit trace and reviewed owner impact above.
Format/syntax/lint/types: pass; four existing warnings. Prisma generated/valid.
Focused behavior: 5 suites / 66 tests; preflight 4 suites / 22 tests.
Actual SQL: populated migration/rollback/control constraints and first allocation
smoke pass; cleaned two owned DBs. Full outage/race/recovery SQL pending Salar.
Current images: unchanged; this owner source/migration is not deployed. No new
public payment RPC/Gateway surface is exposed; that is the next scoped slice.
Deferred: real providers, paid refunds, F4 V3, grouped native/image/live proofs.
Next command: pnpm db:verify:d2:demo-payment
Expected: named stock/retry/unknown/rollback/concurrency checks, cleanup of two
owned DBs. Both owners/SQL are actual; transport/publication are explicitly stubbed.
Readiness: READY FOR NAMED DATABASE PROOF; not ready for image/live deployment
or Batch 3/D2 closure.
```

## Operator result, 2026-10-24

Salar supplied the full successful `pnpm db:verify:d2:demo-payment` output.
All five named groups passed: populated upgrade/first-error rollback and exact
constraints; unknown allocation, release once, retry and immutable Checkout;
variant lost reply, cancellation and tombstones; local reply rollback, expired
lease/recreated owner and competing outcomes; active/order/key constraints,
concurrent start replay and original manual-status/cancellation regressions.
The driver cleaned two owned disposable databases. Actual Order/Product SQL is
proved with transport/publication dependencies stubbed. This supersedes the
pending owner SQL status in the historical handoff above. Native deployment and
public transport proofs remain pending; the owner logic needs no repeat proof
for additive transport wiring alone.

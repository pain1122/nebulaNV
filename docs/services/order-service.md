# Order Service

Last reviewed: 2026-10-24 (demo payment owner SQL passed; transports prepared, deployment pending).

## Purpose

Order-service owns carts, checkout, order persistence, order item snapshots, and order status updates.

Order-service does not own product catalog data. It fetches current public product facts when adding or positively updating a selection.

## D2 Cart contract

For Docker deployment use `pnpm db:migrate:order` and `pnpm db:status:order`.
These root commands explicitly target nebula_order at 127.0.0.1:15432 and
override inherited/host .env database URLs only in their child process. Apply
the pinned deployment, then recreate the already-built image. Project demo
data is disposable; consolidated D2 exit owns native rerun/status evidence.
Direct package Prisma commands use the service's development .env and
may target localhost:5432 instead; they are not the Docker deployment lane.

Add accepts productId, optional variantId and integer quantity (1..2147483647).
BASE products forbid a variant; VARIANT products require an active available
member. SKU, options and exact effective price come from Product, including
parent discounts and free overrides. Settings remains the shop currency owner.
Tracked stock bounds the resulting selection quantity; Batch 1 does not consume
or reserve stock. Update zero removes; negative/overflow quantities reject.
Removing an owned item does not require its Product to remain available.

Cart replies serialize ISO expiry, option maps and fixed two-decimal unitPrice,
lineTotal, subtotal and total. Merchandise subtotal equals total in this batch;
no shipping/tax/coupon engine is implied. Both lines and aggregates must fit
Decimal(18,2). The internal Product effectivePriceAmount string avoids losing
cents through its existing numeric display fields.

CartItem stores variantId, selectedOptions and a server-derived selectionKey,
unique within a cart. Short per-owner advisory-locked transactions serialize
creation, expiry, edits and existing checkout; remote quotes are fetched before
locking. Contention/deadlock timeout returns 409 cart_write_conflict. Expired
populated carts delete children first; legacy null expiry adopts the configured
TTL on access without rewriting item facts. The intentional TTL fallback stays
30 minutes. Positive updates refresh current commercial facts; a cart read
shows stored facts until a successful mutation or Batch 2 reconciliation.

Batch 2's first slice revalidates each selection through current signed Product
and Settings authority before the owner lock. Changed price, SKU, options,
currency, lifecycle or insufficient stock conflicts without clearing the Cart;
unavailable dependencies preserve their errors. Re-reading the captured Cart
under the lock rejects concurrent edits. Successful base/variant checkout stores
complete immutable facts, including variantId and selectedOptions. Cosmetic title
changes use the current title. Stock coordination is implemented in the source
described below; native verification is operator-reported passed and application
migrations are applied. Live integration reruns remain pending after correcting
the Product migration command and recovering the stranded attempt.

The durable replay slice adds a required idempotency key: direct HTTP uses the
Idempotency-Key header, signed CheckoutRequest uses idempotencyKey. Notes remain
the only checkout body input. For a new purchase, current quotes stay outside
the owner lock; completed receipt lookup precedes both quote and Cart lookup.
The receipt commits with Order creation and Cart deletion, so same-key retries
after lost responses return the original result even after later status/catalogue
changes or a newer Cart. Changed note conflicts. Receipt scope is verified user
and exact key (16..128 ASCII characters). Full response replay expires after
seven days; retained owner/key/intent/Order records permanently prevent reuse.
Hourly cleanup compacts at most 100 expired bodies per pass. It does not release
stock or perform remote recovery. Only purchases created by the new code receive
this guarantee; historical requests without recorded keys cannot be reconstructed.
Local SQL/Prisma/codec/signing proofs and operator sixth-migration/new-image
integration pass. Native rerun/status remains deferred to consolidated D2 exit.

Product's private stock primitive and Order's coordinator have actual Prisma
proofs. Order persists PREPARED before reserving; one active attempt per owner
freezes Cart writes and expiry cleanup. A short owner transaction commits the
Order, receipt, Cart removal and ORDER_COMMITTED together. Product finalization
then permits COMPLETED and success. Pending purchases are hidden from customer
Order reads/lists and denied admin status mutation. Successful completion starts
the receipt's seven-day replay window; response/Order dates remain immutable.
Receipt compaction skips unfinished attempts.

Pre-commit failures move through CANCELLING to CANCELLED and restore held stock
once. Ambiguous commits are read from Order's own database before compensation;
if that read is unavailable, leave the durable attempt for recovery. Committed
work is finalized, never blindly refunded. Terminal key/hash records prevent
reuse; redundant quote bodies are cleared. Cancelled checkout keys require a new
key. Same-key callers wait boundedly for the original outcome; the Gateway's
existing in-flight duplicate response remains 409 IDEMPOTENCY_IN_PROGRESS.

Recovery begins after application bootstrap, with a 120-second fenced lease,
10-second RPC deadline, at most five candidates per five-second tick and bounded
backoff. Recovery uses fresh signed service calls without persisted JWTs. External
HTTP bodies/protobuf layouts remain unchanged. Checkout quotes have at most 100
distinct selections. `pnpm db:verify:d2:coordination` owns the real two-database
proof with transport/publication stubs; it does not certify images or real RPCs.
`pnpm test:d2:checkout:live` requires an empty seeded customer Cart, removes only
its fixture Product/Cart/session data, and retains demo Order/receipt history
because there is no Order deletion API. The current migrations are applied;
Salar reports corrected Checkout, Cart and F3 live passed. The corrected
outage/cache-loss/Order-restart proof and affected Cart live also passed.
`pnpm test:d2:checkout:recovery:live` mode deletes only its owned checkout cache
entries, stops/restores Product and restarts Order after a scoped test-only
finalization fault. It restores services and removes its fault in finally;
committed Order/receipt history and the reusable other customer are retained.

Product quote, shop currency and Cart TTL reads now carry a ten-second native
gRPC deadline and a cancelling Observable timeout. Deadline exhaustion returns
503 dependency unavailable; other RPC errors retain their existing translation.
The optional Cart TTL setting still falls back to thirty minutes after a failed
or timed-out read. These bounds apply before any new checkout attempt/stock
effect. The source correction passed focused checks and the deployed image
contains it. Salar reports recovery/Cart live reruns passed. The recovery fixture
reconnects a closed HTTP socket only after inspecting a COMPLETED owner attempt,
retaining the original Checkout key/body; it does not retry fresh Checkout writes.

PAYMENT_PROCESSING is now a supported status. Approved payment-attempt policy:
confirmed failure or customer cancellation releases the reservation and returns
Order to PENDING; retry revalidates and reserves again. Unknown outcomes stay
PAYMENT_PROCESSING for reconciliation. Explicit Order cancellation is CANCELLED.
Payment attempts/provider events and their reservation binding belong to Batch 3
and the adopted payment integration scope. Generic admin status patches do not
prove payment success/failure or invoke HELD-only compensation on finalized demo
stock. All current checkout remains DEMO_NO_PAYMENT.

All Order reply paths now explicitly serialize fixed two-decimal money, ISO
dates, JSON strings and persisted selection facts. checkoutMode is
DEMO_NO_PAYMENT, including legacy Orders. PAID remains a demo status and never
certifies provider settlement. The additive migration preserves legacy values
and enforces base/variant option shape. `pnpm db:verify:d2:checkout` separately
proves populated SQL preservation, deliberate first-error rollback, exact
constraints and actual Prisma-backed checkout failures/concurrency/snapshots
with remote Product/Settings authority stubbed. Native deployment and rebuilt
image integration are separate pending operator proofs.

Proofs: pnpm db:verify:d2:cart exercises populated SQL upgrade, rollback,
constraints and actual Prisma-backed owner concurrency with stubbed remote
authority. pnpm db:verify:order separately proves clean Prisma migration
deployment/status. pnpm test:d2:cart:live exercises rebuilt services through
Gateway and cleans only its own records. See the
[Batch 1 execution receipt](../reports/2026-10-13-d2-batch1-execution.md).

## Main Responsibilities

- Current user cart lookup.
- Add product to cart.
- Update cart item quantity.
- Remove cart item.
- Checkout cart into an order.
- List current user's orders.
- Get current user's order by ID.
- Admin order status update.
- Shared liveness plus Postgres/S2S-backed `/health/ready`; `/health` remains a readiness alias.

## Current HTTP Contract

Routes:

- `GET /orders/cart`
- `POST /orders/cart/items`
- `PATCH /orders/cart/items/:id`
- `DELETE /orders/cart/items/:id`
- `POST /orders/checkout`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`

Access:

- Cart, checkout, and user order reads require `user`.
- Status update requires `admin` or `root-admin`.

Identity rule:

- HTTP user-owned operations resolve `userId` from authenticated request context.
- Do not accept or trust a body/query/path-supplied `userId` for current-user cart/order actions.

## Current gRPC Contract

Proto: `packages/protos/order.proto`

Generated controller types: `orderv1` from `@nebula/protos`. The gRPC controller derives its request shapes from these types, removing generated-only `$type` and preserving the transport's optional-scalar omission behavior instead of maintaining local proto-shaped duplicates.

Service: `OrderService`

Methods:

- `GetCart`
- `AddToCart`
- `UpdateCartItem`
- `RemoveCartItem`
- `Checkout`
- `GetOrder`
- `ListOrders`
- `UpdateOrderStatus`
- `Ping`

Identity rule:

- User-owned gRPC operations use `@RequireUserId()` and resolve actor identity from guarded metadata/context.
- Request `userId` does not override the authenticated context user.
- `UpdateOrderStatus` requires verified `admin` or `root-admin` actor context, matching the HTTP policy.
- Product lookup failures retain product-service status through the shared downstream translator.
- Updating the status of a missing order returns `404 order_not_found` over HTTP and `NOT_FOUND` over gRPC.
- Settings-service failure while reading cart TTL keeps the intentional 30-minute fallback.

## Current DB Shape

The root Prisma commands include this service last. Its seed is intentionally
empty because order-service currently requires no base rows. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

Main Prisma models:

- `Cart`
- `CartItem`
- `Order`
- `OrderItem`

Enum:

- `OrderStatus = PENDING | PAYMENT_PROCESSING | PAID | FULFILLED | CANCELLED`

Money storage:

- Money is stored as Postgres decimal for precision.
- Display formatting, currency symbols, separators, locale, and rounding policy belong at the service/frontend presentation layer.
- Target formatting policy should be settings-service driven.

R2 adds nullable `identityRealmId` and `subjectId` beside `Order.userId` and
`Cart.userId`. The migration and compatibility triggers use default realm
`b1000000-0000-4000-8000-000000000001` plus the existing UUID. Partial,
mismatched, wrong-realm, or actorless pairs reject. Legacy readers and local
business rules stay primary; no cross-service foreign key or tenant/site scope
is added. `pnpm db:verify:f4-r2-default-actors` passed populated upgrade,
unchanged order/cart/item snapshots, zero-row reruns, and new legacy-write
compatibility and denial checks.

## Cart Rules

- One active cart per user.
- Expired carts are deleted and recreated.
- Cart TTL is configurable through settings-service key `order/cart_ttl_minutes`.
- Current code fallback is 30 minutes if settings lookup fails.
- Target launch default should be 6 hours.
- Adding the same product again increments quantity.

## Currency Rules

- Settings-service is the source of configured shop currency policy.
- Product currency must match that configured currency.
- Cart/order currency uses the configured shop currency.
- If product data returns a different currency than the configured shop currency, that is an admin/data configuration error.
- A stored Cart currency change conflicts at checkout; successful Cart edits
  refresh commercial facts under the configured currency rules.

## Checkout Rules

- Empty cart cannot checkout.
- Checkout creates an order plus order items inside a DB transaction.
- Order items snapshot product/variant ID, name, SKU, options, quantity and price;
  currency is stored on the Order header. Later catalogue edits do not rewrite them.
- Checkout deletes the cart and cart items after order creation.
- Order starts as `PENDING`.
- Checkout/payment finalization must never accept a body-supplied user ID.

## Service Relationships

Uses:

- Auth-service for token validation through `GrpcTokenAuthGuard`.
- Product-service for product lookup when adding cart items.
- Settings-service for cart TTL and target currency/display policy.
- Postgres via Prisma for cart/order persistence.

Does not currently use:

- User-service directly for cart/order ownership checks.
- Media-service directly.

Identity note:

- Actor identity comes from auth-service-validated token context.
- Cart/order ownership is enforced by matching rows to the authenticated `userId`.
- Payment/customer identity checks are future work and should be explicit at the checkout/payment boundary.

## Current Tests

HTTP:

- User can get cart.
- User can add product to cart.
- User can update cart item quantity.
- User can checkout and clear cart.
- User can list orders.
- User can get own order.
- Admin can update order status.
- Missing product cart input and missing admin status-update targets return their domain `404` messages.

gRPC:

- GetCart returns empty cart for new user.
- AddToCart adds item.
- UpdateCartItem changes quantity.
- Checkout creates order and empties cart.
- ListOrders includes created order.
- GetOrder returns created order.
- UpdateOrderStatus changes status to `PAID`.
- Missing product cart input and missing status-update targets return `NOT_FOUND` with their domain messages.
- Shared guard tests prove a verified normal user is denied from admin-only RPC policy and verify that `UpdateOrderStatus` carries that policy.

## Related Files

Core:

- `apps/order-service/src/order/order.service.ts`
- `apps/order-service/src/order/order.controller.ts`
- `apps/order-service/src/order/grpc/order-grpc.controller.ts`
- `apps/order-service/src/order/dto/order.dto.ts`
- `apps/order-service/src/order/order.module.ts`

Contracts:

- `packages/protos/order.proto`
- `packages/protos/product.proto`

Runtime:

- `apps/order-service/src/app.module.ts`
- `apps/order-service/src/main.ts`
- `apps/order-service/src/config/env.validation.ts`
- `apps/order-service/src/health.controller.ts`
- `apps/order-service/src/prisma.service.ts`
- `apps/order-service/prisma/schema.prisma`
- `apps/order-service/src/auth-client.module.ts`
- `apps/order-service/src/product-client.module.ts`
- `apps/order-service/src/settings-client.module.ts`

Tests:

- `apps/order-service/test/http/order.http.e2e.spec.ts`
- `apps/order-service/test/grpc/order.e2e.spec.ts`
- `apps/order-service/test/grpc/helpers.ts`
- `apps/order-service/test/setup/wait-for-services.ts`
- `apps/order-service/test/jest.env.ts`

## Known Gaps

- Batch 2 durable receipt, remote stock and recovery proofs are closed as recorded
  in `docs/reports/2026-10-14-d2-checkout-coordination.md`.
- Existing TTL caching/fallback is retained; no new launch duration is adopted here.
- Manual demo status version/replay/audit controls are locally checked. Unpaid
  cancellation/recovery source is prepared; Salar reports cancellation/status
  SQL passed. Native deployment remains pending.
- Public demo payment bindings are prepared in source; running-image proof is
  pending. The owner lifecycle passed its full actual Order/Product SQL proof.
  Checkout still creates a PENDING DEMO_NO_PAYMENT Order.
- Real provider settlement and payment-instrument verification remain outside demo scope.
- Batch 2 coordinates held/finalized stock. Product's finalized restoration has
  actual SQL proof; its new Order binding needs the separate evidence below.

## D2 Batch 3 admin reads

Separate native GET `/admin/orders` and `/admin/orders/:id` and signed
`AdminListOrders`/`AdminGetOrder` require admin/root-admin authorization. Gateway
exposes `/api/v1/admin/orders` and `/api/v1/admin/orders/:id` to registered admin
applications and verified admin roles. Personal reads remain owner-only.
List filters are optional status/userId (UUID4), page 1..1,000,000 and limit
1..100, defaulting to 1/20. Rows sort by createdAt descending then ID descending;
rows/count share one RepeatableRead transaction. Legacy Orders and completed
checkouts are visible; unfinished checkout Orders are hidden, including detail.
Existing explicit commercial snapshot serialization is reused.

No migration or status behavior changes in this slice. Local contract and owned
PostgreSQL read proofs are recorded in the
[read-slice receipt](../reports/2026-10-19-d2-batch3-reads.md); native/new-image
integration remains pending. Transition/version/audit and stock effects follow
before the grouped image handoff. F4 V3 compatibility of these two post-R5 reads
is explicitly deferred with the paused F4 audit.

## D2 Batch 3 status controls

`PATCH /orders/:id/status`, signed `UpdateOrderStatus` (including its dormant
projection), and Gateway `PATCH /api/v1/admin/orders/:id/status` now require
status, expectedVersion and an idempotency key. HTTP puts the key in its header;
the signed RPC body carries it. Actor ID/role and request correlation come from
verified transport context. Body-supplied actor authority stays forbidden.

Manual demo markers permit PENDING -> PAID and PAID -> FULFILLED.
PAID remains a DEMO_NO_PAYMENT demonstration marker, not provider settlement.
Equal/other transitions conflict; successful same-key/intent retries instead
replay their original result. PENDING -> CANCELLED now dispatches through the
durable stock-backed operation described below in source; deployment is pending.
PAYMENT_PROCESSING still requires a backed demo attempt and remains rejected.

Order version starts at 1; the conditional status write increments it and records
previous/new status, both versions, actor, time, request correlation and key/intent
hashes with the original explicit reply in one transaction. Actor/key is durable
across targets, and changed intent conflicts. Redis loss does not authorize a
second effect or audit. Unfinished Checkout still conflicts. Commercial snapshots
and original Checkout replay bodies remain immutable, including absent historical
version fields. Admin reads require current version; clients read it before writing.

Migration `20261019000100_order_status_controls` is prepared and locally verified
against populated disposable PostgreSQL, including injected upgrade rollback,
race/replay, exact constraints and atomic audit-write rollback. Shared application
deployment and rebuilt-image/native/live proof are pending; existing containers
still run the prior code. See the [status-control receipt](../reports/2026-10-19-d2-batch3-status-controls.md).

## D2 unpaid cancellation and recovery

The existing admin status command accepts CANCELLED only for a current-version
PENDING DEMO_NO_PAYMENT Order with a provable COMPLETED CheckoutAttempt. Legacy
Orders without that identity, unfinished purchases, PAID/FULFILLED/processing
states and unsupported modes conflict before requesting stock effects.

`OrderCancellation` stores the verified actor, original key/intent hashes,
expected version, correlation and completed Checkout's original Product intent
ID/hash. Row locking serializes setup against manual status changes. While
unresolved the Order stays PENDING; no success is returned, and other status
commands conflict. Reads show the last committed status rather than inventing
a successful cancellation. This slice adds no public field or route.

The signed private Product restore call runs outside the Order transaction.
Only a matching RESTORED reply permits CANCELLED, version+1, the original audit/
reply and cancellation completion to commit atomically. An ambiguous remote
reply or local audit failure retains the durable request. Recovery reuses the
same Product identity, whose receipt prevents another credit. Leases last two
minutes; retries back off from one second to one minute. Each scheduler pass
considers at most five due cancellations and still runs if Checkout recovery
fails. No paid refund, replacement stock row or provider settlement is inferred.

Missing original stock targets may require reconciliation: cancellation remains
unresolved and blocks competing status changes until restoration can complete.
Commands with another key/actor do not take over the durable request. The original
Checkout response remains immutable even after a later cancellation.

Migration `20261024000100_order_cancellation` and source are prepared. Salar
reports the cancellation/status SQL proofs passed; native deployment is pending.
Focused checks and SQL/native evidence are tracked in the
[cancellation receipt](../reports/2026-10-24-d2-order-cancellation.md).
`pnpm db:verify:d2:cancellation` owns a disposable Order database and stubs only
the Product port; it does not certify actual cross-service restart behavior.
Shared migrations and images stay grouped with the remaining Batch 3 work.

## Minimum demo payment lifecycle (native deployment pending)

Salar selected customer initiation and admin-only demo outcome simulation/
reconciliation. `startDemoPayment` and `resolveDemoPayment` exist at the Order
owner; explicit signed/native/Gateway operations are prepared below. The generic
status patch still rejects PAYMENT_PROCESSING and is not an outcome callback.

The first attempt uses Checkout's already finalized allocation without another
deduction or temporary release. A confirmed failed/customer-cancelled attempt
restores that allocation, then returns the Order to PENDING. Retry quotes must
match saved currency, price, SKU and selected options and current availability;
drift conflicts instead of repricing the immutable Order. A retry reserves a
fresh Product intent, which is finalized on success or cancelled on failure.
Unknown outcomes retain PAYMENT_PROCESSING and the allocation until an admin
reconciles them. PAID is still explicitly a demo result, never provider settlement.

Dedicated attempt/command rows store actor/key/intent/correlation, original
replies and bounded recovery state. Active attempts block manual status changes
and explicit Order cancellation. After a released allocation, manual PAID cannot
bypass retry reservation. Outcome/Order/attempt/replay changes commit together;
ambiguous remote effects retry the same Product identity. Rejected retry
reservations receive cancellation tombstones before a failed-start response,
preventing a delayed reserve from leaving unowned stock. Ordinary Order reads and
original Checkout replies retain their existing contracts.

Migration `20261024000200_demo_payment_attempts` is prepared and Prisma-valid.
The owned `--fixtures-only` PostgreSQL check preserves populated Orders/receipts,
checks injected upgrade rollback/exact constraints, and proves the first attempt
does not touch the existing allocation. Both temporary databases were cleaned.
Salar supplied a complete passing `pnpm db:verify:d2:demo-payment` recovery/race result:
it uses actual Order/Product SQL with transport/publication dependencies stubbed.
It does not certify native RPCs or application image deployment. See the
[owner evidence](../reports/2026-10-24-d2-demo-payment-plan.md).

## Explicit demo payment transport contract

Customer POST `/orders/:id/demo-payment-attempts` accepts `{expectedVersion}`;
admin/root-admin POST `/admin/orders/:id/demo-payment-attempts/:attemptId/outcome`
accepts `{expectedVersion,outcome}`. Gateway prefixes both paths with `/api/v1`
and additionally enforces consumer versus admin application policy. Both require
an Idempotency-Key header and verified actor context. Start replies use HTTP 201;
outcomes use 200. Actor, owner, amount, currency and stock cannot be body authority.

Signed `StartDemoPayment` and `ResolveDemoPayment` RPCs bind the same verified
actor/key/target facts and propagate verified downstream context. START allows
versions 1..2147483645; OUTCOME 1..2147483646. UUID4 targets and exact outcomes
SUCCEEDED/FAILED/CANCELLED/UNKNOWN are required. No generic status write can
enter PAYMENT_PROCESSING. Native DTO and owner validation are both retained.

The response is `{data:{order,attempt}}` (plus Gateway envelope metadata).
Attempt carries id/orderId, PROCESSING/SUCCEEDED/FAILED/CANCELLED state, mode DEMO,
fixed two-decimal amount, currency, failureCode and timestamps. A rejected retry
may return FAILED/SELECTION_CHANGED with Order PENDING. Temporary PREPARING or
RESOLVING work has no successful public response until its stock effect is known.
Gateway verifies target/owner, requested attempt, amount/currency, state/status,
version and timestamp consistency and copies only explicit response fields.
UNKNOWN does not increment the Order version; other successful commands do.

`pnpm test:d2:payment:live` selects the existing Checkout driver's isolated
fixture mode: first allocation unchanged, wrong actor/owner/attempt and stale
version denied, unknown retention, failure release/replay, retry cancellation,
retry success and fulfillment. Original Checkout replay stays immutable.
It retains demo Order history like the existing Checkout proof and cleans owned
catalogue/Cart/session fixtures. Its three local harness checks prove fixture
preparation only. Native/live/image proof remains pending in the
[transport receipt](../reports/2026-10-24-d2-demo-payment-transports.md).

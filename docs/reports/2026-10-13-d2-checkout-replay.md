# D2 Checkout replay slice

Date: 2026-10-13. First-slice validation/snapshot migration, images and integration
passed; broad results are operator-reported, counts/skips not supplied.

## Process check and pinned behavior before editing

Confirmed gap: Gateway Redis caches successful requests but does not forward the
validated header key to Order. Current Order/Cart transaction is atomic locally,
but cannot replay its result after a response loss or Redis restart. Preserve
Redis cache, signing, verified actor ownership and the existing owner advisory lock.

Narrow correction: completed CheckoutReceipt lives in Order's PostgreSQL database
and commits with Order creation and Cart removal. There are no remote writes in
this slice. Quotes remain outside the lock; under it, check for a receipt before
checking the captured Cart. A concurrent same-key winner returns its receipt;
different keys competing for one Cart have only one winner. No separate in-flight
database lease, customer Cart freeze or remote recovery worker is justified for
read-only quoting. Those states become necessary with Product stock writes in
the next slice, and are not claimed by this receipt.

Key: required at every Order entry, same 16..128 ASCII format as Gateway. Direct
HTTP receives the header, not a body authority field; signed RPC receives an
additive idempotencyKey field. Receipt scope is the verified default-site customer
and exact case-sensitive key; same customer's retry through another application
cannot purchase again. Store SHA256 key/intent/Cart fingerprints, not tokens or
raw headers. Intent is normalized note (omitted and empty equivalent). A completed
key always returns the original purchase even when the customer has a newer Cart;
changed note conflicts without inspecting or modifying that newer Cart.

Replay returns the original persisted response, including initial PENDING status
and dates even after an admin changes status. Read/detail still shows current
status. Full response lives for seven days, covering Gateway's current maximum
cache TTL. Expired replay returns conflict, never a new purchase. Keep a compact
owner/key/intent/Order reference permanently; hourly cleanup processes at most
100 expired full bodies per pass and retains the key. Receipt/Order FK prevents
unrecorded deletion; there is no receipt DELETE API. Full serialized response is
bounded to two MiB (Gateway's existing maximum); a larger result rolls back local
creation. Gateway's configured lower response cache limit remains independent;
its post-commit failure is safe to retry at the owner and is not stock recovery.

Only new-code purchases have receipts; historical Orders cannot recover keys
which the previous implementation never stored. No invented historical replay
promise. Errors before commit create no receipt/Order and preserve the Cart;
same key may retry unchanged intent after a transient failure. The response
must validate its identity, mode, amounts, options and dates before replay.

Are external standards being replaced? No. Are mock passes deployment evidence?
No. Is remote stock consumption covered? No. Is replay retention silent key
reuse? No. Are caller/tests/helpers and historic SQL windows updated? Required
below before any build/live handoff. No optional architecture replacement or
mandatory user approval is introduced by this authorized correction.

## Exact affected consumers

| Owner                       | Exact files                                                                                                                                                                                                                                                                                                                                                                                | Required action / preserved reason                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Durable local receipt       | `apps/order-service/prisma/schema.prisma`; new `apps/order-service/prisma/migrations/20261013000300_checkout_receipts/migration.sql`; `apps/order-service/src/order/order.service.ts`; new `apps/order-service/src/order/checkout-receipt.ts`                                                                                                                                              | Add completed receipt, strict key/intent/response checks, replay before quote and inside lock; atomic commit.                                                                                                                                                                                                |
| Retention                   | new `apps/order-service/src/order/checkout-receipt-retention.ts`; `apps/order-service/src/order/order.module.ts`                                                                                                                                                                                                                                                                           | Bounded body compaction retains terminal key/Order facts; do not add general workflow infrastructure.                                                                                                                                                                                                        |
| Entry points                | `apps/order-service/src/order/order.controller.ts`; `apps/order-service/src/order/grpc/order-grpc.controller.ts`; `apps/order-service/src/order/dto/order.dto.ts`; `apps/gateway/src/order/gateway-order-api.service.ts`                                                                                                                                                                   | Forward header/RPC key using verified owner; body remains note-only; DTO unchanged.                                                                                                                                                                                                                          |
| Wire/client                 | `packages/protos/order.proto`; `packages/protos/generated/order.ts`; `packages/clients/src/order.client.ts`; `packages/clients/src/dormant-v3.client.ts`; `packages/protos/index.ts`                                                                                                                                                                                                       | Add request field 3; regenerate. Same RPC/signature wrappers and exports; no dormant activation.                                                                                                                                                                                                             |
| Owner tests                 | `apps/order-service/test/checkout.unit.spec.ts`; `apps/order-service/test/cart-mutations.unit.spec.ts`; `apps/order-service/test/order.error-translation.unit.spec.ts`; `apps/order-service/test/resource-authorization.spec.ts`; `apps/order-service/test/order.http-validation.unit.spec.ts`; `apps/order-service/test/utils/order.fixture.ts`; `apps/order-service/jest.unit.config.ts` | Supply valid keys at all calls, extend receipt/replay/conflict/error mocks and signed actor forwarding checks. Existing registration sufficient; note-only input denial stays.                                                                                                                               |
| Integration entry consumers | `apps/order-service/test/http/order.http.e2e.spec.ts`; `apps/order-service/test/grpc/order.e2e.spec.ts`; `apps/order-service/test/grpc/helpers.ts`; `apps/order-service/test/utils/http.ts`                                                                                                                                                                                                | Fresh unique keys per run, complete signed bodies; HTTP/gRPC helper signatures unchanged.                                                                                                                                                                                                                    |
| Gateway and wrappers        | `apps/gateway/test/gateway-order-api.service.spec.ts`; `apps/gateway/test/order-http.spec.ts`; `packages/clients/test/service-wrappers.spec.ts`; `packages/clients/test/dormant-v3-wrappers.spec.ts`; `packages/clients/test/signing-policy.spec.ts`                                                                                                                                       | Check key forwarding and signatures including additive body field; update typed CheckoutRequest builders if present. Controller-only mocks unchanged.                                                                                                                                                        |
| Cache/input unchanged       | `apps/gateway/src/contracts/idempotency.ts`; `apps/gateway/src/state/gateway-idempotency.service.ts`; `apps/gateway/src/http/gateway-route-policy.ts`; `apps/gateway/src/http/public-client-boundary.ts`; `apps/gateway/src/contracts/inputs/order.inputs.ts`; `apps/gateway/src/contracts/routes/order.routes.ts`; `apps/gateway/src/order/order-api.dto.ts`                              | Existing header, route, response and body policies already satisfy this slice. No cache replacement, new authority input or new route.                                                                                                                                                                       |
| Inventories                 | `apps/gateway/test/r5-v3-receiver-inventory.spec.ts`; `apps/gateway/test/openapi-contract.spec.ts`; `apps/gateway/test/contracts/route-policy.aggregate.spec.ts`; `apps/gateway/test/contracts/input-profiles.aggregate.spec.ts`                                                                                                                                                           | Review exact field 3 before Order hash update; preserve all counts/deferrals; preflight required.                                                                                                                                                                                                            |
| External SDK                | `apps/gateway/openapi/nebula-v1.openapi.json`; `packages/api-client/src/generated.ts`; `packages/api-client/src/client.ts`; `packages/api-client/test/client.test.mjs`; `packages/api-client/test/browser-consumer.ts`; `packages/api-client/test/react-native-consumer.ts`; `packages/api-client/test/d2-cart-live.mjs`; `packages/api-client/test/f3-live-flows.mjs`                     | Existing idempotency header support and first-slice response shape unchanged; freshness/compatibility checks required, no hand edits to generated outputs.                                                                                                                                                   |
| Real DB proofs              | `scripts/db/verify-d2-checkout.mjs`; `scripts/db/verify-d2-cart.mjs`; `scripts/db/d1-order-upgrade-fixture.sql`; `scripts/db/verify-d1-order-upgrade.sql`; `scripts/backend.mjs`; `scripts/backend.test.mjs`; `package.json`                                                                                                                                                               | Extend checkout proof with actual new table rollback, current migrations before runtime driver, durable replay/concurrency/restart/expiry/compaction. Preserve historical first-slice controls. Cart-only driver does not query receipt/Order tables; other historical windows and pinned runners unchanged. |
| Runtime/build               | `apps/order-service/package.json`; `apps/order-service/jest.config.ts`; `docker-compose.yml`; `docker/backend.Dockerfile`; `docker-bake.hcl`                                                                                                                                                                                                                                               | Register worker in existing module; verified scoped Order/Gateway builds. No package/broker/Dockerfile replacement required.                                                                                                                                                                                 |
| Documentation               | `docs/services/order-service.md`; `docs/services/gateway.md`; `docs/packages/api-client.md`; `docs/current-focus.md`; `TODO-ALTERNATIVE.md`; this report                                                                                                                                                                                                                                   | Record retention/cutover behavior and exact proof status. Whole Batch 2 stays open for remote stock and recovery.                                                                                                                                                                                            |

## Receipt

Value-case review before handoff: existing IsOptional note validators accept null,
and Gateway already normalizes it to empty with ?? before RPC. Preserve that
existing behavior at Order's new intent check; null/empty/omitted are the same
owner intent. Gateway's exact body hash stays unchanged. Add direct HTTP body
authority denial tests so the key cannot accidentally move into the public body.

## Final impact review and observed checks

Every impact row was revisited. All checkout callers now carry valid keys:
controllers, Gateway, unit mocks, direct integration fixtures and the actual
database driver. Direct HTTP body-key/owner denial and optional null-note
compatibility are tested. Signed actor tests preserve verified ownership; Gateway
tests verify the forwarded key survives the actual codec and participates in the
signed body SHA256. A changed key produces a different digest. Shared signed and
dormant wrappers retain their existing generated definitions and authorization.

Native HTTP/gRPC integration fixtures use unique per-run keys, replay the purchase
and assert the original response again after the admin status change. Those new
integration assertions are prepared but their new-image execution is pending.
Neither HTTP helper nor gRPC signing helper required a signature change. Original
Cart/lifecycle/price/currency/snapshot tests remain intact.

The historical snapshot migration proof remains pinned to its original window.
Only the current runtime driver applies subsequent migrations before loading the
current generated Prisma client; no legacy fixture is weakened or blindly moved.
Cart-only proof does not query Receipt/Order relations and remains valid. The
other historical migration windows, pinned deployment runners, root commands and
empty Order seed remain unchanged. No business logic reads another service's DB.

One private request field is added: CheckoutRequest.idempotencyKey at tag 3.
No route/RPC/body profile is added. Review of that exact change justifies only the
Order source pin update to
f093f88332fbee771a9707de23ce7933bf277fbacb7ed341c9d5bb1f32d631b2.
77 routes, 47 input profiles, 63 protected RPCs, 59 dormant receivers and four
existing post-R5 deferrals remain unchanged. Generated proto/types/dist were
refreshed with the existing generator. OpenAPI/SDK declarations stay unchanged
because their existing header/input/response contract already covers this slice;
freshness checks pass. Existing SDK behavior/type passes remain applicable.

Locally observed final evidence:

- Order unit-only config: 6 suites / 76 tests passed, no skips.
- Gateway mapper/HTTP/profile checks: 3 suites / 19 tests passed. The mapper suite
  was additionally rerun after adding signed-body digest assertions: 10 tests pass.
- Shared service/signing/dormant wrappers: 3 suites / 23 tests passed, no skips.
- Order/Gateway/shared-client types pass. Prisma format/generation and protobuf
  generation/build succeed; isolated nine-contract freshness passes.
- Preflight: 4 suites / 20 tests pass, no skips; OpenAPI/SDK freshness passes.
- Scoped new/changed owner/helper/worker/controller/unit and Gateway lint: zero
  errors/new warnings. Existing warnings remain: error fixtures four, original
  authorization matcher one, HTTP integration 51 and gRPC integration 52. A new
  unsafe matcher assignment was corrected without disabling the rule or weakening
  assertions; its formatting/lint and ownership regression were rechecked.
- Actual PostgreSQL proof preserves populated historical facts and requires the
  receipt migration's deliberate first error P0001 plus absence of its table
  after rollback. Successful control inserts precede exact named 23514 hash,
  response-shape and replay-window failures. Schema controls are distinct from
  the actual owner/Prisma behavioral driver and do not certify live endpoints.
- Actual updated OrderService/generated Prisma proves item-write and receipt-write
  rollback, unchanged Cart and zero partial Orders/receipts after failure,
  different-key one-Cart contention, same-key one-Order concurrency, owner-scoped
  keys, changed-note conflicts, a fresh service instance replay without remote
  clients, original response after status change, and preservation of a newer Cart.
- Actual retention proof expires and compacts a receipt without permitting a new
  purchase. With 101 additional owned fixture receipts, one pass compacts 100,
  the next compacts one, and all 101 terminal key records remain. SQLSTATE 23503
  verifies the exact receipt FK prevents parent deletion. All fixtures live only
  in one owned disposable database, which is cleaned successfully.
- Node syntax and git diff --check pass; formatting complete. Only existing CRLF
  normalization warnings remain. Compose selectors still resolve to Order and
  Gateway respectively. No cache purge/forced build is requested.

The last value-case source change (null note normalization) was followed by final
Order unit/type/lint and actual PostgreSQL proof passes. It does not change wire,
OpenAPI, route counts or generated consumers; prior preflight/signing checks stay
valid. The source review confirms replay lookup happens before remote reads, then
again under the existing owner lock; receipt/Order/Cart changes share one local
transaction. No out-of-transaction receipt or blind write retry was introduced.

## Prepared handoff receipt

Requirement/finding: durable completed-purchase replay after lost response or
Gateway state, retaining existing cache/auth/Cart locks and snapshot behavior.
Consumer impact: exact table plus final review above; all affected callers,
fixtures, codecs, signing/inventory pins and current docs propagated.
Cheap gates: passed as quantified; no known applicable failure remains.
SQL evidence: actual rollback/constraints/owner concurrency/restart-instance/
expiry/bounded compaction passed. Remote Product/Settings authority is stubbed.
This is not a running-container restart, Redis fault or remote stock proof.

Native proof and images: pending operator-owned sixth migration clean deploy/
status, populated deploy/rerun/status, Order/Gateway images and replay integration.
Current images implement the preceding signed-off snapshot slice; they are not
certified for these new required-key/receipt/retention changes. Both apps must
deploy together. Actual root migration commands pin Docker's port 15432.

Next named commands, sequential and stopping at first failure:
pnpm db:verify:order; docker compose build order-service;
docker compose build gateway. Expected: six Order migrations applied/status up
to date in the owned clean proof and two successful cached scoped builds. Then
use the existing stop/deploy/rerun/status/recreate/health checkpoint before broad
Order/Gateway replay suites and Gateway compatibility proofs.

Explicit deferrals: Product stock reserve/finalize/cancel and unfinished remote
attempt/lease recovery remain the next Batch 2 slice; current receipt is committed
only for local completed purchases. Do not add remote writes without the planned
durable pre-write intent and fenced compensation. Historic keys were never stored
and cannot be recovered. No token, provider credential, payment transaction,
frontend/cloud or tenant implementation is introduced.

Readiness: READY FOR NATIVE CLEAN RECEIPT MIGRATION PROOF AND TWO SCOPED BUILDS.
The replay/stock feature checkbox and whole Batch 2 remain open until their
required native/new-image and later stock/recovery proofs complete.

## Operator build checkpoint and populated deployment handoff

Salar reports the native clean Order migration proof and both scoped image builds
successful. Exact logs/counts/durations were not supplied; this is operator-reported
evidence. No implementation changed since the preceding preparation passes.

Local read-only checks confirm 16 running/healthy containers, both Order/Gateway
running image IDs differ from their newly built image IDs, and the populated
Docker Order DB still has five migrations with no CheckoutReceipt table. The
clean disposable proof correctly did not migrate this database. New replay code
must not be exercised against this old schema or a mixed Gateway/Order pair.

Deployment receipt: prerequisites and prior cheap gates remain satisfied. Stop
only Order; run pnpm db:migrate:order twice and pnpm db:status:order; recreate
Order/Gateway with --no-build --wait --no-deps; then pnpm backend:health. The root
commands pin the Docker target at port 15432. Stop at first failure. Expected:
sixth receipt migration applies once, rerun applies none, status up to date,
both new images healthy and backend health passes. Other healthy dependencies
stay running. Deployment, retention-worker startup and new-image integration
remain pending until their actual results are returned and inspected.

Readiness: READY FOR PINNED POPULATED RECEIPT DEPLOYMENT AND IMAGE RECREATION.
Whole Batch 2 remains open for stock and remote recovery.

## Disposable demo data steering and shorter deployment

Salar explicitly confirms the project is not production and demo DBs may be
erased/recreated. No erasure is performed now; the receipt table is additive and
one pinned deploy is sufficient to move the current demo forward. Existing SQL
fault/rollback/populated/control/concurrency evidence remains required and passed.
Native rerun/status remains an explicit consolidated D2 migration exit check;
it need not add separate live operator commands to every development deployment.

Checked seed capability: User and Settings Prisma seeders bootstrap accounts and
shop defaults; backend:seed delegates D1 showcase and creates the sample Blog
post. Actual catalogue plan returns showcase=18 Products/2 Media/7 taxonomies,
limits=122/50/71. D1 reset/seed/verify/rerun was previously signed off. Order's
Prisma seed intentionally does nothing, and the demo runner/catalogue has no
Cart/checkout/receipt template. Full ecommerce reconstruction is therefore still
the existing D2 Batch 4 task, not a certified one-command reset today.

The D1 runner reads IDs from .nebula-demo/d1.json and verifies journalled records;
after dropping the corresponding databases those IDs would be stale. A complete
reset must coordinate that journal, affected cache state and bootstrap dependencies
before seeding. Do not advertise bare DB deletion followed by an unchanged journal
as verified reconstruction. Media object storage is separate from its database.

Revised current handoff replaces the prior six-command maintenance block:
pnpm db:migrate:order; docker compose up -d --no-build --wait --no-deps
order-service gateway. Run sequentially and stop at first failure. Current
dependencies are healthy, the new images were built, and the new migration only
adds the receipt table; separate old-service stop is unnecessary for this disposable
demo checkpoint. Afterward the agent inspects schema/image/readiness before
the prepared integration block. No new build or whole-backend reseed is needed.

Readiness: READY FOR TWO NAMED DEMO DEPLOYMENT COMMANDS; native rerun/status is
explicitly deferred to the consolidated D2 exit check, not reported as passed.

## Deployed receipt checkpoint and integration handoff

Salar reports both revised demo deployment commands completed. Local read-only
checks confirm all six migrations applied, CheckoutReceipt exists, running
Order/Gateway image IDs equal the new built images, and all 16 containers are
running/healthy. The known seeded customer's Cart has zero items before the
checkout integration lane. Recent scoped Order/Gateway logs contain no matched
ERROR/Exception/receipt-compaction/missing-table/column failure. This bounded log
check is not a replacement for the actual replay integration tests.

Implementation is unchanged since the preparation receipt; its applicable
unit/type/lint/codec/signing/preflight/SQL passes remain valid. Test configurations
are checked: Order broad includes live HTTP/gRPC setup and the new key/replay
assertions; Gateway broad covers contracts/mapping/policies. Existing Gateway Cart
and F3 live proofs cover the rebuilt boundary's compatibility. Results are pending
operator-owned, not inferred from Docker health. Native rerun/status remains
explicitly deferred to consolidated D2 exit; no new DB erase/reseed is required.

Next four commands, sequential and stopping on failure:
pnpm --filter @nebula/order-service test:e2e;
pnpm --filter @nebula/gateway exec jest --config ./jest.config.ts --runInBand;
pnpm test:d2:cart:live; pnpm test:f3:live.
Return suite/test/skipped summaries where available or the first failure.

Readiness: READY FOR FOUR NAMED NEW-IMAGE INTEGRATION/COMPATIBILITY CHECKS.
Stock reservation, unfinished-attempt recovery and full Batch 2 remain pending.

## 2026-10-14 restart before the pending integration block

Salar requests a container restart, followed by the four pending tests. Local
read-only check: Docker responds and all 16 application/infrastructure containers
are currently running/healthy. No restart, rebuild or broad test has been executed
by the agent. Source/contract evidence remains unchanged and passing.

Operator-owned restart: docker compose stop; docker compose up -d --no-build
--wait --wait-timeout 300; pnpm backend:health. Stop at first failure; the four
already prepared integration commands follow only after health passes. This
stop/up cycle uses existing images and existing database/storage volumes. It
does not require new migration, reseeding or another image build. Restarted
service/readiness and integration results are pending operator evidence.

## Replay integration sign-off — 2026-10-14

Salar reports the restart/readiness and all four named tests passed: full Order,
full Gateway, Gateway Cart live and F3 live. Exact broad counts/skips/durations
were not supplied; earlier local focused counts remain separately recorded.
Native clean proof, actual deployed sixth migration/current images, prior local
SQL/Prisma concurrency/replay/retention and reported new-image integration now
complete the local completed-purchase replay slice. Native deploy rerun/status
still belongs to the consolidated D2 exit check; no false pass is recorded.

The combined replay/stock gate remains open: no Product stock effects exist yet.
Next work requires Product-owned atomic intent and durable pre-write Order intent/
recovery; a completed receipt alone must not be extended with untracked remote
side effects. Group those owner/contract changes into one build/deploy checkpoint.

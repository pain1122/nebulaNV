# Current Focus - D2: Cart, Checkout, And Order

Last updated: 2026-10-27.
Status: active Batch 3 - Orders. Batches 0, 1 and 2 are closed.
Immediate priority: [ASAP build cleanup](ASAP-BUILD-CLEANUP.md), Segment 3:
finish hosted integration, CI cache and release archive acceptance. All services
already use the accepted shared graph. Segments 1 and 2 are closed; D2 feature
work and its pending deployment/live gates remain preserved. This is build-cleanup
Segment 3, not a D2 feature implementation slice.

Current checkpoint: main `0c4ef44` passes the complete hosted quality job and
host Turbo save/restore between fresh runners. Upstream MinIO pulls remain
unavailable. The exact cached vendor images are preserved and verified; Salar
approved a public, non-latest prerelease cache for CI, now published with matching
GitHub asset digest. The fresh hosted runner successfully downloads, hashes,
loads and verifies both vendor images. Eleven images build/export successfully
in 366.8s combined, with successful layer-cache uploads. Showcase seed passes.
The stale health-socket correction is now accepted by hosted boot on `5edbabc`;
metadata populated upgrade and F3 also pass. Fresh-runner image time is 289.1s,
with imported layers reused; changed helper input means this is not an unchanged
warm benchmark. Live tests next stopped before execution on stale Auth fixture
types. Those and six Media test type errors are corrected; the new mandatory
no-emit quality gate passes all eight live owners / 125 inputs before provisioning.
Tooling 82/82, preflight 23/23 and focused Media 14/14 pass. On `94cd5ad`, full
quality, boot, metadata upgrade, F3 and all invoked live suites now pass. Fresh
hosted eleven-image time is 101.5s with cached dependency/generation/compilation.
Image scans find eleven fixable OS findings in two packages per image, zero
application-package findings, plus 57 unfixed Debian findings under existing F9
policy. Same-Bookworm PCRE2/Perl patch preparation passes; updated image scans
and the sixteen-image archive remain pending.
[Runtime patch receipt](reports/2026-10-27-runtime-debian-security-patches.md).
[Live-test preparation](reports/2026-10-27-live-test-type-preparation.md).
[Boot transport receipt](reports/2026-10-27-boot-health-connections.md).
Oct 27 health check: Docker responds; PostgreSQL, both Redis instances, MinIO
and the scanner are healthy. Eleven application containers are stopped; this is
not full backend readiness. No applications or volumes were recreated.
[Image availability and next steps](reports/2026-10-26-minio-image-availability.md).

Product/Order acceptance is complete. Paired graph image builds passed at
Product 198.2s / Order 240.4s; unchanged warm image builds passed at 11.2s / 9.4s.
Both packaged images load their own application/shared dependencies without a
sibling application checkout. All ten native modified-input cases now pass:
owner source edits compile only their owner, schema edits regenerate only their
owner, unrelated Media edits preserve downstream layers, and shared contract edits
compile each producer once with no sibling application compilation. The agent
verified all ten raw logs against summary run
`7b74b201-02d4-4e31-b9d3-5af5f79d6cc6`; evidence is archived. No new production
image was exported by those cache-only cases. Earlier cache-pressure and repeated
benchmark-marker failures remain documented; neither was silently waived.

Docker currently has seven CPUs/about 13.10GiB usable RAM and an approved active
40GiB build-cache retention target with automatic cleanup enabled. Config backups
are preserved. One retired setup container was removed without deleting volumes.
Resource/cache settings differ from the original slow build baseline, so timings
are not a controlled single-cause speedup measurement. Application readiness is
separate; the build proofs do not certify stopped applications or pending D2 SQL.
[Resource/recovery receipt](reports/2026-10-26-docker-resource-budget.md).

All eleven graph images now build/export successfully. The first image compiled
all five shared packages and eleven applications once (82.0s compilation RUN);
the following ten reused fetch/install/generation/compilation. Full initial batch
image elapsed is 665.4s (11m05.4s), including first per-image packaging/export.
All eleven offline/read-only/no-network image closures pass against exact native
export digests, including nine native Prisma engines, Gateway/Auth without own
Prisma, Realm Auth's smaller runtime closure, and Media Sharp/font/license checks.
Media emits a nonblocking default Fontconfig configuration warning; explicit
bundled-font rendering succeeds. No application containers were recreated.

Unchanged warm all-image acceptance now passes: 111.1s (1m51.1s), eleven exit0,
every RUN cached, zero compilation misses, application/config digests unchanged.
The local all-service optimization is accepted. No repeat local build is needed.
[Native/warm receipt](reports/2026-10-26-build-cleanup-segment3.md).

CI host Turbo/layer-cache persistence and exact tested-image identity evidence
are implemented with focused YAML/policy/Bake/Bash/redaction checks. All existing
quality/live/scan gates remain. Hosted cache upload/restore and pipeline acceptance
now have hosted quality and host Turbo acceptance. Hosted BuildKit layer and
runtime/archive acceptance remain pending. Docker cache mounts remain ephemeral; host task cache and exported layers
are separate. [CI receipt](reports/2026-10-26-build-cleanup-ci-cache.md).

Final release tooling fixes include the previously omitted scanner (sixteen unique
images), Windows JSON array handling and -Input path handling. All 82 tooling
checks pass; the hosted workflow will exercise native metadata upgrade, F3/e2e/
scan gates and a streamed archive round trip without leaving a large tar.
Hosted graph/COPY checks now pass. The next gate found ten dependency advisories
across seven backend packages; same-major fixes and an audit-error validation
regression are prepared. Local graph 9/9, preflight 23/23, frozen lock and valid
dependency audit pass; fresh installation/runtime acceptance remains hosted-pending.
Hosted fresh install, lint, types, security, shared checks, Gateway 270/270,
client/Web checks and all backend source builds now pass. Compose verifier
corrections pass both actual renders locally, preserving scanner-outage behavior.
The clean tracked-example render also exposed/fixed a native Media origin leaking
into local Docker Gateway; both clean local/release renders now pass, plus 14
focused environment/render tests. Unused inherited fields remain Segment 4 work.
Hosted source/image scans, integration, cache persistence and archive gates remain.

Remaining [Segment 3 gates](ASAP-BUILD-CLEANUP.md#3-generalize-and-align-integrationrelease):
hosted CI proof and integration/release/D2 deployment/live evidence. Earlier
9 graph / 12 tooling / 22 health checks remain historical evidence. The dependency
patch changes Docker inputs; closure evidence for the new lock is pending in CI.
Heavy local execution remains with Salar;
do not restart new images before the pending D2 deployment gate.
Optional packaging/env/watch/package splits remain separate decisions.

Evidence: [native acceptance](reports/2026-10-26-build-graph-native-proof.md),
[Segment 2 trace](reports/2026-10-24-build-cleanup-segment2.md),
[initial audit](reports/2026-10-24-backend-build-audit.md), and
[selection/dependency receipt](reports/2026-10-24-build-cleanup-execution.md).

Salar reports corrected Checkout recovery and Cart live passed. Earlier normal
Checkout/F3, native migrations/deployment, owner SQL proofs, 94 Order unit tests,
36 client/recovery checks and 21 preflight checks remain recorded.
The Oct 19 post-proof inspection recorded all sixteen containers healthy, eleven backend
health checks passed, no active checkout attempts and no temporary fault trigger.
No repeat build, migration or passing proof is needed without a relevant change.
Oct 24 recovery: Salar reports cold Docker/WSL recovery succeeded. Supplied
output confirms all ten configured backend checks pass and the complete
`db:verify:d2:stock` regression passes, including owned database cleanup.
Batch 3 read slice: protected admin list/detail source and focused checks are
implemented; image/native/Gateway live proof remains pending. Evidence:
[read-slice receipt](reports/2026-10-19-d2-batch3-reads.md).
Status controls now have local contract and PostgreSQL evidence: version checks,
durable replay and atomic verified-actor audit for manual demo paid/fulfilled
transitions. [Status-control receipt](reports/2026-10-19-d2-batch3-status-controls.md).
Salar reports Checkout/coordination compatibility proofs passed without errors.
Product's separate finalized-stock restoration primitive now has local checks
and real PostgreSQL proof. [Restoration receipt](reports/2026-10-19-d2-stock-restoration.md).
Order cancellation/recovery source is prepared. Salar reports its cancellation
and status SQL proofs passed; grouped native deployment remains pending.
[Cancellation trace](reports/2026-10-24-d2-order-cancellation.md).
Backed demo attempts follow, preserving the approved failure-to-PENDING policy.
[Before-edit payment approach and consumer trace](reports/2026-10-24-d2-demo-payment-plan.md).
Salar selected customer initiation with admin demo outcome simulation. First
verify the Order-owned attempt/stock lifecycle; explicit signed/Gateway routes
follow. The owner lifecycle is implemented and Salar supplied a complete passing
`db:verify:d2:demo-payment` result: upgrade/rollback, exact constraints, release/
retry/recovery, competing outcomes and original status/cancellation regressions.
Two owned disposable databases were cleaned. Both owners/SQL are real; transport
and publication dependencies were stubbed. Explicit customer/admin HTTP/RPC/Gateway/SDK transports are prepared; grouped
native deployment remains pending.
[Transport evidence](reports/2026-10-24-d2-demo-payment-transports.md). No real provider is added.
Unchecked items are not completion claims.

## Goal and boundaries

Complete a default-site customer cart, one durable idempotent demo checkout,
and user/admin order workflows through the Gateway and generated client.
D1 and F5 Core are closed: [D1 exit report](reports/2026-10-12-d1-exit-report.md).
Their detailed checklist is [archived](reports/2026-10-12-d1-completed-focus.md).

The adopted order remains D2 -> Backend Ecommerce Release B0 -> supplied Vite
admin/F7/D3. Production payments, broader inventory, frontend work, file-manager,
cloud/CDN and tenant/realm activation remain deferred. Keep demo/no-production-
payment labeling explicit and never collect real payment credentials.

Existing Order code already has cart operations, Product/Settings calls, user
order filtering and a local checkout transaction. Preserve working mechanisms;
the entry audit establishes what actually needs correction.

## Working rules

Before each change, follow the
[mandatory test preparation checklist](testing/pre-suite-checklist.md).
Record exact consumer paths and findings in the slice report, update consumers
after editing, run applicable cheap gates and write the handoff receipt before
broad tests/builds. Contract changes require `pnpm test:preflight`.
A mock pass is not SQL/runtime evidence; heavy proofs stay explicitly pending.

Run fast inspections/focused checks directly. Salar runs heavy builds, broad
integration/live suites and Compose work. Reuse passing evidence unless a
relevant change/failure invalidates it. Preserve unrelated work and the paused
R6.1 stash. No cross-service database reads or caller-supplied authority.

Salar confirms project demo databases/data are disposable and may be recreated
when needed. Preserving today's demo rows is not a development objective. Keep
contract/ownership/replay/rollback checks, but group build/deployment cycles and
avoid repeating production-style maintenance steps for each additive demo change.
No database is erased by this policy update. Current reusable seeders cover
accounts/settings and D1 catalogue (18 Products, two Media, seven taxonomies;
limits profile optional). Cart/Order/receipt fixtures are not yet a complete
reusable ecommerce template: Order's Prisma seed is empty. Complete that existing
Batch 4 fixture task through real contracts. Full recreation must also renew
the demo journal and relevant cache state so old IDs/results are not reused.

## D2 Entry Audit

Batch 0; complete before implementing Batch 1.

- [x] Trace schemas/migrations, Order DTOs/service/HTTP/gRPC, Product/Settings
      calls, Gateway mappings/policies, generated client, fixtures and tests.
      Record the consumer impact table before implementation.
- [x] Classify confirmed gaps and existing working mechanisms for ownership,
      variants, totals/currency/stock, checkout replay/rollback, snapshots and
      status changes. Separate stale documentation, optional hardening and
      future scaling; keep the following batches bounded to the adopted D2 scope.

Evidence: [D2 entry audit](reports/2026-10-13-d2-entry-audit.md). All 11 backend
health checks and 16 container health states pass after restoring the existing
DEFAULT shadow Realm Auth container. Order's 3 unit suites/15 tests pass after
repairing its stale Product client mock; four nonblocking lint warnings remain.

## Batch 1 - Cart and selections

- [x] Trace all four items' main files and affected callers/contracts/tests/
      fixtures/tooling; record changed-versus-preserved scope and execution order.
      [Batch 1 file trace and plan](reports/2026-10-13-d2-batch1-file-trace-and-plan.md).
      Tracing and the Cart feature/regression gates are complete.

Implementation checkpoint: [Batch 1 execution and handoff receipt](reports/2026-10-13-d2-batch1-execution.md).
Cart selections, exact amounts, ownership/expiry, stock validation and serialized
mutations are implemented; generated contracts are updated. Disposable SQL and
actual Prisma-backed owner concurrency pass with stubbed remote authority.
Salar reports the corrected Docker deploy/rerun/status, Order restart, backend
health and Cart live proof all passed. Local inspection confirms all four Order
migrations applied, all three new CartItem fields present, native Prisma status
up to date at port 15432, and 16 healthy containers. The corrected root commands
pin the Docker target and have five focused command checks. The earlier target
failure and fix remain recorded in the execution report. No rebuild or repeated
Cart/migration proof is needed without a relevant change. Salar reports the
complete shared regression block all green; exact broad counts/skips were not
supplied. Batch 1 is closed. Batch 2 snapshot and local replay integration also
passed. Remote stock coordination and recovery remain incomplete.

- [x] Finalize cart/item operations using verified user ownership; deny supplied
      user, price, currency, totals, status, application or site authority.
      Trace B1-01: Order service/controllers/DTOs -> Gateway input/owner mapping
      -> authorization/transport tests, expiry/FK fixtures and unit configuration.
      [File map and approach](reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-01-ownership-and-cart-lifetime).
- [x] Support base and variant selection with selected option facts.
      Trace B1-02: CartItem schema/service -> Order proto/signed and dormant
      wrappers -> Gateway/SDK -> codec mocks, migrations and build consumers.
      [File map and approach](reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-02-base-and-variant-selections).
- [x] Validate Product lifecycle, availability, configured currency, authoritative
      price and basic stock when adding/updating selections.
      Trace B1-03: existing Product/Settings authority -> Order effective-price/
      Decimal validation -> selected response/quote tests and money SQL proofs.
      [File map and approach](reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-03-current-commercial-validation).
- [x] Define bounded quantity/update/remove behavior and deterministic totals.
      Trace B1-04: Order mutation/expiry/selection uniqueness -> Cart reply
      contracts -> unit/real DB concurrency, generated client and legacy proofs.
      [File map and approach](reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-04-quantity-mutations-and-deterministic-totals).

- [x] Complete the already-planned shared regression sign-off: full Order,
      Product and Gateway suites, affected D1 Product/variant/reference proofs,
      and F3 live compatibility. Salar reports the sequential block all green;
      exact broad counts/skips/warnings were not supplied. Earlier locally
      observed focused counts remain recorded separately. No repeat run is needed
      without a relevant change or failure.

## Batch 2 - Checkout (closed)

Closed 2026-10-19: Salar reports corrected recovery and Cart live passed.
[Final closure and evidence](reports/2026-10-14-d2-checkout-coordination.md#batch-2-closure-2026-10-19).
Earlier checkpoints below retain their original pending decisions as historical
execution notes; the closure supersedes their commands and completion status.

Replay slice: [pinned behavior, consumer trace and preparation](reports/2026-10-13-d2-checkout-replay.md).
Order-owned completed receipts, required header/RPC key forwarding, original
response replay, seven-day window and permanent compact key records are
implemented. Real PostgreSQL replay/concurrency/restart-instance/expiry/compaction
proof passes with stubbed remote authority. Salar reports native clean migration
proof and both builds passed, then the shortened demo deploy/recreate block
completed. Local checks confirm all six migrations, the receipt table, both
current images and 16 healthy containers. Salar reports the restart/readiness,
full Order/Gateway suites and Cart/F3 compatibility all passed; broad counts/skips
were not supplied. Completed local purchase replay is closed. Native rerun/status
is deferred to consolidated D2 exit. Product stock/recovery now follows; no stock
effects or remote recovery are claimed by the completed receipt.

Stock checkpoint: [Product stock trace, behavior and preparation](reports/2026-10-14-d2-stock-execution.md).
Product-owned reserve/finalize/cancel and inventory overwrite protection are
implemented. Actual disposable PostgreSQL proves same-key replay, competing
reservations, multi-item rollback, cancellation tombstones, variant refunds,
unmanaged stock and physical deletion protection. Remote publication eligibility
is stubbed in this owner proof. Salar reports native Product verification passed.

Coordination checkpoint: [Order trace, rules and preparation](reports/2026-10-14-d2-checkout-coordination.md).
Checkout source now persists a versioned attempt before reserving, freezes Cart
mutations while active, commits Order/receipt/Cart removal together and finalizes
before returning success. Leased recovery cancels abandoned pre-commit work and
finalizes committed work; uncertain commit decisions never trigger blind refunds.
Order's 8 unit suites/89 tests, the updated Cart/receipt SQL proofs and the new
actual two-database Prisma proof pass. Remote publication/transport is stubbed
in that proof. PAYMENT_PROCESSING is added across owner/Gateway/OpenAPI/SDK.
Salar reports native Order verification passed. After image deployment, direct
inspection confirmed Product's stock migration was absent: the bare Node
handoff lacked pnpm context. `pnpm db:migrate:product` now applies it; native
rerun/status pass. Signed recovery cancelled the stranded attempt and its stock
intent; the traced native gRPC fixture item was removed through Gateway and
the seeded customer Cart was emptied for the corrected proof. Subsequent
Checkout/Cart/F3 live proofs are operator-reported passed. Batch 2 stays open
for the separate outage/cache-loss proof; do not repeat completed regressions.

Latest Checkout checkpoint: exact base/variant/free totals and stock-once passed.
The admin-to-personal-route ownership probe expected 404 but correctly got 403.
Fixture correction keeps 403 and adds a reusable ordinary other customer for
the ownership 404; both focused live probes pass and their sessions were revoked.
Salar reports `pnpm test:d2:checkout:live` ran without errors after the fixture
correction. Full Checkout live is now operator-reported passed; exact stdout was
not supplied. Salar subsequently reports Cart and F3 passed too. Preserve those
results; separate outage/cache-loss execution remains pending.

Recovery checkpoint (2026-10-19): optional `--recovery` mode is prepared in the
existing owned Checkout fixture. It evicts only its exact Gateway cache entry,
stops/restores Product, checks a failed fresh checkout preserves Cart/stock,
and injects a temporary finalization fault limited to its owned Product. It
then restarts Order and checks the worker finalizes the committed intent once.
No production owner/contract/image changes. Eleven focused orchestration checks
pass; the scoped SQL fixture passed actual disposable PostgreSQL, and exact
cache eviction plus SQL readers pass against the running local stack. The
deliberate outage/restart proof remains operator-owned and pending:
`pnpm test:d2:checkout:recovery:live`. Do not mark Batch 2 complete before it passes.
The 2026-10-19 startup check confirms 16 healthy containers, all 11 backend
health probes passing, Gateway readiness 200 and an empty seeded customer Cart.
Scoped lint/types, 27 client/recovery checks and 21 preflight checks pass.

Recovery result: cache eviction plus completed owner replay passed during the
real Product outage. Fresh checkout then hit the fixture's 60-second HTTP abort;
the quote Product/Settings RPCs had no deadline. Existing stock writes were
already bounded. Order now gives its three read paths a native ten-second
deadline and cancelling Observable timeout, maps deadline exhaustion to 503 and
keeps the intentional TTL fallback. All eight Order unit suites/94 tests pass,
with the existing four error-fixture lint warnings unchanged. All sixteen
containers were restored healthy; no active attempt or temporary trigger remains.
Next: cached Order-only build/restart, backend health, recovery live and Cart
live. Do not rebuild Product/Gateway or rerun migrations for this correction.

Latest checkpoint: Order build succeeded and active image/tag match; runtime
contains bounded reads. Recovery then failed on a closed HTTP socket before its
fresh-outage assertion. The runner now reads the exact completed owner attempt
and permits at most three original-key/body replays only for UND_ERR_SOCKET.
Fresh checkout writes are never retried; HTTP errors and wrong responses remain
strict failures. Twenty D2 recovery tests (including a real local HTTP socket
closure), 36 combined client/recovery checks and 21 preflight checks pass.
All sixteen containers are healthy, all eleven backend health checks pass and
there are no active attempts or temporary fault triggers. No rebuild is needed:
rerun `pnpm test:d2:checkout:recovery:live`, then affected Cart live if successful.

First-slice checkpoint: [execution and preparation evidence](reports/2026-10-13-d2-batch2-execution.md).
Current price/SKU/options/currency/stock/lifecycle are revalidated; Cart edits
during quoting conflict. Base/variant Order facts and explicit demo replies are
implemented. Local unit/codec, typed consumers, actual PostgreSQL populated
preservation/constraints/fault rollback and Prisma-backed owner concurrency pass.
The first-slice feature gates are now closed after migration/image integration.
Salar reports the native clean migration proof and both image builds successful.
Salar also reports populated deployment/rerun/status, recreation and health passed.
Local checks confirm all five migrations applied, three snapshot columns present,
current Order/Gateway images and 16 healthy containers. Salar reports full
Order/Gateway suites plus Cart and F3 Gateway compatibility all passed; exact
broad counts/skips were not supplied. Durable replay/stock/recovery follows.
The existing Cart fault-injection check was corrected and its real proof rerun;
Order's Compose build now selects only Order and its dependencies.

- [x] Inspect current checkout/cache/stock/authorization mechanisms and trace
      main files and affected consumers before implementation.
      [Batch 2 trace and execution plan](reports/2026-10-13-d2-batch2-file-trace-and-plan.md).

Begin with revalidation and complete immutable Order snapshots, then wire the
existing key into durable owner replay and implement Product-owned stock intent/
recovery. Preserve working Cart locks, signed clients and Gateway cache. No
customer-to-admin privilege change, cross-service SQL, real payment, generic
workflow platform or frontend work is part of this batch. Pin concrete replay,
reservation/cancellation and recovery rules before the corresponding edits.

- [x] Revalidate the cart's current commercial state at checkout and define
      deterministic handling of changed/unavailable base or variant selections.
- [x] Implement bounded idempotent replay and conflict behavior, including
      concurrent attempts that must not create duplicate orders or stock effects.
- [x] Define the minimum demo stock decrement/reservation behavior and prove
      failure rollback across the affected service boundaries.
- [x] Store product/variant identity, SKU, title, options, unit price, currency
      and quantity as order snapshots that later catalogue edits cannot rewrite.
- [x] Keep checkout explicitly demo/no-production-payment; do not fabricate a
      settled payment-provider transaction.

## Batch 3 - Orders

Current execution: [Batch 3 findings, exact consumer trace and execution order](reports/2026-10-19-d2-batch3-file-trace-and-plan.md)
are recorded. Personal ownership/unfinished-Checkout filtering and admin guards
already work. Confirmed gaps are separate admin reads, permitted transitions,
mutation concurrency, owner replay/audit and binding required stock/payment
effects. Read and manual status-control slices are implemented and locally
checked; runtime/compatibility proofs and required stock/payment effects are
still open. Cancellation now dispatches through a durable stock-backed operation
in source; SQL/native proof is pending. Processing transitions remain rejected
until backed demo attempts are implemented; no deployed side effect is implied.

Execution order: protected reads first; transition/version/replay/audit controls
second; approved cancellation restoration and minimum demo attempt effects third;
then one grouped contract/SQL/image/live handoff. Preserve existing mechanisms
and defer production providers. Agent handles preparation/focused checks; Salar
handles long builds/native/broad/live commands after their prerequisites pass.

- [x] Preserve user list/detail restricted to the verified order owner.
- [ ] Complete authorized admin list/detail and status changes through Gateway.
- [ ] Define permitted transitions, concurrency, idempotency and audit facts;
      prevent caller-supplied authority at these boundaries.
      Approved payment policy: confirmed failed/customer-cancelled payment
      releases its hold and returns Order to PENDING; retry revalidates and
      reserves again. Uncertain results stay PAYMENT_PROCESSING for
      reconciliation. Explicit Order cancellation is CANCELLED. Implement the
      payment-attempt binding and permitted transitions under this item; an admin
      status patch is not a provider event. Current checkout is DEMO_NO_PAYMENT.
      Newly approved: cancelling an unpaid demo Order restores its already
      deducted stock exactly once. Checkout's FINALIZED deduction needs a
      distinct Product-owned restoration; do not misuse HELD cancellation or
      silently introduce paid refunds/fulfilled-order reversal.
- [x] Use explicit service and Gateway response mapping, with stable envelopes
      and commercial values, instead of exposing Prisma-shaped results.

## Batch 4 - Contracts and exit proof

- [ ] Confirm parity across affected DTOs, protobufs, shared clients, Gateway
      policies/input profiles, OpenAPI and generated client. Consumer updates
      happen within each earlier batch; this is the final parity check.
- [ ] Prove replay/concurrency, stale Product/variant state, ownership/role denial,
      invalid transitions, dependency failure and complete rollback with focused
      and integration tests.
- [ ] Provide applicable clean/populated migration, rerun/rollback and precise
      demo fixture/reset evidence using the real affected contracts.
      Extend the existing template with Cart/Order/receipt cases after the D2
      behavior stabilizes; keep full-demo recreation repeatable with journal/
      cache synchronization. Disposable data does not replace correctness proofs.
- [ ] Run final scoped quality/preflight and Gateway-only live cart/checkout/
      order proofs; rerun D1/F3 paths affected by D2 changes.
- [ ] Record exact results, evidence sources and remaining limitations, then
      close the D2 gates in the adopted TODO.

## D2 exit and B0 handoff

- [ ] A customer creates a cart and one durable idempotent demo order entirely
      through Gateway and the generated client.
- [ ] Orders preserve immutable commercial snapshots and correct ownership.
- [ ] User/admin reads and transitions enforce their distinct policies.
- [ ] Currency, totals, stock behavior, error envelopes and rollback have
      deterministic focused and live evidence.
- [ ] Hand off to B0's integrated proof: admin publishes a product, customer
      edits a cart/checks out/reads the order, and admin makes a permitted
      transition, with denial/replay/rollback and deterministic setup evidence.
      D2 sign-off alone does not declare B0 complete.

## Files to inspect and update when affected

| Area                            | Primary paths                                                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order owner                     | `apps/order-service/prisma/`, `apps/order-service/src/order/`, `apps/order-service/test/`                                                                                                                                          |
| Product/Settings consumers      | `apps/order-service/src/product-client.module.ts`, `apps/order-service/src/settings-client.module.ts`, `apps/product-service/src/product/`                                                                                         |
| Gateway Order                   | `apps/gateway/src/order/`, `apps/gateway/src/contracts/routes/order.routes.ts`, `apps/gateway/src/contracts/inputs/order.inputs.ts`, `apps/gateway/test/order-http.spec.ts`, `apps/gateway/test/gateway-order-api.service.spec.ts` |
| Protocol/shared clients         | `packages/protos/order.proto`, affected Product/Settings protos, `packages/clients/src/order.client.ts` and affected shared consumers                                                                                              |
| Generated contracts/inventories | Gateway OpenAPI, `packages/api-client/src/generated.ts`, focused preflight inventories and API-client tests                                                                                                                        |
| Fixtures/tooling/docs           | `scripts/demo/`, affected `scripts/db/` proofs, `scripts/backend.mjs`, package commands, `docs/services/order-service.md`                                                                                                          |

These are starting locations, not a substitute for exact caller/consumer
searches for each change. [Focus plan and inspected evidence](reports/2026-10-12-d2-focus-plan.md).

## Next action

Salar's supplied `pnpm db:verify:d2:stock` output confirms held compensation,
finalization and destructive-operation protections against the current migration
tail, including cleanup. The separate Product restoration primitive and owned
SQL proof pass. Salar reports both unpaid cancellation and status-control SQL
proofs passed. Salar supplied the complete passing demo payment SQL/recovery/race
proof, including cleanup. Its owner logic is preserved. Explicit customer start
and admin outcome bindings, generated contracts and focused checks are prepared.
Immediate next action is the reusable build path and paired Product/Order
acceptance in the [ASAP cleanup](ASAP-BUILD-CLEANUP.md). Defer the following D2
image cycle until its build preparation is ready. Then apply the pending
Product/Order migrations and build Product, Order and Gateway, following the
[transport handoff receipt](reports/2026-10-24-d2-demo-payment-transports.md).
After recreation/readiness, run the scoped native Order and Gateway payment
proofs. Batch 3 runtime sign-off and Batch 4/D2/B0 gates remain open.

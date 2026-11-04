# Archived Current Focus - Post-D2 Dependency Maintenance

Archived on 2026-10-31 before replacing the active checklist. This file preserves
historical evidence and pending notes; use [current-focus](../current-focus.md)
for the active Media -> dependency maintenance -> B0 task sequence. Later dated
receipts supersede older pending statements below.

Last updated: 2026-10-31.
Status: D2 Batches 0-4 are accepted as of 2026-10-28; B0 release remains open.
Immediate priority: finish core Media stabilization and the selected community
[SeaweedFS transition](../reports/2026-10-28-seaweedfs-transition.md), with F4 tenant
implementation still deferred. No new tenant, cloud/CDN or file-manager scope.
Salar excludes paid subscriptions/vendor activation. The commercial target is
one multi-tenant NebulaNV sold to multiple customers, with isolated customer
storage; it is not shared hosting for unrelated applications. SeaweedFS must
support that eventual requirement without per-tenant license fees. The pilot's
two credential namespaces test a storage primitive, not Nebula tenant authority.
Tenant implementation remains in deferred F4. Corrected native S3 and operator
restart/persistence proofs pass, including owned cleanup. The required
`uploadHeaders` API/protobuf/Gateway/generated client and upload-caller updates
are prepared. Focused tests, codec/contract freshness, scoped lint and all 125
backend test/helper types pass. Media/Gateway images are built and deployed;
Salar supplied eleven healthy services, Media fourteen suites/176 passing tests,
the complete derivative/processing live proof and all six F3 markers. Eleven
isolated DB tests passed separately through `pnpm db:verify:media` on Oct 31,
after the requested stack restart. Eight migrations and Media database
constraints passed; the owned disposable database was cleaned up. All sixteen
running containers remained healthy. Native
lint warnings remain visible in the slice report. The header integration is
accepted against MinIO; actual SeaweedFS conversion/security/pipeline gates are next.
Realm Auth/Authority startup satisfied the blanket health inventory and was
broader than Media needed; it did not resume F4. Future Media work targets its
actual Auth/User, DB, replay, storage and scanner dependencies.
The active stack remains MinIO. No application dependency
version upgrade is implemented yet.
[Host package realignment](../reports/2026-10-28-package-realignment.md#completion-receipt---2026-10-28)
is complete: frozen install exited zero; all 481 external direct resolutions
across 19 importers now match, resolving 103 discrepancies. All 22 dependency
input hashes are unchanged. Nine generated clients, shared imports/file parity,
native probes and 42 focused contract/environment/wrapper tests pass. The
existing dependency gate reports runtime=0; Web/fallback advisory work remains.
No selected version or lockfile changed; Media/Gateway rollout now passes,
while the remaining dependency/image maintenance is separate.
[D2 exit evidence and limits](../reports/2026-10-28-d2-exit-proof.md).
[ASAP build cleanup](../ASAP-BUILD-CLEANUP.md) Segments 1-3 are accepted and closed;
Segment 4's bounded reviews and Order/Gateway watch pilot are complete.
Optional package splits remain deferred. The D2 execution record is preserved
below; final closure supersedes its earlier pending notes. Current local tooling
changes remain uncommitted and have no new hosted CI run.

Release expectation confirmed by Salar on Oct 28: this is a new product;
target current stable, supported and mutually compatible dependencies rather
than retaining old versions by default. After D2, before B0 release sign-off,
audit runtime/build/test dependencies and container bases, apply compatible
updates and stage major migrations with their affected consumers/checks.
Retaining an older version requires an explicit evidence-backed exception:
compatibility blocker or unavailable suitable replacement, maintenance/security
status and an upgrade path. A passing suite alone is not a freshness audit.
Prioritize verified urgent security fixes when found. No upgrade is performed
merely to silence an editor warning.

Assessment result: host dependencies are now reconciled with the lockfile;
the earlier sampled Product image still predates its dependency fixes, while
rebuilt/deployed Media and Gateway carry the locked Nest/gRPC versions. SeaweedFS is the
selected storage direction for the confirmed MinIO advisory before B0, subject
to its native compatibility gate. Prepare supported
runtime/security patches next; TypeScript/Nest and the larger nine-owner Prisma
migration remain separate compatibility decisions. Web audit findings retain
their own deployment scope. No active storage cutover or upgrade batch is applied yet.
Preserve D2 feature passes; they do not certify current image dependency versions.

Oct 28 D2 resumption: Order status confirms all eleven migrations applied.
Product's one pending stock-restoration migration was applied successfully;
all twelve now pass status. Current Product/Order/Gateway tags contain the
required bindings/modules and matching migration files. Salar reports scoped
startup, `pnpm test:d2:orders:live` and `pnpm test:d2:payment:live` all passed;
exact stdout/counts were not supplied. Agent inspection confirms Product,
Order and Gateway healthy. Preserve these passes; no rebuild is needed.
[Current deployment receipt](../reports/2026-10-24-d2-demo-payment-transports.md#resumed-deployment-receipt---2026-10-28).
Salar supplied all passing [explicit Order cancellation live markers](../reports/2026-10-28-d2-order-cancellation-live.md#operator-result---2026-10-28),
including stock restoration once, immutable Checkout replay and owned cleanup.
[Batch 3 closure](../reports/2026-10-28-d2-batch3-exit.md).
Both showcase and limits cycles now pass (operator-reported); Batch 4/D2 close.
B0 release gates remain open, including the dependency maintenance expectation.

Segment 4 first review is complete: all eleven source environment schemas
validate clean local and release renders (twenty-two validations). Native module
file order, actual Nest/Compose override probes and unchanged build specification
after runtime tuning all pass. Current behavior is preserved. See the
[runtime ownership contract](../architecture/runtime-environment-ownership.md) and
[Segment 4 review receipt](../reports/2026-10-27-build-cleanup-segment4-env-review.md).
Duplicated local Gateway tuning inputs remain optional cleanup. One confirmed
release gap is corrected: two existing Authority membership-epoch inputs are now
wired through release Compose and its production example. All twenty-two config
cases pass, and either missing input fails closed. No real operator env file or
application/schema logic changed. [Correction receipt](../reports/2026-10-27-release-authority-env-correction.md).
Security maps must not be removed based on their prefix.

Packaging comparison is complete: all twenty exports and three paired runtime
checks pass. Retain the accepted shared dependency layer: the candidate shrinks
individual images but increases the measured mixed-fleet archive from 335.33 to
490.73 MiB (+46.3%). Cached eleven-image baseline exports total 176.4s; this is
not a cold-build/CI time. The Media first-package and Product warm outliers are
recorded without claiming a compiler cache miss or a measured host cause.
[Measured decision](../reports/2026-10-27-runtime-packaging-comparison.md#completed-comparison-616d63fe-retain-the-accepted-shared-layer).
No candidate adoption or another image rerun is required.

Segment 4 closure and return to D2:

1. Selected-service watch/restart is implemented with a native caller plan,
   serialized shared refresh, failure recovery and owned-process cleanup.
   Salar supplied native Order/Gateway readiness and both HTTP 200 probes on
   Oct 28, followed by all six passing F3 Gateway flows. Order-only and shared
   Order/Gateway source-edit restarts also pass. Probe comments are removed;
   Salar confirms shutdown releases the lock and both HTTP listeners. The pilot
   is accepted; D2 payment/cancellation runtime gates remain pending. The local
   tooling changes remain uncommitted, without a new hosted CI run.
   [Plan and evidence](../reports/2026-10-27-selected-service-dev-workflow.md),
   [operator workflow](../architecture/local-dev-and-docker-boot.md#selected-native-watch-workflow).
2. Proceed to D2 Batch 4 final acceptance and demo fixtures. Universal package
   splits remain conditional on measured benefit and are not D2 prerequisites.

Segment 3 exit: main implementation 7035545 passes the complete hosted quality
and live-e2e jobs, native boot/migrations/seeds, populated Product metadata upgrade,
F3/live suites, eleven image scans, sixteen-image archive/identity preservation
and eleven recorded backend identities. Actual host Turbo/BuildKit restoration
passes across fresh runners. [Exit proof](../reports/2026-10-27-build-cleanup-segment3-exit.md),
[CI receipt](../reports/2026-10-26-build-cleanup-ci-cache.md).

Measured image times: earlier initial local batch 665.4s; unchanged local warm
batch 111.1s; hosted cached exports 101.5s; final OS-patched exports 151.7s.
Hardware/cache/network conditions differ; these are not total CI durations or a
controlled single-cause speedup. All ten native modified-input cases and eleven
packaged closures remain accepted. Existing optional Media DB skips are eleven
tests, and 57 unfixed Debian findings per image remain F9-owned with zero image
blockers. No security gate or test assertion was relaxed.

Local configuration remains seven Docker CPUs/about 13.10GiB RAM with the approved
40GiB automatically cleaned build-cache target. Last Oct 27 observation: five
infrastructure services healthy, eleven app containers stopped. Review renders
and hosted CI do not start/update local apps or certify their pending D2 gates.
No repeat local build is needed for these documentation-only changes.

D2 execution history (later closure receipts supersede pending notes):

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
[read-slice receipt](../reports/2026-10-19-d2-batch3-reads.md).
Status controls now have local contract and PostgreSQL evidence: version checks,
durable replay and atomic verified-actor audit for manual demo paid/fulfilled
transitions. [Status-control receipt](../reports/2026-10-19-d2-batch3-status-controls.md).
Salar reports Checkout/coordination compatibility proofs passed without errors.
Product's separate finalized-stock restoration primitive now has local checks
and real PostgreSQL proof. [Restoration receipt](../reports/2026-10-19-d2-stock-restoration.md).
Order cancellation/recovery source is prepared. Salar reports its cancellation
and status SQL proofs passed; grouped native deployment remains pending.
[Cancellation trace](../reports/2026-10-24-d2-order-cancellation.md).
Backed demo attempts follow, preserving the approved failure-to-PENDING policy.
[Before-edit payment approach and consumer trace](../reports/2026-10-24-d2-demo-payment-plan.md).
Salar selected customer initiation with admin demo outcome simulation. First
verify the Order-owned attempt/stock lifecycle; explicit signed/Gateway routes
follow. The owner lifecycle is implemented and Salar supplied a complete passing
`db:verify:d2:demo-payment` result: upgrade/rollback, exact constraints, release/
retry/recovery, competing outcomes and original status/cancellation regressions.
Two owned disposable databases were cleaned. Both owners/SQL are real; transport
and publication dependencies were stubbed. Explicit customer/admin HTTP/RPC/Gateway/SDK transports are prepared; grouped
native deployment remains pending.
[Transport evidence](../reports/2026-10-24-d2-demo-payment-transports.md). No real provider is added.
Unchecked items are not completion claims.

## Goal and boundaries

Complete a default-site customer cart, one durable idempotent demo checkout,
and user/admin order workflows through the Gateway and generated client.
D1 and F5 Core are closed: [D1 exit report](../reports/2026-10-12-d1-exit-report.md).
Their detailed checklist is [archived](../reports/2026-10-12-d1-completed-focus.md).

The adopted order remains D2 -> Backend Ecommerce Release B0 -> supplied Vite
admin/F7/D3. Production payments, broader inventory, frontend work, file-manager,
cloud/CDN and tenant/realm activation remain deferred. Keep demo/no-production-
payment labeling explicit and never collect real payment credentials.

Existing Order code already has cart operations, Product/Settings calls, user
order filtering and a local checkout transaction. Preserve working mechanisms;
the entry audit establishes what actually needs correction.

## Working rules

Before each change, follow the
[mandatory test preparation checklist](../testing/pre-suite-checklist.md).
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

Evidence: [D2 entry audit](../reports/2026-10-13-d2-entry-audit.md). All 11 backend
health checks and 16 container health states pass after restoring the existing
DEFAULT shadow Realm Auth container. Order's 3 unit suites/15 tests pass after
repairing its stale Product client mock; four nonblocking lint warnings remain.

## Batch 1 - Cart and selections

- [x] Trace all four items' main files and affected callers/contracts/tests/
      fixtures/tooling; record changed-versus-preserved scope and execution order.
      [Batch 1 file trace and plan](../reports/2026-10-13-d2-batch1-file-trace-and-plan.md).
      Tracing and the Cart feature/regression gates are complete.

Implementation checkpoint: [Batch 1 execution and handoff receipt](../reports/2026-10-13-d2-batch1-execution.md).
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
      [File map and approach](../reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-01-ownership-and-cart-lifetime).
- [x] Support base and variant selection with selected option facts.
      Trace B1-02: CartItem schema/service -> Order proto/signed and dormant
      wrappers -> Gateway/SDK -> codec mocks, migrations and build consumers.
      [File map and approach](../reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-02-base-and-variant-selections).
- [x] Validate Product lifecycle, availability, configured currency, authoritative
      price and basic stock when adding/updating selections.
      Trace B1-03: existing Product/Settings authority -> Order effective-price/
      Decimal validation -> selected response/quote tests and money SQL proofs.
      [File map and approach](../reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-03-current-commercial-validation).
- [x] Define bounded quantity/update/remove behavior and deterministic totals.
      Trace B1-04: Order mutation/expiry/selection uniqueness -> Cart reply
      contracts -> unit/real DB concurrency, generated client and legacy proofs.
      [File map and approach](../reports/2026-10-13-d2-batch1-file-trace-and-plan.md#b1-04-quantity-mutations-and-deterministic-totals).

- [x] Complete the already-planned shared regression sign-off: full Order,
      Product and Gateway suites, affected D1 Product/variant/reference proofs,
      and F3 live compatibility. Salar reports the sequential block all green;
      exact broad counts/skips/warnings were not supplied. Earlier locally
      observed focused counts remain recorded separately. No repeat run is needed
      without a relevant change or failure.

## Batch 2 - Checkout (closed)

Closed 2026-10-19: Salar reports corrected recovery and Cart live passed.
[Final closure and evidence](../reports/2026-10-14-d2-checkout-coordination.md#batch-2-closure-2026-10-19).
Earlier checkpoints below retain their original pending decisions as historical
execution notes; the closure supersedes their commands and completion status.

Replay slice: [pinned behavior, consumer trace and preparation](../reports/2026-10-13-d2-checkout-replay.md).
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

Stock checkpoint: [Product stock trace, behavior and preparation](../reports/2026-10-14-d2-stock-execution.md).
Product-owned reserve/finalize/cancel and inventory overwrite protection are
implemented. Actual disposable PostgreSQL proves same-key replay, competing
reservations, multi-item rollback, cancellation tombstones, variant refunds,
unmanaged stock and physical deletion protection. Remote publication eligibility
is stubbed in this owner proof. Salar reports native Product verification passed.

Coordination checkpoint: [Order trace, rules and preparation](../reports/2026-10-14-d2-checkout-coordination.md).
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

First-slice checkpoint: [execution and preparation evidence](../reports/2026-10-13-d2-batch2-execution.md).
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
      [Batch 2 trace and execution plan](../reports/2026-10-13-d2-batch2-file-trace-and-plan.md).

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

## Batch 3 - Orders (closed)

Current execution: [Batch 3 findings, exact consumer trace and execution order](../reports/2026-10-19-d2-batch3-file-trace-and-plan.md)
are recorded. Personal ownership/unfinished-Checkout filtering and admin guards
are preserved. Admin read/status and backed demo payment slices are implemented,
deployed and operator-reported passed through Gateway on Oct 28. Owner SQL
proves concurrency/replay/audit and stock/payment recovery separately. Explicit
Order cancellation uses the existing durable Product restoration operation;
its SQL and distinct Gateway live proofs now pass. This closes Batch 3;
[combined evidence](../reports/2026-10-28-d2-batch3-exit.md). No real payment provider
or paid refund is implied.

Execution order: protected reads first; transition/version/replay/audit controls
second; approved cancellation restoration and minimum demo attempt effects third;
then one grouped contract/SQL/image/live handoff. Preserve existing mechanisms
and defer production providers. Agent handles preparation/focused checks; Salar
handles long builds/native/broad/live commands after their prerequisites pass.

- [x] Preserve user list/detail restricted to the verified order owner.
- [x] Complete authorized admin list/detail and status changes through Gateway.
- [x] Define permitted transitions, concurrency, idempotency and audit facts;
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

## Batch 4 - Contracts and exit proof (closed)

Execution order: reconcile the existing contract/proof evidence and identify
actual remaining gaps; extend the existing demo template with Cart/Order/receipt
cases and safe rerun/reset; then consolidate necessary final regressions and
D2/B0 evidence. Trace affected consumers before each implementation change.
Preserve accepted owner SQL, migration and live proofs unless a relevant change
invalidates them. No speculative feature expansion or blanket rebuild.

Current slice: the D2-owned commerce template and customer/session/journal
consumers are implemented. Seven lifecycle scenarios, three products and an
editable Cart are prepared, with showcase default and a separate limits profile.
Existing D1 commands/schema remain compatible. Focused fixture/DTO and preflight
checks precede live proof. Salar reports the full corrected showcase cycle
passed, followed by the complete limits cycle. Actual hosted logs for
unchanged server commit ba181dc confirm full native Order/Product suites and
clean migration tails; local rerun/status also pass. Those conservative pending
native checks are reconciled, not rerun needlessly. New uncommitted tooling's
hosted acceptance remains separate. No image rebuild is required for this slice.
[Trace and proof states](../reports/2026-10-28-d2-batch4-execution.md),
[operator commands and reset semantics](../architecture/d2-demo-workflow.md).

- [x] Confirm parity across affected DTOs, protobufs, shared clients, Gateway
      policies/input profiles, OpenAPI and generated client. Consumer updates
      happen within each earlier batch; this is the final parity check.
      Preserved codec/consumer evidence plus current freshness/preflight:
      4 suites/23 tests pass. No server/generated contract change; actual new
      template and final native/runtime exit gates below remain separate.
- [x] Prove replay/concurrency, stale Product/variant state, ownership/role denial,
      invalid transitions, dependency failure and complete rollback with focused
      and integration tests.
- [x] Provide applicable clean/populated migration, rerun/rollback and precise
      demo fixture/reset evidence using the real affected contracts.
      Extend the existing template with Cart/Order/receipt cases after the D2
      behavior stabilizes; keep full-demo recreation repeatable with journal/
      cache synchronization. Disposable data does not replace correctness proofs.
      After the first live run exposed a collection-envelope mismatch, both seed
      and reset lookups now consume the wrapper's actual array contract. Added
      actual-envelope/SDK/wrapper regressions; 45 D1/D2 tests pass with CI flags,
      scoped lint/syntax/types clean. Showcase seed/verify/rerun/reset/recreation
      passes for showcase: Salar reports the complete corrected cycle without
      errors, followed by all passing limits commands; exact stdout/counts were
      not supplied. Both profiles are accepted.
      Full native Order (202 tests)/Product (204 tests) and clean migration tails
      are verified from the unchanged-source hosted job; local rerun/status pass.
- [x] Run final scoped quality/preflight and Gateway-only live cart/checkout/
      order proofs; rerun D1/F3 paths affected by D2 changes.
- [x] Record exact results, evidence sources and remaining limitations, then
      close the D2 gates in the adopted TODO.

## D2 exit and B0 handoff

- [x] A customer creates a cart and one durable idempotent demo order entirely
      through Gateway and the generated client.
- [x] Orders preserve immutable commercial snapshots and correct ownership.
- [x] User/admin reads and transitions enforce their distinct policies.
- [x] Currency, totals, stock behavior, error envelopes and rollback have
      deterministic focused and live evidence.
- [x] Hand off to B0's integrated proof: admin publishes a product, customer
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
searches for each change. [Focus plan and inspected evidence](../reports/2026-10-12-d2-focus-plan.md).

## Next action

Salar's supplied `pnpm db:verify:d2:stock` output confirms held compensation,
finalization and destructive-operation protections against the current migration
tail, including cleanup. The separate Product restoration primitive and owned
SQL proof pass. Salar reports both unpaid cancellation and status-control SQL
proofs passed. Salar supplied the complete passing demo payment SQL/recovery/race
proof, including cleanup. Its owner logic is preserved. Explicit customer start
and admin outcome bindings, generated contracts and focused checks are prepared.
Batch 3 is closed: scoped deployment, admin Order/status, demo payment and
explicit unpaid Order cancellation through Gateway pass. Batch 4's commerce
template's full showcase and limits cycles pass. All D2 feature/demo gates are
closed in the [exit ledger](../reports/2026-10-28-d2-exit-proof.md). Next: inventory
installed/pinned versus current stable supported dependencies and container
bases, identify concrete security/compatibility gaps and group upgrade checks.
Preserve D2 evidence as the baseline; major migrations need their own traced
consumers and cost review. Publishing/current-tooling CI and B0 release remain
open. Heavy execution stays with Salar; no rebuild for this doc-only closure.

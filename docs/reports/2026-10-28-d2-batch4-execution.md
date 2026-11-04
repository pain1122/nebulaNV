# D2 Batch 4 execution and preparation

Status: D2 Batch 4 accepted on 2026-10-28. Both demo cycles and reconciled
native/migration gates pass; [final exit ledger](2026-10-28-d2-exit-proof.md).
Earlier pending receipts below are historical and superseded by final acceptance.
Requirement: close existing D2 contracts/evidence, add repeatable commerce demo
fixtures and ownership-aware reset, then consolidate final release proofs.
No new commerce API, schema, framework migration or cloud/tenant work.

## Before-edit trace and bounded approach

| Exact owner/consumer paths                                                                                                                                                                                                                                                     | Action or unchanged reason                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/demo/catalog.mjs`, `runner.mjs`, `run.mjs`                                                                                                                                                                                                                            | Existing D1 definitions/verification stay unchanged. Extend entrypoint with explicit commerce dispatch; no implicit D2 work during D1 commands.                                                                                                               |
| New `scripts/demo/commerce-catalog.mjs`, `commerce-runner.mjs`                                                                                                                                                                                                                 | Own three commerce products, seven lifecycle scenarios and an editable Cart; use only existing Gateway operations and configured currency. Separate D2 namespace/customer prevents D1 stock drift or consumption of another demo Cart.                        |
| `scripts/demo/state.mjs`, new `commerce-state.mjs`                                                                                                                                                                                                                             | Reuse existing exclusive lock/atomic-write mechanism with named journals. Preserve D1 filename/schema and wrapper; add strict D2 journal with generation, owner, product/order IDs, immutable keys and step replies. No credentials/session tokens persisted. |
| `scripts/demo/gateway.mjs`                                                                                                                                                                                                                                                     | Preserve D1 admin/anonymous/user-denial identities. Add explicit mobile customer login/registration, verified ordinary-user identity and client-specific logout, preserving bounded rate-limit handling and original mutation keys.                           |
| `scripts/demo/demo.test.mjs`, new `commerce.test.mjs`                                                                                                                                                                                                                          | Existing D1 regressions plus real generated-operation inventory, clean/partial/lost-reply reruns, drift/foreign-Cart rejection, lifecycle/stock facts, expiry and reset/resume tests. Mock fixture evidence is separate from actual live proof.               |
| Root `package.json`                                                                                                                                                                                                                                                            | Add `demo:d2:plan/seed/verify/reset` and focused fixture test aliases. Dependencies/lock unchanged.                                                                                                                                                           |
| `packages/api-client/src/generated.ts`, `apps/gateway/src/contracts/routes/order.routes.ts`, `inputs/order.inputs.ts`, `src/order/order-api.dto.ts`                                                                                                                            | Existing 81-operation surface and version/role schemas reused; no generated edits/count changes. Freshness/preflight before live handoff.                                                                                                                     |
| `apps/order-service/src/order/order-cancellation.ts`, `demo-payment.ts`, `order-status.ts`, `checkout-receipt.ts`, `cart-contract.ts`, `order.service.ts`                                                                                                                      | Reviewed lifecycle, seven-day receipt replay and Cart expiry. Preserve proved owner behavior. Fresh pending mutation resumes use original durable keys; no new Order on seed rerun.                                                                           |
| `apps/product-service/src/product/checkout-stock.service.ts`, `product.service.ts`                                                                                                                                                                                             | Preserve proved stock/physical-deletion rules. Only D2-owned catalogue rows may be reset; no cross-service SQL.                                                                                                                                               |
| `scripts/db/verify-d2-cart.mjs`, `verify-d2-checkout.mjs`, `verify-d2-coordination.mjs`, `verify-d2-stock.mjs`, `verify-d2-stock-restoration.mjs`, `verify-d2-order-reads.mjs`, `verify-d2-order-status.mjs`, `verify-d2-order-cancellation.mjs`, `verify-d2-demo-payment.mjs` | Reconcile recorded real SQL coverage; no duplicate verifier framework. Clean native Prisma tail and native HTTP/RPC suite acceptance remain final operator-owned gates.                                                                                       |
| `apps/order-service/test/http/order.http.e2e.spec.ts`, `test/grpc/order.e2e.spec.ts`, `test/setup/wait-for-services.ts`, `scripts/check-backend-test-types.mjs`                                                                                                                | Existing native fixture/readiness/type gates retained; final broad runs stay with Salar after cheap preparation.                                                                                                                                              |
| `.github/workflows/ci.yml`, `scripts/backend.mjs`, `scripts/backend.test.mjs`, Dockerfile/Compose/Bake                                                                                                                                                                         | Existing pipeline, selected builds and database proof commands retained. Add commerce fixture test to existing quality stage; no server rebuild for demo-only files.                                                                                          |
| `docs/current-focus.md`, `TODO-ALTERNATIVE.md`, `docs/services/order-service.md`, `docs/packages/api-client.md`                                                                                                                                                                | Keep exact proof states and commands current; Batch 4/D2/B0 remain open until actual exit evidence. Post-D2 dependency maintenance remains before B0 sign-off.                                                                                                |

## Pinned demo behavior

- Showcase by default; limits on demand, with separate profile journals/customer
  identities. Scenarios: unpaid PENDING; UNKNOWN/processing; confirmed failed
  payment/PENDING; cancelled payment/PENDING; retry then PAID; FULFILLED; explicit
  Order CANCELLED. One owned editable Cart demonstrates base/variant/free items.
- Journal mutation intent/key before sending. Store known successful replies;
  resume pending durable Checkout/status/payment writes with the same key/body.
  Do not blindly repeat Cart adds or non-durable catalogue writes after a lost
  reply: reconcile current owned state first. Never accept unowned collisions.
- Repeated seed verifies existing Orders and never purchases them again. Verify
  uses current Order reads and stored immutable snapshots, respecting the
  existing seven-day Checkout replay window. An expired open Cart can be
  refreshed by seed; verify reports normal expiry explicitly.
- Reset preflights ownership, clears only owned Cart lines, resolves owned
  processing attempts before cancelling eligible unpaid Orders, then removes
  owned products and rotates the fixture generation. Immutable Order/receipt
  history and the reusable ordinary customer identity are retained. There is
  no new public Order deletion endpoint or silent whole-database wipe.
- Interrupted reset resumes from the same journal. Unknown/mutated ownership,
  foreign Cart content or commercial drift fails explicitly, with no broad
  cleanup. Full empty-history database recreation is a distinct operator action.

## Proof reconciliation at entry

Batches 0-3 and their exact SQL/live evidence are preserved by the
[Batch 3 closure](2026-10-28-d2-batch3-exit.md). Oct 28 admin/status, payment and
explicit cancellation Gateway proofs pass; the cancellation transcript includes
owned cleanup. This does not certify new seeder code, native HTTP/RPC fixture
suites, full current-tail clean Prisma deployment or a new hosted CI snapshot.
Prepare those exact remaining gates after implementation rather than rebuilding
already-current images or repeating every historical proof.

## Final consumer review and preparation results

- D1 keeps its original catalogue/runner, journal name/schema, admin/anonymous/
  ordinary-user denial identities and command defaults. `withJournal` delegates
  to the same locking/atomic-write logic with the original names. D2 uses
  `d2-showcase`/`d2-limits` journals and explicit mobile customer sessions. All
  sessions use their original client and refresh/cookie form on logout.
- New catalog/runner/state/tests implement the pinned scenarios. Journalled
  pending durable writes resume with original keys/body; lost Product/variant
  and Cart replies are reconciled before duplicate creation/addition. Reset
  also recovers missing owned IDs before cleanup. A create with no resolvable
  current match stops for seed recovery, rather than creating new cleanup work.
  Repeated empty reset is a no-op. Target/customer/definition/commercial drift
  and foreign selections fail explicitly. No credentials/session tokens enter
  journals; history/keys are retained across fixture generations.
- Actual source DTO/owner inspection caught three fixture assumptions before
  handoff: variant response uses `active`, Order note is in JSON `meta`, and the
  real quantity ceiling is 2,147,483,647. The initial limits fixture incorrectly
  expected quantity 101 to fail (observed 200 versus expected 400); it now checks
  the actual accepted maximum and rejects zero/maximum-plus-one through the real
  Gateway DTO validators. No service validation or assertion was weakened.
- New fixtures load actual Gateway DTO source with the installed TypeScript/
  class-transformer/class-validator tooling; they verify every constructed body
  and use the real generated operation inventory. This is DTO/orchestration
  evidence, not a database, authentication-server or real Gateway certification.
- Final focused run with `CI=true` and `GITHUB_ACTIONS=true`: **43/43 Node tests
  pass**, zero failures/skips (28 existing D1 and 15 D2). Coverage includes lost
  replies for seven mutation types, partial reset, normal Cart and receipt-window
  expiry, foreign data/drift, profile journal separation, concurrent-lock/path
  checks, actual CLI dispatch and customer-client/registration/logout wiring.
  Logs: `.ci-evidence/d2-b4-ci-fixtures.log` and `d2-b4-commerce-fixtures.log`.
- Contract freshness/preflight: **4 suites / 23 tests pass**. Existing 81-route
  generated surface and inventories are unchanged. No proto/DTO/RPC/pin/snapshot
  changes. Existing backend no-emit evidence (eight applicable owners/125 files)
  remains valid: no backend TS/test/helper, shared producer or Prisma source
  changed. JS tooling tests use the existing root ESLint policy and real DTO
  validation; no TS test is excluded from a typed project.
- All seven affected JS modules pass scoped ESLint and Node syntax. API-client
  no-emit types pass; CLI plans/command aliases are verified. Scoped Prettier and
  `git diff --check` pass. No dependency/lock change. CI's existing quality job
  now runs both focused demo test aliases; no new live job or application startup
  is introduced. Hosted acceptance of this uncommitted snapshot is still pending.
- Source review confirms no changes under apps, protos, clients or SDK source.
  No Docker/Compose/Bake source change, so no image/context/build proof is needed
  for this host-only slice. Agent inspected twelve required backend/infra entries
  (User/Auth/Settings/Media/Taxonomy/Product/Blog/Order/Gateway/Postgres/Redis/MinIO):
  all running/healthy. No claim that stopped optional profiles are healthy.
- `docs/architecture/d2-demo-workflow.md`, current-focus, adopted TODO, Order and
  API-client docs record exact commands, reset/history limits and pending live
  acceptance. Earlier passing core SQL/live evidence remains preserved; native
  HTTP/RPC fixtures and clean current-tail Prisma proofs are not inferred passed.

## Mandatory handoff receipt

Requirement/finding: D1-only fixtures lacked a reproducible owned D2 commerce
template. Exact consumer map and reviewed outcomes above. Cheap preparation is
complete. No app/schema/contract changes require a rebuild or repeat core SQL.
Actual template acceptance remains operator-owned and PENDING.

Run sequentially in repository-root PowerShell, stopping on the first error:

```powershell
pnpm demo:d2:seed
pnpm demo:d2:verify
pnpm demo:d2:seed
pnpm demo:d2:reset
pnpm demo:d2:seed
pnpm demo:d2:verify
```

Expected: current-generation `orders=7 products=3 cart=ready`; the rerun makes
no new purchase; reset removes only owned working fixtures, retains seven old
Orders/receipts/customer and recreation makes a new seven-Order generation.
Existing non-D2 Cart/catalogue data is not consumed or reset. Gateway rate-limit
wait messages are explicit/bounded. No restart/build needed unless actual
readiness changes. Limits profile acceptance follows separately after showcase.

After actual fixture acceptance, consolidate the remaining named operator gates:
current-tail clean native Product/Order Prisma verification/deploy-rerun/status,
native Order HTTP/RPC fixture suites and affected final compatibility tests.
Prepare their actual configurations/readiness before handoff; do not blindly
repeat all historical SQL/outage runs. D2/B0 exit stays open; dependency
maintenance remains scheduled after D2 and before B0 release sign-off.

Readiness: READY FOR D2 SHOWCASE SEED/RERUN/RESET LIVE PROOF.

## First live failure and correction trace

Salar's first seed failed in `ensureProducts`: `existing.items.filter` received
undefined. Verify then correctly refused the incomplete seed; reset reported no
owned working fixtures. Agent inspected the journal without printing personal
data/keys: ready=false, zero products, Orders, commands or history, not resetting.
No journal deletion, migration or container rebuild is needed.

Confirmed defect: `scripts/demo/gateway.mjs` `unwrapGatewayResult` returns
`result.data.data`. Product collections therefore reach callers as an array;
Gateway `gatewayCollectionEnvelope` and generated `admin_products_list` agree.
Existing D1 `scripts/demo/runner.mjs` already consumes that array correctly.
New D2 `ensureProducts` and reset's lost-create lookup incorrectly expected an
`items` wrapper, and `commerce.test.mjs` supplied the same incorrect wrapper.
Actual DTO validation did not test response/envelope consumption. Earlier 43
focused passes remain historical; they did not certify this boundary.

Before-edit consumers: `scripts/demo/commerce-runner.mjs` (both list lookups),
`commerce.test.mjs` (mock collection shape and new full HTTP-envelope/SDK bridge),
Gateway `src/contracts/api-envelope.ts`,
`src/product/gateway-product-api.service.ts`, `test/product-http.spec.ts`, SDK
`src/generated.ts`, demo `gateway.mjs`/D1 `runner.mjs`, current-focus and this
receipt. Fix the two D2 consumers to require an array; preserve the public API,
wrapper and D1 behavior. Reject malformed responses explicitly instead of
silently treating them as empty. Add a regression using actual Gateway envelope
factories, generated client and `connectGateway` for empty/nonempty collections,
lost-create recovery, seed/rerun/reset/recreation. Only remote domain effects
are mocked; real live acceptance remains pending after correction.

Correction consumer review: both lookups use one array-validated Product-list
helper. Every remaining `.items` access is to a real Cart/Order object; reset's
`api.result` reads retain the raw SDK result/envelope access intentionally.
The D1 consumer and Gateway helper/server/generated shape are unchanged. The
fixture now returns arrays, and the added bridge test uses the actual Gateway
item/collection factories, generated SDK and `connectGateway` across a lost
create response, empty/nonempty lookup, full seed/verify/rerun/reset/recreation.
It also preserves malformed-response rejection before any Product creation or
reset deletion. No fallback silently substitutes an empty list.

Corrected CI-flags run: **45/45 Node fixture tests pass** (28 D1, 17 D2), zero
failures/skips. Scoped ESLint, Node syntax, Prettier and diff checks pass. The
earlier real-D2 failure remains recorded above. Business effects in these
bridge tests remain mocked; actual template acceptance is still pending.
The three affected service containers are observed running/healthy. No schema,
app, RPC, generated source, dependency, journal or image edits are required.
Evidence: `.ci-evidence/d2-b4-list-correction-ci.log` and
`d2-b4-list-correction-preflight.log`.

Retry handoff supersedes the six-command block for now: run only
`pnpm demo:d2:seed`, stop on any error and return its final `[demo-d2]` lines.
Do not reset/delete the current journal or run verify before seed succeeds.

Fresh correction preflight also passes: generated freshness and 4 suites/23
tests, zero failures. No backend TS/test/helper source changed, so the preserved
eight-owner/125-file no-emit gate remains valid. Readiness: READY FOR CORRECTED
D2 SEED LIVE RETRY; actual live success remains pending.

## Showcase acceptance and native evidence reconciliation

Salar reports the remaining corrected showcase cycle completed without errors:
standalone verify, seed rerun, reset, recreation seed and final verify. Combined
with the earlier corrected seed report, showcase acceptance is operator-reported
passed. Exact stdout/counts were not supplied. The tested runner verifies seven
current-generation Orders, three products, expected stock/snapshots and Cart;
rerun makes no new purchase and reset/recreation retains immutable history.
This does not certify the separate limits profile.

To avoid unnecessary repeat work, the agent fetched the actual GitHub job/step
results and decoded logs through the connected GitHub tools for
[run 40489398015](https://github.com/pain1122/nebulaNV/actions/runs/40489398015),
successful live job
[122140756637](https://github.com/pain1122/nebulaNV/actions/runs/40489398015/job/122140756637).
The job log includes current HEAD `ba181dcf6d6e3773e5bc0290cb7c7d71d509b1a4`.
Tracked and untracked inspection confirms no changes to app source/tests,
protos, shared clients, SDK source, accepted Dockerfile or local Compose since
that tested commit. This is specific source/proof reuse, not a blanket claim
that prior green CI certifies new uncommitted host tooling.

Verified hosted evidence:

- Native `pnpm test:e2e` executed Order's **14 suites / 202 tests**, all pass,
  explicitly including `test/http/order.http.e2e.spec.ts` and
  `test/grpc/order.e2e.spec.ts`. Product's **22 suites / 204 tests** all pass.
  Counts include unit and integration cases; not every test is a live RPC call.
- Provisioning deployed Product's complete **12 migrations** and Order's complete
  **11 migrations**, including finalized restoration, status controls,
  cancellation and demo attempts, and both Prisma statuses were up to date.
  Current-tail populated Product metadata upgrade/failed-upgrade rollback/native
  deploy-rerun/status passed separately in that job. Existing D2-specific owner
  SQL preservation/rollback/race/recovery proofs remain credited to their own
  earlier reports, not inferred from the metadata fixture.
- The F3 live step and live-e2e step conclude success. Existing Media coverage
  retains two skipped suites/eleven tests; Order/Product have no reported skips
  in their final summaries. This does not activate optional Media DB suites.

Local Oct 28 rerun/status confirmation, executed by the agent after showcase:
`pnpm db:migrate:product` reports no pending migrations and subsequent status
passes all twelve; `pnpm db:migrate:order` reports no pending migrations and
subsequent status passes all eleven. Existing Prisma package-config deprecation
warnings remain visible. No schema/data reset, dependency update or rebuild.
These small checks plus exact hosted source evidence resolve the previously
conservative pending clean-migration/native-fixture notes above. No repeat of
those broad suites is needed without a relevant source change.

Next named operator proof: the separate limits cycle, same semantics and its
own profile journal/customer:

```powershell
pnpm demo:d2:seed limits
pnpm demo:d2:verify limits
pnpm demo:d2:seed limits
pnpm demo:d2:reset limits
pnpm demo:d2:seed limits
pnpm demo:d2:verify limits
```

All cheap preparation remains passing (45 fixtures, 23 preflight, scoped syntax/
lint/types/format/diff); no implementation changed during this reconciliation.
Limits expects the actual maximum on one free/unmanaged line and explicit
zero/over-limit denial, not billions of generated rows. Stop on first error.
Actual limits acceptance and final D2 exit documentation remain pending; current
uncommitted tooling/CI changes still have no hosted acceptance of their snapshot.
Post-D2 dependency maintenance remains required before B0 sign-off.

## Corrected seed checkpoint

After the single corrected `pnpm demo:d2:seed` retry handoff, Salar reports
"complete". Record the corrected initial seed as operator-reported completed;
exact stdout/counts were not supplied. This does not certify the remaining
standalone verify, seed rerun, reset/recreation or limits profile cycle.
Earlier passing preparation remains valid: no further implementation change.
Continue the remaining five commands from the original showcase block in order,
stopping on errors. Do not rebuild images or erase the journal for this step.

## Final limits acceptance and Batch 4 closure

Salar reports all six limits-profile cycle commands passed. Together with the
corrected showcase cycle, both profile seed/standalone verify/rerun/reset/
recreation proofs are operator-reported passed; exact stdout/counts were not
supplied. No implementation changed after the accepted correction. All earlier
45 fixture/23 preflight/scoped quality passes and exact unchanged-source native
CI/migration evidence remain valid. No repeat suite or rebuild is justified by
this documentation-only closure.

The [D2 exit ledger](2026-10-28-d2-exit-proof.md) maps every requirement to its
focused, SQL, native or operator source and names the remaining release limits.
Current-focus and adopted TODO close Batch 4/D2 consistently. B0 is not closed:
dependency currency review and publishing/current-tooling CI remain release
work. Order/receipt history retention and existing Media skips are explicit.

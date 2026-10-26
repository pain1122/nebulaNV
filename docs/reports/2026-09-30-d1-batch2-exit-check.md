# D1 Batch 2 exit check (2026-09-30)

Status (updated 2026-10-03): Batch 2 closed. All three exit gates pass.
The final rebuilt Product/Gateway reference flow passed all eight checks,
including disabled URL input rejection, URL-free external responses, Media
rendering, blocked-Media denial, and cleanup. All eleven backend health checks
pass. Earlier clean-deploy, Product live, Order integration, and F3 regression
evidence is recorded below; D1-wide migration/fixture proof remains Batch 4.

## Approved response change (2026-10-03)

Remove `thumbnailUrl`, gallery `url`, `model3dUrl`, `model3dPosterUrl`, and
`vrPlanImageUrl` from external Product response DTOs, mapping, OpenAPI, and the
generated client. Keep Media IDs and the existing Media render operation.
Suppress stored provider URL values in Product's internal responses as well;
keep protobuf field numbers for compatibility and derive only governed Media
render paths where the existing internal wire requires them. Preserve stored
legacy rows for SQL audit and Batch 4 reconciliation. The subsequent explicit
approval also disables `model3dUrl`, `model3dPosterUrl`, and `vrPlanImageUrl`
on create and patch. Remove their external/internal DTO allowance and Gateway
forwarding, reject them at the Product owner before persistence, and retain
existing internal protobuf slots only for rejection of older callers. No
database migration or automatic stored-data rewrite is required.

This is an approved breaking response change, not optional security hardening.
The old Next.js Product list reads `thumbnailUrl`; it needs adaptation if reused.
Frontend source remains outside this backend work.

## Evidence classification and correction

- **Confirmed implementation gap:** Product validated Taxonomy and Media IDs on
  writes and explicit re-publication, but a linked record could become hidden or
  blocked afterward. Public Product detail, catalogue pages, and gallery reads
  now recheck the owning services. A broken reference or dependency failure
  returns 503 without a partial public Product response. Category checks now
  reject hidden records as well as wrong IDs, scopes, and kinds. Stored rows are
  retained for admin repair; this is public-read eligibility, not a claim of a
  cross-database foreign key.
- **Confirmed defect:** Product used Settings `pricing/default/default_currency`,
  while Order created carts with a local USD value, fell back to EUR for a
  missing Product currency, and allowed checkout after the shop setting had
  changed. Order now uses the same Settings key for cart creation and cart-item
  acceptance, rejects absent or contradictory Product currency, and checks the
  cart currency again before checkout. Existing nonempty carts are not silently
  converted. The new Order migration removes stale Cart and Order database
  defaults without rewriting rows. Product also denies public reads and
  explicit re-publication when its stored currency differs from Settings.
- **Stale release configuration:** local Compose already made Product depend on
  Media readiness, but release Compose omitted that dependency. The release
  dependency now matches the local graph.

The Media eligibility resolver is restricted to signed internal calls from
Product service, including anonymous public catalogue checks. Its Media-owned
eligibility rules and stable gateway render path remain unchanged. No D1
Product reference field requires a storage key, bucket, credential, upload URL,
or provider-specific read URL. Product reads its own database and calls
Taxonomy, Media, and Settings through service clients. Following the user's
2026-10-03 decision, external responses omit all five legacy URL fields named
above. Internal responses suppress stored provider values. Thumbnail/gallery
writes require Media IDs, and public reads deny unresolved legacy URL rows.
The user's subsequent approval also disables deferred 3D/VR URL writes.
Gateway and Product DTOs reject those fields on create and patch, Gateway no
longer forwards them, and the Product owner rejects direct callers before
reads/writes and never assigns those database columns. Historical values are
preserved. Internal protobuf slots remain decodable so older callers receive
`INVALID_ARGUMENT` rather than having their supplied fields silently ignored.
The response change and input rejection both pass rebuilt-container live proof.

Public catalogue reads now perform Settings and reference checks before
responding. A page of up to 100 Products can cause many Taxonomy/Media calls;
deduplication or event-driven invalidation is a future scaling consideration,
not required to establish the current default-site behavior. A setting change
can leave old stored Product and Cart currency values; public Product reads and
Order mutations fail closed until an operator reconciles them.

## Local checks

- Product unit suite: 14 suites, 94 tests passed, including hidden Taxonomy,
  blocked Media, currency-change, re-publication, and no-partial-page denial.
- Order unit suite: 3 suites, 15 tests passed, including non-USD creation,
  missing configuration, missing Product currency, and changed-currency
  checkout denial.
- Media resolver suite: 11 tests passed, including Product-only internal route
  metadata.
- Product, Order, and Media type checks passed; Order Prisma validation and
  regeneration passed; backend orchestration tests passed (56 tests).

Response-removal checks (2026-10-03): focused Gateway Product mapping/HTTP tests
passed two suites/21 tests; focused Product thumbnail/gallery tests passed two
suites/nine tests. Coverage includes provider values from old upstream replies,
public/admin/list/write response omission, admin repair row IDs without URLs,
and internal gallery provider-value suppression. Product and Gateway type
checks pass. OpenAPI and the generated client have been regenerated;
`pnpm api:check` passes freshness checks and API client tests pass five tests
plus browser/native TypeScript compilation. Changed-file lint passes (one
existing Product test warning), live-script syntax/lint and `git diff --check`
pass. The updated opt-in reference flow subsequently passed all seven checks
on rebuilt Product and Gateway images. It checks absence of URL fields in
create, public, admin, and gallery responses while proving rendering through
Media IDs. A fresh `pnpm backend:health` passed all eleven services, and Docker
image IDs confirm both Product and Gateway containers use their current
`latest` images. The Product, Order, and F3 regression results below precede
the response change; the updated reference flow is its live verification.

## Required container proof

Input-disable checks (2026-10-03): focused Product transport/owner tests pass
two suites/24 tests, including HTTP/gRPC create/patch denial and direct owner
rejection of URLs, empty strings, and null before dependency reads or writes.
Focused Gateway Product mapping/HTTP tests pass two suites/24 tests, including
all three fields rejected before forwarding. Product and Gateway type checks
pass. OpenAPI/generated-client freshness, five API client tests, browser/native
TypeScript compilation, changed-file lint (one existing Product test warning),
live-script syntax/lint, formatting, and `git diff --check` pass. The generated
external client contains none of the three disabled URL input fields.
The final live reference flow also denied all three fields on Gateway create
and patch, reporting `deferred-url-inputs-denied=ok`. The user supplied healthy
Product/Gateway startup and all eight successful checks from the updated flow
on 2026-10-03. A subsequent `pnpm backend:health` passed all eleven services.

The local populated Order database now records
`20260930000100_shop_currency_authority` as applied. A read-only query after
deployment found 1 Cart and 24 Orders, with no currency default on either
table. The command previously supplied to count rows used quoted identifiers
inside a PowerShell native-command argument; PowerShell stripped those quotes,
so it failed with SQL syntax error and did not inspect or change data. Piping
literal SQL to `psql` succeeded. Pre-deployment counts were not reported, so
before/after row-count preservation is not claimed from that query alone.
The user subsequently reported that `pnpm db:verify:order` passed on
2026-10-03; the full verifier output was not pasted.

1. Completed 2026-10-03, user-reported: `pnpm db:verify:order` passed.
   The migration itself only drops two defaults and contains no row updates
   or deletes. Before/after counts remain unavailable; broader populated
   upgrade, rerun, and rollback proof belongs to Batch 4.
2. Completed 2026-10-03: all running application containers are healthy and
   `pnpm backend:health` passes all eleven services. Docker image IDs confirm
   that Media, Product, and Order containers use their current `latest` images.
3. Completed 2026-10-03: the user ran the opt-in D1 reference live flow. Its
   seven checks passed: taxonomy binding, wrong-kind denial, missing-Media
   denial, raw-gallery-URL denial, READY Media binding/rendering, blocked-Media
   denial, and cleanup. The blocked-Media check proves that Product detail and
   gallery reads return 503 after linked Media becomes blocked, and recover
   after Media is restored.
4. Completed 2026-10-03, user-reported: `pnpm test:d1:product:live` passed
   (full output not pasted).
5. Completed 2026-10-03: `pnpm --filter @nebula/order-service test:e2e`
   passed five suites and 34 tests, including gRPC/HTTP integration and
   currency unit checks.
6. Completed 2026-10-03: `pnpm test:f3:live` passed gateway readiness,
   anonymous and authenticated storefront, authorized admin, registered
   mobile, and partner-execution-disabled flows.

The F5 scanner remains responsible for ordinary upload promotion; the D1 live
proof uses a guarded local READY/CLEAN fixture. Legacy draft gallery rows are
non-public and remain queued for Batch 4 fixture replacement/audit.

# D1 Batch 2 reference checkpoint (2026-09-28)

Status: implementation checkpoint. Batch 2 exit is **not** claimed.

Product now accepts Taxonomy-owned `brandId` and ordered `tagIds` alongside its
existing category reference. New brand/tag writes validate the record ID,
`product` scope, expected `brand`/`tag` kind, and public visibility through the
Taxonomy service before any Product write. Duplicate tag IDs and new free-form
tags are rejected. Existing free-form tags remain in the database for explicit
reconciliation and are omitted from public Product responses. The Product
database changes are additive: nullable brand ID and an empty-by-default UUID
tag array.

Product thumbnails and gallery images can now bind Media IDs. The Media service
owns eligibility checks through a signed resolver RPC for `THUMBNAIL` and
`GALLERY` roles; only public, ready, clean, renderable images qualify. Product
stores the ID and returns a gateway-relative render path, without storing
credentials or provider URLs in the new contract. Legacy URL columns remain for
explicit migration review; public reads suppress URL-only thumbnail/gallery
data. Product-to-Media signing and the new RPC are wired through the service
clients, Compose configuration, gateway DTOs, OpenAPI, and generated API client.
New thumbnail and gallery writes require Media IDs; legacy URL columns are
read-only compatibility data. The development seed no longer creates a Product
with a free-form tag.
An explicit `ACTIVE` status update now rechecks stored Taxonomy and Media IDs
and denies publication while legacy free-form tags or URL-only images remain.
This guard has focused unit coverage; its rebuilt-image live proof is pending.

Local verification passed: Product unit tests (14 suites, 85 tests), Media unit
tests (4 suites, 40 tests), Gateway tests (42 suites, 183 tests), Product/Media/
Gateway type checks, gateway and Media lint, Product lint (warnings only),
OpenAPI/client freshness checks, and `git diff --check`. The disposable Product
database verifier passed with its transactional reference-column fixture. The
three affected images rebuilt, the stack health check passed, the existing
Product live flow passed, and `pnpm test:d1:references:live` passed its
Taxonomy-binding, wrong-kind denial, missing-Media denial, and cleanup checks.
After a later Product/Gateway rebuild, the same live test exposed a confirmed
Gateway input-profile gap: `brandId` and `tagIds` were declared in DTO/OpenAPI
but rejected as unknown fields before reaching Product. The profile now admits
the Media/Taxonomy fields and clear-only patches; focused Gateway tests pass.
On 2026-09-30, the rebuilt Gateway and Product images passed the reference live
test again: Taxonomy binding, wrong-kind denial, missing-Media denial, raw gallery
URL denial, and cleanup all reported `ok`. The first rerun returned a login 503
because Gateway was restarted with `--no-deps` while Auth, User, Product, and
other backend services were exited. After the full stack started, all eleven
`pnpm backend:health` checks passed and the reference live test passed. This was
a runtime dependency outage, not a failure of the reference contract.
The Product Media-boundary unit test now also proves that an unavailable Media
resolver returns a service-unavailable error before either thumbnail or gallery
writes; its focused suite passed (6 tests).
The opt-in `D1_READY_MEDIA_FIXTURE=1` branch of the reference live script
uploads a real image through Gateway, marks only its disposable local Media row
`READY/CLEAN` as test setup, binds it as a Product thumbnail and gallery item
through the generated client, and verifies the public render bytes. The first
run passed those assertions but cleanup returned 409: Product hard-delete
correctly restricts an existing gallery row. The script now hard-deletes its
gallery rows first. The exact leftover fixture was removed through Gateway.
The complete rerun on 2026-09-30 passed Taxonomy binding, wrong-kind and
missing-Media denial, raw-URL denial, ready-Media bind/render, blocked-Media
denial, and cleanup. Read-only Product, Taxonomy, and Media fixture counts are
all zero. The direct database promotion is test setup, not a substitute for
the deferred M2 scanner.

After binding, changing the fixture Media to `BLOCKED/FAILED` made public
rendering return 403 and explicit Product re-publication return 403. Restoring
`READY/CLEAN` allowed re-publication. A focused Product test also confirms
that hiding a previously linked Taxonomy tag blocks re-publication. Existing
public Product reads do not recheck owners, so a Product may remain visible
with an ID whose Media render is now denied, or with a hidden Taxonomy ID.
Continuous cross-service referential integrity is not yet established.

The recovery also exposed a confirmed Gateway defect in the optional public
Media delete scope: Gateway sent an empty string when `scope` was omitted, while
Media rejected it. Gateway now sends the Media default `panel` scope, with a
focused unit test passing. The live fixture cleanup explicitly supplies `panel`
so it can work before the next Gateway image rebuild.

Open before Batch 2 exit:

- Prove dependency-outage behavior against rebuilt images. Missing-Media denial,
  positive `READY/CLEAN` references, and later blocked-Media denial have live
  proof; Media-outage fail-closed behavior has focused unit proof.
- The existing Media finalize path leaves S3 uploads `PENDING/QUEUED`; no
  promotion worker is implemented in this phase. The M2 scan/promotion work is
  needed before an ordinary uploaded image can become `READY/CLEAN` and qualify
  as a Product thumbnail/gallery image. A seeded `READY/CLEAN` fixture can prove
  the resolver contract but cannot prove the upload-to-render workflow.
- Decide the retained-data treatment for the
  [local audit](2026-09-29-d1-legacy-reference-audit.md): 35 gallery rows on
  22 draft Products with `e2e-hidden-draft-` slugs. They are not created by the
  demo seeder and are not public. The sole active free-form `demo` tag was on
  the old local demo Product; that exact seed row was deleted and recreated by
  `pnpm backend:seed` with empty `tags` and `tagIds`. Rerunning the seeder was
  idempotent, and no undeleted Product now has free-form tags.
- Define the D1 policy for a previously linked Taxonomy or Media record that
  becomes ineligible after publication. Owner-side Media rendering and Product
  re-publication fail closed, but ordinary public Product reads still return
  the stored reference. A continuous-validity gate requires more than the
  current write-time contract.
- Confirm D2 Order uses the same Settings-backed shop currency; the Product
  currency authority is already implemented, but Order alignment is pending.

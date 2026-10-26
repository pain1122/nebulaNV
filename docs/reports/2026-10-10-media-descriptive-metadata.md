# Batch C - Descriptive Metadata

Status: Batch C closed; operator proofs, deployment, metadata live and regressions passed.
The scope below was recorded before code changes on 2026-10-10.

## Evidence and bounded scope

Media currently has displayName/file identity but no descriptive title/default
alt. ProductGalleryImage already has nullable alt; Gateway addImages and the
gRPC response mapper collapse omission to empty text. This is a confirmed
presence-contract gap for the agreed inheritance requirement. Existing Product
version checks, Media access lanes, signed service calls and eligibility checks
remain in place.

Add nullable Media title/defaultAlt and metadataVersion, Product thumbnail
title/alt overrides, and gallery title plus a metadataVersion for gallery text
edits. Do not backfill descriptive text or rewrite existing gallery alt.
Media/gallery metadata revisions change only with text edits; Product thumbnail
edits use the existing Product expectedVersion. Partial updates require at least
one text field. Stale revisions return 409; deleted records cannot be edited.

Transport: append optional text fields without changing existing proto numbers.
Use explicit clear flags for nullable updates over gRPC, with value/clear
conflicts rejected. Gateway JSON null maps to a clear flag; absence maps to
absence; empty string remains a value. Limits: title 200 Unicode characters,
alt 180. Reject control characters; never interpret descriptions as markup.

Media admin PATCH /api/v1/admin/media/:id/metadata uses the existing admin
boundary and signed Gateway caller. Product gallery adds an admin metadata
PATCH under its existing entry route. Keep private Media text out of public
Product responses by reusing the eligibility resolver. Resolve each distinct
eligible Media reference once per read operation, without cross-service DB
reads or storing copied defaults. Preserve explicit overrides in admin output;
public output exposes effective text. Image facts/jobs/generations stay untouched.

## Execution and validation

1. Add migrations and explicit presence contracts.
2. Implement Media updates/resolution and Product overrides/inheritance.
3. Connect signed clients, Gateway DTO/routes/mappers and generated contracts.
4. Run focused local tests/types and contract freshness checks.
5. Prepare disposable clean/populated migration and live metadata proofs.
   Stop before heavy database proofs, image builds or Compose commands and
   hand their exact commands to Salar. Record outcomes before exit sign-off.

Cloud/CDN, frontend, Blog-specific editing and tenant activation are deferred.

Build inspection before deployment found Product's Compose target lacks the
existing BACKEND_BUILD_SERVICE/BACKEND_BUILD_CONCURRENCY selectors already used
by Media and Gateway. Its next build would therefore compile all backend apps.
Record the narrow correction before editing: supply Product's own service name
and concurrency 1 through the same supported build arguments. This changes build
scope only, not runtime dependencies or Docker image contents.

## Implementation and local results

C1-C4 are implemented. Both services have additive 20261010000100 migrations;
new title/default-alt values start null and metadata revisions start at 1.
Product's existing commercial version controls thumbnail text edits; gallery
text has an independent revision. Gallery metadata PATCH returns the current
admin gallery collection. Media/gallery edits reject empty patches, stale
revisions, deleted targets and invalid text. Public responses expose effective
text; admin responses include nullable overrides. Each read coalesces repeated
Media references through the existing eligible-public-reference resolver.

HTTP JSON null is encoded as an explicit clear flag over gRPC; optional strings
preserve absent/empty values. Proto numbers are preserved. Update the shared
signed contracts through the three affected images as one deployment checkpoint;
compatibility compilation passed for Blog and Order. No dormant V3 endpoint was
activated. Metadata schema readiness probes make missing demo migrations
visible before the updated services are declared healthy.

Observed focused test results, combining the latest passing runs per file:

- Media: two suites/25 tests, including 14 new metadata checks and actual
  protobuf encode/decode preservation of missing versus empty gallery alt.
- Product: three suites/27 tests, including nine metadata checks for reset,
  inheritance, stale edits and request-local Media coalescing.
- Gateway: four suites/50 tests, including authorized nullable PATCH, user
  denial, unknown/control/over-limit input denial and gallery UUID validation.
- Internal clients: three suites/23 tests, including unchanged dormant inventory.
- External client: 15 tests plus browser and React Native type checks pass.
- Backend orchestration: 62 tests pass, including disposal after Product upgrade
  failure, production refusal, rollback injection and deploy rerun orchestration.
- Media/Product/Gateway source-and-test TypeScript and Blog/Order source types
  pass. Proto freshness, OpenAPI freshness and external-client freshness pass.
- Scoped implementation lint passes after equivalent Unicode control-category
  validation replaced control-range regexes; new proof JavaScript parses.
- Current runtime health: all eleven applications pass, using pre-Batch-C images.

The assistant did not execute heavy database proofs, demo migrations, image
builds, Compose operations or the new metadata live test. Database runner tests
use simulated tool results. Actual database proof results are recorded below
separately as operator-reported evidence.

## Operator checkpoint - database proofs first

Run from repository PowerShell, in order; stop at the first failure:

```powershell
pnpm db:verify:media
pnpm db:verify:media:upgrade
pnpm db:verify:product
pnpm db:verify:product:metadata:upgrade
```

Clean proofs add text length/revision constraints. The existing populated Media
proof now injects metadata rollback and checks null defaults/version 1 while
preserving old image/source/job/cleanup facts. The new populated Product proof
preserves one Product and three gallery rows (null, empty and Unicode alt),
injects failed migration rollback, deploys twice and cleans its disposable DB.
Both upgrade commands refuse production mode.

After proof passes, explicitly target Docker PostgreSQL on port 15432 when
migrating nebula_media and nebula_products; preserve the caller's DATABASE_URL.
Build only media-service, product-service and gateway, sequentially, then start
the updated trio and check readiness. Exact deployment commands follow the
database result. Do not request a whole-backend rebuild or TURBO_FORCE.

Prepared live command: `pnpm test:media:metadata:live`. It uses real upload/scan/
approval and default saved sizes, proves Unicode/inheritance/decorative alt,
thumbnail/gallery reset, two simultaneous Media edits with one 409 loser,
invalid-input/user-write denial, unchanged original/saved bytes and generations,
and cleanup of Product/gallery/user session/Media fixtures. Existing Media/D1/F3
integration checks remain Batch C exit requirements. This command has not run.

## Operator database results and deployment checkpoint - 2026-10-10

Salar reports no errors during all four database proof commands listed above.
These are operator-reported passes; full output and measured counts were not
supplied. The assistant subsequently observed all eleven backend services pass
`pnpm backend:health`, still running pre-Batch-C images. Demo migration,
updated-image readiness and metadata live evidence remain pending.

Apply demo migrations with explicit Docker datasource URLs, restoring the prior
caller environment even if either command fails:

```powershell
$metadataPreviousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public'
  pnpm --filter @nebula/media-service prisma:migrate:deploy
  if ($LASTEXITCODE -ne 0) { throw 'Media migration failed' }

  $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:15432/nebula_products?schema=public'
  pnpm --filter @nebula/product-service prisma:migrate:deploy
  if ($LASTEXITCODE -ne 0) { throw 'Product migration failed' }
} finally {
  $env:DATABASE_URL = $metadataPreviousDatabaseUrl
}
```

After both migrations pass, run these builds one at a time and stop at any
failure. Each selects its own service and build concurrency 1:

```powershell
docker compose build media-service
docker compose build product-service
docker compose build gateway
```

Container replacement and live checks follow successful builds.

Salar subsequently reports both demo migrations and all three selected image
builds completed without errors. These remain operator-reported results;
updated container readiness and metadata live results have not been supplied.

Next operator checkpoint, run separately and stop at the first failure:

```powershell
docker compose up -d --no-build --wait --no-deps media-service product-service gateway
pnpm backend:health
pnpm test:media:metadata:live
```

The startup uses the newly built images. The metadata proof exercises text
inheritance/reset, permission/concurrency denial and unchanged approved bytes
through the real Media processing lifecycle. Integration/regression gates follow.

## Operator deployment and metadata live results

Salar reports all three checkpoint commands passed: updated Media/Product/Gateway
startup, backend health and `pnpm test:media:metadata:live`. No full output or
counts were supplied. The live proof therefore has an operator-reported pass
for Unicode defaults, inheritance/decorative alt, contextual override/reset,
stale gallery and concurrent Media edits, invalid-input/user-write denial,
unchanged original/saved bytes and derivative generation, and fixture cleanup.

Remaining Batch C gates, run one at a time and stop at the first failure:

```powershell
pnpm --filter @nebula/media-service test:e2e
pnpm --filter @nebula/product-service test:e2e
$env:D1_READY_MEDIA_FIXTURE = '1'
try {
  pnpm test:d1:references:live
  if ($LASTEXITCODE -ne 0) { throw 'D1 reference regression failed' }
} finally {
  Remove-Item Env:D1_READY_MEDIA_FIXTURE -ErrorAction SilentlyContinue
}
pnpm test:f3:live
```

The Media regular suite retains its separately gated database tests; a pass
does not claim those skipped tests ran. Batch C stays open pending these results.

## Supplied regression output - fixture corrections required

Salar supplied Media output: 14 suites/171 tests passed, two suites/11 database
tests skipped. Product output: 15 suites passed, four failed; 126 tests passed
and two failed, with three additional suites unable to compile. D1/F3 results
were not included. Batch C remains open.

Confirmed test fixture defects: identifiers, inventory concurrency and discount
helpers omit the newly required nullable Prisma thumbnailTitle/thumbnailAlt
fields. Stale test implementation: the gRPC gallery fixture still submits raw
URLs despite the adopted Media-ID-only contract. That insertion fails, leaving
no dependents; the subsequent hard-delete expectation then also fails. The
current addImages implementation correctly requires Media IDs, and existing
unit coverage checks dependent deletion. No production contract change is
justified by these failures.

Correction scope before edits: supply null thumbnail defaults in the three
typed fixture helpers; replace gallery URLs with a real uploaded, finalized,
scanned public Media fixture, retain visibility/order/dependency assertions and
clean up gallery/Product/Media in dependency order. Run focused affected tests
locally, then hand back the remaining operator regression commands. These
test-only edits require no image rebuild or demo migration.

Corrections complete: all four affected suites/41 tests passed locally. The
gRPC suite ran against current containers, uploaded a valid PNG and waited for
READY/CLEAN before binding two placements; raw URL denial, visibility, ordering
and dependent hard-delete rejection passed. Gallery rows, draft Product and
Media fixture cleanup completed. A follow-up gRPC run after typing the new
fixture responses passed all 15 tests. Product TypeScript and changed-file
format checks passed. Scoped ESLint had no errors; existing any-based test code
continues to produce warnings. Full Product suite rerun and D1/F3 proofs remain
operator-owned. The earlier local TypeScript pass did not establish that every
regular Product suite compiled; the supplied full run exposed that coverage gap.

## Batch C exit - 2026-10-10

Salar reports the corrected full Product suite, D1 ready-media reference proof
and F3 live regression all passed. No new counts or full output were supplied;
retain the previously supplied Media count and locally observed focused counts
separately. All Batch C gates are satisfied. The 11 skipped Media database
tests remain separately gated, with earlier isolated evidence recorded in the
Batch A/B checkpoints; they are not counted as executed in the regular suite.

The Media handoff reuses completed Batch A recovery/populated-upgrade and Batch B
saved-size/cleanup evidence alongside the new metadata proofs and latest D1/F3
regressions. No new processing/recovery defect requires a repeated rebuild or
restart exercise. The next active work is D1 Batch 4 deterministic showcase
fixtures, limits on demand, safe rerun/reset and gateway-only live exit proof.

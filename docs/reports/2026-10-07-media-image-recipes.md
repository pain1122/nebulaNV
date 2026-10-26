# Media image recipe checkpoint (2026-10-07)

Recorded before implementation. Salar reports the dedicated database
verification completed after the passing HTTP/gRPC run; no detailed rerun
output was supplied, so its report is distinct from the 124-test integration
output. Batch A remains signed off.

Confirmed Batch B gap: public rendering currently accepts only web and reads
the approved source; there is no derivative recipe or saved-output model.
Existing Sharp 0.35.5, immutable verified sources, durable jobs, bounded storage
I/O and object cleanup satisfy their present requirements and will be reused.
No storage or queue replacement is needed.

First implementation checkpoint: add a Media-owned pure raster recipe engine
and focused real-image tests. Validate bounded, strict recipes for named view
presets, aspect-preserving resizing, orientation-aware rectangle/focal crops,
output quality/format and optional text/approved-image watermarks. Preserve
input bytes, validate source checksums/dimensions and record normalized recipe,
source/watermark checksum, processor version and output checksum. Reject URLs,
unknown fields, oversized inputs and invalid combinations. Process recipes
sequentially with bounded decoding/output and configurable preset definitions.

Then connect this tested engine to persisted, versioned derivatives and durable
jobs with atomic replacement and cleanup fencing. Add owning-service/Gateway
contracts and generated-client parity, then one grouped migration/image/live
proof. The first engine checkpoint alone does not claim saved outputs or new
render routes. Keep Batch B checkboxes open until persistence and delivery
are implemented and proved. No demo mutation, migration, Docker rebuild,
frontend, cloud/CDN or tenant work is part of the engine checkpoint.

Reference APIs checked against installed Sharp types and its official
[resize](https://sharp.pixelplumbing.com/api-resize/),
[operations](https://sharp.pixelplumbing.com/api-operation/) and
[composite](https://sharp.pixelplumbing.com/api-composite/) documentation.

Implementation checkpoint: `apps/media-service/src/processing/image-recipes.ts`
now generates bounded raster outputs in memory from verified immutable source
bytes. Named presets are configurable; the four default dimensions are
examples, not a storefront contract. Rectangle and focal crops use oriented
coordinates; resizing avoids enlargement. JPEG/WebP use bounded quality;
PNG remains lossless with fixed compression and rejects nondefault quality.
Image watermarks resolve approved Media IDs with access/owner/context checks.
Text uses escaped Unicode markup and an operator-selected, checksum-pinned
local font; recipe inputs cannot supply font paths or provider URLs. The text
test reads an existing repository Vazirmatn font without changing frontend
files. Runtime font provisioning is part of the later worker integration.

Every output carries normalized recipe, source/watermark/font checksum,
font family where applicable, native processor/library versions, recipe hash,
output checksum and actual dimensions/size/type. Per-Media identity must remain
part of storage/job uniqueness even when recipes/checksums match between
owners. The engine checks four-output limits, geometry, approval, byte limits,
source dimensions/checksum, animated-input denial and output size. Processing
is sequential with native operation timeouts; existing originals are preserved.

Focused verification: 23 real-image engine tests plus 33 existing processing/
upload-binding tests pass (three suites, 56 tests). Media TypeScript checking
and focused engine/test lint pass without errors or warnings; diff whitespace
checks pass. Engine tests cover output pixels, focal selection, EXIF orientation,
real text/image overlays, source immutability, reproducible fingerprints,
invalid recipes, private/blocked watermark denial and checksum mismatches.
No migration or demo/container update has occurred. Remaining work is durable
versioned storage, regeneration/atomic replacement/deletion fencing, configured
worker/font integration, Gateway contracts and saved-preset rendering. This
checkpoint does not declare the full Batch B usable or its exit gates passed.

Salar explicitly requires cropping instead of stretching. Preserve the current
inside/cover-only recipe boundary: cover crops to fill the requested frame;
inside preserves the full image and its aspect ratio. Thumbnail/card defaults
use cover; detail/mobile defaults use inside. Stretch/fill is rejected, not a
client-selectable mode. Add a pixel-geometry regression proving a square stays
square through both modes, rather than checking output dimensions alone.
The two real-pixel square tests and explicit stretch-mode rejection now pass;
the focused image engine suite has 26 passing tests. The source already
preserves aspect ratio, so this adds regression evidence without replacing
the working resize/crop mechanism.

## Saved-derivative implementation scope

Authorized by Salar before these edits. Add Media-owned generation records,
saved output records and a per-Media desired/approved generation pointer.
Claim bounded jobs with leases/retries; publication must match the current
desired generation and approved source/watermark facts. Reuse existing cleanup
intents and bounded S3 I/O; retain previous approved outputs while replacement
is queued or fails. A successful replacement atomically changes the approved
pointer and queues old objects for cleanup, preserving generation metadata.
Identical active requests reuse the same job; explicit retry only requeues
failed work. Automatically schedule configured defaults for genuinely verified
sources, leaving legacy READY rows on their existing web compatibility path.

Add admin Gateway/service generation/status contracts and saved preset render
selection. Keep web compatibility and forbid fill/stretch, raw-original routes,
arbitrary public transformations, storage URLs and private-lane public delivery.
Bundle a known licensed server font with its checksum for Unicode text jobs;
no user font paths or external URL fetching. Source and watermark deletion or
eligibility changes fence publication and public delivery. Extend deletion to
cancel pending jobs and durably clean all generated objects. Group migration,
generated contracts and targeted images before asking Salar for long proofs.

Build scope finding: Media already selects its own backend package, but Gateway
still omits the selector and consequently compiles all eleven applications.
Use the existing Dockerfile selector for Gateway too, with build concurrency
one. This corrects unnecessary build scope for the two-image integration;
it does not replace the Docker pipeline or rebuild unrelated services.

## Saved-size integration checkpoint

The owning implementation is now connected end to end in source:

- Additive `20261007000100_saved_image_derivatives` creates generations, saved
  outputs and desired/approved pointers. It preserves Media row columns and
  historical facts. Composite foreign keys bind every pointer/output to its
  owning Media ID. Checks bound hashes, geometry, formats, views, attempts,
  recipe counts and complete lease state.
- `MediaDerivativeStore` serializes requests on the owning Media row,
  normalizes recipes and oriented crop bounds, validates watermark context,
  pins source/watermark/font facts and fingerprints processor versions.
  Concurrent identical requests reuse a generation. Failed requests require
  explicit retry; superseded active jobs are cancelled.
- `MediaDerivativeWorker` claims one durable job at a time, verifies immutable
  source bytes, processes at most four sequential outputs, registers cleanup
  before storage writes and publishes only a complete eligible set under the
  current lease. Maximum attempts are five, with bounded backoff and a
  20-minute recovery lease. Failed/expired/superseded claims cannot change the
  approved pointer. Existing approved sizes remain available while replacing.
- Publication retires the prior set and schedules its objects for deletion
  after 60 seconds; successful new copies lose their orphan-cleanup intents
  in the same transaction. Source deletion cancels pending generations and
  leaves cleanup intents independent of cascading output/history deletion.
  Publication and public origin reads recheck source/watermark approval and
  checksums; private-lane outputs cannot enter public delivery.
- Newly verified sources receive configured defaults automatically. Migration
  does not pretend legacy READY rows have verified originals or saved sizes.
  `web` remains their compatibility path. Public named views resolve only
  saved outputs; callers cannot submit transforms on a public render URL.
- Admin Gateway GET/POST derivative contracts, nested DTO validation, signed
  Media RPCs, OpenAPI and generated external client are updated together.
  POST requires admin authorization and an idempotency key and returns 202.
  Responses contain approved output facts and locally constructed Gateway
  render paths, excluding private output keys, provider URLs and credentials.
  Explicit null recipe/retry inputs are rejected. Dormant F4 context-v3
  receivers are preserved; the new operations do not activate that work.
- The Media runtime bundles Vazirmatn with the original
  [SIL OFL license](https://github.com/rastikerdar/vazirmatn/blob/master/OFL.txt),
  retaining a server-owned font checksum. No frontend asset or UI is changed.
  Readiness now includes all saved-size tables. Media and Gateway builds both
  use the existing per-service selector with compilation concurrency one.

Verification completed locally: Media unit suite 11 suites/125 tests; owning
Media source/tests type checks; focused worker/storage/real-image tests;
Gateway HTTP/render/service checks; OpenAPI and generated-client parity;
external client 15 tests plus browser/React Native type checks; signed service
wrapper tests; backend orchestration 60 tests; focused Media lint;
Compose configuration, Node syntax and diff-whitespace checks.
Final focused checks also passed: five worker tests including real text through
the bundled checksum-pinned font, all four Gateway contract suites across their
final runs (22 tests), nine active signed-wrapper tests and ten frozen v3 wrapper
tests. OpenAPI/client generation checks and final type/lint checks pass.
All sixteen existing containers are still running and healthy; their images
have not been changed. Two pre-existing wrapper fixtures omitted the existing
Product-reference RPC and its frozen v3 receiver; this was stale test inventory,
not a missing production RPC or a reason to activate F4.

Database proofs have been prepared, not run in this checkpoint.
`db:verify:media` now checks saved-output SQL constraints and adds five actual
PostgreSQL generation tests to the six existing upload-job tests: concurrent
deduplication/claim, expired-lease fencing, failed preservation/complete-set
replacement, supersession/deletion/orphan cleanup, and watermark revocation
at publication/delivery. The populated upgrade verifier injects transaction
failures in both migrations, preserves eight legacy Media rows, three jobs,
one synthetic verified-source fixture and one orphan-cleanup fixture, refuses
fabricated saved sizes, reruns deploy and cleans its disposable database.
No Batch B database migration, image rebuild or live test has run yet.

## Operator checkpoint

Run from the repository PowerShell prompt, in order. Stop at the first failure.
The first two commands own disposable databases, never demo uploads.

```powershell
pnpm db:verify:media
pnpm db:verify:media:upgrade
```

After both pass, apply the additive migration to the existing Media database:

```powershell
$mediaMigrationPreviousUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public'
  pnpm --filter @nebula/media-service prisma:migrate:deploy
} finally {
  $env:DATABASE_URL = $mediaMigrationPreviousUrl
}
```

Build the two selected images sequentially. The Compose build arguments now
compile only each selected application; do not add TURBO_FORCE.

```powershell
docker compose build media-service
docker compose build gateway
docker compose up -d --no-build --wait --no-deps media-service gateway
pnpm backend:health
```

Then run the saved-size proof and existing regressions:

```powershell
pnpm test:media:derivatives:live
pnpm --filter @nebula/media-service test:e2e
$env:D1_READY_MEDIA_FIXTURE = '1'
pnpm test:d1:references:live
Remove-Item Env:D1_READY_MEDIA_FIXTURE
pnpm test:f3:live
```

The new live proof uploads/scans a real fixture, waits for automatic presets,
checks every served output checksum, regenerates four PNG sizes with explicit
crop, inside resize, image/text watermarks, proves duplicate request identity
and approved-generation consistency, rejects invalid recipes, preserves source
bytes and uses the existing cleanup flow. PNG headers verify actual dimensions.
Ordinary Media e2e intentionally skips the eleven isolated PostgreSQL tests;
their result belongs to the first command. Batch B exit remains open until
these deployment/live results are supplied. Batch C descriptive metadata is
next; cloud/CDN, frontend, file-manager UI and F4 remain deferred.

## Operator results (2026-10-10)

Initial inspection found all eleven backend applications stopped while the
five infrastructure containers were healthy. PostgreSQL accepted connections;
no OOM kills or restart loops were recorded. Existing logs included shutdown
connection errors. Salar reports startup and backend health completed
successfully, then reports both `pnpm db:verify:media` and
`pnpm db:verify:media:upgrade` completed successfully. Detailed command output
was not supplied; these are operator-reported passes, not new measured counts.
Next: apply the additive Media migration, build Media/Gateway sequentially,
start the updated containers and verify readiness before live proofs.
Batch B deployment and live exit gates remain open.

Salar subsequently reports the Media/Gateway image builds completed. Updated
container startup, readiness and saved-size live results remain unreported.

Deployment diagnosis (2026-10-10): Gateway is healthy, but the new Media image
returns 503 with processingSchema=error while database/storage/S2S probes pass.
Read-only inspection confirms its datasource is postgres/nebula_media; that
database has only the six older migrations and none of the three derivative
tables. This is a confirmed deployment gap, not a Docker restart-loop or OOM
finding. The earlier successful verification commands used disposable
databases. Before taking action, record the narrow correction: apply the
already-authorized additive saved-size migration to nebula_media, then verify
readiness and container health. No source fix or image rebuild is required.

Datasource check also found the package .env resolves localhost:5432 while
Docker exposes PostgreSQL on 15432. The earlier direct package migration
instruction omitted an explicit Docker datasource. Correct the instruction
and run only Media migrate-deploy with the known local Docker datasource in
the child process environment; do not edit or overwrite operator env files.

Correction completed: migrate-deploy explicitly targeted 127.0.0.1:15432/
nebula_media and applied 20261007000100_saved_image_derivatives successfully.
Direct Media readiness now returns 200/status=ok; database, storage,
processingSchema and s2sReplay checks all pass. No restart or rebuild was
needed. The environment override existed only in the migration child process.
Final verification: all eleven backend readiness checks pass and all sixteen
running containers are healthy. Next is the operator-owned saved-size live proof.

Salar supplied a complete passing saved-size live run on 2026-10-10:
scan/validate/promote/render, automatic saved presets, crop/aspect-ratio/
watermark/checksum checks, invalid recipe denial and unchanged original,
upload-URL overwrite protection, infected/corrupt/MIME/extension denial and
cleanup. This establishes the live saved-size result against the updated
containers. Remaining sign-off checks are the Media HTTP/gRPC suite, D1
ready-media reference regression and F3 flows. Do not rebuild or repeat the
passing saved-size proof unless a subsequent change requires it.

## Batch B sign-off (2026-10-10)

Salar supplied the remaining complete regression output:

- Media `test:e2e`: 13 suites passed, 157 tests passed, zero failures;
  two suites/11 database-only tests intentionally skipped. Their isolated
  verification is recorded separately above, not counted in this run.
- D1 references with `D1_READY_MEDIA_FIXTURE=1`: wrong-kind and missing-media
  denial, raw-gallery URL denial, ready-media binding/rendering, blocked-media
  denial and cleanup all passed. The environment flag was removed afterward.
- F3: readiness, anonymous/authenticated storefront, authorized admin,
  registered mobile and disabled partner execution all passed.

These are operator-supplied results. Worker warnings in the passing Media
tests exercise failure paths; they do not establish a new container incident.
Batch B is closed. No rebuild or repeated live proof is required now.

Next authorized scope is Batch C descriptive metadata. Current schema/proto
inspection confirms Media has no title/default-alt fields; Product gallery
already stores nullable alt. Preserve that existing behavior, add Media
defaults and contextual Product descriptions, and distinguish omitted text
from explicit empty alt. Metadata edits must not rename files, reprocess
images or change approved bytes. Inspect the owning service, transport,
authorization and read mapping before implementation; record the detailed
scope before code changes. Cloud/CDN, frontend and tenant work remain deferred.

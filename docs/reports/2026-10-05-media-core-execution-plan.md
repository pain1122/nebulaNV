# Media core execution plan (2026-10-05)

Status: approved scope recorded before implementation. All processing and
editing behavior below is planned until its implementation and proof pass.

Salar selected core Media functionality before completing the rich D1 demo
seeders, with resizing, cropping, saved sizes for different views, watermarking,
and alt/title text. Cloud and CDN functionality remains later work. This is an
early slice of F5, not M2, and does not reopen tenant foundations.

## Repository evidence and classification

| Area             | Current evidence                                                                                                                                  | Classification and treatment                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Upload/finalize  | `apps/media-service/src/media.service.ts`, `finalizeUpload`, checks the stored object and creates `PENDING/QUEUED` rows                           | Existing mechanism: preserve its authorization, object, size, and path checks                                                  |
| Promotion        | Finalize explicitly waits for a scan/promotion pipeline; no processor is registered in the current service                                        | Confirmed implementation gap: add bounded processing rather than assigning CLEAN in the seeder                                 |
| Delivery         | `openPublicRenderStream` requires approved PUBLIC, READY/CLEAN media; only `variant=web` is accepted                                              | Existing mechanism: preserve eligibility and extend delivery to approved generated variants                                    |
| Derivatives      | Media schema has dimensions and scan state but no original/derivative recipe model; service documentation explicitly defers generated derivatives | Confirmed implementation gap for the requested functions: model and generate derivatives                                       |
| Descriptive text | Media `displayName` is a filename; Product gallery already has an `alt` field with DTO validation                                                 | Preserve Product alt text; add requested Media defaults and missing per-use title support without treating filenames as titles |
| Phase naming     | The D1 fixture design and Batch 2 report incorrectly attribute scan/promotion to M2                                                               | Stale documentation: correct ownership to F5                                                                                   |
| Cloud/CDN        | F9 owns provider selection and deployed networking; current local storage is MinIO                                                                | Future deployment work: defer vendor selection, CDN integration, and provider topology                                         |

The unmet requirement is an uploaded image becoming usable through the real
Media lifecycle. A seeder-only READY/CLEAN update cannot validate the file or
prove that lifecycle. Preserve the current storage adapter and Gateway/S2S
boundaries; no replacement of storage or general event platform is approved.

Adding jobs, immutable source facts, and derivative records requires additive
Media-owned migrations and compatible transport changes. Existing Media IDs
and Product references must survive. Legacy READY/CLEAN rows must be explicitly
inventoried; do not relabel them as worker-verified or discard their bytes.
Processing/scanner dependencies add build and operational maintenance, so
select their exact versions and interfaces against primary documentation during
implementation. No dependency or queue selection is claimed by this plan.

## Batch A - Reliable upload validation and promotion

- Trace current upload authorization and object overwrite behavior before
  freezing source bytes. Preserve verified actor/application and access lanes.
- Implement durable Media-owned jobs with bounded claiming, leases, attempts,
  backoff, restart recovery, and terminal failure visibility. Use the smallest
  reliable mechanism; do not introduce a generalized worker platform.
- Read the actual stored object with byte/time limits; detect type, check the
  declared type and extension, verify size, compute checksum, and capture safe
  image dimensions. Treat client-supplied metadata as claims to verify.
- Integrate an actual malware scanner. Unavailable, timeout, infected, missing,
  and invalid files remain non-renderable; no automatic CLEAN fallback.
- Preserve immutable source facts and bytes. Promote only validated objects;
  claims and completion must not resurrect deleted/blocked records.
- Prove clean/infected/type-mismatch/oversized/missing cases, duplicate job
  execution, lease loss, retry exhaustion, and restart recovery.

Initial editing scope is still raster images. PDF/video/animation/SVG/3D
processing and archive expansion do not enter this batch by implication;
inventory the existing accepted formats and define their explicit handling.

## Batch B - Saved sizes, resizing, cropping, and watermarks

- Preserve the original. Each transformation creates a versioned derivative
  associated with the source Media ID, verified checksum, recipe, and processor
  version. Repeated execution must not duplicate or silently mutate outputs.
- Define configurable named view presets, initially thumbnail, card, detail,
  and mobile. Exact dimensions are configuration examples until consumers
  supply requirements; they are not permanent frontend contracts.
- Support aspect-preserving resize, bounded crop rectangles or focal-point
  crops, output dimensions, quality, and permitted raster formats. Validate
  coordinates against the orientation-corrected source; reject out-of-bounds
  input and cap dimensions, pixels, recipe count, concurrency, and processing
  time. Avoid enlargement by default.
- Save configured outputs once and select an approved preset at render time.
  Do not run arbitrary URL-supplied transforms on every public request.
- Support optional text and approved-image watermarks with bounded text/image
  size, position, margin, and opacity. Resolve image watermarks through Media
  IDs and eligibility policy; no remote URL fetching. Persist watermark choices
  in the recipe. Watermarking is presentation, not a copying guarantee.
- Keep the last approved derivative available while a replacement is being
  processed, unless source eligibility is revoked. Promote replacements
  atomically; failed jobs do not destroy originals or approved outputs.
- Preserve PUBLIC/PROTECTED/STRICT policy on every derivative. Public presets
  cannot expose protected sources, raw originals, or storage URLs.

Editing endpoints are backend contracts for the future panel. No editor UI or
file-manager UI is part of this work. Rename/move/folder administration remains
separate from transformations and is not silently added to this batch.

## Batch C - Alt/title metadata and content references

- Add editable, bounded Unicode Media title and default alt text, separate from
  `displayName` and storage keys. Metadata edits do not regenerate image bytes.
- Keep contextual descriptions in the consuming domain. Preserve Product
  gallery `alt`; add title and thumbnail text where the implemented workflow
  needs them. Later Blog/page modules follow their own contracts.
- Define precedence: an explicitly supplied usage value overrides the Media
  default; omission inherits it. An explicit empty alt string stays empty for
  decorative images. Missing and empty must remain distinct through gRPC and
  Gateway mappings.
- Derivatives inherit descriptive defaults; generating four sizes does not
  create four disconnected descriptions. Clients choose whether/how to render
  the optional title text; it is not authorization or HTML markup.
- Verify owner authorization, bounded inputs, partial update behavior,
  concurrent edits, and generated OpenAPI/client parity.

## Batch D - Integration proof and seeder handoff

- Prove Gateway upload -> validation/scan -> approved derivatives -> Product
  thumbnail/gallery binding -> rendering, including crop/resize/watermark and
  alt/title responses. Prove blocked-source denial for every generated preset.
- Verify clean migrations, populated upgrade, reruns, and recovery while
  preserving existing Media IDs, references, and original facts.
- Update scoped deletion to include derived objects and prevent in-flight jobs
  from publishing after deletion. Record failed cleanup rather than hiding it.
- Prove worker readiness, scanner unavailability behavior, container restart,
  and preserved F3/D1 flows. Group changes before Docker builds to reduce time.
- Resume D1 Batch 4: showcase default, limits profile on demand. Seed through
  actual upload/processing contracts and wait for readiness; do not implement
  the proposed direct database promotion adapter. Retire old demo seeders only
  after creation/verify/rerun/reset proof passes.

The assistant runs inspections and focused checks. Salar runs image builds,
full integration suites, and lengthy live proofs. No live result is claimed
until it is returned and recorded.

## Deferred scope

Cloud provider selection, CDN integration, edge transformations, immutable CDN
cache rollout, vendor invalidation, bucket fleets, replication, KMS/provider
topology, and cross-cloud parity remain later F9 deployment work. Retain local
MinIO and the required S3 compatibility seam. Remaining F5 content integration,
strict-media administration, and advanced reconciliation follow actual consumer
needs after M2; the file-manager UI and tenant implementation remain deferred.

## Effort and checkpoint

The earlier 2-4 focused-day estimate applied to validation/scan/promotion only.
Including the requested derivatives, edits, metadata, contracts, and recovery
proof is approximately 5-8 focused working days, subject to dependency/build
and integration findings. This is an effort estimate, not a completion promise.
Deliver and verify the batches separately so core promotion becomes usable
before every editing feature is finished.

## Change impact map

This map distinguishes planned source changes from consumers needing regression
proof. New processing module names will be fixed during implementation.

| Files/area                                                                                                                                       | Planned change                                                                                                                        | Required checks                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/media-service/prisma/schema.prisma` and new migrations                                                                                     | Durable jobs, verified source facts, derivative recipes/results; descriptive fields in Batch C                                        | Fresh database, populated upgrade, constraints, preserved IDs/references, repeated deployment, recovery                             |
| `apps/media-service/src/media.service.ts`                                                                                                        | Finalize plus job creation, verified source handling, approved output selection, derivative deletion                                  | Atomic creation, object changes after finalize, duplicate bytes/jobs, access lanes, blocked/deleted state, legacy records           |
| New `apps/media-service/src/processing/` modules                                                                                                 | Claim/retry/recovery, object validation, scanner adapter, image processor                                                             | Real scanner outcomes and unavailable behavior; leases, timeouts, bounded resources, idempotency, restart                           |
| `media.module.ts`, `health.controller.ts`, `config/env.validation.ts`, `.env.example`                                                            | Register processing lifecycle and validate runtime/scanner settings; distinguish processing availability from approved-media delivery | Startup/shutdown, malformed config, storage/database health, scanner outage without an approval fallback                            |
| Media DTOs, `grpc/media-grpc.controller.ts`, `media-render.controller.ts`, `packages/protos/media.proto`, `packages/clients/src/media.client.ts` | Processing/edit/metadata contracts as their batches require them                                                                      | Authority, omission semantics, transport parity, old field compatibility, generated proto freshness                                 |
| `apps/gateway/src/media/`, `src/contracts/inputs/media.inputs.ts`, `src/contracts/routes/media.routes.ts`                                        | Validated editing/metadata operations and saved render presets                                                                        | Route permissions, unknown fields, output envelopes, binary render proxy, private-lane denial                                       |
| `apps/gateway/openapi/nebula-v1.openapi.json`, `packages/api-client/src/generated.ts`, client tests                                              | Regenerate contracts; exercise processing and editing from external clients                                                           | Generated freshness, browser/native type checks, original Gateway routes                                                            |
| `apps/product-service/` schema, gallery/thumbnail DTOs, service and transports; corresponding Product Gateway/proto contracts                    | Preserve Media eligibility calls; add contextual title/alt only in Batch C                                                            | Stable Media references/render paths, publication/public reads, gallery order, empty alt inheritance, commercial/variant regression |
| `docker-compose.yml`, `docker-compose.release.yml`, `docker/backend.Dockerfile`, service package/lock files                                      | Scanner wiring and selected processing dependencies, with local/release consistency                                                   | Dependency availability, target builds, native runtime imports, restart and shutdown, private scanner connectivity                  |
| `scripts/backend.mjs`, `scripts/backend.test.mjs`, new database/live verification scripts                                                        | Add Media migration/processing proof and readiness handling where necessary                                                           | Existing orchestration and health behavior; avoid changing eleven-image build ordering without evidence                             |
| `scripts/demo/`, service documentation, roadmap/current focus                                                                                    | Resume seeders through real processing after proof; record exact results                                                              | Showcase/limits creation, waiting for readiness, interrupted rerun, scoped reset                                                    |

### Particular compatibility points

- The current legacy `MediaService.create()` assigns READY/CLEAN directly,
  unlike `finalizeUpload()`. Audit its callers and authentication before
  changing it; do not let new uploads bypass verification through that path.
  Existing trusted fixture preparation must be separated from any claim that
  old rows passed the new scanner. This is a confirmed lifecycle inconsistency
  for the new pipeline requirement, not a claim of anonymous access.
- Upload processing is asynchronous. Clients and seeders must observe
  PENDING/processing/failure states and wait for eligibility before binding
  Product media; they must not assume finalize means renderable.
- Public, protected, and strict media share the service. Private read links,
  ownership, strict filename treatment, folder browsing, deletion preview/
  confirmation, and public indexing must still pass after storage changes.
- Product's current resolver expects its stable Media ID and render path.
  Preserve those contracts while adding preset selection; internal storage
  paths and approved-source copies must not leak into Product responses.
- Other proto consumers, including Blog, require compile checks after proto
  changes. Order/Settings need preserved F3/D1 regression flows because the
  demonstrated commerce path shares Gateway readiness; no Order/currency
  redesign is planned. The separately developed admin and `apps/web` require
  compatibility proof but no frontend source changes in this slice.

### First implementation checkpoint

Start with Media job/source migrations, atomic finalize-to-job handoff, bounded
validation/scanning, and restart-safe processing. Use focused Media tests and
type checks before one grouped migration/image/live proof. Editing endpoints,
Product descriptive metadata, and generated external contract changes follow
their respective batches; do not rebuild every service after each small edit.

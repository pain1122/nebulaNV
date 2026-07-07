# TODO: NebulaNV Stabilization Board

Last updated: 2026-07-02
Current mode: stabilize, document, verify, then ship in controlled slices.
Scope source of truth: `site essentials.md`
Developer docs index: `docs/README.md`
Boot/runbook: `docs/architecture/local-dev-and-docker-boot.md`

## Completed Baseline (Do Not Reopen Without A Reason)

- [x] Enforce `@Public` flag semantics (`gatewayOnly` / `optionalAuth`).
- [x] Enforce `@RequireUserId` centrally.
- [x] Canonicalize S2S `svc` propagation.
- [x] Unify S2S payload/signature contract.
- [x] Enforce access-vs-refresh token boundaries in auth-service.
- [x] Tighten secret boundary policy (`S2S_SECRET` vs `GATEWAY_SECRET`).
- [x] Fix guard wiring mismatches in service bootstraps.
- [x] Fix taxonomy-service gRPC bootstrap wiring.
- [x] Correct wrong client fallback gRPC ports.
- [x] Remove unsafe caller-supplied identity usage in order-service gRPC handlers.
- [x] Fix web build blockers (`lord-icon` typing and Next build issues).
- [x] Remove workspace lockfile conflict in web app.
- [x] Replace frontend refresh dev stub with real refresh route.
- [x] Remove refresh-token persistence from active `localStorage` path.
- [x] Dockerize core stack with postgres/redis/minio/minio-init.
- [x] Improve Docker build speed with shared backend image flow.
- [x] Add developer docs under `docs/` for type shapes, naming, service boundaries, and service notes.
- [x] Add local dev / Docker boot runbook.
- [x] Update backend startup scripts so services wait for required gRPC dependencies.
- [x] Verify local backend services start with `pnpm dev:backend`.
- [x] Resolve product-service source ESLint errors from unsafe `any` cleanup.
- [x] Verify product-service build after cleanup.

## Priority 0 - Current Stabilization

### P0-0 Media Security + Access Classes

Design note: Supabase Storage is used for its clean storage UI, self-contained file management features, S3-compatible API, and future portability. It is not the final privacy authority. `media-service` remains the security boundary: it owns media metadata, ownership, access classes, auth checks, short-lived URL generation, and app-facing file actions. Supabase/MinIO/AWS store bytes; media-service decides who may upload, list, read, edit, or delete.

Storage/rendering rule: admin filemanager access and website rendering access are separate contracts. Filemanager endpoints stay `admin/root-admin`. Public website rendering must use approved variants and policy-aware render URLs, not permanent storage credentials or raw originals.

Lane-aware media rule: the admin filemanager should become one reusable UI shell backed by separate backend route families for `PUBLIC`, `PROTECTED`, and `STRICT` lanes. Public media uses descriptive keys under `MEDIA_PUBLIC_FOLDER`. Protected and strict media use opaque keys under `MEDIA_PRIVATE_FOLDER`, list by owner/scope/business context instead of S3 folders, and use policy-checked short-lived read paths. Strict media adds stronger privacy/audit rules and should not leak sensitive original filenames through storage keys or casual metadata views.

#### P0-0A Storage Baseline - MinIO/S3 Compatibility

- [x] Split S3-compatible config into internal storage endpoint and public/client upload endpoint.
- [x] Add AWS-compatible env contract: provider, region, bucket, access key, secret key, force path style, internal endpoint, public endpoint.
- [x] Validate S3/MinIO env at startup when `MEDIA_STORAGE_DRIVER=s3`.
- [x] Verify real MinIO storage round trip: presign -> PUT object -> finalize -> DB row -> read/list/delete.
- [x] Ensure generated upload/read URLs use the public endpoint, not Docker-internal `minio:9000`.
- [x] Add configurable media folder roots: `MEDIA_PUBLIC_FOLDER`, `MEDIA_PRIVATE_FOLDER`, and `MEDIA_SYSTEM_FOLDER`.
- [x] Normalize configured folder roots to S3-safe `/` paths and reject `..`, leading slash, and ambiguous backslashes.
- [x] Define two-lane storage key strategy: human paths under public filemanager root, opaque generated keys under private/system roots.
- [x] Implement public filemanager storage keys under `MEDIA_PUBLIC_FOLDER/{folderPath}/{displayName}`.
- [x] Use descriptive physical storage keys only for approved public library assets and public SEO/render variants.
- [x] Use opaque storage keys for `PROTECTED` and `STRICT` originals.

#### P0-0B Admin Filemanager Contract

- [x] Freeze media HTTP contract for health, admin list/get/create/delete, browse, presign, finalize, admin read-url, lane wrappers, and public delete preview/confirm behavior.
- [x] Freeze media gRPC contract for Ping, Create, GetById, List, DeleteById, PresignUpload, and FinalizeUpload.
- [x] Add public-library HTTP route family wrappers for browse, presign, finalize, read-url, and delete.
- [x] Define protected-library and strict-library route families.
- [x] Define protected/strict context metadata requirements: ownerId, scope, entity type/id, and allowed actor roles.
- [x] Define strict privacy behavior for display names, original filename handling, read path, audit, and encryption direction.
- [x] Keep current media management endpoints restricted to `admin/root-admin` in controller/guard wiring.
- [x] Limit public filemanager browse/presign/finalize actions to `MEDIA_PUBLIC_FOLDER`.
- [x] Decide whether global admin delete stays admin/root-admin maintenance or narrows to root-admin only.
- [x] Treat filemanager uploads as public media-library assets by default.
- [x] Support arbitrary virtual folder structures under `MEDIA_PUBLIC_FOLDER` through uploaded media `folderPath` metadata.
- [x] Decide whether empty folder creation is needed or whether folders remain virtual DB-derived prefixes.
- [x] Add public bulk delete and recursive folder delete preview/confirm contracts.
- [x] Add admin browse endpoint returning `{ folders, files }` for a selected public-library folder path.
- [x] Add browse/search filters for public filemanager: folder, q, media type, MIME type, status, scanStatus, and accessClass.
- [x] Add stronger media health response with DB and S3-compatible storage checks.
- [x] Add focused tests for public descriptive paths vs protected/strict opaque path rejection.
- [x] Add browse tests for Supabase-style folder/file/search output.
- [x] Enforce public finalize path/metadata consistency so `path`, `folderPath`, and `displayName` cannot disagree.
- [x] Forbid direct S3 row creation through legacy HTTP `POST /media` and gRPC `Create`; keep direct create as legacy non-S3 compatibility only if needed.
- [x] Add missing admin/root-admin restriction tests for browse, read-url, and delete.
- [x] Add public-library read-url/delete wrapper tests for public media and non-public rejection.
- [x] Add filemanager actions checklist: create folder, rename folder/file, move/copy file, metadata update, soft-delete or hard-delete decision.
- [x] Define public library collision behavior for `(scope, folderPath, displayName)`: presign auto-renames duplicates with numeric suffixes, and finalize rejects exact already-taken names.
- [x] Fix stale gRPC e2e test title that says `Create` while the test now uses `FinalizeUpload`.
- [x] Add lane-specific media gRPC route families for public/protected/strict list, presign, finalize, read-url, and delete.
- [x] Harden public delete confirmation: use `GATEWAY_SECRET`, bind preview token to the same actor user/role, and expire it through `MEDIA_DELETE_CONFIRM_TTL_SECONDS`.
- [x] Cap synchronous public bulk/recursive delete through `MEDIA_SYNC_DELETE_MAX_FILES`; reserve oversized destructive plans for workers/queues.

#### Later Admin Filemanager Implementation Follow-Ups

- [ ] Add durable strict media audit storage for reads/deletes beyond service logs.
- [ ] Decide and implement strict media encryption layer: provider SSE first, app-level envelope encryption later, or both.
- [ ] Add worker/queue execution for oversized public delete plans and stale/orphan reconciliation.
- [ ] Add explicit public media folder records for old-school empty folder support.
- [ ] Make public browse merge explicit folder records with file-derived folders.
- [ ] Add public folder create/rename/move/delete implementation.
- [ ] Before UI implementation, analyze Salar's uploaded Vite admin panel and its built-in Velzon filemanager template; adapt Nebula's filemanager UX to that panel instead of designing it separately.

#### P0-0C Access Classes and Render Policy

- [x] Complete base `accessClass` wiring (`PUBLIC|PROTECTED|STRICT`) in DTO/proto/controller/service.
- [x] Freeze read/access behavior for `PUBLIC`, `PROTECTED`, and `STRICT` media in contract docs and tests.
- [x] Add tests that `visibility=public` maps to `accessClass=PUBLIC`.
- [x] Add tests that `visibility=private` maps to `accessClass=PROTECTED`.
- [x] Add tests that `accessClass` overrides old visibility compatibility when both are supplied.
- [x] Add tests that `STRICT` read URLs use `MEDIA_STRICT_READ_TTL_SECONDS`.
- [x] Add tests that `PUBLIC` and `PROTECTED` read URLs use `MEDIA_SIGNED_READ_TTL_SECONDS`.
- [x] Decide and implement website-facing render URL endpoint separately from admin filemanager endpoints.
- [x] Define protected/strict filemanager lane upload/read contracts using context-scoped backend routes.
- [x] Add protected/strict filemanager lane upload flows using opaque storage keys and required business context.
- [x] Require feature context for sensitive uploads: ownerId, scope, accessClass, and business entity id when needed.
- [x] Add protected/strict context fields to media proto and gRPC controller mappings.
- [x] Add deeper protected/strict gRPC lane tests for finalize, list, read-url denial while pending, and lane delete wrappers.
- [x] Ensure protected files are only listed/read from their owning feature page by requiring `ownerId + scope + entityType + entityId` on user-panel protected routes.
- [x] Ensure client-side user panels can only see their own protected files through `my/protected-library` browse/read-url routes.
- [x] Run focused protected/strict HTTP and gRPC media e2e tests once the backend stack is up.
- [x] Add ID-based public render URL resolution that uses media-service policy checks.
- [x] Drop path-based render resolution from launch scope; filemanager thumbnails and website rendering should use media IDs.
- [x] Ensure render endpoint blocks unapproved assets (`PENDING`, `QUEUED`, `INFECTED`, `BLOCKED`) from public website use.
- [x] Tighten admin read-url availability to `READY/CLEAN` only, blocking pending, queued, blocked, deleted, infected, failed, and unscanned rows.
- [x] Keep `STRICT` out of public rendering unless a later explicit audited flow is designed.
- [x] Wire gRPC `ListReq.status` and `ListReq.scanStatus` through the controller or remove them from the frozen contract.

#### P0-0D Download Resistance and SEO Media Strategy

- [x] Define stable SEO/public media URL policy for approved `PUBLIC` variants.
- [x] Define short-lived render URL policy for `PROTECTED` and `STRICT` assets.
- [x] Do not expose original files to public website rendering by default.
- [x] Define `variant=web` as the launch public optimized-variant contract; defer actual generated derivatives to the media worker phase.
- [x] Add image sitemap plan: approved public `variant=web` media is index-eligible by default, sitemap output comes from indexable public content records, and semantic image metadata belongs to product/blog/page/settings records instead of the filemanager.
- [x] Add response header policy: public render is `inline` with conservative public caching; signed read URLs are `inline` by default, `private, no-store`, and `attachment` only for explicit download flows.
- [ ] Add CORS/origin policy for render URLs and storage/CDN access.
- [ ] Document canvas/WebGL rendering as a download-resistance layer, not a foolproof DRM layer.
- [ ] Decide watermark/downsized preview behavior for sensitive previews.

#### P0-0E Lifecycle, Ownership, and Future Variants

- [ ] Define media scan/promotion lifecycle from `PENDING/QUEUED` to `READY/CLEAN` or blocked states.
- [ ] Validate owner enforcement with auth-service as identity source-of-truth.
- [ ] Reserve DB/API model for immutable originals and derived variants without implementing full editing yet.
- [ ] Define public variant vs protected original relationship before frontend filemanager work starts.
- [x] Add DB metadata for public library paths and display names: folderPath, displayName, originalFilename; keep existing `path` as physical storage key for now.


### P0-1 Contract Freeze and Build Stability

- [ ] Create launch API contract freeze notes for auth, user club, blog, settings, media, product, taxonomy, and order.
- [x] Freeze auth-service launch HTTP/gRPC contract.
- [x] Freeze user-service launch HTTP/gRPC contract.
- [x] Freeze settings-service launch HTTP/gRPC contract.
- [ ] Freeze media-service launch HTTP/gRPC contract.
- [ ] Freeze taxonomy-service launch HTTP/gRPC contract.
- [ ] Freeze blog-service launch HTTP/gRPC contract.
- [ ] Freeze product-service launch HTTP/gRPC contract.
- [ ] Freeze order-service launch HTTP/gRPC contract.
- [ ] Revisit P0-0 media closeout findings before freezing the media-service launch contract.
- [ ] Harden media gRPC validation so invalid enum-like contract values fail loudly instead of being silently ignored: `accessClass`, `status`, and `scanStatus`.
- [ ] Decide whether Prisma `Media.accessClass` should default to `PROTECTED` instead of `PUBLIC`, then add the migration or document why DB-level public default is intentional.
- [ ] Expand public render denial tests so the completed checklist claim is explicit for pending, queued, blocked, deleted, infected, failed, and unscanned media, not only the broad `READY/CLEAN` implementation.
- [ ] Mark older media reports as historical/superseded where current lane-aware filemanager direction differs from the earlier public-only filemanager direction.
- [ ] Clean media-service docs structure so verification facts are not listed under Known Gaps.
- [ ] Refresh Docker boot docs/reports that still mention the old `full` profile if current Compose keeps all backend services in the default stack.
- [ ] Decide system-initializer settings write contract for product/blog default taxonomy IDs. Current settings gRPC writes require `admin/root-admin` JWT context; product/blog default taxonomy initializers must not rely on `x-user-id` alone. Choose a safe internal/system RPC, seed step, or admin-authenticated startup path.
- [ ] Enforce consistent API response/error shape across launch services.
- [x] Ensure `pnpm -w proto:gen` passes from a clean state.
- [ ] Ensure `pnpm -w build` passes from a clean state.
- [x] Ensure `docker compose up -d --build` boots the full backend stack reliably.

### P0-2 Source Lint Cleanup

- [x] Product-service source lint errors removed.
- [ ] Clean remaining product-service test warnings where they hide useful failures.
- [x] Verify auth-service source lint/build state after recent strict cleanup.
- [ ] Re-verify media-service source lint/build state after current media contract edits and the planned `lint:fix` pass.
- [ ] Verify blog-service source lint/build state after recent strict cleanup.
- [ ] Verify order-service source lint/build state after recent strict cleanup.
- [ ] Verify taxonomy-service source lint/build state after recent strict cleanup.
- [ ] Verify user-service source lint/build state after recent strict cleanup.
- [ ] Verify settings-service source lint/build state after recent strict cleanup.

### P0-3 Boot, Docker, and Environment Hygiene

- [x] Document local startup dependency graph and ports.
- [x] Document Docker Compose default backend stack behavior.
- [ ] Critical: make auth/S2S request time validation server-runtime authoritative. Do not trust client/caller machine time to extend validity windows; clamp any timestamp/bucket checks to receiving server time with a small allowed skew so clock drift is visible and client clock freezing cannot create infinite valid buckets.
- [ ] Add MinIO healthcheck or document why Compose shows plain `Up` for MinIO.
- [ ] Add Docker/Kubernetes env notes for internal service URLs vs public/browser URLs.
- [ ] Keep release Compose compatible with future Kubernetes: no app state in containers, secrets from env, DB/media in volumes/services, migrations as jobs.
- [ ] Confirm all `.env.example` files match required runtime variables.
- [ ] Confirm root Prisma scripts cover every Prisma-backed service or document why they do not.
- [ ] Confirm Dockerfile `EXPOSE` ports match service `.env.example` ports.
- [ ] Add smoke checks for HTTP `/health` and gRPC readiness per service.

### P0-4 Public Website Launch

- [ ] Deliver `SITE-01..07` from `site essentials.md`.
- [ ] Ensure dynamic header/footer/menu render from settings.
- [ ] Ensure static/legal pages are present and linked.

### P0-5 User Club Launch

- [ ] Deliver `USER-01..06`.
- [ ] Validate login/refresh/logout/profile/favorites in real UI flows.

### P0-6 Blog/CMS Launch

- [ ] Deliver `BLOG-01..08`.
- [ ] Ensure slug uniqueness and publish workflow works from admin.

### P0-7 Product Baseline Launch

- [ ] Deliver `PROD-01..04`, `PROD-08..09`, `PROD-11`, `PROD-13`, `PROD-15`, `PROD-17..20`.
- [ ] Confirm taxonomy support for category/tag/brand at API level.
- [ ] Ensure product list/detail is stable for public and admin use.

### P0-8 Settings, SEO, and Index Hygiene

- [ ] Deliver `SET-01..08`.
- [ ] Deliver `SEO-01..12`.
- [ ] Add index hygiene controls for duplicate/parameter/preview/admin URLs.
- [ ] Add redirect management for slug/path changes.
- [ ] Run pre-release crawl and fix canonical/404/duplicate issues.

### P0-9 Admin Panel Core

- [ ] Deliver `ADM-01..09`.
- [ ] Enforce `ADM-11` role boundaries (`admin` vs `editor`).

### P0-10 Release Operations

- [ ] Deliver `OPS-01..06`.
- [ ] Execute release smoke checks for core public and admin flows.
- [ ] Freeze new feature intake after P0 checks begin.

## Priority 1 - Should If Time Holds

- [ ] Product depth: variable products, variants, discount campaign entity, backorders, variant matrix, downloads, draft preview.
- [ ] Preview and audit: page preview workflow, signed preview-token endpoints, admin audit log.
- [ ] Define curated NebulaNV block/theme composition schema: sections, layout presets, slots, block props, theme tokens, responsive placement, smart slot rules, and SSR-safe rendering constraints.
- [ ] Define web/mobile renderer split: Next.js responsive web renderer with CSS grid/container queries, plus later native mobile renderer using the same schema and theme/data contracts.
- [ ] Define first block catalog: hero, product slider/grid, promo banner, blog cards, media gallery, CTA, FAQ, testimonials, profile/order/app-view panels, and safe allowed-slot rules.
- [ ] Media provider integration: document and verify Supabase Storage S3 mode beside local MinIO and future AWS S3.
- [ ] Media variants: add DB/API support for original files, thumbnails, optimized images, edited versions, and derived files.
- [ ] Media editing baseline: define safe edit workflow where originals are immutable and edits create variants.
- [ ] Media asset bundles: define metadata model for grouped assets needed by future 3D showroom files.

## Priority 2 - Post-Launch

- [ ] Implement NebulaNV block editor with saved sections, draft/preview/publish, version restore, performance budgets, accessibility/SEO warnings, and breakpoint/app previews.
- [ ] Explore native Android/iOS block renderers after web schema and SSR rendering are proven.
- [ ] Realtime sessions/classroom streaming.
- [ ] 3D showroom feature: GLB/GLTF/USDZ asset bundles, texture handling, preview image, and scene manifest flow.
- [ ] Streaming media pipeline: video ingest, transcode jobs, thumbnails, HLS/DASH outputs, and signed playback.
- [ ] Go media-worker: metadata extraction, checksums, image variants, and scan/promotion orchestration.
- [ ] Go showroom-asset-worker: 3D asset validation, texture optimization, and manifest generation.
- [ ] Go streaming-worker: ffmpeg/HLS/DASH packaging and video thumbnails.
- [ ] Full queue/agent/event-driven overhaul.
- [ ] Evaluate Rust for performance-critical media/codecs/security components only after Go worker boundaries are proven.
- [ ] Use Python for AI/ML/offline media intelligence only when a concrete model/data workflow exists.
- [ ] Deep analytics and observability stack expansion.
- [ ] Large backend architecture rewrites not needed for launch flows.

## Observability / Logging

- [ ] Add structured logger across services.
- [ ] Include service name, layer, transport, context, requestId/traceId, actor user, and source module.
- [ ] Keep container logs on stdout/stderr for Docker/Kubernetes compatibility.
- [ ] Add log routing later for DB, HTTP, gRPC, and app-level logs.
- [ ] Add request correlation so one user/API action can be traced across services.
- [ ] Gate noisy Prisma query logs behind an env flag like `PRISMA_QUERY_LOGS=true`.
- [ ] Decide later whether local dev also writes per-service log files.

## Verification Commands

```powershell
pnpm -w proto:gen
pnpm -w build
docker compose config
docker compose --progress=plain build --provenance=false --sbom=false
docker compose up -d --force-recreate
docker compose ps -a
```

Targeted examples:

```powershell
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm --filter @nebula/media-service build
pnpm --filter @nebula/auth-service build
pnpm --filter web build
```

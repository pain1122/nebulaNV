# Current Focus

Last updated: 2026-07-02

## Active Phase

P0-0D Download Resistance and SEO Media Strategy.

## Current Goal

Finish the media render strategy after the P0-0C access-class contract freeze.

The backend now has the launch boundary we wanted:

- Public website rendering uses `GET /media/render/:id?variant=web`.
- Public render accepts only approved `PUBLIC` media that is `READY` and `CLEAN`.
- Public render does not expose original/raw variants by default.
- Protected and strict media stay on short-lived policy-checked read URLs.

The next work is P0-0D: define how public media becomes SEO-friendly and harder to casually download, without pretending this is full DRM.

The filemanager vision has evolved from one public-only admin library into one reusable admin filemanager shell with separate backend route families for each access lane:

- Public library lane: folder-style browsing, descriptive keys, public/admin content assets.
- Protected library lane: context-based listing, opaque keys, private business files.
- Strict library lane: context-based listing, opaque keys, stronger privacy/audit rules, and no sensitive names in storage paths.

The admin panel target is a Vite React SPA. The public website remains Next.js for SEO/public rendering.

The intended storage model is:

- Public admin filemanager assets use descriptive S3 keys under `MEDIA_PUBLIC_FOLDER`, for example `uploads/products/shoes/hero.webp`.
- Protected/strict assets use opaque S3 keys under `MEDIA_PRIVATE_FOLDER`, for example `private/objects/<uuid>`.
- S3-backed media rows should be created through `presign -> PUT -> finalize`, because finalize verifies the object in storage before writing the DB row.
- Supabase/MinIO/AWS store bytes only. Media-service owns policy, metadata, listing, read URLs, and delete behavior.
- Public library folders should be explicit media-service DB records, while S3 remains object-only storage.
- Public recursive/bulk delete should use a backend `preview -> confirm` contract before destructive work runs.

## Current Backend State

Implemented in current code, with focused test coverage where noted:

- Public filemanager presign creates descriptive keys under `MEDIA_PUBLIC_FOLDER`.
- Public finalize verifies uploaded S3 object metadata before creating a DB row.
- Public finalize rejects metadata where `path`, `folderPath`, and `displayName` disagree.
- Legacy direct `POST /media` and gRPC `Create` reject S3-compatible rows; S3 writes must use `presign -> PUT -> finalize`.
- Public filemanager presign auto-renames duplicate file names with numeric suffixes, such as `hero-(1).webp`.
- Protected/strict uploads are rejected from public filemanager presign.
- Protected/strict finalize rejects public filemanager paths and descriptive private paths.
- `GET /media/browse` returns Supabase-style folder/file data for public filemanager navigation.
- Public-library HTTP route family exists for browse, presign, finalize, read-url, and delete wrappers.
- Public-library bulk and recursive delete endpoints exist as `delete-preview -> delete-confirm`; confirm re-checks the preview plan before deleting.
- Public-library delete confirmation tokens are signed with `GATEWAY_SECRET`, expire through `MEDIA_DELETE_CONFIRM_TTL_SECONDS`, and are bound to the same actor user/role that requested the preview.
- Public-library sync delete is capped by `MEDIA_SYNC_DELETE_MAX_FILES`; larger plans return a worker/queue warning instead of doing heavy destructive work inline.
- Protected-library and strict-library HTTP route families exist for context browse, presign, finalize, read-url, and delete wrappers.
- Protected/strict browse and upload require resolved owner plus `scope`, `entityType`, and `entityId` context.
- User-panel protected routes exist as `GET /media/my/protected-library/browse` and `POST /media/my/protected-library/:id/read-url`; they force owner to the current authenticated user and require exact `scope`, `entityType`, and `entityId` context.
- Strict-library presign/finalize uses opaque private keys and generated safe filenames; original filenames are not stored in strict rows.
- Admin read-url creation only succeeds for media that is `READY` and `CLEAN`; pending, queued, blocked, deleted, infected, failed, or unscanned rows are not previewable.
- Website-facing public render exists as `GET /media/render/:id?variant=web`. It is the stable website URL policy for approved public media today: website code should store/use media IDs and request the `web` render variant, not raw S3 keys.
- Public render streams only S3-backed `PUBLIC` media under the public library root when the row is `READY` and `CLEAN`; it is separate from admin filemanager read-url endpoints.
- Public render does not expose original/raw variants by default. Launch uses `variant=web` as the public optimized-variant contract; actual generated derivatives are deferred to the media worker phase.
- SEO image indexing policy is frozen: approved public `variant=web` media is index-eligible by default, but image sitemap output should be generated from indexable public content records that reference media IDs.
- Product, blog, page, and settings records own semantic image usage such as featured image, gallery role, ordering, alt text, and captions. Media-service owns asset eligibility and render URLs; the filemanager is only the picker/library.
- Header/cache policy is frozen: public render is `inline` with conservative public cache headers, signed read URLs are `inline` by default with `private, no-store`, and `attachment` is only for explicit download flows.
- Protected and strict media do not use public render. They use short-lived policy-checked read URLs; `PROTECTED` uses `MEDIA_SIGNED_READ_TTL_SECONDS`, and `STRICT` uses `MEDIA_STRICT_READ_TTL_SECONDS`.
- Path-based render resolution is intentionally out of launch scope. Filemanager thumbnails and website rendering should use media IDs from media-service browse/content responses.
- Access-class compatibility is frozen: legacy `visibility` maps to `PUBLIC`/`PROTECTED`, explicit `accessClass` wins, and strict read URLs use the strict TTL.
- Public-library read-url/delete wrappers reject non-public media.
- Normal user denial tests cover browse, read-url, and delete for current admin filemanager endpoints.
- gRPC media contracts now carry `entityType` and `entityId`.
- gRPC has explicit public/protected/strict library RPC families for list, presign, finalize, read-url, and delete.
- gRPC `ListReq.status` and `ListReq.scanStatus` are passed through to service filtering.
- Deeper protected/strict gRPC lane tests cover finalize, scoped list, pending read-url denial, wrong-lane delete rejection, and lane-specific delete.
- Unit coverage now confirms a protected media owner can create a read URL while another normal user receives `media_access_denied`, protected list queries are owner/context scoped, and protected feature read URLs reject wrong feature context.
- `/health` checks DB and S3-compatible storage reachability.

P0-0D is a contract-and-policy slice, not a full media worker implementation.

The goal is to freeze what launch code should rely on now and what later workers/CDN paths must honor. Do not turn this phase into the full variant pipeline, admin UI, image editor, CDN migration, or DRM system.

P0-0D decisions frozen:

- Public derived variant contract: launch uses `variant=web` as the public optimized-variant contract, actual generated derivatives are deferred to the media worker phase, and originals stay out of public website rendering.
- SEO/indexing contract: approved public `variant=web` media is index-eligible by default; image sitemap output is generated from indexable public content records and uses canonical render URLs.
- Header/cache contract: public render is inline with conservative public caching; signed read URLs are inline by default, private/no-store, and attachment only for explicit download.

P0-0D still open:

- CORS/origin contract: website/CDN render access, storage provider access, direct browser uploads, and admin reads must be separate policies.
- Download-resistance statement: canvas/WebGL, disabling right-click, overlays, or short URLs can reduce casual saving but are not DRM.
- Sensitive preview decision: whether protected/strict previews stay full-size signed reads for now or use downsized/watermarked/per-feature preview rules.

Frozen but not implemented yet:

- Strict durable audit storage and optional app-level encryption are not implemented yet; the current backend has safe filenames, opaque keys, short read TTLs, and service log hooks.
- Global admin delete stays available to `admin` and `root-admin` because admins are the main site maintenance layer.
- Public empty folders will be explicit DB folder records owned by media-service, not S3 placeholder objects.
- Public browse should eventually merge explicit folder records with folders implied by existing media rows.
- Public delete preview/confirm currently deletes media rows and storage objects for selected files and file-derived folder paths. When explicit folder records are added, confirm should also remove explicit folder rows and child folder rows.
- Worker/queue-backed delete execution and stale/orphan reconciliation are later lifecycle work; the current backend refuses oversized sync delete plans instead of attempting them inline.

## P0-0D Decision Path

Work in this order so the context stays reliable:

1. Public variant policy:
   Define `variant=web` as the launch public optimized-variant contract, defer actual generated derivatives to the media worker phase, and state that original/raw public files are not served by public render by default.
2. SEO image policy:
   Define all approved public `variant=web` media as index-eligible by default, generate image sitemap entries from indexable public content records that reference media IDs, use canonical render URLs, and keep alt/caption/role metadata on the owning product/blog/page/settings record instead of the filemanager.
3. Headers and cache:
   Freeze response headers for public render, admin preview, explicit download, and future CDN paths. Public render is inline with conservative public cache headers. Signed read URLs are inline by default, private/no-store, and attachment only for explicit download. Long immutable caching waits until variant URLs are content-addressed or otherwise immutable.
4. CORS and origin:
   Separate public render origins, admin app origins, direct presigned upload behavior, and raw storage/CDN access. Do not make the storage bucket broadly public to solve website rendering.
5. Download-resistance note:
   Document what can and cannot be protected. Treat canvas/WebGL and UI friction as casual download resistance only.
6. Sensitive preview policy:
   Decide launch behavior for protected/strict previews. If the decision is deferred, record the temporary rule and the later trigger for watermark/downsized previews.
7. Closeout:
   Update `TODO.md`, `docs/services/media-service.md`, `docs/services/web.md` if website behavior changes, and tests only for behavior that is actually implemented now.

## P0-0D Guardrails

- Website code should store media IDs and request `GET /media/render/:id?variant=web`; do not reintroduce path-based public render for launch.
- Public render may serve only `PUBLIC` media under the public library root when `status=READY` and `scanStatus=CLEAN`.
- Public render must not expose storage credentials, raw S3 URLs, raw/original variants, protected media, or strict media.
- Protected and strict media stay on short-lived policy-checked read URLs unless a later audited render flow is explicitly designed.
- SEO indexing is for approved public website media only. Never put protected/strict URLs, admin read URLs, presigned URLs, private filenames, or storage keys into sitemap inputs.
- Header policy should make normal website rendering `inline`; use `attachment` only when the route/action is explicitly a download.
- CORS should allow the intended app/browser origins without making MinIO/Supabase/AWS storage the app privacy authority.
- Cache policy must respect approval, deletion, scan state, and future replacement risk. Use long immutable caching only after derived variant URLs are versioned or content-addressed.
- Download resistance must be described honestly. Anything visible in a browser can be captured; the launch goal is to avoid exposing originals and reduce casual copying.
- P0-0C hardening found during review belongs in P0-1 after P0-0 closes: gRPC enum validation, DB default review, broader denial tests, stale report cleanup, media doc cleanup, and Docker profile doc cleanup. Lint formatting remains in P0-2.

## Verification Status

- `pnpm --filter @nebula/media-service build` passes as of 2026-07-01.
- `pnpm --filter @nebula/media-service test:unit -- --runTestsByPath test/media.service.access.spec.ts` passes with 11 tests as of 2026-07-01.
- Docker media migration `20260629000100_add_media_context_metadata` was applied to `nebula_media` on 2026-07-01 after the rebuilt container exposed that the DB was missing `entityType` and `entityId`.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/http/media.http.e2e.spec.ts --runInBand` passes with 20 tests as of 2026-07-01 when `DATABASE_URL` is temporarily pointed at Docker Postgres on `127.0.0.1:15432`.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/grpc/media.e2e.spec.ts --runInBand` passes with 9 tests as of 2026-07-01.
- `pnpm --filter @nebula/media-service lint` is intentionally left for the later `lint:fix` cleanup pass and currently fails on Prettier formatting in modified media files.

## Not Now

- Admin web media picker/filemanager UI.
- Curated UI block/theme system for web, responsive views, and mobile apps; this belongs to a later client-side composition phase after backend/media launch contracts stabilize.
- Full protected/strict UI implementation beyond drafting the backend contract.
- UI phase note: when the Vite admin panel is ready, analyze the built-in Velzon panel filemanager template before building Nebula's filemanager. Salar likes that built-in filemanager direction: clean, light, customizable, old-school enough to feel obvious, and visually close to the panel. Use its dashboard shell, folder/sidebar area, main file area, right preview/details panel, clean density, and practical filemanager behavior as a visual/UX reference, then adapt Nebula's filemanager to the actual uploaded panel instead of designing in isolation.
- Protected/strict website render flows.
- Go workers.
- Rust/WebXR optimization.
- Kubernetes manifests.
- Streaming pipeline.

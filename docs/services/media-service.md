# Media Service

Last reviewed: 2026-06-29

## Purpose

Media-service owns media metadata, upload/finalize/read/delete flows, signed URL generation, access classes, and S3-compatible storage integration.

Media-service is the app privacy authority for media. MinIO, Supabase Storage, and AWS S3 store bytes only.

## Current Storage Model

| Provider | Role |
| --- | --- |
| MinIO | Current local S3-compatible storage |
| Supabase Storage S3 | Planned storage/filemanager-compatible provider |
| AWS S3 | Future production object storage |

The service uses AWS S3 SDK commands against S3-compatible providers.

Important commands currently used:

- `PutObjectCommand` for presigned upload URLs.
- `HeadObjectCommand` during finalize to verify object metadata.
- `GetObjectCommand` for presigned read URLs.
- `DeleteObjectCommand` when deleting stored objects.

## Public Filemanager Lane

This is the current implemented lane.

Rules:

- HTTP and gRPC media actions are restricted to `admin/root-admin`.
- The public filemanager lane uses `MEDIA_PUBLIC_FOLDER`, currently `uploads`.
- Admin-facing `folderPath` is relative to `MEDIA_PUBLIC_FOLDER`.
- Example: `folderPath = "/images/products"` and `displayName = "hero.webp"` becomes storage key `uploads/images/products/hero.webp`.
- Public lane is for public/renderable storefront/admin-managed assets.
- Human-readable physical paths are allowed here for SEO and admin organization.
- Storage path is organizational, not the final security boundary.

Metadata fields:

- `path`: physical storage key.
- `folderPath`: admin filemanager folder, for example `/images/products`.
- `displayName`: admin-facing filename inside that folder.
- `originalFilename`: original client filename when known.
- `filename`: service/client-provided filename metadata.

Current behavior:

- `finalizeUpload()` rejects public metadata when `path`, `folderPath`, and `displayName` describe different objects.
- `presignUpload()` auto-renames duplicate public file names with numeric suffixes, such as `hero-(1).webp`.
- `finalizeUpload()` rejects an exact already-taken public-library `(scope, folderPath, displayName)` so duplicate DB rows are not created for the same public object.

## Lane-Aware Admin Filemanager Vision

Target direction: use one reusable admin filemanager UI shell, but back it with separate backend route families per access lane.

The UI may look consistent across lanes, but each lane has different backend listing, upload, read, and delete rules.

Future UI reference: when the Vite admin panel is uploaded, design the media filemanager relative to that panel instead of starting from a blank UI. Salar likes the built-in Velzon panel filemanager template because it is clean, light, customizable, and practical. Treat Velzon's dashboard shell, folder/sidebar area, main file area, right preview/details panel, clean density, and old-school filemanager behavior as a visual/interaction reference; keep Nebula's own media-service APIs as the backend contract.

| Lane | Listing model | Storage key model | Main use |
| --- | --- | --- | --- |
| `PUBLIC` | Folder-style browse with `folderPath` and `displayName` | Descriptive keys under `MEDIA_PUBLIC_FOLDER` | Product/blog/site/public assets |
| `PROTECTED` | Context-scoped list by owner/scope/entity metadata | Opaque keys under `MEDIA_PRIVATE_FOLDER` | Private business files tied to a product/order/course/etc. |
| `STRICT` | Context-scoped list with stricter view/audit rules | Opaque keys under `MEDIA_PRIVATE_FOLDER` | Personal/sensitive documents and high-privacy material |

Supabase/MinIO/AWS storage UIs may remain useful for trusted raw storage inspection, but the Nebula admin panel should use media-service route families, not raw storage APIs.

## Public Library Folders And Deletes

Decision: public library folders should be app-level DB records owned by media-service. S3-compatible storage remains object-only storage; do not create S3 placeholder objects just to represent empty folders.

Target behavior:

- Public browse should merge explicit folder records with folders implied by existing media `folderPath` values.
- Empty folders remain visible because they are DB records.
- Deleting an empty folder can be a direct folder delete action.
- Deleting a non-empty folder requires recursive delete.
- Recursive delete and bulk delete use a backend `preview -> confirm` flow, not only a frontend confirmation popup.
- Delete preview should return affected file count, folder count, total size, paths, warnings, and a short-lived confirmation token.
- Delete confirm should re-check the plan before deleting media rows, explicit folder rows, and storage objects.
- Current delete preview/confirm support covers selected public files and file-derived public folder paths. Explicit `MediaFolder` row deletion will be added when folder records are implemented.
- Delete confirmation tokens are signed with `GATEWAY_SECRET`, expire through `MEDIA_DELETE_CONFIRM_TTL_SECONDS`, and are bound to the same actor user/role that requested the preview.
- Sync delete execution is capped by `MEDIA_SYNC_DELETE_MAX_FILES`; larger plans return a worker/queue warning and are not deleted inline.
- Worker/queue-based retries, oversized delete execution, and stale/orphan reconciliation remain a later lifecycle phase.

Future filemanager actions checklist:

- Create explicit public folder.
- Rename public folder.
- Rename public file display name.
- Move/copy public file.
- Move/copy public folder.
- Update media metadata.
- Bulk delete selected files/folders.
- Recursive delete non-empty folders through preview/confirm.
- Decide soft-delete retention versus immediate hard-delete per lane.

## Protected And Strict Lane

Existing support:

- Prisma enum: `AccessClass = PUBLIC | PROTECTED | STRICT`.
- `createReadUrl()` denies non-public media unless actor is admin/root-admin or owner.
- `createReadUrl()` only issues storage URLs for rows that are `READY` and `CLEAN`.
- `STRICT` uses `MEDIA_STRICT_READ_TTL_SECONDS`.
- Protected/strict lane routes list by owner/scope/entity metadata, not S3 folders.
- Protected/strict presign creates opaque storage keys under `MEDIA_PRIVATE_FOLDER`.
- Strict presign/finalize stores generated safe filenames and does not store the sensitive original filename.

Current behavior:

- The reusable admin filemanager shell can be opened in public, protected, or strict mode.
- Protected/strict lanes must be initiated by specific admin pages/features with required owner/scope/entity context.
- Sensitive storage keys should be opaque, not human-organized public paths.
- Owner/scope/business entity context should live in DB metadata.
- Strict media avoids leaking sensitive original filenames in storage keys or casual metadata views.
- Strict read/delete wrappers currently add service log hooks. A durable audit table is still future work.
- Optional app-level encryption is not implemented yet; provider-side encryption or app-level envelope encryption can be added later without changing the route family shape.
- Client-side protected reads use dedicated `my/protected-library` routes that force owner to the authenticated user and require exact feature context.

## Access Class Read Policy

Frozen service contract:

- Missing `accessClass` maps from legacy `visibility`.
- `visibility=public` maps to `accessClass=PUBLIC` and stored `visibility=public`.
- `visibility=private` maps to `accessClass=PROTECTED` and stored `visibility=private`.
- Explicit `accessClass` wins over legacy `visibility` when both are supplied.
- `PUBLIC` stores as `visibility=public`; `PROTECTED` and `STRICT` store as `visibility=private`.
- Read URLs are only issued for rows with `status=READY` and `scanStatus=CLEAN`.
- `PUBLIC` media can be read through admin read-url flows when ready/clean.
- `PROTECTED` and `STRICT` media require admin/root-admin or owner context.
- `PUBLIC` and `PROTECTED` read URLs use `MEDIA_SIGNED_READ_TTL_SECONDS`.
- `STRICT` read URLs use `MEDIA_STRICT_READ_TTL_SECONDS`.

## Website Render Policy

Frozen launch contract:

- Public website code should store media IDs and render approved public media through `GET /media/render/:id?variant=web`.
- Public render only serves S3-backed `PUBLIC` media under the configured public library root.
- Public render requires `status=READY` and `scanStatus=CLEAN`.
- Public render returns inline response headers, conservative public cache headers, `X-Content-Type-Options: nosniff`, and never returns storage credentials.
- Public render accepts only `variant=web` for launch. `variant=web` is the public optimized-variant contract; `original`, `raw`, `download`, and other variant names are rejected.
- Protected and strict media are not renderable through the public website endpoint.
- Public, protected, and strict signed read URLs use `inline` by default with `private, no-store`.
- Signed read URLs use `attachment` only when the caller explicitly requests a download.
- Protected previews use short-lived read URLs with owner/admin policy checks and `MEDIA_SIGNED_READ_TTL_SECONDS`.
- Strict previews use short-lived read URLs with owner/admin policy checks and `MEDIA_STRICT_READ_TTL_SECONDS`.
- Long immutable CDN caching is deferred until generated variant URLs are versioned, content-addressed, or otherwise safe to cache independently from approval/deletion/scan state changes.
- Actual generated derivatives are deferred to the media worker phase. Until that exists, `variant=web` means the approved public render object, not a promise that thumbnails or immutable originals already exist.

## SEO Image Policy

Frozen launch contract:

- Approved public `variant=web` media is index-eligible by default.
- Eligibility requires `accessClass=PUBLIC`, `visibility=public`, `status=READY`, `scanStatus=CLEAN`, S3-backed storage under `MEDIA_PUBLIC_FOLDER`, and successful rendering through `GET /media/render/:id?variant=web`.
- Image sitemap output should be generated by the public web app from indexable public content records that reference media IDs, such as product, blog, page, category, or site settings records.
- Canonical image URLs in sitemap output must use `GET /media/render/:id?variant=web`.
- Storage provider URLs, presigned URLs, admin read URLs, protected/strict media, raw/original variants, private filenames, and storage keys must never be emitted into sitemap inputs.
- Media-service owns asset eligibility, access class, lifecycle state, and render URL policy.
- Product, blog, page, category, and settings records own semantic image usage: featured image, gallery role, ordering, alt text, captions, crop intent, and page context.
- The filemanager is the picker/library for assets. It should not become the SEO metadata editor for page-specific image meaning.

## Current HTTP Contract

All current media management HTTP actions require `admin/root-admin`. `GET /health` and `GET /media/render/:id` are public.

Global admin delete remains available to both `admin` and `root-admin` because admins are the main site maintenance layer. Lane-specific delete wrappers still exist so the filemanager UI can call safer lane-aware endpoints.

Routes:

- `GET /health`
- `GET /media`
- `GET /media/browse`
- `GET /media/public-library/browse`
- `GET /media/protected-library/browse`
- `GET /media/strict-library/browse`
- `GET /media/my/protected-library/browse`
- `GET /media/render/:id?variant=web`
- `GET /media/:id`
- `POST /media`
- `DELETE /media/:id`
- `DELETE /media/public-library/:id`
- `DELETE /media/protected-library/:id`
- `DELETE /media/strict-library/:id`
- `POST /media/public-library/delete-preview`
- `POST /media/public-library/delete-confirm`
- `POST /media/presign`
- `POST /media/public-library/presign`
- `POST /media/protected-library/presign`
- `POST /media/strict-library/presign`
- `POST /media/finalize`
- `POST /media/public-library/finalize`
- `POST /media/protected-library/finalize`
- `POST /media/strict-library/finalize`
- `POST /media/:id/read-url`
- `POST /media/public-library/:id/read-url`
- `POST /media/protected-library/:id/read-url`
- `POST /media/strict-library/:id/read-url`
- `POST /media/my/protected-library/:id/read-url`

Notes:

- `GET /health` checks DB and S3-compatible storage reachability.
- `GET /media/browse` and `GET /media/public-library/browse` return Supabase-style `{ folders, files, items }` output for public filemanager navigation under `MEDIA_PUBLIC_FOLDER`.
- `POST /media` exists for direct non-S3 metadata creation and is legacy-compatible; S3-compatible rows are rejected and must use finalize.
- `POST /media/presign` and `POST /media/public-library/presign` return a public filemanager upload URL and storage metadata. If the requested display name already exists in the same scope/folder, it returns the next numeric name.
- `POST /media/finalize` and `POST /media/public-library/finalize` verify the uploaded object and create the DB row. The public-library wrapper forces `PUBLIC`/`public`.
- `GET /media/protected-library/browse` and `GET /media/strict-library/browse` return `{ folders: [], files, items, context }` for a required owner/scope/entity context.
- `GET /media/my/protected-library/browse` is the user-panel protected list route. It requires `scope`, `entityType`, and `entityId`, forces `ownerId` to the authenticated user, and never lists another user's protected files.
- Protected/strict presign/finalize wrappers force `private` visibility and their matching access class.
- Protected/strict upload and browse require resolved `ownerId`, explicit `scope`, `entityType`, and `entityId`.
- Strict wrappers use opaque keys and generated safe filenames; `originalFilename` is stored as `null`.
- `POST /media/:id/read-url` is the current global admin read-url endpoint. It only returns a signed URL when the row is `status=READY` and `scanStatus=CLEAN`; the signed response is inline by default, private/no-store, and attachment only when `download=true`.
- `POST /media/public-library/:id/read-url` is the public-lane read-url wrapper and rejects non-public media.
- `POST /media/protected-library/:id/read-url` and `POST /media/strict-library/:id/read-url` reject rows outside their lane.
- `POST /media/my/protected-library/:id/read-url` is the user-panel protected preview route. It requires the same feature context as browse, forces owner to the authenticated user, and returns a read URL only when the row belongs to that user and exact feature context.
- Pending, queued, blocked, deleted, infected, failed, or unscanned rows return `media_not_available` instead of a preview/download URL.
- `GET /media/render/:id?variant=web` is the website-facing public render route. It streams S3-backed `PUBLIC` media only, requires `status=READY` and `scanStatus=CLEAN`, rejects protected/strict media and unsupported variants such as `original`, and sends `inline` plus conservative public cache response headers. It does not return storage credentials or an admin read-url payload.
- `DELETE /media/:id` is the current global admin delete endpoint.
- `DELETE /media/public-library/:id` is the public-lane delete wrapper and rejects non-public media.
- `DELETE /media/protected-library/:id` and `DELETE /media/strict-library/:id` reject rows outside their lane.
- `POST /media/public-library/delete-preview` returns a two-step delete plan for selected public files and folder paths. Non-empty folders require `recursive=true`.
- `POST /media/public-library/delete-confirm` requires the actor-bound preview token and re-checks the plan before deleting public media rows and storage objects.
- Public-library delete-confirm refuses oversized sync plans above `MEDIA_SYNC_DELETE_MAX_FILES`; those plans are reserved for a later worker/queue executor.

## Current gRPC Contract

Service: `MediaService`

Methods:

- `Ping`
- `Create`
- `GetById`
- `List`
- `DeleteById`
- `PresignUpload`
- `FinalizeUpload`
- `ListPublicLibrary`
- `ListProtectedLibrary`
- `ListStrictLibrary`
- `PresignPublicLibraryUpload`
- `PresignProtectedLibraryUpload`
- `PresignStrictLibraryUpload`
- `FinalizePublicLibraryUpload`
- `FinalizeProtectedLibraryUpload`
- `FinalizeStrictLibraryUpload`
- `CreatePublicLibraryReadUrl`
- `CreateProtectedLibraryReadUrl`
- `CreateStrictLibraryReadUrl`
- `DeletePublicLibraryById`
- `DeleteProtectedLibraryById`
- `DeleteStrictLibraryById`

Notes:

- `Create` is kept for compatibility and marked legacy in proto comments.
- `Create` rejects S3-compatible rows; S3 writes must use `PresignUpload` and `FinalizeUpload`.
- `Media`, `CreateReq`, `ListReq`, `PresignUploadReq/Res`, and `FinalizeUploadReq` carry `entityType` and `entityId` for protected/strict business context.
- Generic `PresignUpload`/`FinalizeUpload` remain compatibility paths. Explicit public/protected/strict RPC methods are preferred for backend jobs and filemanager lane calls.
- Protected/strict lane RPCs force private/opaque-key behavior through media-service methods and require owner/scope/entity context.
- `ListReq.status` and `ListReq.scanStatus` are mapped by `media-grpc.controller.ts`.
- `Ping` is currently used for stronger gRPC readiness in media-service tests.
- Media gRPC methods are protected by S2S/auth guard behavior, with admin/root-admin roles on media actions.

## Important Env

- `MEDIA_STORAGE_DRIVER`
- `MEDIA_STORAGE_PROVIDER`
- `MEDIA_S3_ENDPOINT`
- `MEDIA_S3_INTERNAL_ENDPOINT`
- `MEDIA_S3_PUBLIC_ENDPOINT`
- `MEDIA_S3_REGION`
- `MEDIA_S3_BUCKET`
- `MEDIA_S3_ACCESS_KEY`
- `MEDIA_S3_SECRET_KEY`
- `MEDIA_S3_FORCE_PATH_STYLE`
- `MEDIA_SIGNED_UPLOAD_TTL_SECONDS`
- `MEDIA_SIGNED_READ_TTL_SECONDS`
- `MEDIA_STRICT_READ_TTL_SECONDS`
- `MEDIA_DELETE_CONFIRM_TTL_SECONDS`
- `MEDIA_SYNC_DELETE_MAX_FILES`
- `MEDIA_PUBLIC_FOLDER`
- `MEDIA_PRIVATE_FOLDER`
- `MEDIA_SYSTEM_FOLDER`

Folder env rules:

- Folder roots must be relative S3-style paths.
- No leading slash.
- No backslashes.
- No double slashes.
- No `.` or `..` path segments.

## Current DB Shape

Important Prisma fields:

- `storage`
- `bucket`
- `path`
- `filename`
- `folderPath`
- `displayName`
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `ownerId`
- `visibility`
- `scope`
- `entityType`
- `entityId`
- `accessClass`
- `sha256`
- `status`
- `scanStatus`
- `scannedAt`
- `scanError`
- `quarantineReason`
- `etag`
- `promotedAt`

Indexes exist for owner, access class, visibility, scope, owner/scope/entity context, folder path, display name, lifecycle fields, and promoted time.

Docker migration note:

- If Docker tests fail with `The column entityType does not exist in the current database`, apply the media migration against Docker Postgres from the repo root:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public"
pnpm --filter @nebula/media-service prisma:migrate:deploy
```

- Keep that same `DATABASE_URL` override in the shell when running HTTP e2e against Docker, because the HTTP test file uses Prisma directly for setup/verification.

## Current Tests

HTTP:

- `GET /health` reports DB and S3-compatible storage checks.
- `POST /media/presign` denies normal user and allows admin.
- Presign uses browser-usable URL and does not expose Docker-only `minio`.
- Public filemanager storage key is `uploads/<folderPath>/<displayName>`.
- Public duplicate file names are auto-renamed with numeric suffixes during presign.
- Public-library presign -> PUT -> finalize -> get -> list -> folder-filter -> pending read-url blocked -> delete works for admin.
- Public render streams ready/clean public S3 media without admin credentials.
- Public render blocks pending and non-public media.
- Public render rejects original/raw variants; launch only accepts `variant=web`.
- Public-library read-url/delete wrappers reject non-public media.
- Public-library delete preview/confirm handles bulk selected file deletes and recursive folder-path deletes.
- `GET /media/browse` returns Supabase-style folders/files and supports search.
- Direct S3 row creation through `POST /media` is rejected.
- Protected/strict filemanager uploads and descriptive protected/strict paths are rejected.
- Protected-library presign requires context and returns opaque private keys.
- Strict-library presign hides sensitive original filenames behind generated safe filenames.
- Protected-library browse lists files by owner/scope/entity context and returns no folders.
- User-panel protected-library browse/read-url routes only expose the authenticated user's files for the requested feature context.
- Normal user cannot list/get/browse/read-url/delete through current admin endpoints.

Unit:

- `MediaService` maps `visibility=public` to `PUBLIC`.
- `MediaService` maps `visibility=private` to `PROTECTED`.
- Explicit `accessClass` overrides legacy `visibility`.
- `PUBLIC` and `PROTECTED` read URLs use `MEDIA_SIGNED_READ_TTL_SECONDS`.
- `STRICT` read URLs use `MEDIA_STRICT_READ_TTL_SECONDS`.
- Protected list queries are scoped by owner and feature context.
- Protected feature read URLs require matching owner, scope, entity type, and entity id.

gRPC:

- Presign -> PUT -> FinalizeUpload -> GetById -> List -> DeleteById works with admin S2S metadata.
- `ListReq.status` and `ListReq.scanStatus` filtering is covered in the gRPC flow.
- Direct S3 row creation through `Create` is rejected.
- Missing gRPC signature fails.
- Public filemanager storage key and metadata echoes are asserted.
- Protected/strict filemanager uploads and descriptive protected/strict paths are rejected.
- Lane-specific public/protected/strict presign RPCs are covered for public key shape, required protected context, protected opaque keys, and strict filename privacy.

## Related Files

Core:

- `apps/media-service/src/media.service.ts`
- `apps/media-service/src/media.controller.ts`
- `apps/media-service/src/media-render.controller.ts`
- `apps/media-service/src/grpc/media-grpc.controller.ts`
- `apps/media-service/src/media.module.ts`
- `apps/media-service/src/main.ts`

Contracts:

- `packages/protos/media.proto`
- `apps/media-service/src/dto/create-media.dto.ts`
- `apps/media-service/src/dto/list-media.dto.ts`
- `apps/media-service/src/dto/get-media.dto.ts`
- `apps/media-service/src/dto/delete-media.dto.ts`
- `apps/media-service/src/dto/presign-upload.dto.ts`
- `apps/media-service/src/dto/finalize-upload.dto.ts`
- `apps/media-service/src/dto/render-media.dto.ts`
- `apps/media-service/src/dto/protected-feature-media.dto.ts`

Runtime And Storage:

- `apps/media-service/src/config/env.validation.ts`
- `apps/media-service/src/health.controller.ts`
- `apps/media-service/src/prisma.service.ts`
- `apps/media-service/prisma/schema.prisma`
- `apps/media-service/scripts/s3-smoke.mjs`
- `apps/media-service/scripts/presign-put.mjs`

Tests:

- `apps/media-service/test/http/media.http.e2e.spec.ts`
- `apps/media-service/test/media.service.access.spec.ts`
- `apps/media-service/test/grpc/media.e2e.spec.ts`
- `apps/media-service/test/grpc/helpers.ts`
- `apps/media-service/test/setup/wait-for-services.ts`
- `apps/media-service/test/jest.env.ts`
- `apps/media-service/jest.unit.config.ts`

## Known Gaps

- Public `MediaFolder` records and folder action routes are not implemented yet.
- Public delete preview/confirm does not delete explicit folder records yet because `MediaFolder` records are not implemented yet.
- Public delete preview/confirm does not execute oversized plans inline; worker/queue execution is future work.
- Public duplicate handling is service-level, not a DB-level uniqueness/reservation system for concurrent in-flight presigns.
- Strict durable audit storage is not implemented yet; current strict wrappers only emit service logs.
- Strict app-level encryption is not implemented yet; current privacy layer is opaque keys, safe DB filenames, no original filename storage, and short read TTLs.
- Focused protected/strict HTTP and gRPC e2e validation passes against Docker after applying the media context migration.
- Supabase integration needs provider config and operational tests.
- Move/copy/rename/edit filemanager actions are future work.
- Malware/scan lifecycle exists in DB shape but worker pipeline is future work.

## Latest Verification

- `pnpm --filter @nebula/media-service build` passes as of 2026-07-01.
- `pnpm --filter @nebula/media-service test:unit -- --runTestsByPath test/media.service.access.spec.ts` passes with 11 tests as of 2026-07-01.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/http/media.http.e2e.spec.ts --runInBand` passes with 20 tests as of 2026-07-01 when `DATABASE_URL` points at Docker Postgres on `127.0.0.1:15432`.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/grpc/media.e2e.spec.ts --runInBand` passes with 9 tests as of 2026-07-01.
- `pnpm --filter @nebula/media-service lint` is intentionally left for the later `lint:fix` cleanup pass and currently fails on Prettier formatting in modified media files.

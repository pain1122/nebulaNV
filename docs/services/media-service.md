# Media Service

Last reviewed: 2026-08-11

## Purpose

Media-service owns media metadata, upload/finalize/read/delete flows, signed URL generation, access classes, and S3-compatible storage integration.

Media-service is the app privacy authority for media. MinIO, Supabase Storage, and AWS S3 store bytes only.

## Current Storage Model

| Provider            | Role                                            |
| ------------------- | ----------------------------------------------- |
| MinIO               | Current local S3-compatible storage             |
| Supabase Storage S3 | Planned storage/filemanager-compatible provider |
| AWS S3              | Future production object storage                |

The service uses AWS S3 SDK commands against S3-compatible providers.

Important commands currently used:

- `PutObjectCommand` for presigned upload URLs.
- `HeadObjectCommand` during finalize to verify object metadata.
- `GetObjectCommand` for presigned read URLs.
- `DeleteObjectCommand` when deleting stored objects.

## Public Filemanager Lane

This is the current implemented lane.

Rules:

- Administrative HTTP and gRPC media actions are restricted to
  `admin/root-admin`; the explicit `my/protected-library` list/read paths allow
  authenticated users and derive ownership from verified actor context.
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

| Lane        | Listing model                                           | Storage key model                            | Main use                                                   |
| ----------- | ------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------- |
| `PUBLIC`    | Folder-style browse with `folderPath` and `displayName` | Descriptive keys under `MEDIA_PUBLIC_FOLDER` | Product/blog/site/public assets                            |
| `PROTECTED` | Context-scoped list by owner/scope/entity metadata      | Opaque keys under `MEDIA_PRIVATE_FOLDER`     | Private business files tied to a product/order/course/etc. |
| `STRICT`    | Context-scoped list with stricter view/audit rules      | Opaque keys under `MEDIA_PRIVATE_FOLDER`     | Personal/sensitive documents and high-privacy material     |

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
- Delete confirmation tokens are signed with the media-only `MEDIA_DELETE_CONFIRM_SECRET`, expire through `MEDIA_DELETE_CONFIRM_TTL_SECONDS`, and are bound to the same actor user/role that requested the preview.
- Sync delete execution is capped by `MEDIA_SYNC_DELETE_MAX_FILES`; larger plans return a worker/queue warning and are not deleted inline.
- Worker/queue-based retries, oversized delete execution, and stale/orphan reconciliation remain a later lifecycle phase.

Future filemanager actions checklist:

- Create explicit public folder.
- Rename public folder.
- Add a narrow public-file rename endpoint. It changes the admin-facing
  `displayName` and descriptive storage key while preserving the Media ID,
  original bytes, checksum, and content references. It must use verified site
  scope, reject destination collisions, and make the metadata/object move
  recoverable and auditable.
- Move/copy public file.
- Move/copy public folder.
- Add a separate bounded metadata-update contract when its editable fields and
  authorization are frozen.
- Bulk delete selected files/folders.
- Recursive delete non-empty folders through preview/confirm.
- Decide soft-delete retention versus immediate hard-delete per lane.

Rename is not an image-editing endpoint. F5 will separately select the bounded
processor and model immutable derived variants; a transform creates a derived
asset with provenance rather than mutating the original.

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

## CORS And Origin Policy

Status: frozen target policy. The shared exact-origin API CORS and security-header baseline is implemented for directly runnable services. Gateway, storage, and CDN ownership remains deferred to the later foundation phases.

CORS controls which browser origins may read cross-origin responses. It is not authentication, tenant authorization, or protection from mobile/server clients.

| Surface                         | Allowed browser origins                                                            | Credentials                       | Methods                 |
| ------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- | ----------------------- |
| Public CDN/render media         | Any origin (`*`)                                                                   | No                                | `GET`, `HEAD`           |
| Public storefront API           | Verified active origins registered to the owning site                              | No for anonymous reads            | Required public methods |
| Authenticated storefront API    | Verified active origins registered to the owning site                              | Only when cookie auth is used     | Required API methods    |
| Admin API                       | Exact verified admin origins                                                       | Yes when cookie auth is used      | Required CRUD methods   |
| Direct presigned storage upload | Exact verified site/admin upload origins                                           | No browser cookies                | `PUT`, `HEAD`           |
| Protected signed preview        | Exact verified site/admin origins only when JavaScript-readable access is required | No browser cookies                | `GET`, `HEAD`           |
| Strict signed preview           | Exact verified admin origin only when required                                     | No browser cookies                | `GET`, `HEAD`           |
| React Native and server clients | CORS does not apply                                                                | Bearer/application authentication | API policy              |
| Internal HTTP/gRPC services     | No browser CORS                                                                    | Verified S2S                      | Internal contracts      |

Frozen rules:

- Public CDN/render media may return `Access-Control-Allow-Origin: *` only because the response is already approved `PUBLIC`, `READY`, `CLEAN` media. It must never enable credentials.
- Public JSON APIs use verified site origins rather than a global wildcard.
- Credentialed responses return the exact approved origin, include `Vary: Origin`, and never combine credentials with a wildcard origin.
- Cookie-authenticated state changes require CSRF protection in addition to CORS.
- Direct uploads use presigned authorization and `credentials: omit`. Storage CORS permits only required upload headers and exposes only required response metadata such as `ETag` and supported checksum headers.
- Protected media never uses wildcard CORS. Exact site/admin origins are added only when browser JavaScript must read the response.
- Strict media never uses wildcard CORS. Cross-origin browser-readable access is limited to the verified admin origin and remains subject to strict TTL, audit, and access policy.
- Ordinary cross-origin image display does not automatically grant JavaScript readable access; canvas/editor use requires an explicitly approved readable origin.
- React Native, native apps, server clients, and direct navigation are not secured by CORS. They require normal authentication, application registration, tenant/site resolution, rate limits, and resource authorization.
- Custom origins are stored as exact scheme/host/port values tied to a verified active site. Arbitrary wildcard subdomains are not accepted.
- Requests without an `Origin` header are not treated as trusted; they continue through normal authentication and authorization without browser CORS headers.
- Browser clients may use public headers such as `Authorization`, `Content-Type`, `Idempotency-Key`, `X-Request-ID`, and a non-authoritative app identifier where required.
- Browser clients must never receive or submit internal S2S envelope headers such as `x-s2s-signature`, `x-svc`, `x-user-id`, `x-user-role`, `x-tenant-id`, or `x-site-id`.
- Production origins come from verified site/admin configuration. Development origins use explicit environment allowlists; broad localhost-port regexes are not production policy.
- In the target architecture, the public gateway owns API CORS, storage owns presigned-upload CORS, CDN/render delivery owns public-media CORS, and internal services expose no public browser CORS.

Implementation is deliberately deferred:

- F1 removes browser exposure of internal signing/context headers.
- F2 standardizes temporary exact-origin API configuration while services remain directly runnable. Health and public render are excluded from API CORS. The public render route overrides Helmet's resource policy to `cross-origin` so the shared baseline does not block ordinary embedding.
- F3 implements dynamic verified-origin resolution at the gateway.
- F5 implements storage and CDN/render CORS plus the corresponding preflight and denial tests.

## Download Resistance Policy

Status: frozen product and documentation policy.

NebulaNV reduces casual media copying by hiding raw originals, serving approved derived variants through policy-aware render routes, using short-lived signed URLs for protected content, and optionally adding lower-resolution or watermarked previews in a later media-processing phase.

Anything delivered to a browser or native application can ultimately be captured. Screenshots, screen recording, browser developer tools, modified clients, and direct inspection of delivered bytes cannot be eliminated by ordinary UI controls.

Frozen rules:

- §PUBLIC§ media is intentionally viewable and must be treated as capturable after delivery.
- §PROTECTED§ and §STRICT§ access checks decide who may receive media; they cannot guarantee that an authorized recipient will not retain it.
- Public render should serve approved derived variants rather than raw originals when the variant pipeline exists.
- Short-lived signed URLs reduce the reuse window but do not revoke bytes already received by a client.
- Disabling right-click, hiding URLs, overlays, canvas/WebGL rendering, and similar techniques are optional usability friction only.
- These techniques must not be described as DRM, encryption, or a security boundary.
- Watermarks and reduced-resolution previews may discourage redistribution but do not prevent capture.
- Strong playback DRM for licensed streaming content is a separate future module and is not part of the current media render contract.

## Sensitive Preview Policy

Status: frozen target policy. Current signed-read behavior remains usable while F5 adds derived previews, explicit strict-download enforcement, and durable audit storage.

### Protected Preview

- An authorized owner or admin may preview a `PROTECTED` file after the owner, site, scope, entity type, and entity ID checks applicable to the route.
- The temporary foundation behavior may return the full stored file through a signed URL.
- Protected preview uses `MEDIA_SIGNED_READ_TTL_SECONDS`, currently defaulting to 300 seconds.
- Preview is `inline` with `private, no-store`.
- Download is a separate explicit user action and must not be triggered by ordinary preview UI.
- A signed URL limits the access window but cannot revoke bytes already received by an authorized client.

### Strict Preview

- The temporary foundation behavior permits full-file `STRICT` preview only for `admin` or `root-admin`.
- Strict preview uses `MEDIA_STRICT_READ_TTL_SECONDS`, currently defaulting to 30 seconds.
- Preview is `inline` with `private, no-store`.
- Strict download is disabled by default in the target policy. Future full-original download requires a separately authorized and durably audited action.
- Every strict preview attempt must eventually produce a durable audit record containing actor, tenant/site, media, business context, action, result, request ID, application/client context, and timestamp. Signed URLs and secrets must never be stored.
- Current service logs are transitional and do not satisfy the durable audit requirement.

### Derived Preview Trigger

When the F5 variant worker and immutable original/variant model exist:

- protected features may opt into downsized previews according to business risk;
- strict previews default to downsized and/or watermarked derivatives;
- full protected/strict originals remain outside ordinary preview flows;
- full-original strict access requires explicit permission, a dedicated action, and durable audit;
- preview variants retain the owning tenant/site, access class, source relationship, and lifecycle state.

Current implementation mismatch:

- `createReadUrl()` already applies protected/strict TTL and `private, no-store` behavior.
- Current strict read-url routes accept the generic `download=true` option and do not enforce the target default-deny strict-download rule.
- Strict access currently produces service logs only.
- F5 must close these gaps before strict media is described as durably audited or derivative-preview protected.

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

All current media management HTTP actions require `admin/root-admin`. The
`/health` routes and `GET /media/render/:id` are public.

Global admin delete remains available to both `admin` and `root-admin` because admins are the main site maintenance layer. Lane-specific delete wrappers still exist so the filemanager UI can call safer lane-aware endpoints.

Routes:

- `GET /health`, `/health/live`, `/health/ready`
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

- Readiness checks DB, S3-compatible storage, and the S2S replay store;
  liveness is dependency-free.
- HTTP bind resolution is `MEDIA_HTTP_PORT`, then generic `PORT`, then `3007`; gRPC resolves `GRPC_PORT`, then `MEDIA_GRPC_PORT`, then `50058`.
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
- `ListMyProtectedLibrary`
- `PresignPublicLibraryUpload`
- `PresignProtectedLibraryUpload`
- `PresignStrictLibraryUpload`
- `FinalizePublicLibraryUpload`
- `FinalizeProtectedLibraryUpload`
- `FinalizeStrictLibraryUpload`
- `CreatePublicLibraryReadUrl`
- `CreateProtectedLibraryReadUrl`
- `CreateStrictLibraryReadUrl`
- `CreateMyProtectedReadUrl`
- `DeletePublicLibraryById`
- `DeleteProtectedLibraryById`
- `DeleteStrictLibraryById`
- `PreviewPublicLibraryDelete`
- `ConfirmPublicLibraryDelete`

Notes:

- `Create` is kept for compatibility and marked legacy in proto comments.
- `Create` rejects S3-compatible rows; S3 writes must use `PresignUpload` and `FinalizeUpload`.
- `Media`, `CreateReq`, `ListReq`, `PresignUploadReq/Res`, and `FinalizeUploadReq` carry `entityType` and `entityId` for protected/strict business context.
- Generic `PresignUpload`/`FinalizeUpload` remain compatibility paths. Explicit public/protected/strict RPC methods are preferred for backend jobs and filemanager lane calls.
- Protected/strict lane RPCs force private/opaque-key behavior through media-service methods and require owner/scope/entity context.
- `ListMyProtectedLibrary` and `CreateMyProtectedReadUrl` omit owner/access/visibility authority from their wire requests. The controller derives the owner from verified actor context, fixes the lane to `PROTECTED`/`private`, and reuses the service's exact scope/entity checks.
- `PreviewPublicLibraryDelete` and `ConfirmPublicLibraryDelete` reuse the HTTP path's bounded plan, actor/role-bound short-lived token, plan re-check, and synchronous deletion cap. The legacy direct public delete RPC remains for internal compatibility; the F3 gateway manifest exposes only preview/confirm.
- `ListReq.status` and `ListReq.scanStatus` are mapped by `media-grpc.controller.ts`.
- `Ping` is currently used for stronger gRPC readiness in media-service tests.
- Media gRPC methods are protected by S2S/auth guard behavior. Administrative actions require admin/root-admin; the two explicit owned protected methods also allow a user and derive ownership from verified actor context.

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

Folder env rules:

- Folder roots must be relative S3-style paths.
- No leading slash.
- No backslashes.
- No double slashes.
- No `.` or `..` path segments.

Production S3 startup also requires `MEDIA_S3_PUBLIC_ENDPOINT`, because signed
browser URLs cannot use a container-only storage address.

## Current DB Shape

The root Prisma commands include this service after settings-service. Its seed
is intentionally empty because media-service currently requires no base rows.
See [Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

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
- `identityRealmId` and `subjectId` (R2 additive owner coordinate)
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

R2 adds nullable realm/subject columns beside `ownerId`. The migration and
compatibility trigger map identified owners to default realm
`b1000000-0000-4000-8000-000000000001` and the same UUID subject. Anonymous
owners remain all-null; partial, mismatched, wrong-realm, and actorless pairs
reject. Existing owner readers and resource checks stay primary, with no
cross-service foreign key or tenant/site scope added here.
`pnpm db:verify:f4-r2-default-actors` passed populated upgrade, unchanged
business-row snapshots, zero-row backfill rerun, and legacy-write/denial checks.

Docker migration note:

- If Docker tests fail with `The column entityType does not exist in the current database`, apply the media migration against Docker Postgres from the repo root:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:15432/nebula_media?schema=public"
pnpm --filter @nebula/media-service prisma:migrate:deploy
```

- Keep that same `DATABASE_URL` override in the shell when running HTTP e2e against Docker, because the HTTP test file uses Prisma directly for setup/verification.

## Current Tests

HTTP:

- `GET /health/ready` reports DB, S3-compatible storage, and S2S replay checks;
  `/health` is the compatibility alias.
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
- Public render rejects both `PROTECTED` and `STRICT` media before opening a storage stream.

gRPC:

- Presign -> PUT -> FinalizeUpload -> GetById -> List -> DeleteById works with admin S2S metadata.
- `ListReq.status` and `ListReq.scanStatus` filtering is covered in the gRPC flow.
- Direct S3 row creation through `Create` is rejected.
- Missing gRPC signature fails.
- Public filemanager storage key and metadata echoes are asserted.
- Protected/strict filemanager uploads and descriptive protected/strict paths are rejected.
- Lane-specific public/protected/strict presign RPCs are covered for public key shape, required protected context, protected opaque keys, and strict filename privacy.
- Focused controller tests prove owned list/read actor derivation, fixed protected/private lane values, admin-only delete preview/confirm, actor forwarding, response mapping, missing-context denial, and strict DTO rejection.
- The live gRPC suite includes actor-derived owned list/read and two-step public delete scenarios. Their updated execution remains assigned to the later service-stack checkpoint.

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
- `apps/media-service/test/media-grpc-gateway-contracts.unit.spec.ts`
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

- `pnpm --filter @nebula/media-service build` passes as of 2026-08-11.
- The focused gateway-contract and existing access-policy unit suites pass 21 tests as of 2026-08-11; media-service type-check and focused lint also pass.
- `pnpm --filter @nebula/media-service test:unit` passes with 13 tests as of 2026-07-15, including explicit public-render denial for `PROTECTED` and `STRICT` media.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/http/media.http.e2e.spec.ts --runInBand` passes with 20 tests as of 2026-07-01 when `DATABASE_URL` points at Docker Postgres on `127.0.0.1:15432`.
- The HTTP e2e suite now includes a strict-media public-render denial assertion; its updated live run is queued for the later Docker-backed verification step.
- `pnpm --filter @nebula/media-service test:e2e -- --runTestsByPath test/grpc/media.e2e.spec.ts --runInBand` last passed its prior 9-test form on 2026-07-01. The suite now contains 11 scenarios; the two additive F3 scenarios are compiled but await the later service-stack run.
- `pnpm --filter @nebula/media-service lint` is intentionally left for the later `lint:fix` cleanup pass and currently fails on Prettier formatting in modified media files.

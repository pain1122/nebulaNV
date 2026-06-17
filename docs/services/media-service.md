# Media Service

Last reviewed: 2026-06-17

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

## Protected And Strict Lane

This is partially represented in DB/service logic but not fully exposed as feature-specific upload routes yet.

Existing support:

- Prisma enum: `AccessClass = PUBLIC | PROTECTED | STRICT`.
- `createReadUrl()` denies non-public media unless actor is admin/root-admin or owner.
- `STRICT` uses `MEDIA_STRICT_READ_TTL_SECONDS`.
- `PROTECTED` and `STRICT` should use feature-owned flows, not the general filemanager.

Target behavior:

- General admin filemanager should stay focused on public media-library assets.
- Protected/strict uploads should be initiated by specific admin pages/features.
- Sensitive storage keys should be opaque, not human-organized public paths.
- Owner/scope/business context should live in DB metadata.
- Client-side protected reads need dedicated routes/contracts later.

## Current HTTP Contract

All current media HTTP actions require `admin/root-admin`.

Routes:

- `GET /media`
- `GET /media/:id`
- `POST /media`
- `DELETE /media/:id`
- `POST /media/presign`
- `POST /media/finalize`
- `POST /media/:id/read-url`

Notes:

- `POST /media` exists for direct metadata creation and is legacy-compatible.
- `POST /media/presign` returns an upload URL and storage metadata.
- `POST /media/finalize` verifies the uploaded object and creates the DB row.
- `POST /media/:id/read-url` currently sits behind admin/root-admin HTTP access.

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

Notes:

- `Create` is kept for compatibility and marked legacy in proto comments.
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
- `accessClass`
- `sha256`
- `status`
- `scanStatus`
- `scannedAt`
- `scanError`
- `quarantineReason`
- `etag`
- `promotedAt`

Indexes exist for owner, access class, visibility, scope, folder path, display name, lifecycle fields, and promoted time.

## Current Tests

HTTP:

- `POST /media/presign` denies normal user and allows admin.
- Presign uses browser-usable URL and does not expose Docker-only `minio`.
- Public filemanager storage key is `uploads/<folderPath>/<displayName>`.
- Presign -> PUT -> finalize -> get -> list -> folder-filter -> read-url -> delete works for admin.
- Normal user cannot list/get media through current admin endpoints.

gRPC:

- Presign -> PUT -> FinalizeUpload -> GetById -> List -> DeleteById works with admin S2S metadata.
- Missing gRPC signature fails.
- Public filemanager storage key and metadata echoes are asserted.

## Related Files

Core:

- `apps/media-service/src/media.service.ts`
- `apps/media-service/src/media.controller.ts`
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

Runtime And Storage:

- `apps/media-service/src/config/env.validation.ts`
- `apps/media-service/src/health.controller.ts`
- `apps/media-service/src/prisma.service.ts`
- `apps/media-service/prisma/schema.prisma`
- `apps/media-service/scripts/s3-smoke.mjs`
- `apps/media-service/scripts/presign-put.mjs`

Tests:

- `apps/media-service/test/http/media.http.e2e.spec.ts`
- `apps/media-service/test/grpc/media.e2e.spec.ts`
- `apps/media-service/test/grpc/helpers.ts`
- `apps/media-service/test/setup/wait-for-services.ts`
- `apps/media-service/test/jest.env.ts`

## Known Gaps

- `/health` does not currently check DB, MinIO/S3, bucket existence, or signing config.
- General filemanager folder/list/search behavior needs more dedicated tests.
- Protected/strict feature-owned upload routes are not fully designed/exposed yet.
- User/client protected read route is not exposed yet.
- Supabase integration needs provider config and operational tests.
- Move/copy/rename/edit filemanager actions are future work.
- Malware/scan lifecycle exists in DB shape but worker pipeline is future work.

# Current Focus

Last updated: 2026-06-23

## Active Phase

P0-0 Media-service foundation and filemanager safety.

## Current Goal

Freeze the media-service launch contract after the storage-key boundary, public filemanager browse contract, and stronger health checks are verified.

## Recently Completed

- Auth-service launch contract stabilized.
- User-service launch contract stabilized.
- Settings-service launch contract stabilized.
- Media-service MinIO/S3 presign/finalize/read-url smoke path works.
- Docker release image/load/save docs added.
- AI context and testing/health docs started.
- Package docs added for protos, config, clients, and grpc-auth.
- Docker configuration map added at `docs/docker-configs.md`.
- Docs index now points to package notes and Docker config notes.
- Media storage-key boundary enforced for public descriptive keys vs protected/strict opaque keys.
- Media HTTP and gRPC focused e2e tests cover public filemanager paths and protected/strict rejection cases.
- Media admin browse endpoint added with Supabase-style `{ folders, files }` output for public filemanager navigation.
- Media health now checks DB and S3-compatible storage reachability.
- Rebuilt media-service Docker image verified with `/health` reporting DB and MinIO/S3 checks as `ok`.
- Supabase/filemanager policy conclusion report added at `docs/reports/2026-06-23-media-filemanager-and-supabase-conclusion.md`.

## Immediate Next Work

1. Decide whether legacy direct `POST /media` remains admin-only compatibility or moves toward finalize-only writes.
2. Define public file collision behavior for `(scope, folderPath, displayName)` before frontend media picker work grows.
3. Freeze media HTTP contract for health, list/get/create/delete, browse, presign, finalize, and admin read-url behavior.
4. Freeze media gRPC contract for Ping, Create, GetById, List, DeleteById, PresignUpload, and FinalizeUpload.
5. Start the admin media picker/filemanager UI against `GET /media/browse` after the backend contract is accepted.

## Not Now

- Go workers.
- Rust/WebXR optimization.
- Kubernetes manifests.
- Full protected/strict media UX/render flows beyond the opaque-key boundary.
- Streaming pipeline.

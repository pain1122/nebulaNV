# Current Focus

Last updated: 2026-06-17

## Active Phase

P0-0 Media-service foundation and filemanager safety.

## Current Goal

Make media-service fully functional for admin filemanager public assets, S3-compatible storage, Supabase/AWS readiness, and strict separation from future protected/private upload flows.

## Recently Completed

- Auth-service launch contract stabilized.
- User-service launch contract stabilized.
- Settings-service launch contract stabilized.
- Media-service MinIO/S3 presign/finalize/read-url smoke path works.
- Docker release image/load/save docs added.
- AI context and testing/health docs started.

## Immediate Next Work

1. Finish media-service public filemanager contract.
2. Add folder/list/search behavior tests.
3. Add stronger media health checks for DB + MinIO/S3.
4. Decide whether to add gRPC `Ping` to more services.
5. Update TODO based on what is now done.

## Not Now

- Go workers.
- Rust/WebXR optimization.
- Kubernetes manifests.
- Protected/strict media full feature flows.
- Streaming pipeline.

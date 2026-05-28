# Stabilization And Docs Report - 2026-05-28

## Summary

NebulaNV is in a stabilization pass focused on type safety, service startup reliability, and developer onboarding documentation.

The biggest recent improvement is that product-service source errors from unsafe `any` usage were cleaned up and the service build was verified. The backend service startup path was also updated so services wait for their required gRPC dependencies before booting.

## Current Status

- Local backend startup works with `pnpm dev:backend`.
- Product-service source lint errors have been removed.
- Product-service build has been verified after cleanup.
- Remaining product-service lint output is warning-only and mostly test-related.
- Developer documentation now exists under `docs/`.
- Local boot and Docker behavior are documented in `docs/architecture/local-dev-and-docker-boot.md`.

## Documentation Added Or Refreshed

- `AI_CONTEXT.md` refreshed for current project state.
- `TODO.md` converted from stale deadline-only plan into current stabilization board.
- `site essentials.md` refreshed as the launch scope source of truth.
- `Setup.md` refreshed for current local and Docker workflow.
- `.aiignore` expanded to avoid secrets, generated files, logs, and heavy assets in AI context.
- `docs/README.md` remains the developer documentation entry point.
- This report was added under `docs/reports/`.

## Boot And Environment Findings

Current local gRPC startup dependency shape:

```txt
auth-service first
settings/user/media wait for auth
taxonomy waits for auth + settings
blog/product wait for auth + settings + taxonomy
order waits for auth + settings + product
```

Current Docker Compose behavior:

- Default stack includes infrastructure plus core services.
- Full backend requires `docker compose --profile full up -d --build`.
- Docker service-to-service gRPC URLs must use Docker DNS names such as `product-service:50053`, not `127.0.0.1`.

## Git Hygiene

The repo currently has a large dirty worktree from the stabilization pass. That is expected, but it means commits should be intentional.

Useful local/transient artifacts should be kept locally and ignored instead of deleted if they help active development.

Added ignore coverage for:

- `.codex-run-logs/`
- `.codex-web-lint.log`
- local `.env` files
- generated/build/vendor/heavy artifacts

## Remaining Work

Priority order:

1. Verify full workspace build with `pnpm -w build` when ready.
2. Clean remaining product-service test warnings if they hide useful failures.
3. Verify source lint/build state per backend service.
4. Confirm `.env.example` parity across services.
5. Confirm root Prisma scripts cover every Prisma-backed service or document intentional exclusions.
6. Add smoke checks for HTTP health and gRPC readiness.
7. Continue launch feature work from `site essentials.md` P0 items.

## Recommended Verification Commands

```powershell
pnpm -w proto:gen
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm -w build
docker compose config
docker compose --profile full up -d --build
```

## Notes For Future Developers

Start with `docs/README.md`, not scattered source files.

The project has several naming layers: HTTP DTOs, gRPC proto messages, Prisma models, and internal service types. Do not casually rename fields in one layer without checking the others.

Ports and DTO field names should be treated as contracts.

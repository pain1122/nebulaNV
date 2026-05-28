# TODO: NebulaNV Stabilization Board

Last updated: 2026-05-28
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

### P0-1 Contract Freeze and Build Stability

- [ ] Freeze launch API contracts for auth, user club, blog, settings, media, product, taxonomy, and order.
- [ ] Enforce consistent API response/error shape across launch services.
- [ ] Ensure `pnpm -w proto:gen` passes from a clean state.
- [ ] Ensure `pnpm -w build` passes from a clean state.
- [ ] Ensure `docker compose --profile full up -d --build` boots the full backend profile reliably.

### P0-2 Source Lint Cleanup

- [x] Product-service source lint errors removed.
- [ ] Clean remaining product-service test warnings where they hide useful failures.
- [ ] Verify auth-service source lint/build state after recent strict cleanup.
- [ ] Verify media-service source lint/build state after recent strict cleanup.
- [ ] Verify blog-service source lint/build state after recent strict cleanup.
- [ ] Verify order-service source lint/build state after recent strict cleanup.
- [ ] Verify taxonomy-service source lint/build state after recent strict cleanup.
- [ ] Verify user-service source lint/build state after recent strict cleanup.
- [ ] Verify settings-service source lint/build state after recent strict cleanup.

### P0-3 Boot, Docker, and Environment Hygiene

- [x] Document local startup dependency graph and ports.
- [x] Document Docker Compose default vs `full` profile behavior.
- [ ] Confirm all `.env.example` files match required runtime variables.
- [ ] Confirm root Prisma scripts cover every Prisma-backed service or document why they do not.
- [ ] Confirm Dockerfile `EXPOSE` ports match service `.env.example` ports.
- [ ] Add smoke checks for HTTP `/health` and gRPC readiness per service.

### P0-4 Media Security + Access Classes

- [ ] Complete end-to-end `accessClass` wiring (`PUBLIC|PROTECTED|STRICT`) in DTO/proto/controller/service.
- [ ] Confirm storage key strategy is deterministic and class-aware.
- [ ] Validate owner enforcement with auth-service as identity source-of-truth.

### P0-5 Public Website Launch

- [ ] Deliver `SITE-01..07` from `site essentials.md`.
- [ ] Ensure dynamic header/footer/menu render from settings.
- [ ] Ensure static/legal pages are present and linked.

### P0-6 User Club Launch

- [ ] Deliver `USER-01..06`.
- [ ] Validate login/refresh/logout/profile/favorites in real UI flows.

### P0-7 Blog/CMS Launch

- [ ] Deliver `BLOG-01..08`.
- [ ] Ensure slug uniqueness and publish workflow works from admin.

### P0-8 Product Baseline Launch

- [ ] Deliver `PROD-01..04`, `PROD-08..09`, `PROD-11`, `PROD-13`, `PROD-15`, `PROD-17..20`.
- [ ] Confirm taxonomy support for category/tag/brand at API level.
- [ ] Ensure product list/detail is stable for public and admin use.

### P0-9 Settings, SEO, and Index Hygiene

- [ ] Deliver `SET-01..08`.
- [ ] Deliver `SEO-01..12`.
- [ ] Add index hygiene controls for duplicate/parameter/preview/admin URLs.
- [ ] Add redirect management for slug/path changes.
- [ ] Run pre-release crawl and fix canonical/404/duplicate issues.

### P0-10 Admin Panel Core

- [ ] Deliver `ADM-01..09`.
- [ ] Enforce `ADM-11` role boundaries (`admin` vs `editor`).

### P0-11 Release Operations

- [ ] Deliver `OPS-01..06`.
- [ ] Execute release smoke checks for core public and admin flows.
- [ ] Freeze new feature intake after P0 checks begin.

## Priority 1 - Should If Time Holds

- [ ] Product depth: variable products, variants, discount campaign entity, backorders, variant matrix, downloads, draft preview.
- [ ] Preview and audit: page preview workflow, signed preview-token endpoints, admin audit log.

## Priority 2 - Post-Launch

- [ ] Realtime sessions/classroom streaming.
- [ ] Full queue/agent/event-driven overhaul.
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
docker compose --profile full up -d --build
```

Targeted examples:

```powershell
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm --filter @nebula/media-service build
pnpm --filter @nebula/auth-service build
pnpm --filter web build
```

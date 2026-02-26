# TODO: NebulaNV 20-Day Release Plan

Last updated: 2026-02-26
Release target: March 17-18, 2026
Mode: stabilize-and-ship (no architecture overhaul before release)
Source of scope truth: `site essentials.md`

## Completed Baseline (Do Not Reopen)

- [x] Enforce `@Public` flag semantics (`gatewayOnly` / `optionalAuth`)
- [x] Enforce `@RequireUserId` centrally
- [x] Canonicalize S2S `svc` propagation
- [x] Unify S2S payload/signature contract
- [x] Enforce access-vs-refresh token boundaries in auth-service
- [x] Tighten secret boundary policy (`S2S_SECRET` vs `GATEWAY_SECRET`)
- [x] Fix guard wiring mismatches in service bootstraps
- [x] Fix taxonomy-service gRPC bootstrap wiring
- [x] Correct wrong client fallback gRPC ports
- [x] Remove unsafe caller-supplied identity usage in order-service gRPC handlers
- [x] Fix web build blockers (`lord-icon` typing and Next build issues)
- [x] Remove workspace lockfile conflict in web app
- [x] Replace frontend refresh dev stub with real refresh route
- [x] Remove refresh-token persistence from active `localStorage` path
- [x] Dockerize core stack with postgres/redis/minio/minio-init
- [x] Improve Docker build speed with shared backend image flow

## Priority 0 (Must Ship)

### P0-1 Contract Freeze and Build Stability

- [ ] Freeze launch API contracts for: auth, user club, blog, settings, media, product
- [ ] Enforce consistent API response/error shape across launch services
- [ ] Ensure `pnpm -w proto:gen` + `pnpm -w build` pass from clean state
- [ ] Ensure `docker compose up -d --build` boots core launch profile reliably

### P0-2 Media Security + Access Classes

- [ ] Complete end-to-end `accessClass` wiring (`PUBLIC|PROTECTED|STRICT`) in DTO/proto/controller/service
- [ ] Confirm storage key strategy is deterministic and class-aware
- [ ] Validate owner enforcement (`auth-service` identity source-of-truth)

### P0-3 Public Website (Launch)

- [ ] Deliver `SITE-01..07` from `site essentials.md`
- [ ] Ensure dynamic header/footer/menu render from settings
- [ ] Ensure static/legal pages are present and linked

### P0-4 User Club (Launch)

- [ ] Deliver `USER-01..06`
- [ ] Validate login/refresh/logout/profile/favorites in real UI flows

### P0-5 Blog/CMS (Launch)

- [ ] Deliver `BLOG-01..08`
- [ ] Ensure slug uniqueness and publish workflow works from admin

### P0-6 Product Baseline (Launch)

- [ ] Deliver `PROD-01..04`, `PROD-08..09`, `PROD-11`, `PROD-13`, `PROD-15`, `PROD-17..20`
- [ ] Confirm taxonomy support for category/tag/brand at API level
- [ ] Ensure product list/detail is stable for public + admin use

### P0-7 Settings, SEO, and Index Hygiene

- [ ] Deliver `SET-01..08`
- [ ] Deliver `SEO-01..12`
- [ ] Add index hygiene controls for duplicate/parameter/preview/admin URLs
- [ ] Add redirect management for slug/path changes
- [ ] Run pre-release crawl and fix canonical/404/duplicate issues

### P0-8 Admin Panel Core

- [ ] Deliver `ADM-01..09`
- [ ] Enforce `ADM-11` role boundaries (`admin` vs `editor`)

### P0-9 Release Operations

- [ ] Deliver `OPS-01..06`
- [ ] Execute release smoke checks for core public + admin flows
- [ ] Freeze new feature intake after P0 checks begin

## Priority 1 (Should If Time Holds)

### P1-1 Product Depth (Advanced)

- [ ] `PROD-05..07` variable products + variant inheritance/override
- [ ] `PROD-10` discount campaign/event entity
- [ ] `PROD-12` backorders and sold-individually policies
- [ ] `PROD-14` variant matrix generation from attributes
- [ ] `PROD-16` downloadable files/limits/expiry
- [ ] `PROD-21` product draft preview

### P1-2 Preview and Audit

- [ ] `PAGE-05` page preview workflow
- [ ] `API-08` signed preview-token endpoints (blog/page/product)
- [ ] `ADM-10` admin audit log for settings/menu/SEO/product/content edits

## Priority 2 (Post-Launch)

- [ ] Realtime sessions/classroom streaming
- [ ] Full queue/agent/event-driven overhaul
- [ ] Deep analytics and observability stack expansion
- [ ] Large backend architecture rewrites not needed for launch flows

## Verification Commands (Per Batch)

```bash
docker compose config
docker compose up -d --build
pnpm -w proto:gen
pnpm -w build
```

Targeted:

```bash
pnpm --filter @nebula/media-service build
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/auth-service build
pnpm --filter web build
```

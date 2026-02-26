# AI Context: NebulaNV

Last updated: 2026-02-26  
Purpose: fast handoff for new AI sessions with minimal re-discovery and zero setup loss.

## Working Agreement

- Salar prefers manual code edits.
- Assistant should inspect files, then give exact edit instructions.
- Assistant edits code/docs only when explicitly requested.
- No surprise changes; confirm scope before broad edits.

## Current Delivery Mode

- Deadline mode: **20-day stabilize-and-ship** (target release around 2026-03-17/18).
- No backend architecture overhaul before release.
- Scope source of truth: `site essentials.md`.
- Execution board: `TODO.md` (release-priority version).

## Repository Snapshot

- Stack: NestJS microservices + Next.js web app (pnpm monorepo)
- Apps: `auth-service`, `user-service`, `product-service`, `settings-service`, `taxonomy-service`, `order-service`, `blog-service`, `media-service`, `web`
- Packages: `grpc-auth`, `clients`, `config`, `protos`
- Runtime target: Node `22`, pnpm `10.17.1`

## Recently Completed

- Docker baseline stabilized (shared backend Dockerfile flow + compose improvements).
- Core infra in compose: `postgres`, `redis`, `minio`, `minio-init` plus backend services.
- Media access class DB migration created/applied:
  - `apps/media-service/prisma/migrations/20260225135328_add_access_class/migration.sql`
  - `AccessClass` enum + indexed `accessClass` column.
- Media service layer updated for access-class handling:
  - DTOs accept `accessClass` (`PUBLIC|PROTECTED|STRICT`) with normalization.
  - Service resolves class + maps visibility defaults.
  - gRPC/proto extended with `accessClass` fields.
- Planning artifacts updated and committed:
  - `site essentials.md` (full launch inventory + P0/P1/P2 bands)
  - `TODO.md` (20-day release priority board)

## Current Priority (From TODO)

1. P0-1 Contract freeze + build stability.
2. P0-2 Finish/verify media access-class end-to-end behavior.
3. P0-3..P0-8 Launch flows: public site, user club, blog CMS, product baseline, settings/SEO/index hygiene, admin core.
4. P0-9 Release operations and smoke checks.

## SEO/Indexing Focus

- High-priority SEO controls captured in `site essentials.md`:
  - Redirect manager (301/302)
  - Canonical normalization
  - Parameter URL duplicate control
  - Preview/admin/internal `noindex` policies
  - 404/410 hygiene + pre-release crawl audit
- Reason: prior Search Console inflation (many non-indexed duplicate/canonical/404 URLs).

## Immediate Next Session Entry

1. Continue from `TODO.md` Priority 0 items in order.
2. Keep feature work within `site essentials.md` P0-MUST band unless explicitly promoted.
3. Validate frequently with:
   - `pnpm -w proto:gen`
   - `pnpm --filter @nebula/media-service build`
   - `pnpm --filter @nebula/product-service build`
   - `pnpm --filter web build` (as needed)

## Git Hygiene Note

- Avoid `git add .` in this repo.
- Stage intentionally by path.
- Never commit real `.env` secrets.

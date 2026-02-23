# AI Context: NebulaNV

Last updated: 2026-02-23  
Purpose: fast handoff for new AI sessions with minimal re-discovery.

## Working Agreement

- Salar prefers manual code edits.
- Assistant should review files, provide exact edit instructions, and keep explanations short unless deeper detail is requested.
- Assistant may edit docs/checklists only when explicitly asked.
- Do not make surprise code changes.

## Repository Snapshot

- Stack: NestJS microservices + Next.js web app (pnpm monorepo)
- Apps: `auth-service`, `user-service`, `product-service`, `settings-service`, `taxonomy-service`, `order-service`, `blog-service`, `media-service`, `web`
- Packages: `grpc-auth`, `clients`, `config`, `protos`
- Runtime target: Node `22`, pnpm `10.17.1`

## Completed Security Baseline

- `@Public` behavior finalized (`gatewayOnly` / `optionalAuth`)
- `@RequireUserId` enforced centrally
- S2S `svc` propagation and signature contract canonicalized
- Access vs refresh token boundary fixed in auth flow
- Secret boundary split (`S2S_SECRET` vs `GATEWAY_SECRET`)
- Guard/bootstrap wiring mismatches fixed
- Wrong gRPC fallback ports corrected
- Caller-supplied identity removed from order gRPC handlers
- Web refresh flow moved to real route; dev stub removed
- Refresh token no longer persisted in active `localStorage` path

## Docker and Compose Status

- `docker-compose.yml` now includes full backend + `postgres`, `redis`, `minio`, `minio-init`
- Compose validation is clean: `docker compose config` returns without interpolation warnings
- MinIO env interpolation issue resolved (`MINIO_ROOT_PASSWORD` now compose-safe)
- `apps/media-service/.env.example` normalized to valid `.env` syntax
- `.dockerignore` hardened to exclude workspace `node_modules` and `.ignored_*` junctions

## Active Blocker (Current)

- `docker compose up -d --build` fails during Docker build at `pnpm fetch`
- Failing dependency: `grpc-tools` postinstall binary download
- Error class: TLS/network fetch failure to `https://node-precompiled-binaries.grpc.io/...`
- Conclusion: infrastructure/network fragility during image build, not business-logic regression

## Next Session Entry Point

1. Re-run `docker compose up -d --build`
2. If TLS failure repeats, harden Docker install step for flaky binary fetches (retry/timeout/fallback strategy)
3. After successful boot, verify health endpoints on exposed service ports
4. Continue TODO from `Priority 0 -> P0-4`, then proceed by priority

## Git Hygiene Note

- Previous oversized archive upload issue was caused by zipped artifacts in history
- Current local state was cleaned to one commit without archive blobs
- Avoid `git add .` when large local artifacts exist; stage intentionally
- Never commit real `.env` secrets

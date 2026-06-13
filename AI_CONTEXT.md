# AI Context: NebulaNV

Last updated: 2026-06-09
Purpose: fast handoff for new AI or developer sessions with minimal re-discovery and zero setup loss.

## Working Agreement

- Salar is actively learning the project and wants explanations of the syntax, type choices, and service boundaries.
- Assistant may inspect files freely and should explain findings in plain language.
- Assistant edits code/docs when explicitly requested; otherwise prefer exact edit guidance.
- No surprise rewrites. Preserve user work and avoid broad deletes unless the target is clearly generated or temporary.
- Never commit or expose real `.env` secrets. Use `.env.example` and docs for variable names only.

## Current Delivery Mode

- Current mode: Docker-backed stabilization, contract freeze, media security/storage design, and launch-scope cleanup.
- The old 20-day release plan is now historical context; keep its launch scope, but use current docs for daily navigation.
- Scope source of truth: `site essentials.md`.
- Execution board: `TODO.md`.
- Developer docs index: `docs/README.md`.
- Boot/runbook: `docs/architecture/local-dev-and-docker-boot.md`.

## Repository Snapshot

- Stack: NestJS microservices + Next.js web app in a pnpm monorepo.
- Apps: `auth-service`, `user-service`, `product-service`, `settings-service`, `taxonomy-service`, `order-service`, `blog-service`, `media-service`, `web`.
- Packages: `grpc-auth`, `clients`, `config`, `protos`.
- Runtime target: Node `>=22`, pnpm `10.17.1`.
- Default branch: `main`.
- GitHub remote: `origin` -> `https://github.com/pain1122/nebulaNV`.

## Current Service Port Map

| Service | HTTP | gRPC |
| --- | ---: | ---: |
| user-service | 3100 | 50051 |
| auth-service | 3001 | 50052 |
| product-service | 3003 | 50053 |
| settings-service | 3010 | 50054 |
| blog-service | 3004 | 50055 |
| order-service | 3005 | 50056 |
| taxonomy-service | 3006 | 50057 |
| media-service | 3007 | 50058 |

## Recently Completed

- Docker Compose now boots the full backend stack with postgres, redis, minio, and minio-init.
- Backend Docker build flow uses shared `docker/backend.Dockerfile` runtime targets for all backend services.
- Release packaging lane exists for prebuilt images: `docker-compose.release.yml`, `deploy/.env.production.example`, and Docker image save/load PowerShell helpers.
- Auth-service launch HTTP/gRPC contract tests are green.
- User-service launch HTTP/gRPC contract tests are green.
- Settings-service launch HTTP/gRPC contract tests are green.
- Strict ESLint/type-safety cleanup pass across backend services, with product-service source now build-clean.
- Product-service unsafe `any` cleanup in DTO transforms, Prisma mapping, product service logic, taxonomy gRPC mapping, and product gRPC bulk discount request handling.
- Product-service build verified after source lint cleanup.
- Local backend startup dependency order updated with `wait-on` so dependent services wait for required gRPC ports.
- `pnpm dev:backend` verified to start all backend services locally.
- Developer documentation set created under `docs/`, including type-shape, naming, service-boundary, service-note, and local boot docs.
- Logging/observability backlog captured in `TODO.md` for later structured logging and request correlation.

## Current Lint/Test Reality

- Media-service is healthy in Docker, can reach MinIO internally, and has media DB migrations applied.
- Media-service tests currently fail because presigned URLs expose Docker-internal `minio:9000`, which host/browser clients cannot resolve.
- Media-service lint currently has source errors for unused gRPC `call` params in `apps/media-service/src/grpc/media-grpc.controller.ts`.
- Media-service needs split storage endpoints: internal S3 endpoint for service-to-storage traffic and public/client endpoint for browser/Jest uploads.
- Product-service source lint errors have been resolved.
- Remaining product-service lint output is warning-only and mostly in test helpers/specs around untyped HTTP/gRPC test clients.
- Test warning cleanup is useful, but not the same urgency as source errors.

## Media Roadmap Boundary

- Media-service owns policy, records, upload authorization, access classes, storage keys, and media metadata.
- Object storage owns bytes. Current local provider is MinIO; future provider targets are Supabase Storage S3 mode and AWS S3.
- Workers should perform heavy processing later; they should not own media policy.
- Launch-critical media work: presign/finalize contract, public vs internal endpoint split, `PUBLIC|PROTECTED|STRICT` behavior, deterministic key layout, env validation, and storage round-trip tests.
- P1 media work: provider compatibility docs, immutable originals, variants, image/file editing baseline, and asset bundle metadata.
- P2 media work: full 3D showroom, streaming pipeline, Go workers, deeper queue/event architecture.

## Language Placement

- TypeScript/Nest remains the request-path API layer for auth, users, settings, media policy, products, blog, taxonomy, and order flows.
- Go should start as worker services after media contracts are stable: `media-worker-go`, `showroom-asset-worker-go`, then `streaming-worker-go`.
- Rust should be reserved for later performance-critical or security-sensitive components only after worker boundaries are proven.
- Python should be reserved for AI/ML/offline media intelligence, analytics experiments, or tooling where Python libraries are clearly better than TypeScript/Go.

## Immediate Next Session Entry

1. Check `git status --short` before edits because this repo often has a large dirty worktree.
2. Use `docs/README.md` as the first map for architecture and service boundaries.
3. Use `docs/architecture/local-dev-and-docker-boot.md` when changing ports, Docker Compose, `.env.example`, or service startup order.
4. Continue source cleanup before test-warning cleanup when a service still has errors.
5. For media-service, do not add workers before the media-service contract and DB/job model are clear.
6. Validate frequently with targeted commands before broad workspace commands.

## Verification Commands

```powershell
pnpm -w proto:gen
pnpm --filter @nebula/product-service build
pnpm --filter @nebula/product-service exec eslint "{src,apps,libs,test}/**/*.ts"
pnpm dev:backend
```

Broader checks when ready:

```powershell
pnpm -w build
docker compose config
docker compose up -d --build
docker compose ps -a
```

## Git Hygiene Note

- Avoid casual `git add .` unless the user explicitly wants a full project upload.
- Stage intentionally by path when preparing normal commits.
- Keep generated logs, build output, local envs, and secrets out of git.
- Do not delete old user notes or reports unless the user names them directly.

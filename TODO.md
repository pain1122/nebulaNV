# TODO: NebulaNV Hybrid Media Security Plan

Last updated: 2026-02-23  
Goal: ship a stable hybrid model where `auth-service` remains source-of-truth and storage access is defense-in-depth via Supabase policies (with MinIO for local emulation).

## Completed Baseline (Do Not Reopen)

- [x] P0-1 Enforce `@Public` flag semantics (`gatewayOnly` / `optionalAuth`)
- [x] P0-2 Enforce `@RequireUserId` centrally
- [x] P0-3 Canonicalize S2S `svc` propagation
- [x] P0-4 Unify S2S payload/signature contract
- [x] P0-5 Enforce access-vs-refresh token boundaries in auth-service
- [x] P0-6 Tighten secret boundary policy (`S2S_SECRET` vs `GATEWAY_SECRET`)
- [x] P1-7 Fix guard wiring mismatches in service bootstraps
- [x] P1-8 Fix taxonomy-service gRPC bootstrap wiring
- [x] P1-9 Correct wrong client fallback gRPC ports
- [x] P1-10 Remove unsafe caller-supplied identity usage in order-service gRPC handlers
- [x] P1-11 Fix web build blocker (`lord-icon` typing and related TS/build issues)
- [x] P1-12 Remove workspace lockfile conflict in web app
- [x] P2-13 Replace frontend refresh dev stub with real refresh route
- [x] P2-14 Remove refresh-token persistence from active `localStorage` path
- [x] P3-17 Align CI runtime versions with repository engine target

## Priority 0 - Runtime Blockers (Now)

- [x] P0-1 Fix compose validity and startup determinism
  - `minio-data` volume declared
  - `docker compose config` validates with zero warnings/errors
- [x] P0-2 Fix env interpolation hazards
  - Compose interpolation-safe MinIO root password applied
  - No unresolved `${var}` warnings at compose parse time
- [x] P0-3 Normalize media env file syntax
  - `apps/media-service/.env.example` uses valid `KEY=value` syntax
  - Removed invalid spacing in runtime-critical keys
- [ ] P0-4 Validate local full stack boot
  - Run `docker compose up -d --build`
  - Current blocker: `grpc-tools` binary download TLS failure during `pnpm fetch` in Docker build
  - Exit criteria: compose build completes and all service health checks respond

## Priority 1 - Security Architecture Lock-In

- [ ] P1-1 Finalize hybrid auth ownership
  - Keep `auth-service` as identity/role/session source-of-truth
  - Keep storage authorization checks in `media-service` for business rules
  - Use storage-layer policies as a second guardrail
- [ ] P1-2 Define media access classes
  - Introduce explicit object classes: `PUBLIC`, `PROTECTED`, `STRICT`
  - Persist class and owner context on each media object
- [ ] P1-3 Standardize storage key strategy
  - Enforce deterministic object path schema (tenant/user/scope prefixes)
  - Align all access checks and policy conditions to this schema

## Priority 2 - Provider Strategy (Supabase + Local MinIO)

- [ ] P2-1 Provider split by environment
  - Local/dev: MinIO (`http://minio:9000`) through compose
  - Staging/prod: Supabase Storage endpoint
- [ ] P2-2 Keep backend-only storage credentials
  - Ensure privileged keys never reach browser/client bundle
  - Keep signing/upload logic server-side only
- [ ] P2-3 Bucket posture by class
  - `PUBLIC` assets in public bucket/path
  - `PROTECTED`/`STRICT` assets in private bucket/path

## Priority 3 - Access Flow Implementation

- [ ] P3-1 Upload flow hardening
  - Upload intent endpoint with auth/role checks
  - Short-lived signed upload URLs
  - Pending object metadata before finalize
- [ ] P3-2 Download flow by class
  - `PUBLIC`: direct URL
  - `PROTECTED`: short-lived signed read URL after auth check
  - `STRICT`: backend-proxy streaming only (no direct object URL)
- [ ] P3-3 Traceability
  - Log allow/deny decisions for protected/strict paths
  - Include actor, object id/path, policy reason, and timestamp

## Priority 4 - Policy and Operations

- [ ] P4-1 Supabase storage policies for defense-in-depth
  - Create object access policies matching app-level ownership/role model
  - Validate deny-by-default posture on private paths
- [ ] P4-2 Deployment documentation and env matrix
  - Keep `Setup.md` aligned with MinIO local vs Supabase staging/prod modes
  - Document required env variables per environment
- [ ] P4-3 Secrets hygiene
  - Rotate storage credentials after integration
  - Remove temporary defaults used during bootstrap

## Priority 5 - Realtime/Streaming Readiness (Plan Early, Build Safely)

- [ ] P5-1 Freeze realtime architecture decision
  - Choose SFU-first topology (no peer-mesh for classrooms/meetings)
  - Define provider path: managed service vs self-hosted SFU + TURN
- [ ] P5-2 Define room/session authorization model
  - Add explicit roles: `host`, `co-host`, `presenter`, `attendee`, `viewer`
  - Issue short-lived room-scoped tokens from `auth-service`
- [ ] P5-3 Add NAT/firewall reliability baseline
  - Deploy TURN (`coturn`) for non-ideal client networks
  - Define ICE server config policy per environment
- [ ] P5-4 Lock recording security posture
  - Recordings default to `STRICT` class
  - Access only via backend-proxy + audit logs (no direct long-lived URL)
- [ ] P5-5 Design moderation and abuse controls
  - Enforce mute/kick/waiting-room/screen-share permissions
  - Add signaling and room-creation rate limits
- [ ] P5-6 Define retention, deletion, and legal/audit constraints
  - Set retention by room type (meeting/class/presentation)
  - Define deletion workflow and immutable access-log windows

## Priority 6 - Tests (Last)

- [ ] P6-1 Rework integration harness
  - Deterministic service readiness/wait-for-services
  - Remove brittle state coupling between test cases
- [ ] P6-2 Access-class regression tests
  - `PUBLIC` object anonymous access
  - `PROTECTED` object auth-required access
  - `STRICT` object backend-proxy-only access
- [ ] P6-3 Tamper and expiry tests
  - Expired signed URL rejection
  - Path/owner tampering rejection
  - Mis-scoped role access rejection
- [ ] P6-4 Storage policy parity tests
  - App allows + policy denies (must deny)
  - App denies + policy allows (must deny)

## Verification Commands (Per Batch)

```bash
docker compose config
docker compose up -d --build
pnpm -w proto:gen
pnpm -w build
```

Targeted:

```bash
docker build -f apps/auth-service/Dockerfile .
pnpm --filter web build
pnpm --filter @nebula/auth-service build
```

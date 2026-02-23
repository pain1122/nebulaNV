# AI Context: NebulaNV

Last updated: 2026-02-21
Purpose: compact project state to reduce re-discovery and context load.

## Working Agreement

- Salar prefers to apply code edits manually.
- Assistant should review files, give exact edit instructions, and keep explanations brief unless deeper detail is requested.
- Tests can be deferred when explicitly requested.

## Repository Snapshot

- Apps: `auth-service`, `user-service`, `product-service`, `settings-service`, `taxonomy-service`, `order-service`, `blog-service`, `media-service`, `web`
- Packages: `grpc-auth`, `clients`, `config`, `protos`
- Runtime target: Node `>=22`, pnpm `10.17.1`

## Security and Runtime Status

Completed hardening work:
- `@Public` flag semantics enforced in `S2SGuard` (`gatewayOnly` aware path)
- `@RequireUserId` enforced centrally in `GrpcTokenAuthGuard`
- Canonical trusted `svc` propagation aligned across guard chain
- S2S signing/verification contract unified (canonical method/path + derived secret usage)
- Auth token boundary fixed (`ValidateToken` no longer accepts refresh token fallback)
- Secret family boundary split (`S2S_SECRET` vs `GATEWAY_SECRET`, with gateway service-name allowlist)
- Guard wiring fixed where bootstrap used `app.get(S2SGuard)` without provider wiring
- Taxonomy gRPC bootstrap connection/start fixed
- Wrong gRPC fallback ports fixed in affected client modules
- Order gRPC identity no longer trusts caller payload `userId`
- Web build blockers fixed (`lord-icon` typing, client/server boundary issues, lockfile conflict)
- Real web refresh route added; fake refresh stub removed
- Refresh token persistence removed from active `localStorage` path (cookie-backed refresh flow)

Open risks:
- Regression/integration tests are not yet stabilized after hardening changes
- Some legacy gRPC test helpers still use outdated S2S signing patterns
- `docker-compose.yml` still defines a partial backend stack

## Build Status (Latest Known)

- `pnpm --filter @nebula/grpc-auth check-types`: pass
- `pnpm --filter @nebula/clients check-types`: pass
- `pnpm --filter @nebula/auth-service build`: pass
- `pnpm --filter web build`: pass

## CI Alignment

- `.github/workflows/ci.yml` uses Node `22`
- `.github/workflows/proto-gen.yml` uses Node `22` and pnpm `10.17.1`

## Next Focus Order

1. Keep docs aligned with real runtime behavior and compose scope.
2. Expand `docker-compose.yml` to include the missing backend services and redis.
3. Rework auth integration test setup (deterministic service readiness and bootstrap flow).

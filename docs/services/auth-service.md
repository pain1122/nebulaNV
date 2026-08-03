# Auth Service

Last reviewed: 2026-07-21

## Purpose

Auth-service owns authentication, token issuance, refresh-token rotation, logout/revocation behavior, Redis-backed token freshness, and auth-facing gRPC methods.

Auth-service does not own user profile persistence. User-service owns users, roles, password hashes, and profile data. Auth-service owns active refresh-session state in Redis.

## Main Dependencies

- User-service over gRPC for user creation, user lookup, profile reads, and auth-adjacent user data.
- Redis for token version, disabled-user state, refresh sessions, atomic rotation, replay detection, and invalidation.
- `@nebula/grpc-auth` for shared decorators, S2S helpers, global gRPC token auth behavior, and role metadata.

Auth-service has no Prisma schema or service database. It remains in the root
backend inventory for Docker, ports, development, and readiness, while the root
Prisma commands correctly exclude it.

## Downstream Consumers

Other services validate access tokens through auth-service gRPC `ValidateToken`.

Current/expected consumers include:

- user-service
- media-service
- settings-service
- other protected backend services using `GrpcTokenAuthGuard`

Important boundary:

Auth-service provides identity validation. It does not own media permissions, file privacy, storage policy, or media access classes.

## HTTP Contract

Routes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /health`, `/health/live`, `/health/ready`

Behavior:

- Register normalizes email and creates a user through user-service.
- Login validates credentials through user-service, creates an independent session, and returns access/refresh tokens.
- Refresh atomically rotates one session. Reuse of an older token revokes that session family.
- Current-session logout revokes only that session. All-device logout revokes every session and bumps token version.
- `/auth/me` requires a valid access token.

## gRPC Contract

Service: `AuthService`

Methods:

- `ValidateUser`
- `GetTokens`
- `RefreshTokens`
- `ValidateToken`
- `GetProfile`

Important behavior:

- `ValidateToken` returns `{ isValid: false }` for invalid tokens instead of
  throwing. Valid responses include an HMAC-derived `sessionRef` for log
  correlation; the raw JWT session ID is never returned.
- `GetTokens` is a pre-JWT, gateway-only login step. Its `userId` comes from the method-specific request body after S2S verification binds that body to the exact RPC; it is not propagated actor context.
- `GetProfile` allows self access or admin/root-admin access.
- gRPC public methods marked `gatewayOnly` still rely on S2S/gateway guard policy.

## Token Model

Access and refresh tokens include:

- `sub`
- `email`
- `role`
- `tv`
- `sid`
- `jti`
- `typ`

`tv` is the global token version. `sid` identifies one device/session, `jti` identifies one token generation, and `typ` separates access and refresh tokens.

Rules:

- Multiple web/mobile sessions may coexist for one user.
- Refresh rotates only the presenting session through an atomic Redis operation.
- Confirmed replay revokes the affected session.
- Refresh does not bump token version.
- Current-session logout does not affect other sessions.
- All-device/global invalidation revokes all sessions and bumps token version.
- Disabled users fail token validation.
- Stale token versions fail validation.
- Access tokens from revoked sessions fail validation.
- Auth-service Redis session families are the only active refresh-session
  store. User-service has no refresh-token column or token-rotation RPC.

## Redis Model

Keys:

- `auth:user:disabled:<userId>`
- `auth:user:tokenVersion:<userId>`
- `auth:user:<userId>:refreshSession:<sessionId>`
- `auth:user:<userId>:refreshSessions`

Redis behavior:

- Token version initializes lazily to `1`.
- Token version increments on logout-style invalidation.
- Disabled users may expire automatically by TTL.
- Refresh-session TTL follows the refresh-token expiry.
- Rotation compare-and-swap and replay revocation execute atomically in Redis.

## Environment Contract

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are separate, required
  auth-service signing secrets with a minimum length of 32 characters.
- `JWT_ACCESS_EXPIRATION` and `JWT_REFRESH_EXPIRATION` require an explicit unit,
  such as `15m` or `7d`; bare numeric strings are rejected because token
  libraries can interpret them as milliseconds.
- `BCRYPT_ROUNDS` is bounded from 8 through 15.
- `USER_GRPC_URL` and `AUTH_GRPC_URL` use internal `host:port` syntax.

Refresh-session rotation and S2S current/previous key rotation remain separate
mechanisms. JWT signing currently uses one active access secret and one active
refresh secret; there is no JWT `kid`/previous-signing-secret grace mechanism.
The undocumented `JWT_SECRET` fallback is no longer accepted.

## Security Rules

- Never trust spoofed gRPC role metadata over the signed JWT payload.
- Raw `x-user-id`, `x-user-role`, and `x-user-email` metadata never creates actor context.
- Do not use refresh-token storage as frontend session state.
- Keep access token secret and refresh token secret separate.
- Keep gateway/S2S secrets separate from JWT secrets.
- Auth-service validates identity; each downstream service still owns its own resource authorization.
- Profile lookup requires a bearer token before calling user-service. Downstream not-found, unavailable, and permission failures retain their shared translated status; they are not collapsed into unauthenticated or not-found.

## Current Tests

Covered:

- HTTP register/login/refresh/logout/me flow.
- gRPC validateUser, validateToken, getTokens, getProfile.
- Profile lookup distinguishes missing bearer credentials from downstream user-service failures.
- Token tampering rejection.
- Spoofed gRPC role metadata rejection.
- Redis token version behavior.
- Disabled-user behavior.
- Concurrent refresh-token rotation and replay revocation.
- Current-session and all-device logout invalidation.
- Authentication request bodies, headers, query values, tokens, and raw session
  IDs are never logged. Shared request records retain the route template,
  outcome, timing, direct peer IP, request ID, and verified actor/session
  references when available.
- User-service gRPC integration behavior.

## Health

`GET /health/live` is dependency-free liveness. `GET /health/ready` and the
compatibility alias `GET /health` require both auth Redis and the S2S replay
store. A failed dependency returns a sanitized HTTP `503`; user-service is not
called by readiness.

## Known Gaps

- Some test files still carry lint warnings.

## Related Files

Core:

- `apps/auth-service/src/auth/auth.service.ts`
- `apps/auth-service/src/auth/auth.controller.ts`
- `apps/auth-service/src/auth/grpc/grpc-auth.controller.ts`
- `apps/auth-service/src/auth/grpc/grpc-auth.service.ts`
- `apps/auth-service/src/auth/jwt/jwt-auth.guard.ts`
- `apps/auth-service/src/auth/redis/auth-redis.service.ts`

Contracts:

- `packages/protos/auth.proto`
- `apps/auth-service/src/auth/dto/create-user.dto.ts`
- `apps/auth-service/src/auth/dto/login-user.dto.ts`
- `apps/auth-service/src/auth/dto/refresh-token.dto.ts`
- `apps/auth-service/src/auth/dto/logout.dto.ts`

Runtime:

- `apps/auth-service/src/app.module.ts`
- `apps/auth-service/src/config/env.validation.ts`
- `apps/auth-service/src/health.controller.ts`

Tests:

- `apps/auth-service/test/e2e/auth.http-grpc.flow.e2e.spec.ts`
- `apps/auth-service/test/redis/auth.service.security.spec.ts`
- `apps/auth-service/test/redis/jwt-auth.guard.security.spec.ts`
- `apps/auth-service/test/redis/auth-redis.service.spec.ts`

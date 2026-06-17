# Auth Service

Last reviewed: 2026-06-17

## Purpose

Auth-service owns authentication, token issuance, refresh-token rotation, logout/revocation behavior, Redis-backed token freshness, and auth-facing gRPC methods.

Auth-service does not own user profile persistence. User-service owns users, roles, password hashes, refresh-token hash storage, and profile data.

## Main Dependencies

- User-service over gRPC for user creation, user lookup, profile reads, refresh-token hash storage, and auth-adjacent user data.
- Redis for token version, disabled-user state, and logout-style invalidation.
- `@nebula/grpc-auth` for shared decorators, S2S helpers, global gRPC token auth behavior, and role metadata.

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
- `GET /health`

Behavior:

- Register normalizes email and creates a user through user-service.
- Login validates credentials through user-service and returns access/refresh tokens.
- Refresh verifies and rotates refresh tokens.
- Logout clears stored refresh-token hash and bumps token version when appropriate.
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

- `ValidateToken` returns `{ isValid: false }` for invalid tokens instead of throwing.
- `GetTokens` must use guarded context user ID, not trust request body user ID.
- `GetProfile` allows self access or admin/root-admin access.
- gRPC public methods marked `gatewayOnly` still rely on S2S/gateway guard policy.

## Token Model

Access and refresh tokens include:

- `sub`
- `email`
- `role`
- `tv`

`tv` is token version. Redis stores the current token version per user.

Rules:

- Refresh rotates refresh tokens.
- Refresh does not bump token version.
- Logout/global invalidation bumps token version.
- Disabled users fail token validation.
- Stale token versions fail validation.

## Redis Model

Keys:

- `auth:user:disabled:<userId>`
- `auth:user:tokenVersion:<userId>`

Redis behavior:

- Token version initializes lazily to `1`.
- Token version increments on logout-style invalidation.
- Disabled users may expire automatically by TTL.

## Security Rules

- Never trust spoofed gRPC role metadata over the signed JWT payload.
- Do not use refresh-token storage as frontend session state.
- Keep access token secret and refresh token secret separate.
- Keep gateway/S2S secrets separate from JWT secrets.
- Auth-service validates identity; each downstream service still owns its own resource authorization.

## Current Tests

Covered:

- HTTP register/login/refresh/logout/me flow.
- gRPC validateUser, validateToken, getTokens, getProfile.
- Token tampering rejection.
- Spoofed gRPC role metadata rejection.
- Redis token version behavior.
- Disabled-user behavior.
- Refresh-token rotation behavior.
- Logout invalidation behavior.
- User-service gRPC integration behavior.

## Known Gaps

- `/health` only returns process health, not Redis/user-service dependency health.
- Env validation currently validates only a small subset of runtime variables.
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

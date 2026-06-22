
# gRPC Auth Package

## Purpose

`@nebula/grpc-auth` is the shared authentication, authorization, metadata, and S2S security package for NebulaNV backend services.

It provides:

- Role decorators.
- Public/internal endpoint decorators.
- Service provider tokens.
- S2S HMAC signing helpers.
- S2S guard.
- JWT/token auth guard for HTTP and gRPC.
- Metadata builders/resolvers.
- Context user/service helpers.
- gRPC error conversion utilities.

This package is security-critical. Do not treat it as a generic utility package.

## Location

Package root:

`packages/grpc-auth`

Important files:

- `packages/grpc-auth/index.ts`
- `packages/grpc-auth/src/tokens.ts`
- `packages/grpc-auth/src/roles.decorator.ts`
- `packages/grpc-auth/src/public.decorator.ts`
- `packages/grpc-auth/src/s2s.crypto.ts`
- `packages/grpc-auth/src/s2s.ts`
- `packages/grpc-auth/src/s2s.guard.ts`
- `packages/grpc-auth/src/grpc-token-auth.guard.ts`
- `packages/grpc-auth/src/metadata.ts`
- `packages/grpc-auth/src/context.ts`
- `packages/grpc-auth/src/grpc-error.util.ts`

## Package Name

The package is named:

`@nebula/grpc-auth`

It builds to:

`packages/grpc-auth/dist`

The package entrypoint works:

- `main`: `dist/index.js`
- `types`: `dist/index.d.ts`

## Current Consumers

Every backend service currently depends on this package:

- Auth-service
- User-service
- Settings-service
- Product-service
- Blog-service
- Taxonomy-service
- Order-service
- Media-service

`@nebula/clients` also depends on this package for S2S metadata helpers.

## Public Export Surface

`packages/grpc-auth/index.ts` exports:

- Role decorators and role helpers.
- Public/internal decorators.
- DI token constants.
- Metadata/header constants.
- S2S signing/building helpers.
- `S2SGuard`.
- `GrpcTokenAuthGuard`.
- gRPC error utilities.
- Context helpers.

Runtime exports include:

- `GrpcTokenAuthGuard`
- `S2SGuard`
- `Public`
- `InternalOnly`
- `RequireUserId`
- `Roles`
- `RolesAny`
- `RolesAll`
- `RoleAtLeast`
- `hasRoleAtLeast`
- `buildS2SMetadata`
- `authAndS2S`
- `withAuth`
- `withUser`
- `attachUserId`
- `resolveCtxUser`
- `tokenFromMeta`
- `toRpc`
- `wrapGrpc`
- `fromRpcToHttp`
- service DI tokens like `AUTH_SERVICE`, `USER_SERVICE`, `PRODUCT_SERVICE`, `SETTINGS_SERVICE`, `ORDER_SERVICE`, `MEDIA_SERVICE`

## Role Decorators

File:

`packages/grpc-auth/src/roles.decorator.ts`

Roles:

- `user`
- `admin`
- `root-admin`

Hierarchy:

```text
user < admin < root-admin
```

Decorators:

- `@Roles(...)`: legacy/normal any-of role check.
- `@RolesAny(...)`: explicit any-of role check.
- `@RolesAll(...)`: reserved/multi-role style check.
- `@RoleAtLeast(...)`: hierarchy-based minimum role.

Important helper:

```ts
hasRoleAtLeast(actual, requiredMin)
```

## Public/Internal Decorators

File:

`packages/grpc-auth/src/public.decorator.ts`

Decorators:

- `@Public()`
- `@Public({ optionalAuth: true })`
- `@Public({ gatewayOnly: true })`
- `@InternalOnly()`
- `@RequireUserId()`

Meaning:

- `@Public()`: endpoint can be called without JWT, depending on `PUBLIC_MODE`.
- `@Public({ gatewayOnly: true })`: endpoint is public only to a trusted S2S/gateway caller.
- `@InternalOnly()`: requires verified internal service identity.
- `@RequireUserId()`: requires propagated `x-user-id` or an attached context user.

Important: decorators only set metadata. They do not enforce anything without guards.

## Tokens And Env Helpers

File:

`packages/grpc-auth/src/tokens.ts`

Provider tokens:

- `AUTH_SERVICE`
- `USER_SERVICE`
- `PRODUCT_SERVICE`
- `SETTINGS_SERVICE`
- `ORDER_SERVICE`
- `MEDIA_SERVICE`

Service names:

- `AuthService`
- `UserService`
- `ProductService`
- `SettingsService`
- `OrderService`
- `MediaService`

Header constants:

- `authorization`
- `x-gateway-sign`
- `x-svc`
- `x-svc-upstream`
- `x-user-id`

Env helper concepts:

- `GATEWAY_SECRET`
- `GATEWAY_SECRET_OLD`
- `S2S_SECRET`
- `S2S_GATEWAY_SERVICES`
- `S2S_ALLOWED_SERVICES`
- `GATEWAY_HEADER`
- `SERVICE_NAME`
- `SVC_NAME`
- `PUBLIC_MODE`

Public modes:

- `OPEN`
- `OPTIONAL_AUTH`
- `GATEWAY_ONLY`

Important warning:

`PUBLIC_MODE=OPEN` allows everything as guest in `GrpcTokenAuthGuard`. Treat it as development-only unless intentionally proven safe.

## S2S Signing

Files:

- `packages/grpc-auth/src/s2s.crypto.ts`
- `packages/grpc-auth/src/s2s.ts`

S2S signing uses:

- master secret
- service name
- canonical method: `grpc`
- canonical path: `service`
- current minute bucket

The service-specific signing secret is derived with:

```ts
deriveServiceSecret(masterSecret, serviceName)
```

The final signature is:

```ts
signS2S(derivedSecret, svc, "grpc", "service", minuteBucket)
```

`S2SGuard` accepts current and previous minute bucket.

Critical time-window rule:

- Incoming request validity must be evaluated against the receiving server runtime.
- Do not trust client/caller machine time to extend request validity.
- If a timestamp or bucket is ever carried in metadata, it must be clamped to the receiver's clock and a small allowed skew.
- A client or caller freezing its local clock must not create an infinite valid bucket.
- S2S service runtimes still need clock sync because callers sign near the receiver's current minute.

Operational note:

S2S signatures are time-sensitive. Host/container clock drift can cause `invalid_s2s_signature` even when secrets are correct.

## Metadata Helpers

File:

`packages/grpc-auth/src/metadata.ts`

Important helpers:

- `bearer(token)`
- `authAndS2S(token, opts)`
- `withAuth(opts)`
- `attachUserId(md, userId)`
- `tokenFromMeta(meta)`
- `resolveCtxUser(meta, call)`

Important guardrail:

`resolveCtxUser` resolves user context. It does not verify user context.

Only trust `resolveCtxUser` after one of these is true:

- `GrpcTokenAuthGuard` attached a verified JWT user.
- `S2SGuard` verified a trusted internal caller and the endpoint is designed to trust propagated `x-user-id`.
- The caller metadata was produced by a trusted backend path.

Do not treat raw `x-user-id` or `x-user-role` as authenticated by itself.

## S2SGuard

File:

`packages/grpc-auth/src/s2s.guard.ts`

Responsibilities:

- Reads S2S signature metadata.
- Verifies `x-svc`.
- Checks optional allowed-service list.
- Chooses gateway secrets for gateway callers.
- Chooses interservice secrets for normal service callers.
- Accepts current and previous minute bucket.
- Attaches verified service identity to request/RPC metadata/context as `.svc`.

Key metadata:

- `x-svc`
- `x-gateway-sign` or configured `GATEWAY_HEADER`

Required secrets:

- Gateway caller path uses `GATEWAY_SECRET` / `GATEWAY_SECRET_OLD`.
- Interservice path uses `S2S_SECRET` / `S2S_SECRET_OLD`.

Important:

`S2SGuard` is the only place S2S signature validation should live. Do not duplicate S2S verification in controllers or other guards.

## GrpcTokenAuthGuard

File:

`packages/grpc-auth/src/grpc-token-auth.guard.ts`

Responsibilities:

- Extract Bearer token from HTTP headers or gRPC metadata.
- Locally verify JWT signature if `JWT_ACCESS_SECRET` exists.
- Always call auth-service `ValidateToken` after local verification.
- Attach verified user context.
- Enforce roles.
- Enforce `@InternalOnly`.
- Enforce `@RequireUserId`.
- Handle public endpoint behavior according to `PUBLIC_MODE`.

Policy order in current code:

1. `PUBLIC_MODE=OPEN` allows everything as guest.
2. `@InternalOnly` requires `.svc`.
3. If JWT is present, validate token and enforce roles.
4. If endpoint is public, allow according to public mode.
5. Otherwise reject.

Important:

`GrpcTokenAuthGuard` does not validate S2S signatures. It trusts `.svc` only if `S2SGuard` already attached it.

Therefore guard ordering matters:

```text
S2SGuard -> GrpcTokenAuthGuard
```

## Error Utilities

File:

`packages/grpc-auth/src/grpc-error.util.ts`

Important helpers:

- `toRpc(code, message)`
- `fromRpcToHttp(err)`
- `wrapGrpc(promise)`

`toRpc` creates `RpcException` with gRPC status code.

`fromRpcToHttp` maps gRPC status codes to Nest HTTP exceptions.

Useful mappings:

- `UNAUTHENTICATED` -> `UnauthorizedException`
- `PERMISSION_DENIED` -> `ForbiddenException`
- `NOT_FOUND` -> `NotFoundException`
- `ALREADY_EXISTS` / `ABORTED` -> `ConflictException`
- `INVALID_ARGUMENT` / `FAILED_PRECONDITION` / `OUT_OF_RANGE` -> `BadRequestException`
- `UNAVAILABLE` -> `ServiceUnavailableException`

## Current Service Wiring Pattern

Services use this package in several ways:

- HTTP controllers use `@Public` and `@Roles`.
- gRPC controllers use `@Public`, `@Roles`, `@RequireUserId`, and `resolveCtxUser`.
- App modules provide `GrpcTokenAuthGuard` as an `APP_GUARD`.
- Some services provide `S2SGuard` as an `APP_GUARD`.
- Some gRPC controllers use `@UseGuards(S2SGuard, GrpcTokenAuthGuard)`.
- Some hybrid app `main.ts` files call `micro.useGlobalGuards(app.get(S2SGuard), app.get(GrpcTokenAuthGuard))`.

Known current examples:

- Product-service and blog-service explicitly attach gRPC guards with `micro.useGlobalGuards(...)`.
- User-service and settings-service gRPC controllers explicitly use `@UseGuards(S2SGuard, GrpcTokenAuthGuard)`.
- Auth-service is special and also has its own local `JwtAuthGuard`.
- Order/media/taxonomy gRPC guard wiring should be reviewed before assuming full gRPC parity.

Important Nest hybrid warning:

Do not assume HTTP `APP_GUARD` automatically protects connected gRPC microservices unless the service explicitly wires guards for the microservice or uses confirmed inheritance behavior.

## Auth-Service Special Case

Auth-service both consumes and provides auth.

It uses `@nebula/grpc-auth` decorators and tokens, but it also has a service-local `JwtAuthGuard`.

Current special behavior:

- `AuthGrpcController.GetProfile` uses service-local `JwtAuthGuard`.
- Auth-service `ValidateToken` is the authority used by `GrpcTokenAuthGuard`.
- Other services call auth-service to validate JWT freshness/revocation.

Do not blindly replace auth-service's local guard behavior with `GrpcTokenAuthGuard` without checking recursion and bootstrap concerns.

## Common Correct Patterns

For internal service calls:

```ts
const md = buildS2SMetadata({ serviceName: process.env.SVC_NAME });
```

For internal service calls with user context:

```ts
const md = buildS2SMetadata({ serviceName: process.env.SVC_NAME });
md.set("x-user-id", userId);
```

For calls requiring a JWT plus S2S:

```ts
const md = authAndS2S(accessToken, { userId });
```

For controller-side gRPC auth:

```ts
@UseGuards(S2SGuard, GrpcTokenAuthGuard)
@Controller()
export class SomeGrpcController {}
```

or attach guards to the microservice:

```ts
micro.useGlobalGuards(app.get(S2SGuard), app.get(GrpcTokenAuthGuard));
```

## Current Validation Status

Commands checked:

```powershell
pnpm --filter @nebula/grpc-auth build
pnpm --filter @nebula/grpc-auth check-types
pnpm --filter @nebula/grpc-auth lint
```

Current status:

- Build passes.
- Type-check passes.
- Runtime package export works.
- Lint fails due Prettier formatting in `src/grpc-token-auth.guard.ts`.

Lint failure is formatting-only from the current output, not a type failure.

## Known Watch Points

- `GrpcTokenAuthGuard` trusts `.svc`; only `S2SGuard` should attach verified `.svc`.
- `resolveCtxUser` resolves context but does not prove authenticity.
- Raw `x-user-id` and `x-user-role` metadata can be spoofed if used without verified S2S/JWT context.
- `PUBLIC_MODE=OPEN` bypasses normal auth and role enforcement by design.
- S2S signatures rely on receiving server time and small skew tolerance. Clock drift must be visible, not silently accepted.
- Request validity windows must not be extended from client/caller supplied time.
- Service-local guard wiring is not uniform across all services.
- gRPC endpoints must be checked for actual guard application, not just decorators.
- `authAndS2S` logs metadata keys with `console.debug`; keep an eye on noisy test/dev output.
- `mergeMetadata` uses `internalRepr` when available; this is a pragmatic grpc-js detail, not a stable public API.
- `getSignedMetadata` exists in `@nebula/clients`, but most client wrappers use `buildS2SMetadata` directly.
- Auth-service has its own `JwtAuthGuard`; do not assume all auth goes through `GrpcTokenAuthGuard`.

## Future Refinement

Keep this package focused on shared auth/S2S primitives.

Good future work:

- Standardize gRPC guard wiring across all services.
- Add focused tests for `S2SGuard`.
- Add focused tests for `GrpcTokenAuthGuard`.
- Add server-runtime-authoritative request time validation checks and clock-drift health visibility.
- Decide whether `GATEWAY_SECRET` and `S2S_SECRET` remain separate concepts.
- Reduce debug logging in metadata helpers if it becomes noisy.
- Fix `grpc-token-auth.guard.ts` formatting so package lint passes.

Do not put business authorization policy here. Service-specific ownership checks must stay in the owning service.

# gRPC Auth Package

`@nebula/grpc-auth` owns NebulaNV's shared gRPC service identity, JWT/role guard, verified context, and metadata primitives.

The canonical S2S protocol and operating rules are documented in [S2S Security Contract](../architecture/s2s-security-contract.md).

The trusted user/service context rules are documented in [Actor Context Contract](../architecture/actor-context-contract.md).

## Main Exports

- `GRPC_SECURITY_PROVIDERS`
- `grpcS2SServerChannelOptions(...)`
- `applyGrpcSecurity(...)`
- `startSecuredGrpc(...)`
- `GrpcErrorFilter`
- `toGrpcBoundaryException(...)`
- `fromRpcToHttp(...)`
- `wrapGrpc(...)`
- `S2SGuard`
- `GrpcTokenAuthGuard`
- `S2SReplayStore`
- `s2sEnvSchema(serviceName)`
- `buildGrpcS2SMetadata(...)`
- `mergeSignedMetadata(...)`
- `authAndS2S(...)`
- `Public`, `InternalOnly`, `AllowedS2SCallers`, `RequireUserId`
- role decorators and context helpers

## Enforced Rules

- Every unary gRPC method requires a valid v2 S2S envelope, including methods marked `@Public()`.
- Signatures bind caller kind/name, target, RPC path, protobuf request digest, timestamp, nonce, request ID, and key ID.
- Gateway and service keys are separate pairwise trust maps.
- Redis provides atomic replay claims; production fails closed without it.
- Current and time-limited previous inbound keys support controlled rotation.
- Route allowlists and gateway-only/internal-only caller kinds are enforced after signature verification.
- `PUBLIC_MODE=OPEN` affects only explicitly public routes; it cannot open private/internal routes.
- `S2SGuard` alone attaches only verified service identity (`svc`, `svcKind`, and `requestId`).
- A JWT guard attaches `user` only after token verification. Auth-service also
  supplies a non-secret HMAC `sessionRef`; guards propagate it through the same
  verified context and never expose the raw JWT session ID.
- `resolveCtxUser()` and `@RequireUserId()` never read raw `x-user-*` headers or metadata.
- `S2SReplayStore.checkReadiness()` reuses its owned Redis client in Redis mode
  and succeeds without creating Redis in test-only memory mode.
- `S2SReplayStore` closes its owned Redis client during Nest shutdown.

## Service Integration

Each service module provides `...GRPC_SECURITY_PROVIDERS` and registers HTTP
global guards in this order: `ThrottlerGuard`, then the existing
`GrpcTokenAuthGuard` provider. This HTTP order is separate from gRPC security.
The S2S guard is installed on the deferred gRPC listener by
`startSecuredGrpc`, where it always runs before token authentication; browsers
never receive S2S credentials.

The common service startup order is app creation, shutdown-hook registration,
request logging, HTTP validation, security headers, optional service-owned
middleware, CORS, bind resolution, secured gRPC connection/start, HTTP listen,
then ready logging. Compression, bind hosts, and media public-render policy may
remain service-owned; do not replace the eight bootstraps with one oversized
helper.

Each service-local Joi schema composes `s2sEnvSchema("service-name")`. Listener startup repeats deep validation before accepting traffic.

## gRPC Validation Contract

`createGrpcValidationPipe()` is separate from the HTTP factory. It rejects
missing, unknown, and incorrectly typed fields on runtime DTO classes, keeps
implicit conversion disabled, and maps validation failures to gRPC
`INVALID_ARGUMENT` rather than an HTTP exception.

Generated proto TypeScript interfaces do not provide runtime class metadata;
Nest sees those parameters as `Object`. Adding a validation pipe to such a
handler does not make the generated interface runtime-validatable. Keep the
existing operation and domain checks for generated requests instead of cloning
every proto message into a second DTO hierarchy. Use the shared pipe only when
the handler already accepts a real DTO class with validation metadata.

## Error Translation

`startSecuredGrpc(...)` installs the shared gRPC error filter for all eight services. Services must not add competing global mappers.

The filter preserves explicit `RpcException` values from guards, validation, and controllers. Nest HTTP exceptions thrown by domain services use this transport mapping:

- `400` and `422` -> `INVALID_ARGUMENT`
- `401` -> `UNAUTHENTICATED`
- `403` -> `PERMISSION_DENIED`
- `404` -> `NOT_FOUND`
- `408` -> `DEADLINE_EXCEEDED`
- `409` -> `ALREADY_EXISTS`
- `429` -> `RESOURCE_EXHAUSTED`
- `501` -> `UNIMPLEMENTED`
- `503` -> `UNAVAILABLE`

Unexpected errors and other internal HTTP errors become `INTERNAL` with the public message `internal_error`. Their original messages are not returned to callers.

Use `wrapGrpc(...)` around downstream unary promises at HTTP/domain facades. It applies the existing reverse mapping back to Nest HTTP exceptions. Prisma errors remain owned by the service that understands the operation; this package does not interpret Prisma codes.

## Outbound Integration

Callers must sign the exact generated RPC definition and request for every call. Never reuse signed metadata across calls or retries. Use `mergeSignedMetadata` when Bearer or application metadata is also required; reserved envelope fields always come from the fresh signer.

## Verification

```powershell
pnpm --filter @nebula/grpc-auth test
pnpm --filter @nebula/grpc-auth check-types
pnpm --filter @nebula/grpc-auth build
```

The service-wiring test reads the canonical `nebula.backendServices` inventory
from the root `package.json` and verifies all eight service integrations without
copying another service list into this package.

Streaming signing is not implemented. Adding a streaming RPC requires a separate framed-message signing design; it must not bypass this guard.

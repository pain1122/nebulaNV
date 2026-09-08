# gRPC Auth Package

`@nebula/grpc-auth` owns NebulaNV's shared gRPC service identity, JWT/role guard, verified context, and metadata primitives.

The canonical S2S protocol and operating rules are documented in [S2S Security Contract](../architecture/s2s-security-contract.md).

The trusted user/service context rules are documented in [Actor Context Contract](../architecture/actor-context-contract.md).

The implemented F4 default-realm context-v2 and receiver-first compatibility
decision is recorded in
[ADR-0010](../architecture/decisions/0010-f4-signed-context-compatibility.md).
Its authority freshness, cache-integrity, outage, and key-compromise behavior is
frozen by
[ADR-0012](../architecture/decisions/0012-f4-failure-freshness-audit-and-recovery.md).
The minimum Batch 3 receiver prerequisite is now implemented only for strict
context-v2 `RESOLUTION/AUTHORITY`. Under the original plan, complete v2 stages,
`AUTHORIZED` writers/receivers, and operation-slice cutover remained Batch 4.
ADR-0014 now freezes that receiver as compatibility evidence and authorizes no
new v2 writer. ADR-0015 closes Batch 1R and orders realm-aware context-v3 work:
dormant receivers at R5, the controlled default-realm writer/session cohort at
R6, and persistent-registry expansion in Batch 4.

[ADR-0014](../architecture/decisions/0014-f4-customer-identity-realms-and-federation.md)
freezes additive context v3 for realm-qualified subjects and exact application
audiences. Existing v2 parsing and its `sr1_`/`ar1_` meanings do not change;
realm traffic requires new realm/application-keyed `sr2_` session and `ar2_`
decision references, receiver-first rollout, exact-field rejection, and no
v2 fallback after a v3 denial. This is target behavior, not current package
behavior.

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
- `gatewayOutboundEnvSchema(requiredTargets?)`
- `assertGatewayOutboundRuntimeConfiguration(requiredTargets?)`
- `buildGrpcS2SMetadata(...)`
- `buildGatewayGrpcS2SMetadata(...)`
- `mergeSignedMetadata(...)`
- `authAndS2S(...)`
- `gatewayAuthAndS2S(...)`
- `createVerifiedServiceDownstreamContext(...)`
- `Public`, `GatewayOnly`, `InternalOnly`, `AllowedS2SCallers`,
  `AllowedS2SIdentities`, `RequireUserId`,
  `RequireS2SAuthorityResolution`
- role decorators and context helpers

## Enforced Rules

- Every unary gRPC method requires a valid S2S envelope, including methods marked `@Public()`.
- Context-free ordinary-service calls retain the byte-compatible v2 envelope.
  Gateway calls and service hops carrying verified ingress context use v3.
- Signatures bind caller kind/name, target, RPC path, protobuf request digest, timestamp, nonce, request ID, and key ID.
- V3 additionally binds the SHA-256 digest of one canonical, bounded application,
  tenant, site, channel, and optional actor assertion context.
- Gateway and service keys are separate pairwise trust maps.
- Redis provides atomic replay claims; production fails closed without it.
- Current and time-limited previous inbound keys support controlled rotation.
- Route allowlists and gateway-only/internal-only caller kinds are enforced
  after signature verification. `AllowedS2SIdentities` provides an exact
  caller-kind plus caller-name allowlist for the rare mixed route; empty,
  invalid, and duplicate policies fail at decorator creation.
- `GatewayOnly()` constrains a private, user-authenticated route to gateway kind
  without making the JWT optional. `Public({ gatewayOnly: true })` remains the
  anonymous/optional-user gateway form.
- `PUBLIC_MODE=OPEN` affects only explicitly public routes; it cannot open private/internal routes.
- `@OperationalHealth()` is the only unsigned HTTP exception to
  `GATEWAY_ONLY`. It marks sanitized health controllers and is never an RPC
  bypass; ordinary public/private domain routes retain their normal policy.
- `S2SGuard` attaches verified service identity (`svc`, `svcKind`, and
  `requestId`). After a valid v3 envelope it separately attaches
  either legacy `requestContext` or the exact resolver-only
  `resolutionContext`, plus `signedActor`; it never turns the signed actor
  assertion into authoritative `user` identity.
- A JWT guard attaches `user` only after token verification. Auth-service also
  supplies a non-secret, versioned `sr1_...` HMAC `sessionRef`; the prefix
  guarantees the signed-context safe-identifier grammar even when the
  base64url digest starts with `-` or `_`. Guards propagate it through the same
  verified context and never expose the raw JWT session ID.
- For gateway/v3 traffic, the JWT guard requires the signed actor assertion and
  forwarded bearer to appear together, asks auth-service for current truth,
  and requires exact `userId`/`sessionRef` agreement before attaching `user`.
  Context v1 also requires its legacy role to match; context v2 deliberately
  carries no global role and cannot use one as scoped authority. Anonymous
  legacy v3 traffic has neither.
- Context v2 is currently admitted only by
  `RequireS2SAuthorityResolution()`, with purpose `RESOLUTION`, stage
  `AUTHORITY`, and an actor. Legacy/undeclared routes reject v2 and that route
  rejects v1. No writer is enabled by this receiver support.
- Legacy service-v2 bearer calls remain compatible during receiver-first
  migration. They still receive authoritative auth-service validation but do
  not gain a signed application/site context.
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
remain service-owned; do not replace the nine bootstraps with one oversized
helper.

Each service-local Joi schema composes `s2sEnvSchema("service-name")`. Listener startup repeats deep validation before accepting traffic.

The HTTP-only gateway instead composes `gatewayOutboundEnvSchema()`. It
requires exact `GATEWAY_OUTBOUND_KEYS` coverage for the eight declared target
services and rejects undeclared targets or reuse of one secret across pairwise
edges. Gateway startup repeats that validation before opening its HTTP
listener. The gateway schema deliberately does not require service inbound
maps, a replay store, receiver Redis configuration, `PUBLIC_MODE`, or a gRPC
listener because the gateway owns none of those receiver responsibilities.

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

`startSecuredGrpc(...)` installs the shared gRPC error filter for all nine hybrid services. Services must not add competing global mappers.

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

Callers must sign the exact generated RPC definition and request for every call. Never reuse signed metadata across calls or retries. Use `mergeSignedMetadata` for existing ordinary-service metadata; reserved envelope and context fields always come from the fresh signer.

Gateway callers use `gatewayAuthAndS2S(...)`. It accepts only a verified actor
bearer plus explicit trusted signing inputs and therefore cannot copy arbitrary
inbound HTTP headers into downstream metadata. `x-s2s-context` and
`x-s2s-context-sha256` are reserved, single-value carriers. Their decoded JSON
is canonical, exact-schema, unpadded base64url, and at most 1024 bytes.
Context v2 uses a separate exact canonical shape and a 2048-byte limit; the
decoder enforces the version-specific bound after reading the version.

The HTTP-only gateway does not reuse `GrpcTokenAuthGuard`, because that guard's
Auth lookup intentionally signs as its ordinary service caller. The gateway's
own resolver calls the typed Auth wrapper with `kind=gateway`, the pairwise
Auth key, registry-derived context, and ingress request ID; it treats the JWT
as opaque and creates actor state only from `ValidateToken` truth.

For a causal service-to-service hop, use
`createVerifiedServiceDownstreamContext(metadata, call)` after the inbound
guards. It projects only guard-attached request/application/actor/user state
and the verified bearer into fresh outbound inputs. It rejects inconsistent or
partial carriers, explicitly refuses every `RESOLUTION` context, and never
copies arbitrary inbound metadata. The result omits
caller kind/name and a target key deliberately: the receiving service's typed
client wrapper resolves that hop's own service identity and pairwise target
key. Context-free bootstrap jobs keep using the ordinary v2 wrapper defaults.

Request identity follows causal provenance: gateway ingress owns a new request
ID; `createVerifiedServiceDownstreamContext(...)` accepts only the guard-attached
ID/context and preserves that ID on a nested hop. The next typed wrapper still
creates a fresh timestamp, nonce, caller signature, and pairwise target proof.
Raw metadata cannot replace the preserved request ID or force gateway identity.

## Verification

```powershell
pnpm --filter @nebula/grpc-auth test
pnpm --filter @nebula/grpc-auth check-types
pnpm --filter @nebula/grpc-auth build
```

The service-wiring test reads the canonical `nebula.backendServices` inventory
from the root `package.json`, selects its nine `http-grpc` runtimes, and
verifies those service integrations without copying another service list or
treating the HTTP-only gateway as a gRPC server.

Streaming signing is not implemented. Adding a streaming RPC requires a separate framed-message signing design; it must not bypass this guard.

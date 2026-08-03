# Actor Context Contract

This document records the implemented trust boundary for service and user identity. The broader tenant/site/app context remains target architecture.

## Trusted Context Fields

| Context field | Meaning | May be created by | Required proof |
|---|---|---|---|
| `svc` | Calling service or gateway name | `S2SGuard` | Valid request-bound S2S v2 envelope |
| `svcKind` | `service` or `gateway` | `S2SGuard` | Valid request-bound S2S v2 envelope |
| `requestId` | Signed internal request identity | `S2SGuard` | Valid request-bound S2S v2 envelope |
| `user.userId` | Authenticated human actor | JWT guard | Valid access JWT and the guard's configured validation path |
| `user.role` | Authenticated actor role | JWT guard | Same verified token result as `userId` |
| `user.email` | Optional authenticated actor email | JWT guard | Same verified token result as `userId` |

Raw `x-user-id`, `x-user-role`, and `x-user-email` values are application input, not trusted context. `resolveCtxUser()` reads only the `user` object attached by a verified guard. `@RequireUserId()` checks that verified object and cannot manufacture identity from headers or gRPC metadata.

S2S authentication proves which workload made a request. It does not prove which human user acted. A service signature therefore cannot turn arbitrary user metadata into an actor.

## Identity Separation

- **Actor**: authenticated human performing the operation.
- **Service**: verified gateway or backend workload carrying out the call.
- **Target**: user or resource the operation addresses.
- **Owner**: authoritative owner stored with or resolved for the resource.
- **Tenant/site/app**: future verified scope; not currently implemented as trusted shared context.

These identities may have the same value in a particular operation, but code must not assume that. Parent administration will especially require separate actor and target tenant/site fields.

## Supported Request Patterns

### User operation

Send a fresh S2S envelope and the user's Bearer access token. `S2SGuard` attaches service context; the JWT guard validates the token and attaches actor context. Resource ownership is checked separately by the owning service.

### Pre-JWT login operation

`AuthService.GetTokens` has no actor yet. It accepts `userId` only from its method-specific request body after `S2SGuard` verifies a gateway signature bound to that exact RPC and protobuf body. This is not general user propagation.

### Internal auth maintenance

User-service methods such as `CreateUser` and `GetUserWithHash` accept targets
in their signed request bodies. They require `@InternalOnly()` and
`@AllowedS2SCallers('auth-service')`. They do not invent a human actor.

### Service-only operation

Background initialization and maintenance must use a narrowly authorized, method-specific service contract. They must not use fake users such as `system-initializer`.

The product and blog taxonomy initializers use narrowly scoped service-only
settings and taxonomy bootstrap contracts. They do not send or manufacture a
human identity. The two initializer classes remain owned by their respective
services even though they reuse neutral generated contracts and clients.

## Future Tenant/Site/App Context

Tenant, site, channel, and application fields must be added only with explicit provenance rules. A raw header is insufficient. The gateway must derive scope from verified application identity, domain/site mapping, membership, and token claims; internal services must receive it through an integrity-protected contract and still enforce resource scope.

## Verification

`packages/grpc-auth/test/actor-context.security.spec.ts` proves:

- raw gRPC actor metadata does not resolve as a user;
- a user-required gRPC route rejects raw actor metadata;
- a user-required HTTP route rejects raw actor headers;
- verified token results override conflicting forged metadata.

Run:

```powershell
pnpm --filter @nebula/grpc-auth test
```

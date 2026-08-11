# Actor Context Contract

This document records the implemented trust boundary for service, signed
request context, and user identity. Persistent tenant membership and domain
scope remain F4 target architecture.

## Trusted Context Fields

| Context field    | Meaning                                          | May be created by | Required proof                                                         |
| ---------------- | ------------------------------------------------ | ----------------- | ---------------------------------------------------------------------- |
| `svc`            | Calling service or gateway name                  | `S2SGuard`        | Valid request-bound S2S v2/v3 envelope                                 |
| `svcKind`        | `service` or `gateway`                           | `S2SGuard`        | Valid request-bound S2S v2/v3 envelope                                 |
| `requestId`      | Signed internal request identity                 | `S2SGuard`        | Valid request-bound S2S v2/v3 envelope                                 |
| `requestContext` | Application, tenant, site, and channel assertion | `S2SGuard`        | Valid canonical S2S v3 context and signature                           |
| `signedActor`    | Workload-forwarded actor consistency assertion   | `S2SGuard`        | Valid canonical S2S v3 context and signature; not human identity proof |
| `user.userId`    | Authenticated human actor                        | JWT guard         | Valid access JWT and the guard's configured validation path            |
| `user.role`      | Authenticated actor role                         | JWT guard         | Same verified token result as `userId`                                 |
| `user.email`     | Optional authenticated actor email               | JWT guard         | Same verified token result as `userId`                                 |

Raw `x-user-id`, `x-user-role`, and `x-user-email` values are application input, not trusted context. `resolveCtxUser()` reads only the `user` object attached by a verified guard. `@RequireUserId()` checks that verified object and cannot manufacture identity from headers or gRPC metadata.

S2S authentication proves which workload made a request. It does not prove which human user acted. A service signature therefore cannot turn arbitrary user metadata into an actor.

The receiver-first v3 foundation attaches `signedActor` separately from
`user`. For gateway and v3 traffic, assertion and Bearer must appear together;
the downstream JWT validation result must agree exactly on `userId`, `role`,
and `sessionRef` before `user` is attached. Anonymous v3 calls carry neither.
Legacy service-v2 Bearer calls retain auth-service validation during migration
but cannot claim signed application/site context.

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

`AuthService.GetTokens` has no actor yet. It accepts `userId` only from its method-specific request body after `S2SGuard` verifies a gateway v3 signature bound to that exact RPC, protobuf body, and registry-derived request context. This is not general user propagation.

`AuthService.Logout` is the inverse: it accepts no body user ID. Auth-service
validates the forwarded access Bearer and derives the actor and current raw
session ID from that authoritative result. A supplied refresh token can confirm
only that same user/session; it cannot select another session.

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

## Tenant/Site/App Context Boundary

F3 derives application, tenant, site, and channel from its validated static
registry and carries them through S2S v3. Raw headers remain insufficient and
are never reconstructed into trusted context. F4 replaces the registry adapter
with persistent registry/membership authority; domain services must still
enforce resource scope.

## Verification

`packages/grpc-auth/test/actor-context.security.spec.ts` proves:

- raw gRPC actor metadata does not resolve as a user;
- a user-required gRPC route rejects raw actor metadata;
- a user-required HTTP route rejects raw actor headers;
- verified token results override conflicting forged metadata.
- gateway/v3 actor and Bearer halves cannot be separated;
- user ID, role, or session-reference disagreement fails before `user` is
  attached;
- anonymous v3 and legacy service-v2 migration behavior remain explicit.

Run:

```powershell
pnpm --filter @nebula/grpc-auth test
```

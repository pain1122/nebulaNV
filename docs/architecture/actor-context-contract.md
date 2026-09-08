# Actor Context Contract

This document records the implemented trust boundary for service, signed
request context, and user identity. Persistent tenant membership and domain
scope remain F4 target architecture.

Implementation status: the trusted-field table below describes the current
single/default-realm F3/F4 receiver behavior. It must not be read as an
implemented multi-realm claim. ADR-0014 adds a realm-qualified target through
a new context version while preserving these current denial mechanisms.

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
- **Tenant/site/app**: F3 request scope derived from the validated application
  registry and signed through v3. Persistent records, memberships, and domain
  ownership remain F4 authority.

These identities may have the same value in a particular operation, but code must not assume that. Parent administration will especially require separate actor and target tenant/site fields.

## Supported Request Patterns

### User operation

At public ingress the gateway creates a new request ID. It sends a fresh S2S
envelope and the user's Bearer access token. `S2SGuard` attaches service
context; the JWT guard validates the token and attaches actor context. A nested
causal hop preserves the guard-verified request ID/context but creates a fresh
nonce, timestamp, service identity, target key, and signature. Resource
ownership is checked separately by the owning service.

### Pre-JWT login operation

`AuthService.GetTokens` has no actor yet. It accepts `userId` only from its method-specific request body after `S2SGuard` verifies a gateway v3 signature bound to that exact RPC, protobuf body, and registry-derived request context. This is not general user propagation.

That S2S proof binds the gateway, RPC, and body; it does **not** bind this call
to a successful `ValidateUser` credential check. The current two-call login is
a confirmed trust-boundary defect, not an atomic authentication proof.
ADR-0015 selects one Realm Auth-owned atomic `Login` operation before realm
traffic: the gateway submits credentials plus verified application/audience in
one request and never receives a subject ID it can pass to a token-mint method.
One-use grants are reserved for root-application SSO, and legacy upgrade uses
its dedicated bridge.

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

## F4 Authoritative Request Scope (Target, Not Implemented)

[ADR-0009](decisions/0009-f4-authoritative-request-scope.md) freezes the future
semantic decision without changing this implemented contract. As amended by
[ADR-0014](decisions/0014-f4-customer-identity-realms-and-federation.md), each
protected F4 operation will keep verified workload, verified realm subject/
application session,
actor membership/grant, application scope, explicit target, normalized
operation, and freshness separate.

The target tenant/site is resolved for the exact operation; it is not a
client-controlled "current tenant." A resource ID from a route, body, query,
storage key, or job is only a selector until the owning domain service loads
the row and verifies its stored ownership against that resolved target. Parent
management additionally requires one active direct relationship and never
implies sibling or transitive access.

[ADR-0010](decisions/0010-f4-signed-context-compatibility.md) assigns transport
ownership while preserving S2S envelope v3 as the workload/request carrier.
The minimum default-realm resolver receiver now implements strict context-v2
`RESOLUTION/AUTHORITY`; ADR-0015 now orders dormant realm-aware receivers at R5,
the controlled default-realm writer/session cohort at R6, and persistent-
registry expansion in Batch 4. Its actor identity contains
only Auth-verified `userId`/`sessionRef`; the effective scoped role belongs to
actor authority, so a legacy JWT role cannot restore membership access.
[ADR-0011](decisions/0011-f4-data-scope-and-migration-matrix.md) adds an opaque
`membershipEpochRef` to that authority variant. It is HMAC-derived from the
stable membership ID and authority-internal generation using a dedicated key;
the generation itself never leaves authority, and an old epoch can never regain
access after re-invitation.

ADR-0014 freezes that context-v2 actor shape rather than silently adding
fields to an exact parser already in source. Realm-aware authorization uses
additive context v3 with Auth-verified `identityRealmId`, `subjectId`,
`sessionRef` plus key ID, authentication-authority reference, exact application
audience, and `ar2_` plus key ID. ADR-0015 freezes their full-length HMAC inputs
and persists each live `sr2_` so key rotation cannot change it. Provider tokens,
email, raw OIDC/SAML claims, credential/session generations, and raw session IDs
never become propagated domain authority. V3 follows the same receiver-first,
strict-shape, independent Auth/Authority/domain, and no-downgrade rules.

[ADR-0012](decisions/0012-f4-failure-freshness-audit-and-recovery.md) gives
`resolvedAtMs` and `authorityRevision` executable target semantics: ordinary
positive decisions expire after 15 seconds, security-sensitive operations
resolve live, and only exact anonymous public reads have a 60-second absolute
safe-degraded ceiling. Expiry, authority outage, or cache failure never falls
back to a JWT role, raw scope, default site, or context v1.

The authority resolver receiver has learned its exact v2 subset before any
writer emits it. It rejects v1, resolution context cannot enter a nested domain
operation, and later authority-bearing flows still must not downgrade to v1 or
context-free S2S v2.

## Verification

`packages/grpc-auth/test/actor-context.security.spec.ts` proves:

- raw gRPC actor metadata does not resolve as a user;
- a user-required gRPC route rejects raw actor metadata;
- a user-required HTTP route rejects raw actor headers;
- verified token results override conflicting forged metadata.
- gateway/v3 actor and Bearer halves cannot be separated;
- context-v1 user ID, role, or session-reference disagreement fails before
  `user` is attached;
- context-v2 actor proof has no global role and requires exact live Auth user
  ID/session-reference agreement;
- anonymous v3 and legacy service-v2 migration behavior remain explicit.
- nested propagation preserves only verified request/context/actor state and
  rejects raw, partial, duplicate, or mismatched carriers.

Run:

```powershell
pnpm --filter @nebula/grpc-auth test
```

# ADR-0010: F4 Signed-Context Compatibility

Date: 2026-08-24

Status: accepted for the F4 Batch 1 signed-context compatibility decision;
design only, not yet implemented.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
strict context v2 remains frozen for default-realm compatibility and its
implemented `RESOLUTION/AUTHORITY` receiver. Realm-aware actor and audience
facts use additive context v3 under the same receiver-first/no-downgrade rules;
v2 is not silently widened.

[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md) freezes
`sr1_`/`ar1_` to that compatibility lane and assigns new realm/application
canonical inputs to context-v3 `sr2_`/`ar2_`.

## Context And Classified Findings

The current implementation has two separate versions that must not be
confused:

- S2S envelope v2 is the byte-compatible, context-free service format.
- S2S envelope v3 adds one canonical context and signs its SHA-256 digest.
- The only implemented context schema inside v3 is context v1.

S2S v3 already binds caller kind/name, target service, transport method, exact
RPC path, issued-at time, nonce, request ID, key ID, serialized body digest,
and context digest. Context v1 strictly carries application, tenant, site,
channel, and optional actor `userId`/legacy global `role`/non-secret
`sessionRef`. Exact-key validation, canonical JSON, a 1024-byte bound,
base64url canonicality, one-value cardinality, pairwise keys, replay denial,
and actor/Bearer consistency are implemented and tested. These are sound F3
mechanisms and are preserved.

Silently adding F4 fields to context v1 would be rejected by current parsers
and would change its frozen meaning. Reusing the legacy JWT role as scoped
membership authority, or accepting context v1 on an operation after that
operation depends on F4 membership/target authority, would be a **confirmed
authorization defect**.

The future gateway must also call persistent application authority before it
can possess application context. Allowing a gateway-kind caller to fall back
to context-free S2S v2 for that lookup would weaken an existing F3 invariant.
This is a **confirmed compatibility requirement** for the authority bootstrap,
not a reason to remove gateway v3.

Increasing context size beyond what F4 needs, introducing automated capability
negotiation, or issuing independently verifiable distributed authorization
tokens are **future scaling considerations**, not current requirements.

## Decision Summary

Keep the S2S envelope at protocol v3 and introduce a distinct canonical
**context schema v2**. S2S v3 already signs an opaque context digest, so an S2S
v4 envelope would add migration and maintenance cost without protecting a new
envelope fact.

Context v1 remains byte-for-byte and semantically frozen for the explicit F3
compatibility window. Context v2 has two exact purposes:

```text
RESOLUTION  -> narrowly allowlisted lookup; grants no domain authority
AUTHORIZED  -> complete ADR-0009 authority decision for a protected operation
```

The implementation must use a discriminated union with exact keys and
canonical field order. The names below are the frozen conceptual wire names;
their TypeScript types and validators belong to `@nebula/grpc-auth` when Batch
4 implements them.

## Fields Already Protected By The S2S Envelope

These facts remain only in the existing envelope and must not be duplicated in
context v2:

| Existing S2S v3 fact                | Why it stays in the envelope                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| protocol version                    | Selects context-free v2 versus context-bound v3 signature construction.                                           |
| caller kind and caller name         | Proves the pairwise workload identity; context cannot replace it.                                                 |
| target service                      | Prevents forwarding a valid signature to another service.                                                         |
| transport method and exact RPC path | Receiver maps this trusted route, plus validated body semantics where needed, to ADR-0009's normalized operation. |
| issued-at milliseconds and nonce    | Provide per-hop transport freshness and replay protection.                                                        |
| request ID                          | Preserves causal correlation while each hop creates a fresh signature/nonce/time.                                 |
| key ID                              | Selects the pairwise rotation key.                                                                                |
| serialized request-body SHA-256     | Makes route/body target selectors tamper-evident without making them authoritative.                               |
| canonical context SHA-256           | Binds every context-v1 or context-v2 byte to this exact request.                                                  |

`resolvedAtMs` and `authorityRevision` still belong in context v2 because
authority freshness is different from the envelope's short per-hop transport
freshness. The envelope time proves when this hop was signed; it does not prove
that membership epoch, relationship, application, or lifecycle state is
current. For membership authority, the context carries ADR-0011's opaque
HMAC-derived `membershipEpochRef`, never its small internal generation number.

The normalized authorization operation is also not serialized redundantly.
Each receiver maps the already signed target service/RPC path and, where a
contract has multiple semantics, its validated signed body to one stable
operation identifier. That identifier is used for policy and audit. An
unmapped or ambiguous operation is denied.

## Context V2 Shapes

### Shared application and actor facts

When present, `application` has exactly:

```text
applicationId
applicationProfile   // storefront-web | admin-web | mobile
tenantId
siteId
channelId
channelKind          // WEB | ANDROID | IOS
```

The exact F4 channel kind replaces v1's coarse `web`/`mobile` projection.
Public client IDs, origins, domain proof, package/bundle identifiers,
certificate fingerprints, attestation, rate-limit profile, and client storage
are not carried authority.

When present, `actor` has exactly:

```text
userId
sessionRef
```

Context v2 deliberately removes global `role` from the actor identity. Auth
must still validate the user and live session and require exact
`userId`/`sessionRef` agreement. A legacy role may remain in an Auth response or
context-v1 compatibility path, but a context-v2 scoped decision ignores it for
authorization.

### `RESOLUTION`

`RESOLUTION` exists only to avoid a circular trust dependency before a complete
decision can be formed. It has these stages:

| `resolutionStage` | Present context facts                              | Exact permitted use                                                                                                                                  |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APPLICATION`     | no application, actor, target, or grant            | Gateway calls the authority-owned application resolver. Public lookup evidence remains in the signed request body and must be verified against data. |
| `ACTOR`           | verified application; no actor or scoped grant     | Gateway asks Auth to validate a presented token/session. The token remains request data; Auth produces identity truth.                               |
| `AUTHORITY`       | verified application when applicable; actor if any | Gateway/service asks authority to resolve the exact target, membership/grant, relationship path, and revision. Selectors remain signed request data. |

Each resolution stage is accepted only by its named typed resolver RPC and an
exact allowed caller identity. It cannot pass a domain controller, satisfy a
role decorator, authorize a resource, be propagated as an authorized nested
context, or be cached as a grant. Its typed result is still data until the
caller constructs and signs an `AUTHORIZED` context.

`APPLICATION` preserves the existing rule that gateway-kind calls use S2S v3;
the constant bounded resolution context supplies the required context carrier
without pretending that the unresolved public selector is authority.

### `AUTHORIZED`

An `AUTHORIZED` context has:

- `version: "2"` and `purpose: "AUTHORIZED"`;
- optional `application` only for service-originated work; every
  gateway-originated call requires it;
- optional verified `actor`; operations requiring a human require it;
- `authorizationPath`: `APPLICATION`, `TENANT_MANAGEMENT`,
  `PARENT_MANAGEMENT`, `PLATFORM_MANAGEMENT`, or `SERVICE_OPERATION`;
- one `target` containing `tenantId`, optional `siteId`, and optional
  `resource` with exact `type` and `id` only after its owning service verified
  the row;
- optional `actorAuthority`, using exactly one variant:
  - `MEMBERSHIP`: actor tenant ID, membership ID, opaque
    `membershipEpochRef`, effective ADR-0008 role, and optional matching
    site/site-grant IDs;
  - `PLATFORM`: platform-grant ID and `PLATFORM_ADMIN` role;
- `relationshipId` only for `PARENT_MANAGEMENT`, identifying the active direct
  parent edge used by the decision;
- opaque target-specific `authorityRevision` and integer `resolvedAtMs`;
- optional opaque `entitlementScopeRef`, which remains non-granting under
  ADR-0002.

Only the one effective role used for the exact operation is carried; context
v2 does not carry a role list or hierarchy. An authenticated identity without
`actorAuthority` grants no membership operation. Public/anonymous application
operations and narrowly permitted Auth operations may have no actor authority,
but route policy must explicitly allow that absence.

The application tenant/site need not equal the target tenant/site on tenant,
parent, or platform management paths. Their relationship must satisfy
ADR-0009. On the ordinary `APPLICATION` path they must match exactly.

Context v2 remains strict canonical JSON with unknown/null/duplicate/partial
fields rejected. Safe identifiers remain 1-128 bytes. Context v1 keeps its
1024-byte JSON maximum; context v2 has a 2048-byte JSON maximum. The decoder
may initially bound input at the larger value, but after reading the version it
must enforce that version's own limit. Raising either limit requires a reviewed
contract change and transport-size evidence.

## Nested Propagation

- Each hop preserves the guard-verified causal request ID but creates a fresh
  envelope caller/target, timestamp, nonce, key selection, body digest,
  context digest, and signature.
- A `RESOLUTION` context is never propagated to a domain operation.
- A service propagating an `AUTHORIZED` decision must preserve actor,
  application, authorization path, target, actor authority, relationship,
  authority revision, and resolved time exactly.
- Only the domain owner that loaded and verified a resource may add its
  optional target-resource reference for a downstream call. It may not change
  tenant/site or broaden the operation. The receiver still validates the
  caller allowlist and any reference it owns.
- Changing actor authority, target tenant/site, relationship, or authority
  revision requires a new authority resolution; it is not a context rewrite.
- A context-v2 causal flow that needs actor or tenant/site authority cannot be
  downgraded to context v1 or context-free S2S v2.
- A truly context-free, actor-free service maintenance RPC may continue to use
  S2S v2 only when its exact route allowlist and service-owned policy require no
  F4 scope.

## Receiver Rules And Mixed-Version Rejection

Every protected RPC must declare its accepted context purpose/version as part
of the checked service-operation matrix:

| Receiver declaration   | Accepted input                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `CONTEXT_FREE_SERVICE` | S2S v2 from an exact allowed service; no context or actor/target authority.                     |
| `LEGACY_CONTEXT_V1`    | S2S v3 plus exact context v1 during the recorded compatibility window.                          |
| `RESOLUTION_V2(stage)` | S2S v3 plus context v2 with that exact stage, caller, target service, and resolver RPC.         |
| `AUTHORIZED_V2`        | S2S v3 plus context v2 `AUTHORIZED`, with all facts required by the route's ADR-0009 operation. |

Rules:

- S2S v2 with either context header remains rejected.
- S2S v3 requires exactly one context and one matching digest; v1 and v2 are
  never dual-written in separate headers or merged into one object.
- Unknown S2S/context versions, purpose/stage, fields, roles, paths, or shape
  combinations are rejected.
- An operation marked `AUTHORIZED_V2` rejects context v1 even when its legacy
  tenant/site values happen to match.
- A v2 receiver never fills missing v2 authority from a v1/global JWT role,
  public selector, static registry, cached UI target, or request field.
- A v1 receiver rejects v2 rather than dropping its additional fields.
- There is no automatic retry/downgrade from v2 to v1 after an unsupported or
  denied response.
- Deployment configuration or client capability input cannot negotiate a
  weaker version. The checked source-owned operation matrix is authoritative.

## Receiver-First Rollout

Implementation note (2026-08-29): Batch 3's ordered actor-authority resolver
cannot safely expose its typed RPC through context v1, while deferring the RPC
would skip the adopted Batch 3 checklist. The minimum receiver-first
prerequisite therefore moved forward with that resolver: the shared parser
recognizes only strict context-v2 `RESOLUTION/AUTHORITY`, one explicit receiver
declaration admits it, undeclared routes reject it, and propagation refuses it.
This does not authorize a writer. `APPLICATION`/`ACTOR` resolution stages,
`AUTHORIZED`, gateway/domain consumers, caches, and operation-slice cutover
remain in Batch 4. The dependency correction preserves the ordering below:
receiver support still precedes every writer and there is no downgrade.

1. Freeze the Batch 1 data and failure matrices before runtime changes.
2. Add context-v2 types/parser/canonicalizer and exact receiver declarations to
   shared `grpc-auth`; retain context v1 bytes and tests unchanged.
3. Deploy all receivers in dual-read mode for only the operations declared in
   the migration matrix. They parse v2 but do not treat v1 as F4 authority.
4. Implement authority typed resolvers and deploy the `RESOLUTION` routes with
   exact gateway/service caller allowlists. Application lookup, Auth actor
   validation, and authority resolution remain distinct proofs.
5. Shadow-resolve/compare authority decisions while existing context-v1 routes
   still enforce the default-site behavior. A comparison mismatch denies the
   planned cutover and emits evidence; it does not silently select one result.
6. Switch writers by complete service/operation slices to exactly one v2
   context. Never switch a producer before every receiver for that slice
   understands and validates v2.
7. Mark the slice `AUTHORIZED_V2`, then enable its scoped domain enforcement
   only after database backfill/constraints and denial tests pass.
8. Keep context v1 only for named unmigrated operations. Remove it after every
   known producer/consumer has migrated, at least one published release has
   carried deprecation, and old-context denial/rollback evidence passes.
9. Retain S2S v2 for explicitly context-free service operations; its existence
   does not extend the context-v1 deprecation window.

The rollout uses no runtime version discovery or fallback. A checked
producer/receiver inventory and deployment gate provide compatibility; this is
less operationally ambiguous than asking a receiver or public client which
security contract it supports.

## Options Compared

| Option                                                     | Compatibility, security, and maintenance consequence                                                                                  | Decision                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| S2S v3 plus explicit context v2                            | Reuses the signed digest and pairwise/replay controls while giving F4 an exact new schema and receiver-first path.                    | **Selected.**                                                                              |
| Add fields silently to context v1                          | Existing exact parsers reject them; permissive parsing would blur semantics and permit partial authority.                             | Rejected.                                                                                  |
| Create S2S envelope v4                                     | Repeats envelope rollout even though v3 already authenticates arbitrary canonical context bytes.                                      | Rejected unless a future requirement changes envelope facts/signature construction.        |
| Permit gateway S2S v2 for authority bootstrap              | Avoids a resolution shape but weakens the established gateway-must-carry-context invariant.                                           | Rejected; use narrowly scoped context-v2 `RESOLUTION`.                                     |
| Put caller/target/request/body/time again in context       | Creates two possibly contradictory signed sources for the same transport facts.                                                       | Rejected; keep envelope facts single-owned.                                                |
| Carry legacy global and scoped roles as co-equal authority | Makes disagreement/fallback ambiguous and can restore revoked scope from a token.                                                     | Rejected; v2 actor identity excludes role and scoped authority carries one effective role. |
| Automatic capability negotiation or v2-to-v1 retry         | Creates downgrade paths and deployment-dependent authorization.                                                                       | Rejected.                                                                                  |
| Independently signed authority token                       | Could reduce lookups at scale but adds issuer keys, audience/expiry/revocation semantics, rotation, and another verification surface. | Future scaling consideration; opaque revision plus existing per-hop signing is sufficient. |

## Failure-Oriented Review

| Concern             | Signed-context decision                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Frozen v1; discriminated strict v2; unchanged v3 context digest; exact resolution RPC/caller rules; per-operation receiver declaration; no dual carrier, downgrade, JWT-role fallback, or duplicated envelope facts; independent Auth/authority/domain checks.                                                                           |
| Detection           | Version/purpose/stage/shape error metrics; producer/receiver inventory; shadow-decision mismatch; v1-on-v2-required denial; attempted downgrade/retry; nested invariant mismatch; authority revision mismatch; request-ID-correlated Auth/authority/domain evidence.                                                                     |
| Containment         | `RESOLUTION` grants no domain access. A context error remains bounded by exact caller/target/RPC and pairwise key. Domain owners recheck resource scope, and Auth remains the live identity/session owner. A compromised gateway or authority alone is not intended to satisfy every layer.                                              |
| Fail state          | Unknown/partial/duplicate/non-canonical/oversized/mismatched context, unsupported version, wrong stage/RPC, missing required decision fact, stale revision, actor disagreement, or authority outage denies. No automatic v1/static/JWT/raw-input fallback exists.                                                                        |
| Recovery            | Restore authority records/revisions, deploy compatible receivers before writers, rebuild caches, compare decisions, and reopen one complete slice. Roll back a writer only while that slice legally supports v1; after F4 enforcement, keep it closed or roll back the whole data/runtime slice without reviving old authority.          |
| Common-mode failure | Shared `grpc-auth` parser/policy bugs affect all services; shared key/config/operator errors can produce consistently wrong acceptance; gateway and domains may consume the same false decision. Exact fixtures, independent route/domain tests, pairwise keys, Auth verification, and data constraints limit but cannot eliminate this. |
| Evidence            | Frozen v1 bytes; v2 canonical round trips/bounds; every invalid union; S2S-v2/context denial; application-bootstrap success only on resolver; resolution-to-domain denial; actor identity/scoped-role separation; receiver-first old/new matrix; no downgrade; nested preservation; resource addition ownership; retirement/rollback.    |
| Residual risk       | A flawed shared context schema or operation matrix can create system-wide overgrant. ADR-0012 bounds revision/cache behavior, but its correctness still depends on executable expiry, invalidation, outage, and independent domain tests; this documentation is not enforcement.                                                         |

## Compatibility And Rollback Boundary

This ADR changes documentation only. It does not authorize context code,
proto, runtime, schema, migration, or deployment changes before Batch 1 exits.

Context v1 and S2S v2/v3 current behavior remain unchanged until the later
receiver-first implementation. During rollout, a writer may return to v1 only
for a slice whose database/runtime policy still explicitly supports the legacy
default-site decision. Once scoped records or audit references rely on v2, a
context-only rollback is unsafe: the complete slice must remain closed or be
rolled back with its data, authority, cache, and enforcement evidence.

Previous pairwise keys do not imply previous context acceptance. Key rotation
and context-version rollout are independent; an accepted previous key must
still satisfy the route's current context requirement.

## Repository Evidence

- `packages/grpc-auth/src/s2s.crypto.ts`
- `packages/grpc-auth/src/s2s.ts`
- `packages/grpc-auth/src/s2s-context.ts`
- `packages/grpc-auth/src/s2s.guard.ts`
- `packages/grpc-auth/src/s2s-propagation.ts`
- `packages/grpc-auth/src/grpc-token-auth.guard.ts`
- `packages/clients/src/s2s-metadata.ts`
- `apps/gateway/src/application/application.contracts.ts`
- `apps/gateway/src/auth/gateway-auth-resolver.ts`
- `apps/gateway/src/downstream/gateway-downstream-context.ts`
- `packages/grpc-auth/test/s2s-context.security.spec.ts`
- `packages/grpc-auth/test/s2s.guard.security.spec.ts`
- `packages/grpc-auth/test/s2s-propagation.security.spec.ts`
- `docs/architecture/s2s-security-contract.md`
- `docs/architecture/api-and-proto-versioning.md`
- [ADR-0009](0009-f4-authoritative-request-scope.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`

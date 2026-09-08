# ADR-0009: F4 Authoritative Request Scope

Date: 2026-08-24

Status: accepted for the F4 Batch 1 request-scope decision; design only, not
yet implemented.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
actor identity becomes a realm-qualified subject plus realm/application
session proof. Application-first realm/provider/audience/trust resolution is
an independent prerequisite; target-based membership and domain checks remain
unchanged.

## Context And Classified Findings

F3 already derives an application, tenant, site, and channel from a validated
application-registry record. S2S v3 signs that context and binds it to the
calling workload, target service and method, request body, time, nonce, request
ID, and key. Auth independently proves the human actor and session. These are
working mechanisms and must be preserved.

The current context does not represent an authoritative tenant membership,
site grant, parent relationship path, explicit target scope, normalized
operation, or authority revision. The current global role cannot supply those
facts. This is a **confirmed gap against F4**, not a defect in F3 signing.

Trusting a target from a route, body, query, header, storage key, job payload,
client-selected dashboard state, or unverified JWT claim would be a
**confirmed authorization defect**. Such values may select a record for
verification; they never prove its scope.

A globally replicated policy engine, distributed authorization tokens, and
cross-region decision cache are **future scaling considerations**. Carrying a
large list of component revisions on every request is **optional hardening**,
not required for the first F4 design.

## Decision

Every protected F4 operation is evaluated against one server-resolved,
operation-specific authority decision. The decision keeps these identities
separate:

```text
verified workload + verified actor + actor authority + explicit target
                    + application scope + exact operation + freshness
```

No field is authoritative merely because it appears in this model. Its owner
must resolve or verify it through the proof listed below, and the receiving
domain service must still authorize its own resource.

### Required Decision Facts

| Fact group                  | Required facts                                                                                                                                                                                         | Authority and proof                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workload provenance         | caller kind/name, target service, exact method or operation carrier, request ID                                                                                                                        | Existing S2S verification. A service caller is never represented as a fake human.                                                                                                                                                                                                                                                                              |
| Actor identity              | anonymous/authenticated kind; global user ID and non-secret Auth session reference when authenticated                                                                                                  | Auth's live token/session validation. A signed workload assertion alone does not prove a human actor.                                                                                                                                                                                                                                                          |
| Actor authority             | actor tenant ID, active membership ID and opaque membership epoch reference, applicable site grant ID/site ID, and exact effective scoped role; or a live platform grant for a platform-only operation | Authority-service membership, current immutable epoch, grant, lifecycle, and role decision under ADR-0008/0011. The internal generation never leaves authority; its HMAC-derived epoch reference does. `PLATFORM_ADMIN` is not implicit customer-data access. Root admin uses its explicit main-tenant membership when acting as that tenant's `TENANT_ADMIN`. |
| Authorization path          | one of `APPLICATION`, `TENANT_MANAGEMENT`, `PARENT_MANAGEMENT`, `PLATFORM_MANAGEMENT`, or `SERVICE_OPERATION`                                                                                          | Selected by trusted server policy from the verified actor, operation, application, and target facts. It is never client-selectable.                                                                                                                                                                                                                            |
| Explicit target             | target tenant ID; target site ID when the operation is site-owned; optional verified target resource type/ID                                                                                           | Authority-service proves tenant/site relationships. The domain owner resolves a supplied resource selector and proves that the stored row belongs to the resolved target before using it as an authoritative resource ID. Creation operations may have no existing resource ID.                                                                                |
| Application/channel         | application ID, registration profile, owning tenant/site, channel ID and channel kind                                                                                                                  | Active verified ApplicationRegistry replacement records under ADR-0005/0006. Public client IDs, origins, packages, and app identifiers remain lookup/verification evidence, not authority.                                                                                                                                                                     |
| Exact operation             | one stable normalized operation identifier                                                                                                                                                             | Receiving contract and server policy. An HTTP verb or RPC name may contribute to mapping but does not by itself grant an operation.                                                                                                                                                                                                                            |
| Freshness                   | `resolvedAt` plus opaque target-specific `authorityRevision`; Auth session freshness remains independently enforced                                                                                    | Authority-service derives the revision from the exact application, tenant/site, current membership epoch/grant, role, lifecycle, and direct relationship inputs used by the decision. A relevant change changes the revision. The durable owner retains the component evidence; callers need not carry every counter.                                          |
| Optional entitlement anchor | ADR-0002 `EntitlementScopeRef` only when the operation needs the future F6 boundary                                                                                                                    | Authority-service reference ownership. Its presence grants no feature and cannot replace F6 execution.                                                                                                                                                                                                                                                         |

`authorityRevision` is opaque to consumers. It is not one global platform
counter: unrelated tenant changes must not invalidate every request. ADR-0012
now freezes a 15-second ordinary decision ceiling, live-required sensitive
operations, transactional invalidation, and an absolute 60-second
anonymous-public-only safe-degraded window.

### Target-Based Resolution Rules

There is no mutable "current tenant" stored as global user identity or trusted
from client state. Each operation resolves one explicit target:

- `APPLICATION`: ordinary anonymous/`USER`/`EDITOR`/`SITE_ADMIN` work targets
  the verified application's owning site. An authenticated scoped role must
  match that tenant/site; the caller cannot switch it with request data.
- `TENANT_MANAGEMENT`: `TENANT_ADMIN` targets its own tenant and, when needed,
  one authority-proven site owned by that tenant.
- `PARENT_MANAGEMENT`: the actor is an active `PARENT_MANAGER` member of the
  parent tenant and the target is one active direct child under ADR-0007. The
  target is never the actor tenant, a sibling, or a descendant reached
  transitively.
- `PLATFORM_MANAGEMENT`: a live `PLATFORM_ADMIN` grant and an explicit target
  are required. The platform role alone grants no domain-data operation.
- `SERVICE_OPERATION`: a pairwise allowed service and exact internal operation
  may act without a human only when that contract explicitly permits it. It
  still resolves the required target and cannot manufacture membership.

If an operation targets an existing resource, the route/body/query value is
only an untrusted selector. The owning domain service must load the row and
verify its stored tenant/site ownership against the resolved target. Authority
cannot authorize a resource it does not own, and the domain service cannot
manufacture tenant authority from its row alone.

### Decision Flow

1. Gateway verifies an active application registration and derives its owning
   tenant/site/channel.
2. Auth independently verifies the human actor and live session when required.
3. Server policy maps the protected contract to one normalized operation and
   treats any requested target/resource as an untrusted selector.
4. Authority resolves the applicable active membership/grant, target
   tenant/site, direct relationship when applicable, authorization path, and
   target-specific revision.
5. The receiving service verifies the workload, actor consistency, operation,
   target decision, and acceptable freshness.
6. The domain owner loads any existing resource and independently verifies its
   stored ownership and operation-specific policy.
7. Sensitive or mutating decisions emit the later frozen audit evidence.

Any missing, inactive, contradictory, stale, or unverifiable fact denies the
operation. There is no fallback to raw request data, a legacy role string,
client storage, settings, the static registry, a cached last-selected tenant,
or an unverified token claim.

## Options Compared

| Option                                                        | Compatibility, failure, and maintenance consequences                                                                   | Decision                                                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target-based, operation-specific server decision              | Preserves F3/Auth/domain boundaries; supports ordinary, tenant, parent, and platform paths without merging identities. | **Selected.**                                                                                                                                                  |
| Store/trust a user's current tenant                           | Simple UI state but ambiguous across tabs/devices/jobs and vulnerable to stale or forged target selection.             | Rejected as authority. A UI selection remains input to verify.                                                                                                 |
| Put all authority in the JWT                                  | Reduces lookups but couples revocation to token lifetime and cannot safely represent changing relationships/resources. | Rejected. JWT proves identity/session; live scoped authority remains separate.                                                                                 |
| Let gateway make the final authorization decision             | Centralizes policy but makes gateway compromise or cache error sufficient and removes service-owned resource checks.   | Rejected. Gateway resolution and domain authorization remain independent.                                                                                      |
| Carry every component revision                                | Maximizes diagnostic detail but expands contracts and couples consumers to authority storage.                          | Optional hardening. Selected opaque revision keeps the first contract narrow.                                                                                  |
| Require a synchronous authority lookup for every service call | Strong immediate consistency but increases shared availability and latency cost.                                       | Rejected as the universal rule by ADR-0012. Sensitive operations resolve live; bounded operations use authenticated positive decisions for at most 15 seconds. |

## Failure-Oriented Review

| Concern             | Request-scope decision                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prevention          | Independent application, Auth, authority, S2S, and domain proofs; explicit target; normalized operation; non-hierarchical scoped role; direct-edge-only parent path; target-specific revision; no client-selected authority.                                                                                                   |
| Detection           | Log/audit actor, membership/grant, path, target, operation, application/channel, caller/target service, request ID, revision, result and reason without secrets; test wrong tenant/site/resource, stale revision, role/link/lifecycle change, and actor/context disagreement.                                                  |
| Containment         | A false membership or relationship is bounded to its exact role/path/target/operation. Auth still controls identity/session, S2S still controls workloads, and the domain owner still checks stored ownership. Parent views remain privacy-minimal.                                                                            |
| Fail state          | Missing, invalid, inactive, mismatched, stale, contradictory, or unavailable required authority denies the operation. No static-registry, JWT-role, raw-input, or last-known-target fallback is implied. Any future degraded read requires an explicit operation-class rule.                                                   |
| Recovery            | Restore authoritative records and component revision evidence, keep uncertain grants/links inactive, rebuild caches, reconcile references, revalidate Auth sessions independently, and compare resolved decisions before reopening protected traffic. Revoked authority must not be revived from an older carried decision.    |
| Common-mode failure | Gateway and services may consume the same bad authority result; shared S2S keys/config or a compromised authority operator can also misgrant. Pairwise workload checks, target-specific revisions, independent Auth/domain checks, minimal parent data, audit, and later cache/failure tests limit but do not erase this risk. |
| Evidence            | Every path/role/operation combination; anonymous/authenticated behavior; wrong actor tenant/site; sibling/transitive/reverse parent denial; platform no-implicit-data access; service-only allowlist; resource-row mismatch; revision change; authority/Auth/domain outage; audit correlation by request ID.                   |
| Residual risk       | An incorrectly specified operation matrix or compromised authority can still create a plausible overgrant. ADR-0012 bounds cache/failure behavior, but executable route/domain matrices, audit review, and recovery tests are still required; documentation alone does not enforce the model.                                  |

## Compatibility And Rollback

This ADR changes documentation only. F3's registry-derived context, S2S v3,
Auth validation, typed clients, and service-owned resource authorization stay
in place. Later implementation must add authority resolution beside the current
single-site path, compare decisions, backfill memberships/grants, and switch
operation classes only after their denial and rollback evidence passes.

Before new scope references are persisted, rollback removes the additive
decision path. After domain/audit references exist, rollback must reconcile
those references and preserve revoked revisions; it cannot silently return to
global role or client-selected target authority.

## Signed-Context Decision

This ADR defines **which facts must be authoritative**.
[ADR-0010](0010-f4-signed-context-compatibility.md) now freezes their wire
ownership: transport/request provenance stays in S2S envelope v3, strict
context v2 separates non-authorizing resolution from authorized decisions, and
mixed-version rollout is receiver-first with no downgrade. ADR-0010 does not
change this ADR's authority semantics.

## Repository Evidence

- `packages/grpc-auth/src/s2s.ts`
- `packages/grpc-auth/src/s2s-context.ts`
- `packages/grpc-auth/src/s2s.guard.ts`
- `packages/clients/src/s2s-metadata.ts`
- `apps/gateway/src/downstream/gateway-downstream-context.ts`
- `docs/architecture/s2s-security-contract.md`
- `docs/architecture/actor-context-contract.md`
- [ADR-0005](0005-f4-channel-semantics.md)
- [ADR-0006](0006-f4-application-registration.md)
- [ADR-0007](0007-f4-parent-relationships.md)
- [ADR-0008](0008-f4-scoped-roles.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`

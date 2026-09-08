# ADR-0008: F4 Platform And Scoped Membership Roles

Date: 2026-08-24

Status: accepted for the F4 Batch 1 role decision; design only, not yet
implemented.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
target-specific administrative/content roles remain accepted. The global-user
premise is superseded; a realm consumer may receive only the exact target
`USER` baseline allowed by application policy. Premium remains an F6
entitlement, and every higher role still needs an explicit target grant.

[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md) additionally
separates the customer root administrator from the platform-operator subject.
The central customer subject may hold both explicit `TENANT_ADMIN` and
`PARENT_MANAGER` grants, but the resolver selects one exact role for the
operation/target and never unions or hierarchically expands them.

## Context And Classified Findings

User-service currently persists one free-string `User.role`. Auth and
`@nebula/grpc-auth` recognize only `user`, `admin`, and `root-admin`; the shared
decorator implements the hierarchy `user < admin < root-admin`. Most current
administrative routes allow `admin` and `root-admin` equally. Public
registration safely forces `user`, and Auth maps invalid stored values to the
least current role.

This is a valid single-site compatibility mechanism. It cannot represent
tenant/site memberships, a parent target, content-only editors, or independent
platform authority. Using it as final F4 authorization would be a **confirmed
defect against F4**.

Comments suggesting Auth always handles live role changes are **stale
implementation documentation**: live token validation checks disablement,
token version, and session state but does not reread the User role or future
membership grants.

Custom tenant-defined roles, arbitrary permission builders, ABAC policy engines,
and delegated role templates are **future scaling/product considerations**.
F4 uses one closed vocabulary and explicit operations.

## Role Vocabulary And Scope

```text
PLATFORM_ADMIN
TENANT_ADMIN
SITE_ADMIN
PARENT_MANAGER
EDITOR
USER
```

These are not a numeric hierarchy. Authorization checks an exact operation,
role grant, target, lifecycle, and resource policy.

| Role             | Scope                                                  | Target boundary                                                                     | Core purpose                                                                                                                             |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PLATFORM_ADMIN` | Global platform grant tied to verified global identity | One explicitly named tenant/site/relationship per operation                         | Platform authority administration and recovery; not automatic customer business-data access.                                             |
| `TENANT_ADMIN`   | One tenant                                             | The tenant and its owned sites                                                      | Tenant-wide authority and site administration. In F4 it is assigned only to the existing root administrator for the main/default tenant. |
| `SITE_ADMIN`     | One site membership/grant                              | That exact site                                                                     | Site administration, operations, memberships, applications, safe settings, and domain administration.                                    |
| `PARENT_MANAGER` | One parent tenant membership/grant                     | One explicitly selected direct subordinate tenant/site with an active ADR-0007 link | Privacy-minimized subordinate membership lifecycle and future bounded feature allocation.                                                |
| `EDITOR`         | One site membership/grant                              | That exact site                                                                     | Product, Blog, Taxonomy, and Media content work only.                                                                                    |
| `USER`           | One site membership/grant                              | That exact site and actor-owned resources                                           | Consumer/self operations such as storefront, cart/order self access, and own protected resources.                                        |

Global user identity/profile remains in User-service. Authority-service owns
tenant memberships, site grants, and scoped role assignments. One person may
hold multiple grants in different tenants/sites. Under
[ADR-0011](0011-f4-data-scope-and-migration-matrix.md), one membership epoch has
at most one active tenant role and at most one active site role per site. Role
changes revoke the old immutable grant and create a new one. Permissions may
combine only for one exact target; grants from different targets cannot be
unioned to authorize a request.

## Operation Matrix

Legend: “allowed” means role eligibility only. Authentication, active
membership, target/lifecycle/freshness, service identity, resource ownership,
and domain policy must also pass.

| Operation family                                      | PLATFORM_ADMIN                                                                                                        | TENANT_ADMIN                                                    | SITE_ADMIN                                                          | PARENT_MANAGER                                                                                 | EDITOR   | USER                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| Platform-role and authority recovery                  | Allowed for explicit platform operations; cannot remove the last valid platform administrator without recovery policy | Denied                                                          | Denied                                                              | Denied                                                                                         | Denied   | Denied                                     |
| Create/recover tenant; establish/revoke parent link   | Allowed with explicit target and audit                                                                                | Denied                                                          | Denied                                                              | Denied                                                                                         | Denied   | Denied                                     |
| Tenant metadata/lifecycle                             | Platform recovery/oversight only; no implicit business-data read                                                      | Own main tenant                                                 | Denied                                                              | Read only the non-sensitive direct-child metadata allowed by ADR-0007; no lifecycle transition | Denied   | Denied                                     |
| Site create/lifecycle/export                          | Platform recovery only                                                                                                | Any site in own main tenant                                     | Own site lifecycle request/export under dedicated audited contracts | Denied                                                                                         | Denied   | Denied                                     |
| Application/channel/domain/native registration        | Platform recovery only                                                                                                | Any site in own main tenant                                     | Own site                                                            | Denied                                                                                         | Denied   | Denied                                     |
| Safe business/frontend Settings                       | Platform recovery only                                                                                                | Any site in own main tenant                                     | Own site                                                            | Denied                                                                                         | Denied   | Denied                                     |
| Membership lifecycle and scoped roles                 | Platform recovery and platform-role policy                                                                            | Own main tenant/sites; may grant `SITE_ADMIN`, `EDITOR`, `USER` | Own site; may grant `EDITOR` or `USER`                              | Direct child only; opaque/minimal member view; may grant `SITE_ADMIN`, `EDITOR`, or `USER`     | Denied   | Denied                                     |
| Future delegable F6 feature allocation                | Platform policy only after F6                                                                                         | Own main tenant after F6                                        | Site allocation after F6 policy                                     | Direct child only; cannot create/expand parent entitlement                                     | Denied   | Consume only if independently permitted    |
| Product/Blog/Taxonomy/Media content CRUD              | No automatic access; requires an applicable main-tenant scoped grant or explicit recovery operation                   | All sites in own main tenant                                    | Own site                                                            | Denied; future curated read-only Product projection requires a separate ADR                    | Own site | Denied except user-owned/public operations |
| Order administration/status                           | No automatic access; explicit recovery only                                                                           | All sites in own main tenant                                    | Own site                                                            | Denied                                                                                         | Denied   | Own cart/orders only                       |
| User global profile/credential/session administration | Platform/User/Auth policy only; credentials remain non-readable                                                       | Denied                                                          | Denied                                                              | Denied                                                                                         | Denied   | Own profile/session actions only           |
| Direct database/storage/cache/job/event/search access | Denied through human role; use approved service/operational identity and contracts                                    | Denied                                                          | Denied                                                              | Denied                                                                                         | Denied   | Denied                                     |

`PARENT_MANAGER` details are normative in ADR-0007. It never receives email,
phone, profile, credential, token, raw session, IP/location/device history,
orders, or activity history. Because Auth sessions are currently global, parent
security containment suspends/revokes the target membership and invalidates its
scope rather than globally revoking the person's sessions.

`EDITOR` is content-only. It may perform the site-scoped Product, Blog,
Taxonomy, and Media create/read/update/publish/archive/upload operations that
each owning service explicitly classifies as editorial. It cannot administer
memberships, applications, tenant/site lifecycle, exports, safe/security
settings, carts, orders, global users, sessions, billing, infrastructure, or
entitlements.

## Grant And Delegation Rules

- A role never selects its own tenant/site; every grant is bound to authority
  IDs and every request has an independently verified target.
- No role implies another role. Operation eligibility is explicit.
- `PLATFORM_ADMIN` is not a wildcard customer-data reader. Platform recovery
  access is a separately named, audited operation with exact target.
- In F4, `TENANT_ADMIN` may exist only for the main/default tenant and only for
  the migrated existing root administrator. No other account or tenant gets it
  automatically or through ordinary administration.
- `TENANT_ADMIN` may grant `SITE_ADMIN`, `EDITOR`, and `USER` within its own
  tenant, but not `PLATFORM_ADMIN`, another `TENANT_ADMIN`, or
  `PARENT_MANAGER`.
- `SITE_ADMIN` may manage membership lifecycle and grant `EDITOR`/`USER` only
  for its site. It cannot create another site administrator.
- `PARENT_MANAGER` may manage the direct child's membership lifecycle and grant
  `SITE_ADMIN`/`EDITOR`/`USER` under ADR-0007, but never platform, tenant, or
  parent roles.
- `EDITOR` and `USER` cannot grant roles.
- Platform-controlled assignment/removal of `PARENT_MANAGER` requires an active
  parent tenant and audit; the role remains useless without an active direct
  relationship.
- Self-promotion, client-selected role strings, settings-based roles, JWT-only
  scoped roles, and grant-through-resource IDs are rejected.

## Current Role Migration

The migration preserves existing single-site flows while separating authority:

| Current stored/JWT role | Global identity result                                                          | Default authority result                              | Target state                                                                               |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `root-admin`            | Compatibility source for live `PLATFORM_ADMIN`                                  | `TENANT_ADMIN` grant for the main/default tenant only | Old string is deprecated after new authorization and token/context compatibility complete. |
| `admin`                 | Authenticated global user during compatibility; no permanent global admin power | `SITE_ADMIN` grant for the default site               | Old string remains only as a bounded compatibility input, never cross-tenant authority.    |
| `user`                  | Authenticated global user baseline                                              | `USER` grant for the default site                     | Retained compatibility actor classification while scoped access comes from membership.     |
| Any other string        | Authenticated only if Auth safely validates the account/session                 | No automatic membership or role grant                 | Audit and correct explicitly; fail closed for scoped operations.                           |

Migration rules:

1. audit all current values and duplicates before backfill;
2. seed stable main/default tenant and site IDs first;
3. backfill grants deterministically and idempotently;
4. do not infer `TENANT_ADMIN` from current `admin`;
5. do not create grants for invalid role strings;
6. compare old behavior with new target-based decisions during an explicit
   compatibility window;
7. make membership/role changes advance authority freshness and connect to Auth
   invalidation without moving session ownership;
8. remove old decorators/hierarchy as target enforcement only after all mapped
   routes have operation-aware checks and rollback evidence.

[ADR-0010](0010-f4-signed-context-compatibility.md) separates context-v2 Auth
identity (`userId`/`sessionRef`) from one effective scoped role in actor
authority and freezes receiver-first mixed-version rollout. The role semantics
here remain independent of that field placement.

## Failure-Oriented Review

| Concern             | Role decision                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Closed role enum, scope-bound grants, operation matrix, explicit target, non-hierarchical evaluation, constrained delegation, no JWT-only scoped authority, independent Auth/domain checks, and invalid-value denial.                                 |
| Detection           | Role-value audit; grant uniqueness/contradiction checks; route-operation inventory; target mismatch; role downgrade/revocation; cross-site grant-combination denial; response privacy tests; old/new decision comparison.                             |
| Containment         | Compromise of one site grant is limited to that site/operation set. Parent role is limited to direct-child minimal membership operations. Platform role does not automatically expose domain data.                                                    |
| Fail state          | Missing/inactive/invalid/stale/contradictory grant or unavailable authority denies the scoped operation. No fallback to `admin`, `root-admin`, role rank, settings, headers, or client claims.                                                        |
| Recovery            | Restore memberships/grants and revisions, audit invalid/duplicate grants, keep uncertainty inactive, rebuild caches, and compare default-site behavior before traffic. Do not reconstruct tenant admin from `admin`.                                  |
| Common-mode failure | Auth may validate a stale old role while authority has a newer grant, or gateway/domain services may share a wrong cached decision. Live revision/invalidation and independent target/resource checks remain necessary.                               |
| Evidence            | Every role/operation/target combination; same-role wrong-site denial; mixed grants; downgrade/revocation; invalid legacy value; parent privacy denial; editor non-content denial; platform no-implicit-data access; deterministic migration/rollback. |
| Residual risk       | Role-operation mistakes or compromised authority administration can still overgrant. The operation matrix must become executable checks/tests; documentation alone is not enforcement.                                                                |

## Compatibility And Rollback

This ADR is documentation-only. Later implementation must be additive and keep
current default-site flows working while old and new decisions are compared.

Before scoped grants become authoritative, rollback can remove their additive
records. After domain/context/audit references exist, rollback requires grant
and membership reconciliation. Rollback may temporarily restore old default-site
decorators only inside the approved compatibility window; it must never turn
`admin` into cross-tenant authority or discard revoked/downgraded state.

## Resolved And Deferred Boundaries

[ADR-0009](0009-f4-authoritative-request-scope.md) freezes the conceptual
request-scope facts and target-specific authority revision,
[ADR-0010](0010-f4-signed-context-compatibility.md) freezes their context
placement and compatibility path, and
[ADR-0011](0011-f4-data-scope-and-migration-matrix.md) freezes the physical
membership epoch/grant matrix and migration order, and
[ADR-0012](0012-f4-failure-freshness-audit-and-recovery.md) freezes freshness,
invalidation, outage, and durable authority-audit behavior. Per-route
implementation mapping remains a later checklist item. Custom roles, commercial
eligibility, tenant-scoped Auth sessions, and future parent product projections
remain outside F4.

## Repository Evidence

- `apps/user-service/prisma/schema.prisma` and seed
- User/Auth role types and authorization checks
- `packages/grpc-auth/src/roles.decorator.ts`
- `packages/grpc-auth/src/grpc-token-auth.guard.ts`
- gateway route/application role policy
- Product, Blog, Taxonomy, Media, Settings, Order, and User role decorators
- `docs/architecture/actor-context-contract.md`
- [ADR-0007](0007-f4-parent-relationships.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`

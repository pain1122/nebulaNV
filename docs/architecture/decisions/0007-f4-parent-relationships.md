# ADR-0007: F4 Parent And Subordinate Relationships

Date: 2026-08-24

Status: accepted for the F4 Batch 1 relationship decision. Batch 2 item 2
stages direct relationship persistence, endpoint/cardinality constraints, and
a graph guard. Authorized acceptance, audit/outbox, membership policy, and
parent operations remain later items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
the direct-edge, privacy, and sibling/transitive-denial rules remain accepted.
A relationship grants no federation or login authority; sharing a root realm
with a subordinate requires a separate exact application identity policy and
audited trust record.

## Context And Classified Findings

The target platform requires a parent tenant to manage explicitly linked
subordinates without merging data or granting sibling access. The repository
has no tenant relationship, scoped membership, parent role, target-scope
contract, or durable parent-action audit. This is a **confirmed gap against
F4**.

The target also discusses reseller eligibility. F6 owns technical entitlement
execution, while commercial contracts, reseller productization, and dashboards
remain deferred. Treating those future descriptions as implemented F4 purchase
checks would be a **stale target interpretation**.

Transitive hierarchy management, multiple simultaneous parents, automated
subordinate creation, and bulk portfolio operations are **future product or
scaling considerations**. F4 keeps a compatible direct-link model without
implementing them.

## Relationship Model

Tenant-authority-service owns an explicit directed relationship:

```text
one parent tenant -> many direct subordinate tenants
one subordinate tenant -> at most one direct parent tenant
```

The relationship has an ADR-0003 UUIDv4 ID and lifecycle:

```text
PENDING -> ACTIVE <-> SUSPENDED
    |         |           |
    +---------+-----------+-> REVOKED
```

| State       | Meaning                                                                           | Authorization effect                                   |
| ----------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `PENDING`   | Proposed link has not completed platform validation and subordinate acceptance.   | Grants nothing.                                        |
| `ACTIVE`    | Direct link is accepted and eligible for separately authorized parent operations. | Necessary but never sufficient.                        |
| `SUSPENDED` | Reversible relationship hold.                                                     | Grants nothing.                                        |
| `REVOKED`   | Relationship is permanently retired.                                              | Grants nothing; its ID is never reused or reactivated. |

Rules:

- endpoints must be different authority-owned tenant records;
- one parent may have many direct children;
- one child may have at most one `PENDING` or `ACTIVE` parent link;
- self-links, duplicate links, overlapping parent transfers, and directed
  cycles are rejected;
- authorization follows only the exact active direct edge and never walks
  ancestors or descendants;
- a subordinate may itself parent direct children later, but its own parent has
  no authority over those grandchildren;
- relationship endpoints are immutable; reassignment revokes the old link and
  creates a new one without an overlapping active/pending window;
- status changes do not rewrite either tenant's sites, applications,
  memberships, or domain data;
- relationship state cannot override tenant/site lifecycle.

The schema matrix must enforce endpoint inequality, active/pending child
uniqueness, and endpoint ownership. Cycle prevention belongs in the
tenant-authority-service transaction because a row constraint alone cannot prove the
whole graph is acyclic.

## Creation And Acceptance

F4 does not implement reseller purchasing or customer self-service. Until F6
and later commercial policy exist, relationship creation is an internal,
audited platform-controlled operation for approved operational/test setup.

1. Create a `PENDING` record with immutable endpoints.
2. Verify tenants exist, differ, and have lifecycle compatible with setup.
3. Verify no pending/active parent already exists and no cycle is introduced.
4. Record platform initiator, reason, request ID, and evidence reference.
5. Obtain explicit acceptance from the later authorized subordinate role unless
   a separately audited platform recovery procedure applies.
6. Recheck every invariant in one authority transaction.
7. Activate and advance authority revision/invalidation.

No request field, settings value, namespace, entitlement reference, or parent
assertion creates a relationship. F6 may later add eligibility evidence without
making the relationship implicit.

## Narrow Parent Authorization Rule

A parent action is allowed only when all conditions hold:

```text
authenticated actor
AND active actor membership in parent tenant
AND PARENT_MANAGER role permits exact operation
AND explicit target tenant/site
AND active direct parent -> target relationship
AND target site belongs to target tenant
AND target lifecycle permits the operation
AND authority freshness is acceptable
AND receiving owner permits the operation
AND durable audit can record the decision
```

The relationship itself grants no membership, domain-data access,
authentication authority, or entitlement. There is no implicit target,
wildcard child, inherited membership, last-selected dashboard scope, transitive
descendant access, reverse access, or sibling access.

## Allowed F4 Parent Operations

The parent-management role is intentionally privacy-minimizing. Its F4
allowlist is limited to:

- read the subordinate's non-sensitive authority metadata needed to select the
  exact target: tenant/site IDs, display labels, lifecycle state, relationship
  state, channel/application status summaries, and authority revision;
- read membership rows using only opaque global user ID, scoped role,
  membership lifecycle state, target scope, and necessary timestamps;
- invite/create, change scoped role, suspend, reactivate, and revoke a
  subordinate membership through tenant-authority-service policy;
- invalidate the affected membership authorization after a membership change;
- view future feature-allocation summaries and request only delegable feature
  allocation changes after F6 defines and enforces them. F4 creates no feature
  grant and cannot expand the parent's entitlement.

It does not allow:

- email, phone, profile, credential hash, token, raw refresh session, IP,
  location, device history, activity history, orders, customer data, or other
  meaningful private data;
- global user disablement or global Auth session revocation;
- tenant/site lifecycle transitions, export, application/domain registration,
  Settings security/trust changes, billing, contracts, deployment, or
  infrastructure operations;
- Product, Blog, Media, Taxonomy, Cart, Order, storage, database, cache, job,
  event, search, vector, or audit-payload access.

Today Auth sessions are global. A parent therefore contains an incident by
suspending/revoking the target membership and invalidating that scope, not by
destroying sessions used by other tenants. A future Auth extension may expose
privacy-minimized tenant-scoped security summaries and tenant-scoped revocation
after tenant-scoped sessions exist. That is optional hardening and requires a
separate review.

Future parent-platform product display is deferred. It must use a deliberately
approved read-only projection owned and authorized by Product-service; this ADR
grants no direct or current product access.

## Target And Sibling Rules

- Every action names one target subordinate tenant and, for site-owned work,
  one target site.
- The target tenant must be the active direct relationship's child endpoint.
- The target site must belong to that child.
- Resource IDs, bodies, paths, queries, headers, JWT claims, application IDs,
  storage paths, and job/event payloads cannot switch the verified target.
- Acting on child A grants nothing for child B. A separate active link and a
  separately authorized request are required.
- Child A gains no access to its parent or siblings through the relationship.
- Business data remains in each owning domain database. No parent service or
  shared parent database is introduced.

## Revocation, Reassignment, Recovery, And Audit

- `SUSPENDED` or `REVOKED` immediately removes parent eligibility within the
  later freshness bound without globally revoking the actor's Auth session.
- `REVOKED` is terminal and retained as a tombstone/audit reference.
- Reassignment creates a new ID only after the old link is revoked and
  revisions/caches are reconciled.
- Restore preserves IDs/states, checks endpoints/cycles/multiple parents, and
  leaves uncertain links `SUSPENDED` rather than inferring `ACTIVE`.
- If required audit persistence is unavailable, relationship mutations and
  cross-tenant parent actions fail closed.

Every proposal, acceptance, state transition, and attempted/completed parent
action records actor user/membership/tenant, relationship/revision, explicit
target tenant/site/resource, operation, caller/target service, request ID,
result/reason, time, and old/new state when applicable. Tokens, secrets,
credentials, and sensitive payloads are excluded. ADR-0012 assigns the
append-only authority audit to tenant-authority-service, retains it for 365 days, and
requires intent/result reconciliation for cross-database parent actions.

## Options Compared

| Option                                                                        | Boundary and cost                                                                                           | Decision                                                      |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Explicit single-parent direct-edge record plus independent role/target checks | Bounds cycles, revocation, audit, privacy, and sibling behavior while preserving future eligibility.        | **Selected.**                                                 |
| Trust a `parentTenantId` field as permission                                  | Simple storage but conflates relationship data with authorization and lacks acceptance/revocation evidence. | Rejected. A denormalized field may never authorize by itself. |
| Transitive ancestor access                                                    | Convenient for reseller chains but substantially expands blast radius.                                      | Rejected for F4.                                              |
| Multiple active parents                                                       | Supports complex partnerships but creates conflicting administration and revocation semantics.              | Future consideration.                                         |
| Duplicate target memberships for parent managers                              | Reuses ordinary site roles but obscures cross-tenant provenance and lifecycle.                              | Rejected; direct relationship plus parent role is explicit.   |
| Broad tenant-admin equivalence                                                | Simplifies dashboards but exposes private/domain data and unsupported operations.                           | Rejected.                                                     |

## Failure-Oriented Review

| Concern             | Relationship decision                                                                                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Immutable directed endpoints, one pending/active parent per child, cycle rejection, direct-edge-only evaluation, exact target/operation, scoped role, lifecycle/freshness checks, minimal membership view, and mandatory audit.        |
| Detection           | Self/cycle/duplicate audits; direct child success; sibling/grandchild/reverse denial; stale/revoked link; wrong target; private-field response checks; membership invalidation; missing audit dependency.                              |
| Containment         | A bad link affects one direct pair and the narrow allowlist. It cannot issue tokens, access domain data, reveal profile/credential/session history, create entitlement, or alter siblings.                                             |
| Fail state          | Missing, pending, suspended, revoked, duplicated, cyclic, stale, contradictory, or unavailable relationship state denies the parent path without fallback to claims/settings/UI scope.                                                 |
| Recovery            | Restore/tombstone links, run endpoint/cycle/multiple-parent audits, suspend uncertainty, rebuild freshness, and reauthorize each explicit target.                                                                                      |
| Common-mode failure | Authority and membership operations may trust the same false link, and operators may control both. Minimal data responses, operation allowlists, pairwise S2S, and audit reduce but cannot eliminate this risk.                        |
| Evidence            | Concurrent create/transfer; self/cycle/duplicate denial; child allow; sibling/grandchild/reverse denial; link revocation; membership lifecycle/invalidation; private-data denial; audit outage; restore; no global-session revocation. |
| Residual risk       | A compromised platform operator/authority can establish a false direct link or misuse membership lifecycle. Two-person approval, commercial eligibility, tenant-scoped Auth sessions, and product projections remain unimplemented.    |

## Compatibility And Rollback

This ADR changes documentation only. No relationship exists to migrate. The
default single-site seed has no parent. Isolation tests may create one parent
with multiple direct children through authority-owned seed/test tooling.

Before references/audit exist, rollback may remove the additive records. After
references exist, rollback retains revoked tombstones and requires
reference/orphan/cycle audits. It never replaces explicit relations with a raw
trusted `parentTenantId`.

## Reserved For Later Items

[ADR-0008](0008-f4-scoped-roles.md) freezes the `PARENT_MANAGER` role and exact
role-operation matrix.
[ADR-0009](0009-f4-authoritative-request-scope.md) freezes the explicit
parent-target decision facts and opaque authority revision.
[ADR-0010](0010-f4-signed-context-compatibility.md) places the active direct
relationship ID in strict context v2 for the parent path. ADR-0011 freezes the
physical relationship matrix and migration evidence, while ADR-0012 makes every
parent action live-required and freezes durable audit/failure behavior. F6 owns
feature execution. Billing, contracts, reseller dashboards, product
projections, and tenant-scoped Auth session features remain deferred.

## Repository Evidence

- `docs/architecture/tenant-package-channel-platform.md`
- `docs/architecture/actor-context-contract.md`
- `docs/reports/2026-08-24-f4-authority-audit.md`
- `TODO-ALTERNATIVE.md`, F4 and deferred commercial scope
- [ADR-0001](0001-f4-authority-owner.md)
- [ADR-0002](0002-f4-f6-entitlement-boundary.md)
- [ADR-0003](0003-f4-authority-identifiers.md)
- [ADR-0004](0004-f4-authority-lifecycle.md)

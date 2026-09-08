# ADR-0002: F4 Entitlement Reference And F6 Execution Boundary

Date: 2026-08-24

Status: accepted for the F4 Batch 1 phase-boundary decision. Batch 2 item 3
stages only the tenant/site-bound `EntitlementScopeRef` persistence skeleton;
typed resolution, seeds, consumers, and all F6 capability behavior remain
later checklist items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
the non-granting F4 anchor and F6 execution boundary remain accepted. A
realm-wide consumer subscription is not a role; F6 must intersect its
server-owned capability with the exact licensed target/application and actor
permission. References to global identity/session ownership are superseded by
realm Auth ownership.

## Context And Classified Findings

NebulaNV currently has no feature catalog, plan, contract, entitlement,
installed-module, license-manifest, billing, or capability-execution schema or
runtime. This is a **confirmed gap against the future F6 requirement**, not a
defect in the completed F3 single-site gateway.

The adopted roadmap gives F4 ownership of entitlement records so later domain
data and request scope have one tenant/site authority. It gives F6 the modular
feature and entitlement foundation: feature keys and types, allocations,
effective capability calculation, signed deployment-bound manifests, license
lifecycle, module deployment state, client capability presentation, and a proof
module.

The target platform document describes a larger conceptual commercial model
without assigning each part to F4, F6, or deferred commercial SaaS work. That
is **stale documentation ambiguity**, not evidence that those tables or
behaviors exist. This ADR and the accompanying phase note remove the ambiguity.

Full billing, reseller productization, commercial dashboards, and licensed
module operations at scale remain deferred roadmap scope. They are neither F4
nor required F6 implementation.

## Decision

Tenant-authority-service owns a minimal tenant/site entitlement anchor whose
conceptual contract is named `EntitlementScopeRef`.

An `EntitlementScopeRef` is:

- an opaque reference issued by tenant-authority-service, never selected or minted by
  a public client;
- bound to exactly one authoritative tenant and optionally one site belonging
  to that tenant;
- resolvable through a typed internal authority contract as known-and-bound,
  unknown, or bound-to-a-different-scope;
- only a reference and scope-integrity fact during F4.

Its existence does **not** grant a feature, imply a plan, enable every module,
or express an effective capability. A raw reference in a header, body, query,
JWT claim, job/event payload, cache key, or domain row is data to verify, not
authorization.

The final schema/type name, identifier format, uniqueness/cardinality,
revision/freshness fields, and transport placement remain subject to the later
Batch 1 identifier, request-scope, signed-context, data-matrix, and failure
decisions. Those later choices may refine representation but must preserve the
semantics above.

## F4 May Implement

F4 may:

- persist the minimal authority-owned entitlement scope/reference skeleton;
- bind and validate that reference against authoritative tenant/site ownership;
- expose only the typed internal lookup needed for reference and scope
  integrity;
- add nullable, additive cross-service references only where the later approved
  data matrix proves they are needed;
- seed stable references for the default and isolation-test scopes if the
  approved migration/seed plan requires them;
- log and test unknown, forged, stale, or cross-scope reference denial;
- preserve extension points for F6 without adding premium fields to core domain
  schemas.

No existing core F4 operation becomes feature-gated merely because this anchor
exists. Until F6 defines an applicable capability, tenant/site membership,
resource ownership, lifecycle, and domain policy continue to decide core
access.

## F4 Must Not Implement

F4 must not implement or infer:

- feature definitions or versioned feature keys;
- boolean, metered, allocated, or non-delegable capability types;
- plans, plan features, pricing, invoices, payment state, billing-provider
  identifiers, contracts, or commercial acknowledgements;
- feature grants, limits, site/channel allocations, or user-permission
  intersections;
- `ACTIVE`, `EXPIRING`, `GRACE`, `SUSPENDED`, or `TERMINATED` license behavior;
- grace timing, server-authoritative license time, warnings, emergency
  revocation, read/export terms, or retention policy;
- signed entitlement leases/manifests or client capability manifests;
- installed-module versions, image digests, deployment health, compatibility,
  installation, rollback, or removal;
- entitlement-aware module routing or a proof module;
- licensing, billing, reseller, or commercial dashboards.

A generic `enabled`, `hasEntitlement`, wildcard feature, default plan, or
allow-all flag is forbidden in F4 because it would become an undocumented F6
policy and an unsafe authorization shortcut.

## F6 Owns Technical Entitlement Execution

F6 will decide and implement the technical modular-capability foundation:

- versioned feature definitions and capability types;
- tenant/site/channel allocation and limits;
- installed-module and deployment compatibility/health state;
- signed deployment-bound entitlement manifests and license lifecycle;
- effective-capability evaluation as the intersection of entitlement,
  allocation, deployed module, channel/build support, actor permission, and
  license state;
- server-side enforcement plus a presentation-only signed client capability
  manifest;
- the independent proof module and its install/upgrade/rollback/removal
  evidence.

F6 must consume the F4 tenant/site binding rather than create a second tenant
authority. It may extend the authority-owned entitlement aggregate and typed
contracts, but it must not move global identity, token/session ownership,
domain data, or module deployment truth into tenant-authority-service.

Billing, customer/reseller commercial operations, and full commercial
dashboards stay deferred even after F6 unless the roadmap is explicitly
expanded with evidence and approval.

## Options Compared

| Option                                                                             | Compatibility and cost                                                                                                                                                                | Decision      |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| F4 persists only a tenant/site-bound entitlement anchor; F6 adds feature execution | Gives F6 a stable authority reference without inventing feature or commercial policy. Adds a small F4 persistence/validation obligation but preserves the adopted phase order.        | **Selected.** |
| F4 implements feature-key grants or an enabled flag                                | Appears convenient for early checks but duplicates F6 decisions, creates a provisional security contract, and risks becoming a permanent allow-all or incompatible schema.            | Rejected.     |
| Defer every entitlement record and reference to F6                                 | Avoids F4 persistence but leaves F6 without the F4-owned tenant/site entitlement anchor required by its entry dependency and prevents the F4 data/scope matrix from naming the owner. | Rejected.     |
| Put commercial contracts or billing identifiers in the F4 anchor                   | Couples tenant isolation to provider/commercial design that is explicitly outside the active foundation scope.                                                                        | Rejected.     |

## Failure-Oriented Review

| Concern             | Phase-boundary decision                                                                                                                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Only tenant-authority-service issues and resolves the reference. Exact tenant/site binding is checked through typed internal calls. Presence never grants capability, and no client assertion can create or widen the binding.                                                               |
| Detection           | F4 evidence must distinguish unknown, malformed, stale, and cross-scope references. F6 later adds feature-decision, manifest, license-time, and module-state evidence.                                                                                                                       |
| Containment         | A forged or copied reference cannot change verified tenant/site scope. Compromise of the F4 anchor can misbind future entitlement scope, but cannot by itself create an F6 feature grant because no grant semantics exist in F4. Independent Auth and domain authorization remain required.  |
| Fail state          | F4 core operations do not depend on an undeveloped entitlement decision. If a later operation explicitly requires entitlement, unknown/mismatched/unavailable resolution denies it; absence is never interpreted as allow-all. ADR-0012 permits no entitlement-dependent safe-degraded path. |
| Recovery            | F4 must prove reference persistence, restore, and tenant/site reconciliation. F6 owns recovery of feature grants, manifests, module state, cache, and license lifecycle. Restoring an anchor alone must not activate a module.                                                               |
| Common-mode failure | Authority outage affects both tenant/site and future entitlement-scope resolution. F6 must not hide that outage with client flags or unsigned cached grants. Shared infrastructure and operator compromise remain residual risks.                                                            |
| Evidence            | F4: server issuance, exact binding, cross-scope/unknown denial, seed rerun, migration/restore, and no implicit grant. F6: capability intersection, manifest validation, time/lifecycle, module outage/removal, client-flag bypass denial, and rollback.                                      |
| Residual risk       | The anchor intentionally cannot prove a feature is allowed, so it provides no premium-feature enforcement until F6. Adding premature capability behavior during F4 would be a security and compatibility defect, not harmless hardening.                                                     |

## Compatibility And Rollback

The additive F4 skeleton is now staged in the authority schema and migration.
It still changes no API, proto, signed context, seed, consumer, or runtime
authorization behavior.

The F4 skeleton must be additive. Before any domain data or F6 record references
it, the skeleton can be removed through the approved authority migration
rollback. After another database or F6 aggregate stores the reference, removal
requires a reference inventory, backfill or detachment plan, orphan audit, and
rollback evidence. Consumers must never fall back to a raw tenant/site/client
value when resolution fails.

## Repository Evidence

- `TODO-ALTERNATIVE.md`, F4 and F6 phase contracts
- `docs/current-focus.md`, F4 Batch 1 and Batch 2 gates
- `docs/architecture/tenant-package-channel-platform.md`
- [ADR-0001](0001-f4-authority-owner.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`

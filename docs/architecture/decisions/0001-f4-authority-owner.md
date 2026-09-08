# ADR-0001: F4 Authority Owner

Date: 2026-08-24

Status: accepted for the F4 Batch 1 ownership decision. The Batch 2 foundation
is staged without authority records or traffic authority.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
tenant-authority-service remains the selected tenant/site authority, but the
platform-global User/Auth population is superseded by isolated customer-root
identity realms. Tenant Authority owns realm/trust routing metadata, never
customer credentials, sessions, or private signing keys.

Naming clarification: on 2026-08-25 the runtime name was refined from the
ambiguous `authority-service` to `tenant-authority-service`. This does not
change the selected boundary or the authority domain: `auth-service` owns
authentication and sessions, while `tenant-authority-service` owns durable
tenant/site/application/membership authority.

## Decision Scope

This ADR selects one durable owner for the authority records required by F4.
It does not approve a schema, migration, proto, cache, runtime contract, role
catalog, signed-context revision, or production rollout.

The selected boundary is a dedicated `tenant-authority-service`, backed by its own
service-owned database. It will be the authoritative owner of:

- tenants and sites;
- presentation channels;
- explicit parent/subordinate relationships;
- tenant memberships and site grants;
- application registrations;
- verified web domain/origin registrations;
- verified Android package/application and iOS bundle/application identities;
- tenant/site entitlement scope/reference records.

The last item selects only the durable record owner. Its minimal reference
semantics and the F4/F6 phase boundary are frozen separately by
[ADR-0002](0002-f4-f6-entitlement-boundary.md). F4 must not silently implement
module licensing, billing, commercial dashboards, or entitlement execution as
a consequence of this ADR.

## Context And Classified Finding

The current repository has a working F3 single-site bridge:

- the gateway validates a static deployment-supplied application registry and
  resolves an application/tenant/site/channel tuple;
- the gateway derives request context and `@nebula/clients` signs downstream
  calls;
- `@nebula/grpc-auth` verifies the S2S envelope and signed context;
- User-service owns global user identity, credential hashes, profiles, and the
  current global role string;
- Auth-service owns JWT issuance, refresh sessions, token version, disablement,
  and live token/session validation in Redis;
- Settings-service owns safe namespaced business/application configuration;
- each domain service owns and authorizes its own business data in a separate
  database.

The F3 bridge is preserved. Its absence of persistent tenant, site,
registration, relationship, membership, and entitlement authority is a
**confirmed defect against the adopted F4 requirement**, not an F3 regression.
The repository also has no single existing boundary whose current data and
responsibilities form this authority aggregate.

Mobile attestation, confidential partner credentials, and separate Redis
failure domains remain **optional hardening**. Distributed authority caches,
global control planes, and cross-region replication remain **future scaling
considerations**. Neither category changes the owner decision.

## Boundaries Preserved

| Existing boundary                         | Preserved ownership and compatibility rule                                                                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway                                   | Remains the only public HTTP API boundary. It resolves registrations through the existing `ApplicationRegistry` interface and derives signed ingress context, but it is not the durable authority or final domain authorizer. |
| User-service                              | Continues to own global people, credential hashes, profile data, and the migration source for current global roles. Global identity remains separate from tenant membership and site grants.                                  |
| Auth-service                              | Continues to own JWTs, refresh sessions, token/session revocation, token version, disablement, and actor authentication. Authority-service does not become a second token authority.                                          |
| Settings-service                          | Continues to own safe application/business configuration. Authority records are not encoded as generic settings keys.                                                                                                         |
| Domain services                           | Continue to own their business records and databases. Each sensitive service repeats target-resource and tenant/site authorization instead of treating gateway admission as sufficient.                                       |
| `@nebula/grpc-auth` and `@nebula/clients` | Continue to own verified signed context/envelope behavior and typed service transport. Any context evolution must use the later compatibility decision.                                                                       |
| Media-service                             | Continues to own media metadata, access policy, object-key policy, and provider access. Authority-service owns tenant/site registration facts, not storage bytes or media policy.                                             |

Services must use typed contracts to validate authority references. They must
not query the authority database directly or add cross-database foreign keys.

## Options Compared

| Candidate                                 | Boundary fit and compatibility                                                                                                                                                                                                                                                                            | Migration, failure, and maintenance cost                                                                                                                                                                                                                                                                                    | Decision                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dedicated tenant-authority-service        | Cohesively owns the tenant/site/application/membership relationship graph without moving global identity, sessions, edge policy, configuration, or domain data. Fits the existing service-owned database and typed-client model. The gateway can replace its static adapter behind `ApplicationRegistry`. | Adds a runtime, database, migrations, typed contracts, deployment/configuration, readiness, backup/restore, monitoring, and runbooks. It becomes an availability dependency and creates a concentrated authorization blast radius that must be contained by independent Auth and domain checks.                             | **Selected.** The cost is justified because it preserves all existing boundaries while giving the aggregate one lifecycle and revision owner.           |
| Extend User-service                       | Reuses a database and the global user identifier.                                                                                                                                                                                                                                                         | Mixes global identity/profile/credentials with tenant/site/app/domain/entitlement administration; makes anonymous application resolution depend on the user boundary; deepens the Auth↔User common-mode path; and turns non-user tenant records into User-service responsibilities.                                        | Rejected from explicit ownership evidence. User-service remains global identity, not tenant authority.                                                  |
| Extend Auth-service                       | Reuses the service already consulted for actor validation and invalidation.                                                                                                                                                                                                                               | Auth currently has no service database and owns token/session state, not organizational data. It would still require a new durable database while coupling login/session availability to application/domain and membership administration.                                                                                  | Rejected. Authentication and durable tenant authorization remain independently owned and coordinated through explicit invalidation/freshness contracts. |
| Extend Settings-service                   | Reuses a database and an admin-managed read/write surface.                                                                                                                                                                                                                                                | The current `(namespace, environment, key)` model is safe configuration, not a relational authority graph. It lacks the ownership semantics and constraints required for relationships, memberships, verification, lifecycle, revision, and audit. It also explicitly excludes tenant authority, role hierarchy, and trust. | Rejected from explicit ownership and schema evidence.                                                                                                   |
| Persist in gateway                        | Keeps application lookup local to ingress and could implement `ApplicationRegistry` directly.                                                                                                                                                                                                             | Gateway currently has no database and is the public edge. Making an edge compromise authoritative would remove a containment boundary, expand gateway maintenance, and encourage domain services to trust gateway admission as final authorization.                                                                         | Rejected. Gateway consumes authority and preserves its replaceable registry seam.                                                                       |
| Distribute records across domain services | Preserves each domain database and avoids one new service.                                                                                                                                                                                                                                                | No domain owns the complete relationship graph. Distribution creates cross-service lifecycle transactions, inconsistent revocation/reassignment, duplicated verification, and no single revision or audit owner.                                                                                                            | Rejected. Domain services keep business data and independent checks, not fragments of the authority aggregate.                                          |

### Why A Narrower Existing-Service Change Is Insufficient

Replacing the static JSON with a table in Gateway, User, Auth, or Settings would
solve only persistence. It would not preserve the required separation among
global identity, authentication, public ingress, configuration, and tenant/site
authorization. Splitting tables among those services would also leave
membership, application, parent-link, and entitlement lifecycle changes
without one authoritative revision and audit boundary. The dedicated service
is therefore the narrowest design that satisfies the complete ownership
requirement, despite its larger operational cost.

## Failure-Oriented Decision

This table freezes owner-level behavior. ADR-0012 now supplies the exact
operation classes, cache durations, invalidation, audit, and failure evidence.

| Concern             | Owner-level decision                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Public headers, bodies, queries, paths, job payloads, client storage, and unverified JWT claims never create authority. Gateway resolves only active verified registrations. Auth verifies the actor independently. Domain services validate target scope and resource ownership independently through typed contracts and their own data.                                                      |
| Detection           | Authority readiness, registration/membership/lifecycle changes, denied scope mismatches, invalid references, stale revisions, and cross-scope attempts require observable evidence. ADR-0012 assigns durable authority audit to tenant-authority-service and freezes its minimum event fields.                                                                                                  |
| Containment         | Authority-service cannot issue JWTs, store password hashes, own domain rows, or replace service-local authorization. A compromised gateway cannot directly mutate authority through trusted request headers. A compromised authority can misgrant scope, so downstream resource ownership checks and Auth freshness remain mandatory containment layers.                                        |
| Fail state          | There is no automatic production fallback from persistent authority to static registry data. Authority-dependent writes and sensitive authorization fail closed when freshness cannot be established. ADR-0012 permits only allowlisted anonymous public reads for an absolute 60-second safe-degraded window; every other outage path denies.                                                  |
| Recovery            | The service needs database backup/restore, migration recovery, cache rebuild, readiness, reference reconciliation, and revision revalidation evidence before F4 exit. Restored authority state must not silently revive revoked registrations, memberships, or membership epochs under ADR-0004/0011/0012.                                                                                      |
| Common-mode failure | Authority and Auth will both participate in access decisions, and deployments may share operators, configuration distribution, Redis, networking, or host infrastructure. Pairwise S2S identity and separate ownership reduce but do not eliminate common-mode risk. F9 owns broader infrastructure isolation.                                                                                  |
| Required evidence   | Outage/restart/restore, wrong-scope context, stale membership/role, bad or expired cache, revoked registration, cross-site valid-ID, wrong caller/target, and rejection of production static fallback must be covered in the later test and migration matrices.                                                                                                                                 |
| Residual risk       | Authority-service is a central availability dependency, and compromise of its database or administration path can create valid-looking grants. Independent authentication and domain authorization contain some consequences but cannot make a false authoritative membership harmless. Operator separation, stronger infrastructure isolation, and regional replication are not claimed by F4. |

## Compatibility And Migration Consequences

No current runtime contract changes when this ADR is accepted.

The later implementation must:

1. add authority persistence and typed contracts without allowing direct
   cross-service database access;
2. provide a persistent `ApplicationRegistry` adapter so gateway callers retain
   the existing interface;
3. retain the static adapter only for explicitly identified development, test,
   and migration compatibility windows;
4. preserve Auth token/session ownership and connect authority freshness to
   Auth invalidation or a bounded verified authority check through a later
   decision;
5. keep domain services independently responsible for resource and target-scope
   checks;
6. include the new database/runtime in migration, seed, Compose/Bake, health,
   CI, backup/restore, scan, and operational evidence before production use.

There must be no silent production fallback to static authority after the
persistent adapter is authoritative. Such a fallback could re-enable revoked
applications or memberships.

## Rollback Boundary

This decision is documentation-only and freely reversible until an authority
runtime or schema is approved.

During a later explicit single-site compatibility window, deployment may roll
back to a frozen, known-good static adapter only if no second tenant/site and no
persisted application, membership, relationship, or entitlement record is
required by stored domain data. That rollback must be an operator-selected
deployment mode, never an outage fallback.

Once authority identifiers or relationships are referenced by service-owned
databases—or multi-tenant data exists—returning ownership to static
configuration or an existing service is a data migration with reconciliation
and rollback evidence, not a configuration toggle.

## Delegated Batch 1 Decisions

Except for the entitlement phase boundary now frozen by ADR-0002, authority
identifier rules frozen by [ADR-0003](0003-f4-authority-identifiers.md), and
lifecycle rules frozen by [ADR-0004](0004-f4-authority-lifecycle.md), channel
semantics frozen by [ADR-0005](0005-f4-channel-semantics.md), and registration
rules frozen by [ADR-0006](0006-f4-application-registration.md), and direct
parent-link rules frozen by [ADR-0007](0007-f4-parent-relationships.md), this
ADR, together with [ADR-0008](0008-f4-scoped-roles.md), now delegates the
authoritative request-scope semantics to
[ADR-0009](0009-f4-authoritative-request-scope.md), signed-context
compatibility to [ADR-0010](0010-f4-signed-context-compatibility.md), and the
schema/backfill/reference matrix to
[ADR-0011](0011-f4-data-scope-and-migration-matrix.md). ADR-0011 now freezes
taxonomy sharing policy, per-service columns/constraints, backfills, orphan
queries, and rollback boundaries.
[ADR-0012](0012-f4-failure-freshness-audit-and-recovery.md) freezes operation
classes, freshness/cache/invalidation, audit, outage, race, storage recovery,
and common-compromise behavior.
[ADR-0013](0013-f4-ordered-additive-migration-sequence.md) freezes the
owner-before-consumer deployment and traffic gates. Later batches must use
those decisions rather than infer new behavior from this owner ADR.

## Repository Evidence

- `docs/reports/2026-08-24-f4-authority-audit.md`
- `docs/architecture/system-relationships.md`
- `docs/architecture/tenant-package-channel-platform.md`
- `docs/architecture/actor-context-contract.md`
- `docs/architecture/s2s-security-contract.md`
- `docs/services/gateway.md`
- `docs/services/user-service.md`
- `docs/services/auth-service.md`
- `docs/services/settings-service.md`
- `apps/gateway/src/application/application.contracts.ts`
- `apps/gateway/src/application/application-registry.ts`
- `apps/user-service/prisma/schema.prisma`
- `apps/settings-service/prisma/schema.prisma`
- root `package.json` backend inventory

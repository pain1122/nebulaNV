# Tenant Authority Service

## Current Status

Batch 2 and Batch 3 items 1 through 4 are complete. Scoped-membership
persistence, legacy-role backfill, and default role fixtures are implemented
and proven in clean disposable User and Authority databases. The internal
explicit target/actor authority resolver is implemented. Batch 3 item 5 is
paused until ADR-0015 R11; Batch 1R's identity-realm correction is complete,
and corrective Batch 3R R1 persistence is complete. R1 adds only inactive
control-plane schema and development seed records; it has no runtime reader or
traffic effect. R2 additive actor backfill completed on 2026-09-08, R3 Realm
Auth shadow completed on 2026-09-09, and R4 staged admin split completed on
2026-09-12. R5 dormant receivers are next. The implemented
membership and resolver remain default-realm compatibility evidence, not the
final realm-qualified design.
Tenant, Site, Channel, Application, WebOrigin,
AndroidIdentity, IosIdentity, direct ParentRelationship,
EntitlementScopeRef, retained client handles, audit events, invalidation outbox
events, Membership, immutable MembershipEpoch, and tenant/site/platform grant
records are now owned here. IdentityRealm, IdentityProviderRegistration,
ApplicationIdentityPolicy, and FederationTrust are also persisted here as the
inactive R1 control plane.

The minimal EntitlementScopeRef is also staged with exact tenant/site binding,
but it contains no feature, plan, enabled, limit, license, module, allocation,
or billing behavior. Thirty-four default-tenant memberships now exist in the
normal development database: 33 exact legacy mappings plus a dedicated
content-only editor fixture. The guarded clean disposable verifier uses the
minimal four-fixture graph (root admin, site admin, user, and editor) while
proving the same ordering and cardinality rules. No membership transport, verification challenge,
remote mutation API, outbox dispatcher, or active consumer is included. The gateway
still uses `StaticApplicationRegistry` at `G0_F3_BASELINE`;
tenant-authority-service cannot admit traffic or authorize a domain operation.

The name is deliberate: `auth-service` authenticates a realm subject and owns
that realm's credentials/tokens/sessions; tenant-authority-service owns durable
realm routing/trust plus tenant/site/application
facts and scoped membership authority. A valid Auth session does not itself
grant access to a tenant or site, and tenant-authority-service cannot issue or
validate a JWT itself. The shared token guard delegates any presented bearer
validation to `auth-service` through the existing Auth gRPC client; no JWT key
is duplicated here. Domain services still make the final resource/operation
check against their own data.

## Implemented Boundary

- Workspace: `apps/tenant-authority-service`
- Runtime package: `@nebula/tenant-authority-service`
- Dedicated database: `nebula_authority`
- Local diagnostic HTTP port: `3011`
- Internal gRPC port: `50059`
- Public/business HTTP routes: none
- Typed client: `getTenantAuthority` from `@nebula/clients`
- Health routes: `GET /health`, `GET /health/live`, and `GET /health/ready`
- Migration owner: existing inventory-backed Prisma tooling
- Runtime database role: `nebula_authority_runtime`

The runtime role receives a direct connection grant only for the authority
database and has no superuser, database-creation, role-creation,
schema-creation, migration-write, hard-delete, or direct cross-service
schema/table grant.
The deployment administrator still owns migrations. Authority configuration
deliberately omits JWT secrets and domain-database credentials. The gRPC listener uses
the existing pairwise S2S envelope and Redis replay claims; release deployment
must supply its inbound trust map independently.

## Inactive Identity Control Plane

Batch 3R R1 adds the public routing/trust facts frozen by ADR-0015 without
activating them. One reviewed manifest fixes two realms (default consumer and
platform operator), two `NEBULA_LOCAL` provider registrations, four current
draft application policies, four pending default-local trusts, and one pending
admin-web operator-local trust. Realm route references are opaque UUIDs, not
hostnames or endpoints.

The migration enforces owner topology, one non-revoked platform-operator realm,
one non-revoked default consumer realm per licensed root, one current policy
per application, exact trust tuple uniqueness, provider/realm consistency,
immutable identity, monotonic lifecycle/revision changes, retained history,
and no runtime hard delete. The create-only development seed is serializable,
advisory-locked, audited, outboxed, idempotent only for its exact bootstrap
state, conflict-denying for partial/changed state, and refused in production.

All R1 states are non-admitting and no repository, service, controller, proto,
typed client, Auth/Gateway integration, context field, or registry replacement
reads them. `StaticApplicationRegistry` and current Auth therefore remain the
only traffic path. Later lifecycle mutation must use an audited owner workflow;
R6—not R1—may activate the exact default cohort. Once that happens, later clean
verifiers must expect the versioned post-activation state rather than rerun a
bootstrap seed to reset it.

## Membership Authority Foundation

Current `Membership` preserves its stable tenant/legacy-user pairing and adds
nullable `identityRealmId` and `subjectId` beside `userId`. It never stores
email, phone, password, profile, token, or session data. The User ID is a
canonical UUID reference validated at the authority boundary, not a
cross-database foreign key and not authorization by itself.

ADR-0014 preserves the stable membership/epoch/grant mechanism but supersedes
the bare actor reference. The target stores `(identityRealmId, subjectId)` and
uniquely binds membership to `(tenantId, identityRealmId, subjectId)`. The
existing User UUID remains the default realm subject during additive backfill.
Tenant Authority also gains `IdentityRealm`, public provider/trust metadata,
`ApplicationIdentityPolicy`, and `FederationTrust`; it still never stores
password hashes, provider secrets, raw sessions, or private signing keys.

Each usable membership points to one immutable `MembershipEpoch`. Its internal
positive generation is HMACed with the stable membership ID and a dedicated
authority key over the frozen canonical JSON-array input. The resulting
`meg1_...` reference is fixed-length, unique, and immutable; the numeric
generation and key never leave authority. Re-invitation must create a new epoch
instead of reopening one that was revoked.

Tenant grants use only `TENANT_ADMIN` or `PARENT_MANAGER`; site grants use only
`SITE_ADMIN`, `EDITOR`, or `USER`; platform grants use only
`PLATFORM_ADMIN`. These are exact target-bound roles, not a hierarchy. Database
constraints preserve same-tenant Site scope, at most one active tenant grant
per exact epoch and role, at most one active site grant per epoch/site, current/open epoch
consistency, immutable role/target identity, terminal revocation, and retained
history. ADR-0015 changes the future tenant-grant constraint to at most one
active grant per `(epoch, tenantRole)` so exact `TENANT_ADMIN` and
`PARENT_MANAGER` grants can coexist without permission union; that target is
not implemented yet.

The User-owned legacy audit/export and Authority-owned importer preserve the
database boundary: neither service directly reads or writes the other's
database. Backfill is serializable, HMAC-audited, invalidation-producing, and
idempotent. Invalid roles grant nothing. In current compatibility data, the
dedicated editor remains a global User/Auth `user` and receives only the
default site's `EDITOR` grant; the historical root identity has both
`PLATFORM_ADMIN` and the main tenant's `TENANT_ADMIN`. ADR-0014 forbids carrying
that dual identity unchanged into the separate operator/customer realms.
ADR-0015 preserves the UUID, Membership/epoch, and `TENANT_ADMIN` in the
customer realm, adds exact `PARENT_MANAGER`, and stages a distinct operator-
realm subject before atomically replacing only the `PLATFORM_ADMIN` grant at
R8. Schema work must follow R0-R11: R0-R2 are complete, while R3-R11 remain ordered
future gates.

The clean-order defect found by the Batch 3 retrospective is repaired. The
general User seed creates only the bounded legacy root-admin/admin/user
fixtures. A dedicated non-production item-3 command creates the editor after
the original legacy snapshot is backfilled. The importer is rerun with that
bounded snapshot, never with a regenerated manifest that would misclassify a
later identity as pre-migration data. `db:verify:f4-batch3-role-seeds` proves
the complete order, reruns, exact final graph, SQL evidence, and partial-failure
cleanup from disposable User and Authority databases.

No membership mutation/list API is exposed. The read-only actor-authority RPC
returns one exact target/path role fact but cannot authorize a domain resource
or change traffic. Freshness/invalidation consumption and the complete denial
matrix remain later ordered Batch 3R items after the preceding ADR-0015 gates.

## R2 Additive Actor Compatibility

The seventh Authority migration backfills Membership and PlatformGrant into
`b1000000-0000-4000-8000-000000000001`, preserving each legacy UUID as `subjectId`.
Compatibility triggers populate new legacy-only writes and reject partial or
contradictory pairs. Existing IDs, revisions, epochs, `meg1_`, grants, and
legacy readers retain their meaning. The customer PlatformGrant remains until
the separate R8 swap.

`backfill:f4-default-actors` records one v2 outbox fact per persisted actor
reference and one bounded audit summary in a serializable, advisory-locked
transaction. Exact reruns return `ALREADY_CURRENT`; partial evidence conflicts.
The separate v2 audit writer preserves the v1 signing shape and historical
payloads/hashes. The v1 writer selects only `id` when returning an insert so
the current seed also works on the pre-R2 schema.

`pnpm db:verify:f4-r2-default-actors` proves populated upgrades for Authority,
Media, Order, and Product plus two failed-migration rollbacks. The extended
role-seed verifier proves four exact memberships and one platform grant,
unchanged legacy history, and exactly five v2 outbox facts plus one v2 audit
across earlier-seed reruns. Full evidence is in the
[R2 execution record](../reports/2026-09-01-f4-batch3r-execution-checklist.md#r2_default_actor_backfill).

This is migration compatibility. User/Auth remains the identity/session source;
realm subject lookup, sessions, context v3, and traffic cutover belong to later
ordered gates.

## Internal Read Contract

`tenant_authority.v1.TenantAuthorityService` exposes exactly five unary reads:

- `ResolveApplicationRegistration` verifies active tenant/site/application,
  channel/profile compatibility, and the exact verified web or native identity;
- `ListAllowedWebOrigins` projects only verified origins of active WEB
  registrations for the gateway CORS adapter;
- `ValidateTargetScope` proves that an active Site belongs to the requested
  active Tenant;
- `ResolveEntitlementScopeRef` proves only the reference's exact tenant/site
  binding. Its presence grants no feature or operation;
- `ResolveActorAuthorization` resolves an explicit actor/path/operation/target
  to exactly one active membership/current epoch/matching grant, direct-parent
  path, or platform grant and an opaque target-specific revision.

The original four methods remain `InternalOnly`; all five require signed S2S
identity and exact caller-kind/name allowlists. The actor resolver additionally
requires live bearer validation, exact signed/Auth user-session agreement, and
the strict context-v2 `RESOLUTION/AUTHORITY` receiver declaration. Application
and origin projection are gateway-only; target, entitlement, and actor facts
admit only the named gateway/Auth/domain workloads once each consumer receives
a pairwise key. There is no HTTP business controller and no generic create,
update, delete, list-records, or arbitrary lookup RPC.

Responses distinguish resolved, unknown, inactive, identity mismatch, scope
mismatch, contradictory, and actor-authority denied states. Only `RESOLVED`
includes usable facts. Those facts remain necessary inputs, not final
authorization: the receiving server owns operation eligibility, Auth still
proves the actor/session, and every domain service still checks its own stored
resource. Malformed input is `INVALID_ARGUMENT`; database/read failure is
`UNAVAILABLE` with no static or request-data fallback.

### Failure-Oriented Review

| Concern             | Item 4 decision                                                                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Versioned generated messages, fixed typed-client methods, exact caller identities, pairwise S2S verification, canonical input checks, active lifecycle checks, verified identity checks, and exact tenant/site comparison prevent raw request facts from becoming authority.                        |
| Detection           | Closed resolution statuses distinguish absence, inactivity, identity mismatch, scope mismatch, and contradiction; readiness detects database/migration failure; unexpected read failures emit a content-free service error.                                                                         |
| Containment         | The surface is read-only, has no public business HTTP route, does not issue JWTs or capabilities, and cannot replace Auth or domain-owned authorization. Application/origin reads are gateway-only.                                                                                                 |
| Fail state          | Invalid input is `INVALID_ARGUMENT`; an authority/database failure is `UNAVAILABLE`; every non-resolved record omits authority facts. There is no downgrade to headers, bodies, JWT claims, Settings, or static data for domain checks.                                                             |
| Recovery            | Restore the authority database/migrations or pairwise key/Redis configuration and retry. The F3 static registry remains primary only at the explicit pre-migration traffic gate.                                                                                                                    |
| Common-mode failure | Gateway or S2S-key compromise can submit valid-looking reads but cannot create authority rows through this contract; independent Auth proof and domain resource checks remain required. Database/operator corruption is contained as a closed contradiction or unavailable result where observable. |
| Evidence            | Generated-contract stale check, signed wrapper test, exact-controller policy test, lifecycle/identity/scope denial tests, shared gRPC wiring test, service lint/types/build, Compose rendering, and inventory tests.                                                                                |
| Residual risk       | No live consumer uses the actor decision yet. Invalidation/freshness, consumer operation/resource enforcement, outbox dispatch, full identity verification/transfer workflows, and live integration belong to their ordered later items.                                                            |

## Auditable Registration Mutation Foundation

`RegistrationMutationService` exposes no network route. It is an internal
engine for controlled authority-owned creation of pending applications,
display-name updates, and terminal application revocation. A future
administrative transport cannot call it until Batch 3 supplies verified scoped
roles; item 6 may reuse it only under its controlled seed/system path.

Each successful mutation writes application state, the new revision, one
`AuthorityInvalidationOutbox` event, and one HMAC-chained
`AuthorityAuditEvent` in the same Prisma transaction. Audit insertion failure
therefore rolls back the state change. The audit key stays in runtime
configuration; only its key ID and event hashes are stored. A monthly chain
partition is serialized with a PostgreSQL transaction advisory lock. The
runtime role can insert but cannot update or delete audit events.

Unknown applications/channels, inactive or mismatched scope, incompatible
channel/profile, disabled/revoked update targets, and stale revisions return
stable denied reasons after a durable denied audit. Optimistic revision writes
close concurrent update/revoke races. Revocation tombstones every active client
handle and revokes all current platform identities before the deferred database
registration constraint is checked at commit.

`ApplicationClientHandle` makes readable F3 aliases and bounded rotations
additive. Handles are globally unique and never reassigned; tombstones are
terminal. Lookup consults handle history first, so a tombstoned canonical
handle cannot bypass rotation through the older Application column. Direct
UUID lookup remains only as a compatibility path for pre-handle rows.

This is not a generic CRUD implementation. Ownership fields cannot be changed
by the update command, transfer/reassignment is absent, audit and outbox are
not externally writable, and there is still no registration write RPC or HTTP
controller. Full verification-provider, activation, identity rotation, atomic
cross-application transfer, dispatcher, and scoped administrator flows remain
later ordered work.

## Default Development Authority

`DEFAULT_DEVELOPMENT_AUTHORITY` v1 owns stable UUIDv4 identifiers for one
active development tenant, one active primary site, the site's `WEB`,
`ANDROID`, and `IOS` channels, and four active applications. Storefront and
admin are separate applications on the same WEB channel. Android and iOS are
separate mobile-profile applications with separate controlled development
identity evidence.

Every application receives an independent UUID canonical client handle. The
two exact F3 browser handles remain explicit aliases. Native development uses
`mobile-android-local` and `mobile-ios-local`; the coarse `mobile-local` F3
handle is not assigned to either registration because it contains no verified
platform distinction. The frozen static registry remains primary, so this
choice does not break the current F3 mobile flow.

The seed refuses `NODE_ENV=production` and runs as one serializable transaction
under a transaction advisory lock. It creates the complete graph, nine pending
invalidation records, and one HMAC-chained recovery audit. A matching rerun
returns `ALREADY_CURRENT` without writes. Any partial, colliding, revised, or
contradictory graph returns an error rather than overwriting authority data.
This is deliberate recovery containment, not a general reconciliation tool.

| Concern             | Item 6 decision                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Repository-owned opaque IDs, create-only atomic insertion, database scope/identity constraints, exact native separation, production refusal, and no ambiguous mobile alias prevent invented scope. |
| Detection           | Strict snapshot comparison detects partial state, ID/natural-key collisions, lifecycle/revision changes, missing outbox/audit evidence, and rerun drift.                                           |
| Containment         | Seed data is non-production-only and does not change gateway traffic, memberships, grants, Auth sessions, entitlements, or domain authorization.                                                   |
| Fail state          | Anything other than an empty target or the exact v1 graph fails closed; the seed never upserts, resets, or repairs authority records.                                                              |
| Recovery            | Restore the complete authority database or remove only a proven disposable environment and reseed. Never delete or rewrite a live partial graph through this command.                              |
| Common-mode failure | A compromised repository/operator can seed false authority; independent Auth and domain authorization remain required, and the gateway has not consumed the records yet.                           |
| Evidence            | Manifest/source tests, production-refusal test, service lint/types/tests, disposable clean migration, `CREATED`/`ALREADY_CURRENT` rerun, and read-only SQL graph evidence.                         |
| Residual risk       | Public native IDs do not attest an individual request. Live backup/restore and process restart/recovery evidence remains Batch 2 item 7 work.                                                      |

The shared PostgreSQL cluster has not yet replaced its pre-existing
`PUBLIC CONNECT` policy with explicit per-service database grants. The
authority login therefore inherits that connection permission. The item 2
migration adds ordinary invoker-rights validation functions and triggers, but
no `SECURITY DEFINER` function or cross-service table grant. Coordinated
per-service roles plus removal of `PUBLIC CONNECT` is
optional hardening for the shared development/Compose cluster; changing that
cluster-wide policy in this foundation item would also change all seven
existing service boundaries.

## Naming Compatibility

The foundation runtime was renamed from `authority-service` to
`tenant-authority-service` on 2026-08-25, before it owned records, contracts,
consumers, or traffic decisions. The `nebula_authority` database,
`nebula_authority_runtime` role, and foundation migration name remain stable;
they describe the authority domain and preserve the database created by the
pre-rename foundation build. An old `authority-service` container is stateless
and may be removed before rebuilding, but the PostgreSQL volume must be
preserved.

`tenant-authority-db-init` runs
`scripts/db/ensure-tenant-authority-db.sh` as a one-shot
Compose prerequisite. It safely creates or reconciles the database/login for
both new and existing Postgres volumes, then exits. It never drops a database
or role. Tenant-authority-service starts only after this prerequisite succeeds. The
runtime password must be a 32-128 character URL-safe random value so the role
password and Prisma URL use identical bytes.

## Domain And Repository Foundation

`src/authority/authority-domain.ts` freezes the Batch 1 UUIDv4 rule and closed
Tenant/Site lifecycle, Application lifecycle, channel, profile, identity,
parent-relationship, and entitlement-scope catalogs. These are internal domain
types, not a public wire contract.

`AuthorityRepository` verifies that every required foundation,
registration-record, and entitlement-reference migration completed without
rollback, supplies the typed reads, and `AuthorityService` applies lifecycle,
identity, and exact-scope policy. The first
migration revokes public schema creation and records schema ownership. The
second migration adds exactly eight roots:

- Tenant and Site lifecycle/revision records, with one primary site required
  before tenant activation;
- one `WEB`, `ANDROID`, or `IOS` Channel kind per Site;
- Application with an independent immutable UUIDv4 public `clientId`;
- exact canonical WebOrigin or platform-specific Android/iOS identity records;
- one direct ParentRelationship per pending/active subordinate.

Composite foreign keys prevent a child from carrying a different tenant/site
pair than its owner. Database checks, partial unique indexes, exclusion rules,
and transition triggers reject malformed IDs, wrong channel/profile bindings,
identity collisions, invalid transitions, self-links, and visible graph cycles.
The future mutation transaction must still serialize concurrent graph and
bounded-origin changes; a row trigger cannot alone observe an uncommitted edge
or origin inserted by another transaction.

Application `clientId` remains immutable. The fourth migration adds the
separate retained handle-history mechanism; changing that column in place is
still not a rotation implementation.

The third migration adds one immutable opaque EntitlementScopeRef binding per
Tenant and per Site. Its presence grants no capability and no current request
depends on it. A Tenant reference requires a null site; a Site reference uses
a composite same-scope foreign key. Binding changes require a new reference,
not an in-place reassignment.

The fourth migration adds ApplicationClientHandle,
AuthorityInvalidationOutbox, and AuthorityAuditEvent with UUID, safe-text,
revision, state/time, append-only, HMAC-chain, no-reassignment, no-reactivation,
and least-privilege constraints. It contains no data.

## Failure Behavior

- Liveness reports only process health.
- Readiness returns `503` when the database is unavailable, the S2S replay
  store is unavailable, or any exact required migration is missing, incomplete,
  or rolled back. Operational health routes remain anonymously reachable for
  local container/load-balancer probes; they expose no business data.
- A healthy authority foundation has no effect on gateway traffic.
- An authority read outage returns gRPC `UNAVAILABLE`. The static registry
  remains primary only because the persistent adapter has not been connected;
  it is not an authorization fallback for a domain check.
- Release Compose publishes no authority port to the host.
- Failed database/login provisioning prevents tenant-authority-service startup; it
  does not ask an operator to delete an existing Postgres volume.
- Runtime hard deletes fail at the database privilege boundary. Revocation and
  retained identifiers are the normal fail state; migration/recovery remains
  an administrator responsibility.

## Focused Verification

```powershell
pnpm test:tenant-authority:backend
pnpm --filter @nebula/tenant-authority-service lint
pnpm --filter @nebula/tenant-authority-service check-types
pnpm --filter @nebula/tenant-authority-service build
pnpm --filter @nebula/tenant-authority-service verify:batch2-exit
pnpm --filter @nebula/protos check-generated
pnpm --filter @nebula/clients test
pnpm test:backend-tooling
pnpm db:verify:tenant-authority
pnpm db:verify:f4-batch3-role-seeds
pnpm db:verify:f4-r2-default-actors
```

The focused suite statically checks the exact model scope and named database
mechanisms. `db:verify:tenant-authority` deploys only this service to a
disposable database and runs
`scripts/db/verify-tenant-authority-records.sql`, which exercises
representative same-scope, UUID, channel/profile, origin, native identity,
relationship, lifecycle, client-handle no-reassignment/tombstone, append-only
audit, outbox, and least-privilege behavior inside a rolled-back
transaction. It then runs the development authority seed twice and
`scripts/db/verify-tenant-authority-seed.sql` proves that the second run wrote
no duplicate graph, outbox, or audit records. Backup/restore, Compose boot, image build, and image scan remain
inventory-driven. Long Docker, Compose, full e2e, recovery, and scan evidence
is reserved for Salar under the current F4 work agreement.

## Next Boundary

Batch 2 item 7 and both Batch 2 exit checks are complete. The rebuilt service
starts both listeners, reports Docker `healthy`, and returns readiness `ok` for
the exact migration set plus Redis-backed S2S replay storage. The runtime-role
exit probe resolves all four seeded registrations, denies unknown/cross-bound/
invalid-native-origin cases, and verifies the seed audit and outbox evidence.
The complete record, including the narrow corrections for the proto artifact,
Auth-client DI, and operational-health wiring defects, is in
`docs/reports/2026-08-26-f4-batch2-exit-proof.md`.

Batch 1R and corrective Batch 3R R0-R4 are complete. Inactive control-plane
records, additive actor pairs, Realm Auth shadow state, and the staged operator
recovery path have clean migration, rerun, constraint, rollback, and earlier-
gate proof. R4 replaced epoch-only active tenant-role uniqueness with exact
epoch-and-role uniqueness without changing existing grant data. R5 adds dormant
context-v3 receivers before any v3 writer or Realm Auth session. Preserve
membership IDs, epochs, `meg1_`, grants, historical events, and compatibility
readers. Live invalidation resumes only at R11; the gateway remains on its
static registry until the ordered cutover.

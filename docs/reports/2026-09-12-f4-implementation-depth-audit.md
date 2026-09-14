# F4 Implementation Depth Audit

Date: 2026-09-12

Post-audit update: the demo-first roadmap was adopted on 2026-09-14. References
below to `docs/current-focus.md`, F4 being active, or R6.1 being next describe
the audit-time state. That checklist is preserved as
[`2026-09-14-f4-paused-execution-checklist.md`](2026-09-14-f4-paused-execution-checklist.md),
and the new order is recorded in
[`2026-09-14-demo-first-roadmap-rebaseline.md`](2026-09-14-demo-first-roadmap-rebaseline.md).

## Purpose And Audit Boundary

This report records the repository state reached in F4 before deciding whether
to continue F4 or move the remaining work behind the demo/e-commerce phases. It
audits committed source, schemas, migrations, runtime wiring, tests, deployment
configuration, prior stateful proof, documentation, and current working-tree
residue.

The audited committed baseline is `3285c00` (`feat(auth): add dormant F4 R5
context v3 receivers`). `HEAD` and `origin/main` both point to that commit;
`git rev-list --left-right --count HEAD...origin/main` returned `0 0` on
2026-09-12.

This audit does not change the F4 roadmap, activate any dormant mechanism, run
the uncommitted R6.1 experiment, mutate a normal database, build images, boot
Compose, or start a later phase. The only repository change made by the audit
is this report.

The status terms used below are:

- **Completed and active:** implemented and used by the current runtime path.
- **Completed but dormant:** implemented and tested, but intentionally has no
  current writer, consumer, admission path, or traffic cutover.
- **Migration compatibility only:** persisted alongside the legacy source and
  backfilled, while legacy reads remain authoritative.
- **Design complete:** the decision is frozen in ADRs, but its runtime work is
  not complete.
- **Uncommitted and unverified:** present only as working-tree residue and not
  part of the audited baseline.
- **Planned implementation gap:** required by the adopted F4 exit contract but
  not implemented yet.

## Executive Finding

F4 is not complete. Its final roadmap and exit checkboxes correctly remain
unchecked. The work through corrective Batch 3R R5 is nevertheless a coherent,
safe checkpoint:

1. Tenant/site/application ownership, registrations, memberships, scoped role
   grants, identity-realm control records, and an explicit authorization
   resolver are persisted in Tenant Authority.
2. Existing Authority and selected domain actor references have additive
   default-realm coordinates and bounded migration evidence.
3. Separate default and operator Realm Auth stores, encrypted source-owned
   shadow migration, and staged operator credentials exist.
4. Every currently protected gateway RPC has an additive context-v3 receiver
   alias and matching typed client contract.
5. The gateway still uses its static single-site application registry, the
   existing Auth/User path remains authoritative, Realm Auth exposes health
   only, context v3 has no writer, and domain tenant/site migrations have not
   begun.

That combination matters: the foundation is substantial, but it has not
silently replaced the demo's current authentication or routing behavior. The
committed baseline can therefore be paused without completing a partially
enabled multi-realm traffic switch. The remaining F4 work is an implementation
gap against the adopted F4 target, not evidence that the current single-site
demo path is unusable.

No new confirmed defect was found in the committed R0-R5 implementation during
this audit. Focused source checks passed. Several defects discovered during the
original execution were already repaired and are recorded below so future work
does not repeat them.

## Commit And Evidence Ledger

The recent commit boundary is:

| Commit    | Date       | Meaning                                 | Diff size                                     |
| --------- | ---------- | --------------------------------------- | --------------------------------------------- |
| `c5ff235` | 2026-09-08 | F3 gateway plus F4 authority through R2 | 327 files, 57,275 insertions, 2,722 deletions |
| `511db0e` | 2026-09-09 | F4 R3 Realm Auth shadow                 | 72 files, 8,025 insertions, 92 deletions      |
| `f5ccd28` | 2026-09-12 | F4 R4 staged administrator split        | 16 files, 1,277 insertions, 29 deletions      |
| `3285c00` | 2026-09-12 | F4 R5 dormant context-v3 receivers      | 40 files, 1,893 insertions, 88 deletions      |

The large `c5ff235` commit contains both the completed F3 gateway work and the
F4 work through R2. Its raw diff size must not be interpreted as F4-only code.

The detailed historical evidence remains in:

- `docs/reports/2026-08-24-f4-authority-audit.md`
- `docs/reports/2026-08-24-f4-batch1-exit-matrix.md`
- `docs/reports/2026-08-26-f4-batch2-exit-proof.md`
- `docs/reports/2026-08-26-f4-batch3-execution-checklist.md`
- `docs/reports/2026-08-31-f4-identity-realm-rebaseline.md`
- `docs/reports/2026-09-01-f4-batch3r-execution-checklist.md`

This report reconciles those historical claims with the current source rather
than replacing their step-by-step logs.

## Batch 1: Authority Design

**Status: design complete; later identity clauses amended by ADR-0014 and
ADR-0015.**

ADRs 0001 through 0013 define the original F4 authority model:

- Tenant Authority owns Tenant, Site, Channel, Application, membership,
  scoped grants, parent relationships, and entitlement scope references.
- F4 owns authority and scope; F6 will own licensed entitlement evaluation.
- Authority identifiers are stable UUIDv4 records.
- Tenant, Site, Application, and relationship lifecycles are explicit.
- `WEB`, `ANDROID`, and `IOS` are presentation/application channels rather than
  separate business-data owners.
- Web origins and native package/application identities bind to registered
  applications.
- Parent management is direct and explicit; it does not imply sibling,
  reverse, transitive, membership, role, or entitlement authority.
- Platform, tenant, site, editor, and user roles are distinct and scoped.
- Requests carry an explicit target and normalized operation, and the domain
  owner repeats resource-level authorization.
- Signed context compatibility, migration ordering, failure behavior,
  freshness, audit, recovery, and data ownership are frozen before cutover.

ADRs 0014 and 0015 correct the original platform-global identity/session
assumption. They preserve the working gateway, Auth defenses, signed S2S,
Tenant Authority, service-owned databases, and independent domain checks while
requiring separate customer-root identity realms and a separate platform
operator realm. They define the corrective R0-R11 order.

Batch 1 produced architecture and migration constraints. It did not itself
authorize runtime activation.

## Batch 2: Persistent Tenant Authority

**Status: completed; core service active, consumers largely dormant.**

Batch 2 introduced `apps/tenant-authority-service` with its own Prisma schema,
database, runtime role, health/readiness behavior, gRPC server, backup/recovery
inventory, and deterministic non-production seed.

The current Authority migration chain is:

1. `20260824000100_authority_foundation`
2. `20260825000100_authority_registration_records`
3. `20260825000200_entitlement_scope_reference`
4. `20260826000100_authority_registration_audit`
5. `20260826000200_membership_authority_foundation`
6. `20260901000100_identity_control_plane_unused`
7. `20260905000100_default_actor_backfill`
8. `20260912000100_tenant_role_per_role_unique`

The service currently persists Tenant, Site, Channel, Application, public
client handles and origin/native identities, direct parent relationships,
entitlement-scope references, append-only audit, immutable invalidation outbox,
Membership, MembershipEpoch, tenant/site grants, PlatformGrant, identity
realms, provider registrations, application identity policies, and federation
trusts.

The exposed typed gRPC read surface contains:

- `ResolveApplicationRegistration`
- `ListAllowedWebOrigins`
- `ValidateTargetScope`
- `ResolveEntitlementScopeRef`
- `ResolveActorAuthorization`

The first four establish registration and target facts. The fifth, added in
Batch 3 item 4, resolves an actor's scoped authority. Reads are internal and
restricted to declared S2S callers. The actor resolver additionally requires a
live Auth bearer and exact agreement among the request actor, signed transport
actor, resolution context actor, and Auth-validated user/session.

`RegistrationMutationService` and its repository behavior exist and are
covered by focused tests, but no RPC or HTTP controller exposes those mutation
methods. This is a completed but dormant mutation foundation, not a current
administration API.

The default registration seed is serializable, advisory-locked, create-only,
production-refusing, audited, outboxed, idempotent for exact state, and
conflict-denying for partial or contradictory state. Batch 2 stateful evidence
showed `CREATED` followed by `ALREADY_CURRENT`, exact registration resolution,
constraint and runtime-role denial, readiness, restart, and recovery behavior.

Three confirmed defects found by the original Batch 2 restart proof were
fixed:

- the runtime image initially omitted `tenant_authority.proto`;
- the service initially lacked the Auth client dependency needed by the shared
  `GrpcTokenAuthGuard`;
- health wiring initially omitted `@OperationalHealth()` and the S2S replay
  readiness dependency.

Current limitation: the gateway and business services do not call the Tenant
Authority client in their normal request path. The typed client is exported
from `@nebula/clients`, but a current-source search found no application import
or call. This makes persistent Authority a running source of truth with no
general traffic cutover yet.

## Original Batch 3 Items 1-4

These items remain valid default-realm compatibility work. Their earlier claim
that User/Auth would remain platform-global is superseded by ADR-0014/0015.

### Item 1: Membership And Grant Foundation

**Status: completed but not primary in the application path.**

Tenant Authority owns Membership, immutable MembershipEpoch history,
TenantRoleGrant, SiteRoleGrant, and PlatformGrant. The current epoch has an
opaque HMAC-derived `meg1_` reference; the internal generation is not exposed.
Database constraints and service checks enforce current/open epoch and exact
scope. No credential, profile, JWT secret, refresh session, or token version
was copied into Authority.

### Item 2: Legacy Role Migration

**Status: completed migration foundation.**

The bounded migration maps legacy `root-admin`, `admin`, and `user` values to
the frozen scoped authority model. Invalid roles or invalid UUIDs block the
whole import; the process does not infer a replacement role. Source extraction
is privacy-minimized to user ID and legacy role, and the importer is
transactional and idempotent for the frozen snapshot.

The final development evidence covered 33 legacy users: 31 `user`, one
`admin`, and one dedicated `root-admin`. It produced memberships and current
epochs for all 33, site `USER` grants for ordinary users, one `SITE_ADMIN`, the
sole main-tenant `TENANT_ADMIN`, and the sole `PLATFORM_ADMIN`.

### Item 3: Default Scoped Fixtures

**Status: completed migration/development fixture.**

The dedicated editor is deliberately a legacy/global `user` but has exactly
one default-site `EDITOR` grant and no tenant or platform grant. Together with
the migrated fixtures, the intended four-role sample is root administrator,
site administrator, editor, and ordinary user.

An original seed-order defect was found: creating the editor in the general
User seed caused a clean legacy backfill to grant it `USER`, which contradicted
the immutable `EDITOR` fixture and broke end-state reruns. The repair moved
editor creation to a dedicated post-backfill seed. Clean and adversarial
current-source proof then produced four fixture identities, four open
generation-1 membership epochs, exact `USER`, `EDITOR`, `SITE_ADMIN`,
`TENANT_ADMIN`, and `PLATFORM_ADMIN` grants, no `PARENT_MANAGER`, four
membership invalidations, and one audit fact for each seed operation.

The normal development Authority state recorded 34 memberships: the 33 legacy
actors plus the dedicated editor.

### Item 4: Explicit Target Authorization Resolution

**Status: completed receiver/read path; no gateway or domain consumer.**

`ResolveActorAuthorization` supports five explicit paths:

- `APPLICATION`: active exact application plus active Membership, current open
  epoch, and an exact Site grant;
- `TENANT_MANAGEMENT`: membership/current epoch plus exact `TENANT_ADMIN`;
- `PARENT_MANAGEMENT`: exact `PARENT_MANAGER` in the actor tenant plus a direct
  active edge to a different target tenant;
- `PLATFORM_MANAGEMENT`: exactly one live `PLATFORM_ADMIN` and an explicit
  active target;
- `SERVICE_OPERATION`: denied for human resolution.

It returns closed statuses for missing, inactive, contradictory, or mismatched
facts. A successful result carries one membership or platform authority
variant, one effective role, explicit target, normalized operation, optional
direct relationship ID, the opaque membership epoch reference, an `ar1_`
authority revision, and resolution time. `RESOLVED` is a scoped authority fact,
not final domain permission.

Item 4 exposed a roadmap dependency: ADR-0010 required the resolver to receive
strict context v2 before the original schedule planned that receiver. The
narrow repair introduced a resolver-only `RESOLUTION/AUTHORITY` context v2.
Legacy routes reject it, the resolver rejects v1, it cannot propagate, and no
writer emits it. Auth still validates the live actor/session independently.

## Corrective Batch 3R

### R0: Rebaseline

**Status: design/evidence complete; no runtime or data change.**

R0 reconciled ADR-0014/0015 with the already completed Authority and role work,
froze R0-R11 ordering, and reran the then-current disposable Authority and role
seed verifiers. Its purpose was to establish that no corrective realm schema or
runtime existed before R1.

### R1: Inactive Identity Control Plane

**Status: completed but deliberately non-admitting.**

Migration `20260901000100_identity_control_plane_unused` added IdentityRealm,
IdentityProviderRegistration, ApplicationIdentityPolicy, and FederationTrust,
plus closed lifecycle enums and database invariants for owner topology,
identity immutability, lifecycle progression, current-policy cardinality, and
trust uniqueness.

The reviewed development manifest contains two realms, two local providers,
four application policies, and five trust records. The seed creates all 13
records, 13 revision-1 pending outbox facts, and one HMAC-chained non-actor
audit fact in one transaction. Realms are `PROVISIONING`, providers and trusts
are `PENDING_VERIFICATION`, and policies are current `DRAFT`. No provider
secret, credential, session, endpoint, private key, user identifier, or domain
permission is stored.

The original stateful proof found exact `2/2/4/5` records, `CREATED` then
`ALREADY_CURRENT`, no admitting lifecycle, and no runtime reader or traffic
change.

### R2: Default-Realm Actor Backfill

**Status: migration compatibility only.**

Four additive migrations named
`20260905000100_default_actor_backfill` were added to Tenant Authority, Media,
Order, and Product. They add nullable `(identityRealmId, subjectId)` pairs next
to legacy actor fields for:

- Authority Membership and PlatformGrant;
- Authority audit/outbox v2 actor facts;
- `Media.ownerId`;
- `Order.userId` and `Cart.userId`;
- `ProductComment.userId`.

The deterministic default realm is
`b1000000-0000-4000-8000-000000000001`; the subject preserves the legacy UUID.
Anonymous Media and ProductComment actors remain null. Authority can use local
foreign keys to IdentityRealm; the domain databases deliberately do not create
cross-service foreign keys.

Compatibility triggers fill valid legacy-only inserts and reject partial,
wrong-realm, mismatched, or malformed pairs. Existing legacy columns and
readers remain primary. This step did not add tenant/site domain ownership or
switch a runtime reader.

The original proof ran four populated upgrades and two deliberately failing
atomic rollback databases. It preserved business rows, Authority IDs, epochs,
grants, `meg1_` references, v1 audit/outbox hashes and payloads, and produced
bounded v2 evidence. Earlier Authority/role-seed gates and all then-current
Prisma migration checks passed, and the user confirmed zero verification
databases remained.

Confirmed defects repaired during R2 were:

- SQL pair checks could evaluate to `NULL`, which PostgreSQL accepts; explicit
  non-null predicates were added to all four migrations.
- the current Prisma client's default v1 audit return selection requested new
  columns while replaying a pre-R2 schema; the v1 writer was narrowed to return
  only `id`, preserving old history and hashes.
- early verifier/fixture and rollback-result handling gaps were corrected and
  covered by backend-tooling failure-path tests.

### R3: Realm Auth Shadow

**Status: completed but health-only and non-admitting.**

`apps/realm-auth-service` and migration
`20260908000100_realm_auth_shadow_foundation` add separate durable stores for
the default and operator realms. The schema contains RealmBoundary,
RealmKeyRegistration, RealmSubject, LoginIdentifier, LocalCredential,
ExternalIdentityLink, AuthSession, LegacySessionBridge,
RootSsoExchangeGrant, AuthAuditEvent, AuthOutboxEvent, MigrationManifest, and
MigrationReceipt.

The two deployments have fixed realm/route/issuer/key references, separate
PostgreSQL databases and restricted runtime roles, and separate Redis
instances. Development uses host ports 6381 and 6382. The operator Redis and
operator Realm Auth service are behind the `r3-shadow` Compose profile.

The committed Nest module registers only `HealthController`, Prisma,
RealmBoundaryService, Redis readiness, and lifecycle health. There is no login,
refresh, token validation, logout, session RPC, or business controller. The
boundary must be exactly `SHADOW`; database triggers reject AuthSession writes
and subject-generation changes in that lifecycle.

User/Auth owners export bounded encrypted artifacts. The destination validates
manifest, source/destination/key identities, decrypts with AES-256-GCM,
verifies HMAC evidence, imports exact shadow subjects/identifiers/credentials
and terminal legacy bridges, compares shadow login results, and supports
bounded rollback. Current User/Auth remains authoritative throughout.

The user-run stateful proofs completed on 2026-09-09:

- both Realm Auth foundation databases migrated and seeded;
- the encrypted shadow import reported `adversarial=4 subjects=1 bridges=1
loginComparisons=2 rollback=2`;
- both disposable databases were cleaned;
- the final catalog check found zero verification databases.

Two defects found during implementation were fixed: an invalid boundary
trigger behavior and a missing bounded retry for concurrent serializable
imports.

### R4: Staged Platform Administrator Split

**Status: completed but deliberately unusable for live authentication.**

Migration `20260912000100_tenant_role_per_role_unique` changes tenant grant
uniqueness from one active grant per epoch to one active grant per
`(membershipEpochId, role)`. This permits `TENANT_ADMIN` and `PARENT_MANAGER`
to coexist without creating a role hierarchy.

R4 stages one fixed operator subject and bcrypt credential offline in the
operator realm. The boundary remains `PROVISIONING`; there is no login
identifier, session, token, federation trust, platform grant, audit/outbox
activation, or public/network credential staging endpoint.

The stateful verifier proved concurrent staging (`CREATED` plus
`ALREADY_CURRENT`), exact rerun, correct-password recovery readiness,
wrong-password denial, rollback and idempotent rollback, re-stage recovery,
zero operator session/token/grant state, and unchanged customer membership,
tenant-admin grant, and platform-admin grant. Earlier migrations and stateful
gates were rerun; zero verification databases remained.

### R5: Dormant Context-V3 Receivers

**Status: completed and dormant.**

R5 added a strict realm-aware context-v3 schema, receiver decorator, generated
protobuf methods, and typed client wrappers without changing legacy v1/v2
canonical bytes. A current-source count finds exactly 56
`DormantS2SAuthorizationV3Receiver` controller aliases and 56 matching V3
protobuf method occurrences across Auth, User, Settings, Product,
ProductTaxonomy, Blog, BlogTaxonomy, Order, and Media.

Each alias reuses its legacy request and response types and copies the original
handler metadata after normal decorators execute. The inventory derives the
required set from the live gateway route manifest and requires handler,
protobuf, and legacy/V3 parity.

The gateway does not import or select a dormant V3 client. No component emits
`sr2_` session or `ar2_` authority context, no Realm Auth session path exists,
and verified context v3 cannot propagate downstream. Legacy v1/v2 traffic
therefore remains unchanged. Removing the additive V3 RPC lines and aliases is
the bounded rollback while they remain dormant.

The original R5 verification passed its 56-route inventory, shared security
suites, affected controller/service suites, types, lint/format, generated proto
checks, and legacy-byte baselines. The full Auth package suite was attempted
but Redis-dependent tests lacked `AUTH_MIGRATION_TEST_REDIS_PORT`; the affected
Auth controller tests passed. This was an environment limitation and is not
recorded as a successful full Auth suite.

## Current Runtime Data Flow

The current active demo path is still:

```text
web/mobile client
       |
       v
gateway -- StaticApplicationRegistry from GATEWAY_APPLICATION_REGISTRY_JSON
       |
       +--> existing Auth service: ValidateUser -> GetTokens, refresh/logout,
       |    Redis session families, token versions, live session validation
       |
       +--> existing User and domain gRPC methods using signed context v1/v2
```

The implemented F4 side path is:

```text
Tenant Authority database/service
  registrations + membership/grants + inactive realm/trust control plane
  typed read client exists, but gateway/domain runtime has no consumer

Default/Operator Realm Auth databases/services
  shadow/staged records + health/readiness only
  no login/session/token RPC and no traffic

Context V3 receivers and clients
  exact aliases/contracts exist
  no writer or gateway selection
```

This is the central audit conclusion. Persistent foundations exist, but the
current demo is not dependent on completing the remaining realm/tenant
cutover. Conversely, these foundations do not yet deliver tenant isolation to
the demo.

## Fresh Verification Performed By This Audit

The following focused checks ran from the current working tree on 2026-09-12:

| Check                            | Result                           |
| -------------------------------- | -------------------------------- |
| Tenant Authority Jest suite      | 17 suites, 80 tests passed       |
| `@nebula/grpc-auth` Jest suite   | 13 suites, 133 tests passed      |
| `@nebula/clients` Jest suite     | 3 suites, 23 tests passed        |
| Gateway R5 receiver inventory    | 1 suite, 3 tests passed          |
| Committed Realm Auth R3/R4 tests | 6 suites, 44 tests passed        |
| Backend tooling                  | 55 tests passed                  |
| Generated protobuf check         | passed isolated generation check |
| Tenant Authority type check      | passed                           |
| `@nebula/grpc-auth` type check   | passed                           |
| `@nebula/clients` type check     | passed                           |
| Gateway type check               | passed                           |
| Tenant Authority lint            | passed                           |

The committed Realm Auth test paths were supplied explicitly because untracked
R6.1 test files are present in the working tree. A whole-package Realm Auth
test or type check would mix uncommitted work into baseline evidence.

Stateful PostgreSQL proofs, full Compose boot, image builds, broad e2e, external
client flow, dependency/image scans, and backup/recovery were not rerun during
this audit. Their historical results remain evidence for the commits that
record them, but this report does not claim they were freshly repeated.

## Current Working-Tree Residue

The committed tree is synchronized with `origin/main`, but the working tree is
not clean. It contains only these untracked R6.1 experiment paths:

- `apps/realm-auth-service/prisma/verify-r6-default-session.ts`
- `apps/realm-auth-service/src/session/`
- `apps/realm-auth-service/test/realm-session-crypto.spec.ts`
- `apps/realm-auth-service/test/realm-session-service.spec.ts`

Tracked R6.1 dependency/config edits were previously restored to the R5
baseline. The remaining files are therefore **uncommitted and unverified** and
may not compile against the current tracked dependencies. They are not part of
F4 completion, not part of R6.1, and not evidence of a working session
implementation. They should be explicitly discarded or intentionally archived
after the roadmap decision; neither action is taken by this audit.

## Finding Classification

### Confirmed Defects

No new confirmed defect was found in committed R0-R5 source during this audit.
The historical confirmed defects listed in the Batch 2, item 3, R2, and R3
sections were repaired before their respective completion claims.

The following remain confirmed unmet requirements against the adopted F4 exit
contract:

- the existing split gateway login is not replaced by one realm-owned atomic
  login;
- durable Realm Auth sessions, generation checks, Redis reconciliation, and
  current/selected/all revocation are not active;
- context v3 has no writer or traffic cohort;
- tenant/site application registration and authority are not used by the
  gateway request path;
- domain data has no complete tenant/site ownership or isolation enforcement;
- subordinate SSO, excluded subordinate behavior, and second-root realm
  isolation do not exist;
- invalidation/freshness, cross-service propagation, jobs/events/storage/cache
  scope, and final adversarial isolation evidence are incomplete.

These are implementation gaps in F4. They should not be relabeled as completed
architecture simply because the schemas and ADRs exist.

### Stale Or Internally Inconsistent Documentation

`docs/current-focus.md` accurately checks R0-R5 and identifies R6.1 as the next
technical gate, but an earlier Batch 3R paragraph still says “R5 is next.” The
bottom `Next Action` section is newer and correct for the old F4-first plan.

The same file still labels Batch 3R “Active” and instructs the next worker to
start R6.1. That reflected the prior execution order. If the project adopts a
demo-first reorder, this becomes stale planning documentation and must be
changed together with the roadmap. This audit deliberately leaves it unchanged
until the user chooses the next plan.

The high-level F4 checkboxes in `TODO-ALTERNATIVE.md` are all unchecked. That
is correct: they describe final behavior, much of which is still absent. The
lower-level checked execution ledger in `docs/current-focus.md` is the accurate
record for R0-R5.

Historical reports contain “next item” language that was correct when written.
Those dated records should remain immutable history rather than being edited to
match a later reorder.

### Optional Hardening

No optional security replacement is required by this audit. Current Auth's
hashed refresh tokens, atomic rotation/replay containment, token version,
logout, live-session checks, signed S2S, and independent domain authorization
remain useful and should be preserved if F4 resumes.

Additional load, soak, chaos, multi-instance Realm Auth, key-rotation, provider
outage, and failover exercises would strengthen confidence. They belong to the
later frozen gates or F9 production readiness; their absence is not a defect in
the dormant R0-R5 checkpoint.

### Future Scaling Considerations

- Realm Auth default/operator deployments currently prove logical separation,
  not multi-region or high-availability operation.
- Tenant Authority outbox records exist, but the R11 publisher/transport and
  consumer invalidation behavior are not selected or active.
- The static gateway registry intentionally limits the current runtime to one
  tenant/site pair. It is appropriate for the existing demo boundary but is not
  a multi-tenant scaling solution.
- Future search, analytics, AI, worker, event, cache, and object-storage records
  will need explicit scope before multi-tenant activation. They do not need to
  be built merely to keep the current single-site demo working.

## Exact Remaining F4 Scope

### Corrective Batch 3R

- R6.1: durable default Realm Auth sessions, `sr2_` references, generation and
  audience binding, Redis reconciliation, refresh rotation/replay, and
  current/selected/all logout.
- R6.2: replace split `ValidateUser -> GetTokens(userId)` with atomic Auth-owned
  login and exact credential/session generation changes.
- R6.3: enable context-v3 writers for the complete original default
  application cohort with controlled rollback.
- R7: bounded legacy bridge/generation and migration cutover work.
- R8: activate the operator cohort and perform the staged platform-admin grant
  swap without mixing customer credentials or sessions.
- R9: selected root-to-subordinate SSO.
- R10: excluded subordinate and second independent root realm evidence.
- R11: invalidation/freshness continuation and final actor-reference cleanup.

### Batch 4

Replace `StaticApplicationRegistry` behind the existing gateway contract, add
the complete signed application/actor authorization sequence, implement
freshness/outage behavior, and cut over without changing the public gateway
base URL.

### Batches 5 And 6

Add authoritative tenant/site ownership and scoped uniqueness to Taxonomy,
Settings, Media, Product, Blog, Cart, and Order. Validate cross-service
references through owning services and keep immutable order snapshots while
checking the source product scope at cart/checkout time.

### Batch 7

Execute ordered data backfills, demo seeds, second-tenant/realm fixtures, orphan
reports, rollback behavior, and future job/event/storage/cache/search scope
contracts.

### Batch 8

Run the full isolation and failure matrix across roles, target relationships,
transports, persistence, revocation, outages, retries, rollback, jobs, events,
storage, and caches.

### Batch 9 And Exit

Reconcile documentation and ownership maps, run all generated-contract,
migration, full backend, external-client, Compose, recovery, and scan gates,
review the complete diff, and only then check the high-level F4 roadmap exit.

## Safe Pause Boundary And Restart Point

The safe committed pause boundary is `3285c00` after R5. It preserves:

- the working single-site gateway/Auth/User flow;
- the complete Tenant Authority and default-realm compatibility data already
  migrated;
- isolated, non-admitting Realm Auth stores and shadow evidence;
- staged but unusable operator credentials;
- dormant exact context-v3 receivers without a writer.

If F4 is deferred, the roadmap/current-focus documents should explicitly say
that R0-R5 are retained and R6.1 onward is paused. The demo phases should state
their temporary single-site/default-realm constraint so new work does not
pretend tenant isolation already exists or accidentally depend on dormant
contracts.

If F4 resumes later, restart at R6.1 from the clean committed R5 baseline.
First decide what to do with the untracked experiment, then rerun the focused
R5 gates and the existing stateful R2-R4 verifiers before accepting any R6.1
implementation. Do not skip directly to a gateway V3 writer or tenant domain
migration because Realm Auth sessions and the default-login cutover are ordered
prerequisites.

## Audit Conclusion

F4 has completed its architecture and a large, carefully contained authority,
migration, Realm Auth shadow, administrator-staging, and receiver foundation.
It has not completed tenant-aware runtime behavior or the final realm/session
cutover. The committed work through R5 is internally consistent with its
dormant claims and passed the focused checks repeated for this audit. The
project can make a roadmap choice from this checkpoint without treating the
remaining F4 implementation as completed and without discarding the verified
foundation already built.

# Current Focus

Last updated: 2026-09-12

Status: active planning and execution checklist.

## Active Slice

F4 - Tenant, Site, Channel, Application, And Identity-Realm Authority.

`TODO-ALTERNATIVE.md` is now the adopted execution roadmap. `TODO.md` is the
preserved original-roadmap comparison, not the active phase order. The
completed F3 work order is preserved in
[`2026-08-24-f3-execution-checklist.md`](reports/2026-08-24-f3-execution-checklist.md),
and its final executable evidence is in
[`2026-08-22-f3-exit-proof.md`](reports/2026-08-22-f3-exit-proof.md).

This file is the single F4 checklist. An unchecked item is planned work, not a
claim that the behavior already exists.

## Current Goal

Turn F3's fixed single-site application context into authoritative,
persistent tenant/site/channel/application and customer-root identity-realm
scope. Unrelated licensed roots must not share credential, session, issuer,
key, or subject populations. Explicitly selected subordinates may trust a root
consumer realm for prompt-free SSO while personnel-only applications, siblings,
and unrelated roots remain excluded.

Tenant membership, target roles, and domain ownership remain separate from
authentication. Existing users migrate into one deterministic default realm;
the current global User/Auth implementation is migration evidence, not the
final multi-customer identity authority.

Batch 1's original architecture and completed Batch 2/3 evidence remain
historical, but its platform-global identity/session clauses are reopened by
[ADR-0014](architecture/decisions/0014-f4-customer-identity-realms-and-federation.md).
The corrective realm architecture/schema/contract gate below must close before
Batch 3 item 5, any context writer, or any later domain migration continues.
F4 must never let application routing, federation claims, or a tenant filter
substitute for stored scope and independent authorization.

## Entry Gate And Baseline

- [x] F3 is closed against rebuilt-image, health, live-client, source, image,
      dependency, type/build, generated-contract, and 284-test e2e evidence.
- [x] The gateway already derives one fixed tenant/site/channel/application
      tuple from a validated static registry and signs it into downstream S2S
      calls. Public identifiers are classification inputs, not authority.
- [x] The `ApplicationRegistry` interface provides a replacement seam for F4;
      F4 does not need to redesign every gateway caller.
- [x] Before Batch 2, seven Prisma services owned independent databases and
      migrations. The authority foundation is now the eighth boundary; no
      service may bypass any of those boundaries during the F4 migration.
- [x] The pre-implementation audit is recorded in
      [`2026-08-24-f4-authority-audit.md`](reports/2026-08-24-f4-authority-audit.md).
- [x] Re-run the focused F3 gateway, shared-trust, web-client, and complete e2e
      baselines immediately before the first F4 runtime patch; record any
      unrelated pre-existing failure instead of absorbing it into F4.
      Evidence: on 2026-08-24 Salar ran the reserved focused F3 and complete
      e2e baseline and reported that it completed with no errors. This is the
      user-executed heavy-command gate; it does not claim a new agent-run log.

## Verified Starting Point

| Area                     | Current repository truth                                                                                                                                                                                                           | F4 consequence                                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Application resolution   | Gateway `StaticApplicationRegistry` validates deployment JSON, requires one tenant/site pair, and implements a replaceable interface.                                                                                              | Preserve the interface and fail-closed validation; replace only the adapter after authority ownership is frozen.                                                                                                                    |
| Signed context           | `@nebula/grpc-auth` context v1 carries application, tenant, site, channel, and optional verified actor; the S2S envelope separately binds caller, target, request ID, time, nonce, body, and context digest.                       | Specify where target/provenance belongs before versioning. Do not duplicate fields or mutate a signed format silently.                                                                                                              |
| Identity and roles       | User-service currently owns one platform-global user/password table and free-string `role`; Auth owns one unqualified JWT/Redis session population with live session checks, rotation, revocation, disablement, and token version. | Preserve the working mechanisms as the default-realm migration source. The target is one isolated Auth/identity data plane per licensed-root realm, realm-qualified subjects, application audiences, and target-specific authority. |
| Domain persistence       | Product, Blog, Order, Media, Taxonomy, Settings, and User schemas have no authoritative tenant/site ownership columns.                                                                                                             | This is an unmet F4 requirement, not an F3 defect. Every migration needs scope, constraints, backfill, rollback, and denial tests.                                                                                                  |
| Taxonomy                 | Taxonomy is globally keyed by `(scope, kind, slug)` and domain facades validate `scope`/`kind`.                                                                                                                                    | ADR-0011 freezes current taxonomy as site-owned with scoped keys and same-site trees; preserve facade checks independently.                                                                                                         |
| Gateway state            | Rate limiting and idempotency are scoped by registered application and actor; each current application maps to one fixed site.                                                                                                     | Add explicit authoritative scope where required for multi-site registrations while preserving collision-safe canonical keys.                                                                                                        |
| Storage                  | Media owns access class and business metadata, but object paths and rows are not tenant/site authoritative.                                                                                                                        | Define scoped key prefixes, object migration, orphan reporting, and rollback before moving existing objects.                                                                                                                        |
| Background/search/vector | General jobs, events, search documents, and vectors do not yet exist.                                                                                                                                                              | Freeze mandatory tenant/site/application/realm/subject provenance now; do not build M6 search/workers or AI storage in F4.                                                                                                          |

## Finding Classification

| Finding                                                                                                                                                                                               | Classification                         | Treatment                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At F4 entry no persistent tenant/site/application/membership authority existed.                                                                                                                       | Historical confirmed F4 requirement    | Batch 1 selected and Batch 2/3 partially implemented tenant-authority-service. That valid evidence is preserved through the realm correction.                                                                                                            |
| The selected product now requires customer-root identity isolation, but current User/Auth, Membership, JWT, Redis, and signed actor contracts assume one platform-global identity/session population. | Confirmed unmet revised F4 requirement | ADR-0014 supersedes only those clauses. Preserve completed authority work, add realm/trust/session/context contracts, and migrate the current population into the default realm before continuing item 5.                                                |
| Password change writes only the User password hash and neither advances a durable credential generation nor revokes Auth sessions; a concurrent old-password login can create a later session.        | Confirmed implementation defect        | Move local credential hash plus separate credential/session generations into one realm-owned aggregate and make every realm/application session compare both before password-change behavior is complete.                                                |
| Current Auth keeps an internal Redis set of session IDs and supports current/all logout, but has no durable device/application session ledger, selected-other-session operation, or recovery proof.   | Confirmed implementation gap           | Preserve hashed refresh tokens, Lua rotation/replay containment, live session checks, and current/all logout while adding the durable realm/application ledger and selected revocation.                                                                  |
| Gateway login validates credentials and then calls a separate `GetTokens` RPC that accepts a gateway-signed existing user ID without a one-use proof binding it to the successful password check.     | Confirmed trust-boundary defect        | ADR-0015 selects one Realm Auth-owned atomic `Login`: the gateway never receives a subject and then asks for its tokens. The F3 evidence remains frozen history; the additive replacement occurs only at R6 after dormant v3 receivers.                  |
| Domain records and tenant-aware constraints are absent.                                                                                                                                               | Confirmed unmet F4 requirement         | Batches 5-7 migrate in dependency order with backfill and rollback.                                                                                                                                                                                      |
| A first-initialization-only PostgreSQL script could not add the authority database or runtime role to an existing development volume.                                                                 | Confirmed deployment defect            | An idempotent, non-destructive Compose prerequisite now reconciles both before inventory checks or authority startup.                                                                                                                                    |
| The initial `authority-service` runtime name was easily confused with the existing authentication-focused `auth-service`.                                                                             | Stale implementation/documentation     | Renamed the unused foundation to `tenant-authority-service` before records, contracts, consumers, or traffic authority existed; the selected boundary did not change.                                                                                    |
| The foundation runtime role inherited generic table `DELETE`, which would permit hard deletion once retained registration and relationship tombstones exist.                                          | Confirmed implementation defect        | Narrowed current/default grants to `SELECT`/`INSERT`/`UPDATE`, explicitly revoked `DELETE`, and added static plus disposable-database evidence; migration recovery remains administrator-owned.                                                          |
| `AI_CONTEXT.md`, the alternative roadmap next action, and the system map still pointed at the pre-handoff/F3 state.                                                                                   | Stale documentation                    | Corrected as part of this handoff.                                                                                                                                                                                                                       |
| The shared PostgreSQL cluster still inherits `PUBLIC CONNECT`; the new authority role has no direct foreign database/schema/table grant, and current migrations expose no public callable function.   | Optional hardening                     | Introduce per-service runtime roles and revoke cluster-wide public connection only as a coordinated boundary migration, not inside the authority foundation.                                                                                             |
| Mobile binary attestation and confidential partner credentials could further harden registration.                                                                                                     | Optional hardening                     | Preserve extension points; neither is required to prove F4 tenant isolation.                                                                                                                                                                             |
| Distributed authorization caches, cross-region active-active writes, Kubernetes operators, search, vectors, and full audit analytics may be needed at scale.                                          | Future scaling consideration           | Keep scope contracts compatible; implement only from measured requirements. Realm-specific HA, failover, storage/key isolation, and capacity proof are no longer optional for an upper-enterprise production claim and require a consulted F9 amendment. |

The Batch 1 item 1 reconciliation found additional pre-existing configuration,
seed, migration, storage-key, and stale-documentation issues. Their exact
classification and routing are recorded in the
[`Batch 1 Item 1 Source Reconciliation`](reports/2026-08-24-f4-authority-audit.md#batch-1-item-1-source-reconciliation).
Recording them does not authorize a runtime fix or absorb unrelated work into
F4.

## Mechanisms To Preserve

- Auth remains the only JWT/session authority inside each identity realm. The
  gateway and Tenant Authority never issue independent human identity claims.
  Existing hashed refresh tokens, atomic rotation/replay handling,
  current/all-session logout, and live session checks remain the compatibility
  mechanisms to extend with realm, generation, audience, and durable-session
  facts.
- The current User IDs remain the default realm's subject IDs during additive
  migration. No migration may merge users across realms by email/phone/name or
  discard the completed default membership/epoch/grant history.
- Tenant-authority-service remains the tenant/site/application/membership owner
  and additionally owns only public realm/trust/application-policy metadata.
  It never stores customer credentials, provider secrets, raw sessions, or
  private realm signing keys.
- Direct parent relationships, realm federation trust, target memberships, and
  F6 entitlements are separate records. None implies another, and only an exact
  application policy may admit a root-realm consumer to a subordinate.
- Gateway admission remains defense in depth. Sensitive domain services repeat
  verified tenant/site, role, membership, resource-owner, lifecycle, and
  entitlement checks applicable to their operation.
- `@nebula/grpc-auth` remains the signed S2S owner and `@nebula/clients`
  remains the typed cross-service invocation owner.
- Each service owns its Prisma schema, database, migrations, repository
  filters, and business constraints. Cross-database references are verified
  through the owning service.
- F3 public route policies, DTO/envelope ownership, generated OpenAPI/client
  stale checks, release port privacy, application-origin validation, rate
  limits, idempotency, request IDs, health, and causal S2S signing stay active.
- F2 additive migration, backup, restore, rollback, generated-client, source
  scan, image scan, and reproducibility gates remain in force.
- The current single-site demo remains usable throughout additive migration.
  A second tenant and second licensed-root realm are test evidence, not
  permission to break the default site or flatten identities into one store.

## F4 Coverage Map

| `TODO-ALTERNATIVE.md` F4 area                        | Owning batches |
| ---------------------------------------------------- | -------------- |
| Ownership, Realms, And Lifecycle                     | 1, 1R, 2, 3R   |
| Authentication, Sessions, Membership, Roles, Context | 1R, 3R, 3-4    |
| Domain Migration And Scoping                         | 1, 1R, 5-7     |
| Default Development And Realm Context                | 2, 3R, and 7   |
| Isolation, Consistency, And Federation Evidence      | 3R, 4, and 7-8 |
| F4 Exit Gate                                         | 8-9            |

## Batch 1R - Identity-Realm Architecture Rebaseline (Complete)

This corrective gate exists because the upper-enterprise product requirement
changed the identity isolation boundary after the original Batch 1 and part of
Batch 3 were completed. Checked items in the original batches below record
valid historical work; they do not override ADR-0014 or authorize continuing
from a superseded platform-global actor model.

### Item Evidence Ledger

**Exact checklist wording:** F4 now requires isolated licensed-root identity
realms; realm-qualified subjects; explicit application realm/provider trust;
prompt-free but audience-bound subordinate SSO; durable credential-generation
and active-session invalidation; default/selected/excluded/second-realm
fixtures; and cross-realm consistency/federation denial evidence.

**Direct ADR clauses:**

- [ADR-0001](architecture/decisions/0001-f4-authority-owner.md) still assigns
  tenant/site/application/membership ownership to tenant-authority-service.
- [ADR-0007](architecture/decisions/0007-f4-parent-relationships.md) still
  permits only exact direct parent management and denies sibling/transitive
  authority.
- [ADR-0008](architecture/decisions/0008-f4-scoped-roles.md) still requires
  exact target roles and never turns consumer/premium status into admin power.
- [ADR-0009](architecture/decisions/0009-f4-authoritative-request-scope.md) and
  [ADR-0010](architecture/decisions/0010-f4-signed-context-compatibility.md)
  still require independent actor, application, target, S2S, and domain proof
  with receiver-first/no-downgrade rollout.
- [ADR-0014](architecture/decisions/0014-f4-customer-identity-realms-and-federation.md)
  supersedes the platform-global identity/session clauses and freezes the new
  realm, federation, credential/session, role-sharing, migration, failure, and
  evidence boundaries.
- [ADR-0015](architecture/decisions/0015-f4-identity-realm-record-and-migration-freeze.md)
  closes Batch 1R with exact record owners, administrator/session decisions,
  closed vocabularies, identifier construction, R0-R11 ordering, rollback, and
  local/test versus production placement.

**Current mechanisms:** one global User/password table; Auth JWTs/Redis keys
without realm or audience; hashed refresh tokens; atomic refresh rotation and
replay containment; current/all-session logout; live token-version/session
checks; bare `userId` Membership/PlatformGrant; persistent applications and
direct parent links; target-based resolver; one strict context-v2
`RESOLUTION/AUTHORITY` receiver; no context writer or production authority
traffic cutover.

**Required proof:** exact current-source schema/contract/session inventory;
supersession matrix; clean additive default-realm migration and reruns; two
independent licensed-root realms; allowed subordinate SSO; personnel/sibling/
unrelated-root denial; same-email isolation; password/login races; durable
current/selected/all session revocation; issuer/audience/key/provider/trust
failure; context-v2/v3 mixed-version denial; rollback without flattening realm
identity or reviving credentials/sessions.

**Dated-log reconciliation:** Batch 2's four applications, registrations,
audit, and outbox history remain additive inputs. Batch 3 preserves stable
Membership IDs, immutable epochs/grants, and `meg1_` HMAC references; its
bounded legacy-role snapshot is default-realm-only. Existing audit chains are
not rewritten, context-v2 `sr1_`/`ar1_` meanings remain fixed, and item 5 chose
no publisher. The reports exposed the historical root's conflicting customer
and platform grants; Salar resolved it by preserving the customer UUID as
`TENANT_ADMIN` plus exact `PARENT_MANAGER` while creating a separate
operator-realm subject for `PLATFORM_ADMIN`. Salar also approved the bounded
presenting-default-application session upgrade. ADR-0015 freezes both.

### Corrective Decisions And Work

- [x] Select the customer-root realm topology and record why one
      platform-global identity hub and one unrelated Auth per subordinate are
      both insufficient defaults.
      Decision: ADR-0014 selects one or more isolated realms per licensed root,
      a separate platform-operator realm, explicit per-application subordinate
      trust, optional subordinate/BYO realms, and no cross-license trust in F4.
      It preserves F3, Tenant Authority, direct-parent, membership-epoch,
      target-role, S2S, typed-client, and domain-owner mechanisms.
- [x] Freeze the cross-tenant consumer rule without turning premium or a realm
      role into broad administration.
      Decision: an accepted realm consumer may acquire only the exact target
      `USER` baseline and a privacy-minimized local projection on first
      protected use. Personnel-only applications reject the consumer realm.
      Premium remains an F6 entitlement intersected with explicit target
      allocation; all higher roles remain explicit target grants.
- [x] Freeze credential/session consistency and the active-session target.
      Decision: local password hash plus `credentialGeneration` commit in one
      realm-owned transaction; a separate monotonic `sessionGeneration`
      linearizes logout-all and session creation. Every session is realm/both-
      generations/application/audience bound; a durable minimized ledger and
      terminal legacy bridge own listing, upgrade, and current/selected/all
      revocation. Redis retains rotation/replay/live-check acceleration but is
      not the durable generation or recovery authority.
- [x] Freeze federation and context compatibility semantics.
      Decision: OIDC is the first root/subordinate and BYO-provider contract;
      provider identity is exact provider plus `(iss, sub)` and never email.
      SAML/SCIM seams are reserved. Frozen context v2 is not widened; additive
      realm-aware context v3 follows receiver-first/no-downgrade rollout.
- [x] Produce the exact corrected record/owner matrix for `IdentityRealm`,
      provider metadata, ApplicationIdentityPolicy, FederationTrust,
      realm-qualified Membership/PlatformGrant/domain actor references,
      realm Auth credentials, generations, session families, active sessions,
      outboxes, audit, keys, and privacy-minimized profile projections.
      Evidence: ADR-0015 freezes exact closed vocabularies and owners, the
      customer/operator split, two independent Auth generation fences, a
      durable legacy bridge, full-length `sr2_`/`ar2_` construction and key
      stability, encrypted owner-produced migration artifacts, forbidden
      contents, and exact Authority/Auth/profile/domain boundaries.
- [x] Produce the ordered additive migration and traffic-gate matrix from the
      current default population through default realm, credential/session
      cutover, context-v3 receivers/writers, selected subordinate trust, and
      second licensed-root isolation. Include exact rollback at every gate.
      Evidence: ADR-0015 R0-R11 deploys v3 receivers before `sr2_` issuance,
      uses a bounded mutation barrier and legacy bridge, retains v3 through
      drain/revocation on rollback, and never restores stale credential
      ownership or downgrades a session reference.
- [x] Decide and document local/test deployment proof versus production
      physical realm isolation without claiming F9 HA. F4 must prove separate
      realm databases/keys/session namespaces functionally; F9 placement for
      dedicated clusters, failover, and capacity awaits Salar's approval.
      Decision: logical databases/roles, Redis boundaries, deployments,
      issuers, and keys must be separate per proof realm even when one local
      host/PostgreSQL process is shared. Physical HA/capacity remains a
      consultation-gated F9 production-readiness consequence.
- [x] Amend the applicable original ADR clauses through explicit addenda and
      update target architecture/service documentation while preserving dated
      reports as historical evidence.
      Evidence: ADR-0001 through ADR-0013 and all dated F4 reports carry
      explicit ADR-0014/0015 reconciliation without rewriting their evidence;
      current architecture/service docs use realm-aware target wording.
- [x] Run the second-pass architecture review against clean order,
      concurrency, stale replica, partial migration, provider/key/control-plane
      outage, compromised gateway/realm/subordinate, rollback, account-linking,
      and tenant-discovery leakage. No corrective migration begins until every
      unresolved decision that can change its first schema is closed.
      Evidence: the 2026-08-31 rebaseline report records the adversarial catches,
      including dual-role cardinality, presenting-application inference,
      logout/upgrade races, missing token-version denial, receiver-before-
      session ordering, immutable default-realm/identifier normalization,
      encrypted owner-export boundaries, exact reference/key stability, and
      final recovery lines.

### Batch 1R Exit

- [x] Every identity, credential, session, provider, trust, membership, role,
      application, entitlement, and domain actor fact has one owner and exact
      authoritative identifier.
- [x] The corrected schema/context/migration/failure matrices are internally
      consistent and contain no email linking, platform-global customer
      credential fallback, shared cross-application bearer, or stale-standby
      security decision.
- [x] Completed default authority/membership data has an additive preservation
      path, and no later Batch 3/4/domain item depends on the superseded bare
      global-user premise.
- [x] Cross-phase consequences are listed for user approval without silently
      editing F6-F9, D4-D5/P1, M6-M7, or deferred SaaS scope.

## Batch 1 - Authority ADR, Scope Matrix, And Failure Design

Historical status: this batch completed under the former platform-global
identity premise. Its checked evidence remains valid for the preserved
tenant/site/application/membership mechanisms, but its identity/session exit
is superseded by Batch 1R. That corrective design gate closed on 2026-08-31;
new schema, proto, context, and domain work must now follow ADR-0015's R0-R11
order through Batch 3R rather than resuming the old sequence.

- [x] Inventory the exact current owners for identity, sessions, application
      registration, origins, configuration, domain data, Redis keys, storage
      keys, migrations, seeds, and audit/log data. Reconcile the audit report
      against source immediately before the ADR.
      Evidence: the
      [`Batch 1 Item 1 Source Reconciliation`](reports/2026-08-24-f4-authority-audit.md#batch-1-item-1-source-reconciliation)
      names every current owner/non-owner, source path, discrepancy, and
      classification without selecting the future authority owner.
- [x] Decide through a durable ADR which boundary owns tenants, sites,
      channels, parent relationships, memberships, application registrations,
      verified domains/mobile identities, and entitlement records. Compare a
      dedicated authority service with extensions to existing services; reject
      gateway/settings/user ownership only from explicit boundary evidence.
      Decision: [ADR-0001](architecture/decisions/0001-f4-authority-owner.md)
      selects a dedicated tenant-authority-service and records preserved boundaries,
      rejected alternatives, migration/maintenance cost, failure behavior,
      residual risk, and the rollback boundary. It changes no runtime contract
      and reserves the remaining Batch 1 decisions rather than inferring them.
- [x] Separate F4 implementation from later F6 entitlement execution: F4 must
      select the entitlement record owner and reference contract, but it must
      not build module licensing, billing, or commercial dashboards.
      Decision: [ADR-0002](architecture/decisions/0002-f4-f6-entitlement-boundary.md)
      limits F4 to an authority-owned, opaque tenant/site-bound
      `EntitlementScopeRef` that grants no capability. F6 owns technical
      feature/module/license execution; billing and commercial dashboards
      remain deferred scope.
- [x] Freeze opaque identifier formats and creation authority for tenant,
      site, channel, application, membership, and parent relationships. Raw
      client-selected IDs must never become trusted scope.
      Decision: [ADR-0003](architecture/decisions/0003-f4-authority-identifiers.md)
      selects authority-issued canonical UUIDv4 IDs, preserves User-service
      user IDs and domain-owned record IDs, separates the public client lookup
      handle from `applicationId`, and requires deterministic seed/migration
      mappings without deriving authority from readable labels.
- [x] Freeze tenant/site/application lifecycle states and their behavior for
      login, reads, writes, export, disabled registrations, and deployment
      state. Distinguish business lifecycle from runtime deployment health.
      Decision: [ADR-0004](architecture/decisions/0004-f4-authority-lifecycle.md)
      freezes separate Tenant/Site and Application state machines, their
      effective access cascade, global-Auth separation, a dedicated audited
      export/recovery lane, migration behavior, and the rule that runtime
      readiness never becomes business authority.
- [x] Freeze `WEB`, `ANDROID`, and `IOS` channel semantics. Channels classify
      presentation/clients; they do not own separate copies of business data.
      Decision: [ADR-0005](architecture/decisions/0005-f4-channel-semantics.md)
      defines one closed channel of each supported kind per site, permits
      multiple applications per channel, maps F3 profiles explicitly, gives
      channels no separate business-data/lifecycle authority, with registration
      proof frozen by ADR-0006 and signed-context transport by ADR-0010.
- [x] Freeze exact domain-origin and mobile package/application registration,
      verification, activation, uniqueness, reassignment, revocation, and
      deletion rules.
      Decision: [ADR-0006](architecture/decisions/0006-f4-application-registration.md)
      preserves exact F3 origin parsing, adds single-use DNS hostname proof and
      exact Android app-signing/iOS Team-Bundle evidence, separates verification
      from activation, freezes uniqueness/atomic transfer/tombstone rules, and
      documents that public native client IDs are not request attestation.
- [x] Freeze parent/subordinate relationships and the narrow authorization
      rule needed for future management without implementing reseller or SaaS
      dashboards. Parent authority must never imply sibling access.
      Decision: [ADR-0007](architecture/decisions/0007-f4-parent-relationships.md)
      defines one direct parent to many subordinates, at most one parent per
      subordinate, cycle/transitive/sibling denial, platform-controlled F4
      creation, privacy-minimizing membership lifecycle authority, future
      F6-bounded feature allocation, mandatory audit, and safe revocation.
- [x] Freeze platform, tenant-wide, site-specific, parent-management, editor,
      and user role names plus allowed target tenant/site and operation. State
      which present `user`/`admin`/`root-admin` meanings are retained,
      migrated, or deprecated.
      Decision: [ADR-0008](architecture/decisions/0008-f4-scoped-roles.md)
      defines non-hierarchical operation-aware roles and delegation, limits
      `TENANT_ADMIN` to the migrated root administrator in the main tenant,
      makes `EDITOR` content-only, preserves parent privacy limits, and maps
      current roles through a reversible default-site compatibility window.
- [x] Freeze the authoritative request-scope model: actor identity, actor
      tenant/membership, target tenant/site/resource, application, channel,
      caller service, target service, request ID, and freshness/revision.
      Decision:
      [ADR-0009](architecture/decisions/0009-f4-authoritative-request-scope.md)
      preserves F3 application/S2S and Auth proofs, separates actor authority
      from an explicit server-resolved target, defines operation-specific
      application/tenant/parent/platform/service paths, requires independent
      domain ownership checks, and uses an opaque target-specific authority
      revision. Its transport and mixed-version strategy are frozen separately
      by ADR-0010.
- [x] Decide the signed-context compatibility strategy. Map fields already
      protected by the S2S envelope versus fields that require an additive
      context version; define mixed-version rejection and rollout behavior.
      Decision:
      [ADR-0010](architecture/decisions/0010-f4-signed-context-compatibility.md)
      keeps the S2S envelope at v3, freezes context v1, defines strict context
      v2 `RESOLUTION` and `AUTHORIZED` purposes, separates Auth identity from
      scoped role authority, prevents gateway bootstrap circularity, maps
      non-duplicated envelope/context facts, and requires receiver-first
      per-operation rollout with no dual carrier or downgrade fallback.
- [x] Produce a service-by-service data matrix for every root and directly
      queried child record: scope fields, unique constraints, indexes, foreign
      references, default backfill, orphan query, rollback, and denial test.
      Decision:
      [ADR-0011](architecture/decisions/0011-f4-data-scope-and-migration-matrix.md)
      covers all 17 current Prisma models, duplicates scope only on the two
      independently addressed children, freezes scoped keys and cross-service
      owner validation, and requires ordered backfill/orphan/rollback/denial
      evidence. It also preserves stable Membership IDs while binding grants to
      immutable epochs whose external reference is HMAC-derived; the numeric
      generation remains authority-internal.
- [x] Apply the failure-oriented review to authority availability, stale
      membership, forged scope, partial migration, cache poisoning, cross-DB
      reference races, storage moves, parent misuse, and common key/config
      compromise. Record prevention, detection, containment, fail state,
      recovery, evidence, and residual risk.
      Decision:
      [ADR-0012](architecture/decisions/0012-f4-failure-freshness-audit-and-recovery.md)
      preserves pairwise S2S/Auth/domain containment; freezes live-required,
      15-second bounded, and 60-second anonymous-public-only operation classes;
      adds transactional invalidation, authenticated positive caches, a
      365-day append-only authority audit, reference-race containment,
      recoverable storage moves, and bounded common-compromise recovery.
- [x] Approve an ordered, additive migration sequence that keeps the default
      single-site flow working and never relies on an application filter before
      the corresponding database constraint/backfill exists.
      Decision:
      [ADR-0013](architecture/decisions/0013-f4-ordered-additive-migration-sequence.md)
      freezes authority/default registration, membership, receiver-first
      context, Taxonomy, Settings, Media, Product, Blog, Order, state/storage,
      collision-site proof, and compatibility-retirement gates. Every service
      completes additive backfill, constraints, scoped runtime, denial, and
      rollback before a second application/scope can reach it.

### Batch 1 Exit

Historical checkmarks below prove the original decision set as of 2026-08-24.
They no longer close the current identity architecture gate; Batch 1R owns the
superseding realm decision and corrective matrices.

- [x] The ADR has one selected owner per authoritative concept, rejected
      alternatives with costs, a compatibility plan, and an explicit rollback
      boundary.
      Evidence:
      [F4 Batch 1 exit matrix](reports/2026-08-24-f4-batch1-exit-matrix.md)
      maps each concept to one owner, distinguishes conjunctive checks from
      duplicate authority, summarizes rejected alternatives/costs, and verifies
      compatibility plus progressive rollback across ADR-0001 through ADR-0013.
- [x] Every alternative-roadmap F4 item maps to one batch and executable
      evidence; no later AI, 3D, CMS, worker, Kubernetes, or commercial feature
      has been pulled into F4.
      Evidence:
      [F4 Batch 1 exit matrix](reports/2026-08-24-f4-batch1-exit-matrix.md)
      accounts for all 35 alternative-roadmap F4 checklist bullets, decomposes
      broad multi-owner lines into single-batch atoms, names executable evidence,
      and verifies the F5/F6/F7/F8/F9/M2/M3S/M4/M6/AI/commercial deferrals.
- [x] No unresolved identifier, role, lifecycle, context-version, or taxonomy
      sharing decision can change the meaning of the first migration.
      Evidence:
      [F4 Batch 1 exit matrix](reports/2026-08-24-f4-batch1-exit-matrix.md)
      reconciles the five decision classes against ADR-0003, ADR-0004,
      ADR-0008, ADR-0010, ADR-0011, and ADR-0013; remaining deferrals are
      implementation mechanics or later product scope and cannot alter the
      additive authority schema introduced by Step 1.

## Batch 2 - Persistent Authority And Default Registrations

- [x] Implement the ADR-selected authority owner with its own domain model,
      migration history, repository/service layer, health/readiness behavior,
      and least-privilege runtime configuration. If it is a new runtime, add it
      to inventory, Docker/Bake/Compose/CI/boot/health/release evidence in one
      patch series.
      Implementation staged on 2026-08-24 and naming clarified on 2026-08-25:
      `tenant-authority-service` owns a dedicated
      `nebula_authority` database, foundation migration, closed internal domain
      types, repository/service readiness check, health-only HTTP runtime, and
      fixed `nebula_authority_runtime` login. The login has no superuser,
      database/role/schema creation, migration-write, or cross-database grant.
      Inventory, Docker/Bake, development/release Compose, CI, boot, health,
      migration, backup, and image tooling now derive the new service from the
      same inventory. Gateway traffic remains on `StaticApplicationRegistry`.
      Focused agent evidence: 8 authority tests, all 37 backend-tooling tests,
      lint, type check, build, Prisma schema validation, Git-Bash syntax check,
      focused Prettier check, and `git diff --check` passed. On 2026-08-25,
      Salar ran the renamed-runtime `evidence:compose:backend`, `backend:boot`,
      `backend:health`, `db:verify:migrations`, `test:database-recovery`, and
      `scan:images:backend` gates and confirmed they completed successfully.
      This is user-executed heavy evidence, not an agent-run log. No
      tenant/site/application record belongs to this item.
- [x] Persist tenants, sites, channels, applications, exact web origins,
      mobile package/application identities, lifecycle states, and
      parent/subordinate relationships with the frozen constraints.
      Staged on 2026-08-25: the Prisma schema and
      `20260825000100_authority_registration_records` migration add exactly
      Tenant, Site, Channel, Application, WebOrigin, AndroidIdentity,
      IosIdentity, and ParentRelationship. UUIDv4 checks, closed enums,
      composite same-scope foreign keys, partial uniqueness, lifecycle and
      identity transition guards, active-registration checks, native
      package/bundle collision rules, primary-site enforcement, direct-parent
      cardinality, and graph-cycle rejection implement the frozen ADR slice.
      The runtime role cannot hard-delete these tombstones. No membership,
      grant, entitlement, audit/outbox, seed, API, consumer, or traffic change
      is included; gateway remains on `StaticApplicationRegistry`.
      Focused agent evidence: Prisma format/validation, 12 authority tests,
      lint, type check, build, and all 39 backend-tooling tests passed. The
      migration verifier now runs rolled-back representative constraint
      allow/deny evidence on its disposable authority database. This item
      Salar's first broad run proved both migrations deploy and report current,
      but exposed a test-fixture ordering defect before constraint evidence
      completed; the separate database-recovery gate passed. The fixture now
      uses an empty site so the intended cross-scope FK is tested without
      colliding with channel uniqueness first. Salar then ran the surgical
      `db:verify:tenant-authority` gate: both migrations were current, the live
      constraint block completed, deferred constraints were forced, and the
      disposable evidence transaction rolled back successfully. This is
      user-executed heavy evidence, not an agent-run log.
- [x] Persist the minimal entitlement owner/reference skeleton selected by the
      ADR without implementing F6 module behavior.
      Staged on 2026-08-25: the schema and
      `20260825000200_entitlement_scope_reference` migration add only one
      opaque UUIDv4 EntitlementScopeRef model with exact `TENANT` or `SITE`
      binding. Partial unique indexes permit at most one tenant-bound reference
      per Tenant and one site-bound reference per tenant/site pair; the
      composite Site FK, binding check, immutable-binding trigger, and runtime
      DELETE revocation prevent cross-scope rebinding or destructive reuse.
      There are no feature keys, plans, enabled flags, limits, license/module
      state, allocation, billing, seed, API, consumer, or authorization
      semantics. Focused agent evidence: Prisma validation, 16 authority tests,
      lint, type check, build, and all 39 backend-tooling tests passed. Salar
      ran `db:verify:tenant-authority`: all three migrations were current, the
      live evidence block and deferred constraints completed, and the
      disposable transaction rolled back successfully. This is user-executed
      database evidence, not an agent-run log.
- [x] Expose only typed internal authority operations needed by Auth, gateway,
      and domain checks. Add proto/client/versioning evidence through existing
      generated owners; do not expose a generic public CRUD surface.
      Staged on 2026-08-25: the new `tenant_authority.v1` protobuf exposes only
      application-registration resolution, active verified web-origin
      projection, active tenant/site target validation, and exact non-granting
      EntitlementScopeRef binding. All four unary reads use the existing
      generated proto owner, `@nebula/clients` signed wrapper, fixed
      tenant-authority S2S target, Redis replay defense, `InternalOnly`, and
      exact caller-kind/name policies. Application/origin operations are
      gateway-only; target/reference facts are allowlisted for the named
      gateway/Auth/domain workloads but become reachable only when each later
      consumer receives its pairwise key. Malformed input is
      `INVALID_ARGUMENT`; unknown, inactive, identity-mismatched,
      scope-mismatched, or contradictory records return closed typed status
      without authority facts; database/read failure is `UNAVAILABLE` without
      request/JWT/static fallback. The contract has no public HTTP business
      route, generic CRUD, mutation, audit/outbox, membership/grant, F6
      behavior, seed, consumer, persistent adapter, or traffic switch. Readable
      F3 handles are accepted as lookup evidence but remain closed misses until
      the later explicit alias seed/model; current UUID handles are never
      derived from those labels. Component revisions are evidence only, not
      ADR-0009's later opaque complete authorization revision. Focused agent
      evidence: isolated generation check, 21 authority tests, 13 signed-client
      tests, 27 shared gRPC wiring tests, all 39 backend-tooling tests,
      authority/client lint and type checks, authority build, and local/release
      Compose rendering passed. No migration or database data changed.
- [x] Make registration creation/update/revocation auditable and fail closed on
      unknown, disabled, contradictory, duplicated, or reassigned identity.
      Staged on 2026-08-26: migration
      `20260826000100_authority_registration_audit` adds globally unique,
      terminal ApplicationClientHandle history, pending/dispatched
      AuthorityInvalidationOutbox records, and insert-only HMAC-chained
      AuthorityAuditEvent records. The runtime role cannot update/delete audit
      or hard-delete any new record. The internal-only, non-transport
      RegistrationMutationService creates pending applications, updates only
      display metadata under an optimistic revision, and terminally revokes an
      application plus its current identities and handles. Each success writes
      state, revision, outbox, and audit in one transaction; audit failure
      rolls everything back. Unknown channel/application, inactive or
      mismatched scope, incompatible channel/profile, disabled/revoked update,
      stale revision, duplicate handle, tombstone reactivation, and identity
      reassignment fail closed through service decisions plus existing/new
      database constraints. Denied well-formed mutation decisions receive a
      stable reason and durable denied audit. Handle lookup now honors active
      windows/tombstones before the pre-handle UUID compatibility path. No
      mutation RPC/HTTP route is exposed because scoped membership/platform
      authorization does not exist until Batch 3; there is no seed, dispatcher,
      provider verification, activation, transfer, consumer, traffic switch,
      membership/grant, or F6 behavior. Focused agent evidence: Prisma
      format/validation/generation, 27 authority tests, lint, type check, build,
      local/release Compose rendering, all 39 backend-tooling tests, and the
      disposable `db:verify:tenant-authority` gate passed. The gate deployed all
      four migrations, reported current status, exercised constraint/privilege
      evidence, forced deferred checks, and rolled the evidence transaction
      back. No normal database data changed.
- [x] Seed stable default tenant/site records plus `WEB`, `ANDROID`, and `IOS`
      channels and registered development clients matching the supported F3
      browser/mobile profiles. Completed 2026-08-26 with the repository-owned
      `DEFAULT_DEVELOPMENT_AUTHORITY` v1 manifest and a production-refusing,
      serializable, advisory-locked, create-only seed transaction. It creates
      one stable active tenant/primary site, one channel of each closed kind,
      separate storefront/admin applications on the shared WEB channel, and
      distinct verified controlled-non-production Android/iOS registrations.
      Each application has an independent canonical UUID client handle. The
      unambiguous `storefront-web-local` and `admin-web-local` F3 handles are
      explicit aliases; native registrations use `mobile-android-local` and
      `mobile-ios-local`. The ambiguous F3 `mobile-local` handle is deliberately
      not copied because it proves neither platform and remains available only
      through the still-primary frozen static registry until cutover. Initial
      creation, nine invalidations, and one HMAC-chained seed audit commit
      atomically. An exact rerun is a no-op; partial, colliding, revised, or
      contradictory state fails closed without overwrite or repair. No
      membership/grant, entitlement behavior, gateway adapter, public mutation,
      or traffic switch was added. Classification: the missing seed was the
      planned Batch 2 implementation gap; direct deserialization of PostgreSQL's
      void advisory-lock result was a confirmed runtime defect found by the
      disposable database proof and corrected by selecting a typed boolean while
      preserving the same lock. Focused evidence: authority lint/type check and
      30 tests passed; all 39 backend-tooling tests passed; the disposable
      authority verifier deployed/status-checked all four migrations, ran the
      seed as `CREATED` then `ALREADY_CURRENT`, verified exact graph/identity/
      alias/outbox/audit counts, and deleted the disposable database. No normal
      database data changed.
- [x] Prove deterministic seed reruns, migration deploy/status, readiness,
      backup/restore inclusion, and authority restart/recovery. Completed
      2026-08-26. The disposable verifier proved clean deploy/status and exact
      two-run seed determinism. The inventory-driven backup manifest includes
      `nebula_authority`; all 39 backend-tooling tests cover backup/restore
      selection and safety; and `test:database-recovery` passed binary
      dump/drop/recreate/restore plus failed-migration recovery. The normal
      development database was advanced to all four migrations and seeded as
      `CREATED` then `ALREADY_CURRENT`. The runtime-role
      `verify:batch2-exit` probe resolved all four registrations, rejected
      unknown, cross-application, and invalid native-origin cases, and verified
      the exact migration set, one seed audit, and nine outbox records.
      Salar-owned targeted image rebuilds/recreates exposed and then verified
      three confirmed startup/health wiring defects: the authority proto was
      absent from Docker runtime artifacts; the shared token guard lacked its
      existing Auth gRPC client provider; and health lacked the established
      operational-probe marker and S2S replay readiness dependency. Narrow
      corrections preserve the shared proto, Auth, guard, and health
      mechanisms and add build-time/DI/inventory-derived regression evidence.
      The final rebuilt container started both HTTP and gRPC, emitted
      `service_ready`, returned anonymous liveness `ok`, returned readiness
      `ok` with `databaseMigration` and `s2sReplay`, and reached Docker
      `healthy` with zero failing checks. The recovery/build command boundary
      remains Salar-owned. Full evidence:
      [F4 Batch 2 exit proof](reports/2026-08-26-f4-batch2-exit-proof.md).

### Batch 2 Exit

- [x] Persistent authority can resolve the default registrations and reject
      an unregistered or cross-bound registration without gateway involvement.
      The runtime-role persistence/service probe passed all four resolutions
      and three denial classes without calling the gateway, then the rebuilt
      runtime proved the same restored database/migrations ready after restart.
- [x] A service outage, bad migration, missing seed, or contradictory registry
      state produces the ADR-defined fail-closed/degraded behavior and an
      observable readiness/audit signal. Read failures map to `UNAVAILABLE`,
      missing/rolled-back migrations degrade readiness, unknown registrations
      return closed status without authority facts, partial/contradictory seed
      state refuses repair, and mutation denials are durable audit decisions.
      Runtime readiness, the seed audit/outbox evidence, recovery proof, and 32
      passing authority tests close this gate.

## Batch 3 - Membership, Roles, And Authorization Freshness

Items 1-4 below are completed default-realm compatibility evidence. Their
schemas, seed order, membership epochs, scoped grants, target resolver, and
strict receiver remain useful. Statements that User/Auth are the sole
platform-global identity/session authority are superseded by ADR-0014 and must
not be treated as the final target. Batch 1R is complete; item 5 stays paused
until ADR-0015 R11 after the preceding corrective Batch 3R work below.

- [x] Historical default-realm foundation: keep the then-current global User
      identity/profile owner while adding authoritative tenant memberships and
      site grants to the selected authority owner. Do not duplicate passwords,
      profiles, or token issuance before the realm correction is frozen.
      Completed 2026-08-26 as an additive, empty membership-authority
      foundation under the former decision. `Membership`, immutable `MembershipEpoch`,
      `TenantRoleGrant`, `SiteRoleGrant`, and `PlatformGrant` now belong only to
      `tenant-authority-service`; at that point User remained the sole global
      identity/profile/password-hash owner and Auth the sole global
      JWT/session/token-version owner. ADR-0014 now treats those ownership
      statements as the default-realm migration source. A typed UUID User reference is not a
      cross-database FK and grants nothing by itself. Closed membership/grant/
      role enums, same-scope Site FKs and trigger checks, stable membership
      identity, current-epoch ownership, retained history, terminal revocation,
      partial active-grant uniqueness, and runtime DELETE denial implement the
      frozen ADR-0008/0011 boundary. The internal generation is included in a
      canonical HMAC-SHA256 input with a dedicated key; only the 48-character
      `meg1_` reference can leave authority, never the small generation. This
      item intentionally adds no legacy-role audit/backfill, seed data,
      membership transport, authorization resolver, context writer, or traffic
      change. Evidence: Prisma format/validation/generation; five-migration
      disposable deploy/status with rolled-back live constraint evidence and
      deterministic unchanged Batch 2 seed; normal development deploy/status;
      runtime-role registration/readiness regression probe; authority tests,
      lint, and type check. Full item log:
      [F4 Batch 3 execution checklist](reports/2026-08-26-f4-batch3-execution-checklist.md).
- [x] Migrate the current free-string global role according to the Batch 1 role
      decision, including invalid-value audit and a reversible compatibility
      period.
      Completed again on 2026-08-29 after clean-order repair. The general User
      seed now creates only the bounded legacy root-admin, admin, and user
      fixtures; the editor identity is a separate item-3 seed. The User-owned
      audit remains complete and exact, while the Authority importer consumes
      and reruns the original bounded snapshot rather than reclassifying later
      identities as legacy data. A disposable current-source execution applied
      both databases from migrations, ran the item-2 seed/audit/backfill twice,
      reran the original snapshot after item 3, and retained one exact
      `LEGACY_ROLE.BACKFILL` event without changing grants. Compatibility stays
      `LEGACY_PRIMARY`; no runtime consumer or traffic path changed. Evidence:
      16 User tests, 49 Authority tests, 41 backend-tooling tests, both service
      type checks, Authority lint, the clean role-seed verifier, and the rerun
      Authority migration/seed verifier. Full evidence is recorded in the
      [F4 Batch 3 execution checklist](reports/2026-08-26-f4-batch3-execution-checklist.md).
- [x] Seed platform admin, site admin, editor, and user memberships for the
      default tenant/site without granting every user global access.
      Completed again on 2026-08-29. The dedicated non-production User seed
      creates or updates the editor only after the bounded legacy backfill and
      keeps its global compatibility role `user`. The privacy-minimized fixture
      exporter then supplies four distinct UUIDs to the Authority-owned seed.
      Clean disposable evidence proves exactly four active memberships/open
      generation-1 epochs, one each of default-site `USER`, `EDITOR`, and
      `SITE_ADMIN`, the sole main-tenant `TENANT_ADMIN`, the sole
      `PLATFORM_ADMIN`, four membership invalidations, and exactly one audit
      event per role-seed operation. Initial runs, immediate reruns, and the
      adversarial post-item-3 rerun all passed; a simulated partial failure
      cleaned both disposable databases. No production, JWT/session, profile,
      transport, resolver, gateway, or domain contract changed. Full evidence:
      [F4 Batch 3 execution checklist](reports/2026-08-26-f4-batch3-execution-checklist.md).
- [x] Implement explicit target-tenant/site authorization resolution. A role
      without a valid active membership and matching target scope grants
      nothing.
      Completed 2026-08-29. The fifth additive authority RPC resolves one
      explicit actor/path/operation/target against active tenant/site/
      application state and exactly one current membership epoch plus matching
      tenant/site grant, active direct parent edge, or platform grant. Missing
      membership/grant is `DENIED`; inactive, cross-scope, and contradictory
      state remain distinct closed results. The response carries one effective
      role, opaque `meg1_` membership epoch reference, and target-specific
      `ar1_` revision; it is a necessary fact, never final domain permission.
      Auth still validates the live bearer/session and the receiver/domain owns
      operation/resource policy. A confirmed roadmap dependency required the
      minimal ADR-0010 receiver prerequisite here: shared code now parses only
      strict context-v2 `RESOLUTION/AUTHORITY`, accepts it only on the declared
      resolver route, rejects it on legacy routes, and forbids propagation.
      No v2 writer, `AUTHORIZED` context, gateway/domain consumer, cache,
      invalidation, or traffic cutover was added. Evidence: 126 grpc-auth, 13
      clients, 60 Authority, and 41 backend-tooling tests; focused lint/types;
      generated-contract check; and clean disposable User/Authority migration,
      seed/rerun, exact-role resolution, missing-membership denial, SQL, and
      cleanup proof. Full ledger and second-pass review:
      [F4 Batch 3 execution checklist](reports/2026-08-26-f4-batch3-execution-checklist.md).

### Batch 3R - Realm, Credential, Session, And Federation Correction (Active)

Batch 1R has frozen the exact schema/contract/migration matrix. Execute this
corrective implementation strictly through ADR-0015 R0-R11. The
documentation-only R0 rebaseline, inactive R1 control-plane persistence, R2
additive default-actor backfill, R3 Realm Auth shadow, and R4 staged operator
split are complete. R2 preserves legacy readers, epochs, grants, and v1
history; R1 remains non-admitting. R5 is next.
Each stateful item requires clean disposable
current-source execution, reruns of the preserved Batch 2/3 seed verifiers,
and an adversarial second pass before its checkbox can change.

- [x] `R0_REBASELINE`: start a new evidence ledger from current source, rerun
      the quick documentation gates and the existing clean disposable Tenant
      Authority/role-seed verifiers, and record that no corrective schema or
      runtime exists yet. Completed 2026-09-01. Governing documentation format,
      links, Batch 1R closure, and ordered ADR/current-focus gates passed. Both
      guarded clean disposable database verifiers passed their migration,
      seed/rerun, SQL, resolution/denial, and cleanup evidence; the post-gate
      source search still found no R1+ identifier. R0 changed no schema,
      runtime, data, deployment, or traffic. Full two-pass evidence:
      [F4 Batch 3R execution checklist](reports/2026-09-01-f4-batch3r-execution-checklist.md).
- [x] `R1_CONTROL_PLANE_UNUSED`: persist `IdentityRealm`, provider public/trust
      metadata, ApplicationIdentityPolicy, and FederationTrust in Tenant
      Authority with exact owner/lifecycle/uniqueness/audit/outbox constraints.
      Seed one reviewed UUID manifest containing inactive default/operator
      realms and local providers, four draft policies, four pending default-
      local trusts, and one pending admin-web operator trust. Store no provider
      secret, credential hash, raw session, endpoint, or private signing key;
      every new record remains non-admitting and traffic stays static.
      Completed 2026-09-05. The additive sixth Authority migration, reviewed
      manifest, create-only seed, 2/2/4/5 inactive records, 13 outbox facts,
      one HMAC audit, lifecycle/ownership/uniqueness guards, and runtime-delete
      denial are present. Prisma validation/generation, all 15 Authority suites
      (64 tests), lint, types, format, the no-runtime-consumer search, both
      clean disposable Authority/role-seed verifiers, exact SQL, adversarial
      reruns, and cleanup proof passed from current source. Static gateway/Auth
      remain primary. Full two-pass evidence:
      [F4 Batch 3R execution checklist](reports/2026-09-01-f4-batch3r-execution-checklist.md).
- [x] `R2_DEFAULT_ACTOR_BACKFILL`: add realm-qualified Membership,
      PlatformGrant, and domain actor references while preserving Membership
      IDs, immutable epochs, HMAC-derived epoch refs, grants, audit, and the
      current default seed. Backfill every legacy user into the deterministic
      default realm and prove idempotent reruns/rollback. Do not remove a bare-
      global column/reader or rewrite historical audit/outbox payloads here.
      Completed 2026-09-08. Four populated pre-R2 upgrades and two atomic
      rollback cases passed with unchanged legacy rows/history and bounded
      v2 evidence. All 17 Authority suites (79 tests), 50 tooling tests,
      lint/types, affected Prisma checks, earlier Authority/role-seed
      verifiers, and all eight service migration checks passed. Salar
      confirmed zero verification databases remain. Full two-pass evidence:
      [F4 Batch 3R execution checklist](reports/2026-09-01-f4-batch3r-execution-checklist.md#r2_default_actor_backfill).
- [x] `R3_REALM_AUTH_SHADOW`: add isolated default/operator Realm Auth durable
      subject/login/credential/two-generation/session/audit/outbox aggregates,
      immutable `sr2_`/key ownership, and terminal `lsb1_` legacy bridges.
      Import only the bounded source-owned encrypted/HMAC-manifested snapshots;
      shadow-compare counts/checksums/login without issuing a realm session or
      taking credential authority.
- [x] `R4_ADMIN_SPLIT_STAGED`: create and verify the distinct operator-realm
      subject, credential, and recovery procedure through a non-issuing path;
      change future tenant-grant cardinality to one active grant per
      `(epoch, tenantRole)`. Create no AuthSession/token or operator
      PlatformGrant and leave the customer grants/traffic unchanged. Completed
      2026-09-12. The fixed provisioning subject, bcrypt recovery credential,
      exact rerun checks, offline verification, and no-use rollback are confined
      to the isolated operator Realm Auth store. The Authority migration changes
      active tenant-role uniqueness from epoch-only to `(epoch, role)` without
      writing grant data. The clean stateful proof verified distinct-role
      coexistence, same-role rejection, recovery denial for a wrong password,
      repeat-safe rollback/restaging, zero sessions/operator grants, unchanged
      customer authority, and cleanup of both disposable databases.
- [x] `R5_V3_RECEIVERS_DORMANT`: implement the frozen exact v3 schema and
      `sr2_`/`ar2_` receivers through `grpc-auth`, typed clients, and separately
      declared downstream methods for every protected original-app/operator
      route. Prove v1/v2 bytes and strict mixed-version/no-propagation denial.
      Add no v3 writer and issue no `sr2_` session. Completed 2026-09-12.
      Context v3 now validates the exact realm, subject, full-length `sr2_` and
      `ar2_` references and key IDs, application audience/policy/trust, target,
      one effective membership/platform authority, and decimal resolution time.
      All 56 protected gateway RPCs have separate protobuf/controller/client
      receivers that delegate to the unchanged handler and preserve its policy
      metadata. The gateway still selects only legacy methods. Automated proof
      freezes the pre-R5 proto bytes, matches every V3 request/response type,
      rejects wrong-version routes and propagation, and proves handler parity.
- [ ] `R6.1_DEFAULT_AUTH_SESSION`: bind new tokens, refresh families, Redis
      keys, immutable session references/key IDs, issuer, and validation to the
      exact realm, subject, both Auth generations, and application audience.
      Preserve hashed refresh tokens, atomic rotation, replay containment, and
      current/all logout while adding durable current/selected/all behavior and
      Redis loss/stale-restore reconciliation.
- [ ] `R6.2_DEFAULT_LOGIN_CUTOVER`: replace split `ValidateUser` -> unbound
      `GetTokens(userId)` with the single Auth-owned atomic `Login`; create no
      credential-login proof or compatibility fallback. Run
      the bounded fail-closed mutation barrier and final encrypted import;
      activate only the default realm/provider, four policies, and four exact
      default-local trusts as the controlled cohort;
      password change/reset/suspension advances both generations and logout-all
      advances session generation. No rejected operation reports success.
- [ ] `R6.3_DEFAULT_V3_COHORT`: only after R5 and R6.1/R6.2 proof, enable v3
      writers for every protected route of the original default applications
      as one controlled cohort and make Realm Auth plus bridge/generation checks
      primary. Rollback retains Auth/v3 validation until every `sr2_` drains or
      is revoked; it never projects a session into `sr1_`.
- [ ] `R7_LEGACY_SESSION_WINDOW`: enable only the approved one-use bridge
      upgrade into the verified presenting compatible default application.
      Linearize upgrade with current/selected/all logout and password change;
      deny missing token version, replay, partial state, federation, and window-
      closed use. Pending families remain on separately declared v2 methods.
- [ ] `R8_ADMIN_SPLIT_FINAL`: enable only the operator Auth/writer cohort on the
      dormant R5 receivers by activating its realm/local provider and exact
      admin-web operator trust; issue and validate its application-bound
      session, prove recovery and expected no-grant denial, then atomically
      create the operator `PLATFORM_ADMIN`, add the customer root's exact
      `PARENT_MANAGER`, and terminally revoke—but never reassign—the customer PlatformGrant.
      Immediately prove one audited platform operation; any post-commit failure
      recovers forward through the operator realm. Preserve the customer UUID,
      Membership/epoch, and `TENANT_ADMIN`.
- [ ] `R9_SELECTED_AND_EXCLUDED`: implement application-first realm routing and
      OIDC-compatible root SSO with the frozen digest-only `rsg1_`, registered-
      redirect/PKCE/request binding, and one-use target-session CAS. Seed/prove
      one selected consumer subordinate and one personnel-only exclusion; add
      no shared cross-app bearer, email linking, or parent-edge fallback.
- [ ] `R10_SECOND_LICENSED_ROOT`: deploy a second root's independent Auth/User
      database roles, Redis, issuer, keys, subjects, profiles, policies, and the
      same normalized email. Prove no lookup/session/key/membership/audit
      collision and no public value can select its store.
- [ ] Complete the R0-R10 adversarial proof: password/login and password/
      password; current/selected/all revocation and exact logout/upgrade;
      same-email cross-realm; wrong issuer/audience/key/provider; inactive
      trust; parent-without-trust; sibling/unrelated-root; Redis loss/restore;
      authoritative-primary outage; outbox delay/replay; barrier retry; and each
      frozen rollback line.

- [ ] `R11_CONTINUE_F4`: make membership, role, realm/provider/trust, site,
      tenant, parent-link,
      application, credential, and session revocation invalidate or refresh
      only the affected realm/application/target authorization through the
      ADR-0014 mechanism. One tenant must not revoke an unrelated realm or
      sibling session.
- [ ] Define bounded freshness/cache semantics and fail behavior when Auth and
      the authority owner, realm credential/session owner, or provider disagree
      or one is unavailable. Never trust a stale standby, client JWT role, raw
      provider claim, or raw membership claim as fallback.
- [ ] Record parent, realm, provider, trust, credential, and session actions
      with minimized actor realm/subject and tenant/membership, target
      tenant/site/application, action, request ID, time, result, and revision
      without logging tokens, credentials, secrets, or sensitive payloads.
- [ ] Prove self access, site-admin access, platform-admin access, editor
      limits, realm-consumer `USER` mapping, personnel exclusion, revoked
      membership/session/trust, role downgrade, disabled site/tenant/provider,
      parent target, sibling denial, and unrelated-root denial.
- [ ] At R11 only, audit every actor reference, enforce final realm+subject
      constraints, and remove eligible bare-global columns/readers. Preserve
      historical payloads and never flatten a second-realm subject during
      rollback/recovery.

### Batch 3R Exit

- [ ] Realm-scoped identity/credentials/sessions and target-scoped membership/
      authorization are separate in schema, runtime, deployment, generated
      contracts, and documentation.
- [ ] Active authorization changes become effective within the frozen bound and
      stale client/provider/cache/standby claims cannot restore removed scope,
      generation, trust, or session.

## Batch 4 - Gateway Registry Replacement And Signed Scope

- [ ] Replace `StaticApplicationRegistry` behind the existing
      `ApplicationRegistry` interface with the persistent authority adapter.
      Keep the static adapter only for an explicitly documented migration/test
      mode; production authority must not silently fall back to it.
- [ ] Resolve exact origin/domain or mobile registration to one active
      application/channel/site/tenant tuple plus exact ApplicationIdentityPolicy
      and accepted realm/provider/audience. A public client ID or login field
      may select a record to verify but cannot manufacture or override scope,
      realm, issuer, subject, provider, trust, or audience.
- [ ] Replace the R6 compatibility routing for the controlled default cohort
      with persistent-registry routing, then extend login/refresh/exchange only
      to each resolved realm Auth boundary. Preserve prompt-free root SSO for
      approved subordinates through a one-use audience-bound exchange; never
      forward a root refresh token or accept a sibling/unrelated realm because
      it presents a validly signed token.
- [ ] Extend the context-v3 receivers and writers already proven for the R5/R6
      default cohort through the persistent `ApplicationRegistry` adapter and
      the remaining declared routes. Preserve the frozen canonical inputs,
      v1/v2 bytes, causal request IDs, fresh per-hop signatures/nonces, caller/
      target binding, and exact realm subject/application-session proof. Batch
      4 must not become the first `sr2_` issuer or redefine the v3 contract.
- [ ] Attach authoritative realm subject/session, actor membership, target
      tenant/site/resource, application audience, and authority revision only
      after live resolution. Reject duplicate raw authority/realm/provider
      headers before request handling.
- [ ] Update browser origin/CORS resolution, gateway readiness, and application
      revocation behavior for persistent records with explicit cache expiry,
      invalidation, outage, and recovery tests.
- [ ] Add tenant/site scope to gateway idempotency and rate-limit ownership
      and realm/application scope to authentication/session controls where the
      ADR/data matrix requires it. Prove no cross-site/cross-realm replay,
      collision, session confusion, or quota sharing unless explicitly
      configured.
- [ ] Require each downstream adapter to declare its target scope and prevent a
      route/body/path identifier from silently changing the verified request
      context.
- [ ] Prove raw/duplicate headers, copied client IDs, origin/host mismatch,
      disabled apps, wrong/inactive realm/provider/trust, issuer/audience/key
      mismatch, personnel exclusion, revoked membership/session, altered bearer
      state, context replay/downgrade, wrong downstream target, and authority/
      realm outage fail as designed.

### Batch 4 Exit

- [ ] F3 web/mobile clients still use one gateway base URL and their existing
      stable registered handles through the bounded default-realm
      compatibility window.
- [ ] Approved root/subordinate flows require one user login ceremony while
      each application receives only its own audience-bound session; excluded
      and unrelated applications receive none.
- [ ] Gateway admission alone is insufficient to access a domain record; the
      receiving service has enough verified scope to repeat authorization.

## Batch 5 - Shared Domain Owners: Taxonomy, Settings, And Media

- [ ] Implement ADR-0011's frozen site-owned Taxonomy scope for every current
      record/category. Preserve product/blog facade `scope` and `kind` checks;
      never interpret a missing site as permission to share.
- [ ] Add additive tenant/site ownership, indexes, and scoped unique
      constraints to Taxonomy and Settings according to the data matrix.
- [ ] Backfill default ownership, run null/unknown/contradiction/orphan audits,
      then make required ownership non-null only after every read/write path is
      scoped.
- [ ] Add tenant/site ownership to Media rows and every applicable lookup,
      upload/finalize, list, render, preview, deletion, and cleanup path while
      preserving access-class and owner/entity checks.
- [ ] Define and implement tenant/site-scoped object-key prefixes for new
      objects. Migrate existing objects only through a manifest with source,
      destination, checksum, DB state, retry, collision, orphan, and rollback
      evidence.
- [ ] Validate taxonomy and media references through their owning services and
      reject a valid ID from another tenant/site.
- [ ] Prove same-site allowed and cross-site denied behavior through direct
      service HTTP/gRPC and gateway routes, including public media rendering
      and protected/strict lanes.

### Batch 5 Exit

- [ ] Taxonomy, Settings, and Media queries cannot omit authoritative scope on
      tenant/site-owned operations, and their database constraints agree with
      runtime policy.
- [ ] Storage bytes and Media metadata cannot be paired across tenant/site
      boundaries, including after retry or rollback.

## Batch 6 - Product, Blog, Cart, And Order Migration

- [ ] Add additive tenant/site ownership, indexes, and scoped uniqueness to
      Product and ProductSet roots, BlogPost and BlogCategory roots, Cart, and
      Order. Decide child-row duplication versus parent-derived scope from the
      Batch 1 direct-query matrix rather than adding redundant columns blindly.
- [ ] Convert global product slug/SKU, product-set slug, blog post/category
      slug, cart user uniqueness, and order-number constraints to the frozen
      site/tenant policy without creating a temporary duplicate window.
- [ ] Scope every repository/service/controller/gRPC/gateway read and write,
      including public lists/gets, admin operations, soft-deleted records,
      comments, galleries, hotspots, attributes, carts, checkout, and status.
- [ ] Validate Product-to-Taxonomy, Product-to-Media, Blog-to-Taxonomy,
      Blog-to-Media, Cart/Order-to-Product, complementary product, and future
      page/media references through the owning service and matching verified
      scope. Record that Pages have no current persistence owner and belong to
      M2 rather than inventing one in F4.
- [ ] Preserve immutable order-item snapshots while proving their source
      product belonged to the same tenant/site at add-to-cart and checkout.
- [ ] Backfill default ownership, audit all references, and complete the
      nullable-to-required transition only after scoped reads/writes and
      rollback have passed.
- [ ] Prove same-site allowed, cross-site denied, guessed-ID denied, and
      race/reassignment behavior for every migrated service and gateway route.

### Batch 6 Exit

- [ ] No product, blog, cart, or order operation can read, mutate, reference,
      or infer another tenant/site's record through a valid foreign ID.
- [ ] Existing single-site storefront/admin/cart/order flows remain compatible
      after the required ownership constraints are enforced.

## Batch 7 - State, Backfill, Seeds, And Future Scope Contracts

- [ ] Execute the approved ordered backfill across every applicable database;
      retain per-service counts, null/unknown/contradiction/orphan queries,
      rollback steps, and backup/restore evidence.
- [ ] Migrate all current development/demo records into the stable default
      tenant/site and make seed reruns deterministic.
- [ ] Seed a second tenant/site with deliberately overlapping slugs, SKUs,
      taxonomy names, users/memberships, and client profiles to prove scoped
      uniqueness rather than avoiding collisions by fixture design.
- [ ] Seed a second licensed-root identity realm with the same normalized user
      email as the default realm and prove separate subject, credential,
      session, issuer, key, membership, and application state. This is in
      addition to the same-root selected/excluded subordinate fixtures.
- [ ] Audit Redis ownership. No customer identity/session key is platform-
      global: scope it by fixed realm deployment plus subject/session/
      application as applicable. Scope membership caches, gateway rate/
      idempotency state, and every site-owned key with versioned prefixes and
      safe expiry.
- [ ] Add mandatory verified tenant/site/application/request provenance to job
      and event contract skeletons before payloads can be processed. Raw IDs in
      a payload are data, not authorization.
- [ ] Freeze mandatory tenant/site ownership fields and deletion/export
      behavior plus realm-qualified actor/session pseudonyms for future audit,
      search documents, vector records, AI traces, events, analytics, and
      retrieval indexes without implementing those later systems.
- [ ] Verify cleanup, expiry, retry, dead-letter/orphan, and replay behavior
      cannot erase, reuse, or process another tenant/site's state.

### Batch 7 Exit

- [ ] Default and second-tenant data coexist under enforced scoped constraints
      without schema redesign or fixture-only exceptions.
- [ ] Every persistent, cached, stored, queued, future-search, and future-AI
      record class has one authoritative scope rule and owner.

## Batch 8 - Isolation And Collapse Evidence

- [ ] Build a service/operation matrix for anonymous, user, editor, site admin,
      platform admin, parent manager, service caller, disabled membership, and
      wrong-site actor across local, root-federated, workforce, excluded, and
      unrelated-realm principals. Cover every applicable gateway route and
      direct service HTTP/gRPC operation.
- [ ] Prove same-site and exact approved root-to-subordinate target operations
      allowed, while unapproved/wrong-target cross-site, cross-tenant, sibling,
      reverse, transitive, and cross-license reads, writes, lists, mutations,
      soft deletes, counts, errors, and timing-safe not-found policy are denied
      for all migrated services.
- [ ] Prove forged tenant/site/channel/application/realm/provider/issuer/
      audience/subject/actor/target metadata fails across gateway HTTP, direct
      HTTP, gRPC, nested gRPC, cache, session, idempotency, object storage, job,
      event, audit, and future search/vector adapters.
- [ ] Prove a compromised or incorrect gateway admission does not bypass
      sensitive domain membership/resource checks, and a compromised domain
      caller cannot sign itself as the gateway or another service.
- [ ] Prove parent access is explicit and audited, never grants sibling access,
      and cannot change target scope through route/body/reference IDs.
- [ ] Prove an application origin/domain/mobile identity cannot select an
      unrelated site or identity realm and application/provider/trust/session
      revocation becomes effective within the frozen bound.
- [ ] Prove background/retry/replay paths retain verified scope and reject
      payload-only tenant/site assertions.
- [ ] Run data-audit queries after migrations/seeds and fail the gate on any
      null, unknown, contradictory, cross-scope, duplicate, or orphaned owner.
- [ ] Exercise authority/Auth/gateway/domain/Redis/storage outage and recovery,
      stale cache/standby, realm/provider/control-plane outage, credential and
      session generation races, partial rollout, old context version, realm key
      rotation, Redis/database restore, and rollback. Record the maximum
      observed blast radius and residual risks.

### Batch 8 Exit

- [ ] Isolation is executable evidence across persistence and transport
      boundaries, including unrelated identity realms and accepted/excluded
      subordinate SSO, not only a gateway unit test or ORM filter convention.
- [ ] Every failure scenario has a closed or explicitly safe-degraded state,
      detection signal, containment boundary, recovery procedure, and test.

## Batch 9 - Documentation And F4 Exit Gate

- [ ] Update the ownership ADR, system relationships, actor/S2S contracts,
      tenant/identity-realm platform target, Auth/User/Tenant Authority and
      federation/session contracts, service/package docs, env examples,
      Docker/boot, backup/restore, migration, seed, testing, and operational
      runbooks to match implemented behavior. Mark target-only SAML/SCIM,
      physical HA, and later enterprise features explicitly.
- [ ] Record exact focused and full verification commands, environment
      assumptions, migration/backfill counts, audit queries, rollback result,
      generated-contract status, known limitations, deferred work, and evidence
      locations in a dated F4 exit report.
- [ ] Run focused tests after each owner changes, then lint/types/builds,
      generated proto/OpenAPI/client stale checks, schema/migration/seed gates,
      security tests, complete e2e, Compose evidence, rebuilt images, health,
      live default-realm/site flows, selected subordinate SSO, personnel and
      unrelated-realm denial, session invalidation, live second-tenant denial,
      and scans. Leave
      commands expected to exceed the session limit to Salar.
- [ ] Review the complete diff and tracked-file cleanliness. Do not check an F4
      roadmap item until its source, migration, runtime, tests, configuration,
      and documentation agree.
- [ ] Verify all applicable existing data belongs to an authoritative
      tenant/site and the default plus second tenant work without redesign.
- [ ] Verify forged, unapproved, wrong-target, sibling, reverse, transitive, or
      cross-license access fails across transports, persistence, caches,
      storage, and background contracts while exact approved subordinate
      target paths succeed.
- [ ] Verify gateway, domain services, Auth, authority, cache, storage, and
      audit provenance agree on realm subject/session/application audience and
      tenant/site target, with independent sensitive-service enforcement.
- [ ] Verify future search/vector records and AI traces have a mandatory
      tenant/site/application/identity-realm/subject/session-pseudonym/request
      scope contract before those stores exist.
- [ ] Re-run the complete F3 external-client path and prove F4 did not break the
      gateway-only release boundary.
- [ ] Check the F4 exit items in `TODO-ALTERNATIVE.md` only from the final
      evidence, archive this checklist, and create the F5 current-focus plan.

## Guardrails

- Work only on F4 tenant/realm/application authority, authentication/session
  realm correction, memberships, context, domain scope, migration, state/
  storage scope, and isolation proof. Do not implement F5 media
  processing, F6 feature modules/licensing, F7 redesign, F8 mobile breadth, F9
  Kubernetes/cloud, M2 CMS pages, M6 workers/search, or AI0 product AI.
- Do not create a generic shared `tenantId` helper that bypasses domain policy.
  Shared code may validate/transport verified context; each domain owns what
  that context permits for its records.
- Never accept tenant/site/application/identity-realm/provider/issuer/audience/
  subject/role/membership authority from public headers, request bodies, query
  parameters, unvalidated JWT/provider claims, settings, job/event payloads,
  filenames, storage paths, or email/account-name matches.
- Do not remove Auth or service authorization because the gateway resolves
  scope. Plan for gateway, authority, cache, key, configuration, and operator
  error without assuming any single layer is infallible.
- Use additive, reversible migrations: nullable column, backfill/audit,
  constraint/index, scoped runtime enforcement, then non-null cleanup. The
  exact order must follow each service's approved migration plan.
- Do not hand-edit generated Prisma, proto, OpenAPI, or API-client output.
- Preserve local development ports and development-only env values. Production
  and later deployment secrets remain outside tracked files and output.
- Preserve unrelated dirty work. Use narrow patches, inspect before changing,
  and classify new findings before adding work.
- Leave long sequential Docker builds, full Compose boot, complete live/e2e,
  and image scans to Salar unless he explicitly asks the agent to run them.

## Next Action

Batch 3R R0-R4 are complete. The `R3_REALM_AUTH_SHADOW` entry ledger is recorded
in the Batch 3R execution report. Its family-version source prerequisite is
implemented: legacy login/refresh records the issued version, and a migration-
only atomic reader quarantines unprovable families without lazy initialization.
The shared Realm Auth service, durable aggregate migration, fixed default/operator
deployment tuples, isolated DB roles/Redis placement, shadow-mode database fence,
and idempotent boundary/key-reference seed are implemented; the clean
default/operator database proof passed on 2026-09-09. Bounded encrypted User and
Auth exporters, the atomic shadow importer, and login comparator are implemented
in source, and their first populated disposable proof passed. Completion review
found and corrected the missing exact-graph rerun and controlled shadow-rollback
path; the expanded adversarial/rollback verifier then passed. The second review
added bounded serialization-conflict retry and concurrent-import proof, which
also passed. The updated foundation, Authority, role-seed, R2, all-service
migration, and zero-residue checks passed on 2026-09-09, closing R3. Maintenance
backup/restore covers both Realm Auth databases.
R3 created non-authoritative Realm Auth shadow state and proved
source-owned encrypted/HMAC-manifested import and comparison. Current User/Auth
retains credential/session authority. Issue no realm session, activate no R1
record, and preserve R2 pairs, legacy readers, epochs, grants, and v1 history.
Keep `StaticApplicationRegistry` primary and follow the ordered later gates.
R4 added the fixed operator provisioning subject, offline recovery credential,
exact concurrent rerun/no-use rollback checks, and per-epoch/per-role active
tenant-grant uniqueness. Its focused tests, clean concurrent stateful proof,
all earlier database gates, all-service migrations, and zero-residue check passed
on 2026-09-12. It issued no session/token, created no operator PlatformGrant,
and changed no customer authority or traffic.

R5 added the exact context-v3 parser/guard, 56 separately declared protobuf and
controller receivers, and a separate typed-client family. Every receiver uses
the unchanged legacy request/response messages and delegates to the unchanged
handler after copying its route policy metadata. The gateway still selects only
the legacy client family, so no v3 writer, `sr2_` session, Authority decision,
or traffic change exists. Frozen-source hashes prove that removing only the
additive V3 RPC lines restores every pre-R5 proto byte.

The active gate is now `R6.1_DEFAULT_AUTH_SESSION`. Bind new Realm Auth tokens,
durable sessions, Redis keys, immutable `sr2_` references/key IDs, issuer, and
validation to the exact realm, subject, both Auth generations, application, and
audience. Preserve the current rotation/replay/logout mechanisms and keep R1
records non-admitting until the later R6.2 controlled cutover.

Consult Salar before editing F6-F9, D4-D5/P1, M6-M7, or deferred SaaS scope.
The assistant runs small inspections and focused checks directly; Salar runs
heavy commands and long verification sequences and returns brief results.

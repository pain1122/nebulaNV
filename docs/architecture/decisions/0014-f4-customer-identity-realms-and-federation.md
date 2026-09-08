# ADR-0014: F4 Customer Identity Realms And Federation

Date: 2026-08-31

Status: accepted as the F4 identity-architecture correction. Design and
rebaseline only; it authorizes no schema, runtime, protocol, key, or traffic
change by itself.

Batch 1R completion amendment: the exact record/owner, administrator split,
legacy-session upgrade, migration/rollback, identifier/context, and deployment
matrices are frozen by
[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md).
Where this ADR uses one generic Auth generation in its original body, ADR-0015
now distinguishes durable `credentialGeneration` from `sessionGeneration` and
keeps both separate from Tenant Authority's HMAC-protected membership
generation. Where the original body permits either atomic local login or a
one-use credential proof, ADR-0015 selects one Realm Auth-owned atomic local
login; one-use Realm Auth grants are reserved for root-application SSO.

This ADR supersedes only the platform-global identity, credential, session,
and actor-reference clauses in ADR-0001 through ADR-0013. Their tenant/site
ownership, direct parent edge, scoped role,
membership-epoch, signed S2S, typed-client, domain-isolation, audit, and
receiver-first principles remain in force. Dated audits and completed-batch
reports remain historical evidence and are not rewritten.

## Decision Scope

This decision freezes the F4 architecture for:

- identity isolation between unrelated licensed customers;
- one or more identity realms owned by a licensed root tenant;
- explicit subordinate application trust without implicit parent, sibling, or
  transitive access;
- Nebula-managed local credentials and customer-managed identity providers;
- realm subjects, application-bound sessions, active-session management, and
  credential invalidation;
- seamless root-to-subordinate sign-on without reusing one bearer token across
  applications;
- realm-wide consumer access versus target-specific administrative roles;
- realm-aware actor references, request context, migrations, and isolation
  evidence.

It does not implement F6 feature/license execution, commercial billing,
regional infrastructure, or every enterprise connector. Those phase impacts
must be approved separately before their roadmap sections change.

## Evidence Ledger And Classified Findings

### Exact F4 requirements affected

The adopted F4 roadmap currently requires separation of global identity from
tenant membership, live authorization refresh, signed actor/target scope,
session-adjacent key scoping, default and collision tenants, and cross-tenant
denial. The newly clarified product requirement adds a stronger boundary:
unrelated licensed customers must not share one credential and session
population, while explicitly selected subordinates must support prompt-free
single sign-on from their licensed root.

### Current mechanisms to preserve

- Gateway remains the only public application API and keeps the
  `ApplicationRegistry` replacement seam.
- `@nebula/grpc-auth` S2S signing, replay defense, exact caller/target binding,
  typed clients, and independent downstream authorization remain active.
- Tenant-authority-service already owns tenants, sites, applications, direct
  parent links, membership epochs, scoped grants, revisions, audit, and
  invalidation outbox records.
- Auth currently hashes stored refresh tokens, rotates one refresh session
  atomically with Redis Lua, detects replay, revokes the current session or all
  sessions, bumps token version, and validates live session existence.
- Completed Batch 3 memberships have stable IDs, immutable epochs, and an
  externally safe `meg1_` HMAC reference; the internal numeric membership
  generation is neither exported nor logged.
- User PostgreSQL uniqueness is the final protection against concurrent
  duplicate email creation in the current single-directory implementation.
- Domain services retain their data and repeat exact target/resource checks.

### Findings

| Finding                                                                                                                                                                                                              | Classification                                                                                   | F4 treatment                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User` has one platform-global table with globally unique email/phone, and Membership/PlatformGrant identify an actor only by `userId`.                                                                              | Confirmed gap against the revised F4 requirement                                                 | Migrate the current population into a deterministic default realm and replace platform-wide actor identity with a realm-qualified subject.                           |
| Auth JWTs, Redis keys, session references, secrets, and token versions have no realm, issuer, audience, or application binding.                                                                                      | Confirmed gap against the revised F4 requirement                                                 | Add realm and application binding before any cross-realm or subordinate SSO traffic.                                                                                 |
| Password change updates only the User password hash; it does not revoke sessions or advance a durable credential generation. Concurrent login may validate the old hash and create a session after the write begins. | Confirmed defect                                                                                 | Make hash replacement and credential-generation advance one realm-owned transaction; old-generation sessions fail even when cleanup delivery is delayed.             |
| Gateway login calls `ValidateUser` and then a separate `GetTokens(userId)` that is not bound to the successful credential proof.                                                                                     | Confirmed trust-boundary defect                                                                  | ADR-0015 selects one Auth-owned atomic local login before realm traffic; no credential-login grant or fallback remains.                                              |
| The current Redis set is an internal session-ID index, not a durable user-visible active-session ledger.                                                                                                             | Confirmed gap against the adopted session-management requirement                                 | Preserve current rotation/revocation mechanics, add durable minimized session metadata, and make Redis derived acceleration rather than the sole recoverable ledger. |
| Current context v2 actor identity contains only `userId` and `sessionRef`, and one receiver is already implemented with strict exact-field parsing.                                                                  | Compatibility constraint                                                                         | Freeze v2 for its default-realm compatibility use and introduce realm-aware context v3 receiver-first; do not mutate v2 silently.                                    |
| Separate physical realm clusters, regional failover, and enterprise load/soak proof are not implemented.                                                                                                             | Confirmed production-readiness gap for the upper-enterprise goal; not a local-development defect | F4 freezes the topology and executable two-realm functional proof. Physical HA/capacity implementation requires a separately approved F9 change.                     |
| SAML and SCIM connectors are not implemented.                                                                                                                                                                        | Confirmed enterprise-integration scope gap, not a defect in the current local login flow         | F4 freezes their trust/lifecycle seams. Phase placement for complete connectors requires separate roadmap approval.                                                  |

The platform-global model was internally consistent with the former F4 goal;
its now-superseded documentation is not evidence that the completed work was
careless or that F3 must be discarded.

## Completed F4 Work Disposition

The dated execution reports are change records, not disposable drafts. Their
current-source mechanisms have this exact disposition:

| Completed evidence                                                                                                                        | Realm migration treatment                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Batch 2 Tenant/Site/Channel/Application graph, four registrations, handles, verification identities, lifecycle, audit, and outbox history | Preserve IDs and rows. Add identity policy/trust records; never regenerate an application merely to add realm routing.                                                                                                                                                                                                              |
| Batch 3 Membership, MembershipEpoch, role grants, membership revisions, and `meg1_` references                                            | Preserve every ID, epoch, generation, key ID, and HMAC reference. Add the deterministic default `identityRealmId` and treat the existing User UUID as `subjectId`; never regenerate an epoch for realm qualification.                                                                                                               |
| `LEGACY_ROLE.BACKFILL` bounded snapshot/importer                                                                                          | Use once for the default-realm migration source only. A later operator subject, second licensed-root realm, or BYO subject never enters that legacy scan.                                                                                                                                                                           |
| Existing HMAC-chained authority audit and version-1 invalidation outbox rows                                                              | Do not rewrite historical payloads or hashes. A version-1 decoder may interpret them only under the deterministic default realm and Authority invalidation purpose; new realm-aware facts use an additive event version. Realm Auth credential/session invalidation has a separate owner, outbox, namespace, and consumer contract. |
| Item 4 target resolver and strict context-v2 `RESOLUTION/AUTHORITY` receiver                                                              | Preserve as default-realm compatibility. Missing membership continues to deny. Consumer JIT uses an audited, idempotent Membership/epoch/`USER` transaction before ordinary resolution; authentication alone never makes the resolver return `USER`.                                                                                |
| Item 5 Authority outbox/dispatcher analysis                                                                                               | Preserve the durable Authority outbox decision, but keep publication transport paused until Authority invalidation and Realm Auth credential/session invalidation are specified as separate streams of facts.                                                                                                                       |

Two completed identifiers remain intentionally versioned:

- `meg1_` remains the HMAC-protected membership epoch reference because its
  stable Membership ID and internal generation do not change;
- `sr1_` and `ar1_` remain valid only in the context-v2/default-realm
  compatibility lane. Realm/application-bound sessions and realm-aware
  authority decisions require new `sr2_` and `ar2_` canonical inputs rather
  than silently changing the meaning of an existing prefix.

The historical local root identity currently holds both the main tenant's sole
`TENANT_ADMIN` and `PLATFORM_ADMIN`. ADR-0015 preserves that UUID as the default
customer-realm subject with `TENANT_ADMIN` and an explicit
`PARENT_MANAGER` grant for direct-subordinate operations. A distinct
operator-realm subject receives a new PlatformGrant while the old customer
PlatformGrant is terminally revoked and retained for audit.

## Terms

- **Identity realm:** one isolated authentication trust domain with its own
  issuer identity, subjects, credential/session stores, signing keys, and
  lifecycle.
- **Platform operator realm:** the separate NebulaNV operator realm used for
  platform administration and recovery. It does not contain customer
  credentials merely because NebulaNV operates the control plane.
- **Licensed-root realm:** a customer-owned realm whose default trust boundary
  may serve that root tenant and explicitly selected subordinate applications.
- **Subordinate-owned realm:** an optional realm owned by a subordinate for
  its workforce or sovereignty requirements.
- **Realm subject:** an immutable person/account identifier meaningful only
  inside one realm.
- **Realm subject reference:** the pair `(identityRealmId, subjectId)`. Email,
  phone, username, display name, or external provider claims never replace it.
- **Identity provider:** the system that proves authentication. It may be a
  Nebula local-credential provider or an explicitly configured external OIDC
  or SAML provider.
- **Application identity policy:** the authority-owned allowlist of realms,
  providers, principal classes, and session behavior accepted by one exact
  application.
- **Federation trust:** an explicit, stateful, audited trust from one exact
  application or realm boundary to one exact issuer. A parent relationship is
  neither federation trust nor authentication authority.

## Selected Realm Topology

```text
NebulaNV platform control plane
|-- platform operator realm
|-- licensed root A
|   |-- consumer realm A
|   |-- optional workforce realm A
|   |-- selected subordinate applications trusting consumer realm A
|   `-- optional subordinate-owned workforce realm
|-- licensed root B
|   `-- realms and stores isolated from A
`-- licensed root C
    `-- realms and stores isolated from A and B
```

Rules:

1. One licensed root may own more than one realm, normally a default consumer
   realm and optional workforce/external-provider realms.
2. Unrelated licensed roots do not share subjects, local credential rows,
   sessions, signing keys, or Redis namespaces. The same email may identify
   unrelated subjects in two realms.
3. An application may accept multiple explicitly registered realms or
   principal classes. This supports a subordinate customer channel trusting
   the parent consumer realm while its staff channel trusts only a workforce
   realm.
4. Every trust is exact and default-deny. Parent relationship presence,
   matching email, common branding, shared infrastructure, or possession of a
   public client ID creates no trust.
5. F4 permits trust only inside one licensed-root hierarchy. Cross-license
   account linking or federation is denied and reserved for a later explicit,
   audited decision.
6. A tenant sees only its own realm metadata and the exact direct trust edges
   it is authorized to administer. No public or tenant-facing realm directory
   reveals unrelated customers.
7. The platform control plane owns realm registration, routing, lifecycle,
   application trust, and public verification metadata. It stores no customer
   passwords, raw sessions, provider client secrets, or private signing keys.

## Ownership Boundaries

| Boundary                    | Target ownership                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant-authority-service    | Realm IDs, owning root/subordinate tenant, public issuer/discovery reference, lifecycle, application identity policy, federation-trust state, accepted principal classes, exact target bindings, revision, audit, and invalidation.                                                                                                 |
| Realm Auth deployment       | Authentication ceremony, local credential hashes, external identity links, credential generation, durable session families, refresh rotation/replay, issuer/audience tokens, logout/revocation, and realm key use. The same Auth code may be deployed for many realms, but one deployment cannot silently mix their stores or keys. |
| Realm User/profile boundary | Profile/contact data for realm subjects. After migration it is not the password/session authority. A subordinate may retain only the privacy-minimized profile projection its own product requires.                                                                                                                                 |
| Customer/external IdP       | Customer-controlled credentials and authentication when BYO identity is selected. Nebula stores only verified provider/trust configuration and external identity links, never the external password.                                                                                                                                |
| Application/domain owner    | Target resource ownership, local membership or consumer projection, target role, feature permission, and business data. Authentication never grants resource access by itself.                                                                                                                                                      |
| Gateway                     | Resolve the application first, select only its authority-approved realm route, orchestrate login/exchange, and sign downstream context. It cannot choose an issuer, subject, role, or audience from public input.                                                                                                                   |

This replaces the current target in which one platform User table owns every
customer password. The current User/Auth mechanisms become the compatibility
implementation of the default realm and are migrated additively; they are not
discarded before equivalent denial, rollback, and session evidence exists.

## Identity And Linking Rules

The authoritative human coordinate is:

```text
identityRealmId + subjectId
```

For external OIDC identity, the stable provider coordinate is:

```text
providerId + exact issuer (`iss`) + subject (`sub`)
```

OIDC specifies that `iss` and `sub` together are the stable end-user
identifier; email and other profile claims are not guaranteed unique or
stable. See
[OpenID Connect Core, Claim Stability And Uniqueness](https://openid.net/specs/openid-connect-core-1_0.html#ClaimStability).

- No email/phone/name match automatically links, merges, or transfers a
  subject.
- An external account link requires an exact active provider, verified issuer,
  verified signature/key, expected audience, accepted authentication flow, and
  an explicit proof or authorized administration path.
- Pairwise provider subjects remain supported; applications do not assume the
  same external `sub` is visible to every client.
- A provider or realm subject can be disabled without deleting historical
  memberships, sessions, orders, audits, or domain ownership references.
- A provider compromise is contained to applications that explicitly trust
  it. Unrelated realms and licensed roots reject its issuer and keys.

## Login Routing And Seamless Subordinate SSO

The application is resolved before credentials or federation input can select
an identity realm:

```text
verified domain/package + public lookup handle
-> active Application
-> ApplicationIdentityPolicy
-> exact accepted realm/provider
-> authentication or existing realm SSO session
-> exact application audience
-> application-bound session
```

For a root user entering an allowed subordinate:

1. The subordinate application redirects to or exchanges through the trusted
   licensed-root realm.
2. An existing root SSO session may satisfy authentication without prompting
   for credentials again.
3. The realm issues a one-use code or token-exchange result bound to the exact
   subordinate application/audience, request, redirect, and short expiry.
4. The subordinate creates its own application-bound session. It never receives
   the parent application's refresh token or a bearer valid for every sibling.
5. Tenant Authority proves the exact active trust and target policy; the
   subordinate domain still resolves local membership/resource permission.

[RFC 8693](https://www.rfc-editor.org/rfc/rfc8693.html) is the standards basis
for audience/resource-bound token exchange. Its presence does not authorize
broad multi-audience tokens: F4 requests one exact target audience per
exchange.

Entering a subordinate directly follows the same path. If the browser already
has the root realm SSO session, the redirect is prompt-free; otherwise the user
authenticates at the realm, not by sending credentials to the subordinate.

## Consumer Access, Personnel Isolation, And Premium Features

Authentication, consumer access, administrative roles, and paid capabilities
remain distinct:

- An application policy may map an accepted realm consumer to the effective
  target `USER` baseline for that exact application/site.
- Public browsing needs no membership. On the first protected consumer action,
  the target may create a privacy-minimized local membership/projection keyed
  by the realm subject reference. It stores no credential or parent session.
- The automatic path can create only the ordinary `USER` baseline. `EDITOR`,
  `SITE_ADMIN`, `PARENT_MANAGER`, `TENANT_ADMIN`, and `PLATFORM_ADMIN` always
  require their existing explicit target grant and delegation policy.
- Personnel-only applications do not accept the consumer realm/principal
  class, so valid consumer authentication produces no application session and
  no personnel membership.
- A realm-wide premium subscription is not an administrative role. F6 must
  resolve it as a server-owned entitlement/capability and intersect it with
  each explicitly allocated subordinate application. Client claims cannot
  create or extend premium access.

This provides role-shared consumer access without making one realm role a
wildcard over customer data or administration.

## Credential And Session Consistency

Each realm owns a durable authentication aggregate containing at minimum:

```text
RealmSubject
LocalCredential?          // absent for external-only subjects
ExternalIdentityLink*
credentialGeneration
AuthSession*
```

Required rules:

1. A local password hash and its monotonically increasing
   `credentialGeneration` change in one authoritative database transaction.
2. Password change/reset, local credential removal, subject suspension, and
   confirmed compromise advance the generation and write a durable outbox
   event in that same transaction.
3. Session creation is conditional on the still-current observed generation.
   A login that verified an old hash cannot create a usable new-generation
   session after a concurrent password change.
4. Every realm SSO and application session binds realm ID, subject ID,
   credential generation, issuer/provider, exact application/audience,
   session-family ID, creation time, expiry, and lifecycle.
5. Auth validation compares the session generation with the authoritative
   current generation. Security decisions do not read asynchronous standbys.
   Any later cache must obey the separately frozen freshness class and fail
   closed when current generation cannot be established.
6. The durable session ledger stores only minimized device/application
   metadata needed to show and revoke sessions. Raw refresh tokens are never
   stored; the existing hashed-token and replay protections remain.
7. Users may list their active sessions, revoke one selected other session,
   revoke the current session, or revoke all sessions in their realm. Password
   change invalidates every realm/application session from an older generation.
8. Redis remains useful for fast session presence, atomic refresh rotation,
   replay detection, and invalidation delivery, but it is not the sole durable
   credential generation or recoverable session inventory.
9. Restoring an older database/Redis snapshot cannot reduce a generation or
   revive a revoked session. Recovery reconciles monotonically forward or
   keeps uncertain sessions denied.
10. Membership and credential generations are different fences. Membership's
    small internal generation never leaves Tenant Authority; only its `meg1_`
    HMAC reference may leave. Auth's credential generation neither grants a
    membership nor reuses the membership HMAC key.

Multiple Auth replicas do not own independent password/session truth. They use
one logical realm primary/consensus endpoint; database constraints,
transactions, compare-and-set, and generation fencing serialize conflicting
work. Read replicas may serve non-authoritative reporting only.

## Federation Protocol Boundary

- **OIDC** is the required first federation and browser/mobile SSO contract.
  It supplies issuer, subject, audience, signed identity assertions, discovery,
  and key rotation semantics.
- **SAML 2.0** is an inbound enterprise compatibility adapter. Its metadata,
  entity, assertion, audience, time, key, and logout behavior must map into the
  same realm subject/session model; SAML claims never bypass application
  policy. See the
  [OASIS SAML 2.0 specifications](https://docs.oasis-open.org/security/saml/v2.0/).
- **SCIM** is provisioning and lifecycle synchronization, not login. Create,
  suspend, group change, and deprovision events must map idempotently into realm
  subject/membership lifecycle with tenant access controls. See
  [RFC 7644](https://www.rfc-editor.org/rfc/rfc7644.html).

F4 must implement and prove the root/subordinate OIDC-compatible path and
freeze provider-neutral SAML/SCIM seams. Full SAML and SCIM connector phase
placement remains a roadmap decision requiring user approval.

## Realm-Aware Authority And Context

Tenant Authority adds conceptual records whose exact schema is frozen before
the corrective migration:

- `IdentityRealm`;
- `IdentityProviderRegistration` public/trust metadata only;
- `ApplicationIdentityPolicy`;
- `FederationTrust`;
- realm-qualified Membership and PlatformGrant actor references.

Membership uniqueness changes from `(tenantId, userId)` to:

```text
(tenantId, identityRealmId, subjectId)
```

ADR-0015 selects explicit `identityRealmId` plus `subjectId` columns for domain
actor/owner references. A bare legacy UUID can be interpreted only during the
deterministic default-realm backfill; an opaque-wrapper alternative is not part
of the F4 migration.

Context v1 remains the F3 single-site bridge. The already strict partial
context v2 remains a default-realm compatibility receiver and is never used to
authorize multi-realm federation. Realm-aware authorization uses additive
context v3 containing, at minimum:

```text
actor.identityRealmId
actor.subjectId
actor.sessionRef
actor.authenticationAuthorityRef
application exact audience
target and actor-authority facts preserved from v2
```

The v3 actor `sessionRef` uses a realm-keyed `sr2_` HMAC over the realm,
application/audience, and internal session identity. The realm-aware authority
decision uses `ar2_`; `sr1_`/`ar1_` remain unchanged for declared v2 legacy
operations. Raw session IDs, internal membership generation, and internal
credential generation never enter signed request context.

Provider tokens, raw OIDC/SAML claims, email, keys, credential generation, and
raw session IDs are not propagated as domain authority. Auth verifies them and
emits the minimized realm actor/session proof. Context v3 follows ADR-0010's
receiver-first, exact-shape, no-dual-carrier, no-downgrade rollout.

## Compatibility And Ordered Migration

No existing source or data changes merely because this ADR is accepted.

The corrected F4 order is:

1. Preserve all F3 and completed F4 evidence as historical baseline.
2. Freeze the exact realm/trust/provider/session schemas, contracts, context
   v3 shape, key ownership, and rollback matrix.
3. Add realm registration and application identity policy without making them
   traffic authority.
4. Create a deterministic platform operator realm and default licensed-root
   realm. Assign every current user to the default realm without changing its
   subject UUID during compatibility.
5. Add realm IDs to Membership/PlatformGrant and direct domain user/owner
   references; backfill the default realm before enforcing new uniqueness.
6. Add the realm Auth durable credential/session aggregate. Migrate password
   hashes with count/checksum/orphan evidence, dual-write only inside an exact
   bounded window, then stop treating User profile storage as credential
   authority.
7. Preserve hashed refresh tokens, rotation, replay defense, current/all logout,
   and live checks while adding generation, application audience, selected
   session revocation, and durable recovery.
   Existing unbound families may use only ADR-0015's bounded one-use upgrade
   into the verified presenting legacy-compatible default application. They
   never enter subordinate federation; remaining families expire/revoke when
   the window closes.
8. Deploy context-v3 receivers before writers and prove default-realm parity.
9. Add one selected subordinate trust, one personnel-only exclusion, and one
   separate licensed-root realm with independent users/stores/keys.
10. Enable one operation slice at a time, then continue authority invalidation
    and domain scope migration under the existing gates.

Before the credential cutover, rollback returns to the current default-realm
compatibility path. After realm-qualified memberships, sessions, or domain
references are authoritative, rollback must preserve realm IDs and reconcile
data; it may not flatten identities back into one global email namespace.

## Failure-Oriented Review

| Concern             | Realm decision                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prevention          | Application-first routing; exact realm/provider/trust allowlists; issuer/signature/audience checks; realm-qualified subjects; one-use exchange; app-bound sessions; atomic credential generation; target-specific roles; independent domain checks.                                                                                                    |
| Detection           | Realm/provider/trust lifecycle audit; issuer/audience/key mismatch metrics; generation/session denial; cross-license and personnel-denial tests; outbox lag; session reconciliation; login/exchange correlation.                                                                                                                                       |
| Containment         | A compromised customer realm can affect only its subjects and explicitly trusting applications. A compromised subordinate receives only audience-bound artifacts. Unrelated licensed roots have different stores, keys, issuers, and trust policies.                                                                                                   |
| Fail state          | Unknown/mismatched/unavailable realm, provider, issuer, key, audience, trust, generation, session, or membership denies login/exchange/protected work. No email link, parent-edge inference, JWT-role fallback, stale standby, or platform-global directory fallback exists.                                                                           |
| Recovery            | Disable exact provider/trust/application; advance generations; revoke sessions; rotate realm keys; replay durable outboxes; restore realm stores without decreasing epochs; revalidate application policy before reopening.                                                                                                                            |
| Common-mode failure | Nebula control-plane operators, shared deployment/configuration, gateway code, or an incorrect trust template could affect several realms. Separate keys/stores, exact per-app policies, independent Auth/domain checks, change audit, and later F9 deployment isolation reduce but do not eliminate this risk.                                        |
| Evidence            | Same email in separate roots; permitted root-to-child SSO; sibling/unrelated-root/personnel denial; wrong issuer/audience/key; parent-link without trust; trust revocation; password-change/login race; one/all/selected session revocation; stale replica/Redis restore; provider/control-plane outage; key rotation; context-v2/v3 downgrade denial. |
| Residual risk       | Physical realm HA, regional disaster recovery, connector-specific interoperability, customer IdP compromise, and sustained high-load behavior require later infrastructure and enterprise integration proof. F4 may not claim those completed.                                                                                                         |

## Options Compared

| Option                                                                                    | Consequence                                                                                                                                                                                | Decision                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| One platform-global identity/session population                                           | Simplest current implementation, but unrelated licensed customers share the credential/session authority and its blast radius. It cannot satisfy the clarified sovereignty/isolation goal. | Superseded. Retained only as the bounded default-realm migration source.                    |
| Independent Auth for every tenant with no hierarchy trust                                 | Maximum separation, but every subordinate requires repeated login or a federation mesh; account/session lifecycle and client UX become unnecessarily expensive.                            | Rejected as the default. Available as subordinate-owned realm mode.                         |
| One or more isolated realms per licensed root plus explicit subordinate application trust | Separates unrelated customers while allowing Snapp-style prompt-free movement inside an approved hierarchy. Supports consumer/workforce separation and optional subordinate/BYO realms.    | Selected.                                                                                   |
| Share one bearer/session across all subordinate applications                              | Simple UX but excessive token blast radius and weak audience containment.                                                                                                                  | Rejected. Use root SSO plus one-use exchange and application-bound sessions.                |
| Auto-link identities by email                                                             | Convenient but unsafe across issuers, reassignment, and unrelated licensed roots.                                                                                                          | Rejected. Use exact realm/provider subject proof.                                           |
| Treat premium as a global role                                                            | Mixes commercial capability with human administration and risks broad overgrant.                                                                                                           | Rejected. F6 entitlement intersects with exact application allocation and actor permission. |

## Required F4 Proof Before Reclosing The Architecture Gate

- The supersession matrix covers every old platform-global clause and every
  implemented schema/contract that carries `userId`, session, role, or token
  authority.
- The first corrected migrations can run from clean current source, rerun, and
  roll back without losing completed membership/audit history.
- Two licensed-root realms can contain the same normalized email without a
  shared credential row, subject collision, session collision, or lookup
  across realms.
- One root session enters an approved subordinate without a credential prompt
  and receives only an application-bound session.
- The same subject is denied by an excluded personnel application, sibling,
  unrelated licensed root, wrong issuer/audience, and inactive trust.
- Password change invalidates every older-generation realm/application session,
  including a concurrent old-password login attempt.
- Current, selected-other, and all-session revocation work from the durable
  ledger and remain closed after Redis loss/restore.
- Context v2 cannot be mistaken for realm-aware context v3, and no receiver
  downgrades after a realm-aware denial.

## Repository Evidence

- `apps/user-service/prisma/schema.prisma`
- `apps/user-service/src/user/user.service.ts`
- `apps/auth-service/src/auth/auth.types.ts`
- `apps/auth-service/src/auth/auth.service.ts`
- `apps/auth-service/src/auth/redis/auth-redis.service.ts`
- `apps/auth-service/src/auth/token/access-token-validation.service.ts`
- `apps/auth-service/src/auth/grpc/grpc-auth.controller.ts`
- `apps/tenant-authority-service/prisma/schema.prisma`
- `packages/grpc-auth/src/context.ts`
- `packages/grpc-auth/src/s2s-context.ts`
- `docs/services/auth-service.md`
- `docs/services/user-service.md`
- `docs/services/tenant-authority-service.md`
- [ADR-0001](0001-f4-authority-owner.md) through
  [ADR-0013](0013-f4-ordered-additive-migration-sequence.md)
- [ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md)
- `docs/reports/2026-08-24-f4-authority-audit.md`
- `docs/reports/2026-08-24-f4-batch1-exit-matrix.md`
- `docs/reports/2026-08-26-f4-batch3-execution-checklist.md`

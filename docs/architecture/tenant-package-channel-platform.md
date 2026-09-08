# Tenant, Package, Channel, And Kubernetes Platform

Status: Target architecture. Not implemented unless a section explicitly says otherwise.

## Decision Summary

NebulaNV will be a centrally operated modular SaaS control plane with isolated
customer identity realms and service-owned tenant/domain data planes.

- NebulaNV owns and operates the backend cluster, nodes, registry, databases, storage policy, internal service network, and license authority.
- Clients receive website/admin builds and signed React Native applications, but no backend source, feature images, registry credentials, Kubernetes access, S2S secrets, or direct internal gRPC access.
- Baseline services run in the Kubernetes core workload. Premium capabilities run as separately deployable containerized modules.
- Every external website or app calls one public gateway. The gateway resolves
  the application and its identity policy first, routes only to an accepted
  realm/provider/audience, then resolves the exact target and entitlement and
  forwards minimized trusted context to internal services.
- A tenant may create subordinates only after purchasing the complete feature suite and a parent/reseller contract.
- Parent authority permits management and monitoring; it does not merge subordinate data.
- Each site owns isolated products, blogs, pages, settings, orders, media,
  memberships, and site grants. Human identity is global only inside one
  identity realm and is referenced as `(identityRealmId, subjectId)`.
- Each licensed root has an isolated default realm and may add consumer,
  workforce, subordinate-owned, or customer-provider realms. Unrelated roots
  do not share credential/session stores, issuers, signing keys, or subjects.
- Selected subordinate applications may trust a root consumer realm for
  prompt-free SSO through exact audience-bound exchange. A parent relationship
  creates no authentication trust, and personnel-only applications may reject
  the consumer realm entirely.
- Each mobile app registration belongs to exactly one owning site. It consumes
  that site by default; an approved super-app/root application may target an
  exact selected subordinate only through active hierarchy, application
  identity policy, realm session, target membership, entitlement, and domain
  checks. It cannot choose arbitrary, sibling, or unrelated sites.
- Contracts use an explicit lifecycle with warnings and a one-month grace period before suspension.

## Terms

- **Platform operator:** NebulaNV. Owns infrastructure, licensing, releases, and platform-wide administration.
- **Tenant:** A contractual customer and authorization boundary.
- **Parent tenant:** A tenant with the complete feature suite plus the parent/reseller entitlement.
- **Subordinate tenant:** A separately isolated tenant managed by an authorized parent.
- **Site:** A website/content boundary owned by one tenant.
- **Channel:** A presentation target owned by one site: `WEB`, `ANDROID`, or `IOS`.
- **Core service:** A baseline backend service required by the platform or launch product.
- **Feature module:** A premium backend capability deployed separately from core.
- **Entitlement:** The signed, server-authoritative right to use a feature under a contract.
- **Identity realm:** An isolated authentication trust domain with its own
  issuer, subjects, credential/session stores, signing keys, and lifecycle.
- **Realm subject:** A person/account ID meaningful only with its identity
  realm ID. Email and provider claims are profile/linking evidence, not this ID.
- **Application identity policy:** The exact allowlist of realms, providers,
  principal classes, audience, and session behavior accepted by one
  application.

## Ownership Hierarchy

Identity and tenant ownership are related but not identical:

```text
NebulaNV platform control plane
|-- platform-operator identity realm
`-- licensed root tenant
    |-- default consumer identity realm
    |-- optional workforce/BYO identity realms
    |-- primary site/applications
    `-- subordinate tenant
        |-- subordinate site/applications
        |-- explicit accepted root-realm policy where approved
        `-- optional subordinate-owned workforce realm
```

The existing tenant/site hierarchy remains:

```text
NebulaNV platform
└── tenant
    ├── primary site
    │   ├── web channel
    │   ├── Android channel
    │   └── iOS channel
    └── subordinate tenant
        └── subordinate site
            ├── web channel
            └── mobile channels
```

Rules:

- A subordinate remains a separate tenant and site even when managed from the parent's admin panel.
- Parent administrators may act in a subordinate context only through an explicit, audited authorization path.
- A subordinate cannot see parent or sibling content merely because it belongs to the hierarchy.
- A subordinate becomes a parent only through its own complete-suite parent/reseller contract.
- Parent/subordinate relationships live in NebulaNV data. Kubernetes namespaces are deployment boundaries, not the source of tenant hierarchy.
- Identity-realm/application trust is a separate explicit record. It is never
  inferred from the parent edge, tenant name, shared email, network, or
  deployment placement.

## Identity Realm And Federation Boundary

[ADR-0014](decisions/0014-f4-customer-identity-realms-and-federation.md)
supersedes the older platform-global User/Auth target while preserving Tenant
Authority, target roles, direct parent edges, signed S2S, and independent
domain authorization. [ADR-0015](decisions/0015-f4-identity-realm-record-and-migration-freeze.md)
closes its record-owner and migration decisions with separate durable Auth
credential/session generations, a bounded terminal legacy bridge, exact
`sr2_`/`ar2_` references, and receiver-first R0-R11 traffic gates.

- Tenant Authority owns public realm registration, application identity
  policy, exact federation trust, lifecycle, target membership/grants,
  revision, and audit. It stores no customer password, provider secret, raw
  session, or private realm signing key.
- The same Auth/User code may be deployed repeatedly, but each licensed-root
  realm uses an isolated subject/credential/session/key population. A
  subordinate may instead own or bring its workforce provider.
- The application resolves first. Its trusted policy selects one exact realm,
  issuer/provider, principal class, and audience; the user cannot ask the
  system to search every realm by email.
- An existing root SSO session may produce a one-use, short-lived,
  application-bound subordinate session without another password prompt. A
  bearer or refresh token is never shared across all siblings.
- Approved realm consumers may receive only the target `USER` baseline and a
  privacy-minimized local membership when protected state is needed. Personnel
  and every higher role remain explicit target grants.
- Premium is an F6 entitlement/capability intersected with exact target
  allocation and actor permission, not a realm-wide administrative role.
- OIDC is the first federation contract. SAML is an enterprise compatibility
  adapter and SCIM handles provisioning/deprovisioning; their complete roadmap
  placement requires separate approval.

[ADR-0007](decisions/0007-f4-parent-relationships.md) freezes each relationship
as an explicit stateful direct edge with at most one pending/active parent per
subordinate. Relationship presence grants nothing by itself: management needs
an active parent membership/role, exact target and operation, active direct
link, target lifecycle/resource checks, freshness, and durable audit. Ancestor,
reverse, and sibling access are denied.

[ADR-0008](decisions/0008-f4-scoped-roles.md) replaces the target's global role
ladder with operation-aware `PLATFORM_ADMIN`, `TENANT_ADMIN`, `SITE_ADMIN`,
`PARENT_MANAGER`, `EDITOR`, and `USER` grants. `TENANT_ADMIN` is initially
limited to the migrated root administrator in the main/default tenant, which
also receives an exact `PARENT_MANAGER` grant for approved direct subordinates.
A distinct platform-operator-realm subject receives `PLATFORM_ADMIN`; the two
identities/sessions never merge. `EDITOR` is content-only, and parent membership
views exclude profile, credential, and raw-session data.

[ADR-0009](decisions/0009-f4-authoritative-request-scope.md) makes scope
target-based rather than a client-selected current tenant. A protected
operation combines independently verified workload and actor, actor
membership/grant, application/channel, exact target and operation, and an
opaque target-specific authority revision. Authority proves tenant/site and
relationship facts; each domain owner still proves its resource ownership.

[ADR-0010](decisions/0010-f4-signed-context-compatibility.md) keeps the existing
S2S v3 envelope and introduced strict context v2, whose minimum
`RESOLUTION/AUTHORITY` receiver now exists as default-realm compatibility. Non-authorizing
resolution is accepted only by exact resolver RPCs; authorized context carries
the target decision without duplicating envelope provenance. Receiver-first
rollout forbids context downgrade or legacy-role fallback. ADR-0014 requires
additive realm-aware context v3 and authorizes no new context-v2 writer.
ADR-0015 requires dormant v3 receivers before any `sr2_` issuance and retains
v3 validation through drain/revocation on rollback; no app-bound session is
projected into `sr1_`.

[ADR-0011](decisions/0011-f4-data-scope-and-migration-matrix.md) freezes the
persistence side of that target: site-owned roots store both tenant and site,
and only independently addressed children duplicate scope. ADR-0014 supersedes
its platform-global User/Auth rows with realm-qualified subjects and
realm-isolated authentication. Membership IDs remain stable for audit continuity,
while grants bind to immutable epochs and context exposes only a dedicated-key
HMAC-derived epoch reference. Taxonomy and managed Media references are
same-site; Settings has only platform defaults and site overrides in F4.

[ADR-0012](decisions/0012-f4-failure-freshness-audit-and-recovery.md) makes
authority/parent/platform/recovery actions live-required, bounds ordinary
positive authority decisions to 15 seconds, and permits only allowlisted
anonymous public reads to use a last verified decision for at most 60 seconds
during an authority outage. Tenant-authority-service owns the append-only 365-day
authority audit; each domain retains its resource audit and authorization.

[ADR-0013](decisions/0013-f4-ordered-additive-migration-sequence.md) prevents an
application-to-site filter from becoming the isolation mechanism. Persistent
authority and default-client compatibility come first; each owner database then
finishes backfill, constraints, scoped runtime, and denial evidence before the
durable second tenant/site can reach its operation chain.

## Channel Semantics

[ADR-0005](decisions/0005-f4-channel-semantics.md) freezes `WEB`, `ANDROID`, and
`IOS` as closed presentation classifications. Each site has at most one channel
of each kind; multiple applications may use the same channel. Storefront and
admin are separate applications on `WEB`, while Android and iOS remain separate
native registration kinds.

Channels own no separate business data, lifecycle, authorization, entitlement,
or verified registration identity. Site lifecycle is their ceiling,
application lifecycle controls individual registrations, and site-owned data
remains shared only through independently authorized operations.

## Application Registration

[ADR-0006](decisions/0006-f4-application-registration.md) freezes exact
registration semantics. Production web applications prove their exact hostname
through a single-use DNS TXT challenge and register canonical HTTPS
scheme/host/explicit-port origins. Android binds package/application ID to the
installed app-signing certificate SHA-256 fingerprint. iOS binds Apple Team ID
to an explicit Bundle ID.

Verification and activation are separate. Public client IDs are non-secret
lookup handles, natural identities never select tenant/site scope, and transfer
requires a new application plus fresh proof and an audited atomic reassignment.
Referenced registrations are revoked/tombstoned rather than silently deleted or
reused. F4 does not claim request-time mobile attestation.

## Authority Business Lifecycle

[ADR-0004](decisions/0004-f4-authority-lifecycle.md) freezes the F4 target
lifecycle. Tenant/Site use `PROVISIONING`, `ACTIVE`, `SUSPENDED`, and
`ARCHIVED`; Application uses `PENDING_VERIFICATION`, `ACTIVE`, `DISABLED`, and
`REVOKED`.

Normal business access requires an active tenant, site, and application plus
all independent authorization checks. Suspension/archival does not globally
disable a user's identity or overwrite child/domain lifecycle records. Runtime
readiness, deployment health, domain-record status, and F6 license status remain
separate dimensions and cannot activate an inactive authority record.

## Commercial And Feature Rules

Phase ownership:

- F4 authority owns only the tenant/site-bound `EntitlementScopeRef` anchor
  defined by
  [ADR-0002](decisions/0002-f4-f6-entitlement-boundary.md). Its presence grants
  no feature and F4 implements no module or license behavior.
- F6 owns the technical feature catalog, allocation, effective-capability,
  signed manifest, license lifecycle, installed-module, and proof-module
  foundation.
- Billing, reseller productization, full commercial dashboards, and licensed
  module operations at scale remain deferred commercial SaaS scope.

- Parent/reseller eligibility requires the complete feature suite.
- Ordinary subordinate contracts may contain any allowed subset of the catalog.
- Feature availability is contract-oriented, not a client-controlled flag.
- The effective capability is the intersection of contract, site allocation, installed backend module, app-build capability, user permission, and current license state.
- A client-visible feature flag may control presentation, but it is never the security boundary.
- Package definitions and accepted contracts are versioned so future catalog edits do not silently rewrite existing agreements.
- Upgrades and downgrades have an effective date, impact acknowledgement, audit record, and deployment result.

Conceptual rule:

```text
allowed =
  contract entitlement
  AND site allocation
  AND backend module available
  AND channel supports feature
  AND actor permission
  AND license is ACTIVE or GRACE
```

## Kubernetes Runtime Shape

Target layout:

```text
Kubernetes cluster operated by NebulaNV
├── nebula-core
│   ├── gateway
│   ├── auth-service
│   ├── user-service
│   ├── tenant/license authority
│   ├── settings-service
│   ├── media-service
│   ├── product-service
│   ├── taxonomy-service
│   ├── blog-service
│   └── order-service
├── nebula-streaming
├── nebula-showroom
├── nebula-ai
├── nebula-media-workers
└── nebula-observability
```

The diagram names service types, not one platform-global customer identity
deployment. Under ADR-0014, Auth/User identity data planes are instantiated or
routed per licensed-root realm with isolated databases, sessions, issuers,
keys, and failure domains. The exact production namespace/cluster topology,
regional HA, and capacity proof require the consulted F9 amendment; local F4
may use separate realm databases on one development PostgreSQL process without
claiming production physical isolation.

The current core services keep only their baseline domain responsibilities. Premium behavior must not be hidden inside a large core template. Core may contain shared types, protobuf contracts, client interfaces, and integration hooks; the premium implementation belongs to its feature image.

A feature module contains:

- immutable container image pinned by digest;
- HTTP/gRPC contracts and compatible generated clients;
- required core-version range;
- migrations and rollback rules;
- service account and network requirements;
- resource requirements, including GPU needs;
- health/readiness checks;
- data retention and uninstall policy;
- license feature key and supported limits.

Feature modules are deployed as Kubernetes workloads, not dynamically loaded as arbitrary npm code into core processes.

Deployment modes:

- **Shared:** One module deployment serves multiple entitled tenants. Suspension denies only the affected tenant.
- **Dedicated:** A tenant receives dedicated replicas, namespace, node pool, GPU, storage, or scaling. Suspension can scale that tenant's workload to zero.
- **Edge compute:** Only a restricted signed worker is placed near client hardware when ingest, GPU, bandwidth, or data-locality requires it. Business services and license authority remain central.

Initial operations may use controlled Helm commands. A later operator may reconcile approved desired state, but commercial activation must still require a signed entitlement and audited authorization.

## Code Protection Boundary

Code protection comes from NebulaNV retaining control of the cluster, nodes, registry, images, build pipeline, signing keys, and internal network.

Clients must not receive:

- backend source or source maps;
- feature container images or registry pull credentials;
- Kubernetes credentials or node access;
- databases or internal storage credentials;
- S2S or gateway signing secrets;
- direct access to internal gRPC services.

Runtime code encryption may be added as defense in depth, but it is not the license authority because executable code must eventually be decrypted in memory. Signed images, private registries, deployment-bound entitlements, strict infrastructure access, and server-side authorization are the primary controls.

## Gateway And Trust Boundary

External flow:

```text
website or mobile app
→ HTTPS gateway
→ resolve exact application and active identity policy
→ select one accepted realm/provider/principal class and audience
→ authenticate or exchange into an application-bound session
→ resolve exact target tenant/site, membership, entitlement, and operation
→ attach realm-aware signed internal context
→ internal service repeats resource/operation authorization
```

Rules:

- External clients never call internal services directly.
- Raw `x-user-id`, `x-tenant-id`, `x-site-id`, or `x-app-id` values are not trusted identity.
- Application identity resolves before authentication. Realm/provider/audience
  and target site are derived from active authority policy, session,
  relationship, and membership—not from token claims or a login identifier.
- Internal services accept propagated context only after verified S2S authentication.
- Every data query, cache key, job, event, storage key, and audit record must carry the authoritative tenant/site scope where applicable.
- Feature services repeat entitlement and resource-ownership checks for sensitive operations; gateway checks alone are insufficient.

## Tenant And Site Isolation

Every domain record is owned by a tenant/site as appropriate.

```text
Tenant
└── Site
    ├── products
    ├── blog posts
    ├── custom pages
    ├── settings
    ├── orders
    ├── media
    └── channels
```

Parent management does not imply shared rows or unrestricted cross-site
references. Parent or super-app actions run against an explicitly authorized
target and record actor realm/subject, actor tenant/membership, application,
target tenant/site, action, request ID, timestamp, and outcome.

Cross-service references must be validated through the owning service because separate service databases cannot rely on cross-database foreign keys.

## Media And Content

- Every media record belongs to one site.
- Products, blogs, and custom pages own semantic media usage: role, ordering, alt text, captions, and channel overrides.
- A content record may reference only media owned by the same site.
- No live cross-site media sharing is part of the baseline architecture.
- A future `copy to site` operation may create a new destination-owned media record; it must not create an unbounded shared ownership relationship.
- `PUBLIC` means approved for anonymous delivery through the owning site's permitted channels. It never means platform-global ownership.
- Web, Android, and iOS may use separate derived variants of the same site-owned logical media.

Conceptual relationship:

```text
ContentMedia
  siteId
  entityType
  entityId
  mediaId
  role
  channelId?     // null means default for the site
  sortOrder
  altText
  caption
```

## Web And Mobile Channels

- Website/admin source may remain private; clients receive deployable builds when client-side hosting is required.
- React Native source, build scripts, and signing credentials remain under NebulaNV control.
- Users receive signed Android/iOS binaries because native code must execute on devices.
- Each app registration belongs to exactly one site and one exact identity
  policy.
- The app cannot select an arbitrary site. The gateway resolves its owning site
  and any approved subordinate target from verified registration, active
  relationship/policy, authenticated realm session, and target membership.
- The app has no independent authoritative product, media, order, permission, or contract database; local data is cache/offline state only.
- Small client features may ship in the app and remain entitlement-locked. Large native features may be excluded until a new signed app build is released.
- Server-driven schemas may control content, theme, layout intent, navigation, and visibility, but new native executable capability requires a compatible app build.

Effective app access:

```text
site entitlement
AND app build contains the client module
AND app channel permits it
AND exact realm/application session is accepted
AND target membership/role permits the operation
AND backend module accepts it
```

## Contract And License Lifecycle

States:

```text
ACTIVE → EXPIRING → GRACE → SUSPENDED → TERMINATED
```

- `ACTIVE`: normal operation.
- `EXPIRING`: normal operation with scheduled warnings.
- `GRACE`: one-month contractual advantage period with prominent warnings.
- `SUSPENDED`: no new protected operations; read/export behavior follows the signed contract and feature policy.
- `TERMINATED`: workload access is removed; retention/deletion follows the accepted contract.

Warnings should be delivered through email, admin alerts, parent dashboard alerts, and audit records. Email alone is not authoritative delivery.

The license authority issues signed, deployment-bound leases or manifests containing tenant, site/deployment, contract, feature, limits, package digest, effective time, expiry, grace end, and signature. Services verify signatures locally and refresh leases on a bounded schedule. Server time is authoritative.

Normal suspension follows the accepted effective date and grace period. Emergency revocation is reserved for security incidents, fraud, or other contractually defined events.

Upgrades and downgrades require:

1. versioned change request;
2. price and package confirmation;
3. impact report;
4. client acknowledgement;
5. effective date;
6. module/app deployment plan;
7. backup/export and retention decision;
8. verification and audit closeout.

## Conceptual Data Skeleton

This is a target model across multiple phases, not an F4 schema. F4 may add only
the tenant/site authority and minimal entitlement reference selected by the F4
ADRs. Feature definitions, plans, contracts, grants, license lifecycle, and
installed modules are F6 or deferred commercial work as assigned above.

```text
Tenant
  id
  parentTenantId?
  status

Site
  id
  tenantId
  domain
  status

AppChannel
  id
  siteId
  platform
  packageIdentity
  status

FeatureDefinition
  key
  deploymentMode
  limitsSchema

Plan / PlanFeature
  versioned commercial catalog

Contract / ContractChange
  accepted package, dates, acknowledgement, status

TenantEntitlement
  tenantId
  featureKey
  limits
  effectiveAt
  expiresAt
  graceEndsAt

InstalledModule
  deploymentId
  featureKey
  version
  imageDigest
  health

Membership
  identityRealmId
  subjectId
  tenantId
  siteId?
  role
```

Final field names and service ownership must be frozen before migrations. This skeleton is a boundary guide, not an implemented schema.

## Admin Panel Prerequisites

Before building the main admin panel around tenant/site switching, the backend must freeze and test:

- tenant, parent/subordinate, site, and channel identifiers;
- identity-realm, provider, federation-trust, application audience, and
  principal-class identifiers/lifecycle;
- parent/reseller full-suite rule;
- realm-qualified membership, exact approved target access, and unapproved
  cross-tenant/sibling denial;
- feature catalog, plan, contract, entitlement, and limit contracts;
- application-first realm routing, application-bound sessions, and
  gateway-derived realm/subject/tenant/site/app context;
- site-scoped content and media ownership;
- app registration and capability manifest;
- license lifecycle and one-month grace behavior;
- audit model for parent actions and contract changes;
- module discovery/health contract;
- explicit allow/deny tests for selected subordinate targets, personnel-only
  exclusion, unrelated realms/licenses, and forged context.

The admin panel may then present these contracts; it must not invent or become the authority for them.

## Not In The First Slice

- Full Kubernetes operator.
- Customer Kubernetes or registry access.
- Arbitrary runtime npm plugin loading.
- Live cross-site media sharing.
- Automatic remote executable installation from the browser admin panel.
- Full streaming, 3D, AI, mobile, or tenant implementation before current launch/security blockers are closed.

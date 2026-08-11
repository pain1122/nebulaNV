# Tenant, Package, Channel, And Kubernetes Platform

Status: Target architecture. Not implemented unless a section explicitly says otherwise.

## Decision Summary

NebulaNV will be a centrally operated modular SaaS platform.

- NebulaNV owns and operates the backend cluster, nodes, registry, databases, storage policy, internal service network, and license authority.
- Clients receive website/admin builds and signed React Native applications, but no backend source, feature images, registry credentials, Kubernetes access, S2S secrets, or direct internal gRPC access.
- Baseline services run in the Kubernetes core workload. Premium capabilities run as separately deployable containerized modules.
- Every external website or app calls one public gateway. The gateway verifies the caller, resolves tenant/site/app context, checks entitlement, and forwards trusted context to internal services.
- A tenant may create subordinates only after purchasing the complete feature suite and a parent/reseller contract.
- Parent authority permits management and monitoring; it does not merge subordinate data.
- Each site owns isolated products, blogs, pages, settings, orders, users, and media.
- Each mobile app belongs to exactly one owning site. A parent may administer a subordinate app, but the app consumes only its owning site's data and entitlements.
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

## Ownership Hierarchy

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

## Commercial And Feature Rules

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
→ authenticate application/user
→ resolve tenant, site, channel, and contract
→ enforce entitlement and actor permission
→ attach signed internal context
→ internal gRPC/HTTP service
```

Rules:

- External clients never call internal services directly.
- Raw `x-user-id`, `x-tenant-id`, `x-site-id`, or `x-app-id` values are not trusted identity.
- Site and app context is derived from verified tokens, registered application identity, domain mapping, and membership.
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

Parent management does not imply shared rows or cross-site references. Parent actions run against an explicitly selected target site and record actor tenant, actor user, target tenant/site, action, request ID, timestamp, and outcome.

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
- Each app registration belongs to exactly one site.
- The app cannot select an arbitrary site. The gateway resolves the site from verified app registration and authenticated context.
- The app has no independent authoritative product, media, order, permission, or contract database; local data is cache/offline state only.
- Small client features may ship in the app and remain entitlement-locked. Large native features may be excluded until a new signed app build is released.
- Server-driven schemas may control content, theme, layout intent, navigation, and visibility, but new native executable capability requires a compatible app build.

Effective app access:

```text
site entitlement
AND app build contains the client module
AND app channel permits it
AND user role permits it
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
  userId
  tenantId
  siteId?
  role
```

Final field names and service ownership must be frozen before migrations. This skeleton is a boundary guide, not an implemented schema.

## Admin Panel Prerequisites

Before building the main admin panel around tenant/site switching, the backend must freeze and test:

- tenant, parent/subordinate, site, and channel identifiers;
- parent/reseller full-suite rule;
- membership and cross-tenant management authorization;
- feature catalog, plan, contract, entitlement, and limit contracts;
- gateway-derived tenant/site/app context;
- site-scoped content and media ownership;
- app registration and capability manifest;
- license lifecycle and one-month grace behavior;
- audit model for parent actions and contract changes;
- module discovery/health contract;
- explicit denial tests for cross-tenant access and forged context.

The admin panel may then present these contracts; it must not invent or become the authority for them.

## Not In The First Slice

- Full Kubernetes operator.
- Customer Kubernetes or registry access.
- Arbitrary runtime npm plugin loading.
- Live cross-site media sharing.
- Automatic remote executable installation from the browser admin panel.
- Full streaming, 3D, AI, mobile, or tenant implementation before current launch/security blockers are closed.

# ADR-0011: F4 Data Scope And Migration Matrix

Date: 2026-08-24

Status: accepted for the F4 Batch 1 data-scope and migration decision. Batch 2
items 2-3 stage the first eight authority roots plus the minimal
`EntitlementScopeRef`; the remaining authority records and every
existing-service scope migration remain later checklist items.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
tenant/site domain scope remains accepted, but the User/Auth and bare-user
reference rows are superseded. The corrective matrix must add realm/trust
records, realm-qualified Membership/PlatformGrant/domain actor references,
and realm credential/session persistence before later migrations continue.

That corrective record/owner matrix is frozen by
[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md); the original
tables below remain the historical default-realm migration input.

## Decision Scope

This ADR freezes the ownership fields, uniqueness, indexes, same-database and
cross-service references, default backfill, orphan evidence, rollback boundary,
and minimum denial test for every current persistence root and every child that
the repository queries or mutates directly.

It also freezes the minimum tenant-authority-service record matrix needed before its
Batch 2 schema is written. It does not create a Prisma schema, migration,
proto, generated contract, runtime service, cache, storage move, or audit
database.

## Context And Classified Findings

The seven existing Prisma databases contain no authoritative tenant/site
ownership columns. Global slugs, SKUs, carts, order numbers, Settings keys,
taxonomy keys, and Media hashes therefore cannot support two isolated sites.
This is a **confirmed gap against F4**, not a defect in the current single-site
F3 runtime.

The following pre-existing facts require explicit treatment:

- Settings seeds `order/cart_ttl_minutes` as a number while its implemented
  consumer reads a string. This is a **confirmed defect** that must be corrected
  before Settings/Order migration evidence.
- Order migration history declares different currency/decimal defaults from
  the current Prisma schema. This is a **confirmed schema drift defect** that
  must be reconciled with a new migration, never by editing old history.
- Media path allocation lacks a database uniqueness constraint and can collide
  across current business `scope` values. This is a **confirmed defect** that
  must be corrected before tenant/site prefixes are relied on.
- Product migration history retains an unmapped `product_category` table;
  Blog retains dormant local categories and string category labels beside its
  active Taxonomy facade. These are **stale implementations**, not reasons to
  merge service databases.
- Product and Blog store managed-media URLs rather than Media-service IDs even
  though current target documentation assigns semantic media references to
  domain owners. This is a **confirmed F4 reference gap**.

Duplicating tenant/site fields on every child, normalizing every ID array into
join tables, tenant-shared taxonomy, and platform templates directly referenced
by site data are **optional hardening or future scaling considerations**. This
matrix uses the narrowest schema that makes every current direct query safe.

## Global Scope Rules

1. Tenant-authority-service creates canonical ADR-0003 UUIDv4 tenant/site IDs. Domain
   migrations consume IDs from a checked migration manifest; readable F3
   labels never become persistent authority IDs.
2. Every site-owned aggregate root stores both non-null `tenantId` and
   non-null `siteId`. `siteId` alone is insufficient because domain databases
   cannot foreign-key to tenant-authority-service and must detect contradictory
   tenant/site pairs.
3. Domain databases do not store `applicationId` or `channelId` as ownership.
   Applications/channels select a verified site; they do not own business data.
4. A directly queried/mutated child duplicates `tenantId`/`siteId` and uses a
   composite same-scope foreign key to its parent. A child accessed only through
   its parent derives scope through that parent and does not duplicate columns.
5. Each scoped parent retains its global primary key and adds a unique
   `(id, tenantId, siteId)` candidate key for composite child references.
6. No domain database creates a foreign key to another service database.
   Cross-service references use a typed owner lookup at writes, matching
   tenant/site proof, and an exported-ID orphan audit before enforcement.
7. All current records backfill to one authority-created default tenant and its
   primary site through parameters `:default_tenant_id` and
   `:default_site_id`. The migration manifest records IDs, source counts,
   updated counts, remaining nulls, contradictions, and checksum/time.
8. Scope columns are added nullable, backfilled/audited, indexed and constrained,
   enforced in every read/write, and only then made non-null. Global uniqueness
   is replaced only after scoped duplicate queries pass.
9. A valid ID from another site returns the operation's timing-safe not-found or
   forbidden policy and never reveals which scope owns it.
10. Scope deletion is not physical cascade from tenant-authority-service. ADR-0004
    lifecycle blocks access; each owning service retains, exports, or deletes
    data only through its later approved lifecycle operation.

## User-Approved Content Policies

### Taxonomy

All current Product and Blog taxonomy records are site-owned. The current
`scope` field continues to mean the consuming domain (`product` or `blog`); it
is renamed only if a later clarity migration is separately approved and never
stands in for `tenantId`/`siteId`.

F4 has no tenant-shared taxonomy. A future platform template may be copied to a
site with new site-owned IDs and provenance, but site data never directly
references a platform/other-site taxonomy row.

### Settings

Settings supports only two F4 ownership kinds:

```text
PLATFORM -> tenantId NULL, siteId NULL
SITE     -> tenantId set, siteId set
```

Existing `i18n`, `pricing`, and `order` seed rows become `PLATFORM` defaults.
Site business values—including `product/default_product_category` and future
`blog/default_blog_category`—are `SITE` rows. There is no tenant override layer
in F4.

Resolution is explicit: an operation requests one server-verified site and a
key policy decides whether that key permits a site override and platform
fallback. Absence never authorizes a security/trust setting, and Settings still
owns no secrets, credentials, role policy, database URLs, storage credentials,
or S2S configuration.

### Managed Media

Product and Blog managed content references same-site Media-service IDs. New
writes cannot make a raw URL authoritative. Additive media-ID columns are
backfilled through a Media-owned manifest; any non-empty URL that cannot be
mapped to one same-site Media row must be corrected before its operation is
enforced.

Legacy URL columns remain read-compatible during the migration window, stop
accepting writes after ID cutover, and are removed/reserved only after every
producer/consumer has migrated. Render URLs are projections generated through
Media/gateway policy, not stored ownership.

## Tenant-Authority-Service Record Matrix

The first Batch 2 persistence slices now stage `Tenant`, `Site`, `Channel`,
`Application`, `WebOrigin`, `AndroidIdentity`, `IosIdentity`,
`ParentRelationship`, and the minimal `EntitlementScopeRef`. The remaining
rows in this matrix are not implemented early. These are the minimum Batch 2
roots and constraints; names may change only mechanically without changing the
semantics.

| Record                        | Required ownership and lifecycle fields                                                                                                                                            | Required uniqueness, references, and indexes                                                                                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Tenant`                      | UUIDv4 `id`; ADR-0004 status; display metadata; revision facts                                                                                                                     | Primary key `id`; indexes by status. No parent field: relationships remain separate.                                                                                                                                                                                                      |
| `Site`                        | UUIDv4 `id`; non-null `tenantId`; ADR-0004 status; `isPrimary`; revision facts                                                                                                     | FK to Tenant; unique `(id, tenantId)`; partial unique one `isPrimary = true` per tenant; indexes `(tenantId, status)` and `(tenantId, isPrimary)`. A tenant must have exactly one primary site before activation.                                                                         |
| `Channel`                     | UUIDv4 `id`; non-null tenant/site; ADR-0005 kind                                                                                                                                   | composite FK `(siteId, tenantId)` to Site; unique `(siteId, kind)`; unique `(id, tenantId, siteId)`; index tenant/site.                                                                                                                                                                   |
| `Application`                 | UUIDv4 `id`; authority-issued public `clientId`; tenant/site/channel; approved profile; ADR-0004 lifecycle; revision                                                               | global unique active/tombstoned `clientId`; composite FK channel/site; immutable owning site except ADR-0006 atomic transfer; indexes lifecycle and tenant/site/channel/profile.                                                                                                          |
| `WebOrigin`                   | UUIDv4 `id`; application/site provenance; canonical scheme/host/explicit port; verification state/evidence                                                                         | global uniqueness of active canonical origin; FK application; no wildcard; tombstone prevents unsafe reassignment; indexes application/state.                                                                                                                                             |
| `AndroidIdentity`             | UUIDv4 `id`; application; normalized package ID; app-sign certificate SHA-256; verification evidence/state                                                                         | global active uniqueness `(packageId, certificateSha256)`; application must use ANDROID channel; FK application; tombstone/transfer audit.                                                                                                                                                |
| `IosIdentity`                 | UUIDv4 `id`; application; uppercase Team ID; explicit Bundle ID; verification evidence/state                                                                                       | global active uniqueness `(teamId, bundleId)`; application must use IOS channel; FK application; tombstone/transfer audit.                                                                                                                                                                |
| `ParentRelationship`          | UUIDv4 `id`; parent tenant; subordinate tenant; ADR-0007 state; revision                                                                                                           | endpoint inequality; FK both tenants; at most one pending/active parent per child; no duplicate active pair; transaction rejects cycles; indexes parent/state and child/state.                                                                                                            |
| `Membership`                  | UUIDv4 stable `id`; tenant; global User-service `userId`; membership state; nullable/current `membershipEpochId`; revision                                                         | FK tenant and current immutable epoch; unique `(tenantId, userId)` for logging continuity; index user/state and tenant/state. User ID is typed-validated, not a cross-DB FK.                                                                                                              |
| `MembershipEpoch`             | UUIDv4 `id`; membership ID; internal integer `generation >= 1`; immutable opaque `membershipEpochRef`; HMAC key ID; created/closed facts                                           | FK membership; unique `(membershipId, generation)` and global unique epoch ref; the current Membership pointer must reference its own epoch. Historical rows are immutable and retained.                                                                                                  |
| `TenantRoleGrant`             | UUIDv4 `id`; membership epoch ID; exact `TENANT_ADMIN` or `PARENT_MANAGER`; `ACTIVE`/`REVOKED` state                                                                               | FK immutable MembershipEpoch; partial unique one active grant per membership epoch; assignment constraints from ADR-0008; indexes role/state and epoch/state.                                                                                                                             |
| `SiteRoleGrant`               | UUIDv4 `id`; membership epoch ID; tenant/site; exact `SITE_ADMIN`, `EDITOR`, or `USER`; `ACTIVE`/`REVOKED` state                                                                   | FK immutable MembershipEpoch and composite FK site/tenant; partial unique one active grant per `(membershipEpochId, siteId)`; indexes site/role/state and epoch/state.                                                                                                                    |
| `PlatformGrant`               | UUIDv4 `id`; User-service `userId`; exact `PLATFORM_ADMIN`; grant lifecycle/revision                                                                                               | unique active `(userId, role)`; last-valid-platform-admin removal requires recovery policy; no tenant/site fields.                                                                                                                                                                        |
| `EntitlementScopeRef`         | UUIDv4 opaque ID; exact `TENANT` or `SITE` binding kind; tenant; site only for `SITE`; created/revision facts                                                                      | FK tenant and optional composite site/tenant; partial unique one tenant-bound ref per tenant and one site-bound ref per `(tenantId, siteId)`; `TENANT` requires null site and `SITE` requires non-null site. No feature keys, enabled flag, plan, limit, or license behavior exist in F4. |
| `AuthorityInvalidationOutbox` | UUIDv4 event ID; aggregate kind/ID; affected target/reference IDs; exact new revision; payload version; pending/dispatched state, attempts, next-attempt, created/dispatched times | inserted in the same transaction as the authority change; unique event ID; indexes `(state, nextAttemptAt, createdAt)` and aggregate/revision. Payload contains no secrets and is retained long enough to prove/replay delivery under ADR-0012.                                           |
| `AuthorityAuditEvent`         | UUIDv4 event ID; monthly partition/time; ADR-0012 actor/path/operation/target/request/result/reason/revision/minimized-change facts; previous/event HMAC; key ID                   | insert-only runtime role; unique event ID; indexes request ID, actor/time, target tenant/site/time, operation/result/time, and relationship/time. No destructive FK cascade; 365-day retention and legal-hold/destruction rules follow ADR-0012.                                          |

`Membership` ID remains stable for one tenant/user pair. `SUSPENDED -> ACTIVE`
keeps the current epoch. Re-inviting a `REVOKED` membership uses the same ID for
audit continuity but atomically creates the next immutable `MembershipEpoch`,
sets `REVOKED -> PENDING`, points Membership to the new epoch, and creates new
grant IDs tied to it. Old epochs and grants remain historical and can never
match the current pointer.

Membership uses `PENDING`, `ACTIVE`, `SUSPENDED`, and `REVOKED`. Normal
activation is `PENDING -> ACTIVE`; suspension is reversible
`ACTIVE <-> SUSPENDED`; every non-revoked state may move to `REVOKED`.
`REVOKED -> PENDING` is allowed only as the re-invite transaction described
above, never by reopening the revoked epoch. Role and target fields on a grant
are immutable: a role change revokes the old grant and creates a new active
grant. Membership state and current-epoch checks remain ceilings over every
grant, so an active grant under a suspended/revoked membership or closed epoch
grants nothing.

The numeric generation is authority-internal and must not appear in signed
context, ordinary application logs, public/internal DTOs outside the authority
administration/audit boundary, consumer-visible cache keys, or job/event
payloads. Authority creates and persists:

```text
membershipEpochRef =
  "meg1_" + base64url(HMAC-SHA256(
    dedicatedAuthorityEpochKey,
    canonical(["nebula-membership-epoch", "1", membershipId, generation])
  ))
```

The frozen canonical JSON-array input removes concatenation ambiguity. A plain
hash is forbidden because small generation numbers are guessable. The
dedicated authority epoch key must not reuse Auth session-ref, JWT, S2S,
application-registration, or audit keys. `MembershipEpoch` stores the key ID,
not the secret. The resulting reference is non-secret and grants nothing alone,
but it is immutable, unique, never reused, and changes on every
revoked-to-pending re-invite. Key rotation creates new epochs with the new key;
it does not rewrite or invalidate stored historical refs.

ADR-0010 context carries `membershipEpochRef`, and the composite
`authorityRevision` also incorporates the epoch. A still-valid Auth session
avoids credential login but grants no scope until the new epoch is resolved.

## Existing-Service Scope Matrix

### User And Auth

| Record                     | Scope decision                                   | Constraints, references, and migration                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User-service `User`        | Global identity; **no tenant/site columns**      | Preserve global email/phone uniqueness and password/profile ownership. Audit role strings, seed Membership/grants in authority, and keep `role` only for the ADR-0008 compatibility window. Invalid strings create no grant.   |
| Auth Redis sessions/tokens | Global identity session; no relational migration | Preserve Auth ownership and current keys. Membership epoch/revision invalidates scope separately; it does not delete a session used by another tenant. Tenant-scoped session summaries/revocation remain optional future work. |

### Settings-Service

| Root/direct child | Scope fields                                                                       | Uniqueness and indexes                                                                                                                                                                                  | References and access                                                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Setting` root    | non-null `scopeKind`; nullable `tenantId`/`siteId` constrained as PLATFORM or SITE | replace global unique key with partial unique PLATFORM `(namespace, environment, key)` and partial unique SITE `(tenantId, siteId, namespace, environment, key)`; index SITE target/key and `deletedAt` | SITE pair verified against authority; server-owned key registry declares permitted ownership/fallback. Category-setting values are typed taxonomy references, not arbitrary strings. |

PostgreSQL partial indexes are required because ordinary uniqueness treats
multiple `NULL` values as distinct. Prisma cannot express these constraints
fully; the migration SQL and schema comments must remain the source of truth,
with a migration test proving they exist.

### Taxonomy-Service

| Root/direct child         | Scope fields                  | Uniqueness and indexes                                                                                                                                                        | References and access                                                                                                                                                               |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Taxonomy` self-tree root | non-null `tenantId`, `siteId` | unique `(tenantId, siteId, scope, kind, slug)` and candidate `(id, tenantId, siteId)`; indexes `(tenantId, siteId, scope, kind)`, `(tenantId, siteId, scope, kind, parentId)` | composite self-FK `(parentId, tenantId, siteId)` prevents cross-site parent; cycle/depth/path checks remain transactional. Product/Blog facades retain exact `scope`/`kind` checks. |

### Media-Service

| Root/direct child                    | Scope fields                                                                                                                                                                                                                                     | Uniqueness and indexes                                                                                                                                                                                                                                         | References and access                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Media` root                         | non-null `tenantId`, `siteId`                                                                                                                                                                                                                    | replace global SHA uniqueness with `(tenantId, siteId, sha256)`; candidate `(id, tenantId, siteId)`; unique normalized physical `(storage, coalescedBucket, path)`; scope-prefix indexes for status/scan/access/visibility/owner/folder/display/entity queries | `ownerId` remains global User ID. `(entityType, entityId)` is optional polymorphic association and must be both-null or both-set; owner service validates same-site target. Storage key must use later versioned tenant/site prefix.                         |
| `MediaStorageMove` coordination root | non-null `tenantId`, `siteId`; Media ID; service-issued operation ID; ADR-0012 state; canonical source/destination provider/bucket/key; expected/verified size and checksum/ETag; requested folder/display metadata; attempts/error reason/times | composite FK `(mediaId, tenantId, siteId)` to Media; unique operation ID; partial unique one active move per Media and one active canonical destination; indexes state/next-attempt, tenant/site/state, and Media/state                                        | all upload/move allocators take the same transaction-level canonical-destination advisory lock, then check both live Media physical uniqueness and active reservations. No raw client path authority. History is retained through cleanup/recovery evidence. |

Bucket must be normalized to a non-null canonical value or protected by a
manual expression index using `COALESCE`; otherwise PostgreSQL null semantics
would permit duplicate physical keys. A later public-file rename preserves the
Media ID, original bytes, checksum, and content references while changing its
`displayName` and descriptive storage key. It must use the storage-move recovery
protocol and never become an image-edit operation or a second identity for the
same row. ADR-0012 freezes the copy/checksum/retry state and recovery behavior;
later implementation must follow both ADRs.

### Product-Service

| Root/direct child                            | Scope fields                                | Uniqueness and indexes                                                                                                                                                                                          | References and access                                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Product` root                               | non-null `tenantId`, `siteId`               | replace global slug/SKU with `(tenantId, siteId, slug)` and `(tenantId, siteId, sku)`; candidate `(id, tenantId, siteId)`; scope-prefix indexes for public/admin status/deleted/category/featured queries       | `categoryId` must resolve to same-site Product taxonomy. `complementaryIds` remain an array but every ID must be same-site Product. Add nullable `thumbnailMediaId`, `model3dMediaId`, `model3dPosterMediaId`, `vrPlanImageMediaId`, then require same-site Media before URL write retirement.                       |
| `ProductSet` root                            | non-null `tenantId`, `siteId`               | replace global slug with `(tenantId, siteId, slug)`; scope-prefix active/deleted indexes                                                                                                                        | `productIds` remain an array; validate every product against same site on write and through orphan export. Normalized join table is future scaling, not required now.                                                                                                                                                |
| `ProductGalleryImage` directly queried child | duplicate non-null `tenantId`, `siteId`     | composite FK `(productId, tenantId, siteId)` to Product candidate; indexes `(tenantId, siteId, productId, sortOrder)` and scope/deleted; partial unique active `(productId, mediaId)` where `deletedAt IS NULL` | add nullable then required `mediaId`; same-site Media validation. One active gallery entry may reference a given Media row per Product; a soft-deleted entry does not block re-adding it. `url` becomes compatibility projection and stops accepting writes. Direct update/delete always includes product and scope. |
| `ProductVrHotspot` parent-derived child      | derives through Product; no duplicate scope | retain parent FK/index; add `panoMediaId` and same-site validation through loaded Product                                                                                                                       | Any future direct-by-ID route must join Product or first add composite scope fields; `panoImageUrl` becomes compatibility only.                                                                                                                                                                                      |
| `ProductAttribute` parent-derived child      | derives through Product                     | retain parent FK/index; all mutations occur through loaded scoped Product                                                                                                                                       | No external authority reference.                                                                                                                                                                                                                                                                                     |
| `ProductComment` parent-derived child        | derives through Product                     | retain parent FK/index; enforce optional comment parent belongs to same Product through `(parentId, productId)` self-reference                                                                                  | `userId` is optional global User ID; anonymous author fields do not create membership.                                                                                                                                                                                                                               |

The physical legacy `product_category` table is not an aggregate owner. Audit
it before Product migration. If empty, drop it in a new migration. If non-empty,
export it and explicitly map required rows to same-site Taxonomy records; never
reinterpret its IDs automatically. Product `category_id` is valid only against
the Taxonomy-service manifest.

### Blog-Service

| Root/direct child                  | Scope fields                  | Uniqueness and indexes                                                                                                           | References and access                                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlogPost` root                    | non-null `tenantId`, `siteId` | replace global slug with `(tenantId, siteId, slug)`; candidate `(id, tenantId, siteId)`; indexes scope/status/published/category | local `categoryId` uses composite same-site FK to BlogCategory. Add nullable then enforced `coverImageMediaId` validated with same-site Media; `coverImageUrl` becomes compatibility only. String `categories` remain non-authoritative labels. |
| `BlogCategory` local root          | non-null `tenantId`, `siteId` | replace global slug with `(tenantId, siteId, slug)`; candidate `(id, tenantId, siteId)`; scope/deleted indexes                   | Preserve as a local editorial grouping because it already owns BlogPost relations; do not merge it with Taxonomy automatically. The separate Blog Taxonomy facade remains site-scoped classification.                                           |
| `BlogComment` parent-derived child | derives through BlogPost      | retain cascade FK; add `postId` index; all direct access must load scoped BlogPost                                               | `authorUserId` is optional global User ID and grants no membership.                                                                                                                                                                             |

Dormant BlogCategory rows and string category labels are audited but not copied
into Taxonomy automatically. Consolidating the two category concepts is a
future product decision; F4 scopes both safely without replacing them.

### Order-Service

| Root/direct child                          | Scope fields                            | Uniqueness and indexes                                                                                                                                                 | References and access                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cart` root                                | non-null `tenantId`, `siteId`           | replace global user uniqueness with `(tenantId, siteId, userId)`; candidate `(id, tenantId, siteId)`; indexes scope/user and scope/expiry                              | `userId` is global User ID plus active same-site USER grant. One person's carts at other sites remain independent.                                                                                |
| `CartItem` directly mutated child          | duplicate non-null `tenantId`, `siteId` | composite FK `(cartId, tenantId, siteId)`; unique `(cartId, productId)` to close the existing concurrent duplicate-item race; scope/cart index                         | Product lookup must prove same target site before create/update. Item IDs never bypass loading the scoped Cart.                                                                                   |
| `Order` root                               | non-null `tenantId`, `siteId`           | replace global order-number uniqueness with `(tenantId, siteId, orderNumber)`; candidate `(id, tenantId, siteId)`; indexes scope/user/created and scope/status/created | `userId` stays a global identity reference. Checkout copies Cart scope atomically; admin updates require exact target.                                                                            |
| `OrderItem` immutable parent-derived child | derives through Order                   | retain parent FK/index; no duplicate scope; item becomes immutable after checkout                                                                                      | `productId`, SKU, name, and price are historical snapshots. Product same-site ownership is proved at add-to-cart and rechecked at checkout; later product deletion does not invalidate the order. |

The Order drift fix must first make a clean database agree with the declared
currency and `Decimal(18,2)` policy. The chosen currency policy itself is not
changed by adding scope.

## Direct-Query Rule

The repository currently uses direct delegates only for these children:

- `ProductGalleryImage`;
- `CartItem`.

They therefore duplicate scope now. `ProductVrHotspot`, `ProductAttribute`,
`ProductComment`, `BlogComment`, and `OrderItem` remain parent-derived. Creating
a future repository/controller that queries one of them by ID without joining
its scoped parent is prohibited until the matrix is amended and migration/tests
exist. This avoids redundant columns while making the current query surface
safe.

## Cross-Service Reference Matrix

| Consumer reference                              | Authoritative owner check   | Required matching facts                                                        | Orphan/failure behavior                                                                                                |
| ----------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Membership/role grant `userId`                  | User-service                | global user exists; Auth independently decides identity/session validity       | Unknown user prevents activation; never create a placeholder identity.                                                 |
| Product `categoryId` and site category Settings | Taxonomy-service            | ID exists, same tenant/site, `scope=product`, expected kind, usable lifecycle  | Create/update/default resolution denies. Existing orphan blocks Product cutover.                                       |
| Product/Blog taxonomy facade IDs                | Taxonomy-service            | exact same site plus facade-owned scope/kind                                   | Wrong-site ID returns scoped not-found/invalid input.                                                                  |
| Product/Blog media IDs                          | Media-service               | ID exists in same tenant/site; required access class/status/mime/use policy    | New writes deny; unresolved legacy URL blocks that row's cutover.                                                      |
| Media `entityType/entityId`                     | named domain owner          | supported entity type, ID exists in same site, caller allowed to attach        | Unknown type/ID or owner outage denies association/finalize.                                                           |
| CartItem/Product and checkout snapshots         | Product-service             | active usable Product exists in exact Cart/Order site                          | Add/checkout denies; already-created OrderItem remains immutable history.                                              |
| Product complementary/product-set arrays        | Product-service itself      | every ID exists and matches root tenant/site                                   | Write denies atomically; any orphan blocks constraint/enforcement cutover.                                             |
| Domain `userId`/`ownerId`                       | User-service plus authority | global user exists when required; active target membership/grant for operation | ID alone grants nothing. Deleted/disabled identity and revoked membership are evaluated independently.                 |
| Domain tenant/site pair                         | Tenant-authority-service    | both exist, site belongs to tenant, effective lifecycle permits operation      | No cross-DB FK; unavailable/contradictory authority follows the next failure matrix and never falls back to row input. |

Cross-service validation is performed by typed owner contracts. Batch migrations
also export compact manifests `(id, tenantId, siteId, lifecycle/use facts)` from
each owner and import them into temporary audit tables in the consumer database.
Application runtime may not query another service's database directly merely
because the migration tooling uses a controlled export.

## Default Backfill And Ordered Constraint Pattern

Every existing domain database follows this local sequence; the cross-service
dependency order is frozen later in this ADR:

1. Record backup/restore point, schema/migration checksum, row counts, global
   uniqueness, current nulls, and current orphans.
2. Add nullable `tenantId`/`siteId` and additive media/reference fields without
   changing readers or global uniqueness.
3. Backfill every current root with the manifest's default tenant/site in
   bounded transactions. Backfill directly queried children from their parent,
   never from request or URL data.
4. Import authority and referenced-owner audit manifests. Prove every
   tenant/site pair and cross-service ID matches.
5. Resolve legacy media URLs to same-site Media IDs and explicitly correct all
   unresolved non-empty values. Do not invent Media rows from filenames alone.
6. Create non-unique scope-prefixed indexes concurrently where PostgreSQL and
   deployment tooling permit it. Verify query plans for current list/get/write
   shapes.
7. Add candidate keys, composite same-scope foreign keys, checks, and new scoped
   unique indexes. Keep old global unique indexes until duplicate and runtime
   compatibility evidence passes.
8. Deploy dual-read/shadow comparisons, then scope every read/write/reference
   path. A missing scope denies rather than selecting the default implicitly.
9. Switch uniqueness to scoped constraints in one controlled migration window;
   seed the second site with deliberate duplicate slugs/SKUs/names to prove the
   new boundary.
10. Make required scope/media fields non-null only after remaining-null and
    orphan queries return zero. Stop URL writes before removing legacy URL
    fields in a later compatible release.

Backfill SQL uses bound UUID parameters, never readable labels:

```sql
UPDATE "RootTable"
SET "tenantId" = :default_tenant_id,
    "siteId" = :default_site_id
WHERE "tenantId" IS NULL OR "siteId" IS NULL;
```

Direct children derive scope from the parent:

```sql
UPDATE "DirectChild" AS child
SET "tenantId" = parent."tenantId",
    "siteId" = parent."siteId"
FROM "Parent" AS parent
WHERE child."parentId" = parent."id"
  AND (child."tenantId" IS NULL OR child."siteId" IS NULL);
```

If a child already has a non-null contradictory pair, the migration stops and
records it; the update must not overwrite evidence of cross-scope corruption.

## Required Audit Queries

Actual migration files substitute each exact table/column name and retain the
results. These query shapes are mandatory, not illustrative tests that may be
omitted.

### Null and contradictory scope

```sql
SELECT "id", "tenantId", "siteId"
FROM "RootTable"
WHERE "tenantId" IS NULL OR "siteId" IS NULL;
```

Authority exports provide `f4_valid_sites(tenant_id, site_id)`. Each domain
database runs:

```sql
SELECT root."id", root."tenantId", root."siteId"
FROM "RootTable" AS root
LEFT JOIN f4_valid_sites AS valid
  ON valid.tenant_id = root."tenantId"
 AND valid.site_id = root."siteId"
WHERE valid.site_id IS NULL;
```

### Direct-child mismatch or orphan

```sql
SELECT child."id", child."parentId",
       child."tenantId", child."siteId",
       parent."tenantId" AS parent_tenant_id,
       parent."siteId" AS parent_site_id
FROM "DirectChild" AS child
LEFT JOIN "Parent" AS parent ON parent."id" = child."parentId"
WHERE parent."id" IS NULL
   OR child."tenantId" IS DISTINCT FROM parent."tenantId"
   OR child."siteId" IS DISTINCT FROM parent."siteId";
```

### Scoped uniqueness collisions

```sql
SELECT "tenantId", "siteId", "ScopedKey", COUNT(*)
FROM "RootTable"
GROUP BY "tenantId", "siteId", "ScopedKey"
HAVING COUNT(*) > 1;
```

Run this for Product slug/SKU, ProductSet slug, BlogPost/BlogCategory slug,
Cart user, Order order number, Taxonomy scope/kind/slug, Settings key per
ownership kind, Channel kind, registration natural identity, and every grant
unique key.

### Cross-service reference orphan

After loading an owner export such as
`f4_valid_taxonomy(id, tenant_id, site_id, scope, kind)`:

```sql
SELECT product."id", product."category_id"
FROM "Product" AS product
LEFT JOIN f4_valid_taxonomy AS taxonomy
  ON taxonomy.id = product."category_id"
 AND taxonomy.tenant_id = product."tenantId"
 AND taxonomy.site_id = product."siteId"
 AND taxonomy.scope = 'product'
 AND taxonomy.kind = 'category.default'
WHERE taxonomy.id IS NULL;
```

Media reference audits use the same shape for every media-ID column and require
the owner manifest's lifecycle/access/mime policy. URL strings are not accepted
as a successful join.

### ID-array orphan or cross-site reference

```sql
SELECT owner."id", ref.product_id
FROM "ProductSet" AS owner
CROSS JOIN LATERAL unnest(owner."productIds") AS ref(product_id)
LEFT JOIN "Product" AS product
  ON product."id" = ref.product_id
 AND product."tenantId" = owner."tenantId"
 AND product."siteId" = owner."siteId"
WHERE product."id" IS NULL;
```

Repeat for Product `complementaryIds`. Duplicate IDs inside one array are also
reported and corrected before enforcement.

### Taxonomy tree mismatch

```sql
SELECT child."id", child."parentId"
FROM "Taxonomy" AS child
LEFT JOIN "Taxonomy" AS parent
  ON parent."id" = child."parentId"
 AND parent."tenantId" = child."tenantId"
 AND parent."siteId" = child."siteId"
 AND parent."scope" = child."scope"
 AND parent."kind" = child."kind"
WHERE child."parentId" IS NOT NULL
  AND parent."id" IS NULL;
```

Cycle/depth/path reconciliation remains required in addition to this ownership
query.

### Media physical-key collision

```sql
SELECT "storage", COALESCE("bucket", ''), "path", COUNT(*)
FROM "Media"
GROUP BY "storage", COALESCE("bucket", ''), "path"
HAVING COUNT(*) > 1;
```

No tenant/site prefix migration begins until current collisions are resolved.

### Stale physical records

```sql
SELECT COUNT(*) AS stale_product_category_rows
FROM "product_category";
```

Non-zero rows require export and explicit mapping. The table is never treated
as the owner of Product category IDs after the existing FK removal.

## Service Migration And Evidence Matrix

| Service                  | Default backfill                                                                                                                                                                                                                           | Must be zero before enforcement                                                                                                                                                                                                                      | Rollback boundary                                                                                                                                                              | Minimum denial evidence                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tenant-authority-service | seed one main tenant, exactly one primary site, channels/apps, memberships/epochs/grants and entitlement refs with UUID manifest; map F3 labels as aliases only; audit/outbox begin empty and record migration operations after activation | duplicate ownership/natural identities; invalid lifecycle; site/tenant mismatch; multiple primary sites; relationship self/cycle/multiple parent; Membership/current-epoch/grant mismatch; invalid audit chain; stuck/duplicate/contradictory outbox | before consumers reference IDs, remove additive seed/schema; afterward retain IDs/tombstones/audit/outbox and restore/reconcile rather than regenerate                         | forged client handle; wrong site/channel; revoked app/membership/grant; old membership epoch; sibling/transitive parent; duplicate/concurrent create; audit outage/immutability; lost/late/duplicate invalidation |
| user-service             | no tenant/site backfill; map valid legacy roles to authority records                                                                                                                                                                       | invalid role values; missing mapped default membership for intended users; unknown authority user IDs                                                                                                                                                | retain global User; remove only additive authority grants before references, otherwise reconcile                                                                               | global user ID alone cannot access a site; invalid role grants nothing; disabled Auth user denied independently                                                                                                   |
| settings-service         | existing seed/current rows -> PLATFORM; category reference settings are newly seeded per default site                                                                                                                                      | invalid PLATFORM/SITE null combination; duplicate partial keys; numeric/string drift; site category setting wrong-site/orphan                                                                                                                        | keep old key columns and global reader during shadow window; after site references exist, rollback must preserve/correct site rows and cannot flatten them globally            | copied site selector; wrong-site setting read/write; forbidden key fallback; site category points to other site; duplicate platform/site row                                                                      |
| taxonomy-service         | every current Taxonomy -> default site                                                                                                                                                                                                     | null/unknown scope; duplicate scoped slug; parent orphan/cross-site/scope/kind mismatch; cycle/depth/path contradiction                                                                                                                              | retain old unique until scoped path passes; after second-site duplicates exist, global rollback requires data rename/export and is not a context toggle                        | same slug allowed across sites; ID from other site denied; cross-site parent denied; Product/Blog scope/kind mismatch denied                                                                                      |
| media-service            | every current Media -> default site; map physical objects without moving yet; create move rows only when a prefix/rename operation begins                                                                                                  | null/unknown scope; physical path collision; cross-site entity; global SHA conflict handling; unresolved content media refs; duplicate/stuck move; source/destination/checksum contradiction                                                         | columns/indexes removable before references/prefixes; after domain media IDs or object moves, restore manifest/objects/refs/move state together                                | guessed/copied ID; wrong-site list/render/delete; same hash in different site isolated; wrong-site entity association; path reservation collision; failure/retry at every move state                              |
| product-service          | all roots -> default site; Gallery scope from Product; media IDs from manifest                                                                                                                                                             | Product/ProductSet scoped duplicates; Gallery orphan/mismatch; taxonomy/media/complementary/product-set orphan; stale product_category disposition                                                                                                   | retain URL/global keys during shadow; after second-site duplicates and required media IDs, rollback needs reference export/rename and cannot restore global uniqueness blindly | public/admin wrong-site ID/list/count; same slug/SKU across sites; cross-site taxonomy/media/complement/product set; Gallery ID with wrong parent/site                                                            |
| blog-service             | BlogPost/BlogCategory -> default site; media IDs from manifest; comments derive parent                                                                                                                                                     | scoped slug duplicates; local category orphan/mismatch; cover media orphan; comment orphan; dormant/string-category inventory                                                                                                                        | retain URL/global keys during shadow; after duplicates/media enforcement, rollback requires reference reconciliation                                                           | wrong-site slug/ID/list/count/mutate; cross-site local category/media; taxonomy facade wrong site; comment cannot escape parent site                                                                              |
| order-service            | Cart/Order -> default site; CartItem scope from Cart; OrderItem derives Order                                                                                                                                                              | schema drift; duplicate scoped cart/order number; CartItem/OrderItem orphan; cross-site Product refs; cart/item scope mismatch                                                                                                                       | retain global keys only before second-site duplicate data; orders/snapshots are never reassigned during rollback                                                               | same user separate site carts; copied item/order ID denied; cross-site Product add/checkout denied; admin target mismatch; snapshots remain exact site history                                                    |

## Required Runtime Query Shape

After a service slice is enforced, every root query includes verified scope in
the database predicate, including `findUnique` replacements, counts, bulk
updates, soft delete/restore/hard delete, public lists, and admin lists:

```text
WHERE tenantId = verifiedTarget.tenantId
  AND siteId = verifiedTarget.siteId
  AND resource selector/business filters
```

Loading by globally unique `id` and checking scope afterward is insufficient
for mutation because it can leak existence and creates a race between check and
write. Use a scoped unique selector where available or scoped `findFirst` plus
scoped `updateMany`/transaction with affected-row verification. A direct child
query includes its duplicated scope and parent ID. A parent-derived child query
joins or starts from its scoped parent.

## Rollback Rules

- Before new IDs/columns are referenced and before scoped duplicates exist,
  rollback may restore the old runtime and remove additive nullable fields.
- Once two sites intentionally use the same formerly global slug/SKU/key/order
  value, an old global unique index cannot be recreated without an explicit
  rename/export decision.
- Once domain rows reference Media/Taxonomy/authority IDs, rollback preserves
  those IDs and reconciles manifests; it cannot replace them with raw URLs,
  labels, client IDs, or default-site assumptions.
- Membership rollback never deletes/reuses a `MembershipEpoch`, decrements its
  generation, reuses `membershipEpochRef`, or repoints Membership to a closed
  epoch. Old grants remain non-current even if a deployment is rolled back.
- Authority rollback retains append-only audit and committed invalidation outbox
  facts. It may replay an event but never fabricates delivery, rewrites history,
  or rolls a revision backward.
- OrderItem snapshots stay with their original Order/site and are never
  re-parented to satisfy rollback.
- Object-key rollback follows `MediaStorageMove` state and the storage manifest
  and never moves or deletes bytes from a computed unverified prefix.
- Every migration rollback is exercised on a restored copy before production
  cutover; documentation-only reversibility is insufficient.

## Failure-Oriented Review

| Concern             | Matrix decision                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Scope on every root/direct child; composite same-scope FKs; scoped uniqueness/indexes; typed owner validation; site-owned taxonomy/media; explicit Settings ownership; stable membership ID plus immutable generation row and HMAC epoch reference; additive ordered migrations.                                |
| Detection           | Null/contradiction/duplicate/orphan queries; owner exports; current/updated counts; query-plan checks; old/new decision comparison; second-site collision fixtures; stale physical-table and storage-key audits.                                                                                                |
| Containment         | Each service retains its database and resource checks. Parent-derived children cannot select another parent scope. Cross-service reference compromise does not remove local target checks. Global User/Auth remains separate.                                                                                   |
| Fail state          | Missing/unknown/contradictory scope, closed or non-current membership epoch, orphan reference, authority/owner validation failure, partial backfill, or unresolved URL denies cutover/operation. No default-site or raw-value fallback after enforcement.                                                       |
| Recovery            | Restore per-service backup, stable authority manifest, revision/epoch state, cross-service exports, and storage manifest; reconcile before reopening one complete slice. Uncertain records remain inaccessible.                                                                                                 |
| Common-mode failure | A bad default manifest can mislabel every database, shared authority exports can be wrong, and one migration script can update many rows consistently incorrectly. Independent row counts, checksums, second-site denial tests, service ownership, and restore rehearsal reduce but do not eliminate this risk. |
| Evidence            | Exact matrices above plus migration SQL, counts, zero-result audits, schema/index introspection, focused owner/consumer tests, default and collision-site live flows, rollback result, and unchanged F3 gateway path.                                                                                           |
| Residual risk       | Application bugs may omit scope despite columns, authority manifests may be falsely valid, and cross-DB checks cannot be atomic. ADR-0012 bounds staleness/races/failure, while later route/data tests must enforce the design; this ADR alone is not enforcement.                                              |

## Failure Decision Link

[ADR-0012](0012-f4-failure-freshness-audit-and-recovery.md) now freezes the
authority availability, freshness/cache/invalidation, durable audit,
cross-database race, storage-move recovery, parent misuse, and common
key/configuration compromise behavior reserved by this matrix.
[ADR-0013](0013-f4-ordered-additive-migration-sequence.md) freezes the exact
owner-before-consumer and local backfill/constraint/runtime order. No schema or
runtime implementation begins until the Batch 1 exit matrix is frozen.

## Repository Evidence

- all seven `apps/*-service/prisma/schema.prisma` files and migrations
- all seven service seeds
- Product, Blog, Taxonomy, Settings, Media, Order, and User service query paths
- Product/Blog taxonomy facades and default-taxonomy initializers
- `apps/gateway/src/application/application-registry.ts`
- `docs/reports/2026-08-24-f4-authority-audit.md`
- `docs/architecture/tenant-package-channel-platform.md`
- [ADR-0001](0001-f4-authority-owner.md) through
  [ADR-0010](0010-f4-signed-context-compatibility.md)

# ADR-0013: F4 Ordered Additive Migration Sequence

Date: 2026-08-24

Status: accepted for the F4 Batch 1 migration-order decision; design only, not
yet implemented.

Amended 2026-08-31 by [ADR-0014](0014-f4-customer-identity-realms-and-federation.md):
the owner-before-consumer and per-slice gates remain accepted. A corrective
realm/trust/credential/session/context-v3 sequence now precedes Batch 3 item 5
and every later writer or domain migration; the current default population is
backfilled into one deterministic realm rather than discarded.

The exact corrective `R0`-`R11` gates and rollback points are frozen by
[ADR-0015](0015-f4-identity-realm-record-and-migration-freeze.md).

## Decision Scope

This ADR freezes the deployment and data-dependency order for F4. It keeps the
current default single-site gateway flow working while persistent authority,
membership, context v2, domain scope, state, and a collision-site proof are
introduced additively.

It does not authorize a Prisma schema, migration, proto, generated client,
runtime, Compose, seed, or traffic change before the complete Batch 1 exit gate
is checked. Each later checklist item still requires its own implementation and
evidence; this ADR only prevents those items from being executed in an unsafe
order.

## Repository Evidence And Classification

The current repository has:

- one validated static `ApplicationRegistry` mapping each F3 application to one
  readable tenant/site/channel label tuple;
- no tenant-authority-service runtime or database;
- global User identity and Auth Redis sessions/token versioning;
- S2S v3/context v1 and typed clients already deployed receiver-to-receiver;
- seven independent Prisma databases in root inventory order: User, Settings,
  Media, Taxonomy, Product, Blog, and Order;
- Taxonomy/Settings/Media owner dependencies consumed by Product/Blog, and
  Product consumed by Order;
- no authoritative tenant/site columns in those seven databases;
- current single-site slugs, SKUs, carts, order numbers, Media paths, and
  reference values that must remain usable during migration.

These are **working F3 compatibility mechanisms** and **confirmed unmet F4
requirements**, not evidence for a big-bang replacement.

The current root inventory order is operational enumeration, not proof that
consumer data may be activated before its owner. Changing enumeration solely
for aesthetics would be optional; F4 instead freezes owner-before-consumer
activation gates. Parallel multi-service migration orchestration, a distributed
transaction coordinator, and blue/green databases per service are **optional
hardening or future scaling considerations**.

## Non-Negotiable Ordering Invariant

An application filter is admission evidence, never a data-isolation boundary.
No second tenant/site/application may reach an operation until that operation's
owning database has:

```text
authority-issued tenant/site IDs
AND completed default backfill
AND zero null/contradiction/orphan evidence
AND scoped indexes and constraints
AND scoped read/write predicates
AND receiver/context/owner-contract compatibility
AND same-site allow plus cross-site denial evidence
```

Gateway filtering before those conditions would merely hide globally readable
rows behind one caller and would fail open if gateway, cache, application
mapping, or a direct internal caller were wrong. Domain constraints and
authorization therefore precede multi-site traffic.

## Dependency Flow

```text
frozen F3 baseline
  -> persistent authority + stable default IDs
  -> membership/role epochs + Auth coordination
  -> context-v2 receivers, then writers
  -> Taxonomy -> Settings -> Media
  -> Product -> Blog -> Order
  -> Redis/state/storage/job provenance
  -> second tenant/site collision proof
  -> legacy compatibility retirement
```

Product and Blog have no mutual data dependency, but F4 migrates them serially
in that order to reduce simultaneous rollback scope. Order follows Product
because cart/checkout validates Product ownership. Media follows Settings in
the execution sequence only to keep one active shared-owner slice at a time;
both are owners for Product/Blog and neither may be skipped.

## Traffic Gates

| Gate                   | Allowed traffic                                                                                                                          | Forbidden traffic                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `G0_F3_BASELINE`       | current gateway-only external traffic through the validated static registry and current single-site domain behavior                      | persistent authority claims, context v2 writes, or any second scope                                                       |
| `G1_AUTHORITY_SHADOW`  | current traffic remains primary; persistent authority resolves the same default registration in shadow and records mismatch evidence     | authority result authorizing a request, persistent membership role replacing current compatibility, or second scope       |
| `G2_DEFAULT_AUTHORITY` | persistent `ApplicationRegistry` adapter is primary for existing default clients; Auth and domain behavior remain independently required | automatic static fallback, second-site domain traffic, or a domain trusting application filtering instead of stored scope |
| `G3_SCOPED_SLICE`      | one named operation/service slice uses context v2 and its fully backfilled/scoped database for the default site                          | any unscoped operation in that service accepting a second target; partial replica/capability rollout                      |
| `G4_MULTI_SCOPE_PROOF` | dedicated second tenant/site fixtures may reach only slices whose complete owner/consumer chain is at `G3`                               | general second-site traffic, customer onboarding, or routes absent from the executable matrix                             |
| `G5_F4_ENFORCED`       | all F4 operations use persistent authority, context v2 where required, scoped owners, bounded freshness/state, and denial evidence       | static production authority, legacy role authorization, implicit default site, URL/label authority, or context downgrade  |

Moving forward is explicit and evidence-based. There is no automatic fallback
to an earlier gate during outage. Rollback is an operator-selected deployment
and data decision under the boundary recorded for that phase.

## Ordered Migration Sequence

### Step 0 - Freeze And Capture The F3 Baseline

Batch: Batch 1 exit prerequisite.

Actions:

- verify ADR-0001 through ADR-0013 and the complete F4 mapping/exit matrix;
- capture clean migration status/checksums, per-database row counts, uniqueness,
  current orphans, static application tuples, Redis namespaces, object
  inventory/checksums, and backup/restore points;
- record current F3 client/gateway/domain evidence without modifying F3.

Advance gate: documentation has no unresolved decision that changes the first
authority migration, and the user has run any reserved heavy baseline commands.

Rollback: documentation-only; no runtime state exists.

### Step 1 - Add Authority Runtime And Persistence Without Traffic Authority

Batch: Batch 2.

Actions:

- add tenant-authority-service to inventory, typed contracts, least-privilege config,
  database migration order, health, Compose/Bake/CI/release, and backup/restore;
- create ADR-0011 Tenant/Site/Channel/Application/registration,
  ParentRelationship, EntitlementScopeRef, AuthorityAuditEvent, and
  AuthorityInvalidationOutbox records/constraints;
- add the persistent `ApplicationRegistry` adapter behind the existing seam;
- deploy only additive receiver/contracts and keep gate `G0`.

Advance gate: clean database migration/status, readiness, deterministic empty
seed, audit/outbox permission/transaction tests, registration denial tests, and
backup/restore pass. Existing gateway traffic is unchanged.

Rollback: remove the unused adapter/runtime/schema only while nothing external
references its IDs and no audit/state is authoritative.

### Step 2 - Seed Stable Default Authority And Shadow Application Resolution

Batch: Batch 2.

Actions:

- issue canonical UUIDv4 default tenant/site/channel/application IDs and persist
  exact current web/native registrations;
- preserve current public `clientId` handles and map readable F3 labels only as
  compatibility aliases;
- resolve static and persistent adapters for every current client in shadow;
  compare application, tenant/site, channel/profile, lifecycle, and denial;
- keep static resolution primary at gate `G1_AUTHORITY_SHADOW`.

Advance gate: deterministic reruns produce the same records, every enabled F3
registration has one exact active persistent match, disabled/invalid records do
not become active, and mismatch count is zero.

Rollback: correct/remove additive seeded records and remain on frozen static
resolution. Never regenerate IDs after consumers have recorded them.

### Step 3 - Add Membership Epochs, Grants, And Auth Coordination

Batch: Batch 3.

Actions:

- create Membership, immutable MembershipEpoch, TenantRoleGrant,
  SiteRoleGrant, and PlatformGrant records/constraints;
- audit legacy User role strings; seed root-admin as PLATFORM_ADMIN plus the
  main tenant's only TENANT_ADMIN, admin as default SITE_ADMIN, and user as
  default USER exactly under ADR-0008;
- create the HMAC-derived `membershipEpochRef`, revision/outbox invalidation,
  and 365-day authority audit behavior;
- keep passwords/profiles/global sessions/token issuance in User/Auth and make
  scoped invalidation independent of global Auth token version.

Advance gate: invalid values grant nothing; seed reruns are deterministic;
revocation/reinvite proves a new epoch; role downgrade/invalidation respects
ADR-0012's live/15-second behavior; global session use in another tenant is not
destroyed.

Rollback: before authority is primary, disable additive grant evaluation while
retaining audit/epoch history. Never revive a revoked epoch or reconstruct
TENANT_ADMIN from `admin`.

### Step 4 - Deploy Context V2 Receivers Before Writers

Batch: Batch 4.

Sequencing correction (2026-08-29): the Batch 3 actor-authority resolver is
itself an exact `RESOLUTION/AUTHORITY` receiver and cannot use context v1
without violating ADR-0010. Its minimal strict parser, receiver declaration,
wrong-route rejection, and non-propagation rule were therefore deployed with
the resolver at the end of Step 3. This moves no writer, `AUTHORIZED` shape,
gateway/domain consumer, cache, capability negotiation, or traffic slice.
Step 4 still owns the complete receiver inventory and every writer/cutover;
receiver-before-writer order is unchanged.

Actions:

- add strict ADR-0010 context-v2 types/parsers to `grpc-auth`, protos, generated
  clients, gateway, authority, Auth, and every domain receiver;
- deploy exact `RESOLUTION` resolver RPC stages and `AUTHORIZED` operation
  declarations while writers still emit v1 for legacy operations;
- add ADR-0012 time/revision/epoch/cache-integrity validation and capability
  readiness per operation;
- prove nested calls cannot downgrade or lose target/actor authority.

Advance gate: every receiver accepts the declared old/new matrix, rejects all
invalid unions and v2-on-wrong-operation shapes, and publishes compatible
capability before any writer emits v2.

Rollback: receiver-only code may roll back while no writer requires it. Once a
writer is enabled, roll back the complete operation slice or keep it closed; do
not retry with v1.

### Step 5 - Make Persistent Authority Primary For The Default Application

Batch: Batch 4.

Actions:

- switch existing default client resolution through the persistent
  `ApplicationRegistry` adapter and emit context v2 only for migrated operation
  slices;
- keep exact F3 gateway URLs, public client handles, web/mobile behavior, Auth
  ownership, and gateway-only external boundary;
- enable ADR-0012 authority cache/outbox/readiness semantics;
- scope gateway rate/idempotency state only after verified target resolution.

Advance gate: existing clients pass through persistent authority; forged,
disabled, mismatched, outage, replay, raw-header, and wrong-target cases fail as
designed. Gate becomes `G2_DEFAULT_AUTHORITY`.

Rollback: a known-good static adapter is operator-selectable only while no
domain row requires persistent authority IDs and no second scope exists. There
is never automatic outage fallback. After Step 6 begins, authority remains part
of rollback.

### Step 6 - Migrate Taxonomy Completely

Batch: Batch 5.

Actions:

- apply ADR-0011's local nullable/add/backfill/audit/index/constraint/runtime/
  non-null sequence to Taxonomy;
- backfill every current record to the canonical default site and enforce
  same-site self-tree plus scoped facade keys;
- scope every read/write/list/tree path and preserve exact Product/Blog
  `scope`/`kind` checks;
- prove deliberate same slug across disposable migration-test scopes only after
  the default slice is complete. This is not the durable shared second-site
  seed or production traffic activation from Step 13.

Advance gate: null, contradiction, duplicate, parent orphan, cross-site tree,
cycle/depth/path, and facade mismatch evidence passes. Taxonomy operation slices
reach `G3_SCOPED_SLICE` for the default site.

Rollback: keep global uniqueness until scoped runtime evidence passes. After
scoped duplicates exist, rollback requires rename/export reconciliation rather
than recreating the old index blindly.

### Step 7 - Migrate Settings Completely

Batch: Batch 5.

Actions:

- add PLATFORM/SITE ownership and partial unique indexes exactly under
  ADR-0011; no TENANT override exists;
- correct the confirmed numeric/string cart-TTL defect before using its evidence;
- backfill current platform defaults and seed site category-reference settings
  only from the already-scoped Taxonomy owner;
- deploy the typed server-owned key/fallback registry and scope all site reads
  and writes.

Advance gate: ownership/null/duplicate/type/category-orphan queries are zero;
wrong-site and forbidden-fallback tests pass. Settings slices reach `G3`.

Rollback: preserve old readers during shadow. Once site rows or duplicate keys
exist, reconcile them rather than flattening all values into global defaults.

### Step 8 - Migrate Media Metadata And Storage Ownership Completely

Batch: Batch 5.

Actions:

- add Media tenant/site ownership, scoped SHA policy, physical-key uniqueness,
  candidate key, and `MediaStorageMove` coordination records;
- backfill metadata to the default site, reconcile physical collisions, and
  scope every upload/finalize/list/render/read/delete/cleanup path while
  preserving access-class and owner/entity checks;
- allocate versioned site prefixes for new objects;
- migrate existing objects only through ADR-0012's durable
  copy/verify/switch/cleanup state and manifest. Do not implement F5 transforms;
- expose typed exact-ID/same-site/status/use validation for consumers.

Advance gate: metadata/object/orphan/collision/move-state audits pass; retry and
rollback at every storage state preserve the correct bytes; public,
protected, and strict cross-site denial passes. Media slices reach `G3`.

Rollback: before object moves/domain references, nullable fields can be removed.
Afterward restore/reconcile database, object copies, move state, and manifests
together; never infer ownership from a path.

### Step 9 - Migrate Product Completely

Batch: Batch 6.

Actions:

- scope Product/ProductSet roots and directly queried ProductGalleryImage;
  keep other children parent-derived under ADR-0011;
- backfill roots/default ownership and Gallery scope from Product;
- switch slug/SKU/ProductSet uniqueness only after duplicate audits;
- validate Taxonomy and Media through their already-enforced owners; map legacy
  URLs to same-site media IDs without inventing rows; audit complementary and
  product-set arrays;
- scope every public/admin CRUD, count, soft-delete, gallery, hotspot,
  attribute, and comment path.

Advance gate: Product/Gallery/reference/stale-table audits are zero; same-site
allow, cross-site valid-ID denial, duplicate-site slug/SKU success, and rollback
pass. Product slices reach `G3`.

Rollback: retain URL/global-key compatibility until the shadow window closes.
After scoped duplicates/media references exist, use export/rename/reference
reconciliation; never restore global assumptions blindly.

### Step 10 - Migrate Blog Completely

Batch: Batch 6.

Actions:

- scope BlogPost and BlogCategory roots; keep BlogComment parent-derived;
- preserve local editorial BlogCategory separately from the scoped Taxonomy
  facade and treat string labels as non-authoritative;
- backfill default ownership, validate same-site local category/Taxonomy/Media,
  and add the media ID compatibility path;
- scope every public/admin post/category/comment operation.

Advance gate: slug/category/comment/media/taxonomy audits and wrong-site denial
pass; default Blog behavior remains compatible. Blog slices reach `G3`.

Rollback: preserve URL/global-key compatibility through shadow. After scoped
duplicates/references exist, reconcile instead of merging category concepts or
flattening sites.

### Step 11 - Migrate Cart And Order Completely

Batch: Batch 6.

Actions:

- first reconcile the confirmed Order currency/Decimal migration drift with a
  new migration;
- scope Cart/Order roots and directly mutated CartItem; keep immutable OrderItem
  parent-derived;
- backfill Cart/Order default ownership and CartItem from Cart;
- replace global cart-user/order-number constraints with scoped constraints;
- require already-scoped Product validation at add-to-cart and checkout, then
  retain exact OrderItem snapshots.

Advance gate: drift, duplicate, orphan, scope mismatch, cross-site Product,
copied-ID, checkout, admin-target, snapshot, and rollback evidence passes. Order
slices reach `G3`.

Rollback: orders/snapshots never change site. After scoped duplicates exist,
rollback reconciles/renames keys and preserves historical rows.

### Step 12 - Finish State, Provenance, And Consolidated Backfill Evidence

Batch: Batch 7.

Actions:

- replay and consolidate every service's already-executed backfill counts,
  manifests, null/contradiction/orphan queries, backup/restore, and rollback;
- scope authority-decision caches, gateway rate/idempotency, and site-owned
  Redis keys with versioned canonical ownership; keep Auth identity sessions
  explicitly global;
- require verified tenant/site/application/request provenance in job/event
  skeletons before processing, without implementing later workers/search/AI;
- make default/demo seed reruns deterministic across authority and domain owners;
- complete storage reconciliation and capability/replica inventory.

Batch 7 does not postpone database backfill from Steps 6-11. It is the
cross-service evidence/seed/state closeout after each owning service has already
performed its safe local backfill.

Advance gate: every applicable operation/service chain is at `G3`, caches/state
cannot collide across sites, global Auth keys remain deliberately global, and
all aggregate evidence agrees.

Rollback: roll back one complete state/operation slice while preserving durable
authority IDs, epochs, audit/outbox, scoped domain data, and storage manifests.

### Step 13 - Activate The Collision Site And Retire Compatibility

Batch: Batch 7 and F4 exit.

Actions:

- seed one second tenant/site/application and deliberately overlapping slugs,
  SKUs, taxonomy names, users/memberships, and client profiles;
- enable only complete owner-to-consumer operation chains at
  `G4_MULTI_SCOPE_PROOF` and run same-site success/cross-site denial;
- execute the complete actor/operation/storage/cache/job/audit/restore evidence;
- move to `G5_F4_ENFORCED` only when every F4 route is mapped;
- retire legacy role authorization, implicit default-site selection, context-v1
  acceptance on F4 operations, static production authority, and stopped URL
  writes in separate compatible releases. Physical legacy-field removal follows
  its owner roadmap and consumer inventory.

Advance gate: all Batch 2-8 exit evidence required by F4 passes, including the
full isolation matrix. The second fixture proves constraints; it does not itself
authorize customer onboarding.

Rollback: after multi-scope data exists, there is no static/global-schema
configuration rollback. Suspend the affected scope/operations, restore the
compatible runtime and durable backups, reconcile scoped duplicates/references,
and rerun evidence before reopening.

## Per-Service Slice Rule

Every Step 6-11 service repeats ADR-0011's local sequence without reordering:

1. baseline and restore point;
2. additive nullable fields;
3. default backfill and direct-child derivation;
4. owner manifests and orphan/contradiction audit;
5. additive indexes/candidate keys/checks/composite references;
6. receiver/runtime shadow comparison;
7. verified-scope predicates on every read/write;
8. scoped uniqueness switch;
9. disposable second-scope collision/denial proof only for the completed slice;
10. required non-null enforcement and later compatibility retirement.

The durable cross-service second tenant/site is seeded only in Step 13. Earlier
disposable fixtures prove one service's constraint/query behavior and are
removed with that isolated test database; they do not enable shared traffic.

An item is not complete because a migration file exists. Its database,
runtime, owner contracts, denial evidence, readiness, and rollback must agree.

## Options Compared

| Option                                                                               | Compatibility, failure behavior, and cost                                                                                                                                                                  | Decision                                                      |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Authority and receivers first; owners before consumers; one complete slice at a time | Preserves current clients, gives every backfill canonical IDs, bounds rollback, and prevents application filtering from masquerading as data isolation. More deployments and shadow evidence are required. | **Selected.**                                                 |
| Gateway/application filter first                                                     | Appears fast but domain databases remain global; gateway/cache/internal-caller error can cross scope, and no constraint contains it.                                                                       | Rejected as a confirmed isolation defect.                     |
| Domain columns before authority IDs exist                                            | Requires readable-label/default assumptions or later ID rewrites and produces unprovable backfill ownership.                                                                                               | Rejected.                                                     |
| All databases and context switch in one release                                      | Minimizes compatibility duration but combines registry, Auth, context, seven databases, Redis, and storage into one rollback/common-mode failure.                                                          | Rejected.                                                     |
| Migrate consumers before Taxonomy/Media/Product owners                               | Creates unchecked or race-prone references and encourages direct cross-database reads/default fallbacks.                                                                                                   | Rejected.                                                     |
| Keep permanent dual static/persistent authority fallback                             | Improves apparent availability but can revive revoked or contradictory state and creates two owners.                                                                                                       | Rejected. Shadow comparison is temporary and non-authorizing. |

## Failure-Oriented Review

| Concern             | Ordered-sequence decision                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prevention          | Canonical authority IDs first; receiver-before-writer; owner-before-consumer; nullable/backfill/audit/constraint/runtime/non-null order; explicit traffic gates; no second scope through application filtering alone.                                                                        |
| Detection           | Baseline checksums/counts; shadow mismatches; schema/capability/replica inventory; null/contradiction/orphan/duplicate audits; owner manifests; scoped collision fixtures; readiness and rollback evidence.                                                                                  |
| Containment         | One operation/service slice changes at a time. Default traffic stays on the last complete gate. A failed owner blocks dependent consumer activation without rolling back unrelated completed owners.                                                                                         |
| Fail state          | Missing authority IDs, incompatible receiver, incomplete replica, failed backfill/audit/constraint, owner not enforced, or unavailable rollback evidence blocks the gate and returns sanitized unavailable/denial under ADR-0012. No default-site inference or v1/static retry.              |
| Recovery            | Stop new gate advancement, preserve IDs/epochs/audit/outbox/scoped data/manifests, restore the affected service slice, reconcile, and rerun its exact gate. After second-scope data, suspend rather than flatten.                                                                            |
| Common-mode failure | One incorrect default manifest or shared migration script can label many databases consistently wrong; one contract bug can affect every receiver. Independent owner exports, per-service counts, collision-site denial, and restored-copy rehearsals reduce but do not eliminate this risk. |
| Evidence            | Each phase's advance gate, ADR-0011 service matrix, ADR-0012 outage/race/compromise matrix, existing F3 client flows, default-site live flow, second-site collisions, full actor/operation isolation, and rollback/restore.                                                                  |
| Residual risk       | More deployment phases increase operational coordination and temporary compatibility code. A bad but internally consistent authority manifest or compromised operator can still mis-scope data; independent review and executable evidence remain necessary.                                 |

## Compatibility And Rollback Boundary

This ADR changes documentation only and preserves F3. During implementation,
compatibility is additive and bounded by named traffic gates, not by silent
fallbacks.

Rollback becomes progressively narrower:

- before persistent IDs are referenced, authority/static adapter rollback is
  possible under explicit operator control;
- after domain backfill, authority and canonical IDs remain required even if a
  domain runtime slice rolls back;
- after scoped duplicate values or cross-service IDs exist, old global indexes,
  raw URLs, labels, and implicit defaults cannot be restored without explicit
  data reconciliation;
- after storage moves, database/object/move manifests restore together;
- after second-scope traffic, rollback suspends incomplete scopes and restores
  complete slices; it never returns production authority to static config.

## Repository Evidence

- root `package.json` backend inventory and `scripts/backend.mjs`
- all seven existing Prisma schemas, migrations, seeds, and query paths
- gateway `ApplicationRegistry`, route policy, idempotency, and rate limiting
- Auth token/session/version behavior
- `@nebula/grpc-auth`, protos, typed clients, and current context propagation
- Media metadata/storage/delete behavior
- [ADR-0001](0001-f4-authority-owner.md) through
  [ADR-0012](0012-f4-failure-freshness-audit-and-recovery.md)
- `docs/current-focus.md`
- `docs/reports/2026-08-24-f4-authority-audit.md`

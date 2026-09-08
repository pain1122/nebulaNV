# F4 Batch 1 Exit Matrix

Date: 2026-08-24

Status: Batch 1 exit complete. ADRs 0001-0013 and all three exit checks are
frozen. Batch 2 foundation work is now staged. On 2026-08-25 the runtime name
was clarified from `authority-service` to `tenant-authority-service`; the
frozen owner and boundary did not change.

Historical amendment (2026-08-31): this exit remains proof of the original
Batch 1 decision and must not be rewritten. ADR-0014 supersedes only its
platform-global identity/session clauses and reopens the current architecture
gate as Batch 1R in `docs/current-focus.md`; tenant/site/application authority,
direct parent, target-role, migration, S2S, and domain-containment decisions
remain preserved.

## Exit Check 1 - One Owner, Alternatives, Compatibility, And Rollback

Result: **complete**.

### Authoritative Concept Ownership

| Concept                                                                            | One selected owner                             | Consumers and containment boundary                                                                            | Decision evidence                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Global user identity, profile, email/phone, and password hash                      | User-service                                   | Auth and domains consume typed identity facts; no tenant/site membership is stored here                       | ADR-0001, ADR-0008, ADR-0011                  |
| JWT issuance/validation, refresh sessions, global disable, token version           | Auth-service                                   | Authority adds scoped membership freshness without issuing tokens or globally destroying unrelated sessions   | ADR-0001, ADR-0004, ADR-0009, ADR-0012        |
| Tenant, Site, Channel, Application, WebOrigin, Android/iOS identity                | tenant-authority-service                       | Gateway resolves; Auth and domains independently enforce their boundaries                                     | ADR-0001, ADR-0003 through ADR-0006, ADR-0011 |
| ParentRelationship                                                                 | tenant-authority-service                       | Parent operations additionally require direct-edge role/target, domain privacy policy, and durable audit      | ADR-0001, ADR-0007, ADR-0012                  |
| Membership, immutable MembershipEpoch, tenant/site/platform role grants            | tenant-authority-service                       | User remains global identity; Auth remains session authority; domains repeat operation/resource authorization | ADR-0008, ADR-0009, ADR-0011, ADR-0012        |
| F4 EntitlementScopeRef anchor                                                      | tenant-authority-service                       | It grants no capability; F6 later owns feature/module/license execution                                       | ADR-0002, ADR-0011                            |
| Authority revision, invalidation outbox, authority-decision truth                  | tenant-authority-service                       | Each consumer owns only an authenticated bounded cache of returned decisions                                  | ADR-0009, ADR-0011, ADR-0012                  |
| Authority mutation/parent/platform/recovery audit                                  | tenant-authority-service PostgreSQL            | Append-only 365-day authority audit; no new audit service                                                     | ADR-0007, ADR-0011, ADR-0012                  |
| Domain resource audit                                                              | each owning domain service                     | Authority audit does not become a copy of Product/Blog/Order/Media payload history                            | ADR-0007, ADR-0012                            |
| External application lookup/admission, route exposure, CORS, edge rate/idempotency | Gateway using persistent `ApplicationRegistry` | Gateway consumes authority but does not own tenant truth or final resource authorization                      | ADR-0001, ADR-0006, ADR-0009, ADR-0013        |
| S2S envelope/context schema, signature verification, replay, caller/target binding | `@nebula/grpc-auth`                            | Services declare exact allowed operations/callers and retain domain authorization                             | ADR-0010, ADR-0012                            |
| Typed cross-service invocation wrappers                                            | `@nebula/clients`                              | Owner contracts validate authoritative facts; clients do not own those facts                                  | ADR-0001, ADR-0011                            |
| Safe platform/site business configuration                                          | Settings-service                               | No secrets, credentials, role/trust policy, or tenant authority                                               | ADR-0001, ADR-0011                            |
| Product/Blog classification tree                                                   | Taxonomy-service                               | Site-owned in F4; Product/Blog facades retain scope/kind checks                                               | ADR-0011                                      |
| Media metadata, access class, storage-key/move policy, render/read/delete policy   | Media-service                                  | Product/Blog own semantic references; object providers store bytes only                                       | ADR-0011, ADR-0012                            |
| Product/ProductSet and Product-owned children                                      | Product-service                                | Taxonomy/Media validate references; Product scope remains local and independently checked                     | ADR-0011                                      |
| BlogPost/BlogCategory and Blog-owned children                                      | Blog-service                                   | Local editorial category remains separate from Taxonomy classification                                        | ADR-0011                                      |
| Cart/Order and immutable OrderItem snapshots                                       | Order-service                                  | Product is validated at cart/checkout; later Product changes do not rewrite history                           | ADR-0011                                      |
| Per-consumer authorization-cache storage/integrity                                 | the consuming service                          | Authority remains decision source; a cache cannot mint or extend authority                                    | ADR-0012                                      |
| F6 feature definitions, allocations, capabilities, modules, and license execution  | deferred F6 technical owner                    | F4 provides only the non-granting scope anchor                                                                | ADR-0002                                      |

No row gives two services co-equal authority over the same fact. Places with
multiple checks are deliberate conjunctions, not duplicate owners: Auth proves
identity/session, authority proves current target/grant, S2S proves workload,
and the domain proves its stored resource.

### Rejected Alternatives And Costs

| Decision area       | Selected path                                                                      | Rejected alternatives with recorded cost                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authority owner     | dedicated tenant-authority-service                                                 | User/Auth/Settings/gateway/distributed ownership rejected for boundary coupling, missing relational semantics, edge blast radius, or cross-service lifecycle inconsistency (ADR-0001) |
| Entitlement phase   | non-granting F4 scope anchor, F6 execution later                                   | premature feature flags, total deferral, and commercial data rejected for unsafe provisional policy or broken phase dependency (ADR-0002)                                             |
| IDs                 | authority-issued UUIDv4 plus separate public handles                               | readable/client IDs and new CUID dependency rejected for authority confusion/migration cost without requirement (ADR-0003)                                                            |
| Channel/application | WEB/ANDROID/IOS site channels and separate verified applications                   | per-app channels, generic MOBILE, free strings, and channel-owned data rejected for ambiguity/divergence (ADR-0005/0006)                                                              |
| Parent model        | one direct parent, explicit relationship                                           | raw parent fields, transitive/sibling access, duplicate target memberships, and tenant-admin equivalence rejected for blast radius/privacy ambiguity (ADR-0007)                       |
| Request authority   | target/operation-specific decision                                                 | current-tenant state, JWT authority, gateway-final authority, and universal live lookup rejected for ambiguity, revocation, containment, or availability cost (ADR-0009/0012)         |
| Context             | S2S v3 envelope plus strict context v2                                             | silent v1 expansion, unnecessary envelope v4, bootstrap downgrade, duplicated facts, dual roles, and auto-negotiation rejected (ADR-0010)                                             |
| Data model          | roots plus independently addressed children scoped; parent-derived children derive | blanket child duplication/normalization and shared content models remain optional/future because current evidence does not require their cost (ADR-0011)                              |
| Migration           | authority/receivers/owners before consumers, one slice at a time                   | application-filter-first, domain-before-authority, big bang, consumer-first, and permanent dual authority rejected for isolation/rollback/common-mode defects (ADR-0013)              |

### Compatibility And Rollback Coverage

- ADR-0001 preserves the `ApplicationRegistry` seam and defines the exact point
  after which static authority cannot be restored.
- ADR-0003 through ADR-0010 preserve public handles, F3 client URLs, Auth
  ownership, S2S v3, context-v1 bytes on declared legacy operations, and
  receiver-first transition.
- ADR-0011 freezes nullable/backfill/audit/constraint/runtime/non-null migration,
  global-to-scoped uniqueness boundaries, per-service rollback, and immutable
  membership epochs.
- ADR-0012 freezes cache/outage/audit/race/storage/key recovery and explicitly
  forbids stale/static/raw/default fallbacks.
- ADR-0013 supplies traffic gates and the progressive rollback boundary before
  IDs, after backfill, after scoped duplicates/references, after storage moves,
  and after second-scope traffic.

Every selected owner has a compatibility path and an explicit point where
rollback changes from removing additive work to preserving/reconciling durable
state. Therefore Exit Check 1 is sufficient for the next audit item.

## Exit Check 2 - Alternative-Roadmap F4 Mapping

Result: **complete**.

Broad roadmap lines are decomposed below when they name several service owners.
Each atomic scope has one primary execution batch; a later Batch 8 assertion is
evidence for that implementation, not a second owner or duplicate execution.

### Ownership And Lifecycle

| Source | Atomic scope                                                                  | Primary batch | Executable evidence                                                                                          |
| ------ | ----------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| F4-O1  | inspect current ownership and select authority owner                          | 1             | F4 audit plus ADR-0001 owner/alternative/cost/rollback matrix                                                |
| F4-O2  | freeze opaque authority IDs and deny client-selected authority                | 1             | ADR-0003 canonical/invalid/duplicate/unknown/cross-scope vectors                                             |
| F4-O3  | tenant/site/application lifecycle and read/write/export/health separation     | 1             | ADR-0004 transition and effective-state matrix; Batch 2 lifecycle tests                                      |
| F4-O4  | WEB/ANDROID/IOS channel semantics without channel-owned domain data           | 1             | ADR-0005 closed-kind/cardinality/ownership matrix                                                            |
| F4-O5  | verified web/native registrations bound to an active site                     | 2             | exact origin/package/certificate/team/bundle activation, mismatch, transfer, revoke, seed, and restore tests |
| F4-O6  | direct parent/subordinate-ready relationship; commercial/reseller UI deferred | 2             | relationship constraints and lifecycle; Batch 8 sibling/reverse/transitive/privacy denial                    |

### Membership, Roles, And Context

| Source | Atomic scope                                                                    | Primary batch | Executable evidence                                                                                  |
| ------ | ------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| F4-M1  | keep User identity/profile global; persist memberships/site grants in authority | 3             | User schema remains global; membership/grant seed and cross-target denial                            |
| F4-M2  | freeze platform/tenant/site/parent/editor/user roles and exact target           | 1             | ADR-0008 role-operation/delegation matrix                                                            |
| F4-M3  | membership/role invalidation without stale client claims                        | 3             | new epoch/revision/outbox, 15-second ceiling, revoke/reinvite/downgrade tests                        |
| F4-M4  | signed application/actor/target/service/request provenance                      | 4             | strict context-v2 union, S2S-v3 digest, receiver-first and nested propagation tests                  |
| F4-M5a | gateway supplies verified target/operation authority facts                      | 4             | application/Auth/authority resolver chain, raw-header and wrong-target denial                        |
| F4-M5b | Taxonomy/Settings/Media repeat target/reference checks                          | 5             | direct HTTP/gRPC/gateway same-site allow and wrong-site denial                                       |
| F4-M5c | Product/Blog/Order repeat target/resource/role/reference checks                 | 6             | every repository/controller route scoped; gateway-only admission insufficient                        |
| F4-M6  | durable parent action audit                                                     | 3             | append-only authority intent/result, audit-outage rollback, privacy/secret exclusion, reconciliation |

### Domain Migration And Scoping

| Source | Atomic scope                                                          | Primary batch | Executable evidence                                                                           |
| ------ | --------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| F4-D1a | Taxonomy, Settings, and Media tenant/site ownership                   | 5             | ADR-0011 columns/constraints/backfill plus owner service denial and rollback                  |
| F4-D1b | Product, ProductSet, BlogPost/BlogCategory, Cart, and Order ownership | 6             | scoped roots/direct children, parent-derived access, non-null and denial evidence             |
| F4-D1c | Pages scope contract only; no current persistence owner               | 7             | mandatory future tenant/site fields/deletion/export contract; M2 remains implementation owner |
| F4-D2a | shared-owner scoped uniqueness/indexes before application filters     | 5             | Settings partial keys, Taxonomy keys/tree, Media SHA/physical key introspection               |
| F4-D2b | Product/Blog/Cart/Order scoped uniqueness/indexes                     | 6             | duplicate audits, scoped collision fixtures, query-plan and constraint evidence               |
| F4-D3  | choose taxonomy ownership and prohibit missing-site sharing           | 1             | ADR-0011 site-only policy and same-site tree/facade constraints                               |
| F4-D4a | owner validation contracts for Taxonomy and Media                     | 5             | typed exact-ID/site/lifecycle/use lookup, owner export, wrong-site denial                     |
| F4-D4b | Product/Blog/Order consumer reference validation                      | 6             | prevalidation, immutable owner scope, use-time checks, orphan reconciliation/race tests       |
| F4-D5a | prevent Product/Blog/Cart/Order cross-site references                 | 6             | taxonomy/media/product/cart/checkout copied-ID and cross-site denial                          |
| F4-D5b | reserve same-site Page/Media contract without creating Pages          | 7             | future scope-contract assertion only; M2 implementation remains deferred                      |
| F4-D6a | site-owned storage paths and recoverable moves                        | 5             | MediaStorageMove state, canonical path, collision/checksum/retry/rollback/orphan evidence     |
| F4-D6b | membership caches, rate/idempotency, and site Redis keys              | 7             | versioned canonical keys, 15-second authority expiry, collision and restore tests             |
| F4-D6c | job/event provenance skeletons                                        | 7             | verified scope/application/request fields and raw-payload-ID denial; no worker platform       |
| F4-D6d | authority audit records                                               | 3             | append-only authority audit implementation with tenant/site/request provenance                |
| F4-D6e | existing/future domain-audit ownership contract                       | 7             | mandatory tenant/site/application/request fields; each domain remains implementation owner    |
| F4-D6f | future search/vector/AI trace scope contract                          | 7             | mandatory ownership/deletion/export fields documented with no index/vector/AI runtime         |
| F4-D7  | ordered migration/backfill/orphan/rollback plan                       | 1             | ADR-0011 matrix plus ADR-0013 Steps 0-13 and traffic gates                                    |

### Default Development Context

| Source | Atomic scope                                               | Primary batch | Executable evidence                                                      |
| ------ | ---------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| F4-C1  | stable default tenant/site                                 | 2             | authority-issued UUID manifest, deterministic rerun, restore             |
| F4-C2  | WEB/ANDROID/IOS channels and development registrations     | 2             | exact static-to-persistent shadow match and registration denial          |
| F4-C3  | platform admin, site admin, editor, and user memberships   | 3             | deterministic role mapping; invalid values/no TENANT_ADMIN expansion     |
| F4-C4  | migrate existing demo/domain data into default site        | 7             | consolidated per-service counts, manifests, null/orphan zero, seed rerun |
| F4-C5  | preserve single-site behavior before durable second tenant | 7             | ADR-0013 G0-G3 default flows pass before G4 collision-site activation    |

### Isolation Evidence And F4 Exit

| Source | Atomic scope                                                                    | Primary batch | Executable evidence                                                                        |
| ------ | ------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| F4-E1  | same-site allow and cross-site/cross-tenant read/write denial for every route   | 8             | complete service/operation/actor matrix through gateway and direct internal contracts      |
| F4-E2  | forged metadata across HTTP/gRPC/job/event/storage/cache/future search adapters | 8             | raw/duplicate/context/replay/cache/path/payload/future-contract denial matrix              |
| F4-E3  | parent never implies sibling access                                             | 8             | direct-child allow plus sibling/reverse/transitive/grandchild denial and audit             |
| F4-E4  | application registration cannot select unrelated site                           | 8             | copied client/origin/package/bundle and target mismatch tests                              |
| F4-E5  | background payload cannot assert its own authority                              | 8             | signed provenance required; raw tenant/site job/event payload denies                       |
| F4-E6  | promotion audits find null/unknown/contradictory ownership                      | 8             | execute ADR-0011 SQL/owner manifests against default and collision scopes before promotion |
| F4-X1  | all existing applicable data has authoritative ownership                        | 8             | zero null/orphan/contradiction plus inventory reconciliation                               |
| F4-X2  | default works and second tenant proves isolation without redesign               | 8             | overlapping slug/SKU/name/user/client fixtures and normal default flows                    |
| F4-X3  | forged/cross-tenant access fails across transports/persistence                  | 8             | full F4 collapse/adversarial matrix                                                        |
| F4-X4  | gateway/domains/cache/storage/background contracts agree on provenance          | 8             | request-ID-correlated decisions, DB predicates, key/path/payload evidence                  |
| F4-X5  | future search/vector/AI traces have mandatory scope before implementation       | 7             | frozen future ownership contract consumed as Batch 8 documentation assertion               |

### Deferred-Scope Audit

| Later area mentioned near F4         | F4 boundary                                                                                                                                                        | Actual implementation remains        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Media processing/CDN/editor          | F4 scopes Media rows/paths and makes moves recoverable; it does not scan/process/derive/edit/CDN-enable assets. The rename endpoint is explicitly scheduled in F5. | F5; selected advanced media in M3S   |
| Feature modules/licensing            | F4 persists only a non-granting EntitlementScopeRef. No feature key, enabled flag, allocation, plan, lease, module, or billing behavior exists.                    | F6; commercial work remains deferred |
| Frontend redesign                    | F4 preserves existing clients and public handles; no admin/storefront shell redesign is pulled in.                                                                 | F7                                   |
| Mobile breadth                       | F4 verifies Android/iOS registration identity and context only; it does not build broader mobile features or attestation.                                          | F8 and optional later attestation    |
| Kubernetes/cloud operations          | Authority is added to existing inventory/Compose/release evidence only; no Kubernetes/operator/multi-region work is claimed.                                       | F9                                   |
| Pages/CMS                            | F4 freezes future scope fields and same-site references only; it does not create a Page model or CMS renderer.                                                     | M2                                   |
| General workers/events/search        | F4 freezes payload provenance and bounded authority outbox only; it does not create the general event/search/worker platform.                                      | M6                                   |
| 3D/showroom                          | Existing Product media-field migration does not implement asset bundles, transforms, showroom, or rendering.                                                       | M3S/M4                               |
| AI/RAG/vector                        | F4 freezes future trace/vector ownership only; no model, embedding, retrieval, inference, or AI route is implemented.                                              | AI0 and later AI milestones          |
| Parent commercial/product projection | F4 allows only privacy-minimized membership lifecycle and future allocation boundary; no reseller dashboard, billing, or Product projection is added.              | F6/S1-S5 or a future projection ADR  |

Every alternative-roadmap F4 atom has one primary batch and executable evidence.
Later features appear only as explicit contract boundaries or deferrals, so no
later implementation has been pulled into F4.

## Exit Check 3 - First-Migration Decision Closure

Result: **complete**.

ADR-0013 Step 1 is the first migration: it adds an unused tenant-authority-service
runtime/database at `G0_F3_BASELINE`. It creates authority roots, registration
records, the non-granting entitlement anchor, audit, and invalidation outbox,
but does not authorize traffic, create membership grants, emit context v2, or
alter a domain database. The following decisions therefore fix the meaning of
every field and constraint that Step 1 may introduce.

| Decision class             | Frozen meaning before Step 1                                                                                                                                                                                                                                                                                          | Evidence                     | Why no remaining deferral can reinterpret Step 1                                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identifiers                | Authority-service issues canonical lowercase UUIDv4 primary IDs; public client IDs, origins, native identities, names, slugs, global User IDs, and domain IDs remain separate. IDs are immutable and never reused.                                                                                                    | ADR-0003, ADR-0006, ADR-0011 | Mechanical Prisma/type names may be adjusted without changing ID format, issuer, storage, or authority. Handle rotation/tombstone behavior is already frozen.                                                                   |
| Roles and parent authority | Closed, non-hierarchical target-bound grants distinguish platform, main-tenant, site, direct-parent, content editor, and user authority. Only the migrated root administrator may hold `TENANT_ADMIN` in the main tenant; parent scope is direct and privacy-minimal.                                                 | ADR-0007, ADR-0008, ADR-0011 | Route-by-route implementation/testing remains later, but it consumes this catalog and cannot add a role, broaden a target, or make Step 1 identity/global-role authority. Membership/grant tables deliberately wait for Step 3. |
| Lifecycle                  | Tenant/Site and Application have separate closed state machines, effective ceilings, permitted transitions, no destructive cascade, and no health/license substitution. Registration revocation/tombstone and live/audited mutation behavior are fixed.                                                               | ADR-0004, ADR-0006, ADR-0012 | Retention/export implementations and commercial lifecycle remain later products; they cannot change Step 1 status values, transition rules, or fail-closed admission meaning.                                                   |
| Context version            | Existing S2S v3 remains the envelope; context v1 is frozen; strict context v2 has exact `RESOLUTION`/`AUTHORIZED` unions, envelope/context field ownership, mixed-version rejection, and receiver-first rollout with no downgrade.                                                                                    | ADR-0009, ADR-0010, ADR-0013 | Context code waits for Step 4. Naming mechanics cannot duplicate envelope facts, accept a partial union, trust legacy role, or make Step 1 records authoritative before receivers are ready.                                    |
| Taxonomy sharing           | Every current Product/Blog Taxonomy row is site-owned; keys and self-parent links carry exact tenant/site scope; Product/Blog facade `scope`/`kind` checks remain independent. Platform templates may only be copied into new site-owned rows with new IDs. BlogCategory stays a separate site-owned editorial model. | ADR-0011                     | Taxonomy migration waits for Step 6. Later content-sharing/product decisions may add an explicit new model, but cannot treat missing scope as sharing or reinterpret current rows created/backfilled under F4.                  |

The scan also corrected stale wording in ADR-0003/0004 and the Batch 5
checklist that still described already-frozen decisions as “later.” Those were
**stale documentation**, not design gaps. Remaining references to later work
are bounded implementation details, evidence, legal/product retention, or
future scaling features. None can change the Step 1 schema's authority owner,
ID meaning, lifecycle vocabulary, non-granting entitlement boundary,
audit/outbox ownership, traffic gate, or rollback point.

Consequently, Batch 1 is internally consistent and sufficient for the first
additive authority migration. This completion is documentation evidence only;
it does not claim that tenant-authority-service, its schema, contracts, or runtime now
exist.

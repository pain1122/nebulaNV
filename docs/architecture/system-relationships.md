# System Relationships

Last reviewed: 2026-08-31

Purpose: describe valid service ownership and communication paths. This file is a system map, not a full service manual.

## Core Rule

Each service owns its own data and business boundary. Other services must use HTTP/gRPC contracts, not direct Prisma/database access.

## Service Ownership Map

| Service                  | Owns                                                                                                                                                                                                                                                                                                           | Does Not Own                                                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| gateway                  | The one public HTTP API boundary, external DTO/envelope and route policy, registered application resolution, request context, gateway rate/idempotency policy, and typed downstream orchestration                                                                                                              | JWT issuance, user/profile persistence, domain data, or final domain authorization                                                                                          |
| auth-service             | Current: JWT issuance, refresh, logout/revocation, live Redis token/session validation, and auth gRPC. F4 target: the same service type deployed per identity realm, owning realm authentication, local credentials/generation, external identity links, durable sessions, issuer/audience, and realm key use. | Tenant/site memberships, realm/trust routing metadata, final domain authorization, or product/media/order data. Gateway and Tenant Authority never become identity issuers. |
| tenant-authority-service | Tenant/site/channel/application/registration/relationship, membership epochs, scoped grants, non-granting entitlement references, and target realm/provider/trust/application-policy metadata; typed internal scope facts and database readiness                                                               | Public traffic admission, customer credentials/raw sessions/provider secrets/private realm keys, F6 capabilities, domain data, or final resource authorization              |
| user-service             | Current: one global User/profile/credential/compatibility-role table. F4 target: realm-scoped profile/contact persistence after the current population is migrated into a default realm and local credential authority moves through a verified additive cutover.                                              | Target memberships/grants, token/session issuance, or final realm authentication after credential cutover                                                                   |
| settings-service         | Safe runtime app/business/frontend defaults and admin-managed settings                                                                                                                                                                                                                                         | Secrets, auth policy, trust boundaries, tenant authority, role hierarchy, DB URLs, or storage credentials                                                                   |
| taxonomy-service         | Taxonomy/category/tag/grouping records and scope/kind policy                                                                                                                                                                                                                                                   | Product/blog ownership or implemented tenant isolation                                                                                                                      |
| product-service          | Products, product image relations, and catalog behavior                                                                                                                                                                                                                                                        | Media bytes or taxonomy source records                                                                                                                                      |
| blog-service             | Blog posts, local blog-category relations, editorial content, and the blog taxonomy facade                                                                                                                                                                                                                     | Media bytes or global taxonomy source records                                                                                                                               |
| order-service            | Cart, checkout, orders, immutable order-item snapshots, and order status flow                                                                                                                                                                                                                                  | Product catalog authority or auth/user records                                                                                                                              |
| media-service            | Media metadata, access classes, signed URLs, object-key policy, and upload/read authorization                                                                                                                                                                                                                  | Product/blog ownership or storage-provider privacy decisions                                                                                                                |
| web                      | UI/admin/storefront consumption through the gateway and approved issued media/storage URLs                                                                                                                                                                                                                     | Backend policy enforcement, internal service URLs, Prisma, or S2S credentials                                                                                               |

## Runtime Infrastructure

| Infra            | Used For                                                               | Notes                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres         | Service and future realm databases                                     | Each service uses its own DB target. F4 development may prove several isolated logical realm databases on one local process; production physical realm placement/HA belongs to a consulted F9 amendment.                                                        |
| Redis            | Current Auth/session state, S2S replay claims, and gateway idempotency | Auth, `grpc-auth`, and gateway remain the logical owners. Customer session keys become realm/application scoped; Redis remains rotation/replay acceleration, not the sole durable realm credential/session generation, legacy bridge, or active-session ledger. |
| MinIO            | Local S3-compatible object storage                                     | Future-compatible with Supabase S3 and AWS S3.                                                                                                                                                                                                                  |
| Supabase Storage | Planned filemanager/storage provider                                   | Must not replace media-service policy.                                                                                                                                                                                                                          |
| AWS S3           | Future production object storage                                       | Same S3-compatible boundary as MinIO/Supabase.                                                                                                                                                                                                                  |

## Valid Communication Paths

| Caller                       | Target                                                                            | Protocol                | Why                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| external web/mobile clients  | gateway                                                                           | HTTP                    | The only public application API authority.                                                                                                                |
| gateway                      | resolved realm auth plus user/settings/product/blog/taxonomy/order/media services | gRPC                    | Typed external-route orchestration with signed context. Application resolution must select one accepted realm/provider/audience before login or exchange. |
| gateway/Auth/domain services | tenant-authority-service                                                          | signed internal gRPC    | Staged typed application, target-scope, and entitlement facts; consumers and pairwise keys activate in ordered later items.                               |
| realm auth-service           | matching realm profile/user boundary                                              | gRPC                    | Current compatibility validates/creates/reads auth-facing user data; target profile and credential responsibilities follow ADR-0014's migration gates.    |
| realm user-service           | matching realm auth-service                                                       | gRPC                    | Guard token/session validation from the exact configured realm, never a platform-wide search by email.                                                    |
| settings consumers           | settings-service                                                                  | gRPC/HTTP where exposed | Read safe app/business defaults.                                                                                                                          |
| product-service              | settings-service                                                                  | gRPC                    | Settings-backed product defaults/config.                                                                                                                  |
| product-service              | taxonomy-service                                                                  | gRPC                    | Product taxonomy integration.                                                                                                                             |
| blog-service                 | settings-service                                                                  | gRPC                    | Blog/site defaults/config.                                                                                                                                |
| blog-service                 | taxonomy-service                                                                  | gRPC                    | Blog taxonomy integration.                                                                                                                                |
| order-service                | product-service                                                                   | gRPC                    | Product/cart/order validation.                                                                                                                            |
| order-service                | settings-service                                                                  | gRPC                    | Order defaults/config.                                                                                                                                    |
| media-service                | exact routed realm auth-service                                                   | gRPC                    | Guard token/session validation for the resolved realm; current default traffic still uses the compatibility Auth endpoint.                                |
| web BFF/browser              | gateway                                                                           | HTTP                    | User-facing/admin actions through one external boundary.                                                                                                  |

## Forbidden Paths

- No service imports another service's Prisma client.
- No service directly queries another service's database.
- No storage provider decides app privacy.
- No settings key defines secrets, auth policy, role hierarchy, or internal trust.
- No frontend bypasses media-service for protected/private media access.
- No metadata role claim is trusted over signed JWT validation.
- No public client ID, origin, host, package name, request body, query, or raw
  tenant/site/realm/provider/subject header becomes authority without exact
  application, realm/trust, and owner resolution.

## Auth And S2S Rules

- Current user identity comes from signed JWT validation. Realm-aware identity
  additionally requires exact issuer, audience, realm, subject, credential
  generation, and live application-session validation.
- S2S identity comes from HMAC metadata validation.
- gRPC protected calls enforce S2S, exact realm actor/session where applicable,
  target membership/operation policy, and domain resource ownership.
- Spoofed `x-user-role` or `x-user-id` must not override signed token payload.
- Email, phone, display name, provider claim, or a parent edge cannot link
  identities or create subordinate access. The authoritative actor coordinate
  is `(identityRealmId, subjectId)`.

## Media Relationship

- Public admin filemanager assets use human-readable keys under `MEDIA_PUBLIC_FOLDER`.
- Protected/strict assets use feature-owned flows and opaque storage keys.
- MinIO/Supabase/AWS store bytes only.
- Media-service owns metadata, signed URLs, and access checks.

## Authority Foundation And Future Boundaries

[ADR-0014](decisions/0014-f4-customer-identity-realms-and-federation.md)
supersedes the platform-global User/Auth target described in older paragraphs
below. Completed Batch 2/3 facts remain current implementation evidence for the
default realm. The target is isolated licensed-root identity realms, exact
application realm/provider trust, audience-bound subordinate SSO, realm-
qualified subjects, and durable credential/session generation. Tenant
Authority remains the control-plane metadata and target-authorization owner;
it does not receive customer credentials or sessions.

- [ADR-0001](decisions/0001-f4-authority-owner.md) selects a dedicated
  tenant-authority-service as the persistent owner of tenant/site/channel,
  application registration, relationship, membership, and entitlement
  scope/reference records. [ADR-0002](decisions/0002-f4-f6-entitlement-boundary.md)
  limits F4 to a non-granting tenant/site entitlement anchor; F6 owns technical
  capability and license execution. Batch 2 implements the authority runtime,
  registration/read/mutation foundation, seed, and four signed read-only v1
  RPCs. Batch 3 items 1-4 add membership/epoch/grant persistence, bounded
  legacy-role backfill, default role fixtures, and the fifth exact actor/target
  resolver with a strict context-v2 receiver prerequisite. They retain current
  User/Auth identity/session behavior only as default-realm compatibility.
  There is still no public business route, membership mutation transport,
  gateway adapter, context writer, active domain consumer, or traffic cutover.
- [ADR-0009](decisions/0009-f4-authoritative-request-scope.md) freezes the
  future target-based authorization facts while preserving independent
  gateway application resolution, Auth actor/session proof, S2S workload
  proof, authority membership/relationship resolution, and service-owned
  resource authorization.
  [ADR-0010](decisions/0010-f4-signed-context-compatibility.md) preserves the
  S2S v3 envelope and assigns default-realm authority facts to strict context v2 with
  non-authorizing resolution, authorized decisions, receiver-first rollout,
  and no downgrade fallback. ADR-0014 preserves the implemented resolver-only
  receiver but requires additive realm-aware context v3 before multi-realm
  traffic.
  [ADR-0011](decisions/0011-f4-data-scope-and-migration-matrix.md) scopes every
  current persistence root and independently addressed child. Its tenant/site
  matrix and typed reference/migration rules remain accepted, while ADR-0014
  supersedes its global User/Auth identity rows and requires realm-qualified
  references. It freezes ordered
  backfill evidence, and rollback boundaries. Stable Membership IDs point to
  immutable epochs; only an HMAC-derived epoch reference leaves authority.
  [ADR-0012](decisions/0012-f4-failure-freshness-audit-and-recovery.md)
  classifies operations as live-required, 15-second bounded, or narrowly
  60-second anonymous-public safe-degraded; it also freezes transactional
  invalidation, cache integrity, append-only authority audit, reference-race
  containment, storage recovery, and common-compromise response.
  [ADR-0013](decisions/0013-f4-ordered-additive-migration-sequence.md) preserves
  owner-before-consumer and explicit traffic gates. ADR-0014 inserts realm,
  provider/trust, credential/session, realm-qualified reference, and context-v3
  gates before its former writer/domain sequence.
  [ADR-0004](decisions/0004-f4-authority-lifecycle.md) separates authority
  business lifecycle from Auth identity/session state and runtime health.
  [ADR-0005](decisions/0005-f4-channel-semantics.md) makes channels presentation
  classifications rather than business-data owners.
  [ADR-0006](decisions/0006-f4-application-registration.md) freezes exact web
  origin and Android/iOS registration proof, activation, transfer, revocation,
  and tombstone semantics.
  [ADR-0007](decisions/0007-f4-parent-relationships.md) permits only explicitly
  authorized direct parent-to-subordinate management and denies transitive,
  reverse, and sibling access. [ADR-0008](decisions/0008-f4-scoped-roles.md)
  separates platform-operator authority from tenant/site/parent/content/user
  grants and removes target role hierarchy. These business decisions are not
  implemented by the foundation. The gateway's validated static single-site
  registry remains the active `G0_F3_BASELINE` bridge and domain schemas are
  not multi-tenant-isolated. Batch 3 items 1-4 implement the default-realm
  membership/role/resolver foundation. Batch 1R froze the corrected design;
  Batch 3R must add realm isolation, credential/session consistency,
  application trust, context v3, freshness, audit, and complete allow/deny
  evidence before traffic cutover.
- Go workers may process media/showroom/streaming/state tasks but should not own media access policy.
- Rust may accelerate 3D/media/browser/mobile paths later but should not own business policy.
- Python may own analytics/AI/recommendation workflows later but should not own core transactional authority.

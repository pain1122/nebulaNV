# F4 Authority Pre-Implementation Audit

Date: 2026-08-24

Status: active F4 planning input. This report records repository truth before
F4 implementation; it is not evidence that F4 behavior already exists.

Supersession: preserve this file as historical evidence. The eventual F4 ADR,
service documents, migrations, tests, and exit report become authoritative for
implemented behavior.

Identity amendment (2026-08-31):
[ADR-0014](../architecture/decisions/0014-f4-customer-identity-realms-and-federation.md)
supersedes this audit's platform-global User/Auth target. Its source inventory
remains valid evidence of the implementation that becomes the default-realm
migration source.

## Audit Outcome

F3 provides a sound single-site bridge: the gateway validates a static
application registry, derives one application/tenant/site/channel tuple, and
propagates it in signed S2S context. F4 is still required because those IDs are
deployment configuration rather than persistent business authority, users
have no membership records, and the seven service-owned schemas do not enforce
tenant/site isolation.

The narrow path is to preserve the F3 registry interface, Auth/session owner,
signed S2S implementation, typed clients, and independent domain databases.
Batch 1 must select the persistent authority boundary and migration semantics
before runtime or schema work begins.

## Evidence Inspected

- `TODO.md`, `TODO-ALTERNATIVE.md`, `AI_CONTEXT.md`, and the completed F3
  current-focus/exit records;
- tenant-platform, actor-context, S2S, contracts/boundaries, gateway standards,
  and system-relationship architecture documents;
- gateway application registry, public request context, downstream signing,
  rate-limit, and idempotency owners;
- shared `grpc-auth` signed-context implementation;
- User/Auth identity, role, token-version, disablement, refresh-session, and
  revocation owners;
- all seven Prisma schemas and their current migration directories;
- service documentation for User, Settings, Taxonomy, Media, Product, Blog,
  and Order.

## Batch 1 Item 1 Source Reconciliation

Reconciled against current source on 2026-08-24, immediately before the
authority-owner ADR. This section inventories current ownership only. It does
not select a future authority owner, approve a schema, or make target behavior
an implemented claim.

### Authority, Configuration, State, Storage, And Evidence Owners

| Inventory area                                                   | Exact current owner                                                                                                                                                   | Executable source evidence                                                                                                                                                                                                       | Current boundary or gap                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Global identity, credential hash, and minimal profile            | User-service and its `User` database row                                                                                                                              | `apps/user-service/prisma/schema.prisma`, `apps/user-service/src/user/user.service.ts`                                                                                                                                           | Email/phone are globally unique. `User.password` stores the hash and `User.role` is an unconstrained string. There is no tenant membership, site grant, or persistent user status.                                                                                                   |
| Role vocabulary and token interpretation                         | User-service stores the string; Auth and `@nebula/grpc-auth` accept only `user`, `admin`, and `root-admin`                                                            | `apps/auth-service/src/auth/auth.types.ts`, `packages/grpc-auth/src/roles.decorator.ts`, `apps/user-service/src/user/grpc/user-grpc.controller.ts`                                                                               | Public registration is forced to `user`; Auth safely maps an invalid stored role to `user`. The invalid-value audit and scoped-role migration remain F4 work.                                                                                                                        |
| JWTs, refresh sessions, revocation, and live access-token checks | Auth-service and Auth Redis                                                                                                                                           | `apps/auth-service/src/auth/auth.service.ts`, `apps/auth-service/src/auth/token/access-token-validation.service.ts`, `apps/auth-service/src/auth/redis/auth-redis.service.ts`                                                    | Validation checks signature/type, temporary disable state, token version, and active session. It does not reread the current User role. Disable/enable primitives have no production command caller, and role/membership changes are not wired to token-version invalidation.        |
| Application registrations                                        | Deployment configuration supplies records; gateway owns validation and lookup                                                                                         | `apps/gateway/src/application/application.contracts.ts`, `apps/gateway/src/application/application-registry.ts`, `apps/gateway/src/config/env.validation.ts`                                                                     | `GATEWAY_APPLICATION_REGISTRY_JSON` is parsed once at startup, all records share one tenant/site pair, and exactly one enabled record exists per public profile. There is no persistent registration lifecycle.                                                                      |
| Browser origins, domains, and mobile identity                    | Gateway static registry owns exact web origin matching; no owner exists for verified domains or native package/application identities                                 | `apps/gateway/src/application/application-origin.ts`, `apps/gateway/src/http/public-client-boundary.ts`                                                                                                                          | Web lookup uses one public client ID plus exact `Origin`; mobile is originless and identified only by a public client ID. `Host`, domain ownership, Android package/signing identity, and iOS bundle/application identity are not authority.                                         |
| Signed request and actor context                                 | Gateway derives context; Auth verifies the actor; `@nebula/clients` signs each call; `@nebula/grpc-auth` defines and verifies the envelope/context                    | `apps/gateway/src/application/trusted-request.ts`, `apps/gateway/src/downstream/gateway-downstream-context.ts`, `packages/clients/src/s2s-metadata.ts`, `packages/grpc-auth/src/s2s-context.ts`, `packages/grpc-auth/src/s2s.ts` | Context v1 carries application/tenant/site/channel plus optional actor. The envelope separately binds caller kind/name, target, method, RPC path, time, nonce, request ID, key ID, body digest, and context digest. F4 target/membership/revision semantics are not present.         |
| Safe database-backed business configuration                      | Settings-service                                                                                                                                                      | `apps/settings-service/prisma/schema.prisma`, `apps/settings-service/src/settings.service.ts`                                                                                                                                    | Current identity is global `(namespace, environment, key)`. Settings owns neither secrets nor authentication, role, trust, database, storage, or tenant authority.                                                                                                                   |
| Runtime, trust, and deployment configuration                     | Each runtime's environment schema plus local/release Compose and deployment owners; `@packages/config` supplies shared validators/helpers                             | `apps/*/src/config/env.validation.ts`, `packages/config/src/env.validation.ts`, `docker-compose.yml`, `docker-compose.release.yml`, `deploy/.env.production.example`                                                             | There is no central runtime-config database. Pairwise S2S/JWT/storage/database values remain outside Settings.                                                                                                                                                                       |
| Redis and rate state                                             | Auth owns auth keys; `@nebula/grpc-auth` owns receiver replay keys; gateway Redis owns idempotency; Nest Throttler owns process-local rate counters                   | `apps/auth-service/src/auth/redis/auth-redis.service.ts`, `packages/grpc-auth/src/s2s-replay.store.ts`, `apps/gateway/src/contracts/idempotency.ts`, `apps/gateway/src/app.module.ts`, `apps/gateway/src/http/rate-limit.ts`     | Current prefixes are `auth:user:*`, `nebula:s2s:replay:v2:*`, and `nebula:gateway:idempotency:v1:*`. No gateway Redis rate-limit key or custom Redis throttler storage exists. The shared Redis instance is a common availability/configuration dependency.                          |
| Object-storage keys and metadata                                 | Media-service owns key construction and policy; the configured S3-compatible provider stores bytes                                                                    | `apps/media-service/src/media.service.ts`, `apps/media-service/prisma/schema.prisma`, `apps/media-service/src/config/env.validation.ts`                                                                                          | Public keys are descriptive under `MEDIA_PUBLIC_FOLDER`; protected/strict keys use an opaque UUID under `MEDIA_PRIVATE_FOLDER`. Rows and paths have no tenant/site authority.                                                                                                        |
| Database migrations                                              | Each of the seven Prisma services owns its schema and migration directory; root tooling only orchestrates commands                                                    | `package.json`, `scripts/backend.mjs`, `apps/{user,settings,taxonomy,media,product,blog,order}-service/prisma/migrations/`                                                                                                       | Auth-service and gateway have no database or migration history. Cross-service migrations cannot create cross-database foreign keys.                                                                                                                                                  |
| Seeds                                                            | Each database service owns `prisma/seed.ts`; root backend tooling orchestrates those seeds and separately creates Product/Blog demo data through their HTTP contracts | `apps/*-service/prisma/seed.ts`, `scripts/backend.mjs`                                                                                                                                                                           | User seeds global admin/user identities; Settings seeds safe defaults; Taxonomy/Media/Product/Blog/Order base seeds currently create no domain rows. Product startup owns its default-taxonomy bootstrap; Blog has an equivalent initializer that is not registered.                 |
| Request logs and durable audit data                              | `@packages/config` owns the structured observational log shape; each runtime emits it to its process logger; no durable audit store has an owner                      | `packages/config/src/logging.ts`, service `main.ts` files, all seven Prisma schemas                                                                                                                                              | Current logs can carry request/user/session/caller fields but not the complete F4 application/tenant/site/target/revision decision. There is no queryable authority, parent-action, registration, membership, or domain-mutation audit ledger or repository-defined retention owner. |

### Domain Persistence Owners

The root backend inventory maps one database to each owner below. Generated
Prisma clients are implementation output, not an independent data owner.

| Service owner | Current Prisma models                                                                                    | Current F4-relevant truth                                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| User          | `User`                                                                                                   | Global identity only; no membership or site grant.                                                                                                    |
| Settings      | `Setting`                                                                                                | Global `(namespace, environment, key)` uniqueness.                                                                                                    |
| Taxonomy      | `Taxonomy`                                                                                               | `scope` is a product/blog domain label, not tenant scope; uniqueness is `(scope, kind, slug)`.                                                        |
| Media         | `Media`                                                                                                  | `ownerId` is user ownership and `scope`/entity fields are business metadata, not tenant/site authority.                                               |
| Product       | `Product`, `ProductGalleryImage`, `ProductVrHotspot`, `ProductAttribute`, `ProductComment`, `ProductSet` | Product/ProductSet slugs and Product SKU are globally unique. Several remote references remain strings/URLs.                                          |
| Blog          | `BlogPost`, `BlogComment`, `BlogCategory`                                                                | Post/category slugs are global. Active post categories, the dormant local category relation, and the Taxonomy facade are distinct current mechanisms. |
| Order         | `Order`, `Cart`, `OrderItem`, `CartItem`                                                                 | Order number and Cart user ownership are global; item rows contain product IDs and snapshots.                                                         |

There is no current Pages model. M2 owns future page/CMS persistence; F4 only
freezes its future scope contract.

## Classified Findings

| Finding                                                                                                                                                             | Classification                          | Evidence-backed treatment                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persistent tenant/site/channel/application/membership authority is absent.                                                                                          | Confirmed defect (unmet F4 requirement) | The validated static registry remains the F3 bridge. Batch 1 selects persistent ownership; no runtime is added before that decision.                                                                                                                                             |
| Domain schemas and durable authority audit records lack authoritative tenant/site ownership.                                                                        | Confirmed defect (unmet F4 requirement) | Batches 2-7 add the selected authority, scoped persistence, and audit behavior in the approved order. This is not an F3 regression.                                                                                                                                              |
| Role/membership freshness and operational disablement are incomplete.                                                                                               | Confirmed defect (unmet F4 requirement) | Auth has live session/version/disable primitives, but validation does not reread User role, role/membership changes do not bump authority state, and disable/enable has no production command owner. Batch 1 must freeze the freshness contract before Batch 3 implements it.    |
| The production registry example omits the explicit `:443` required by its own gateway origin validator.                                                             | Confirmed defect                        | `deploy/.env.production.example` cannot satisfy `validateRegistryOrigin` as written. Preserve the validator; correct the example in a separate narrow configuration patch rather than redesigning registration.                                                                  |
| Settings seeds `order/cart_ttl_minutes` into `valueNumber`, while the implemented `GetString` consumer reads only `valueString`.                                    | Confirmed defect                        | Order currently falls back to the same 30-minute value, masking the mismatch. Resolve it separately before Settings/Order F4 migration evidence.                                                                                                                                 |
| Order's only migration creates USD and `DECIMAL(12,2)`, while the current Prisma schema declares EUR and `DECIMAL(18,2)`.                                           | Confirmed defect                        | A clean migration does not reproduce the declared schema. Reconcile this pre-existing drift before approving the Order F4 migration plan; do not edit old migration history silently.                                                                                            |
| Media public-name availability is partitioned by current business `scope`, but the physical public key excludes scope and `Media.path` is not unique.               | Confirmed defect                        | Different scopes or concurrent presigns can allocate the same object key. Batch 1's storage matrix must carry this fact; a narrow fix and collision/retry evidence are required before Batch 5 introduces tenant/site key prefixes.                                              |
| Gateway rate-limit/readiness and Redis documentation disagreed with source.                                                                                         | Stale documentation                     | Rate counters are process-local; Redis backs gateway idempotency. Gateway readiness checks configuration, registry, Auth transport, and gateway Redis, not every domain channel or Media render. Correct the current architecture/service descriptions without changing runtime. |
| Product migration history leaves an unmapped `product_category` table; Blog has active string categories, dormant local categories, and a separate Taxonomy facade. | Stale implementation                    | The F4 taxonomy/data matrix must name these real legacy shapes and decide their migration/orphan treatment; they are not evidence for a new shared database.                                                                                                                     |
| The Media shadow-database example differs from the canonical local/release Compose shape.                                                                           | Stale implementation/documentation      | Reconcile the example in a separate narrow configuration cleanup before relying on it for migration evidence.                                                                                                                                                                    |
| Mobile attestation, confidential partner credentials, and separate Redis failure domains could reduce residual risk.                                                | Optional hardening                      | Preserve extension points. These do not replace server-side registration, membership, data constraints, or independent domain checks and do not block F4.                                                                                                                        |
| Distributed rate storage, policy caches, global control planes, and cross-region replication may be needed at scale.                                                | Future scaling consideration            | Keep compatible scope/failure contracts; do not add these systems without a measured deployment requirement.                                                                                                                                                                     |

## Current Authority And Enforcement Inventory

| Concept                     | Current owner                              | What is already enforced                                                                                                                                                                       | Missing F4 behavior                                                                                            |
| --------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Global identity/profile     | User-service                               | Unique email/phone, password/profile persistence, global role string.                                                                                                                          | Memberships, site grants, scoped roles, authoritative tenant relationships.                                    |
| Tokens/sessions             | Auth-service and Auth Redis                | JWT issuance, live validation, token version, temporary disable-key enforcement, refresh rotation/replay defense, and session revocation.                                                      | Operational lifecycle commands and membership/role freshness without trusting stale client role claims.        |
| External application lookup | Gateway static registry                    | Strict JSON/schema/ID/origin validation, unique clients/apps/origins, enabled profile checks, one fixed site pair, readiness seam.                                                             | Persistent lifecycle, domains/mobile identities, multiple sites, parent relationships, live revocation.        |
| Signed ingress context      | `@nebula/grpc-auth` plus gateway           | Context v1 signs application/tenant/site/channel and optional verified actor; envelope binds caller kind/name, target, method/path, request ID, time, nonce, key ID, body, and context digest. | Frozen actor-membership/target semantics, authority revision/freshness, compatible rollout if context changes. |
| Domain authorization        | Individual services                        | Existing roles, ownership, lifecycle, taxonomy facade, media access-class, and business checks.                                                                                                | Mandatory tenant/site filters and constraints repeated independently of gateway admission.                     |
| Gateway state               | Gateway plus Gateway Redis                 | Redis-backed application/actor/route idempotency; process-local application/actor/peer rate tracking.                                                                                          | Explicit multi-site scope and invalidation policy where one authority record can change/reassign.              |
| Object storage              | Media-service plus S3-compatible provider  | Media policy, access class, opaque sensitive paths, presigned operations.                                                                                                                      | Tenant/site row ownership, path namespace, object backfill/rollback, cross-scope reference denial.             |
| Jobs/events/search/vectors  | Not implemented as general platform owners | No existing system to migrate.                                                                                                                                                                 | Mandatory verified scope contracts before later payloads or records exist.                                     |

## Prisma Scope And Constraint Audit

| Database owner | Current roots/constraints relevant to F4                                                                                                                       | Required decision before migration                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| User           | `User`; email/phone globally unique; free-string global role.                                                                                                  | Preserve global identity uniqueness; decide platform role migration and place memberships/site grants in the selected authority owner.                |
| Settings       | `Setting`; unique `(namespace, environment, key)`.                                                                                                             | Decide tenant-wide versus site-owned namespaces and make uniqueness match that policy.                                                                |
| Taxonomy       | `Taxonomy`; unique `(scope, kind, slug)`; self-parent tree.                                                                                                    | Decide platform/tenant/site sharing per taxonomy scope; parent and child must share authoritative ownership.                                          |
| Media          | `Media`; globally unique optional SHA-256; owner/scope/entity metadata and storage path.                                                                       | Add tenant/site ownership; decide whether content hash is global metadata or scoped uniqueness; namespace object keys and verify referenced entities. |
| Product        | Product/ProductSet slugs and Product SKU are globally unique; child tables relate locally; category/media/product IDs cross service or appear as strings/URLs. | Site/tenant uniqueness, root versus child scope duplication, and validation of taxonomy/media/complementary references.                               |
| Blog           | BlogPost and BlogCategory slugs are globally unique; category is local while taxonomy facade also exists; cover images are URLs.                               | Site/tenant uniqueness, current local-category versus taxonomy ownership, media-ID migration, and child scope derivation.                             |
| Order          | Order number globally unique; Cart user ID globally unique; items store product IDs and immutable snapshots.                                                   | Site/tenant cart and order ownership, scoped user-cart uniqueness, order-number policy, and same-scope product validation at cart/checkout.           |

There is no current Pages table. F4 must freeze the future page/media scope
contract, but M2 owns actual page/CMS persistence.

## Existing Seams To Preserve

1. `ApplicationRegistry` already isolates gateway callers from the static JSON
   implementation. A persistent adapter can replace it without rewriting the
   public boundary.
2. Signed-context parsing is exact-key, canonical, size-bounded, and versioned.
   Any F4 change needs an explicit compatibility version; silent field addition
   would correctly fail existing parsers.
3. The S2S envelope already protects caller/target/request/time/nonce/body and
   the inner context digest. F4 should not duplicate provenance merely to put
   every concept inside the inner JSON.
4. Auth live validation already checks the token's disable key, token version,
   and active refresh-session state. It does not reread the current User role,
   and no production disable command exists. Membership/role/lifecycle changes
   must connect to Auth invalidation or an explicitly bounded live authority
   check without creating a second token authority.
5. Services own separate databases and typed contracts. Cross-service
   reference validation must call the owning service because cross-database
   foreign keys are unavailable.
6. F2 migration, seed, backup/restore, generated-contract, Compose, scan, and
   evidence lanes are reusable F4 gates.

## Failure-Oriented Questions The ADR Must Answer

| Failure                                      | Prevention                                                                       | Detection/containment/recovery evidence required                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Forged or copied tenant/site/client IDs      | Resolve only registered active records; ignore/reject raw authority metadata.    | Header/body/path forgery tests; scope mismatch audit; fail closed without expanding beyond the selected site.      |
| Stale role or membership after downgrade     | Live authority revision or bounded cache tied to Auth invalidation.              | Downgrade/revocation tests with maximum stale interval; cache purge/recovery; no JWT-role fallback.                |
| Gateway admits the wrong scope               | Domain service repeats membership/resource/tenant checks.                        | Deliberately incorrect signed gateway context is denied by sensitive service policy; audit links actor and target. |
| Authority service/cache unavailable          | Explicit fail-closed or narrowly safe-degraded policy per operation.             | Readiness signal, bounded cached-read test if allowed, write denial, cache expiry, restart and recovery proof.     |
| Partial schema rollout/backfill              | Additive columns and dual-compatible deployment order; audit before constraints. | Null/unknown/contradiction/orphan queries, rollback rehearsal, old/new binary compatibility window.                |
| Cross-service reference race or reassignment | Owning-service validation plus immutable owner/scope identity.                   | Cross-site valid-ID tests, deletion/reassignment race test, compensating error/audit behavior.                     |
| Storage move/collision/orphan                | Manifested scoped keys, checksums, conditional copy, DB transition state.        | Retry/rollback tests, source/destination verification, orphan report, no cross-site overwrite.                     |
| Parent relationship misuse                   | Explicit target scope and action allowlist; no transitive sibling grant.         | Parent-to-child success, sibling denial, revoked link denial, complete actor/target audit.                         |
| Shared key/config compromise                 | Pairwise S2S keys, independent Auth/domain checks, narrow deployment ownership.  | Rotation and wrong-caller/target tests; document residual blast radius rather than claiming total prevention.      |

## Batch 1 Decision Gate

Before any Prisma migration or new authority runtime is created, the ADR must
freeze:

- one owner for tenants, sites, channels, applications, memberships, parent
  links, verified domain/mobile registrations, and entitlement references;
- identifier and lifecycle semantics;
- platform/tenant/site/parent roles and explicit target scope;
- Auth/membership freshness and invalidation behavior;
- signed-context/envelope field placement and compatible version rollout;
- taxonomy sharing policy;
- per-service fields, uniqueness, indexes, backfill, orphan queries, rollback,
  and cross-service reference validation;
- availability/cache/failure/recovery behavior and executable evidence.

The active item-by-item work order is
[`docs/current-focus.md`](../current-focus.md).

# Taxonomy Service

Taxonomy-service owns reusable classification records such as product categories, blog categories, tags, brands, and future scoped taxonomy trees.

It is the global taxonomy store. Domain services should usually expose scoped facades instead of letting callers use global taxonomy IDs directly.

## Owns

- Global taxonomy records.
- `scope`, `kind`, and `slug` identity.
- Tree structure.
- Parent/child validation.
- System taxonomy delete protection.
- Hidden/sort metadata.

Examples:

```txt
scope = product
kind = category.default
slug = uncategorized
```

```txt
scope = blog
kind = category.default
slug = news
```

## Does Not Own

- Product data.
- Blog posts.
- Settings defaults.
- Auth policy.
- Frontend route structure.
- Per-domain meaning beyond `scope` and `kind`.

Product-service and blog-service decide how taxonomy records are used inside their own domain.

## Main Flow

```txt
HTTP/gRPC request
-> taxonomy DTO/proto request
-> TaxonomyService
-> Postgres Taxonomy table
-> taxonomy response
```

## Identity Model

Unique taxonomy identity:

```txt
scope + kind + slug
```

Important fields:

- `scope`
- `kind`
- `slug`
- `title`
- `description`
- `isTree`
- `parentId`
- `depth`
- `path`
- `isHidden`
- `isSystem`
- `sortOrder`
- `meta`

Do not assume every taxonomy ID is valid for every use case. Consumers must verify scope and kind before storing or trusting an ID.

## Tree Rules

Root taxonomy:

```txt
parentId = null
depth = 0
path = slug
```

Child taxonomy:

```txt
parentId = parent.id
depth = parent.depth + 1
path = parent.path + "/" + slug
```

Validation rules:

- Parent must exist.
- Parent must have the same `scope` and `kind`.
- A taxonomy cannot become its own parent.
- Parent cycles are rejected.
- A taxonomy with children cannot be deleted.
- `isSystem` taxonomy cannot be deleted.

## HTTP Contract

Base controller: `/taxonomies`

Current direct taxonomy-service routes:

- `GET /taxonomies`
- `GET /taxonomies/:id`
- `POST /taxonomies`
- `PATCH /taxonomies/:id`
- `DELETE /taxonomies/:id`

Direct HTTP tests describe this as:

```txt
admin writes, public reads
```

Current implementation note:

- Direct list/get routes are explicitly public.
- Direct create/update/delete routes require `admin` or `root-admin`.
- Global guards remain active from `AppModule`.

## gRPC Contract

Proto: `packages/protos/taxonomy.proto`

Service: `TaxonomyService`

Current methods:

- `ListTaxonomies`
- `GetTaxonomy`
- `GetBySlug`
- `CreateTaxonomy`
- `UpdateTaxonomy`
- `DeleteTaxonomy`
- `EnsureSystemTaxonomy`

Direct gRPC requests require a valid S2S envelope.

Current implementation note:

- Direct list/get/get-by-slug methods are explicitly public after S2S verification.
- Direct create/update/delete methods require a verified `admin` or `root-admin` actor.
- `EnsureSystemTaxonomy` is service-only: product-service can ensure only `product/category.default:uncategorized`, and blog-service can ensure only the matching blog scope.
- The ensure operation returns an existing record unchanged, creates a fixed system/root record when missing, and rereads the winner after a concurrent duplicate.
- HTTP and gRPC write policies are kept equivalent by shared wiring tests.
- Domain `NotFoundException` values keep HTTP `404` and are translated by the shared listener filter to gRPC `NOT_FOUND`.

## Shared Client Types

Other services should call taxonomy through `@nebula/clients`.

Important shared shapes:

- `TaxonomyDto`
- `CreateTaxonomyReq`
- `UpdateTaxonomyReq`
- `TaxonomyProxy`

Preferred client helper:

```ts
getTaxonomy(client);
```

The shared client wraps create/update shapes to match the proto request envelope.

## Domain Facade Rule

Product-service and blog-service should not expose raw global taxonomy access.

Current facades:

- Product-service hard-locks `scope = "product"`.
- Blog-service hard-locks `scope = "blog"`.

Facade behavior:

- List calls include the fixed scope.
- Create calls force the fixed scope.
- Get/update/delete verify the returned taxonomy belongs to the expected scope.

This prevents product records from accidentally storing blog taxonomy IDs, and vice versa.

## Known Consumers

- Product-service uses taxonomy-service for product-scoped taxonomy records.
- Product-service default initializer ensures `product/category.default:uncategorized`.
- Product-service stores that default taxonomy ID in settings-service key `product/default_product_category`.
- Blog-service uses taxonomy-service through a blog-scoped facade.
- Blog default taxonomy initialization is intentionally deferred and remains unwired until blog post creation consumes the default setting or a separately approved launch requirement makes it mandatory.

## Database And Seed Participation

The root Prisma commands include this service after media-service. Its seed is
intentionally empty: product and blog own their separate default-taxonomy
initializers and create taxonomy through taxonomy-service contracts. See
[Local Development And Docker Boot](../architecture/local-dev-and-docker-boot.md)
for the shared commands and complete database order.

## Current Tests

HTTP test file:

- `apps/taxonomy-service/test/http/taxonomy.http.e2e.spec.ts`

Covered behavior:

- Admin can create root taxonomy.
- Admin can create child taxonomy.
- Child depth/path are computed from parent.
- List can filter by scope/kind.
- Get by ID returns taxonomy.
- Missing ID returns HTTP `404` with `taxonomy_not_found`.
- Parent with children cannot be deleted.
- Child can be deleted, then parent can be deleted.
- Focused unit coverage proves existing, missing, and concurrent ensure-system behavior.

gRPC test file:

- `apps/taxonomy-service/test/grpc/taxonomy.e2e.spec.ts`

Covered behavior:

- S2S caller can create root taxonomy.
- S2S caller can create child taxonomy.
- List returns created items.
- Get returns child taxonomy.
- Missing ID returns gRPC `NOT_FOUND` with `taxonomy_not_found`.
- Parent with children cannot be deleted.
- Child can be deleted, then parent can be deleted.

Test setup waits for:

- Auth HTTP.
- Settings HTTP.
- Settings gRPC.

The setup comment says taxonomy-service itself is not waited on there.

## Health

Health routes:

```txt
GET /health/live
GET /health/ready
GET /health
```

They are public. Liveness is dependency-free; readiness and its compatibility
alias check Postgres with:

```sql
SELECT 1
```

Readiness also checks the S2S replay store and returns sanitized HTTP `503`
responses while degraded.

## Known Gaps

- Direct service e2e tests do not yet prove normal-user write denial and anonymous read behavior after the policy alignment.
- `SettingsClientModule` is imported in taxonomy-service, but no active taxonomy-service usage was found.
- `meta` exists in service logic and DB, but the proto does not expose full meta.
- Delete is hard delete; there is no soft delete.
- No tenant isolation yet.
- Taxonomy-service does not check product/blog references before deleting a taxonomy.
- Domain services must keep validating scope/kind before storing taxonomy IDs.

## Related Files

- `apps/taxonomy-service/src/taxonomy/taxonomy.service.ts`
- `apps/taxonomy-service/src/taxonomy/taxonomy.controller.ts`
- `apps/taxonomy-service/src/taxonomy/grpc/taxonomy-grpc.controller.ts`
- `apps/taxonomy-service/src/taxonomy/dto/create-taxonomy.dto.ts`
- `apps/taxonomy-service/src/taxonomy/dto/update-taxonomy.dto.ts`
- `apps/taxonomy-service/src/app.module.ts`
- `apps/taxonomy-service/src/main.ts`
- `apps/taxonomy-service/src/health.controller.ts`
- `apps/taxonomy-service/prisma/schema.prisma`
- `apps/taxonomy-service/test/http/taxonomy.http.e2e.spec.ts`
- `apps/taxonomy-service/test/grpc/taxonomy.e2e.spec.ts`
- `packages/protos/taxonomy.proto`
- `packages/clients/src/taxonomy.client.ts`
- `packages/clients/src/taxonomy.types.ts`

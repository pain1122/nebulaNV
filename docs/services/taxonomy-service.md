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

- The direct taxonomy controller does not show explicit `@Public()` or `@Roles()` decorators.
- Global guards are active from `AppModule`.
- HTTP tests currently use an admin token for writes.
- Direct route hardening should be reviewed before treating direct taxonomy HTTP as launch-frozen.

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

Direct gRPC tests use S2S metadata.

Current implementation note:

- The direct gRPC controller does not show explicit role decorators.
- Global guards are active from `AppModule`.
- Direct gRPC write-role enforcement should be reviewed before final launch.

## Shared Client Types

Other services should call taxonomy through `@nebula/clients`.

Important shared shapes:

- `TaxonomyDto`
- `CreateTaxonomyReq`
- `UpdateTaxonomyReq`
- `TaxonomyProxy`

Preferred client helper:

```ts
getTaxonomy(client)
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
- Blog default taxonomy initializer exists, but appears not fully wired as an active provider.

## Current Tests

HTTP test file:

- `apps/taxonomy-service/test/http/taxonomy.http.e2e.spec.ts`

Covered behavior:

- Admin can create root taxonomy.
- Admin can create child taxonomy.
- Child depth/path are computed from parent.
- List can filter by scope/kind.
- Get by ID returns taxonomy.
- Parent with children cannot be deleted.
- Child can be deleted, then parent can be deleted.

gRPC test file:

- `apps/taxonomy-service/test/grpc/taxonomy.e2e.spec.ts`

Covered behavior:

- S2S caller can create root taxonomy.
- S2S caller can create child taxonomy.
- List returns created items.
- Get returns child taxonomy.
- Parent with children cannot be deleted.
- Child can be deleted, then parent can be deleted.

Test setup waits for:

- Auth HTTP.
- Settings HTTP.
- Settings gRPC.

The setup comment says taxonomy-service itself is not waited on there.

## Health

Current health route:

```txt
GET /health
```

It is marked public and checks Postgres with:

```sql
SELECT 1
```

Healthy response shape:

```ts
{
  status: "ok";
  db: "up";
  time: string;
}
```

Degraded response shape:

```ts
{
  status: "degraded";
  db: "down";
  error: string;
}
```

## Known Gaps

- Direct taxonomy HTTP/gRPC write access needs explicit final review.
- Direct tests do not yet prove normal users are denied on writes.
- Direct tests do not clearly prove public reads without auth.
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
